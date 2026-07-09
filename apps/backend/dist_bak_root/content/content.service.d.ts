import { Repository } from 'typeorm';
import { SiteContent } from './entities/site-content.entity';
import { HistoryEntry } from './entities/history-entry.entity';
export declare class ContentService {
    private readonly repo;
    private readonly historyRepo;
    constructor(repo: Repository<SiteContent>, historyRepo: Repository<HistoryEntry>);
    getByKey(sectionKey: string): Promise<Record<string, unknown> | null>;
    getAll(): Promise<Record<string, Record<string, unknown>>>;
    upsert(sectionKey: string, value: Record<string, unknown>, updatedBy: string | null): Promise<Record<string, unknown>>;
    getHistoryEntries(): Promise<HistoryEntry[]>;
    createHistoryEntry(dto: Partial<HistoryEntry>): Promise<HistoryEntry>;
    updateHistoryEntry(id: string, dto: Partial<HistoryEntry>): Promise<HistoryEntry>;
    deleteHistoryEntry(id: string): Promise<void>;
}
