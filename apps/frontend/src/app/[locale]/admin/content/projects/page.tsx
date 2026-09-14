'use client';

/**
 * The Projects page — the section heading plus the projects themselves.
 *
 * Unlike the step and FAQ lists elsewhere in Content, projects CAN be added and
 * removed. `mergeContent` merges arrays by index, which is what makes deletion
 * dangerous when a list is seeded — the seeded entry at that index comes back. Here
 * `PROJECTS_DEFAULT.items` is empty, so there is nothing to resurrect and the list is
 * genuinely the admin's.
 *
 * Funding figures are plain numbers rather than formatted money: `projectMoney` and
 * `projectMoneyShort` do the formatting on the public side, and storing what they
 * already parse keeps one representation.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft, Save, Loader2, ExternalLink, Plus, Trash2, HandCoins,
  ImagePlus, ChevronDown, ChevronUp,
} from 'lucide-react';
import { donationsApi, type PublicCampaign } from '@/lib/donationsApi';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/Modal';
import { uploadMedia, resolveMediaUrl } from '@/lib/mediaUpload';
import {
  LanguageTabs, TriFieldCard, FallbackNote, setAtPath,
  type Lang,
} from '@/components/admin/content/TriFields';
import {
  ContentKeys, getSiteContent, saveSiteContent, mergeContent, tri,
  projectPct, PROJECTS_DEFAULT, PROJECT_CATEGORIES,
  type ProjectsContent, type ProjectItem,
} from '@/lib/content-api';

/** A project with everything blank — what "Add project" starts from. */
function emptyProject(): ProjectItem {
  return {
    slug: '',
    title: tri(''),
    summary: tri(''),
    description: tri(''),
    whatWeNeed: tri(''),
    category: '',
    location: '',
    currency: 'RWF',
    fundNeeded: 0,
    fundCollected: 0,
    status: 'ongoing',
    imageKey: '',
    galleryImages: [],
  };
}

/**
 * Kebab-case a title into a URL segment.
 *
 * Mirrors the backend's canonical `slugify` (common/slugify.util.ts) on the two
 * points that actually bite: accented letters are decomposed and their marks
 * dropped, so "Nyamirambo Café" slugs to "nyamirambo-cafe" rather than
 * "nyamirambo-caf"; and typographic apostrophes are deleted rather than treated
 * as separators, so "Qur'an" gives "quran", not "qur-an".
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

export default function ProjectsContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <ProjectsManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function ProjectsManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<ProjectsContent>(PROJECTS_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<number | null>(0);
  const [removing, setRemoving] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  /**
   * The donation campaigns a project can be pointed at.
   *
   * Failure is silent and leaves the list empty: the picker then offers only
   * "not linked", which is the honest state — better than blocking an admin from
   * editing a project's description because the donations service is down.
   */
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  useEffect(() => {
    donationsApi.listCampaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);
  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    getSiteContent<Record<string, unknown>>(ContentKeys.projects)
      .then((data) => {
        if (data) setForm(mergeContent(PROJECTS_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  // `path` already includes the language for a Tri field — see TriFieldCard.
  const setPath = useCallback((path: (string | number)[], next: string) => {
    setForm((prev) => setAtPath(prev, path, next));
  }, []);

  /** Plain (non-Tri) project field — slug, category, currency, status… */
  const setPlain = useCallback((i: number, key: keyof ProjectItem, value: string | number) => {
    setForm((prev) => {
      const items = prev.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it));
      return { ...prev, items };
    });
  }, []);

  const addProject = useCallback(() => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyProject()] }));
    setOpen(form.items.length);
  }, [form.items.length]);

  const removeProject = useCallback((i: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));
    setOpen(null);
    setRemoving(null);
  }, []);

  const handleUpload = useCallback(
    async (i: number, file: File) => {
      setUploading(i);
      try {
        const key = await uploadMedia(file, 'projects');
        setPlain(i, 'imageKey', key);
        success('Cover image uploaded.');
      } catch {
        error('Could not upload the image. Please try again.');
      } finally {
        setUploading(null);
      }
    },
    [setPlain, success, error],
  );

  const handleSave = useCallback(async () => {
    // A project with no slug would be unreachable — /projects/<slug> is how the
    // detail page finds it — so fill any blank from the English title rather than
    // saving a card that 404s when clicked.
    const normalised: ProjectsContent = {
      ...form,
      items: form.items.map((it) => ({
        ...it,
        slug: it.slug.trim() || slugify(it.title.en),
        fundNeeded: Number(it.fundNeeded) || 0,
        fundCollected: Number(it.fundCollected) || 0,
      })),
    };

    const slugs = normalised.items.map((i) => i.slug);
    const dupe = slugs.find((s, i) => s && slugs.indexOf(s) !== i);
    if (dupe) {
      error(`Two projects share the address "${dupe}". Give each a unique one.`);
      return;
    }

    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.projects, normalised);
      setForm(normalised);
      success('Projects saved successfully.');
    } catch {
      error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/content`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-rmc-green/30 hover:text-rmc-green"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <HandCoins className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Projects</h1>
            <p className="text-xs text-gray-400">
              The section heading and the fundraising projects shown on /projects
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/projects`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green/30 hover:text-rmc-green"
          >
            <ExternalLink className="h-4 w-4" /> View page
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rmc-green/20 transition-colors hover:bg-rmc-green-dark disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Section heading */}
      <TriFieldCard
        group={{
          title: 'Section heading',
          note: 'Sits above the grid of projects. The hero shows no eyebrow.',
          fields: [
            { path: ['title'], label: 'Heading', rows: 1 },
            { path: ['lede'], label: 'Intro paragraph', rows: 3 },
          ],
        }}
        value={form}
        lang={lang}
        onChange={setPath}
      />

      {/* Projects */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">
          Projects <span className="font-normal text-gray-400">— {form.items.length}</span>
        </h2>
        <button
          onClick={addProject}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green/30 hover:text-rmc-green"
        >
          <Plus className="h-4 w-4" /> Add project
        </button>
      </div>

      {form.items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          No projects yet. The public page shows its heading and an empty grid until you add one.
        </p>
      )}

      {form.items.map((item, i) => {
        const expanded = open === i;
        const cover = resolveMediaUrl(item.imageKey);
        const pct = projectPct(Number(item.fundCollected) || 0, Number(item.fundNeeded) || 0);
        return (
          <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {/* Row header */}
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => setOpen(expanded ? null : i)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                  {cover ? (
                    <Image src={cover} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-gray-300" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {item.title.en || <span className="text-gray-300">Untitled project</span>}
                  </span>
                  <span className="block text-xs text-gray-400">
                    {item.status === 'completed' ? 'Completed' : 'Ongoing'} · {pct}% funded
                    {item.slug && ` · /${item.slug}`}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setRemoving(i)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Remove project"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(expanded ? null : i)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50"
                aria-label={expanded ? 'Collapse' : 'Expand'}
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {expanded && (
              <div className="space-y-5 border-t border-gray-50 p-6">
                {/* Language-independent fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Derived, never typed.
                      An unsaved project follows its English title as it is written. Once
                      saved the slug is FROZEN: it is the project's public address, and
                      quietly rewriting it because someone fixed a typo in the title would
                      break every link and bookmark already pointing at it. Renaming a
                      live project's URL should be a deliberate act, not a side effect of
                      editing its heading. */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Address <span className="font-normal text-gray-400">— generated</span>
                    </label>
                    <p className={`${inputCls} flex items-center bg-gray-50 font-mono text-[13px] text-gray-600`}>
                      {item.slug || slugify(item.title.en) || (
                        <span className="font-sans text-gray-300">Set once the English title is written</span>
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {item.slug
                        ? 'The last part of /projects/… Fixed, so existing links keep working.'
                        : 'Built from the English title when this project is saved.'}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Category <span className="font-normal text-gray-400">— all languages</span>
                    </label>
                    {/* The same fixed list the other editor offers. It was free text
                        here, which is how two editors for one field end up able to
                        produce values the other cannot. Both stored categories are
                        already in the list, so nothing is stranded by the change. */}
                    <SearchableSelect
                      value={item.category}
                      onChange={(v) => setPlain(i, 'category', v)}
                      options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                      size="md"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      value={item.location ?? ''}
                      onChange={(e) => setPlain(i, 'location', e.target.value)}
                      placeholder="Nyarugenge, Kigali"
                      className={inputCls}
                    />
                  </div>
                  {/* Which donation campaign this project collects for.
                      A project without one still works — its call to action goes to
                      the donate landing, as every project's did before this. With one,
                      it goes straight to that campaign's card. */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Donation program{' '}
                      <span className="font-normal text-gray-400">— where “Support this project” leads</span>
                    </label>
                    <SearchableSelect
                      value={item.campaignSlug ?? ''}
                      onChange={(v) => setPlain(i, 'campaignSlug', v)}
                      options={campaigns.map((c) => ({ value: c.slug, label: c.title }))}
                      noneLabel="Not linked — go to the donate page"
                      placeholder="Not linked — go to the donate page"
                      size="md"
                    />
                    {/* SearchableSelect shows its placeholder, greyed, when the value
                        matches no option — so a project linked to a deleted or
                        deactivated campaign reads as "Not linked" while still carrying
                        the slug. Say it rather than let the control quietly misreport. */}
                    {item.campaignSlug && !campaigns.some((c) => c.slug === item.campaignSlug) && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        Linked to “{item.campaignSlug}”, which is not an active program. Pick another, or
                        leave it and re-activate that program.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                    <SearchableSelect
                      value={item.status}
                      onChange={(v) => setPlain(i, 'status', v)}
                      options={[
                        { value: 'ongoing', label: 'Ongoing' },
                        { value: 'completed', label: 'Completed' },
                      ]}
                      size="md"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Currency</label>
                    <SearchableSelect
                      value={item.currency}
                      onChange={(v) => setPlain(i, 'currency', v)}
                      options={['RWF', 'USD', 'EUR', 'GBP'].map((c) => ({ value: c, label: c }))}
                      size="md"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Funds needed</label>
                      <input
                        type="number"
                        min={0}
                        value={item.fundNeeded}
                        onChange={(e) => setPlain(i, 'fundNeeded', Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Funds raised</label>
                      <input
                        type="number"
                        min={0}
                        value={item.fundCollected}
                        onChange={(e) => setPlain(i, 'fundCollected', Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Cover image */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Cover image</label>
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                      {cover ? (
                        <Image src={cover} alt="" fill sizes="96px" className="object-cover" />
                      ) : (
                        <ImagePlus className="h-5 w-5 text-gray-300" />
                      )}
                    </span>
                    <input
                      ref={(el) => {
                        fileInputs.current[i] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(i, file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={() => fileInputs.current[i]?.click()}
                      disabled={uploading === i}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green/30 hover:text-rmc-green disabled:opacity-60"
                    >
                      {uploading === i ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      {cover ? 'Replace' : 'Upload'}
                    </button>
                    {cover && (
                      <button
                        onClick={() => setPlain(i, 'imageKey', '')}
                        className="text-sm font-medium text-gray-400 transition-colors hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Translated copy */}
                <TriFieldCard
                  group={{
                    title: 'Wording',
                    fields: [
                      { path: ['items', i, 'title'], label: 'Title', rows: 1 },
                      { path: ['items', i, 'summary'], label: 'Card summary', rows: 2 },
                      { path: ['items', i, 'description'], label: 'Full description', rows: 5,
                        hint: 'Shown on the project page. Leave a blank line between paragraphs.' },
                      { path: ['items', i, 'whatWeNeed'], label: 'What we need', rows: 3,
                        hint: 'How the funds will be used.' },
                    ],
                  }}
                  value={form}
                  lang={lang}
                  onChange={setPath}
                />
              </div>
            )}
          </div>
        );
      })}

      <FallbackNote />

      <ConfirmModal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing !== null) removeProject(removing);
        }}
        title="Remove this project?"
        message={
          removing !== null
            ? `"${form.items[removing]?.title.en || 'Untitled project'}" will be taken off the public page when you save. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
