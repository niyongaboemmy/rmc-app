import { PrayerTimesService } from './prayer-times.service';
declare class AdjustmentsDto {
    fajrAdj?: number;
    sunriseAdj?: number;
    dhuhrAdj?: number;
    asrAdj?: number;
    maghribAdj?: number;
    ishaAdj?: number;
}
export declare class PrayerTimesController {
    private readonly service;
    constructor(service: PrayerTimesService);
    getPrayerTimes(lat?: string, lng?: string, mosqueId?: string, dateStr?: string): Promise<import("./prayer-times.service").PrayerTimesResult>;
    getWeekly(lat?: string, lng?: string): Promise<import("./prayer-times.service").PrayerTimesResult[]>;
    getAdjustments(mosqueId: string): Promise<import("./entities/prayer-time-adjustment.entity").PrayerTimeAdjustment | null>;
    setAdjustments(mosqueId: string, dto: AdjustmentsDto): Promise<import("./entities/prayer-time-adjustment.entity").PrayerTimeAdjustment>;
}
export {};
