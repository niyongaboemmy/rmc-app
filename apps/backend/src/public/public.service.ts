import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerseOfDay } from './entities/verse-of-day.entity';
import { Announcement } from './entities/announcement.entity';
import { BlogPost, BlogCategory } from './entities/blog-post.entity';
import { GalleryItem } from './entities/gallery-item.entity';

/** Readable URL slug. Kept byte-identical to the announcement-slug migration. */
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 130);
}

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
    try {
      const verse = this.verses.create(dto);
      return await this.verses.save(verse);
    } catch (e) {
      throw this.asDateConflict(e);
    }
  }

  /** All scheduled verses, newest display date first (admin management view). */
  async adminListVerses(): Promise<VerseOfDay[]> {
    return this.verses.find({ order: { displayDate: 'DESC' } });
  }

  async updateVerse(id: string, dto: Partial<VerseOfDay>): Promise<VerseOfDay> {
    const verse = await this.verses.findOne({ where: { id } });
    if (!verse) throw new NotFoundException('Verse not found');
    // Only persist mutable columns; id/createdBy/createdAt are never client-set.
    const { id: _id, createdBy: _cb, createdAt: _ca, ...patch } = dto;
    Object.assign(verse, patch);
    try {
      return await this.verses.save(verse);
    } catch (e) {
      throw this.asDateConflict(e);
    }
  }

  /**
   * displayDate is unique — one verse per day. Translate the Postgres
   * unique-violation (23505) into a clean 409 instead of a raw 500.
   */
  private asDateConflict(e: unknown): unknown {
    if ((e as { code?: string })?.code === '23505') {
      return new ConflictException('A verse is already scheduled for this date.');
    }
    return e;
  }

  async deleteVerse(id: string): Promise<{ success: boolean }> {
    const result = await this.verses.delete(id);
    if (!result.affected) throw new NotFoundException('Verse not found');
    return { success: true };
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
    // Tenders are viewed at /tenders/<slug>, so give every new one a stable,
    // unique slug from its title.
    if (announcement.type === 'tender' && !announcement.slug) {
      announcement.slug = await this.generateUniqueSlug(
        announcement.titleI18n?.en || announcement.title,
      );
    }
    return this.announcements.save(announcement);
  }

  async updateAnnouncement(id: string, dto: Partial<Announcement>): Promise<Announcement> {
    const a = await this.announcements.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Announcement not found');
    Object.assign(a, dto);
    // Slug is set once and kept stable (a changed title must not break existing
    // links); only backfill a tender that somehow still lacks one.
    if (a.type === 'tender' && !a.slug) {
      a.slug = await this.generateUniqueSlug(a.titleI18n?.en || a.title);
    }
    return this.announcements.save(a);
  }

  /** A tender's readable slug, de-duplicated against every existing slug. */
  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'tender';
    let slug = base;
    let n = 2;
    // withDeleted: a soft-deleted row still occupies the slug in the unique index.
    while (await this.announcements.count({ where: { slug }, withDeleted: true })) {
      slug = `${base}-${n++}`;
    }
    return slug;
  }

  /** Look a tender/announcement up by its slug — how the public detail page loads. */
  async getAnnouncementBySlug(slug: string): Promise<Announcement> {
    const a = await this.announcements.findOne({ where: { slug } });
    if (!a) throw new NotFoundException('Announcement not found');
    return a;
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
      // Order by the ENTITY property (publishedAt), not the DB column name.
      // With the category join + take(), TypeORM builds a DISTINCT pagination
      // sub-query and can only resolve the property alias — the snake_case
      // column name here made every call throw (500).
      .orderBy('p.publishedAt', 'DESC')
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
    // slug is NOT NULL + unique; derive a stable one from the title when the
    // caller omits it so a valid post never fails with a raw 500.
    if (!post.slug && post.title) post.slug = slugify(post.title);
    return this.posts.save(post);
  }

  async deletePost(id: string): Promise<{ success: boolean }> {
    const result = await this.posts.delete(id);
    if (!result.affected) throw new NotFoundException('Post not found');
    return { success: true };
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
