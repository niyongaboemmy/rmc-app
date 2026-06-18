'use client';

import { useState, useCallback, useEffect } from 'react';
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
  ContentKeys,
  ACTIVITIES_DEFAULT,
  getSiteContent,
  saveSiteContent,
  pick,
  tri,
  type Tri,
  type ActivityItem,
  type EventItem,
  type ActivitiesContent,
  type BadgeTone,
} from '@/lib/content-api';
import {
  CalendarDays, ArrowLeft, Plus, Edit2, Trash2,
  Newspaper, Calendar, Clock, MapPin, Tag, Save, Users, Wallet, Target,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'rw' | 'ar';
type ItemType = 'activity' | 'event';

/** Store items have no id; rows carry a local-only id for list management. */
type ActivityRow = ActivityItem & { id: string };
type EventRow = EventItem & { id: string };

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const TONES: BadgeTone[] = ['green', 'gold', 'neutral'];

const triKey: Record<Lang, keyof Tri> = { en: 'en', rw: 'rw', ar: 'ar' };

const EMPTY_ACTIVITY: ActivityItem = {
  category: tri(''),
  tone: 'green',
  title: tri(''),
  excerpt: tri(''),
  date: '',
  image: '',
  gallery: [],
  peopleHelped: 0,
  budgetUsed: 0,
};

const EMPTY_EVENT: EventItem = {
  title: tri(''),
  date: '',
  time: '',
  location: '',
  type: tri(''),
  tone: 'green',
  goalAmount: 0,
  raisedAmount: 0,
};

let rowSeq = 0;
const newId = () => `row-${Date.now()}-${rowSeq++}`;

const withActivityIds = (items: ActivityItem[]): ActivityRow[] =>
  items.map((a) => ({ ...a, id: newId() }));
const withEventIds = (items: EventItem[]): EventRow[] =>
  items.map((e) => ({ ...e, id: newId() }));

const stripActivityId = ({ id: _id, ...a }: ActivityRow): ActivityItem => a;
const stripEventId = ({ id: _id, ...e }: EventRow): EventItem => e;

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ActivitiesEventsPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><ActivitiesEventsManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function ActivitiesEventsManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  // Header Tri fields.
  const [eyebrow, setEyebrow] = useState<Tri>(ACTIVITIES_DEFAULT.eyebrow);
  const [title, setTitle] = useState<Tri>(ACTIVITIES_DEFAULT.title);
  const [lede, setLede] = useState<Tri>(ACTIVITIES_DEFAULT.lede);
  const [activitiesHeading, setActivitiesHeading] = useState<Tri>(ACTIVITIES_DEFAULT.activitiesHeading);
  const [eventsHeading, setEventsHeading] = useState<Tri>(ACTIVITIES_DEFAULT.eventsHeading);

  // Item arrays.
  const [activities, setActivities] = useState<ActivityRow[]>(() => withActivityIds(ACTIVITIES_DEFAULT.activities));
  const [events, setEvents] = useState<EventRow[]>(() => withEventIds(ACTIVITIES_DEFAULT.events));

  const [lang, setLang] = useState<Lang>('en');
  const [typeFilter, setTypeFilter] = useState<'all' | ItemType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ItemType>('activity');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: ItemType; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalLang, setModalLang] = useState<Lang>('en');

  const [activityForm, setActivityForm] = useState<ActivityItem>(EMPTY_ACTIVITY);
  const [eventForm, setEventForm] = useState<EventItem>(EMPTY_EVENT);
  const [galleryText, setGalleryText] = useState(''); // newline-separated URLs

  // Load any previously saved content; fall back to defaults if none exists.
  useEffect(() => {
    let active = true;
    getSiteContent<ActivitiesContent>(ContentKeys.activities)
      .then((data) => {
        if (active && data) {
          const merged = { ...ACTIVITIES_DEFAULT, ...data };
          setEyebrow(merged.eyebrow);
          setTitle(merged.title);
          setLede(merged.lede);
          setActivitiesHeading(merged.activitiesHeading);
          setEventsHeading(merged.eventsHeading);
          setActivities(withActivityIds(merged.activities));
          setEvents(withEventIds(merged.events));
        }
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

  /** Persist the whole ActivitiesContent to the store. Accepts overrides so a
   *  freshly-computed list can be saved before React state has settled. */
  const persist = useCallback(
    async (override?: Partial<{ activities: ActivityRow[]; events: EventRow[] }>) => {
      const full: ActivitiesContent = {
        eyebrow,
        title,
        lede,
        activitiesHeading,
        eventsHeading,
        activities: (override?.activities ?? activities).map(stripActivityId),
        events: (override?.events ?? events).map(stripEventId),
      };
      await saveSiteContent(ContentKeys.activities, full);
    },
    [eyebrow, title, lede, activitiesHeading, eventsHeading, activities, events],
  );

  // ── Modal open/close ──────────────────────────────────────────────────────

  const openCreate = useCallback((type: ItemType) => {
    setModalType(type);
    setEditingId(null);
    setModalLang('en');
    if (type === 'activity') {
      setActivityForm(EMPTY_ACTIVITY);
      setGalleryText('');
    } else {
      setEventForm(EMPTY_EVENT);
    }
    setIsModalOpen(true);
  }, []);

  const openEditActivity = useCallback((row: ActivityRow) => {
    setModalType('activity');
    setEditingId(row.id);
    setModalLang('en');
    setActivityForm(stripActivityId(row));
    setGalleryText(row.gallery.join('\n'));
    setIsModalOpen(true);
  }, []);

  const openEditEvent = useCallback((row: EventRow) => {
    setModalType('event');
    setEditingId(row.id);
    setModalLang('en');
    setEventForm(stripEventId(row));
    setIsModalOpen(true);
  }, []);

  // ── Field setters ─────────────────────────────────────────────────────────

  const setAField = useCallback(<K extends keyof ActivityItem>(field: K, value: ActivityItem[K]) => {
    setActivityForm((prev) => ({ ...prev, [field]: value }));
  }, []);
  const setATri = useCallback((field: 'category' | 'title' | 'excerpt', value: string) => {
    setActivityForm((prev) => ({ ...prev, [field]: { ...prev[field], [triKey[modalLang]]: value } }));
  }, [modalLang]);

  const setEField = useCallback(<K extends keyof EventItem>(field: K, value: EventItem[K]) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  }, []);
  const setETri = useCallback((field: 'title' | 'type', value: string) => {
    setEventForm((prev) => ({ ...prev, [field]: { ...prev[field], [triKey[modalLang]]: value } }));
  }, [modalLang]);

  // ── Save (create / update) ────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (modalType === 'activity') {
      if (!activityForm.title.en.trim()) {
        error('English title is required.');
        return;
      }
      const gallery = galleryText.split('\n').map((s) => s.trim()).filter(Boolean);
      const next: ActivityItem = { ...activityForm, gallery };
      const nextRows = editingId
        ? activities.map((a) => (a.id === editingId ? { ...next, id: a.id } : a))
        : [...activities, { ...next, id: newId() }];
      setSaving(true);
      try {
        await persist({ activities: nextRows });
        setActivities(nextRows);
        success(editingId ? 'Activity updated successfully.' : 'Activity added successfully.');
        setIsModalOpen(false);
      } catch {
        error('Could not save. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      if (!eventForm.title.en.trim() || !eventForm.date.trim()) {
        error('English title and date are required.');
        return;
      }
      const nextRows = editingId
        ? events.map((e) => (e.id === editingId ? { ...eventForm, id: e.id } : e))
        : [...events, { ...eventForm, id: newId() }];
      setSaving(true);
      try {
        await persist({ events: nextRows });
        setEvents(nextRows);
        success(editingId ? 'Event updated successfully.' : 'Event added successfully.');
        setIsModalOpen(false);
      } catch {
        error('Could not save. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  }, [modalType, activityForm, eventForm, galleryText, editingId, activities, events, persist, success, error]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === 'activity') {
        const next = activities.filter((a) => a.id !== deleteTarget.id);
        await persist({ activities: next });
        setActivities(next);
      } else {
        const next = events.filter((e) => e.id !== deleteTarget.id);
        await persist({ events: next });
        setEvents(next);
      }
      success('Item deleted.');
      setDeleteTarget(null);
    } catch {
      error('Could not delete. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [deleteTarget, activities, events, persist, success, error]);

  // ── Header save ───────────────────────────────────────────────────────────

  const handleSaveHeader = useCallback(async () => {
    setSaving(true);
    try {
      await persist();
      success('Section header saved.');
    } catch {
      error('Could not save header. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [persist, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fc = lang === 'ar' ? 'font-arabic' : '';
  const showActivities = typeFilter === 'all' || typeFilter === 'activity';
  const showEvents = typeFilter === 'all' || typeFilter === 'event';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Activities & Events</h1>
            <p className="text-xs text-gray-400">{activities.length} activities · {events.length} events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openCreate('activity')} disabled={loading} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Activity
          </button>
          <button onClick={() => openCreate('event')} disabled={loading} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Event
          </button>
        </div>
      </div>

      {/* ── Section header text (Tri) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700">Section Header</h2>
          <button onClick={handleSaveHeader} disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors">
            {saving || loading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {loading ? 'Loading…' : 'Save Header'}
          </button>
        </div>
        <LanguageTabs lang={lang} onChange={setLang} />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={`Eyebrow (${LANGS.find((l) => l.key === lang)?.label})`} required={lang === 'en'}>
            <input dir={dir} type="text" value={eyebrow[triKey[lang]]} onChange={(e) => setEyebrow((p) => ({ ...p, [triKey[lang]]: e.target.value }))} placeholder="Activities & Events" className={`${INPUT_CLS} ${fc}`} />
          </FormField>
          <FormField label={`Title (${LANGS.find((l) => l.key === lang)?.label})`} required={lang === 'en'}>
            <input dir={dir} type="text" value={title[triKey[lang]]} onChange={(e) => setTitle((p) => ({ ...p, [triKey[lang]]: e.target.value }))} placeholder="Latest & Upcoming" className={`${INPUT_CLS} ${fc}`} />
          </FormField>
          <FormField label={`Activities Heading (${LANGS.find((l) => l.key === lang)?.label})`}>
            <input dir={dir} type="text" value={activitiesHeading[triKey[lang]]} onChange={(e) => setActivitiesHeading((p) => ({ ...p, [triKey[lang]]: e.target.value }))} placeholder="Latest Activities" className={`${INPUT_CLS} ${fc}`} />
          </FormField>
          <FormField label={`Events Heading (${LANGS.find((l) => l.key === lang)?.label})`}>
            <input dir={dir} type="text" value={eventsHeading[triKey[lang]]} onChange={(e) => setEventsHeading((p) => ({ ...p, [triKey[lang]]: e.target.value }))} placeholder="Upcoming Events" className={`${INPUT_CLS} ${fc}`} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label={`Lede (${LANGS.find((l) => l.key === lang)?.label})`}>
              <textarea dir={dir} rows={2} value={lede[triKey[lang]]} onChange={(e) => setLede((p) => ({ ...p, [triKey[lang]]: e.target.value }))} placeholder="Follow RMC's most recent activities…" className={`${INPUT_CLS} resize-none ${fc}`} />
            </FormField>
          </div>
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-wrap items-center gap-3">
        <LanguageTabs lang={lang} onChange={setLang} />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([['all', 'All'], ['activity', 'Activities'], ['event', 'Events']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${typeFilter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Items ── */}
      <div className="space-y-3">
        {showActivities && activities.length === 0 && showEvents && events.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No items yet.</p>
          </div>
        )}

        {showActivities && activities.map((item) => {
          const t = pick(item.title, lang);
          const desc = pick(item.excerpt, lang);
          const cat = pick(item.category, lang);
          return (
            <div key={item.id} className="group flex gap-4 p-5 rounded-2xl border bg-white border-gray-100 transition-all duration-200 hover:shadow-md">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-teal-50">
                <Newspaper className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">ACTIVITY</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />{cat || '—'}
                  </span>
                  <span className="text-xs text-gray-400">{item.date || '—'}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 line-clamp-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{t || '—'}</p>
                <p className="text-xs text-gray-500 line-clamp-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{desc}</p>
                <p className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{item.peopleHelped.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Wallet className="w-3 h-3" />{item.budgetUsed.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.gallery.length} photo{item.gallery.length !== 1 ? 's' : ''}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEditActivity(item)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget({ type: 'activity', id: item.id })} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}

        {showEvents && events.map((item) => {
          const t = pick(item.title, lang);
          const ty = pick(item.type, lang);
          return (
            <div key={item.id} className="group flex gap-4 p-5 rounded-2xl border bg-white border-gray-100 transition-all duration-200 hover:shadow-md">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">EVENT</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />{ty || '—'}
                  </span>
                  <span className="text-xs text-gray-400">{item.date || '—'}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 line-clamp-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{t || '—'}</p>
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-1 flex-wrap">
                  {item.location && <><MapPin className="w-3 h-3" />{item.location}</>}
                  {item.time && <><Clock className="w-3 h-3 ml-2" />{item.time}</>}
                </p>
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <Target className="w-3 h-3" />{item.raisedAmount.toLocaleString()} / {item.goalAmount.toLocaleString()} raised
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEditEvent(item)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget({ type: 'event', id: item.id })} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingId ? (modalType === 'event' ? 'Edit Event' : 'Edit Activity') : modalType === 'event' ? 'Add Event' : 'Add Activity'}</ModalTitle>
          <ModalDescription>Provide the details, including translations in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {modalType === 'activity' ? (
            <>
              {/* Non-translated activity fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Tone">
                  <select value={activityForm.tone} onChange={(e) => setAField('tone', e.target.value as BadgeTone)} className={SELECT_CLS}>
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="Date (human)">
                  <input type="text" value={activityForm.date} onChange={(e) => setAField('date', e.target.value)} placeholder="June 4, 2026" className={INPUT_CLS} />
                </FormField>
                <FormField label="People Helped">
                  <input type="number" value={activityForm.peopleHelped} onChange={(e) => setAField('peopleHelped', Number(e.target.value))} className={INPUT_CLS} />
                </FormField>
                <FormField label="Budget Used (RWF)">
                  <input type="number" value={activityForm.budgetUsed} onChange={(e) => setAField('budgetUsed', Number(e.target.value))} className={INPUT_CLS} />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Thumbnail Image URL">
                    <input type="url" value={activityForm.image} onChange={(e) => setAField('image', e.target.value)} placeholder="https://images.unsplash.com/..." className={INPUT_CLS} />
                  </FormField>
                </div>
              </div>
              <FormField label="Gallery Image URLs (one per line)">
                <textarea rows={3} value={galleryText} onChange={(e) => setGalleryText(e.target.value)} placeholder={"https://images.unsplash.com/...\nhttps://images.unsplash.com/..."} className={`${INPUT_CLS} resize-none font-mono text-xs`} />
              </FormField>

              {/* Language tabs */}
              <div className="border rounded-2xl border-gray-100 overflow-hidden">
                <ModalLangTabs modalLang={modalLang} onChange={setModalLang} />
                <div className="p-4 space-y-4">
                  <FormField label={`Category (${LANGS.find((l) => l.key === modalLang)?.label})`}>
                    <input dir={modalDir(modalLang)} type="text" value={activityForm.category[triKey[modalLang]]} onChange={(e) => setATri('category', e.target.value)} placeholder="Education" className={`${INPUT_CLS} ${modalFc(modalLang)}`} />
                  </FormField>
                  <FormField label={`Title (${LANGS.find((l) => l.key === modalLang)?.label})`} required={modalLang === 'en'}>
                    <input dir={modalDir(modalLang)} type="text" value={activityForm.title[triKey[modalLang]]} onChange={(e) => setATri('title', e.target.value)} placeholder="RMC Launches Digital Madrassa…" className={`${INPUT_CLS} ${modalFc(modalLang)}`} />
                  </FormField>
                  <FormField label={`Excerpt (${LANGS.find((l) => l.key === modalLang)?.label})`}>
                    <textarea dir={modalDir(modalLang)} rows={3} value={activityForm.excerpt[triKey[modalLang]]} onChange={(e) => setATri('excerpt', e.target.value)} placeholder="A new online platform…" className={`${INPUT_CLS} resize-none ${modalFc(modalLang)}`} />
                  </FormField>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Non-translated event fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Date (ISO)" required>
                  <input type="date" value={eventForm.date} onChange={(e) => setEField('date', e.target.value)} className={INPUT_CLS} />
                </FormField>
                <FormField label="Time">
                  <input type="text" value={eventForm.time} onChange={(e) => setEField('time', e.target.value)} placeholder="08:00 AM" className={INPUT_CLS} />
                </FormField>
                <FormField label="Tone">
                  <select value={eventForm.tone} onChange={(e) => setEField('tone', e.target.value as BadgeTone)} className={SELECT_CLS}>
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <div className="sm:col-span-3">
                  <FormField label="Location">
                    <input type="text" value={eventForm.location} onChange={(e) => setEField('location', e.target.value)} placeholder="Amahoro National Stadium, Kigali" className={INPUT_CLS} />
                  </FormField>
                </div>
                <FormField label="Goal Amount (RWF)">
                  <input type="number" value={eventForm.goalAmount} onChange={(e) => setEField('goalAmount', Number(e.target.value))} className={INPUT_CLS} />
                </FormField>
                <FormField label="Raised Amount (RWF)">
                  <input type="number" value={eventForm.raisedAmount} onChange={(e) => setEField('raisedAmount', Number(e.target.value))} className={INPUT_CLS} />
                </FormField>
              </div>

              {/* Language tabs */}
              <div className="border rounded-2xl border-gray-100 overflow-hidden">
                <ModalLangTabs modalLang={modalLang} onChange={setModalLang} />
                <div className="p-4 space-y-4">
                  <FormField label={`Title (${LANGS.find((l) => l.key === modalLang)?.label})`} required={modalLang === 'en'}>
                    <input dir={modalDir(modalLang)} type="text" value={eventForm.title[triKey[modalLang]]} onChange={(e) => setETri('title', e.target.value)} placeholder="Eid al-Adha National Celebration" className={`${INPUT_CLS} ${modalFc(modalLang)}`} />
                  </FormField>
                  <FormField label={`Type (${LANGS.find((l) => l.key === modalLang)?.label})`}>
                    <input dir={modalDir(modalLang)} type="text" value={eventForm.type[triKey[modalLang]]} onChange={(e) => setETri('type', e.target.value)} placeholder="Religious" className={`${INPUT_CLS} ${modalFc(modalLang)}`} />
                  </FormField>
                </div>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className={CANCEL_BTN}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingId ? 'Save Changes' : modalType === 'event' ? 'Add Event' : 'Add Activity'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete this item?" description="This will remove the item from the homepage." confirmLabel="Delete" cancelLabel="Keep" variant="danger" isLoading={saving} />
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const SELECT_CLS = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 capitalize focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const CANCEL_BTN = 'px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors';

const modalDir = (l: Lang): 'ltr' | 'rtl' => (l === 'ar' ? 'rtl' : 'ltr');
const modalFc = (l: Lang) => (l === 'ar' ? 'font-arabic' : '');

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

function ModalLangTabs({ modalLang, onChange }: { modalLang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex border-b border-gray-100 bg-gray-50/50">
      {LANGS.map((l) => (
        <button key={l.key} onClick={() => onChange(l.key)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${modalLang === l.key ? 'bg-white text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <span>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
