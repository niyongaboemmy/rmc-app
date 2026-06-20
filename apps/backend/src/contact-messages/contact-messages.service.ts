import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ContactMessage, ContactMessageStatus } from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageDto } from './dto/update-contact-message.dto';

export interface ContactMessageFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ContactMessagesService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly messages: Repository<ContactMessage>,
  ) {}

  // ── Public ───────────────────────────────────────────────────────────────

  /** Store a message submitted from the public Contact page. */
  async create(dto: CreateContactMessageDto): Promise<{ id: string }> {
    const message = this.messages.create({
      name: dto.name.trim(),
      email: dto.email.trim(),
      subject: dto.subject.trim(),
      message: dto.message.trim(),
      status: ContactMessageStatus.UNREAD,
    });
    const saved = await this.messages.save(message);
    return { id: saved.id };
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  private applyFilters(
    qb: SelectQueryBuilder<ContactMessage>,
    filters: ContactMessageFilters,
  ): SelectQueryBuilder<ContactMessage> {
    if (filters.status && filters.status !== 'all') {
      qb.andWhere('msg.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere(
        '(msg.name ILIKE :s OR msg.email ILIKE :s OR msg.subject ILIKE :s OR msg.message ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    }
    return qb;
  }

  async adminFindAll(filters: ContactMessageFilters) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    const qb = this.messages
      .createQueryBuilder('msg')
      .orderBy('msg.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    this.applyFilters(qb, filters);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Counts per status — drives the inbox filter chips and the unread badge. */
  async adminCounts(): Promise<{ all: number; unread: number; read: number; archived: number }> {
    const rows = await this.messages
      .createQueryBuilder('msg')
      .select('msg.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('msg.status')
      .getRawMany<{ status: ContactMessageStatus; count: string }>();

    const byStatus = new Map(rows.map((r) => [r.status, Number(r.count)]));
    const unread = byStatus.get(ContactMessageStatus.UNREAD) ?? 0;
    const read = byStatus.get(ContactMessageStatus.READ) ?? 0;
    const archived = byStatus.get(ContactMessageStatus.ARCHIVED) ?? 0;
    return { all: unread + read + archived, unread, read, archived };
  }

  async adminUpdate(id: string, dto: UpdateContactMessageDto): Promise<ContactMessage> {
    const message = await this.messages.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (dto.status !== undefined) message.status = dto.status;
    return this.messages.save(message);
  }

  async adminRemove(id: string): Promise<{ id: string }> {
    const message = await this.messages.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    await this.messages.remove(message);
    return { id };
  }
}
