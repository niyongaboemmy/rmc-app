import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Adhan from 'adhan';
import { PrayerTimeAdjustment } from './entities/prayer-time-adjustment.entity';

export interface PrayerTimesResult {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
  location: { lat: number; lng: number };
  mosqueId?: string;
}

function toTimeStr(date: Date, offsetMin = 0): string {
  const d = new Date(date.getTime() + offsetMin * 60000);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Kigali coordinates as default
const KIGALI_LAT = -1.9403;
const KIGALI_LNG = 29.8739;

@Injectable()
export class PrayerTimesService {
  constructor(
    @InjectRepository(PrayerTimeAdjustment)
    private adjustments: Repository<PrayerTimeAdjustment>,
  ) {}

  async calculate(
    lat: number,
    lng: number,
    date?: Date,
    mosqueId?: string,
  ): Promise<PrayerTimesResult> {
    const target = date ?? new Date();
    const coordinates = new Adhan.Coordinates(lat, lng);
    const params = Adhan.CalculationMethod.MuslimWorldLeague();
    const times = new Adhan.PrayerTimes(coordinates, target, params);

    let adj: PrayerTimeAdjustment | null = null;
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

  calculateForKigali(date?: Date) {
    return this.calculate(KIGALI_LAT, KIGALI_LNG, date);
  }

  async setAdjustments(
    mosqueId: string,
    dto: Partial<Omit<PrayerTimeAdjustment, 'id' | 'mosqueId' | 'updatedAt'>>,
  ): Promise<PrayerTimeAdjustment> {
    let record = await this.adjustments.findOne({ where: { mosqueId } });
    if (!record) {
      record = this.adjustments.create({ mosqueId, ...dto });
    } else {
      Object.assign(record, dto);
    }
    return this.adjustments.save(record);
  }

  getAdjustments(mosqueId: string) {
    return this.adjustments.findOne({ where: { mosqueId } });
  }

  async generateWeeklySchedule(lat: number, lng: number): Promise<PrayerTimesResult[]> {
    const schedule: PrayerTimesResult[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      schedule.push(await this.calculate(lat, lng, d));
    }
    return schedule;
  }
}
