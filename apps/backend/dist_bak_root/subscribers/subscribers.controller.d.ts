import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto, UnsubscribeDto } from './dto/subscriber.dto';
export declare class SubscribersController {
    private readonly service;
    constructor(service: SubscribersService);
    subscribe(dto: CreateSubscriberDto): Promise<{
        subscribed: true;
    }>;
    unsubscribe(dto: UnsubscribeDto): Promise<{
        unsubscribed: boolean;
    }>;
}
