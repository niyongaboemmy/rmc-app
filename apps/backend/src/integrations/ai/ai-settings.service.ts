import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiSettings } from './entities/ai-settings.entity';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { encryptSecret, decryptSecret } from './ai-crypto.util';

export type AiProvider = 'gemini' | 'openai';

/** What the public chat service needs to call a provider. */
export interface ResolvedAiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

/** Masked view returned to the admin UI — never exposes the raw keys. */
export interface AdminAiSettings {
  defaultProvider: AiProvider;
  openaiModel: string;
  geminiModel: string;
  isActive: boolean;
  openaiKeySet: boolean;
  geminiKeySet: boolean;
  openaiKeyHint: string;
  geminiKeyHint: string;
}

const KEEP = '_KEEP_';

@Injectable()
export class AiSettingsService implements OnModuleInit {
  private readonly logger = new Logger(AiSettingsService.name);

  /** In-memory cache so every chat request doesn't hit the DB + decrypt. */
  private cached: ResolvedAiConfig | null = null;
  private cacheLoaded = false;

  constructor(
    @InjectRepository(AiSettings)
    private readonly repo: Repository<AiSettings>,
    private readonly appConfig: ConfigService,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  /** Resolved (decrypted) config for the active default provider, or null if unusable. */
  async getActiveConfig(): Promise<ResolvedAiConfig | null> {
    if (this.cacheLoaded) return this.cached;
    await this.refreshCache();
    return this.cached;
  }

  /** Masked settings for the admin form. */
  async getForAdmin(): Promise<AdminAiSettings> {
    const row = await this.findRow();
    return {
      defaultProvider: (row.defaultProvider as AiProvider) ?? 'gemini',
      openaiModel: row.openaiModel,
      geminiModel: row.geminiModel,
      isActive: row.isActive,
      openaiKeySet: !!row.openaiKeyEnc,
      geminiKeySet: !!row.geminiKeyEnc,
      openaiKeyHint: this.keyHint(row.openaiKeyEnc),
      geminiKeyHint: this.keyHint(row.geminiKeyEnc),
    };
  }

  /** Persist admin changes. Clears the in-memory cache. */
  async update(dto: UpdateAiSettingsDto, updatedBy: string | null): Promise<void> {
    const row = await this.findRow();
    const encKey = this.encryptionKey();

    if (dto.defaultProvider) row.defaultProvider = dto.defaultProvider;
    if (dto.openaiModel !== undefined) row.openaiModel = dto.openaiModel.trim() || row.openaiModel;
    if (dto.geminiModel !== undefined) row.geminiModel = dto.geminiModel.trim() || row.geminiModel;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;

    row.openaiKeyEnc = this.resolveKeyUpdate(dto.openaiKey, row.openaiKeyEnc, encKey);
    row.geminiKeyEnc = this.resolveKeyUpdate(dto.geminiKey, row.geminiKeyEnc, encKey);
    row.updatedBy = updatedBy;

    await this.repo.save(row);
    this.invalidateCache();
    this.logger.log(
      `AI settings updated — provider=${row.defaultProvider}, active=${row.isActive}, ` +
        `openaiKeySet=${!!row.openaiKeyEnc}, geminiKeySet=${!!row.geminiKeyEnc}`,
    );
  }

  /** Toggle the active flag without touching keys. */
  async setActive(active: boolean): Promise<void> {
    const row = await this.findRow();
    row.isActive = active;
    await this.repo.save(row);
    this.invalidateCache();
  }

  async refreshCache(): Promise<void> {
    this.cacheLoaded = true;
    try {
      const row = await this.repo.findOne({ where: {} });
      if (!row || !row.isActive) {
        this.cached = null;
        return;
      }

      const provider = (row.defaultProvider as AiProvider) ?? 'gemini';
      const enc = provider === 'openai' ? row.openaiKeyEnc : row.geminiKeyEnc;
      const model = provider === 'openai' ? row.openaiModel : row.geminiModel;

      if (!enc) {
        this.logger.warn(`AI assistant active but no API key set for provider "${provider}".`);
        this.cached = null;
        return;
      }

      let apiKey: string;
      try {
        apiKey = decryptSecret(enc, this.encryptionKey());
      } catch {
        this.logger.error(
          'Failed to decrypt AI API key — check APP_ENCRYPTION_KEY. Assistant disabled.',
        );
        this.cached = null;
        return;
      }

      this.cached = { provider, apiKey, model };
    } catch (err) {
      this.logger.warn(`AI settings cache refresh failed: ${err}`);
      this.cached = null;
    }
  }

  invalidateCache(): void {
    this.cached = null;
    this.cacheLoaded = false;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private resolveKeyUpdate(incoming: string | undefined, current: string, encKey: string): string {
    if (incoming === undefined || incoming === KEEP) return current; // unchanged
    if (incoming === '') return ''; // cleared
    return encryptSecret(incoming.trim(), encKey); // replaced
  }

  private keyHint(enc: string): string {
    if (!enc) return '';
    try {
      const plain = decryptSecret(enc, this.encryptionKey());
      return plain ? `••••${plain.slice(-4)}` : '';
    } catch {
      return '••••';
    }
  }

  private async findRow(): Promise<AiSettings> {
    const row = await this.repo.findOne({ where: {} });
    if (!row) throw new NotFoundException('AI settings record not found in database.');
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
}
