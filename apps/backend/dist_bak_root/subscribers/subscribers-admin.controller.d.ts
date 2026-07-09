import { SubscribersService } from './subscribers.service';
import { BroadcastDto, TestEmailDto } from './dto/subscriber.dto';
interface UploadedExcel {
    buffer: Buffer;
    originalname: string;
    size: number;
}
export declare class SubscribersAdminController {
    private readonly service;
    constructor(service: SubscribersService);
    list(): Promise<{
        items: import("./entities/subscriber.entity").Subscriber[];
        total: number;
        active: number;
    }>;
    broadcast(dto: BroadcastDto): Promise<{
        sent: number;
        failed: number;
        total: number;
    }>;
    broadcastFile(file: UploadedExcel | undefined, body: {
        subject?: string;
        html?: string;
    }): Promise<{
        sent: number;
        failed: number;
        total: number;
        invalidRows: number;
    }>;
    sendTest(dto: TestEmailDto): Promise<{
        configured: boolean;
    }>;
    remove(id: string): Promise<{
        id: string;
    }>;
}
export {};
