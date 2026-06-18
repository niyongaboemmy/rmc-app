'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Facebook, Twitter, Instagram, Youtube, Heart, MessageCircle, Share2, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  ContentKeys,
  SOCIAL_DEFAULT,
  getSiteContent,
  mergeContent,
  getSocialFeed,
  toRenderPost,
  formatCount,
  timeAgo,
  pick,
  isRtl,
  type SocialContent,
  type SocialChannel,
  type SocialPost,
} from '@/lib/content-api';

// Platform → icon/colours styling. Owned by the landing (not the content store).
const PLATFORM_CONFIG = {
  facebook: {
    Icon: Facebook,
    label: 'Facebook',
    bg: 'bg-blue-600',
    light: 'bg-blue-50 text-blue-600',
    border: 'border-blue-100',
  },
  twitter: {
    Icon: Twitter,
    label: 'X / Twitter',
    bg: 'bg-gray-900',
    light: 'bg-gray-100 text-gray-700',
    border: 'border-gray-100',
  },
  instagram: {
    Icon: Instagram,
    label: 'Instagram',
    bg: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    light: 'bg-pink-50 text-pink-600',
    border: 'border-pink-100',
  },
  youtube: {
    Icon: Youtube,
    label: 'YouTube',
    bg: 'bg-red-600',
    light: 'bg-red-50 text-red-600',
    border: 'border-red-100',
  },
};

// Channel key → icon/background. Owned by the landing (not the content store).
const CHANNEL_CONFIG: Record<SocialChannel['key'], { Icon: typeof Facebook; bg: string }> = {
  facebook: { Icon: Facebook, bg: 'bg-blue-600' },
  twitter: { Icon: Twitter, bg: 'bg-gray-900' },
  instagram: { Icon: Instagram, bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' },
  youtube: { Icon: Youtube, bg: 'bg-red-600' },
};

function PostCard({
  post,
  content,
  rtl,
  locale,
  delay,
  visible,
}: {
  post: SocialPost;
  content: string;
  rtl: boolean;
  locale: string;
  delay: number;
  visible: boolean;
}) {
  const config = PLATFORM_CONFIG[post.platform] ?? PLATFORM_CONFIG.facebook;
  const { Icon } = config;
  // Live posts carry an ISO timestamp → always-accurate "x ago"; admin/static
  // posts keep their pre-written date string.
  const dateLabel = post.publishedAt ? timeAgo(post.publishedAt) : post.date;

  return (
    <div
      className={`group bg-white rounded-2xl border ${config.border} shadow-sm hover:shadow-lg overflow-hidden transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Platform header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">{post.handle}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{config.label}</p>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.light}`}>
          {dateLabel}
        </span>
      </div>

      {/* Image */}
      {post.image &&
        (post.url ? (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="block relative h-40 overflow-hidden">
            <img
              src={post.image}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </a>
        ) : (
          <div className="relative h-40 overflow-hidden">
            <img
              src={post.image}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}

      {/* Content */}
      <div className="p-4">
        <p
          className={`text-sm text-gray-700 leading-relaxed line-clamp-3 ${rtl ? 'font-arabic' : ''}`}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-rose-500 transition-colors">
            <Heart className="w-3.5 h-3.5" />
            {post.likes}
          </button>
          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-sky-500 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" />
            {post.comments}
          </button>
          {post.url ? (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-rmc-green transition-colors ml-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {pick({ en: 'View', rw: 'Reba', ar: 'عرض' }, locale)}
            </a>
          ) : (
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-rmc-green transition-colors ml-auto">
              <Share2 className="w-3.5 h-3.5" />
              {pick({ en: 'Share', rw: 'Sangiza', ar: 'مشاركة' }, locale)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SocialMediaSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);
  const { ref: feedRef, visible: feedVisible } = useScrollReveal(0.05);

  // Content managed from Admin → Content → Social Media. Falls back to the
  // built-in defaults until something is saved (or if the fetch fails).
  const [content, setContent] = useState<SocialContent>(SOCIAL_DEFAULT);
  // Live posts pulled from the real RMC accounts by the backend (cached + polled).
  const [livePosts, setLivePosts] = useState<SocialPost[] | null>(null);
  const [liveFollowers, setLiveFollowers] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    getSiteContent<SocialContent>(ContentKeys.social)
      .then((data) => {
        if (active && data) setContent(mergeContent(SOCIAL_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });

    getSocialFeed()
      .then((feed) => {
        if (!active || !feed) return;
        if (feed.posts.length) setLivePosts(feed.posts.map(toRenderPost));
        if (feed.channels.length) {
          setLiveFollowers(
            Object.fromEntries(feed.channels.map((c) => [c.key, formatCount(c.followers)])),
          );
        }
      })
      .catch(() => {
        /* keep admin/static content */
      });

    return () => {
      active = false;
    };
  }, []);

  const rtl = isRtl(locale);
  // Prefer live posts; fall back to admin-managed content when none are available.
  const posts = livePosts ?? content.posts;
  const eyebrow = pick(content.eyebrow, locale);
  const title = pick(content.title, locale);
  const subtitle = pick(content.subtitle, locale);

  return (
    <section className="relative bg-transparent py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 pattern-light" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={titleRef}
          className={`text-center mb-12 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-green animate-pulse" />
            {eyebrow}
          </div>
          <h2
            className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${rtl ? 'font-arabic' : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {title}
          </h2>
          <p
            className={`text-gray-400 mt-2 max-w-xl mx-auto text-sm md:text-base ${rtl ? 'font-arabic' : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {subtitle}
          </p>
        </div>

        {/* Social channel buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {content.channels.map((channel, i) => {
            const cfg = CHANNEL_CONFIG[channel.key];
            const Icon = cfg?.Icon ?? ExternalLink;
            const bg = cfg?.bg ?? 'bg-gray-500';
            return (
              <a
                key={`${channel.key}-${i}`}
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                  titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{channel.label}</p>
                  <p className="text-xs text-gray-400">
                    {liveFollowers[channel.key] ?? channel.followers} followers
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-rmc-green ml-auto shrink-0 transition-colors" />
              </a>
            );
          })}
        </div>

        {/* Posts feed */}
        <div ref={feedRef} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {posts.map((post, i) => (
            <PostCard
              key={`${post.platform}-${i}`}
              post={post}
              content={pick(post.content, locale)}
              rtl={rtl}
              locale={locale}
              delay={i * 120}
              visible={feedVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
