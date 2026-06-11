"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrayerTimesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const prayer_time_adjustment_entity_1 = require("./entities/prayer-time-adjustment.entity");
const prayer_times_service_1 = require("./prayer-times.service");
const prayer_times_controller_1 = require("./prayer-times.controller");
let PrayerTimesModule = class PrayerTimesModule {
};
exports.PrayerTimesModule = PrayerTimesModule;
exports.PrayerTimesModule = PrayerTimesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([prayer_time_adjustment_entity_1.PrayerTimeAdjustment])],
        providers: [prayer_times_service_1.PrayerTimesService],
        controllers: [prayer_times_controller_1.PrayerTimesController],
        exports: [prayer_times_service_1.PrayerTimesService],
    })
], PrayerTimesModule);
//# sourceMappingURL=prayer-times.module.js.map