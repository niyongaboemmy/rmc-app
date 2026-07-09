import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SmsConfig } from './entities/sms-config.entity';
import { SmsMessage } from './entities/sms-message.entity';
import { UpdateSmsConfigDto } from './dto/update-sms-config.dto';
import { encryptCredential, decryptCredential } from './sms-crypto.util';

export interface ResolvedSmsConfig {
  username: string;
  password: string;
  senderName: string;
  dlrUrl: string | null;
  isActive: boolean;
}

const DLR_PATH = '/api/v1/webhooks/sms-delivery';

@Injectable()
export class SmsConfigService implements OnModuleInit {
  private readonly logger = new Logger(SmsConfigService.name);

  /** In-memory cache so every SMS send doesn't hit the DB. */
  private cachedConfig: ResolvedSmsConfig | null = null;

  constructor(
    @InjectRepository(SmsConfig)
    private readonly repo: Repository<SmsConfig>,
    @InjectRepository(SmsMessage)
    private readonly historyRepo: Repository<SmsMessage>,
    private readonly appConfig: ConfigService,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  /** Returns the resolved (decrypted) active config, or null if not configured. */
  async getActiveConfig(): Promise<ResolvedSmsConfig | null> {
    if (this.cachedConfig) return this.cachedConfig;
    await this.refreshCache();
    return this.cachedConfig;
  }

  /** Fetch config for admin display — includes decrypted password for form pre-fill. */
  async getForAdmin(): Promise<
    Omit<SmsConfig, 'passwordEnc'> & { passwordSet: boolean; password: string }
  > {
    const row = await this.findRow();
    const { passwordEnc, ...rest } = row;

    let password = '';
    if (passwordEnc) {
      try {
        password = decryptCredential(passwordEnc, this.encryptionKey());
      } catch {
        this.logger.warn('Could not decrypt SMS password for admin display.');
      }
    }

    return {
      ...rest,
      dlrUrl: rest.dlrUrl || this.defaultDlrUrl(),
      passwordSet: !!passwordEnc,
      password,
    };
  }

  /** Update credentials and sender settings. Clears the in-memory cache. */
  async update(dto: UpdateSmsConfigDto): Promise<void> {
    const row = await this.findRow();
    const encKey = this.encryptionKey();

    row.username = dto.username.trim();
    // '_KEEP_' is the sentinel sent by the frontend when the user leaves the password blank
    if (dto.password && dto.password !== '_KEEP_') {
      row.passwordEnc = encryptCredential(dto.password, encKey);
    }
    row.senderName = this.sanitizeSender(dto.senderName ?? row.senderName);
    row.dlrUrl = dto.dlrUrl?.trim() || null;

    if (dto.isActive !== undefined) row.isActive = dto.isActive;

    await this.repo.save(row);
    this.invalidateCache();
    this.logger.log(`SMS config updated — username="${row.username}", active=${row.isActive}`);
  }

  /** Toggle the active flag without touching credentials. */
  async setActive(active: boolean): Promise<void> {
    const row = await this.findRow();
    row.isActive = active;
    await this.repo.save(row);
    this.invalidateCache();
  }

  /** Called by SmsService after a successful send to keep balance fresh. */
  async updateBalance(balanceRwf: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ balanceRwf, balanceUpdatedAt: new Date() })
      .where('1 = 1')
      .execute();
  }

  /** Force-refresh the in-memory cache from DB. */
  async refreshCache(): Promise<void> {
    try {
      const row = await this.repo.findOne({ where: { isActive: true } });
      if (!row || !row.username || !row.passwordEnc) {
        this.cachedConfig = null;
        return;
      }

      const encKey = this.encryptionKey();
      let password: string;

      try {
        password = decryptCredential(row.passwordEnc, encKey);
      } catch {
        this.logger.error(
          'Failed to decrypt SMS password — check APP_ENCRYPTION_KEY. SMS will be disabled.',
        );
        this.cachedConfig = null;
        return;
      }

      this.cachedConfig = {
        username: row.username,
        password,
        senderName: row.senderName,
        dlrUrl: row.dlrUrl || this.defaultDlrUrl(),
        isActive: row.isActive,
      };
    } catch (err) {
      this.logger.warn(`SMS config cache refresh failed: ${err}`);
      this.cachedConfig = null;
    }
  }

  invalidateCache(): void {
    this.cachedConfig = null;
  }

  async getHistory(page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.historyRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: safeLimit,
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async findRow(): Promise<SmsConfig> {
    const row = await this.repo.findOne({ where: {} });
    if (!row) throw new NotFoundException('SMS configuration record not found in database.');
    return row;
  }

  private encryptionKey(): string {
    const key =
      this.appConfig.get<string>('APP_ENCRYPTION_KEY') ||
      this.appConfig.get<string>('JWT_ACCESS_SECRET') ||
      'rmc-fallback-key-change-in-prod';

    if (key === 'rmc-fallback-key-change-in-prod') {
      this.logger.warn('APP_ENCRYPTION_KEY is not set. Using fallback key — set it in production!');
    }

    return key;
  }

  private sanitizeSender(sender: string): string {
    return (
      sender
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .slice(0, 11)
        .trim() || 'RMC'
    );
  }

  /** Build the DLR callback URL from APP_URL env — used when dlr_url is not set in DB. */
  private defaultDlrUrl(): string {
    const appUrl = (this.appConfig.get<string>('APP_URL') || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    return `${appUrl}${DLR_PATH}`;
  }
}
