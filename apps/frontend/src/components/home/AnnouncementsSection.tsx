'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { publicApi } from '@/lib/public-api';

type I18n = { en: string; rw: string; ar: string };

type DbAnnouncement = {
  id: string;
  title: string;
  content: string;
  titleI18n: I18n | null;
  contentI18n: I18n | null;
  priority: string;
  publishAt: string;
  expiresAt: string | null;
  type: string;
  attachments: Array<{ key: string; name: string; mimeType: string; size: number }>;
};

function pick(i18n: I18n | null | undefined, fallback: string, locale: string): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof I18n] || i18n.en || fallback;
}

function isRtl(locale: string) { return locale === 'ar'; }

function priorityConfig(priority: string) {
  if (priority === 'urgent') return { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-600', Icon: AlertTriangle, dot: 'bg-red-400' };
  if (priority === 'high')   return { bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-600', Icon: Bell, dot: 'bg-orange-400' };
  return { bg: 'bg-blue-50/50 border-blue-100', badge: 'bg-blue-100 text-blue-600', Icon: Info, dot: 'bg-blue-400' };
}

export function AnnouncementsSection() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('home.announcements');
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  const [items, setItems] = useState<DbAnnouncement[]>([]);

  useEffect(() => {
    let active = true;
    publicApi
      .getAnnouncements('announcement', 5, false)
      .then((data) => { if (active) setItems(data as DbAnnouncement[]); })
      .catch(() => { /* keep empty */ });
    return () => { active = false; };
  }, []);

  const rtl = isRtl(locale);

  return (
    <section className="bg-transparent py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={titleRef}
          className={`flex items-center justify-between mb-8 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rmc-green/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-rmc-green" />
            </div>
            <div>
              <h2
                className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${rtl ? 'font-arabic' : ''}`}
                dir={rtl ? 'rtl' : 'ltr'}
              >
                {t('title')}
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">Latest news & updates</p>
            </div>
          </div>
          {items.length > 0 && (
            <Link
              href={`/${locale}/announcements`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="text-center py-14 text-gray-300">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t('noAnnouncements')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const config = priorityConfig(item.priority);
              return (
                <AnnouncementItem
                  key={item.id}
                  item={item}
                  locale={locale}
                  config={config}
                  delay={i * 80}
                  parentVisible={titleVisible}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function AnnouncementItem({
  item,
  locale,
  config,
  delay,
  parentVisible,
}: {
  item: DbAnnouncement;
  locale: string;
  config: ReturnType<typeof priorityConfig>;
  delay: number;
  parentVisible: boolean;
}) {
  const { Icon } = config;
  const rtl = isRtl(locale);
  const title   = pick(item.titleI18n,   item.title,   locale);
  const content = pick(item.contentI18n, item.content, locale);

  return (
    <Link
      href={`/${locale}/announcements/${item.id}`}
      className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-500 hover:shadow-md hover:-translate-y-0.5 group cursor-pointer ${config.bg} ${
        parentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
      style={{ transitionDelay: `${delay + 200}ms` }}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.badge}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
          <h3
            className={`font-semibold text-gray-900 text-sm leading-tight group-hover:text-rmc-green transition-colors ${rtl ? 'font-arabic' : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {title}
          </h3>
        </div>
        <p
          className={`text-gray-500 text-xs leading-relaxed line-clamp-2 ${rtl ? 'font-arabic' : ''}`}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {content}
        </p>
      </div>

      {/* Date + arrow */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <time className="text-xs text-gray-300">
          {new Date(item.publishAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </time>
        <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-rmc-green group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
