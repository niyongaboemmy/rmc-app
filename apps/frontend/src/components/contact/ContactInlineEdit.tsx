'use client';

/**
 * Inline content editing for the Contact page.
 *
 * An admin with `content:edit` gets a floating toolbar to edit the page's text
 * in place — in all three languages — and save it to the same content store the
 * admin form uses (`saveSiteContent('contact', …)`). Everyone else sees the page
 * exactly as normal, with no editing controls.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { Check, X, Loader2, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageEditContext, type PageEditController } from '@/contexts/PageEditContext';
import { Permission } from '@/lib/permissions';
import {
  ContentKeys,
  getSiteContent,
  saveSiteContent,
  mergeContent,
  pick,
  CONTACT_DEFAULT,
  type ContactContent,
} from '@/lib/content-api';
import { useServerSiteContent } from '@/lib/content/SiteContentProvider';

type Lang = 'en' | 'rw' | 'ar';

// Fields that carry a translation ({ en, rw, ar }) vs. plain shared strings.
export type TriField =
  | 'title'
  | 'subtitle'
  | 'communicationTitle'
  | 'communicationSubtitle'
  | 'address'
  | 'hours'
  | 'socialTitle'
  | 'findMosqueTitle'
  | 'findMosqueSubtitle';
export type PlainField = 'phone' | 'phoneHref' | 'email' | 'email2';

const LANGS: { key: Lang; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'rw', label: 'Kinyarwanda' },
  { key: 'ar', label: 'Arabic' },
];

interface InlineCtx {
  content: ContactContent; // saved copy — used for normal (view) rendering
  draft: ContactContent; // working copy — edited in place
  canEdit: boolean;
  editing: boolean;
  lang: Lang;
  saving: boolean;
  dirty: boolean;
  error: string | null;
  setLang: (l: Lang) => void;
  startEdit: () => void;
  cancel: () => void;
  save: () => void;
  setTri: (field: TriField, value: string) => void;
  setPlain: (field: PlainField, value: string) => void;
}

const Ctx = createContext<InlineCtx | null>(null);

export function ContactInlineProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const canEdit = isAuthenticated && hasPermission(Permission.CONTENT_EDIT);

  // The locale layout reads this section on the server (the footer needs it too), so
  // the saved copy is in hand on the very first render — the contact details are in
  // the server HTML instead of replacing the seeded defaults after hydration. This
  // editor keeps its own `content`/`draft` because it saves directly rather than
  // through the edit-mode store, so the server value seeds that state.
  const server = useServerSiteContent<Record<string, unknown>>(ContentKeys.contact);
  const seed = () =>
    server.value ? mergeContent(CONTACT_DEFAULT, server.value) : CONTACT_DEFAULT;

  const [content, setContent] = useState<ContactContent>(seed);
  const [draft, setDraft] = useState<ContactContent>(seed);
  const [editing, setEditing] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Nothing to fetch when the page already server-rendered this section.
    if (server.provided) return;
    let active = true;
    getSiteContent<Record<string, unknown>>(ContentKeys.contact)
      .then((data) => {
        if (!active || !data) return;
        const merged = mergeContent(CONTACT_DEFAULT, data);
        setContent(merged);
        setDraft(merged);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      active = false;
    };
  }, [server.provided]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(content), [draft, content]);

  const startEdit = useCallback(() => {
    setDraft(content);
    setError(null);
    setEditing(true);
  }, [content]);

  const cancel = useCallback(() => {
    setDraft(content);
    setError(null);
    setEditing(false);
  }, [content]);

  const setTri = useCallback(
    (field: TriField, value: string) => {
      setDraft((d) => ({ ...d, [field]: { ...d[field], [lang]: value } }));
    },
    [lang],
  );

  const setPlain = useCallback((field: PlainField, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSiteContent(ContentKeys.contact, draft);
      // Merge the response over defaults so blank translations keep their fallback.
      const merged = mergeContent(CONTACT_DEFAULT, saved);
      setContent(merged);
      setDraft(merged);
      setEditing(false);
    } catch {
      setError('Could not save. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const value: InlineCtx = {
    content,
    draft,
    canEdit,
    editing,
    lang,
    saving,
    dirty,
    error,
    setLang,
    startEdit,
    cancel,
    save,
    setTri,
    setPlain,
  };

  // Exposed to shared chrome (the Navbar) so it can render the "Edit" trigger.
  const pageController: PageEditController = useMemo(
    () => ({ canEdit, editing, saving, dirty, lang, setLang, startEdit, cancel, save }),
    [canEdit, editing, saving, dirty, lang, setLang, startEdit, cancel, save],
  );

  return (
    <Ctx.Provider value={value}>
      <PageEditContext.Provider value={pageController}>{children}</PageEditContext.Provider>
    </Ctx.Provider>
  );
}

export function useContactContent(): InlineCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useContactContent must be used within ContactInlineProvider');
  return ctx;
}

// ── Editable field components ──────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full rounded-md border border-rmc-green/40 bg-white text-gray-900 text-sm leading-snug ' +
  'px-2.5 py-1.5 outline-none transition-shadow placeholder:text-gray-400 placeholder:italic ' +
  'focus:border-rmc-green focus:ring-2 focus:ring-rmc-green/25';

type Tag = keyof JSX.IntrinsicElements;

/** A translated text field: shows the active-locale text normally, an input per-language while editing. */
export function EditableTri({
  field,
  as = 'span',
  className = '',
  multiline = false,
  bare = false,
}: {
  field: TriField;
  as?: Tag;
  className?: string;
  multiline?: boolean;
  bare?: boolean;
}) {
  const { content, draft, editing, lang, setTri } = useContactContent();
  const locale = useLocale();

  if (editing) {
    const value = draft[field][lang] ?? '';
    // When translating a non-English field, show the English text as a hint.
    const hint = lang !== 'en' ? draft[field].en : undefined;
    const shared = {
      value,
      dir: lang === 'ar' ? ('rtl' as const) : ('ltr' as const),
      placeholder: hint || 'Enter text…',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setTri(field, e.target.value),
      className: INPUT_CLASS,
    };
    const control = multiline ? (
      <textarea rows={2} {...shared} />
    ) : (
      <input type="text" {...shared} />
    );
    return bare ? control : <div className={className}>{control}</div>;
  }

  const display = pick(content[field], locale);
  if (bare) return <>{display}</>;
  const As = as as Tag;
  return <As className={className}>{display}</As>;
}

/** A plain (non-translated) string field such as phone or email. */
export function EditablePlain({
  field,
  as = 'span',
  className = '',
  placeholder,
  inputType = 'text',
}: {
  field: PlainField;
  as?: Tag;
  className?: string;
  placeholder?: string;
  inputType?: string;
}) {
  const { content, draft, editing, setPlain } = useContactContent();

  if (editing) {
    return (
      <input
        type={inputType}
        value={draft[field]}
        placeholder={placeholder}
        onChange={(e) => setPlain(field, e.target.value)}
        className={INPUT_CLASS}
      />
    );
  }
  const As = as as Tag;
  return <As className={className}>{content[field]}</As>;
}

// ── Floating admin toolbar ──────────────────────────────────────────────────────

/**
 * The editing controls (language tabs + Save / Cancel), shown as a slim bar only
 * while an admin is actually editing. The trigger to ENTER edit mode lives in the
 * Navbar (the "Edit" button), so there is nothing to show when not editing.
 */
export function ContactEditToolbar() {
  const { editing, lang, setLang, cancel, save, saving, dirty, error } = useContactContent();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !editing) return null;

  const bar = (
    <div className="fixed inset-x-0 bottom-4 z-[3000] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-stretch gap-2 rounded-2xl border border-gray-200 bg-white/95 p-2.5 shadow-2xl shadow-black/10 backdrop-blur max-w-[95vw]">
        {error && (
          <p className="px-1 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 pl-1 pr-1 text-xs font-semibold text-gray-500">
            <Globe className="h-3.5 w-3.5" /> Editing
          </span>
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLang(l.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  lang === l.key ? 'bg-white text-rmc-green shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <span className="hidden sm:block h-5 w-px bg-gray-200" />
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rmc-green px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
