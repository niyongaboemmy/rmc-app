import { ContactMessagesService } from './contact-messages.service';
import { UpdateContactMessageDto } from './dto/update-contact-message.dto';
export declare class ContactMessagesAdminController {
    private readonly service;
    constructor(service: ContactMessagesService);
    findAll(status?: string, search?: string, page?: string, limit?: string): Promise<{
        items: import("./entities/contact-message.entity").ContactMessage[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    counts(): Promise<{
        all: number;
        unread: number;
        read: number;
        archived: number;
    }>;
    update(id: string, dto: UpdateContactMessageDto): Promise<import("./entities/contact-message.entity").ContactMessage>;
    remove(id: string): Promise<{
        id: string;
    }>;
}
