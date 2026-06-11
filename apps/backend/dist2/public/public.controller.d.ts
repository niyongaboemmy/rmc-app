import { JwtPayload } from '../common/types/jwt-payload.interface';
import { PublicService } from './public.service';
export declare class PublicController {
    private readonly service;
    constructor(service: PublicService);
    getVerse(): Promise<import("./entities/verse-of-day.entity").VerseOfDay | null>;
    createVerse(user: JwtPayload, dto: any): Promise<import("./entities/verse-of-day.entity").VerseOfDay>;
    getAnnouncements(): Promise<import("./entities/announcement.entity").Announcement[]>;
    createAnnouncement(user: JwtPayload, dto: any): Promise<import("./entities/announcement.entity").Announcement>;
    updateAnnouncement(id: string, dto: any): Promise<import("./entities/announcement.entity").Announcement>;
    deleteAnnouncement(id: string): Promise<void>;
    getPosts(category?: string, page?: string): Promise<{
        data: import("./entities/blog-post.entity").BlogPost[];
        total: number;
        page: number;
        pages: number;
    }>;
    getCategories(): Promise<import("./entities/blog-post.entity").BlogCategory[]>;
    getPost(slug: string): Promise<import("./entities/blog-post.entity").BlogPost>;
    createPost(user: JwtPayload, dto: any): Promise<import("./entities/blog-post.entity").BlogPost>;
    updatePost(id: string, dto: any): Promise<import("./entities/blog-post.entity").BlogPost>;
    getGallery(category?: string, page?: string): Promise<{
        data: import("./entities/gallery-item.entity").GalleryItem[];
        total: number;
        page: number;
        pages: number;
    }>;
    addGalleryItem(user: JwtPayload, dto: any): Promise<import("./entities/gallery-item.entity").GalleryItem>;
    deleteGalleryItem(id: string): Promise<void>;
}
