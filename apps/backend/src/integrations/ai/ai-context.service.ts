import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Mosque } from '../../mosques/entities/mosque.entity';

const TTL_MS = 60_000; // re-query the directory at most once a minute
const MAX_MOSQUES = 400; // bound the prompt size

/** Keywords (EN/RW/FR/AR) that indicate the visitor is asking about a mosque or imam. */
const MOSQUE_KEYWORDS = [
  'mosque',
  'mosqu',
  'masjid',
  'masjd',
  'imam',
  'imamu',
  'sheikh',
  'cheikh',
  'jumu',
  'friday prayer',
  'umusigiti',
  'imisigiti',
  'misigiti',
  'مسجد',
  'جامع',
  'إمام',
  'امام',
  'مساجد',
];

/**
 * Builds live "knowledge" sections from the database (currently the mosque /
 * imam directory) to append to the assistant's system prompt on demand.
 */
@Injectable()
export class AiContextService {
  private readonly logger = new Logger(AiContextService.name);
  private cache: { text: string; at: number } | null = null;

  constructor(@InjectRepository(Mosque) private readonly mosques: Repository<Mosque>) {}

  /** Returns true if the visitor's latest message is about a mosque or imam. */
  isMosqueQuery(message: string): boolean {
    const lower = message.toLowerCase();
    return MOSQUE_KEYWORDS.some((k) => lower.includes(k));
  }

  /** Live mosque directory (name, location, imam, contact), cached briefly. */
  async getMosqueDirectory(): Promise<string> {
    if (this.cache && Date.now() - this.cache.at < TTL_MS) return this.cache.text;

    let text: string;
    try {
      const rows = await this.mosques.find({
        where: { status: Not('inactive') },
        order: { name: 'ASC' },
        take: MAX_MOSQUES,
      });

      if (rows.length === 0) {
        text =
          '## Registered mosques (live from the RMC database)\n' +
          '(No mosques have been added to the directory yet. If a visitor asks about a specific ' +
          "mosque or its imam, tell them it isn't listed in the directory yet and point them to the " +
          'Find a Mosque tool on the Contact page (/contact).)';
      } else {
        const lines = rows.map((m) => {
          const parts = [`- ${m.name}`];
          if (m.address) parts.push(`— ${m.address}`);
          if (m.imamName) parts.push(`; Imam: ${m.imamName}`);
          const tel = m.imamPhone || m.phone;
          if (tel) parts.push(`; Tel: ${tel}`);
          if (m.fridayPrayerTime) parts.push(`; Jumu'ah ${m.fridayPrayerTime}`);
          return parts.join(' ');
        });
        text =
          `## Registered mosques (live from the RMC database) — ${rows.length} listed\n` +
          'Use this list to answer questions about specific mosques and their imams. If a mosque a ' +
          "visitor asks about is NOT in this list, say it isn't listed in the directory yet and suggest " +
          'the Find a Mosque tool on the Contact page (/contact). Do not invent imam names or numbers.\n' +
          lines.join('\n');
      }
    } catch (err) {
      this.logger.warn(`Failed to build mosque directory: ${err}`);
      text = '';
    }

    this.cache = { text, at: Date.now() };
    return text;
  }
}
