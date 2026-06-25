'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys,
  SOCIAL_DEFAULT,
  getSiteContent,
  saveSiteContent,
  tri,
  type SocialContent,
  type SocialChannel,
  type SocialPost,
  type Tri,
} from '@/lib/content-api';
import { Share2, ArrowLeft, Save, Plus, Trash2, MessageSquare, Users } from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const POST_PLATFORMS: SocialPost['platform'][] = ['facebook', 'twitter', 'instagram'];
const CHANNEL_KEYS: SocialChannel['key'][] = ['facebook', 'twitter', 'instagram', 'youtube'];

const EMPTY_POST: SocialPost = {
  platform: 'facebook',
  handle: '',
  content: tri(''),
  likes: '',
  comments: '',
  date: '',
  image: '',
};

const EMPTY_CHANNEL: SocialChannel = {
  key: 'facebook',
  label: '',
  followers: '',
  href: '#',
};

const INITIAL = SOCIAL_DEFAULT;

export default function SocialMediaPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <SocialMediaManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function SocialMediaManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<SocialContent>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load any previously saved content; fall back to defaults if none exists.
  useEffect(() => {
    let active = true;
    getSiteContent<SocialContent>(ContentKeys.social)
      .then((data) => {
        if (active && data) setForm({ ...INITIAL, ...data });
      })
      .catch(() => {
        /* keep defaults — section simply hasn't been saved yet */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // ── Header (Tri) editors ──────────────────────────────────────────────────
  const setHeaderTri = useCallback((field: 'eyebrow' | 'title' | 'subtitle', value: string) => {
    setForm((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: value } }));
  }, [lang]);

  // ── Posts editors ─────────────────────────────────────────────────────────
  const addPost = useCallback(() => {
    setForm((prev) => ({ ...prev, posts: [...prev.posts, { ...EMPTY_POST, content: tri('') }] }));
  }, []);
  const removePost = useCallback((idx: number) => {
    setForm((prev) => ({ ...prev, posts: prev.posts.filter((_, i) => i !== idx) }));
  }, []);
  const setPostField = useCallback(<K extends keyof SocialPost>(idx: number, field: K, value: SocialPost[K]) => {
    setForm((prev) => ({
      ...prev,
      posts: prev.posts.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));
  }, []);
  const setPostContent = useCallback((idx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      posts: prev.posts.map((p, i) =>
        i === idx ? { ...p, content: { ...(p.content as Tri), [lang]: value } } : p,
      ),
    }));
  }, [lang]);

  // ── Channels editors ──────────────────────────────────────────────────────
  const addChannel = useCallback(() => {
    setForm((prev) => ({ ...prev, channels: [...prev.channels, { ...EMPTY_CHANNEL }] }));
  }, []);
  const removeChannel = useCallback((idx: number) => {
    setForm((prev) => ({ ...prev, channels: prev.channels.filter((_, i) => i !== idx) }));
  }, []);
  const setChannelField = useCallback(<K extends keyof SocialChannel>(idx: number, field: K, value: SocialChannel[K]) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(ContentKeys.social, form);
      setForm((prev) => ({ ...prev, ...saved }));
      success('Content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';
  const langLabel = LANGS.find((l) => l.key === lang)?.label;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Social Media</h1>
            <p className="text-xs text-gray-400">Update homepage social feed &amp; channels</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-sky-600/20 transition-colors">
          {saving || loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Loading…' : 'Save Changes'}
        </button>
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Header text content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700">Section Header — {langLabel}</h2>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Eyebrow</label>
          <input
            dir={dir}
            type="text"
            value={form.eyebrow[lang]}
            onChange={(e) => setHeaderTri('eyebrow', e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${fontClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
          <input
            dir={dir}
            type="text"
            value={form.title[lang]}
            onChange={(e) => setHeaderTri('title', e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${fontClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
          <textarea
            dir={dir}
            rows={2}
            value={form.subtitle[lang]}
            onChange={(e) => setHeaderTri('subtitle', e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none ${fontClass}`}
          />
        </div>
      </div>

      {/* Posts list editor */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-600" />
            Posts — {form.posts.length}
          </h2>
          <button onClick={addPost}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Post
          </button>
        </div>

        {form.posts.length === 0 && (
          <p className="text-sm text-gray-300 text-center py-8">No posts yet. Add one to get started.</p>
        )}

        <div className="space-y-4">
          {form.posts.map((post, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Post #{idx + 1}</span>
                <button onClick={() => removePost(idx)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Platform</label>
                  <select
                    value={post.platform}
                    onChange={(e) => setPostField(idx, 'platform', e.target.value as SocialPost['platform'])}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent capitalize">
                    {POST_PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Handle</label>
                  <input type="text" value={post.handle}
                    onChange={(e) => setPostField(idx, 'handle', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Content — {langLabel}</label>
                <textarea
                  dir={dir}
                  rows={3}
                  value={(post.content as Tri)[lang]}
                  onChange={(e) => setPostContent(idx, e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none ${fontClass}`}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Likes</label>
                  <input type="text" value={post.likes}
                    onChange={(e) => setPostField(idx, 'likes', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Comments</label>
                  <input type="text" value={post.comments}
                    onChange={(e) => setPostField(idx, 'comments', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date</label>
                  <input type="text" value={post.date} placeholder="2h ago"
                    onChange={(e) => setPostField(idx, 'date', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Post link <span className="text-gray-400 font-normal">(optional — opens on click)</span></label>
                  <input type="url" value={post.url ?? ''} placeholder="https://x.com/islamrwanda/status/…"
                    onChange={(e) => setPostField(idx, 'url', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="url" value={post.image ?? ''} placeholder="https://…"
                    onChange={(e) => setPostField(idx, 'image', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channels list editor */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            Channels — {form.channels.length}
          </h2>
          <button onClick={addChannel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Channel
          </button>
        </div>

        <p className="text-xs text-gray-500 bg-sky-50/60 border border-sky-100 rounded-lg px-3 py-2">
          The <span className="font-semibold">YouTube</span> channel link powers the homepage&apos;s
          featured “Latest video”. Paste the channel URL (e.g. <span className="font-mono">youtube.com/@yourchannel</span>),
          a <span className="font-mono">/channel/UC…</span> link, or the raw <span className="font-mono">UC…</span> id.
        </p>

        {form.channels.length === 0 && (
          <p className="text-sm text-gray-300 text-center py-8">No channels yet. Add one to get started.</p>
        )}

        <div className="space-y-3">
          {form.channels.map((channel, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:items-end">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Channel</label>
                  <select
                    value={channel.key}
                    onChange={(e) => setChannelField(idx, 'key', e.target.value as SocialChannel['key'])}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent capitalize">
                    {CHANNEL_KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Label</label>
                  <input type="text" value={channel.label}
                    onChange={(e) => setChannelField(idx, 'label', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Followers</label>
                  <input type="text" value={channel.followers} placeholder="auto (live)"
                    onChange={(e) => setChannelField(idx, 'followers', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Link (href)</label>
                  <input type="text" value={channel.href}
                    onChange={(e) => setChannelField(idx, 'href', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                </div>
                <div className="sm:col-span-1 flex sm:justify-end">
                  <button onClick={() => removeChannel(idx)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LanguageTabs({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {LANGS.map((l) => (
        <button key={l.key} onClick={() => onChange(l.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${lang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <span>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  );
}
