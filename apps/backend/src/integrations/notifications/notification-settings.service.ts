import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSetting } from './entities/notification-setting.entity';

export type NotificationChannel = 'email' | 'sms';

@Injectable()
export class NotificationSettingsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSettingsService.name);

  /** Flat key→row cache so service code can check permissions with zero DB hits. */
  private cache = new Map<string, NotificationSetting>();

  constructor(
    @InjectRepository(NotificationSetting)
    private readonly repo: Repository<NotificationSetting>,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  // ─── Query helpers used by other services ────────────────────────────────────

  isEmailEnabled(eventKey: string): boolean {
    const row = this.cache.get(eventKey);
    return row ? row.emailApplicable && row.emailEnabled : true; // default open if row missing
  }

  isSmsEnabled(eventKey: string): boolean {
    const row = this.cache.get(eventKey);
    return row ? row.smsApplicable && row.smsEnabled : true;
  }

  isChannelEnabled(eventKey: string, channel: NotificationChannel): boolean {
    return channel === 'email' ? this.isEmailEnabled(eventKey) : this.isSmsEnabled(eventKey);
  }

  // ─── Admin CRUD ───────────────────────────────────────────────────────────────

  async getAll(): Promise<NotificationSetting[]> {
    return this.repo.find({ order: { groupName: 'ASC', label: 'ASC' } });
  }

  async updateOne(
    eventKey: string,
    patch: { emailEnabled?: boolean; smsEnabled?: boolean },
  ): Promise<NotificationSetting> {
    const row = await this.repo.findOne({ where: { eventKey } });
    if (!row) throw new NotFoundException(`Unknown notification event: ${eventKey}`);

    if (patch.emailEnabled !== undefined && row.emailApplicable) {
      row.emailEnabled = patch.emailEnabled;
    }
    if (patch.smsEnabled !== undefined && row.smsApplicable) {
      row.smsEnabled = patch.smsEnabled;
    }

    const saved = await this.repo.save(row);
    this.cache.set(eventKey, saved);
    this.logger.log(
      `Notification setting updated — ${eventKey}: email=${saved.emailEnabled}, sms=${saved.smsEnabled}`,
    );
    return saved;
  }

  async updateMany(
    updates: Array<{ eventKey: string; emailEnabled?: boolean; smsEnabled?: boolean }>,
  ): Promise<void> {
    for (const u of updates) {
      await this.updateOne(u.eventKey, u);
    }
  }

  async refreshCache(): Promise<void> {
    try {
      const rows = await this.repo.find();
      this.cache.clear();
      for (const row of rows) {
        this.cache.set(row.eventKey, row);
      }
      this.logger.debug(`Notification settings cache loaded (${rows.length} events)`);
    } catch (err) {
      this.logger.warn(`Failed to load notification settings cache: ${err}`);
    }
  }
}
