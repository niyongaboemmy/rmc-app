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
var HijriService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HijriService = void 0;
const common_1 = require("@nestjs/common");
const inject_redis_decorator_1 = require("../../common/decorators/inject-redis.decorator");
const ioredis_1 = require("ioredis");
const ALADHAN_BASE = 'https://api.aladhan.com/v1';
const CACHE_TTL = 3600;
let HijriService = HijriService_1 = class HijriService {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger(HijriService_1.name);
    }
    async getPrayerTimes(lat, lng, date) {
        const d = date ?? new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const cacheKey = `prayer:${lat}:${lng}:${d}`;
        const cached = await this.redis.get(cacheKey).catch(() => null);
        if (cached)
            return JSON.parse(cached);
        try {
            const res = await fetch(`${ALADHAN_BASE}/timings/${d}?latitude=${lat}&longitude=${lng}&method=2`);
            if (!res.ok)
                throw new Error(`Aladhan API error: ${res.status}`);
            const data = await res.json();
            const t = data.data.timings;
            const result = {
                fajr: t.Fajr,
                sunrise: t.Sunrise,
                dhuhr: t.Dhuhr,
                asr: t.Asr,
                maghrib: t.Maghrib,
                isha: t.Isha,
                date: d,
            };
            await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL).catch(() => { });
            return result;
        }
        catch (err) {
            this.logger.error(`Prayer times fetch failed: ${err}`);
            throw err;
        }
    }
    async toHijri(gregorianDate) {
        const d = gregorianDate ?? new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const cacheKey = `hijri:${d}`;
        const cached = await this.redis.get(cacheKey).catch(() => null);
        if (cached)
            return JSON.parse(cached);
        try {
            const res = await fetch(`${ALADHAN_BASE}/gToH/${d}`);
            if (!res.ok)
                throw new Error(`Aladhan gToH error: ${res.status}`);
            const data = await res.json();
            const hijri = data.data.hijri;
            const result = {
                day: hijri.day,
                month: {
                    number: hijri.month.number,
                    en: hijri.month.en,
                    ar: hijri.month.ar,
                },
                year: hijri.year,
            };
            await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL * 24).catch(() => { });
            return result;
        }
        catch (err) {
            this.logger.error(`Hijri conversion failed: ${err}`);
            throw err;
        }
    }
};
exports.HijriService = HijriService;
exports.HijriService = HijriService = HijriService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, inject_redis_decorator_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_1.default])
], HijriService);
//# sourceMappingURL=hijri.service.js.map