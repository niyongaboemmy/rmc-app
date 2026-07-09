export declare class Announcement {
    id: string;
    title: string;
    content: string;
    titleI18n: {
        en: string;
        rw: string;
        ar: string;
    } | null;
    contentI18n: {
        en: string;
        rw: string;
        ar: string;
    } | null;
    priority: string;
    targetAudience: string;
    targetId: string | null;
    publishAt: Date;
    expiresAt: Date | null;
    isPublished: boolean;
    type: string;
    attachments: Array<{
        key: string;
        name: string;
        mimeType: string;
        size: number;
    }>;
    broadcastSent: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
