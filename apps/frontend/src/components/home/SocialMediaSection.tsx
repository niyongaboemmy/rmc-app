'use client';

import { Facebook, Twitter, Instagram, Youtube, Heart, MessageCircle, Share2, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface SocialPost {
  id: string;
  platform: 'facebook' | 'twitter' | 'instagram';
  handle: string;
  content: string;
  likes: string;
  comments: string;
  date: string;
  image?: string;
}

const POSTS: SocialPost[] = [
  {
    id: '1',
    platform: 'facebook',
    handle: 'Rwanda Muslim Community',
    content: 'Alhamdulillah! Our annual Eid celebration brought together over 10,000 Muslims at Amahoro Stadium. May Allah accept our prayers and strengthen our community. 🤲 #EidMubarak #RwandaMuslims',
    likes: '1.2K',
    comments: '234',
    date: '2h ago',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '2',
    platform: 'twitter',
    handle: '@RMC_Rwanda',
    content: 'REMINDER 📢 Scholarship applications for the 2025/2026 academic year close on June 30th. Apply now at our website. All Muslim students from Rwanda are eligible. Don\'t miss your chance! #RMCScholarship',
    likes: '847',
    comments: '156',
    date: '5h ago',
  },
  {
    id: '3',
    platform: 'instagram',
    handle: '@rmc_rwanda',
    content: 'Our Ramadan food drive was a huge success! Together we distributed 5,000 food packages to families in need across all 5 provinces. JazakAllahu Khairan to all volunteers and donors! ❤️',
    likes: '2.3K',
    comments: '412',
    date: '1d ago',
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=600&auto=format&fit=crop',
  },
];

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
};

const SOCIAL_CHANNELS = [
  { Icon: Facebook, label: 'Facebook', followers: '24.5K', href: '#', bg: 'bg-blue-600' },
  { Icon: Twitter, label: 'Twitter / X', followers: '12.8K', href: '#', bg: 'bg-gray-900' },
  { Icon: Instagram, label: 'Instagram', followers: '18.2K', href: '#', bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' },
  { Icon: Youtube, label: 'YouTube', followers: '8.4K', href: '#', bg: 'bg-red-600' },
];

function PostCard({ post, delay, visible }: { post: SocialPost; delay: number; visible: boolean }) {
  const config = PLATFORM_CONFIG[post.platform];
  const { Icon } = config;

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
          {post.date}
        </span>
      </div>

      {/* Image */}
      {post.image && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={post.image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{post.content}</p>

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
          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-rmc-green transition-colors ml-auto">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

export function SocialMediaSection() {
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);
  const { ref: feedRef, visible: feedVisible } = useScrollReveal(0.05);

  return (
    <section className="relative bg-white py-20 md:py-24 overflow-hidden">
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
            Social Media
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Latest on Social Media</h2>
          <p className="text-gray-400 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Follow RMC on social media to stay updated with the latest news, events, and community stories.
          </p>
        </div>

        {/* Social channel buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {SOCIAL_CHANNELS.map(({ Icon, label, followers, href, bg }, i) => (
            <a
              key={label}
              href={href}
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
                <p className="text-sm font-bold text-gray-900 truncate">{label}</p>
                <p className="text-xs text-gray-400">{followers} followers</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-rmc-green ml-auto shrink-0 transition-colors" />
            </a>
          ))}
        </div>

        {/* Posts feed */}
        <div ref={feedRef} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {POSTS.map((post, i) => (
            <PostCard key={post.id} post={post} delay={i * 120} visible={feedVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}
