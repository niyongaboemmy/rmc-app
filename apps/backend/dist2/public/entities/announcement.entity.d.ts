export declare class Announcement {
    id: string;
    title: string;
    content: string;
    priority: string;
    targetAudience: string;
    targetId: string | null;
    publishAt: Date;
    expiresAt: Date | null;
    isPublished: boolean;
    broadcastSent: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
