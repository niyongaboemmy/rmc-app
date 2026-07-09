import { Repository } from 'typeorm';
import { UploadSettings } from './entities/upload-settings.entity';
import { UpdateUploadSettingsDto } from './dto/update-upload-settings.dto';
export declare class UploadSettingsService {
    private readonly repo;
    constructor(repo: Repository<UploadSettings>);
    getSettings(): Promise<UploadSettings>;
    updateSettings(dto: UpdateUploadSettingsDto): Promise<UploadSettings>;
    addMimeType(mimeType: string): Promise<UploadSettings>;
    removeMimeType(mimeType: string): Promise<UploadSettings>;
}
