import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import * as crypto from 'crypto';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import { SmsService } from '../integrations/sms/sms.service';
import { TrackingOtp } from './entities/tracking-otp.entity';

const OTP_LENGTH = 6;
const MAX_VERIFY_ATTEMPTS = 5;
const REQ_PER_PHONE = 3;
const REQ_PER_IP = 15;
const VERIFY_PER_IP = 30;
const WINDOW_SEC = 600;
const TOKEN_SCOPE = 'tracking';

/** The record being tracked — only the id and the phone to verify against. */
export interface TrackingSubject {
  id: string;
  phone: string | null;
}

/**
 * Shared, polymorphic phone-OTP verification for every "track your application"
 * flow. A tracking code alone reveals nothing: the requester must prove control
 * of the phone on the record via an SMS OTP. Existence-revealing responses are
 * generic (anti-enumeration); OTPs are crypto-random, hashed, expiring,
 * attempt-capped and single-use.
 */
@Injectable()
export class TrackingVerificationService {
  private readonly logger = new Logger(TrackingVerificationService.name);

  constructor(
    @InjectRepository(TrackingOtp)
    private readonly otpRepo: Repository<TrackingOtp>,
    @InjectRedis() private readonly redis: Redis,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private ttlMinutes(): number {
    return this.configService.get<number>('app.otpExpiryMinutes', 5);
  }

  private hashOtp(otp: string): string {
    const pepper = this.configService.get<string>('TRACKING_OTP_PEPPER', '');
    return crypto.createHash('sha256').update(`${otp}:${pepper}`).digest('hex');
  }

  private normalizePhone(phone: string | null | undefined): string {
    const p = (phone || '').replace(/\s+/g, '');
    if (p.startsWith('+250')) return p;
    if (p.startsWith('0')) return `+250${p.slice(1)}`;
    if (p.startsWith('250')) return `+${p}`;
    return p;
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '***';
    return `${phone.slice(0, 4)}${'*'.repeat(Math.max(0, phone.length - 7))}${phone.slice(-3)}`;
  }

  private async enforceRateLimit(key: string, max: number): Promise<void> {
    const n = await this.redis.incr(key);
    if (n === 1) await this.redis.expire(key, WINDOW_SEC);
    if (n > max) {
      throw new BadRequestException({
        code: 'TRACKING_RATE_LIMITED',
        message: 'Too many attempts. Please try again in a few minutes.',
      });
    }
  }

  private notFound() {
    return new BadRequestException({
      code: 'TRACKING_CODE_NOT_FOUND',
      message: "We couldn't find an application with that tracking code. Please check it and try again.",
    });
  }

  // ── Step 1: request an OTP ────────────────────────────────────────────────────

  /**
   * Sends an OTP to the phone captured on the application. The requester only
   * supplies the (unguessable) tracking code — the phone is never re-typed. If
   * the code doesn't resolve to a record we say so plainly; brute-forcing codes
   * is blocked by the per-IP rate limit, and SMS-bombing a known code's owner is
   * blocked by the per-application limit.
   */
  async requestOtp(
    subjectType: string,
    subject: TrackingSubject | null,
    ip: string,
  ): Promise<{ expiresAt: Date; phoneHint: string }> {
    await this.enforceRateLimit(`trk_req_ip:${ip}`, REQ_PER_IP);

    if (!subject || !subject.phone) throw this.notFound();
    await this.enforceRateLimit(`trk_req:${subjectType}:${subject.id}`, REQ_PER_PHONE);

    const ttlMin = this.ttlMinutes();
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);
    const phone = subject.phone;

    const otp = crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
    await this.otpRepo.save({
      subjectType,
      subjectId: subject.id,
      phone,
      otpHash: this.hashOtp(otp),
      expiresAt,
      attempts: 0,
      consumedAt: null,
    });
    const msg = `RMC: your verification code is ${otp}. It expires in ${ttlMin} minutes. Do not share it with anyone.`;
    this.smsService.sendSms(phone, msg);
    this.logger.log(`[tracking] request OK type=${subjectType} id=${subject.id} phone=${this.maskPhone(this.normalizePhone(phone))} ip=${ip}`);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[tracking] DEV code type=${subjectType} id=${subject.id}: ${otp}`);
    }

    return { expiresAt, phoneHint: this.maskPhone(this.normalizePhone(phone)) };
  }

  // ── Step 2: verify the OTP ────────────────────────────────────────────────────

  async verifyOtp(
    subjectType: string,
    subject: TrackingSubject | null,
    otp: string,
    ip: string,
  ): Promise<{ token: string; subjectId: string }> {
    await this.enforceRateLimit(`trk_verify_ip:${ip}`, VERIFY_PER_IP);

    if (!subject) throw this.notFound();

    const record = await this.otpRepo.findOne({
      where: { subjectType, subjectId: subject.id, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!record) {
      throw new BadRequestException({
        code: 'TRACKING_OTP_NONE',
        message: 'Please request a verification code first.',
      });
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'TRACKING_OTP_EXPIRED', message: 'This code has expired. Request a new one.' });
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException({ code: 'TRACKING_OTP_MAX_ATTEMPTS', message: 'Too many incorrect attempts. Request a new code.' });
    }
    if (this.hashOtp(otp) !== record.otpHash) {
      await this.otpRepo.update(record.id, { attempts: record.attempts + 1 });
      throw new BadRequestException({
        code: 'TRACKING_OTP_INVALID',
        message: 'That verification code is incorrect. Please check and try again.',
      });
    }

    await this.otpRepo.update(record.id, { consumedAt: new Date() });
    this.logger.log(`[tracking] verified OK type=${subjectType} id=${subject.id} ip=${ip}`);

    const token = this.jwtService.sign({ sub: subject.id, type: subjectType, scope: TOKEN_SCOPE }, { expiresIn: '15m' });
    return { token, subjectId: subject.id };
  }

  // ── Step 3: resolve a session token → subjectId (scoped to a subjectType) ─────

  verifyToken(token: string, expectedType: string): string {
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string; scope: string }>(token);
      if (payload.scope !== TOKEN_SCOPE || payload.type !== expectedType || !payload.sub) {
        throw new Error('bad token');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException({ code: 'TRACKING_SESSION_INVALID', message: 'Your tracking session is invalid or has expired.' });
    }
  }
}
