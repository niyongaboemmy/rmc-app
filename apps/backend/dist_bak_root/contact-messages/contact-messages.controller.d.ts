import { ContactMessagesService } from './contact-messages.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
export declare class ContactMessagesController {
    private readonly service;
    constructor(service: ContactMessagesService);
    create(dto: CreateContactMessageDto): Promise<{
        id: string;
    }>;
}
