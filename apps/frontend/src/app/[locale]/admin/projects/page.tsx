'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { donationsApi, type PublicCampaign } from '@/lib/donationsApi';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  ModalTitle, ModalDescription, ConfirmModal,
} from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys,
  PROJECTS_DEFAULT,
  PROJECT_CATEGORIES,
  getSiteContent,
  saveSiteContent,
  tri,
  projectPct,
  projectMoneyShort,
  type ProjectsContent,
  type ProjectItem,
  type ProjectStatus,
  type Tri,
} from '@/lib/content-api';
import { uploadAreaImage } from '@/lib/galleryApi';
import { fileUrl } from '@/lib/api';
import {
  Building2, Plus, Edit2, Trash2, Save, Upload, X, ImageIcon, Loader2, MapPin, CheckCircle2,
  Info, Wallet, Languages, ImagePlus,
} from 'lucide-react';

/* Small labelled divider used to group the modal into sections. */
function SectionHead({ icon: Icon, title, hint }: { icon: typeof Info; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rmc-green-light">
        <Icon className="h-3.5 w-3.5 text-rmc-green" />
      </span>
      <h4 className="text-[13px] font-bold text-gray-800">{title}</h4>
      {hint && <span className="text-[11px] text-gray-400">· {hint}</span>}
    </div>
  );
}

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', flag: 'RW' },
  { key: 'ar', label: 'Arabic', flag: 'AR' },
];

/**
 * Kebab-case a title into a URL segment.
 *
 * Mirrors the backend's canonical `slugify` (common/slugify.util.ts) on the two
 * points that bite: accented letters decompose and lose their marks, so
 * "Nyamirambo Café" gives nyamirambo-cafe rather than nyamirambo-caf; and
 * typographic apostrophes are deleted rather than split on, so "Qur’an" gives
 * quran, not qur-an.
 */
function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2018\u2019`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EMPTY_ITEM: ProjectItem = {
  slug: '',
  title: tri(''),
  summary: tri(''),
  description: tri(''),
  whatWeNeed: tri(''),
  category: 'Mosque',
  location: '',
  currency: 'RWF',
  fundNeeded: 0,
  fundCollected: 0,
  status: 'ongoing',
  imageKey: '',
  galleryImages: [],
};

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green/40 focus:border-transparent';

export default function ProjectsAdminPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><ProjectsManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function ProjectsManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [content, setContent] = useState<ProjectsContent>(PROJECTS_DEFAULT);
  const [lang, setLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  /**
   * The donation campaigns a project can point at. Failure leaves the list empty,
   * so the picker offers only "not linked" — better than blocking an admin from
   * editing a project because the donations service is down.
   */
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  useEffect(() => {
    donationsApi.listCampaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ProjectItem>(EMPTY_ITEM);

  const [heroUploading, setHeroUploading] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getSiteContent<ProjectsContent>(ContentKeys.projects)
      .then((data) => {
        if (active && data) setContent({ ...PROJECTS_DEFAULT, ...data });
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const persist = useCallback(async (next: ProjectsContent, message: string) => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(ContentKeys.projects, next);
      setContent({ ...PROJECTS_DEFAULT, ...saved });
      success(message);
      return true;
    } catch {
      error('Could not save. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [success, error]);

  // ── Header ──
  const setHeader = useCallback(<K extends 'eyebrow' | 'title' | 'lede'>(field: K, l: Lang, value: string) => {
    setContent((prev) => ({ ...prev, [field]: { ...prev[field], [l]: value } as Tri }));
  }, []);

  // ── Item CRUD ──
  const openCreate = () => {
    setEditingIndex(null);
    setFormData(EMPTY_ITEM);
    setLang('en');
    setIsModalOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    const it = content.items[index];
    setFormData({
      ...EMPTY_ITEM,
      ...it,
      title: { ...it.title },
      summary: { ...it.summary },
      description: { ...it.description },
      whatWeNeed: it.whatWeNeed ? { ...it.whatWeNeed } : tri(''),
      galleryImages: it.galleryImages ? [...it.galleryImages] : [],
    });
    setLang('en');
    setIsModalOpen(true);
  };

  const setTriField = (field: 'title' | 'summary' | 'description' | 'whatWeNeed', l: Lang, value: string) =>
    setFormData((p) => ({ ...p, [field]: { ...((p[field] as Tri | undefined) ?? tri('')), [l]: value } }));

  const handleSaveItem = useCallback(async () => {
    if (!formData.title.en.trim()) { error('English title is required.'); return; }
    const clean: ProjectItem = {
      ...formData,
      // Derived, never typed. An existing project keeps the slug it already has —
      // it is the public address, and rewriting it because someone fixed a typo in
      // the title would break every link pointing at it.
      slug: formData.slug.trim() || slugify(formData.title.en),
      fundNeeded: Number(formData.fundNeeded) || 0,
      fundCollected: Number(formData.fundCollected) || 0,
    };
    if (!clean.slug) { error('The English title must contain letters or numbers.'); return; }
    const items = editingIndex !== null
      ? content.items.map((it, i) => (i === editingIndex ? clean : it))
      : [...content.items, clean];
    const ok = await persist({ ...content, items }, editingIndex !== null ? 'Project updated.' : 'Project added.');
    if (ok) setIsModalOpen(false);
  }, [formData, editingIndex, content, persist, error]);

  const handleDelete = useCallback(async () => {
    if (deleteIndex === null) return;
    const items = content.items.filter((_, i) => i !== deleteIndex);
    const ok = await persist({ ...content, items }, 'Project deleted.');
    if (ok) setDeleteIndex(null);
  }, [deleteIndex, content, persist]);

  // ── Uploads ──
  const handleHeroFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setHeroUploading(true);
    setHeroProgress(0);
    try {
      const key = await uploadAreaImage(file, 'projects', (p) => setHeroProgress(p));
      setFormData((p) => ({ ...p, imageKey: key }));
      success('Cover image uploaded.');
    } catch {
      error('Cover image upload failed.');
    } finally {
      setHeroUploading(false);
    }
  }, [success, error]);

  const handleGalleryFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = '';
    setGalleryUploading(true);
    try {
      for (const file of files) {
        const key = await uploadAreaImage(file, 'projects-gallery');
        setFormData((p) => ({ ...p, galleryImages: [...(p.galleryImages ?? []), key] }));
      }
      success(files.length === 1 ? 'Image added.' : `${files.length} images added.`);
    } catch {
      error('Gallery upload failed.');
    } finally {
      setGalleryUploading(false);
    }
  }, [success, error]);

  const removeGalleryImage = useCallback((idx: number) => {
    setFormData((p) => ({ ...p, galleryImages: (p.galleryImages ?? []).filter((_, i) => i !== idx) }));
  }, []);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fc = lang === 'ar' ? 'font-arabic' : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rmc-green-light flex items-center justify-center">
            <Building2 className="w-5 h-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Projects</h1>
            <p className="text-xs text-gray-400">{content.items.length} project{content.items.length !== 1 ? 's' : ''} · shown on /projects</p>
          </div>
        </div>
        <button onClick={openCreate} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-rmc-green/20 transition-colors">
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      {/* Language tabs (for the section header) */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {LANGS.map((l) => (
          <button key={l.key} onClick={() => setLang(l.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${lang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{l.flag}</span> {l.label}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Section Header — {LANGS.find((l) => l.key === lang)?.label}</h2>
          <button onClick={() => void persist(content, 'Section header saved.')} disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors">
            {saving || loading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {loading ? 'Loading…' : 'Save Header'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
            {/* No Eyebrow field. The projects hero was centred and its eyebrow pill
                dropped, matching About, Gallery, Dawah and Contact — so `content.eyebrow`
                renders nowhere. An input that changes nothing is worse than a missing
                one: it tells an admin they have set something. The value stays in
                ProjectsContent, so restoring the pill restores the field with it. */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
            <input dir={dir} type="text" value={content.title[lang]} onChange={(e) => setHeader('title', lang, e.target.value)} className={`${inputCls} ${fc}`} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lede</label>
          <textarea dir={dir} rows={2} value={content.lede[lang]} onChange={(e) => setHeader('lede', lang, e.target.value)} className={`${inputCls} resize-none ${fc}`} />
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {!loading && content.items.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No projects yet. Click &ldquo;Add Project&rdquo; to create one.</p>
          </div>
        )}
        {content.items.map((item, index) => {
          const title = item.title[lang]?.trim() ? item.title[lang] : item.title.en;
          const pct = projectPct(item.fundCollected, item.fundNeeded);
          return (
            <div key={index} className="group flex gap-4 p-4 rounded-2xl border bg-white border-gray-100 hover:border-rmc-green/20 transition-all duration-200 hover:shadow-md">
              {item.imageKey ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(item.imageKey)} alt={title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-rmc-green bg-rmc-green-light px-1.5 py-0.5 rounded">{item.category}</span>
                  {item.status === 'completed' && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-gray-500"><CheckCircle2 className="w-3 h-3" /> Completed</span>}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                  <span>/{item.slug || '—'}</span>
                  {item.location && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {item.location}</span>}
                </div>
                {/* mini funding bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 max-w-[240px] overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-rmc-green" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums text-rmc-green">{pct}%</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-rmc-green hover:bg-rmc-green-light transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteIndex(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden file inputs */}
      <input ref={heroInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleHeroFileChange} />
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGalleryFileChange} />

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingIndex !== null ? 'Edit Project' : 'Add Project'}</ModalTitle>
          <ModalDescription>Description, funding goal and collected amount. Cards show the funding bar automatically.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-6">
          {/* ── Basics ── */}
          <section className="space-y-4">
            <SectionHead icon={Info} title="Basics" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Slug <span className="text-gray-400 font-normal">(generated)</span></label>
                  {/* Shown, never entered. A new project follows its English title;
                      once saved the slug is FROZEN, because it is the public address
                      and rewriting it after a typo fix would break every link already
                      pointing at the project. */}
                  <p className={`${inputCls} flex items-center bg-gray-50 font-mono text-[13px] text-gray-600`}>
                    {formData.slug || slugify(formData.title.en) || (
                      <span className="font-sans text-gray-300">From the English title</span>
                    )}
                  </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                <SearchableSelect
                      value={formData.category}
                      onChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                      options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                      size="md"
                    />
              </div>
              {/* Which donation campaign this project collects for. Without one, the
                  project page's call to action goes to the donate landing. */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Donation program <span className="text-gray-400 font-normal">— where “Support this project” leads</span>
                </label>
                <SearchableSelect
                  value={formData.campaignSlug ?? ''}
                  onChange={(v) => setFormData((p) => ({ ...p, campaignSlug: v }))}
                  options={campaigns.map((c) => ({ value: c.slug, label: c.title }))}
                  noneLabel="Not linked — go to the donate page"
                  placeholder="Not linked — go to the donate page"
                  size="md"
                />
                {/* SearchableSelect shows its placeholder, greyed, when the value
                    matches no option — so a project linked to a deleted or deactivated
                    campaign reads as "Not linked" while still carrying the slug. Better
                    than a native select, which would have shown the first campaign as
                    though it were chosen, but still a lie worth naming. */}
                {formData.campaignSlug && !campaigns.some((c) => c.slug === formData.campaignSlug) && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Linked to “{formData.campaignSlug}”, which is not an active program.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                <SearchableSelect
                      value={formData.status}
                      onChange={(v) => setFormData((p) => ({ ...p, status: v as ProjectStatus }))}
                      options={[
                        { value: 'ongoing', label: 'Ongoing' },
                        { value: 'completed', label: 'Completed' },
                      ]}
                      size="md"
                    />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input type="text" value={formData.location ?? ''} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Kigali, Nyarugenge" className={`${inputCls} pl-10`} />
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-100" />

          {/* ── Funding ── */}
          <section className="space-y-4">
            <SectionHead icon={Wallet} title="Funding goal" hint="drives the progress bar on the site" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Currency</label>
                <SearchableSelect
                      value={formData.currency}
                      onChange={(v) => setFormData((p) => ({ ...p, currency: v }))}
                      options={['RWF', 'USD', 'EUR', 'GBP'].map((c) => ({ value: c, label: c }))}
                      size="md"
                    />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Fund needed</label>
                <input type="number" min={0} value={formData.fundNeeded} onChange={(e) => setFormData((p) => ({ ...p, fundNeeded: Number(e.target.value) }))} className={`${inputCls} tabular-nums`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Collected so far</label>
                <input type="number" min={0} value={formData.fundCollected} onChange={(e) => setFormData((p) => ({ ...p, fundCollected: Number(e.target.value) }))} className={`${inputCls} tabular-nums`} />
              </div>
            </div>
            {/* Live preview */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <div className="mb-1.5 flex items-end justify-between gap-2">
                <span className="text-[13px] font-bold tabular-nums text-gray-900">
                  {projectMoneyShort(formData.currency, formData.fundCollected)}
                  <span className="text-[11px] font-medium text-gray-400"> raised of {projectMoneyShort(formData.currency, formData.fundNeeded)}</span>
                </span>
                <span className="text-sm font-extrabold tabular-nums text-rmc-green">{projectPct(formData.fundCollected, formData.fundNeeded)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200/70">
                <div className="h-full rounded-full bg-gradient-to-r from-rmc-green to-rmc-green-dark transition-all" style={{ width: `${Math.max(projectPct(formData.fundCollected, formData.fundNeeded), 2)}%` }} />
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-100" />

          {/* ── Media ── */}
          <section className="space-y-4">
            <SectionHead icon={ImagePlus} title="Media" hint="cover + gallery" />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Cover Image</label>
            {formData.imageKey ? (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-gray-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(formData.imageKey)} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button type="button" onClick={() => heroInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg shadow hover:bg-gray-50 transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Replace
                  </button>
                  <button type="button" onClick={() => setFormData((p) => ({ ...p, imageKey: '' }))} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg shadow hover:bg-red-700 transition-colors">
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => heroInputRef.current?.click()} disabled={heroUploading} className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-rmc-green/50 hover:text-rmc-green transition-colors disabled:opacity-60">
                {heroUploading ? (<><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs font-semibold">{heroProgress}%</span></>)
                  : (<><ImageIcon className="w-6 h-6" /><span className="text-xs font-semibold">Click to upload cover image</span><span className="text-[10px]">JPEG · PNG · WebP · max 10 MB</span></>)}
              </button>
            )}
          </div>

          {/* Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700">Gallery <span className="ml-1 font-normal text-gray-400">({formData.galleryImages?.length ?? 0} — shown on detail page)</span></label>
              <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={galleryUploading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rmc-green border border-rmc-green/30 rounded-lg hover:bg-rmc-green-light transition-colors disabled:opacity-60">
                {galleryUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {galleryUploading ? 'Uploading…' : 'Add Images'}
              </button>
            </div>
            {(formData.galleryImages?.length ?? 0) > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {formData.galleryImages!.map((key, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(key)} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">No gallery images yet.</div>
            )}
          </div>

          </section>

          <div className="h-px bg-gray-100" />

          {/* ── Content ── */}
          <section className="space-y-4">
            <SectionHead icon={Languages} title="Content" hint="fill English; Kinyarwanda & Arabic optional" />
            <div className="border rounded-2xl border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button key={l.key} onClick={() => setLang(l.key)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${lang === l.key ? 'bg-white text-rmc-green border-b-2 border-rmc-green' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title {lang === 'en' && <span className="text-red-500">*</span>}</label>
                <input dir={dir} type="text" value={formData.title[lang]} onChange={(e) => setTriField('title', lang, e.target.value)} className={`${inputCls} ${fc}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Short summary <span className="text-gray-400 font-normal">(card blurb)</span></label>
                <textarea dir={dir} rows={2} value={formData.summary[lang]} onChange={(e) => setTriField('summary', lang, e.target.value)} className={`${inputCls} resize-none ${fc}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(detail page — blank line = new paragraph)</span></label>
                <textarea dir={dir} rows={5} value={formData.description[lang]} onChange={(e) => setTriField('description', lang, e.target.value)} className={`${inputCls} resize-y ${fc}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">What we need <span className="text-gray-400 font-normal">(how funds are used)</span></label>
                <textarea dir={dir} rows={3} value={formData.whatWeNeed?.[lang] ?? ''} onChange={(e) => setTriField('whatWeNeed', lang, e.target.value)} className={`${inputCls} resize-y ${fc}`} />
              </div>
            </div>
          </div>
          </section>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSaveItem} disabled={saving || heroUploading || galleryUploading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingIndex !== null ? 'Save Changes' : 'Add Project'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={deleteIndex !== null} onClose={() => setDeleteIndex(null)} onConfirm={handleDelete} title="Delete this project?" description="This will remove the project from the /projects page." confirmLabel="Delete" cancelLabel="Keep" variant="danger" isLoading={saving} />
    </div>
  );
}
