'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { GalleryManagement } from '@/components/admin/GalleryManagement';
import {
  BookOpen, Megaphone, Info, Clock, Globe,
  Bell, BarChart3, Handshake, Building2, ArrowRight,
  Search, X, MapPin, Layers, Home, FileText,
  ListFilter, Images, Sparkles, Share2, Newspaper, Mail, Moon,
  Compass, ListChecks, CalendarDays, Briefcase, GraduationCap,
  Library, MessagesSquare, Heading1, LayoutGrid, HandCoins,
} from 'lucide-react';

// ─── Types & config ───────────────────────────────────────────────────────────

type SectionType = 'crud' | 'edit';
type PageLocation =
  | 'Homepage'
  | 'About Page'
  | 'Blog Page'
  | 'Contact Page'
  | 'Funeral Service'
  | 'Hajj Service'
  | 'Tenders Page'
  | 'Jobs Page'
  | 'Scholarships Page'
  | 'Services Page'
  | 'Dawah Pages'
  | 'Welcome to Islam'
  | 'Projects Page'
  | 'Site-wide';

interface SectionConfig {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  type: SectionType;
  itemLabel: string | null;
  page: PageLocation;
  positionOrder: number;
  locationLabel: string;
  keywords: string[];
  bg: string;
  iconColor: string;
  border: string;
  badge: string;
  accentBar: string;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'hero',
    icon: Sparkles,
    title: 'Hero',
    description: 'Headline, subtitle, call-to-action buttons and background slideshow at the very top of the homepage.',
    type: 'edit', itemLabel: null,
    page: 'Homepage', positionOrder: 0,
    locationLabel: 'Homepage · Top Hero',
    keywords: ['hero', 'headline', 'banner', 'welcome', 'slideshow', 'background', 'cta', 'subtitle', 'salam', 'top', 'intro', 'slides'],
    bg: 'bg-rmc-green-light', iconColor: 'text-rmc-green', border: 'border-rmc-green-light',
    badge: 'bg-rmc-green-light text-rmc-green-dark',
    accentBar: 'bg-rmc-green',
  },
  {
    id: 'verse-of-day',
    icon: BookOpen,
    title: 'Verse of the Day',
    description: 'Quranic verses shown in the hero area. Multiple verses rotate daily.',
    type: 'crud', itemLabel: 'verses',
    page: 'Homepage', positionOrder: 1,
    locationLabel: 'Homepage · Hero / Top',
    keywords: ['quran', 'verse', 'ayah', 'arabic', 'daily', 'rotation', 'surah', 'hero', 'islamic', 'scripture', 'translation', 'reference'],
    bg: 'bg-rmc-green-light', iconColor: 'text-rmc-green', border: 'border-rmc-green-light',
    badge: 'bg-rmc-green-light text-rmc-green-dark',
    accentBar: 'bg-rmc-green',
  },
  {
    id: 'updates-programs',
    icon: Megaphone,
    title: 'Updates & Programs',
    description: 'Promotional banners with link and call-to-action button in the carousel.',
    type: 'crud', itemLabel: 'items',
    page: 'Homepage', positionOrder: 2,
    locationLabel: 'Homepage · Welcome Carousel',
    keywords: ['banner', 'programs', 'link', 'button', 'cta', 'promotions', 'scholarship', 'carousel', 'slider', 'announcement', 'updates', 'news'],
    bg: 'bg-blue-50', iconColor: 'text-blue-600', border: 'border-blue-100',
    badge: 'bg-blue-100 text-blue-700',
    accentBar: 'bg-blue-400',
  },
  {
    id: 'how-to-become-muslim',
    icon: Handshake,
    title: 'How to Become a Muslim',
    description: 'Per-language intro video, the Shahada, the steps to follow, the "What\'s Next" prompt and the nearest-school map block.',
    type: 'edit', itemLabel: null,
    page: 'Homepage', positionOrder: 2.5,
    locationLabel: 'Homepage · How to Become a Muslim',
    keywords: ['muslim', 'convert', 'revert', 'shahada', 'become', 'islam', 'video', 'steps', 'embrace', 'new muslim', 'school', 'map', 'ghusl', 'testimony'],
    bg: 'bg-rmc-green-light', iconColor: 'text-rmc-green', border: 'border-rmc-green-light',
    badge: 'bg-rmc-green-light text-rmc-green-dark',
    accentBar: 'bg-rmc-green',
  },
  {
    id: 'who-we-are',
    icon: Info,
    title: 'Who We Are',
    description: 'Mission, vision, values and community overview in the intro section.',
    type: 'edit', itemLabel: null,
    page: 'Homepage', positionOrder: 3,
    locationLabel: 'Homepage · Intro Section',
    keywords: ['mission', 'vision', 'values', 'about', 'community', 'rmc', 'overview', 'history', 'members', 'mosques', 'stats', 'identity'],
    bg: 'bg-violet-50', iconColor: 'text-violet-600', border: 'border-violet-100',
    badge: 'bg-violet-100 text-violet-700',
    accentBar: 'bg-violet-400',
  },
  {
    id: 'prayer-times',
    icon: Clock,
    title: 'Prayer Times',
    description: 'Daily Fajr–Isha schedule displayed in the prayer widget.',
    type: 'edit', itemLabel: null,
    page: 'Homepage', positionOrder: 4,
    locationLabel: 'Homepage · Prayer Widget',
    keywords: ['salah', 'prayer', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'sunrise', 'schedule', 'kigali', 'times', 'adhan', 'namaz', 'widget'],
    bg: 'bg-sky-50', iconColor: 'text-sky-600', border: 'border-sky-100',
    badge: 'bg-sky-100 text-sky-700',
    accentBar: 'bg-sky-400',
  },
  {
    id: 'areas',
    icon: Globe,
    title: 'Areas of Intervention',
    description: 'Strategic pillars: Dawa, Education, Social & Foreign Affairs.',
    type: 'crud', itemLabel: 'areas',
    page: 'Homepage', positionOrder: 5,
    locationLabel: 'Homepage · Impact Pillars',
    keywords: ['dawa', 'education', 'social', 'foreign affairs', 'welfare', 'pillars', 'programs', 'intervention', 'outreach', 'madrassa', 'zakat', 'orphan', 'scholarship', 'international'],
    bg: 'bg-orange-50', iconColor: 'text-orange-600', border: 'border-orange-100',
    badge: 'bg-orange-100 text-orange-700',
    accentBar: 'bg-orange-400',
  },
  {
    id: 'activities-events',
    icon: CalendarDays,
    title: 'Activities & Events',
    description: 'Recent news articles and upcoming community event listings.',
    type: 'crud', itemLabel: 'items',
    page: 'Homepage', positionOrder: 6,
    locationLabel: 'Homepage · Events Section',
    keywords: ['activities', 'events', 'news', 'blog', 'calendar', 'upcoming', 'dates', 'eid', 'conference', 'gathering', 'ceremony', 'latest', 'schedule', 'venue', 'community'],
    bg: 'bg-teal-50', iconColor: 'text-teal-600', border: 'border-teal-100',
    badge: 'bg-teal-100 text-teal-700',
    accentBar: 'bg-teal-400',
  },
  {
    id: 'announcements',
    icon: Bell,
    title: 'Announcements',
    description: 'Urgent, high and normal priority alerts shown on the homepage.',
    type: 'crud', itemLabel: 'announcements',
    page: 'Homepage', positionOrder: 7,
    locationLabel: 'Homepage · Announcements',
    keywords: ['alert', 'notice', 'notification', 'urgent', 'important', 'announcement', 'broadcast', 'message', 'publish', 'priority', 'high', 'normal', 'community', 'news'],
    bg: 'bg-red-50', iconColor: 'text-red-600', border: 'border-red-100',
    badge: 'bg-red-100 text-red-700',
    accentBar: 'bg-red-400',
  },
  {
    id: 'tenders',
    icon: FileText,
    title: 'Tenders',
    description: 'Procurement opportunities with deadlines and downloadable attachments (PDF, images).',
    type: 'crud', itemLabel: 'tenders',
    page: 'Homepage', positionOrder: 8,
    locationLabel: 'Tenders Page · Open Tenders',
    keywords: ['tender', 'procurement', 'bid', 'contract', 'rfp', 'deadline', 'business', 'opportunity', 'construction', 'supplier', 'attachment', 'pdf', 'document'],
    bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    accentBar: 'bg-amber-400',
  },
  {
    id: 'community-impact',
    icon: BarChart3,
    title: 'Community Impact',
    description: 'Animated statistics: members, mosques, provinces and services.',
    type: 'edit', itemLabel: null,
    page: 'Homepage', positionOrder: 9,
    locationLabel: 'Homepage · Stats Section',
    keywords: ['statistics', 'stats', 'counter', 'numbers', 'members', 'mosques', 'provinces', 'services', 'count', 'impact', 'growth', 'animated', 'metrics', 'kpi', 'data'],
    bg: 'bg-indigo-50', iconColor: 'text-indigo-600', border: 'border-indigo-100',
    badge: 'bg-indigo-100 text-indigo-700',
    accentBar: 'bg-indigo-400',
  },
  {
    id: 'partners',
    icon: Handshake,
    title: 'Our Partners',
    description: 'Partner logos, categories and website links in the partners grid.',
    type: 'crud', itemLabel: 'partners',
    page: 'Homepage', positionOrder: 9,
    locationLabel: 'Homepage · Partners Grid',
    keywords: ['partners', 'logos', 'organizations', 'collaborators', 'ngo', 'oic', 'isdb', 'sponsor', 'affiliate', 'institution', 'network', 'alliance', 'charity', 'government'],
    bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    accentBar: 'bg-amber-400',
  },
  {
    id: 'social-media',
    icon: Share2,
    title: 'Social Media',
    description: 'Social post feed and follow-us channel buttons shown near the bottom of the homepage.',
    type: 'crud', itemLabel: 'posts',
    page: 'Homepage', positionOrder: 10,
    locationLabel: 'Homepage · Social Media',
    keywords: ['social', 'media', 'facebook', 'twitter', 'instagram', 'youtube', 'posts', 'feed', 'followers', 'channels', 'share', 'community'],
    bg: 'bg-pink-50', iconColor: 'text-pink-600', border: 'border-pink-100',
    badge: 'bg-pink-100 text-pink-700',
    accentBar: 'bg-pink-400',
  },
  {
    id: 'about',
    icon: Building2,
    title: 'About RMC',
    description: 'Organization history, mission, vision and values for the About page.',
    type: 'edit', itemLabel: null,
    page: 'About Page', positionOrder: 1,
    locationLabel: 'About Page · Full Content',
    keywords: ['about', 'history', 'organization', 'rmc', 'founding', 'leadership', 'mission', 'vision', 'values', 'unity', 'education', 'service', 'transparency', 'heritage'],
    bg: 'bg-slate-50', iconColor: 'text-slate-600', border: 'border-slate-100',
    badge: 'bg-slate-100 text-slate-700',
    accentBar: 'bg-slate-400',
  },
  {
    id: 'blog',
    icon: Newspaper,
    title: 'Blog & Posts',
    description: 'Articles and news posts on the public Blog page — create, edit, translate, upload images, and publish.',
    type: 'crud', itemLabel: 'posts',
    page: 'Blog Page', positionOrder: 0,
    locationLabel: 'Blog Page · Articles',
    keywords: ['blog', 'post', 'article', 'news', 'story', 'cms', 'publish', 'draft', 'content', 'featured', 'category', 'author', 'write'],
    bg: 'bg-cyan-50', iconColor: 'text-cyan-600', border: 'border-cyan-100',
    badge: 'bg-cyan-100 text-cyan-700',
    accentBar: 'bg-cyan-400',
  },
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact Page',
    description: 'Hero, address, phone, email, office hours and section headings on the Contact page.',
    type: 'edit', itemLabel: null,
    page: 'Contact Page', positionOrder: 0,
    locationLabel: 'Contact Page · Main Content',
    keywords: ['contact', 'address', 'phone', 'email', 'hours', 'communication', 'reach', 'office', 'mosque finder', 'get in touch'],
    bg: 'bg-teal-50', iconColor: 'text-teal-600', border: 'border-teal-100',
    badge: 'bg-teal-100 text-teal-700',
    accentBar: 'bg-teal-400',
  },
  {
    id: 'funeral',
    icon: Moon,
    title: 'Funeral Service',
    description: 'The "what we do" description, the process-timeline heading and the sticky call bar on the public Funeral page.',
    type: 'edit', itemLabel: null,
    page: 'Funeral Service', positionOrder: 0,
    locationLabel: 'Funeral Service · Landing page',
    keywords: ['funeral', 'janazah', 'burial', 'ghusl', 'kafan', 'description', 'rich text', 'hotline', 'phone', 'call', 'emergency', 'timeline', 'heading'],
    bg: 'bg-rmc-green-light', iconColor: 'text-rmc-green', border: 'border-rmc-green-light',
    badge: 'bg-rmc-green-light text-rmc-green-dark',
    accentBar: 'bg-rmc-green',
  },
  {
    id: 'funeral-request-steps',
    icon: Moon,
    title: 'Funeral Request Steps',
    description: 'Add, edit, reorder and customise (colour + icon) the funeral request lifecycle steps shown on the public status/detail timeline.',
    type: 'crud', itemLabel: 'steps',
    page: 'Funeral Service', positionOrder: 0,
    locationLabel: 'Funeral Service · Status timeline',
    keywords: ['funeral', 'janazah', 'burial', 'ghusl', 'kafan', 'steps', 'stages', 'timeline', 'status', 'lifecycle', 'request', 'deceased', 'reorder', 'color', 'icon'],
    bg: 'bg-rmc-green-light', iconColor: 'text-rmc-green', border: 'border-rmc-green-light',
    badge: 'bg-rmc-green-light text-rmc-green-dark',
    accentBar: 'bg-rmc-green',
  },
  {
    id: 'hajj',
    icon: Compass,
    title: 'Hajj Service',
    description: 'Hero, the pilgrimage intro and photo, the description block, and the step-by-step journey on the public Hajj page.',
    type: 'edit', itemLabel: null,
    page: 'Hajj Service', positionOrder: 0,
    locationLabel: 'Hajj Service · Landing page',
    keywords: ['hajj', 'pilgrimage', 'makkah', 'talbiyah', 'hero', 'about', 'photo', 'umrah', 'register', 'description', 'rich text', 'steps', 'how it works', 'journey'],
    bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    accentBar: 'bg-amber-400',
  },
  {
    id: 'hajj-requirements',
    icon: ListChecks,
    title: 'Hajj Requirements',
    description: 'Add, edit, reorder and price the Hajj checklist. The registration and initial payment amounts set here are what the registration form charges.',
    type: 'crud', itemLabel: 'requirements',
    page: 'Hajj Service', positionOrder: 1,
    locationLabel: 'Hajj Service · Requirements checklist',
    keywords: ['hajj', 'requirements', 'checklist', 'passport', 'fee', 'payment', 'amount', 'rwf', 'usd', 'currency', 'registration', 'reorder', 'icon'],
    bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    accentBar: 'bg-amber-400',
  },
  {
    id: 'hajj-bank-accounts',
    icon: Building2,
    title: 'Hajj Bank Accounts',
    description: 'The accounts applicants pay the Hajj fees into, shown on the Hajj page. Add one per currency you charge in.',
    type: 'crud', itemLabel: 'accounts',
    page: 'Hajj Service', positionOrder: 2,
    locationLabel: 'Hajj Service · Bank accounts',
    keywords: ['hajj', 'bank', 'account', 'payment', 'transfer', 'iban', 'swift', 'bic', 'branch', 'rwf', 'usd', 'currency'],
    bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    accentBar: 'bg-amber-400',
  },
  /* The three service boards. Each entry edits the WORDING of its page; the records
     the page lists (tenders, postings, programmes) have their own screens, which the
     editors link across to. */
  {
    id: 'tender-service',
    icon: Briefcase,
    title: 'Tenders Page',
    description: 'Hero, the heading above the board and the how-to-apply steps on the public Tenders page. The tenders themselves are managed under Tenders.',
    type: 'edit', itemLabel: null,
    page: 'Tenders Page', positionOrder: 0,
    locationLabel: 'Tenders Page · Wording',
    keywords: ['tender', 'tenders', 'bid', 'procurement', 'board', 'hero', 'heading', 'steps', 'how to apply', 'wording', 'copy'],
    bg: 'bg-teal-50', iconColor: 'text-teal-600', border: 'border-teal-100',
    badge: 'bg-teal-100 text-teal-700',
    accentBar: 'bg-teal-400',
  },
  {
    id: 'jobs-service',
    icon: Briefcase,
    title: 'Jobs Page',
    description: 'Hero, the heading above the board and the how-to-apply steps on the public Jobs page. The openings themselves are managed under Job Postings.',
    type: 'edit', itemLabel: null,
    page: 'Jobs Page', positionOrder: 0,
    locationLabel: 'Jobs Page · Wording',
    keywords: ['job', 'jobs', 'vacancy', 'opening', 'career', 'employment', 'board', 'hero', 'heading', 'steps', 'how to apply', 'wording', 'copy'],
    bg: 'bg-indigo-50', iconColor: 'text-indigo-600', border: 'border-indigo-100',
    badge: 'bg-indigo-100 text-indigo-700',
    accentBar: 'bg-indigo-400',
  },
  {
    id: 'scholarship-service',
    icon: GraduationCap,
    title: 'Scholarships Page',
    description: 'Hero, board heading, how-to-apply steps, the FAQ and the closing call to action on the public Scholarships page. The programmes themselves are managed under Scholarship Programs.',
    type: 'edit', itemLabel: null,
    page: 'Scholarships Page', positionOrder: 0,
    locationLabel: 'Scholarships Page · Wording',
    keywords: ['scholarship', 'scholarships', 'bursary', 'student', 'education', 'faq', 'cta', 'hero', 'heading', 'steps', 'how to apply', 'wording', 'copy'],
    bg: 'bg-violet-50', iconColor: 'text-violet-600', border: 'border-violet-100',
    badge: 'bg-violet-100 text-violet-700',
    accentBar: 'bg-violet-400',
  },
  {
    id: 'services',
    icon: LayoutGrid,
    title: 'Services Page',
    description: 'The name, description and detail modal for each service listed on the public Services page.',
    type: 'edit', itemLabel: null,
    page: 'Services Page', positionOrder: 0,
    locationLabel: 'Services Page · Service cards',
    keywords: ['service', 'services', 'marriage', 'funeral', 'conduct', 'hajj', 'card', 'modal', 'requirements', 'steps', 'wording', 'copy'],
    bg: 'bg-cyan-50', iconColor: 'text-cyan-600', border: 'border-cyan-100',
    badge: 'bg-cyan-100 text-cyan-700',
    accentBar: 'bg-cyan-400',
  },
  {
    id: 'library',
    icon: Library,
    title: 'Library Page',
    description: 'Heading and the empty / error messages on the public Dawah Library listing. The books themselves are managed under Dawah → Library.',
    type: 'edit', itemLabel: null,
    page: 'Dawah Pages', positionOrder: 0,
    locationLabel: 'Dawah · Library listing',
    keywords: ['library', 'books', 'dawah', 'reading', 'heading', 'empty', 'error', 'wording', 'copy'],
    bg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'border-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
    accentBar: 'bg-emerald-400',
  },
  {
    id: 'courses',
    icon: GraduationCap,
    title: 'Courses Page',
    description: 'Heading and the empty / error messages on the public Dawah Courses listing. The courses themselves are managed under Dawah → Courses.',
    type: 'edit', itemLabel: null,
    page: 'Dawah Pages', positionOrder: 1,
    locationLabel: 'Dawah · Courses listing',
    keywords: ['courses', 'learning', 'dawah', 'lessons', 'heading', 'empty', 'error', 'wording', 'copy'],
    bg: 'bg-sky-50', iconColor: 'text-sky-600', border: 'border-sky-100',
    badge: 'bg-sky-100 text-sky-700',
    accentBar: 'bg-sky-400',
  },
  {
    id: 'discussions',
    icon: MessagesSquare,
    title: 'Discussions Page',
    description: 'Heading and the empty / no-results / error messages on the public Dawah Discussions listing. The questions themselves are managed under Dawah → Discussions.',
    type: 'edit', itemLabel: null,
    page: 'Dawah Pages', positionOrder: 2,
    locationLabel: 'Dawah · Discussions listing',
    keywords: ['discussions', 'questions', 'answers', 'ask', 'dawah', 'heading', 'empty', 'error', 'wording', 'copy'],
    bg: 'bg-orange-50', iconColor: 'text-orange-600', border: 'border-orange-100',
    badge: 'bg-orange-100 text-orange-700',
    accentBar: 'bg-orange-400',
  },
  {
    id: 'new-muslim',
    icon: Sparkles,
    title: 'Welcome to Islam Page',
    description: 'First steps, the essential duas, the mosque finder labels and the mentor form on the public Welcome to Islam page.',
    type: 'edit', itemLabel: null,
    page: 'Welcome to Islam', positionOrder: 0,
    locationLabel: 'Welcome to Islam · Page sections',
    keywords: ['new muslim', 'revert', 'convert', 'shahada', 'dua', 'duas', 'arabic', 'mentor', 'mosque', 'steps', 'welcome', 'islam'],
    bg: 'bg-rmc-green-light', iconColor: 'text-rmc-green', border: 'border-rmc-green-light',
    badge: 'bg-rmc-green-light text-rmc-green-dark',
    accentBar: 'bg-rmc-green',
  },
  {
    id: 'projects',
    icon: HandCoins,
    title: 'Projects',
    description: 'The section heading and the fundraising projects on the public Projects page — funding targets, status, cover image and description.',
    type: 'crud', itemLabel: 'projects',
    page: 'Projects Page', positionOrder: 0,
    locationLabel: 'Projects Page · Projects',
    keywords: ['project', 'projects', 'fundraising', 'donate', 'mosque', 'construction', 'funding', 'target', 'raised', 'progress', 'image'],
    bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    accentBar: 'bg-amber-400',
  },
  {
    id: 'page-headers',
    icon: Heading1,
    title: 'Page Headers',
    description: 'The banner copy at the top of the Services, Contact, Membership, Welcome to Islam and Gallery pages, plus the About timeline header. Two or three fields each, gathered on one screen.',
    type: 'edit', itemLabel: null,
    page: 'Site-wide', positionOrder: 0,
    locationLabel: 'Site-wide · Page banners',
    keywords: ['header', 'headers', 'hero', 'banner', 'title', 'subtitle', 'eyebrow', 'contact', 'services', 'gallery', 'membership', 'register', 'welcome', 'timeline', 'about'],
    bg: 'bg-rose-50', iconColor: 'text-rose-600', border: 'border-rose-100',
    badge: 'bg-rose-100 text-rose-700',
    accentBar: 'bg-rose-400',
  },
];

const PAGE_GROUPS: { page: PageLocation; icon: React.ElementType; color: string; description: string }[] = [
  { page: 'Homepage', icon: Home, color: 'text-rmc-green', description: 'Sections visible on the main landing page' },
  { page: 'About Page', icon: FileText, color: 'text-slate-600', description: 'Content on the /about page' },
  { page: 'Blog Page', icon: Newspaper, color: 'text-cyan-600', description: 'Articles on the public /blog page' },
  { page: 'Contact Page', icon: Mail, color: 'text-teal-600', description: 'Content on the /contact page' },
  { page: 'Funeral Service', icon: Moon, color: 'text-rmc-green', description: 'Content on the funeral service pages' },
  { page: 'Hajj Service', icon: Compass, color: 'text-amber-600', description: 'Content on the Hajj service pages' },
  { page: 'Tenders Page', icon: Briefcase, color: 'text-teal-600', description: 'Wording on the public tenders board' },
  { page: 'Jobs Page', icon: Briefcase, color: 'text-indigo-600', description: 'Wording on the public jobs board' },
  { page: 'Scholarships Page', icon: GraduationCap, color: 'text-violet-600', description: 'Wording on the public scholarships board' },
  { page: 'Services Page', icon: LayoutGrid, color: 'text-cyan-600', description: 'The service cards and their detail modals' },
  { page: 'Dawah Pages', icon: Library, color: 'text-emerald-600', description: 'Wording on the Library, Courses and Discussions listings' },
  { page: 'Welcome to Islam', icon: Sparkles, color: 'text-rmc-green', description: 'Content on the /new-muslim page' },
  { page: 'Projects Page', icon: HandCoins, color: 'text-amber-600', description: 'Fundraising projects and the section heading' },
  { page: 'Site-wide', icon: Heading1, color: 'text-rose-600', description: 'Copy that appears across several pages' },
];

type Tab = 'sections' | 'gallery';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManageContentPage() {
  const { locale } = useParams<{ locale: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('sections');
  const [query, setQuery] = useState('');
  const [pageFilter, setPageFilter] = useState<'all' | PageLocation>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | SectionType>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    let items = SECTIONS;
    if (pageFilter !== 'all') items = items.filter((s) => s.page === pageFilter);
    if (typeFilter !== 'all') items = items.filter((s) => s.type === typeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.locationLabel.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return items;
  }, [query, pageFilter, typeFilter]);

  const hasActiveFilter = query || pageFilter !== 'all' || typeFilter !== 'all';

  const clearAll = () => {
    setQuery('');
    setPageFilter('all');
    setTypeFilter('all');
  };

  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <div className="space-y-4">

        {/* ── Page header ── */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rmc-green/10 flex items-center justify-center shrink-0">
            <Layers className="w-[18px] h-[18px] text-rmc-green" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[17px] font-bold text-gray-900 leading-tight">Manage Content</h1>
            <p className="text-xs text-gray-400">
              {SECTIONS.length} sections &middot; {SECTIONS.filter((s) => s.type === 'crud').length} full CRUD &middot; {SECTIONS.filter((s) => s.type === 'edit').length} edit-only &middot; 3 languages
            </p>
          </div>
          <div className="flex-1" />
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          <TabButton
            active={activeTab === 'sections'}
            onClick={() => setActiveTab('sections')}
            icon={<Layers className="w-3.5 h-3.5" />}
            label="Content Sections"
          />
          <TabButton
            active={activeTab === 'gallery'}
            onClick={() => setActiveTab('gallery')}
            icon={<Images className="w-3.5 h-3.5" />}
            label="Gallery Management"
            badge="New"
          />
        </div>

        {/* ── Tab: Content Sections ── */}
        {activeTab === 'sections' && (
          <>
            {/* Search + filter bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Search row */}
              <div className="px-3 pt-3 pb-2.5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='Search by name, keyword, or location… e.g. "prayer", "dawa", "carousel", "stats"'
                    className="w-full h-10 pl-10 pr-10 sm:pr-24 rounded-lg border border-gray-300 bg-gray-50/80 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rmc-green/25 focus:border-rmc-green/40 focus:bg-white transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[10px] text-gray-400 font-mono select-none">
                      ⌘K
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Filter tabs row */}
              <div className="px-3 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-50 pt-2.5">
                {/* Page tabs */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  <ListFilter className="w-3.5 h-3.5 text-gray-400 mr-0.5 shrink-0" />
                  {[
                    { value: 'all' as const, label: 'All pages', icon: Layers, count: SECTIONS.length },
                    { value: 'Homepage' as const, label: 'Homepage', icon: Home, count: SECTIONS.filter((s) => s.page === 'Homepage').length },
                    { value: 'About Page' as const, label: 'About', icon: FileText, count: SECTIONS.filter((s) => s.page === 'About Page').length },
                    { value: 'Blog Page' as const, label: 'Blog', icon: Newspaper, count: SECTIONS.filter((s) => s.page === 'Blog Page').length },
                    { value: 'Contact Page' as const, label: 'Contact', icon: Mail, count: SECTIONS.filter((s) => s.page === 'Contact Page').length },
                    { value: 'Funeral Service' as const, label: 'Funeral', icon: Moon, count: SECTIONS.filter((s) => s.page === 'Funeral Service').length },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.value}
                        onClick={() => setPageFilter(tab.value)}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 ${
                          pageFilter === tab.value
                            ? 'bg-rmc-green text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <TabIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden xs:inline sm:inline">{tab.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                          pageFilter === tab.value ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Type toggle + clear */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {([
                      { value: 'all', label: 'All' },
                      { value: 'crud', label: 'CRUD' },
                      { value: 'edit', label: 'Edit only' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTypeFilter(opt.value)}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                          typeFilter === opt.value
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {hasActiveFilter && (
                    <button
                      onClick={clearAll}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Active filter summary */}
              {hasActiveFilter && (
                <div className="px-4 py-2 bg-rmc-green/5 border-t border-rmc-green/10 flex items-center gap-2">
                  <span className="text-xs text-rmc-green font-semibold">
                    {filtered.length} of {SECTIONS.length} sections
                  </span>
                  {query && (
                    <span className="text-xs text-gray-500">
                      matching &ldquo;<span className="font-medium text-gray-700">{query}</span>&rdquo;
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Grouped section lists */}
            {filtered.length === 0 ? (
              <EmptyState query={query} onClear={clearAll} />
            ) : (
              <div className="space-y-4">
                {PAGE_GROUPS.map(({ page, icon: GroupIcon, color, description }) => {
                  const groupItems = filtered
                    .filter((s) => s.page === page)
                    .sort((a, b) => a.positionOrder - b.positionOrder);
                  const totalInPage = SECTIONS.filter((s) => s.page === page).length;
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={page} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Group header */}
                      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-gray-100 bg-gray-50/40">
                        <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm shrink-0">
                          <GroupIcon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800">{page}</span>
                          <span className="hidden sm:inline text-xs text-gray-400 ml-2">{description}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="hidden sm:flex items-center gap-0.5">
                            {SECTIONS.filter((s) => s.page === page).map((s) => {
                              const visible = groupItems.some((g) => g.id === s.id);
                              return (
                                <span
                                  key={s.id}
                                  title={s.title}
                                  className={`w-2 h-2 rounded-full transition-opacity ${s.accentBar} ${visible ? 'opacity-90' : 'opacity-20'}`}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {groupItems.length === totalInPage ? totalInPage : `${groupItems.length}/${totalInPage}`}
                          </span>
                        </div>
                      </div>

                      {/* Section rows */}
                      <div className="divide-y divide-gray-50/80">
                        {groupItems.map((section, idx) => (
                          <SectionRow
                            key={section.id}
                            section={section}
                            index={idx}
                            locale={locale}
                            query={query}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Gallery Management ── */}
        {activeTab === 'gallery' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {/* Gallery tab header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Images className="w-[18px] h-[18px] text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Gallery Management</h2>
                <p className="text-xs text-gray-400">Upload, organise and manage the public photo gallery</p>
              </div>
            </div>
            <GalleryManagement />
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active, onClick, icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rmc-green text-white leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Section row ──────────────────────────────────────────────────────────────

function SectionRow({
  section, index, locale, query,
}: {
  section: SectionConfig;
  index: number;
  locale: string;
  query: string;
}) {
  const Icon = section.icon;

  const matchedKeywords = query.trim()
    ? section.keywords.filter((k) => k.toLowerCase().includes(query.toLowerCase()))
    : [];
  const displayKeywords = matchedKeywords.length > 0
    ? matchedKeywords.slice(0, 5)
    : section.keywords.slice(0, 4);

  return (
    <Link
      href={`/${locale}/admin/content/${section.id}`}
      className="group relative flex items-center gap-2.5 sm:gap-4 px-3 sm:px-5 py-3.5 sm:py-4 hover:bg-gray-50/80 transition-all duration-150"
    >
      {/* Left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${section.accentBar} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

      {/* Position badge */}
      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${section.bg} ${section.iconColor} group-hover:scale-110 transition-transform duration-200`}>
        {index + 1}
      </span>

      {/* Section icon */}
      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${section.bg} flex items-center justify-center shrink-0 group-hover:shadow-sm transition-all duration-200`}>
        <Icon className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${section.iconColor}`} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
          <span className={`text-sm font-semibold text-gray-900 group-hover:${section.iconColor} transition-colors duration-150 truncate`}>
            {section.title}
          </span>
          <span className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${section.badge}`}>
            {section.type === 'crud' ? 'CRUD' : 'Edit'}
          </span>
        </div>
        <p className="hidden sm:block text-xs text-gray-400 leading-relaxed truncate mb-1.5">
          {section.description}
        </p>
        <div className="hidden sm:flex items-center gap-1 flex-wrap">
          {displayKeywords.map((kw) => {
            const isMatch = matchedKeywords.includes(kw);
            return (
              <span
                key={kw}
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                  isMatch
                    ? `${section.badge} ring-1 ring-inset ring-current/20`
                    : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200/80'
                }`}
              >
                {kw}
              </span>
            );
          })}
          {matchedKeywords.length === 0 && section.keywords.length > 4 && (
            <span className="text-[10px] text-gray-300">+{section.keywords.length - 4}</span>
          )}
        </div>
        <div className="flex sm:hidden items-center gap-1 mt-0.5">
          <MapPin className={`w-3 h-3 ${section.iconColor} shrink-0`} />
          <span className="text-[11px] text-gray-400 truncate">{section.locationLabel}</span>
        </div>
      </div>

      {/* Location chip */}
      <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 group-hover:border-gray-200 transition-colors shrink-0">
        <MapPin className={`w-3 h-3 ${section.iconColor} shrink-0`} />
        <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">{section.locationLabel}</span>
      </div>

      {/* Open CTA */}
      <div className={`flex items-center gap-1 sm:gap-1.5 text-xs font-bold ${section.iconColor} shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-x-2 sm:group-hover:translate-x-0 transition-all duration-200`}>
        <span className="hidden sm:inline">Open</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Search className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm font-bold text-gray-700 mb-1">No sections found</p>
      <p className="text-xs text-gray-400 max-w-xs mb-5 leading-relaxed">
        No sections match{' '}
        {query
          ? <>&ldquo;<span className="font-semibold text-gray-600">{query}</span>&rdquo;</>
          : 'your current filters'}.{' '}
        Try{' '}
        <span className="font-medium text-rmc-green">verse</span>,{' '}
        <span className="font-medium text-rmc-green">prayer</span>, or{' '}
        <span className="font-medium text-rmc-green">dawa</span>.
      </p>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-lg transition-colors"
      >
        <X className="w-4 h-4" /> Clear filters
      </button>
    </div>
  );
}
