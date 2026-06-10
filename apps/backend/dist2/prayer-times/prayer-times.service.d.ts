import { Repository } from 'typeorm';
import { PrayerTimeAdjustment } from './entities/prayer-time-adjustment.entity';
export interface PrayerTimesResult {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    date: string;
    location: {
        lat: number;
        lng: number;
    };
    mosqueId?: string;
}
export declare class PrayerTimesService {
    private adjustments;
    constructor(adjustments: Repository<PrayerTimeAdjustment>);
    calculate(lat: number, lng: number, date?: Date, mosqueId?: string): Promise<PrayerTimesResult>;
    calculateForKigali(date?: Date): Promise<PrayerTimesResult>;
    setAdjustments(mosqueId: string, dto: Partial<Omit<PrayerTimeAdjustment, 'id' | 'mosqueId' | 'updatedAt'>>): Promise<PrayerTimeAdjustment>;
    getAdjustments(mosqueId: string): Promise<PrayerTimeAdjustment | null>;
    generateWeeklySchedule(lat: number, lng: number): Promise<PrayerTimesResult[]>;
}
