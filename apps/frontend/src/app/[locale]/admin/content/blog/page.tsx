'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  ModalTitle, ModalDescription, ConfirmModal,
} from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  Newspaper, ArrowLeft, ArrowRight, Plus, Edit2, Trash2,
  Image as ImageIcon, UploadCloud, CalendarDays, Eye, EyeOff, Check, AlertCircle,
} from 'lucide-react';
import {
  ContentKeys,
  BLOG_DEFAULT,
  BLOG_CATEGORIES,
  EMPTY_BLOG_POST,
  findBlogCategory,
  getSiteContent,
  saveSiteContent,
  mergeContent,
  resolveBlogImage,
  blogBodyHtml,
  slugifyTitle,
  type BlogContent,
  type BlogPostItem,
  type BlogStatus,
} from '@/lib/content-api';
import { generateImageVersions, uploadGalleryVersions } from '@/lib/galleryApi';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { NotifySubscribersButton } from '@/components/admin/NotifySubscribersButton';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

// Steps in the create/edit wizard. Content first (the bulk of the work), then
// publishing settings, then a final review before saving.
const STEPS: { title: string; hint: string }[] = [
  { title: 'Content', hint: 'Write the article in all three languages' },
  { title: 'Settings', hint: 'Slug, date, status & featured image' },
  { title: 'Review', hint: 'Preview the post, then save' },
];

export default function BlogAdminPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><BlogManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function BlogManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [content, setContent] = useState<BlogContent>(BLOG_DEFAULT);
  const [lang, setLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<BlogPostItem>(EMPTY_BLOG_POST);
  const [modalLang, setModalLang] = useState<Lang>('en');
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const posts = content.posts;

  // Load saved content; fall back to seeded defaults when the section is unset.
  useEffect(() => {
    let active = true;
    getSiteContent<BlogContent>(ContentKeys.blog)
      .then((data) => {
        if (active && data) setContent(mergeContent(BLOG_DEFAULT, data));
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openCreate = () => {
    setEditingIndex(null);
    setForm({ ...EMPTY_BLOG_POST, title: { ...EMPTY_BLOG_POST.title } });
    setModalLang('en');
    setStep(0);
    setStepError(null);
    setIsModalOpen(true);
  };

  const openEdit = (index: number) => {
    const p = posts[index];
    setEditingIndex(index);
    // Deep-clone the Tri fields so edits don't mutate the loaded content.
    setForm({
      ...p,
      title: { ...p.title }, excerpt: { ...p.excerpt }, summary: { ...p.summary },
      category: { ...p.category }, author: { ...p.author }, body: { ...p.body },
    });
    setModalLang('en');
    setStep(0);
    setStepError(null);
    setIsModalOpen(true);
  };

  const setShared = <K extends keyof BlogPostItem>(field: K, value: BlogPostItem[K]) => {
    setStepError(null);
    setForm((p) => ({ ...p, [field]: value }));
  };

  const setTri = (field: 'title' | 'excerpt' | 'summary' | 'category' | 'author' | 'body', l: Lang, value: string) => {
    setStepError(null);
    setForm((p) => ({ ...p, [field]: { ...p[field], [l]: value } }));
  };

  // Category is chosen from the canonical list and applies to all languages at
  // once. Empty clears it; a recognised name sets the full tri-lingual value; a
  // legacy custom value (already on the post) is left untouched when re-selected.
  const selectCategory = (en: string) => {
    if (!en) { setShared('category', { en: '', rw: '', ar: '' }); return; }
    const cat = findBlogCategory(en);
    if (cat) setShared('category', { en: cat.en, rw: cat.rw, ar: cat.ar });
  };

  const persist = useCallback(async (next: BlogContent) => {
    const saved = await saveSiteContent(ContentKeys.blog, next);
    setContent(mergeContent(BLOG_DEFAULT, saved));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { error('Please choose an image file.'); return; }
    setUploading(true);
    try {
      const versions = await generateImageVersions(file);
      const { fileKey } = await uploadGalleryVersions({ versions });
      setForm((p) => ({ ...p, image: fileKey }));
      success('Image uploaded.');
    } catch (err) {
      // Surface the real reason (e.g. "Upload failed — HTTP 401") instead of a
      // generic message — the raw-XHR uploader has no token-refresh interceptor.
      // eslint-disable-next-line no-console
      console.error('[blog] image upload failed:', err);
      const msg = err instanceof Error ? err.message : 'Image upload failed.';
      error(/HTTP 401/.test(msg) ? 'Image upload failed — your session expired. Refresh the page and try again.' : msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [success, error]);

  // Validate the fields owned by a given step. Returns an error message, or null.
  const validateStep = useCallback((s: number): string | null => {
    if (s === 0) {
      if (!form.title.en.trim()) return 'English title is required.';
      if (!form.summary.en.trim()) return 'English summary is required.';
    }
    if (s === 1) {
      const slug = (form.slug.trim() || slugifyTitle(form.title.en)).trim();
      if (!slug) return 'Could not derive a slug — please add a title or slug.';
      if (posts.some((p, i) => p.slug === slug && i !== editingIndex)) {
        return `The slug "${slug}" is already used by another post.`;
      }
    }
    return null;
  }, [form, posts, editingIndex]);

  const goNext = useCallback(() => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      error(err);
      // Step-0 errors are about the English fields — surface that tab so the
      // required, currently-hidden inputs become visible.
      if (step === 0) setModalLang('en');
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, validateStep, error]);

  const goBack = useCallback(() => { setStepError(null); setStep((s) => Math.max(s - 1, 0)); }, []);

  const handleSaveItem = useCallback(async () => {
    if (!form.title.en.trim()) { error('English title is required.'); return; }
    if (!form.summary.en.trim()) { error('English summary is required.'); return; }

    const slug = (form.slug.trim() || slugifyTitle(form.title.en)).trim();
    if (!slug) { error('Could not derive a slug — please add a title or slug.'); return; }

    // Slug must be unique across posts.
    const clash = posts.some((p, i) => p.slug === slug && i !== editingIndex);
    if (clash) { error(`The slug "${slug}" is already used by another post.`); return; }

    setSaving(true);
    const cleaned: BlogPostItem = {
      ...form,
      slug,
      image: form.image.trim(),
      date: form.date || new Date().toISOString().slice(0, 10),
    };
    const nextPosts = editingIndex !== null
      ? posts.map((p, i) => (i === editingIndex ? cleaned : p))
      : [...posts, cleaned];

    try {
      await persist({ ...content, posts: nextPosts });
      success(editingIndex !== null ? 'Post updated.' : 'Post created.');
      setIsModalOpen(false);
    } catch {
      error('Could not save the post. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, posts, editingIndex, content, persist, success, error]);

  const handleDelete = useCallback(async () => {
    if (deleteIndex === null) return;
    setSaving(true);
    const next = { ...content, posts: posts.filter((_, i) => i !== deleteIndex) };
    try {
      await persist(next);
      success('Post deleted.');
      setDeleteIndex(null);
    } catch {
      error('Could not delete the post. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [deleteIndex, posts, content, persist, success, error]);

  const dateFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Blog &amp; Posts</h1>
            <p className="text-xs text-gray-400">
              {posts.length} post{posts.length !== 1 ? 's' : ''} &middot;{' '}
              {posts.filter((p) => p.status === 'published').length} published
            </p>
          </div>
        </div>
        <button onClick={openCreate} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-cyan-600/20 transition-colors">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {/* Preview language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Posts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {posts.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-300">
            <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No posts yet. Create your first article.</p>
          </div>
        )}
        {posts.map((post, index) => {
          const title = post.title[lang] || post.title.en;
          const category = post.category[lang] || post.category.en;
          const img = resolveBlogImage(post.image);
          return (
            <div key={index} className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-cyan-100">
              {/* Image */}
              <div className="relative aspect-[16/9] bg-gray-100">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-7 h-7 text-gray-300" /></div>
                )}
                <span className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  post.status === 'published' ? 'bg-emerald-500/90 text-white' : 'bg-gray-800/80 text-white'
                }`}>
                  {post.status === 'published' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {post.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-600 mb-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{category}</p>
                <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-2">
                  <CalendarDays className="w-3 h-3" />
                  {post.date ? dateFmt.format(new Date(post.date)) : '—'}
                  <span className="text-gray-300">·</span>
                  <span className="font-mono text-gray-400">/{post.slug}</span>
                </p>

                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => openEdit(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteIndex(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  {post.status === 'published' && (
                    <NotifySubscribersButton
                      compact
                      subject={post.title.en || title}
                      html={`<p>New on the RMC blog: <strong>${post.title.en || title}</strong></p><p><a href="/${lang}/blog/${post.slug}" style="color:#1a7a4a;font-weight:bold;text-decoration:underline">Read the full post →</a></p>`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
        <ModalHeader>
          <ModalTitle>{editingIndex !== null ? 'Edit Post' : 'New Post'}</ModalTitle>
          <ModalDescription>Fill in the article in all three languages. Only the English title and summary are required.</ModalDescription>
          {/* Step indicator — pinned with the header so it stays visible while fields scroll */}
          <div className="mt-4">
            <Stepper step={step} onStepClick={(s) => { if (s < step) setStep(s); }} />
          </div>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* ── Step 1 · Content (translated fields) ── */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Shared category — picked from the canonical list, applies to all languages */}
              <Field label="Category" hint="one value, applied to all languages">
                <select
                  value={form.category.en}
                  onChange={(e) => selectCategory(e.target.value)}
                  dir={modalLang === 'ar' ? 'rtl' : 'ltr'}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${modalLang === 'ar' ? 'font-arabic' : ''}`}
                >
                  <option value="">Select a category…</option>
                  {BLOG_CATEGORIES.map((c) => (
                    <option key={c.en} value={c.en}>{c[modalLang] || c.en}</option>
                  ))}
                  {form.category.en && !findBlogCategory(form.category.en) && (
                    <option value={form.category.en}>{(form.category[modalLang] || form.category.en)} (custom)</option>
                  )}
                </select>
              </Field>

              <div className="border rounded-2xl border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                  {LANGS.map((l) => (
                    <button key={l.key} type="button" onClick={() => setModalLang(l.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${modalLang === l.key ? 'bg-white text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-500 hover:text-gray-700'}`}>
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
                {LANGS.map(({ key: l, dir }) => {
                  if (l !== modalLang) return null;
                  const fc = l === 'ar' ? 'font-arabic' : '';
                  const req = l === 'en';
                  // Stable key: the field block is reused (not remounted) across
                  // language switches, so the editor instance persists and just
                  // swaps content via its value-sync effect — no reload flash.
                  return (
                    <div key="lang-fields" className="p-4 space-y-4">
                      <Field label="Title" required={req}>
                        <input dir={dir} type="text" value={form.title[l]} onChange={(e) => setTri('title', l, e.target.value)} placeholder="Post title"
                          className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${fc}`} />
                      </Field>
                      <Field label="Author">
                        <input dir={dir} type="text" value={form.author[l]} onChange={(e) => setTri('author', l, e.target.value)} placeholder="RMC Communications"
                          className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${fc}`} />
                      </Field>
                      <Field label="Excerpt" hint="Short one-liner for cards">
                      <input dir={dir} type="text" value={form.excerpt[l]} onChange={(e) => setTri('excerpt', l, e.target.value)} placeholder="One-line teaser"
                        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${fc}`} />
                    </Field>
                    <Field label="Summary" required={req} hint="Shown under the title">
                      <textarea dir={dir} rows={2} value={form.summary[l]} onChange={(e) => setTri('summary', l, e.target.value)} placeholder="A short summary of the post"
                        className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none ${fc}`} />
                    </Field>
                    <Field label="Body" hint="Format with the toolbar — headings, lists, quotes, links">
                      {/* No per-language key — the editor persists and swaps the
                          active language's content via its internal value sync. */}
                      <RichTextEditor
                        value={form.body[l]}
                        onChange={(html) => setTri('body', l, html)}
                        dir={dir}
                        fontClassName={fc}
                      />
                    </Field>
                      </div>
                    );
                  })}
                </div>
              </div>
          )}

          {/* ── Step 2 · Settings (slug, date, status, image) ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Slug <span className="text-gray-400 font-normal">(auto from title if blank)</span></label>
                  <input type="text" value={form.slug} onChange={(e) => setShared('slug', e.target.value)} placeholder="my-post-title"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setShared('date', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                  {(['draft', 'published'] as BlogStatus[]).map((s) => (
                    <button key={s} type="button" onClick={() => setShared('status', s)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                        form.status === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {s === 'published' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Featured Image</label>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-20 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                    {form.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveBlogImage(form.image)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 hover:bg-cyan-100 disabled:opacity-60 text-cyan-700 text-xs font-semibold rounded-xl transition-colors">
                      {uploading ? <span className="w-3.5 h-3.5 border-2 border-cyan-300 border-t-cyan-600 rounded-full animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      {uploading ? 'Uploading…' : 'Upload image'}
                    </button>
                    <input type="text" value={form.image} onChange={(e) => setShared('image', e.target.value)} placeholder="…or paste an image URL"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 text-xs text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 · Review (live preview) ── */}
          {step === 2 && <ReviewStep form={form} lang={modalLang} onLangChange={setModalLang} />}
        </ModalBody>
        <ModalFooter>
          {stepError && (
            <p className="mr-auto flex items-center gap-1.5 text-xs font-medium text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{stepError}</span>
            </p>
          )}
          {step === 0 ? (
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          ) : (
            <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSaveItem} disabled={saving || uploading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {editingIndex !== null ? 'Save Changes' : 'Create Post'}
            </button>
          )}
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={deleteIndex !== null} onClose={() => setDeleteIndex(null)} onConfirm={handleDelete} title="Delete this post?" description="This will permanently remove the post from the blog." confirmLabel="Delete" cancelLabel="Keep" variant="danger" isLoading={saving} />
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-gray-400 font-normal"> — {hint}</span>}
      </label>
      {children}
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

// Horizontal step indicator for the create/edit wizard. Completed steps are
// clickable (to jump back); the current/upcoming steps are not.
function Stepper({ step, onStepClick }: { step: number; onStepClick: (s: number) => void }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={s.title} className="flex items-center flex-1 last:flex-none">
            <button type="button" onClick={() => onStepClick(i)} disabled={!done}
              className={`flex items-center gap-2.5 text-left ${done ? 'cursor-pointer' : 'cursor-default'}`}>
              <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-colors ${
                done ? 'bg-cyan-600 text-white' : active ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-500' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className="hidden sm:block">
                <span className={`block text-xs font-semibold leading-tight ${active || done ? 'text-gray-900' : 'text-gray-400'}`}>{s.title}</span>
                <span className="block text-[10px] text-gray-400 leading-tight">{s.hint}</span>
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={`flex-1 h-px mx-3 transition-colors ${done ? 'bg-cyan-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Final-step live preview, rendered in the chosen language with English fallback.
function ReviewStep({ form, lang, onLangChange }: { form: BlogPostItem; lang: Lang; onLangChange: (l: Lang) => void }) {
  const pick = (t: { en: string; rw: string; ar: string }) => (t[lang]?.trim() ? t[lang] : t.en);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fc = lang === 'ar' ? 'font-arabic' : '';
  const img = resolveBlogImage(form.image);
  const bodyHtml = blogBodyHtml(form, lang);
  const dateFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">Preview how the post will read. Switch languages to check each translation.</p>
        <LanguageTabs lang={lang} onChange={onLangChange} />
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
        <div className="relative aspect-[16/7] bg-gray-100">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
          )}
          <span className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            form.status === 'published' ? 'bg-emerald-500/90 text-white' : 'bg-gray-800/80 text-white'
          }`}>
            {form.status === 'published' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {form.status}
          </span>
        </div>

        <div className="p-5" dir={dir}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-600 ${fc}`}>{pick(form.category) || '—'}</p>
          <h3 className={`text-xl font-bold text-gray-900 mt-1 leading-snug ${fc}`}>{pick(form.title) || 'Untitled post'}</h3>
          <p className="flex items-center gap-2 text-xs text-gray-400 mt-2">
            <CalendarDays className="w-3.5 h-3.5" />
            {form.date ? dateFmt.format(new Date(form.date)) : 'Today'}
            <span className="text-gray-300">·</span>
            <span className={fc}>{pick(form.author) || 'RMC Communications'}</span>
          </p>
          {pick(form.summary) && <p className={`text-sm text-gray-600 mt-3 italic ${fc}`}>{pick(form.summary)}</p>}
          {bodyHtml && (
            <div
              className={`prose prose-sm max-w-none mt-4 border-t border-gray-50 pt-4 text-gray-700 ${fc}`}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
