'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, AlertTriangle, Info } from 'lucide-react';
import { publicApi } from '@/lib/public-api';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  publishAt: string;
}

function priorityConfig(priority: string) {
  if (priority === 'urgent') return { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-600', Icon: AlertTriangle, dot: 'bg-red-400' };
  if (priority === 'high') return { bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-600', Icon: Bell, dot: 'bg-orange-400' };
  return { bg: 'bg-blue-50/50 border-blue-100', badge: 'bg-blue-100 text-blue-600', Icon: Info, dot: 'bg-blue-400' };
}

export function AnnouncementsSection() {
  const t = useTranslations('home.announcements');
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  useEffect(() => {
    publicApi
      .getAnnouncements()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-transparent py-16">
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
              <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
              <p className="text-gray-400 text-xs mt-0.5">Latest news & updates</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4 p-5 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
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
  config,
  delay,
  parentVisible,
}: {
  item: Announcement;
  config: ReturnType<typeof priorityConfig>;
  delay: number;
  parentVisible: boolean;
}) {
  const { Icon } = config;

  return (
    <div
      className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-500 hover:shadow-md group ${config.bg} ${
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
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{item.title}</h3>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{item.content}</p>
      </div>

      {/* Date */}
      <time className="text-xs text-gray-300 shrink-0 mt-0.5">
        {new Date(item.publishAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        })}
      </time>
    </div>
  );
}
