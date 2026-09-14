'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, GraduationCap, Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { LanguageTabs, FallbackNote, type Lang } from '@/components/admin/content/TriFields';
import {
  ContentKeys,
  MEMBER_REGISTRATION_DEFAULT,
  getSiteContent,
  memberEducationLevels,
  saveSiteContent,
  tri,
  type BoardLevel,
} from '@/lib/content-api';

/**
 * The education levels offered on the member registration form.
 *
 * They were a `z.enum` in the page with the labels produced by title-casing the
 * key, so the form said "Bachelors" and "Phd" in all three languages on a page
 * that is otherwise translated. There was nothing to translate — it was showing
 * an identifier.
 *
 * Not built on ServiceBoardEditor: that edits a service BOARD (hero, steps, FAQ,
 * CTA) and this is one list on a form that has none of those.
 */
export default function MemberRegistrationContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <EducationLevelsManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function EducationLevelsManager() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.CONTENT_EDIT);
  const { success, error } = useToast();

  const [levels, setLevels] = useState<BoardLevel[]>(
    MEMBER_REGISTRATION_DEFAULT.educationLevels,
  );
  const [lang, setLang] = useState<Lang>('en');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteContent<Record<string, unknown>>(ContentKeys.memberRegistration)
      // Read through the unmerged reader, not `mergeContent`: merging by index
      // would resurrect a seeded level an admin had deleted, and attach its
      // labels to whichever level moved into that position.
      .then((data) => setLevels(memberEducationLevels(data)))
      .catch(() => {
        /* keep the seeded six */
      });
  }, []);

  const setLabel = useCallback((i: number, value: string) => {
    setLevels((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, label: { ...l.label, [lang]: value } } : l)),
    );
  }, [lang]);

  // The id is generated once here and never derived from the label: it is what
  // `member_profiles.education_level` stores, so recomputing it when somebody
  // rewords a level would silently re-point every member who chose it.
  const add = useCallback(() => {
    setLevels((prev) => [...prev, { id: `edu${Date.now()}`, label: tri('') }]);
  }, []);

  const remove = useCallback((i: number) => {
    setLevels((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const move = useCallback((i: number, delta: -1 | 1) => {
    setLevels((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    // English is what every other language falls back to, so a level with none
    // would render as an empty option nobody can identify.
    const unnamed = levels.filter((l) => !l.label.en.trim()).length;
    if (unnamed > 0) {
      error(`${unnamed} level${unnamed > 1 ? 's have' : ' has'} no English label.`);
      return;
    }
    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.memberRegistration, { educationLevels: levels });
      success('Education levels saved.');
    } catch {
      error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [levels, success, error]);

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rmc-green';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/content`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
            aria-label="Back to Content"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
            <GraduationCap className="h-5 w-5 text-sky-600" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Member Registration</h1>
            <p className="text-xs text-gray-500">
              The education levels offered on /member/register
            </p>
          </div>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        )}
      </div>

      <LanguageTabs lang={lang} onChange={setLang} />

      <div className="space-y-3">
        {levels.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            No levels. The Education dropdown on the registration form stays empty until you
            add one.
          </p>
        )}

        {levels.map((level, i) => (
          <div key={level.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              {/* The stored value, shown because it is what a member's profile
                  carries — and never editable, for the same reason. */}
              <code className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                {level.id}
              </code>
              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === levels.length - 1}
                    aria-label="Move down"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label="Remove level"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <input
              value={level.label[lang]}
              onChange={(e) => setLabel(i, e.target.value)}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              placeholder={lang === 'en' ? 'Label' : `Label (${lang.toUpperCase()})`}
              className={inputCls}
              disabled={!canManage}
            />
          </div>
        ))}

        {canManage && (
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green hover:text-rmc-green"
          >
            <Plus className="h-4 w-4" />
            Add level
          </button>
        )}
      </div>

      <FallbackNote />
    </div>
  );
}
