import { Repository } from 'typeorm';
import { VerseOfDay } from './entities/verse-of-day.entity';
import { Announcement } from './entities/announcement.entity';
import { BlogPost, BlogCategory } from './entities/blog-post.entity';
import { GalleryItem } from './entities/gallery-item.entity';
export declare class PublicService {
    private verses;
    private announcements;
    private posts;
    private categories;
    private gallery;
    constructor(verses: Repository<VerseOfDay>, announcements: Repository<Announcement>, posts: Repository<BlogPost>, categories: Repository<BlogCategory>, gallery: Repository<GalleryItem>);
    getVerseOfDay(): Promise<VerseOfDay | null>;
    createVerse(dto: Partial<VerseOfDay>): Promise<VerseOfDay>;
    getActiveAnnouncements(type?: string, limit?: number, includeExpired?: boolean): Promise<Announcement[]>;
    getAnnouncementById(id: string): Promise<Announcement>;
    adminGetAllAnnouncements(type?: string, limit?: number): Promise<Announcement[]>;
    createAnnouncement(dto: Partial<Announcement>): Promise<Announcement>;
    updateAnnouncement(id: string, dto: Partial<Announcement>): Promise<Announcement>;
    deleteAnnouncement(id: string): Promise<void>;
    getPublishedPosts(categorySlug?: string, page?: number, limit?: number): Promise<{
        data: BlogPost[];
        total: number;
        page: number;
        pages: number;
    }>;
    getPostBySlug(slug: string): Promise<BlogPost>;
    createPost(dto: Partial<BlogPost>): Promise<BlogPost>;
    updatePost(id: string, dto: Partial<BlogPost>): Promise<BlogPost>;
    getCategories(): Promise<BlogCategory[]>;
    getGallery(category?: string, page?: number, limit?: number): Promise<{
        data: GalleryItem[];
        total: number;
        page: number;
        pages: number;
    }>;
    adminGetGallery(category?: string, page?: number, limit?: number): Promise<{
        data: GalleryItem[];
        total: number;
        page: number;
        pages: number;
    }>;
    addGalleryItem(dto: Partial<GalleryItem>): Promise<GalleryItem>;
    updateGalleryItem(id: string, dto: Partial<GalleryItem>): Promise<GalleryItem>;
    deleteGalleryItem(id: string): Promise<void>;
}
