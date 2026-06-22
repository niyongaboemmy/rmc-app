'use client';

import { BookOpen, Heart, GraduationCap, Globe, type LucideIcon } from 'lucide-react';
import { pick, isRtl, type AreaItem } from '@/lib/content-api';

const ICONS: Record<string, LucideIcon> = { BookOpen, Heart, GraduationCap, Globe };

interface Props {
  item: AreaItem;
  locale: string;
  pillarIndex: number;
}

export function AreaDetail({ item, locale, pillarIndex }: Props) {
  const Icon = ICONS[item.icon] ?? Globe;
  const rtl = isRtl(locale);
  const arFont = locale === 'ar' ? 'font-arabic' : '';
  const title = pick(item.title, locale);
  const description = pick(item.description, locale);
  const richContent = item.richContent ? pick(item.richContent, locale) : null;

  return (
    <article dir={rtl ? 'rtl' : 'ltr'} className="max-w-3xl mx-auto">
      {/* Icon + pillar badge */}
      <div className="flex items-center gap-5 mb-8">
        <span className="grid place-items-center w-20 h-20 rounded-3xl bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-lg shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30 shrink-0">
          <Icon className="w-10 h-10" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rmc-gold mb-1">
            Pillar {String(pillarIndex).padStart(2, '0')}
          </p>
          <h1 className={`text-3xl md:text-4xl font-bold text-gray-900 leading-tight ${arFont}`}>
            {title}
          </h1>
        </div>
      </div>

      {/* Gold divider */}
      <span className="block h-1 w-16 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light mb-8" />

      {/* Description */}
      <p className={`text-lg text-gray-600 leading-relaxed mb-8 ${arFont}`}>
        {description}
      </p>

      {/* Rich content */}
      {richContent && (
        <div
          className={`prose prose-green max-w-none text-gray-700 leading-relaxed ${arFont}`}
          dangerouslySetInnerHTML={{ __html: richContent }}
        />
      )}

      {!richContent && (
        <div className="rounded-2xl border border-rmc-green/10 bg-rmc-green-light/30 p-6 text-sm text-rmc-green-dark/70">
          Detailed content for this area is coming soon.
        </div>
      )}
    </article>
  );
}
