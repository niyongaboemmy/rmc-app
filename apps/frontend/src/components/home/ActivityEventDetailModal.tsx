'use client';

/**
 * Edit Mode "details" sheet for a home-page activity / event card.
 *
 * The card itself handles the copy and the thumbnail inline; the fields that
 * drive sorting and layout — dates, tone, amounts, and an activity's photo
 * gallery — live here behind the card toolbar's pencil, so a stray keystroke on
 * the page can't silently re-sort or re-column a card mid-edit.
 *
 * Every control writes straight through to the section's `setField`, so the card
 * behind the modal updates live and the floating Edit bar publishes as usual.
 * Rendered only while a super-admin is editing.
 */

import { useEffect, useRef, useState } from 'react';
import { Upload, X, Loader2, Plus } from 'lucide-react';
import {
  Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription,
} from '@/components/ui/Modal';
import { assetUrl } from '@/lib/api';
import { uploadAreaImage } from '@/lib/galleryApi';
import { donationsApi, type PublicCampaign } from '@/lib/donationsApi';
import type { ActivityItem, EventItem, BadgeTone } from '@/lib/content-api';

const TONES: BadgeTone[] = ['green', 'gold', 'neutral'];

const INPUT =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-700">
        {label}
        {hint && <span className="ml-1 font-normal text-gray-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

interface DetailModalProps {
  /** Which card is open — decides the field set. */
  kind: 'activity' | 'event';
  activity?: ActivityItem;
  event?: EventItem;
  onSetActivity: <K extends keyof ActivityItem>(field: K, value: ActivityItem[K]) => void;
  onSetEvent: <K extends keyof EventItem>(field: K, value: EventItem[K]) => void;
  onClose: () => void;
}

export function ActivityEventDetailModal({
  kind,
  activity,
  event,
  onSetActivity,
  onSetEvent,
  onClose,
}: DetailModalProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  // Campaigns to choose from — only needed by the event form.
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(kind === 'event');

  useEffect(() => {
    if (kind !== 'event') return;
    let active = true;
    donationsApi
      .listCampaigns()
      .then((data) => {
        if (active) setCampaigns(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        /* leave empty — the picker then only offers "None" */
      })
      .finally(() => {
        if (active) setCampaignsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind]);

  const gallery = activity?.gallery ?? [];

  /** Upload one or more photos, appending each returned key to the gallery. */
  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !activity) return;
    e.target.value = '';
    setUploading(true);
    try {
      // Re-read from the latest prop on each append so concurrent uploads don't
      // clobber one another's additions.
      let next = [...gallery];
      for (const file of files) {
        const key = await uploadAreaImage(file, 'activities-gallery');
        next = [...next, key];
        onSetActivity('gallery', next);
      }
    } catch {
      /* the upload helper surfaces its own failure; keep what landed */
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    onSetActivity('gallery', [...gallery, url]);
    setUrlDraft('');
  };

  return (
    <Modal isOpen onClose={onClose} size="lg" zIndex={80}>
      <ModalHeader>
        <ModalTitle>{kind === 'activity' ? 'Activity details' : 'Event details'}</ModalTitle>
        <ModalDescription>
          Changes apply live. Use the Edit bar to publish or discard them.
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {kind === 'activity' && activity && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date" hint="(display text)">
                <input
                  type="text"
                  value={activity.date}
                  onChange={(e) => onSetActivity('date', e.target.value)}
                  placeholder="June 4, 2026"
                  className={INPUT}
                />
              </Field>
              <Field label="Tone" hint="(badge colour)">
                <select
                  value={activity.tone}
                  onChange={(e) => onSetActivity('tone', e.target.value as BadgeTone)}
                  className={INPUT}
                >
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="People helped">
                <input
                  type="number"
                  value={activity.peopleHelped}
                  onChange={(e) => onSetActivity('peopleHelped', Number(e.target.value))}
                  className={INPUT}
                />
              </Field>
              <Field label="Budget used" hint="(RWF)">
                <input
                  type="number"
                  value={activity.budgetUsed}
                  onChange={(e) => onSetActivity('budgetUsed', Number(e.target.value))}
                  className={INPUT}
                />
              </Field>
            </div>

            {/* Gallery — the photos the card's lightbox steps through */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                  Gallery
                  <span className="ml-1 font-normal text-gray-400">
                    ({gallery.length} photo{gallery.length !== 1 ? 's' : ''})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rmc-green/30 px-3 py-1.5 text-xs font-semibold text-rmc-green transition-colors hover:bg-rmc-green/5 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? 'Uploading…' : 'Add photos'}
                </button>
              </div>

              {(gallery.length > 0 || uploading) && (
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {gallery.map((src, i) => (
                    <div key={src + i} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assetUrl(src)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => onSetActivity('gallery', gallery.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white opacity-0 shadow transition-opacity hover:bg-red-700 group-hover:opacity-100"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {uploading && (
                    <div className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-rmc-green/30">
                      <Loader2 className="h-5 w-5 animate-spin text-rmc-green/50" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                  placeholder="…or paste an image URL"
                  className={`${INPUT} font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={addUrl}
                  disabled={!urlDraft.trim()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </>
        )}

        {kind === 'event' && event && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" hint="(drives which column it lands in)">
              <input
                type="date"
                value={event.date}
                onChange={(e) => onSetEvent('date', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Time">
              <input
                type="text"
                value={event.time}
                onChange={(e) => onSetEvent('time', e.target.value)}
                placeholder="09:00 AM"
                className={INPUT}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Location">
                <input
                  type="text"
                  value={event.location}
                  onChange={(e) => onSetEvent('location', e.target.value)}
                  placeholder="Kigali Convention Centre"
                  className={INPUT}
                />
              </Field>
            </div>
            <Field label="Tone" hint="(badge colour)">
              <select
                value={event.tone}
                onChange={(e) => onSetEvent('tone', e.target.value as BadgeTone)}
                className={INPUT}
              >
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Donation campaign"
                hint="(optional — most events don't fundraise)"
              >
                <select
                  value={event.campaignSlug ?? ''}
                  onChange={(e) => onSetEvent('campaignSlug', e.target.value || undefined)}
                  className={INPUT}
                  disabled={campaignsLoading}
                >
                  <option value="">
                    {campaignsLoading ? 'Loading campaigns…' : 'None — calendar entry only'}
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.title}</option>
                  ))}
                  {/* A slug that no longer resolves — keep it selectable so it is
                      visible rather than silently reset to "None" on save. */}
                  {!campaignsLoading &&
                    event.campaignSlug &&
                    !campaigns.some((c) => c.slug === event.campaignSlug) && (
                      <option value={event.campaignSlug}>
                        {event.campaignSlug} (campaign not found)
                      </option>
                    )}
                </select>
              </Field>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Link one to show its live raised/goal progress and a Donate button on the
                card. Amounts come from real donations — they are never typed in here.
              </p>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
        >
          Done
        </button>
      </ModalFooter>
    </Modal>
  );
}
