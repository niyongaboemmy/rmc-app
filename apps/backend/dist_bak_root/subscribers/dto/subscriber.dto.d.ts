export declare class UnsubscribeDto {
    token: string;
}
export declare class TestEmailDto {
    to: string;
}
export declare class CreateSubscriberDto {
    email: string;
    locale?: string;
    source?: string;
}
export declare class BroadcastDto {
    subject: string;
    html: string;
}
