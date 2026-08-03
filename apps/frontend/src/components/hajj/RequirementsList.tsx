'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EyeOff, Loader2, Lock, Plus } from 'lucide-react';
import {
  hajjApi, type HajjRequirementItem, type HajjRequirementPayload,
} from '@/lib/hajjApi';
import { InlineText } from '@/components/edit-mode/InlineText';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { useEditorRefreshKey } from '@/lib/content/preview-store';
import { Permission } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/funeral/ConfirmDialog';
import {
  RequirementFormModal, isFeeKey, requirementErrMsg,
} from './RequirementFormModal';
import {
  ContentKeys, pick, isRtl,
  HAJJ_DEFAULT, type HajjContent, type Locale,
} from '@/lib/content-api';
import { requirementIcon } from './requirementIcons';

/**
 * Section: "Hajj Requirements".
 *
 * Both halves are admin-managed: the heading copy comes from the Hajj Service
 * content block, and the cards themselves from the requirements CMS (ordered,
 * per-locale, with the RWF amounts the registration form also charges).
 *
 * The HEADING is click-to-edit copy like the rest of the page. The CARDS are a
 * collection of their own, and they carry an amount, a currency, a mandatory
 * flag, a fixed key and an icon — fields that want a form, not click-to-type. So
 * managing them here opens the SAME modal the admin screen uses
 * (`RequirementFormModal`) and writes straight through the API: these edits are
 * saved on confirm, not staged into the publish/discard draft the copy uses.
 *
 * Two permissions, one toggle: copy needs `content:edit`, the cards `hajj:manage`.
 * An editor with only the first still gets the heading.
 */
export function RequirementsList() {
  const t = useTranslations('services.hajj.requirements');
  const locale = useLocale();
  const lang = locale as Locale;
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const { success, error: toastError } = useToast();

  const { content, editing, setField } = useEditableContent<HajjContent>(
    ContentKeys.hajj,
    HAJJ_DEFAULT,
  );
  const { editMode, hasPermission } = useEditMode();
  const manage = editMode && hasPermission(Permission.HAJJ_MANAGE);
  const heading = content.requirements;

  const [items, setItems] = useState<HajjRequirementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshKey = useEditorRefreshKey();
  // Bumped by our own writes, so a create/edit/delete reloads the list.
  const [localKey, setLocalKey] = useState(0);
  const reload = useCallback(() => setLocalKey((k) => k + 1), []);

  const [editItem, setEditItem] = useState<HajjRequirementItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<HajjRequirementItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    // While managing, read the ADMIN list: it includes deactivated requirements.
    // The public list omits them, so hiding one would make it vanish from the
    // only screen offering a way to bring it back.
    const load = manage ? hajjApi.admin.listRequirements() : hajjApi.getRequirements();
    load
      .then((res) => { if (active) setItems(res); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
    // refreshKey re-runs this after an editor save; it is a constant 0 publicly.
  }, [refreshKey, localKey, manage]);

  const save = async (input: HajjRequirementPayload, id?: string) => {
    setBusy(true);
    try {
      if (id) await hajjApi.admin.updateRequirement(id, input);
      else await hajjApi.admin.createRequirement(input);
      success(id ? 'Requirement updated.' : 'Requirement added.');
      setEditItem(null);
      setCreating(false);
      reload();
    } catch (e) {
      toastError(requirementErrMsg(e, 'Could not save the requirement.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await hajjApi.admin.deleteRequirement(removing.id);
      success('Requirement removed.');
      setRemoving(null);
      reload();
    } catch (e) {
      toastError(requirementErrMsg(e, 'Could not remove the requirement.'));
    } finally {
      setBusy(false);
    }
  };

  const move = async (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next); // optimistic — the row moves under the cursor immediately
    try {
      await hajjApi.admin.reorderRequirements(next.map((r) => r.id));
    } catch (e) {
      toastError(requirementErrMsg(e, 'Could not reorder.'));
      reload(); // put the server's order back
    }
  };

  const money = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <section id="hajj-requirements" className="scroll-mt-24">
      <div className="mb-8 max-w-2xl">
        {editing ? (
          <InlineText as="p" lang={locale} dir={dir} value={pick(heading.eyebrow, locale)}
            onCommit={(v) => setField((d) => { d.requirements.eyebrow[lang] = v; })}
            className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold"
            placeholder="Eyebrow" />
        ) : (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">{pick(heading.eyebrow, locale)}</p>
        )}

        {editing ? (
          <InlineText as="h2" lang={locale} dir={dir} value={pick(heading.title, locale)}
            onCommit={(v) => setField((d) => { d.requirements.title[lang] = v; })}
            className="text-2xl font-bold text-rmc-green-deep md:text-3xl"
            placeholder="Section title" />
        ) : (
          <h2 className="text-2xl font-bold text-rmc-green-deep md:text-3xl">{pick(heading.title, locale)}</h2>
        )}

        {editing ? (
          <InlineText as="p" lang={locale} dir={dir} value={pick(heading.subtitle, locale)}
            onCommit={(v) => setField((d) => { d.requirements.subtitle[lang] = v; })}
            className="mt-2 text-sm text-gray-500"
            placeholder="Section subtitle" />
        ) : (
          <p className="mt-2 text-sm text-gray-500">{pick(heading.subtitle, locale)}</p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 md:py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" aria-label={t('loading')} />
        </div>
      ) : (
        <ol className="relative flex flex-col gap-5 lg:flex-row lg:gap-0">
          {items.map((item, i) => {
            const Icon = requirementIcon(item.icon);
            const last = i === items.length - 1;
            return (
              <li
                key={item.id}
                className={`relative flex flex-1 items-start gap-4 lg:flex-col lg:items-center lg:gap-4 lg:px-3 lg:text-center ${
                  // A deactivated requirement is only ever on screen while
                  // managing; dim it so it reads as "not on the public page".
                  manage && !item.isActive ? 'opacity-50' : ''
                }`}
              >
                {manage && (
                  <CardEditToolbar
                    canMoveUp={i > 0}
                    canMoveDown={i < items.length - 1}
                    onMoveUp={() => move(i, -1)}
                    onMoveDown={() => move(i, 1)}
                    onEdit={() => setEditItem(item)}
                    onDelete={() => {
                      // The registration form charges these two BY KEY. Deleting
                      // one detaches the form from the fee it collects, so say so
                      // rather than letting the click quietly do nothing.
                      if (isFeeKey(item.key)) {
                        toastError('The registration form charges this one by key — it cannot be deleted here.');
                        return;
                      }
                      setRemoving(item);
                    }}
                  />
                )}

                {/* Vertical connector (mobile) */}
                {!last && (
                  <span className="absolute left-[21px] top-11 h-[calc(100%+1.25rem)] w-px bg-gray-200 lg:hidden" aria-hidden="true" />
                )}
                {/* Horizontal connector (desktop) */}
                {!last && (
                  <span className="absolute left-1/2 top-[22px] hidden h-px w-full bg-gray-200 lg:block" aria-hidden="true" />
                )}

                {/* Node */}
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rmc-green/20 bg-rmc-green/10 text-rmc-green ring-4 ring-gray-50">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {manage && (isFeeKey(item.key) || !item.isActive) && (
                    <p className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 lg:justify-center">
                      {isFeeKey(item.key) && (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Charged by the form
                        </span>
                      )}
                      {!item.isActive && (
                        <span className="inline-flex items-center gap-1">
                          <EyeOff className="h-3 w-3" /> Hidden publicly
                        </span>
                      )}
                    </p>
                  )}
                  <h3 className="text-[15px] font-bold text-gray-900">{pick(item.title, locale)}</h3>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500">{pick(item.description, locale)}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 lg:justify-center">
                    {item.amount != null && (
                      <span className="inline-flex items-center rounded-lg bg-rmc-gold/20 px-2.5 py-0.5 text-[12px] font-bold text-rmc-green-deep">
                        {money.format(item.amount)} {item.currency}
                      </span>
                    )}
                    <span
                      className={[
                        'inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold',
                        item.mandatory ? 'bg-gray-100 text-gray-500' : 'bg-rmc-green-light text-rmc-green',
                      ].join(' ')}
                    >
                      {item.mandatory ? t('required') : t('recommended')}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {manage && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-rmc-green/30 px-4 py-2.5 text-sm font-semibold text-rmc-green/70 transition hover:border-rmc-green/60 hover:text-rmc-green"
        >
          <Plus className="h-4 w-4" /> Add requirement
        </button>
      )}

      {/* The admin screen's own form, so the two can never drift apart. */}
      {(creating || editItem) && (
        <RequirementFormModal
          item={editItem ?? undefined}
          busy={busy}
          onSave={save}
          onClose={() => { setCreating(false); setEditItem(null); }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Remove requirement"
          message={`Remove “${pick(removing.title, locale)}” from the Hajj page? This cannot be undone.`}
          confirmLabel={busy ? 'Removing…' : 'Remove'}
          cancelLabel="Cancel"
          onConfirm={confirmRemove}
          onCancel={() => (busy ? undefined : setRemoving(null))}
        />
      )}
    </section>
  );
}
