import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerseOfDay } from './entities/verse-of-day.entity';
import { Announcement } from './entities/announcement.entity';
import { BlogPost, BlogCategory } from './entities/blog-post.entity';
import { GalleryItem } from './entities/gallery-item.entity';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(VerseOfDay) private verses: Repository<VerseOfDay>,
    @InjectRepository(Announcement) private announcements: Repository<Announcement>,
    @InjectRepository(BlogPost) private posts: Repository<BlogPost>,
    @InjectRepository(BlogCategory) private categories: Repository<BlogCategory>,
    @InjectRepository(GalleryItem) private gallery: Repository<GalleryItem>,
  ) {}

  async getVerseOfDay(): Promise<VerseOfDay | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.verses.findOne({ where: { displayDate: new Date(today) } });
  }

  async createVerse(dto: Partial<VerseOfDay>): Promise<VerseOfDay> {
    const verse = this.verses.create(dto);
    return this.verses.save(verse);
  }

  getActiveAnnouncements(type?: string, limit = 10, includeExpired = false) {
    const now = new Date();
    const qb = this.announcements
      .createQueryBuilder('a')
      .where('a.is_published = :pub', { pub: true })
      .andWhere('a.publish_at <= :now', { now })
      // Semantic priority ordering: urgent=3, high=2, normal=1
      .orderBy(`CASE a.priority WHEN 'urgent' THEN 3 WHEN 'high' THEN 2 ELSE 1 END`, 'DESC')
      .addOrderBy('a.publish_at', 'DESC')
      .take(limit);

    if (type) qb.andWhere('a.type = :type', { type });

    // Exclude expired items unless caller explicitly requests them
    if (!includeExpired) {
      qb.andWhere('(a.expires_at IS NULL OR a.expires_at >= :exp)', { exp: now });
    }

    return qb.getMany();
  }

  async getAnnouncementById(id: string): Promise<Announcement> {
    const a = await this.announcements.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Announcement not found');
    return a;
  }

  adminGetAllAnnouncements(type?: string, limit = 100) {
    return this.announcements.find({
      where: { ...(type ? { type } : {}) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async createAnnouncement(dto: Partial<Announcement>): Promise<Announcement> {
    const announcement = this.announcements.create(dto);
    return this.announcements.save(announcement);
  }

  async updateAnnouncement(id: string, dto: Partial<Announcement>): Promise<Announcement> {
    const a = await this.announcements.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Announcement not found');
    Object.assign(a, dto);
    return this.announcements.save(a);
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.announcements.softDelete(id);
  }

  // Blog
  getPublishedPosts(categorySlug?: string, page = 1, limit = 10) {
    const qb = this.posts
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.status = :status', { status: 'published' })
      .orderBy('p.published_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (categorySlug) qb.andWhere('c.slug = :slug', { slug: categorySlug });
    return qb.getManyAndCount().then(([data, total]) => ({
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    }));
  }

  async getPostBySlug(slug: string): Promise<BlogPost> {
    const post = await this.posts.findOne({ where: { slug, status: 'published' } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async createPost(dto: Partial<BlogPost>): Promise<BlogPost> {
    const post = this.posts.create(dto);
    return this.posts.save(post);
  }

  async updatePost(id: string, dto: Partial<BlogPost>): Promise<BlogPost> {
    const post = await this.posts.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    Object.assign(post, dto);
    return this.posts.save(post);
  }

  getCategories() {
    return this.categories.find({ order: { name: 'ASC' } });
  }

  // Gallery
  getGallery(category?: string, page = 1, limit = 20) {
    const qb = this.gallery
      .createQueryBuilder('g')
      .where('g.is_public = true')
      .orderBy('g.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (category) qb.andWhere('g.category = :category', { category });
    return qb.getManyAndCount().then(([data, total]) => ({
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    }));
  }

  adminGetGallery(category?: string, page = 1, limit = 50) {
    const qb = this.gallery
      .createQueryBuilder('g')
      .orderBy('g.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (category) qb.andWhere('g.category = :category', { category });
    return qb.getManyAndCount().then(([data, total]) => ({
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    }));
  }

  async addGalleryItem(dto: Partial<GalleryItem>): Promise<GalleryItem> {
    const item = this.gallery.create(dto);
    return this.gallery.save(item);
  }

  async updateGalleryItem(id: string, dto: Partial<GalleryItem>): Promise<GalleryItem> {
    const item = await this.gallery.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Gallery item not found');
    Object.assign(item, dto);
    return this.gallery.save(item);
  }

  async deleteGalleryItem(id: string): Promise<void> {
    const item = await this.gallery.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Gallery item not found');
    await this.gallery.remove(item);
  }
}
