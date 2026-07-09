import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}
export declare class EmailService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private transporter;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    get isConfigured(): boolean;
    sendEmail(options: SendEmailOptions): Promise<void>;
}
