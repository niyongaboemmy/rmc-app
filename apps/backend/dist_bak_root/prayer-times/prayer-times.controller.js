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
exports.PrayerTimesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
const prayer_times_service_1 = require("./prayer-times.service");
class AdjustmentsDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdjustmentsDto.prototype, "fajrAdj", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdjustmentsDto.prototype, "sunriseAdj", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdjustmentsDto.prototype, "dhuhrAdj", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdjustmentsDto.prototype, "asrAdj", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdjustmentsDto.prototype, "maghribAdj", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdjustmentsDto.prototype, "ishaAdj", void 0);
let PrayerTimesController = class PrayerTimesController {
    constructor(service) {
        this.service = service;
    }
    async getPrayerTimes(lat, lng, mosqueId, dateStr) {
        const latitude = lat ? parseFloat(lat) : undefined;
        const longitude = lng ? parseFloat(lng) : undefined;
        const date = dateStr ? new Date(dateStr) : undefined;
        if (latitude !== undefined && longitude !== undefined) {
            return this.service.calculate(latitude, longitude, date, mosqueId);
        }
        return this.service.calculateForKigali(date);
    }
    getWeekly(lat, lng) {
        const latitude = lat ? parseFloat(lat) : -1.9403;
        const longitude = lng ? parseFloat(lng) : 29.8739;
        return this.service.generateWeeklySchedule(latitude, longitude);
    }
    getAdjustments(mosqueId) {
        return this.service.getAdjustments(mosqueId);
    }
    setAdjustments(mosqueId, dto) {
        return this.service.setAdjustments(mosqueId, dto);
    }
};
exports.PrayerTimesController = PrayerTimesController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get prayer times for coordinates or Kigali by default' }),
    (0, swagger_1.ApiQuery)({ name: 'lat', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'lng', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'mosqueId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'date', required: false, description: 'YYYY-MM-DD' }),
    __param(0, (0, common_1.Query)('lat')),
    __param(1, (0, common_1.Query)('lng')),
    __param(2, (0, common_1.Query)('mosqueId')),
    __param(3, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PrayerTimesController.prototype, "getPrayerTimes", null);
__decorate([
    (0, common_1.Get)('weekly'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get weekly prayer schedule' }),
    (0, swagger_1.ApiQuery)({ name: 'lat', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'lng', required: false, type: Number }),
    __param(0, (0, common_1.Query)('lat')),
    __param(1, (0, common_1.Query)('lng')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PrayerTimesController.prototype, "getWeekly", null);
__decorate([
    (0, common_1.Get)('mosque/:mosqueId/adjustments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get prayer time adjustments for a mosque' }),
    __param(0, (0, common_1.Param)('mosqueId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrayerTimesController.prototype, "getAdjustments", null);
__decorate([
    (0, common_1.Put)('mosque/:mosqueId/adjustments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PRAYER_TIMES_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Set prayer time minute adjustments for a mosque' }),
    __param(0, (0, common_1.Param)('mosqueId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AdjustmentsDto]),
    __metadata("design:returntype", void 0)
], PrayerTimesController.prototype, "setAdjustments", null);
exports.PrayerTimesController = PrayerTimesController = __decorate([
    (0, swagger_1.ApiTags)('Prayer Times'),
    (0, common_1.Controller)('prayer-times'),
    __metadata("design:paramtypes", [prayer_times_service_1.PrayerTimesService])
], PrayerTimesController);
//# sourceMappingURL=prayer-times.controller.js.map