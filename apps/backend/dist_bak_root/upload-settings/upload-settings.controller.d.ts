import { UploadSettingsService } from './upload-settings.service';
import { UpdateUploadSettingsDto } from './dto/update-upload-settings.dto';
import { AddMimeTypeDto } from './dto/add-mime-type.dto';
export declare class UploadSettingsController {
    private readonly service;
    constructor(service: UploadSettingsService);
    getPublic(): Promise<import("./entities/upload-settings.entity").UploadSettings>;
    get(): Promise<import("./entities/upload-settings.entity").UploadSettings>;
    update(dto: UpdateUploadSettingsDto): Promise<import("./entities/upload-settings.entity").UploadSettings>;
    addMimeType(dto: AddMimeTypeDto): Promise<import("./entities/upload-settings.entity").UploadSettings>;
    removeMimeType(mimeType: string): Promise<import("./entities/upload-settings.entity").UploadSettings>;
}
