import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadSettings } from './entities/upload-settings.entity';
import { UpdateUploadSettingsDto } from './dto/update-upload-settings.dto';

@Injectable()
export class UploadSettingsService {
  constructor(
    @InjectRepository(UploadSettings)
    private readonly repo: Repository<UploadSettings>,
  ) {}

  /** Get the single settings row, creating it with defaults if it doesn't exist. */
  async getSettings(): Promise<UploadSettings> {
    const existing = await this.repo.findOne({ where: {} });
    if (existing) return existing;

    const defaults = this.repo.create({ maxFileSize: 524288000, allowedMimeTypes: [] });
    return this.repo.save(defaults);
  }

  async updateSettings(dto: UpdateUploadSettingsDto): Promise<UploadSettings> {
    const settings = await this.getSettings();
    if (dto.maxFileSize !== undefined) settings.maxFileSize = dto.maxFileSize;
    return this.repo.save(settings);
  }

  async addMimeType(mimeType: string): Promise<UploadSettings> {
    const settings = await this.getSettings();
    const normalized = mimeType.toLowerCase().trim();
    if (settings.allowedMimeTypes.includes(normalized)) {
      throw new ConflictException(`MIME type "${normalized}" is already in the list`);
    }
    settings.allowedMimeTypes = [...settings.allowedMimeTypes, normalized];
    return this.repo.save(settings);
  }

  async removeMimeType(mimeType: string): Promise<UploadSettings> {
    const settings = await this.getSettings();
    const normalized = decodeURIComponent(mimeType).toLowerCase().trim();
    if (!settings.allowedMimeTypes.includes(normalized)) {
      throw new NotFoundException(`MIME type "${normalized}" not found in the list`);
    }
    settings.allowedMimeTypes = settings.allowedMimeTypes.filter((m) => m !== normalized);
    return this.repo.save(settings);
  }
}
