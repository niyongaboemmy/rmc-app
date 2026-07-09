import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';

export interface UploadConstraints {
  maxFileSize: number;
  allowedMimeTypes: string[];
}

const CACHE_TTL_MS = 60_000;
const DEFAULT: UploadConstraints = { maxFileSize: 524288000, allowedMimeTypes: [] };

@Injectable()
export class UploadSettingsService implements OnModuleInit {
  private readonly logger = new Logger(UploadSettingsService.name);
  private readonly backendUrl: string;
  private cache: UploadConstraints = DEFAULT;
  private cacheAt = 0;
  private inflight: Promise<UploadConstraints> | null = null;

  constructor(private readonly config: ConfigService) {
    this.backendUrl = this.config.get<string>('app.backendUrl') || 'http://localhost:3000/api/v1';
  }

  async onModuleInit() {
    await this.refresh().catch(() => {
      this.logger.warn('Could not fetch upload settings from backend on startup — using defaults');
    });
  }

  async getConstraints(): Promise<UploadConstraints> {
    if (Date.now() - this.cacheAt < CACHE_TTL_MS) return this.cache;
    return this.refresh();
  }

  private refresh(): Promise<UploadConstraints> {
    if (this.inflight) return this.inflight;
    this.inflight = this.fetchFromBackend()
      .then((data) => {
        this.cache = data;
        this.cacheAt = Date.now();
        this.logger.debug(`Upload settings refreshed: maxSize=${data.maxFileSize}, mimeTypes=${data.allowedMimeTypes.length || 'all'}`);
        return data;
      })
      .catch((err) => {
        this.logger.warn(`Failed to refresh upload settings: ${err.message} — using cached/default`);
        return this.cache;
      })
      .finally(() => { this.inflight = null; });
    return this.inflight;
  }

  private fetchFromBackend(): Promise<UploadConstraints> {
    return new Promise((resolve, reject) => {
      const url = `${this.backendUrl}/upload-settings/public`;
      const proto = url.startsWith('https') ? https : http;
      const req = proto.get(url, { headers: { accept: 'application/json' } }, (res) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
        res.on('end', () => {
          try {
            const body = JSON.parse(raw);
            // Backend wraps responses — check both direct and nested data shape
            const payload = body?.data ?? body;
            resolve({
              maxFileSize: Number(payload.maxFileSize) || DEFAULT.maxFileSize,
              allowedMimeTypes: Array.isArray(payload.allowedMimeTypes) ? payload.allowedMimeTypes : [],
            });
          } catch {
            reject(new Error('Invalid JSON from backend upload-settings endpoint'));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(new Error('Backend request timed out')); });
    });
  }
}
