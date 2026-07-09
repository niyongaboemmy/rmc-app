export declare enum ContactMessageStatus {
    UNREAD = "unread",
    READ = "read",
    ARCHIVED = "archived"
}
export declare class ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: ContactMessageStatus;
    createdAt: Date;
    updatedAt: Date;
}
