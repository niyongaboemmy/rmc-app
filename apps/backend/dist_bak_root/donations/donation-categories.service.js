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
exports.DonationCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const donation_category_entity_1 = require("./entities/donation-category.entity");
const donation_subfund_entity_1 = require("./entities/donation-subfund.entity");
let DonationCategoriesService = class DonationCategoriesService {
    constructor(categories, subfunds) {
        this.categories = categories;
        this.subfunds = subfunds;
    }
    async listPublic(locale) {
        const loc = (['en', 'rw', 'ar'].includes(locale) ? locale : 'en');
        const cats = await this.categories.find({
            where: { status: 'active' },
            relations: ['subfunds'],
            order: { sortOrder: 'ASC' },
        });
        const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
        return cats.map((c) => ({
            id: c.id,
            key: c.key,
            icon: c.icon,
            tone: c.tone,
            image: c.image,
            title: c[`title${cap(loc)}`],
            desc: c[`desc${cap(loc)}`],
            long: c[`long${cap(loc)}`],
            impact: c[`impact${cap(loc)}`],
            subfunds: (c.subfunds ?? [])
                .filter((s) => s.status === 'active')
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((s) => ({
                id: s.id,
                key: s.key,
                image: s.image,
                campaignSlug: s.campaignSlug,
                label: s[`label${cap(loc)}`],
                long: s[`long${cap(loc)}`],
                impact: s[`impact${cap(loc)}`],
                examples: s[`examples${cap(loc)}`],
            })),
        }));
    }
    adminList() {
        return this.categories.find({ relations: ['subfunds'], order: { sortOrder: 'ASC' } });
    }
    applyTri(target, field, tri) {
        if (!tri)
            return;
        const t = target;
        if (tri.en !== undefined)
            t[`${field}En`] = tri.en;
        if (tri.rw !== undefined)
            t[`${field}Rw`] = tri.rw;
        if (tri.ar !== undefined)
            t[`${field}Ar`] = tri.ar;
    }
    applyTriList(target, field, tri) {
        if (!tri)
            return;
        const t = target;
        if (tri.en !== undefined)
            t[`${field}En`] = tri.en;
        if (tri.rw !== undefined)
            t[`${field}Rw`] = tri.rw;
        if (tri.ar !== undefined)
            t[`${field}Ar`] = tri.ar;
    }
    async createCategory(dto) {
        const c = this.categories.create({
            key: dto.key,
            icon: dto.icon ?? 'HandHeart',
            tone: dto.tone ?? 'green',
            image: dto.image ?? null,
            sortOrder: dto.sortOrder ?? 0,
            status: dto.status ?? 'active',
        });
        this.applyTri(c, 'title', dto.title);
        this.applyTri(c, 'desc', dto.desc);
        this.applyTri(c, 'long', dto.long);
        this.applyTri(c, 'impact', dto.impact);
        return this.categories.save(c);
    }
    async updateCategory(id, dto) {
        const c = await this.categories.findOne({ where: { id } });
        if (!c)
            throw new common_1.NotFoundException('Category not found');
        if (dto.key !== undefined)
            c.key = dto.key;
        if (dto.icon !== undefined)
            c.icon = dto.icon;
        if (dto.tone !== undefined)
            c.tone = dto.tone;
        if (dto.image !== undefined)
            c.image = dto.image || null;
        if (dto.sortOrder !== undefined)
            c.sortOrder = dto.sortOrder;
        if (dto.status !== undefined)
            c.status = dto.status;
        this.applyTri(c, 'title', dto.title);
        this.applyTri(c, 'desc', dto.desc);
        this.applyTri(c, 'long', dto.long);
        this.applyTri(c, 'impact', dto.impact);
        return this.categories.save(c);
    }
    async deleteCategory(id) {
        const c = await this.categories.findOne({ where: { id } });
        if (!c)
            throw new common_1.NotFoundException('Category not found');
        await this.categories.softRemove(c);
        return { id };
    }
    adminListDeletedCategories() {
        return this.categories.find({
            withDeleted: true,
            where: { deletedAt: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) },
            relations: ['subfunds'],
            order: { deletedAt: 'DESC' },
        });
    }
    async restoreCategory(id) {
        const c = await this.categories.findOne({ where: { id }, withDeleted: true });
        if (!c)
            throw new common_1.NotFoundException('Category not found');
        if (c.deletedAt)
            await this.categories.recover(c);
        return { id };
    }
    async createSubFund(categoryId, dto) {
        const cat = await this.categories.findOne({ where: { id: categoryId } });
        if (!cat)
            throw new common_1.NotFoundException('Category not found');
        const s = this.subfunds.create({
            categoryId,
            key: dto.key,
            image: dto.image ?? null,
            campaignSlug: dto.campaignSlug ?? null,
            sortOrder: dto.sortOrder ?? 0,
            status: dto.status ?? 'active',
        });
        this.applyTri(s, 'label', dto.label);
        this.applyTri(s, 'long', dto.long);
        this.applyTri(s, 'impact', dto.impact);
        this.applyTriList(s, 'examples', dto.examples);
        return this.subfunds.save(s);
    }
    async updateSubFund(id, dto) {
        const s = await this.subfunds.findOne({ where: { id } });
        if (!s)
            throw new common_1.NotFoundException('Sub-fund not found');
        if (dto.key !== undefined)
            s.key = dto.key;
        if (dto.image !== undefined)
            s.image = dto.image || null;
        if (dto.campaignSlug !== undefined)
            s.campaignSlug = dto.campaignSlug || null;
        if (dto.sortOrder !== undefined)
            s.sortOrder = dto.sortOrder;
        if (dto.status !== undefined)
            s.status = dto.status;
        this.applyTri(s, 'label', dto.label);
        this.applyTri(s, 'long', dto.long);
        this.applyTri(s, 'impact', dto.impact);
        this.applyTriList(s, 'examples', dto.examples);
        return this.subfunds.save(s);
    }
    async deleteSubFund(id) {
        const s = await this.subfunds.findOne({ where: { id } });
        if (!s)
            throw new common_1.NotFoundException('Sub-fund not found');
        await this.subfunds.remove(s);
        return { id };
    }
};
exports.DonationCategoriesService = DonationCategoriesService;
exports.DonationCategoriesService = DonationCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(donation_category_entity_1.DonationCategory)),
    __param(1, (0, typeorm_1.InjectRepository)(donation_subfund_entity_1.DonationSubFund)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], DonationCategoriesService);
//# sourceMappingURL=donation-categories.service.js.map