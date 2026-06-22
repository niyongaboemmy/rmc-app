import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteContent } from './entities/site-content.entity';
import { HistoryEntry } from './entities/history-entry.entity';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(SiteContent)
    private readonly repo: Repository<SiteContent>,
    @InjectRepository(HistoryEntry)
    private readonly historyRepo: Repository<HistoryEntry>,
  ) {}

  /** Public read — returns the stored value for a section, or null if unset. */
  async getByKey(sectionKey: string): Promise<Record<string, unknown> | null> {
    const row = await this.repo.findOne({ where: { sectionKey } });
    return row ? row.value : null;
  }

  /** All sections as a { key: value } map — handy for previews / admin dashboards. */
  async getAll(): Promise<Record<string, Record<string, unknown>>> {
    const rows = await this.repo.find();
    return rows.reduce<Record<string, Record<string, unknown>>>((acc, row) => {
      acc[row.sectionKey] = row.value;
      return acc;
    }, {});
  }

  /** Upsert the value for a section (admin only). */
  async upsert(
    sectionKey: string,
    value: Record<string, unknown>,
    updatedBy: string | null,
  ): Promise<Record<string, unknown>> {
    const existing = await this.repo.findOne({ where: { sectionKey } });
    if (existing) {
      existing.value = value;
      existing.updatedBy = updatedBy;
      await this.repo.save(existing);
      return existing.value;
    }
    const created = this.repo.create({ sectionKey, value, updatedBy });
    await this.repo.save(created);
    return created.value;
  }

  // ── History Entries ──────────────────────────────────────────────────────────

  getHistoryEntries(): Promise<HistoryEntry[]> {
    return this.historyRepo.find({ order: { year: 'ASC', sortOrder: 'ASC' } });
  }

  createHistoryEntry(dto: Partial<HistoryEntry>): Promise<HistoryEntry> {
    const entry = this.historyRepo.create(dto);
    return this.historyRepo.save(entry);
  }

  async updateHistoryEntry(id: string, dto: Partial<HistoryEntry>): Promise<HistoryEntry> {
    const entry = await this.historyRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('History entry not found');
    Object.assign(entry, dto);
    return this.historyRepo.save(entry);
  }

  async deleteHistoryEntry(id: string): Promise<void> {
    const entry = await this.historyRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('History entry not found');
    await this.historyRepo.remove(entry);
  }
}
