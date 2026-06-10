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
exports.PrayerTimesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const Adhan = require("adhan");
const prayer_time_adjustment_entity_1 = require("./entities/prayer-time-adjustment.entity");
function toTimeStr(date, offsetMin = 0) {
    const d = new Date(date.getTime() + offsetMin * 60000);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
const KIGALI_LAT = -1.9403;
const KIGALI_LNG = 29.8739;
let PrayerTimesService = class PrayerTimesService {
    constructor(adjustments) {
        this.adjustments = adjustments;
    }
    async calculate(lat, lng, date, mosqueId) {
        const target = date ?? new Date();
        const coordinates = new Adhan.Coordinates(lat, lng);
        const params = Adhan.CalculationMethod.MuslimWorldLeague();
        const times = new Adhan.PrayerTimes(coordinates, target, params);
        let adj = null;
        if (mosqueId) {
            adj = await this.adjustments.findOne({ where: { mosqueId } });
        }
        return {
            fajr: toTimeStr(times.fajr, adj?.fajrAdj ?? 0),
            sunrise: toTimeStr(times.sunrise, adj?.sunriseAdj ?? 0),
            dhuhr: toTimeStr(times.dhuhr, adj?.dhuhrAdj ?? 0),
            asr: toTimeStr(times.asr, adj?.asrAdj ?? 0),
            maghrib: toTimeStr(times.maghrib, adj?.maghribAdj ?? 0),
            isha: toTimeStr(times.isha, adj?.ishaAdj ?? 0),
            date: target.toISOString().split('T')[0],
            location: { lat, lng },
            ...(mosqueId ? { mosqueId } : {}),
        };
    }
    calculateForKigali(date) {
        return this.calculate(KIGALI_LAT, KIGALI_LNG, date);
    }
    async setAdjustments(mosqueId, dto) {
        let record = await this.adjustments.findOne({ where: { mosqueId } });
        if (!record) {
            record = this.adjustments.create({ mosqueId, ...dto });
        }
        else {
            Object.assign(record, dto);
        }
        return this.adjustments.save(record);
    }
    getAdjustments(mosqueId) {
        return this.adjustments.findOne({ where: { mosqueId } });
    }
    async generateWeeklySchedule(lat, lng) {
        const schedule = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            schedule.push(await this.calculate(lat, lng, d));
        }
        return schedule;
    }
};
exports.PrayerTimesService = PrayerTimesService;
exports.PrayerTimesService = PrayerTimesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(prayer_time_adjustment_entity_1.PrayerTimeAdjustment)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PrayerTimesService);
//# sourceMappingURL=prayer-times.service.js.map