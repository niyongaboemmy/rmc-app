"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const verse_of_day_entity_1 = require("./entities/verse-of-day.entity");
const announcement_entity_1 = require("./entities/announcement.entity");
const blog_post_entity_1 = require("./entities/blog-post.entity");
const gallery_item_entity_1 = require("./entities/gallery-item.entity");
let PublicService = class PublicService {
    constructor(verses, announcements, posts, categories, gallery) {
        this.verses = verses;
        this.announcements = announcements;
        this.posts = posts;
        this.categories = categories;
        this.gallery = gallery;
    }
    async getVerseOfDay() {
        const today = new Date().toISOString().split('T')[0];
        return this.verses.findOne({ where: { displayDate: new Date(today) } });
    }
    async createVerse(dto) {
        const verse = this.verses.create(dto);
        return this.verses.save(verse);
    }
    getActiveAnnouncements(type, limit = 10, includeExpired = false) {
        const now = new Date();
        const qb = this.announcements
            .createQueryBuilder('a')
            .where('a.is_published = :pub', { pub: true })
            .andWhere('a.publish_at <= :now', { now })
            .orderBy(`CASE a.priority WHEN 'urgent' THEN 3 WHEN 'high' THEN 2 ELSE 1 END`, 'DESC')
            .addOrderBy('a.publish_at', 'DESC')
            .take(limit);
        if (type)
            qb.andWhere('a.type = :type', { type });
        if (!includeExpired) {
            qb.andWhere('(a.expires_at IS NULL OR a.expires_at >= :exp)', { exp: now });
        }
        return qb.getMany();
    }
    async getAnnouncementById(id) {
        const a = await this.announcements.findOne({ where: { id } });
        if (!a)
            throw new common_1.NotFoundException('Announcement not found');
        return a;
    }
    adminGetAllAnnouncements(type, limit = 100) {
        return this.announcements.find({
            where: { ...(type ? { type } : {}) },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async createAnnouncement(dto) {
        const announcement = this.announcements.create(dto);
        return this.announcements.save(announcement);
    }
    async updateAnnouncement(id, dto) {
        const a = await this.announcements.findOne({ where: { id } });
        if (!a)
            throw new common_1.NotFoundException('Announcement not found');
        Object.assign(a, dto);
        return this.announcements.save(a);
    }
    async deleteAnnouncement(id) {
        await this.announcements.softDelete(id);
    }
    getPublishedPosts(categorySlug, page = 1, limit = 10) {
        const qb = this.posts.createQueryBuilder('p')
            .leftJoinAndSelect('p.category', 'c')
            .where('p.status = :status', { status: 'published' })
            .orderBy('p.published_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (categorySlug)
            qb.andWhere('c.slug = :slug', { slug: categorySlug });
        return qb.getManyAndCount().then(([data, total]) => ({
            data, total, page, pages: Math.ceil(total / limit),
        }));
    }
    async getPostBySlug(slug) {
        const post = await this.posts.findOne({ where: { slug, status: 'published' } });
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        return post;
    }
    async createPost(dto) {
        const post = this.posts.create(dto);
        return this.posts.save(post);
    }
    async updatePost(id, dto) {
        const post = await this.posts.findOne({ where: { id } });
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        Object.assign(post, dto);
        return this.posts.save(post);
    }
    getCategories() {
        return this.categories.find({ order: { name: 'ASC' } });
    }
    getGallery(category, page = 1, limit = 20) {
        const qb = this.gallery.createQueryBuilder('g')
            .where('g.is_public = true')
            .orderBy('g.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (category)
            qb.andWhere('g.category = :category', { category });
        return qb.getManyAndCount().then(([data, total]) => ({
            data, total, page, pages: Math.ceil(total / limit),
        }));
    }
    adminGetGallery(category, page = 1, limit = 50) {
        const qb = this.gallery.createQueryBuilder('g')
            .orderBy('g.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (category)
            qb.andWhere('g.category = :category', { category });
        return qb.getManyAndCount().then(([data, total]) => ({
            data, total, page, pages: Math.ceil(total / limit),
        }));
    }
    async addGalleryItem(dto) {
        const item = this.gallery.create(dto);
        return this.gallery.save(item);
    }
    async updateGalleryItem(id, dto) {
        const item = await this.gallery.findOne({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Gallery item not found');
        Object.assign(item, dto);
        return this.gallery.save(item);
    }
    async deleteGalleryItem(id) {
        const item = await this.gallery.findOne({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Gallery item not found');
        await this.gallery.remove(item);
    }
};
exports.PublicService = PublicService;
exports.PublicService = PublicService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(verse_of_day_entity_1.VerseOfDay)),
    __param(1, (0, typeorm_1.InjectRepository)(announcement_entity_1.Announcement)),
    __param(2, (0, typeorm_1.InjectRepository)(blog_post_entity_1.BlogPost)),
    __param(3, (0, typeorm_1.InjectRepository)(blog_post_entity_1.BlogCategory)),
    __param(4, (0, typeorm_1.InjectRepository)(gallery_item_entity_1.GalleryItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PublicService);
//# sourceMappingURL=public.service.js.map