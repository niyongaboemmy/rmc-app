import { ContentService } from './content.service';
import { UpdateContentDto } from './dto/update-content.dto';
export declare class ContentController {
    private readonly service;
    constructor(service: ContentService);
    getAll(): Promise<Record<string, Record<string, unknown>>>;
    getByKey(key: string): Promise<Record<string, unknown> | null>;
    upsert(key: string, dto: UpdateContentDto, userId: string): Promise<Record<string, unknown>>;
    getHistory(): Promise<import("./entities/history-entry.entity").HistoryEntry[]>;
    createHistory(dto: any): Promise<import("./entities/history-entry.entity").HistoryEntry>;
    updateHistory(id: string, dto: any): Promise<import("./entities/history-entry.entity").HistoryEntry>;
    deleteHistory(id: string): Promise<void>;
}
