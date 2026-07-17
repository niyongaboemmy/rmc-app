import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import * as crypto from 'crypto';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import { SmsService } from '../integrations/sms/sms.service';
import { JobApplication } from './entities/job-application.entity';
import { TrackingVerification } from './entities/tracking-verification.entity';

const OTP_LENGTH = 6;
const MAX_VERIFY_ATTEMPTS = 5;
// Rate limits (Redis counters with a sliding 10-minute window).
const REQ_PER_CODE_PHONE = 3;
const REQ_PER_IP = 15;
const VERIFY_PER_IP = 30;
const WINDOW_SEC = 600;
const TOKEN_SCOPE = 'job-tracking';

/**
 * Public "track your application" verification. A tracking code alone reveals
 * nothing: the requester must prove control of the phone number stored on the
 * application via an SMS OTP. All existence-revealing responses are generic to
 * prevent enumeration; OTPs are single-use, expiring, attempt-capped and
 * generated with crypto-secure randomness.
 */
@Injectable()
export class TrackingVerificationService {
  private readonly logger = new Logger(TrackingVerificationService.name);

  constructor(
    @InjectRepository(TrackingVerification)
    private readonly verificationRepo: Repository<TrackingVerification>,
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
    @InjectRedis() private readonly redis: Redis,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private ttlMinutes(): number {
    return this.configService.get<number>('app.otpExpiryMinutes', 5);
  }

  private hashOtp(otp: string): string {
    const pepper = this.configService.get<string>('TRACKING_OTP_PEPPER', '');
    return crypto.createHash('sha256').update(`${otp}:${pepper}`).digest('hex');
  }

  /** Normalize a Rwandan number to +250XXXXXXXXX for comparison. */
  private normalizePhone(phone: string): string {
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

  private async findByCode(trackingCode: string): Promise<JobApplication | null> {
    return this.applicationRepo.findOne({ where: { trackingCode: (trackingCode || '').trim().toUpperCase() } });
  }

  // ── Step 1: request an OTP ────────────────────────────────────────────────────

  /**
   * Sends an OTP to the phone on the application — but ONLY if the tracking code
   * and phone both match. The response is identical whether or not they match
   * (no enumeration signal); the client always advances to the OTP entry step.
   */
  async requestOtp(trackingCode: string, phone: string, ip: string): Promise<{ expiresAt: Date }> {
    await this.enforceRateLimit(`trk_req:${(trackingCode || '').toUpperCase()}:${this.normalizePhone(phone)}`, REQ_PER_CODE_PHONE);
    await this.enforceRateLimit(`trk_req_ip:${ip}`, REQ_PER_IP);

    const ttlMin = this.ttlMinutes();
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    const application = await this.findByCode(trackingCode);
    const matches = !!application && this.normalizePhone(application.phone) === this.normalizePhone(phone);

    if (application && matches) {
      const otp = crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
      await this.verificationRepo.save({
        applicationId: application.id,
        phone: application.phone,
        otpHash: this.hashOtp(otp),
        expiresAt,
        attempts: 0,
        consumedAt: null,
      });
      const msg = `RMC Jobs: your tracking verification code is ${otp}. It expires in ${ttlMin} minutes. Do not share it with anyone.`;
      this.smsService.sendSms(application.phone, msg);
      this.logger.log(`[track-otp] request OK app=${application.id} phone=${this.maskPhone(application.phone)} ip=${ip}`);
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`[track-otp] DEV code for ${application.trackingCode}: ${otp}`);
      }
    } else {
      // No match — do nothing, but return the same shape so nothing is revealed.
      this.logger.warn(`[track-otp] request no-match code="${trackingCode}" ip=${ip}`);
    }

    return { expiresAt };
  }

  // ── Step 2: verify the OTP ────────────────────────────────────────────────────

  /** Verifies the OTP and, on success, returns a short-lived signed tracking token. */
  async verifyOtp(trackingCode: string, phone: string, otp: string, ip: string): Promise<{ token: string; applicationId: string }> {
    await this.enforceRateLimit(`trk_verify_ip:${ip}`, VERIFY_PER_IP);

    const invalid = () =>
      new BadRequestException({ code: 'TRACKING_OTP_INVALID', message: 'Invalid or expired verification code.' });

    const application = await this.findByCode(trackingCode);
    if (!application || this.normalizePhone(application.phone) !== this.normalizePhone(phone)) {
      throw invalid();
    }

    const record = await this.verificationRepo.findOne({
      where: { applicationId: application.id, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!record) throw invalid();

    if (record.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'TRACKING_OTP_EXPIRED', message: 'This code has expired. Request a new one.' });
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException({ code: 'TRACKING_OTP_MAX_ATTEMPTS', message: 'Too many incorrect attempts. Request a new code.' });
    }
    if (this.hashOtp(otp) !== record.otpHash) {
      await this.verificationRepo.update(record.id, { attempts: record.attempts + 1 });
      throw invalid();
    }

    // Single-use: consume the OTP so it can never be replayed.
    await this.verificationRepo.update(record.id, { consumedAt: new Date() });
    this.logger.log(`[track-otp] verified OK app=${application.id} ip=${ip}`);

    const token = this.jwtService.sign(
      { sub: application.id, scope: TOKEN_SCOPE },
      { expiresIn: '15m' },
    );
    return { token, applicationId: application.id };
  }

  // ── Step 3: resolve a tracking session token → applicationId ──────────────────

  verifyToken(token: string): string {
    try {
      const payload = this.jwtService.verify<{ sub: string; scope: string }>(token);
      if (payload.scope !== TOKEN_SCOPE || !payload.sub) throw new Error('bad scope');
      return payload.sub;
    } catch {
      throw new UnauthorizedException({ code: 'TRACKING_SESSION_INVALID', message: 'Your tracking session is invalid or has expired.' });
    }
  }
}
