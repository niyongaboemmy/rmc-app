import Redis from 'ioredis';
export interface PrayerTimes {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    date: string;
}
export interface HijriDate {
    day: string;
    month: {
        number: number;
        en: string;
        ar: string;
    };
    year: string;
}
export declare class HijriService {
    private readonly redis;
    private readonly logger;
    constructor(redis: Redis);
    getPrayerTimes(lat: number, lng: number, date?: string): Promise<PrayerTimes>;
    toHijri(gregorianDate?: string): Promise<HijriDate>;
}
