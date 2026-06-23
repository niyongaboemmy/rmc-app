import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '../../common/decorators/inject-redis.decorator';
import Redis from 'ioredis';

const ALADHAN_BASE = 'https://api.aladhan.com/v1';
const CACHE_TTL = 3600; // 1 hour in seconds

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
  month: { number: number; en: string; ar: string };
  year: string;
}

@Injectable()
export class HijriService {
  private readonly logger = new Logger(HijriService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getPrayerTimes(lat: number, lng: number, date?: string): Promise<PrayerTimes> {
    const d = date ?? new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const cacheKey = `prayer:${lat}:${lng}:${d}`;

    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    try {
      const res = await fetch(
        `${ALADHAN_BASE}/timings/${d}?latitude=${lat}&longitude=${lng}&method=2`,
      );
      if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);
      const data = await res.json();
      const t = data.data.timings;

      const result: PrayerTimes = {
        fajr: t.Fajr,
        sunrise: t.Sunrise,
        dhuhr: t.Dhuhr,
        asr: t.Asr,
        maghrib: t.Maghrib,
        isha: t.Isha,
        date: d,
      };

      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL).catch(() => {});
      return result;
    } catch (err) {
      this.logger.error(`Prayer times fetch failed: ${err}`);
      throw err;
    }
  }

  async toHijri(gregorianDate?: string): Promise<HijriDate> {
    const d = gregorianDate ?? new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const cacheKey = `hijri:${d}`;

    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    try {
      const res = await fetch(`${ALADHAN_BASE}/gToH/${d}`);
      if (!res.ok) throw new Error(`Aladhan gToH error: ${res.status}`);
      const data = await res.json();
      const hijri = data.data.hijri;

      const result: HijriDate = {
        day: hijri.day,
        month: {
          number: hijri.month.number,
          en: hijri.month.en,
          ar: hijri.month.ar,
        },
        year: hijri.year,
      };

      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL * 24).catch(() => {});
      return result;
    } catch (err) {
      this.logger.error(`Hijri conversion failed: ${err}`);
      throw err;
    }
  }
}
