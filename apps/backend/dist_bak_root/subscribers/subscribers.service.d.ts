import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subscriber } from './entities/subscriber.entity';
import { CreateSubscriberDto, BroadcastDto } from './dto/subscriber.dto';
import { EmailService } from '../integrations/email/email.service';
export declare class SubscribersService {
    private readonly subscribers;
    private readonly email;
    private readonly config;
    private readonly logger;
    constructor(subscribers: Repository<Subscriber>, email: EmailService, config: ConfigService);
    private get appUrl();
    subscribe(dto: CreateSubscriberDto): Promise<{
        subscribed: true;
    }>;
    unsubscribe(token: string): Promise<{
        unsubscribed: boolean;
    }>;
    adminList(): Promise<{
        items: Subscriber[];
        total: number;
        active: number;
    }>;
    adminRemove(id: string): Promise<{
        id: string;
    }>;
    broadcast(dto: BroadcastDto): Promise<{
        sent: number;
        failed: number;
        total: number;
    }>;
    broadcastFromFile(subject: string, html: string, fileBuffer: Buffer): Promise<{
        sent: number;
        failed: number;
        total: number;
        invalidRows: number;
    }>;
    private extractEmails;
    sendTest(to: string): Promise<{
        configured: boolean;
    }>;
    private sendWelcome;
    private absolutizeLinks;
    private wrapHtml;
}
