import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageDto } from './dto/update-contact-message.dto';
export interface ContactMessageFilters {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class ContactMessagesService {
    private readonly messages;
    constructor(messages: Repository<ContactMessage>);
    create(dto: CreateContactMessageDto): Promise<{
        id: string;
    }>;
    private applyFilters;
    adminFindAll(filters: ContactMessageFilters): Promise<{
        items: ContactMessage[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    adminCounts(): Promise<{
        all: number;
        unread: number;
        read: number;
        archived: number;
    }>;
    adminUpdate(id: string, dto: UpdateContactMessageDto): Promise<ContactMessage>;
    adminRemove(id: string): Promise<{
        id: string;
    }>;
}
