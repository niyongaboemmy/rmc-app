'use client';

import { Sparkles, Footprints, BookOpen, MapPin, UserPlus } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { TriSectionEditor } from '@/components/admin/content/TriSectionEditor';
import type { TriFieldDef, TriFieldGroup } from '@/components/admin/content/TriFields';
import { ContentKeys, NEW_MUSLIM_DEFAULT, type NewMuslimContent } from '@/lib/content-api';

/**
 * The "Welcome to Islam" page — four sections, each a heading plus its own content.
 *
 * The page hero is NOT here: it is its own `new-muslim-hero` section, edited under
 * Page Headers with the other banners.
 *
 * Step and dua entries are text-editable but cannot be added or removed. `mergeContent`
 * walks arrays by index, so a removed entry would inherit the seeded one at its index
 * and reappear on the page. The step icons stay editable as Lucide names because that
 * is how `newMuslimIcons` resolves them.
 */

/** eyebrow / title / subtitle, under whichever section owns them. */
const heading = (section: string): TriFieldDef[] => [
  { path: [section, 'eyebrow'], label: 'Eyebrow', rows: 1 },
  { path: [section, 'title'], label: 'Heading', rows: 1 },
  { path: [section, 'subtitle'], label: 'Subheading', rows: 2 },
];

function buildGroups(form: NewMuslimContent): TriFieldGroup[] {
  return [
    {
      title: 'First steps',
      icon: Footprints,
      note: 'The numbered things a new Muslim should do first.',
      fields: [
        ...heading('steps'),
        ...form.steps.items.flatMap((_, i): TriFieldDef[] => [
          {
            path: ['steps', 'items', i, 'icon'],
            label: `Step ${i + 1} — Icon`,
            rows: 1,
            plain: true,
            hint: 'A Lucide icon name, e.g. "Droplets". An unknown name falls back to a default icon.',
          },
          { path: ['steps', 'items', i, 'title'], label: `Step ${i + 1} — Title`, rows: 1 },
          { path: ['steps', 'items', i, 'description'], label: `Step ${i + 1} — Description`, rows: 2 },
        ]),
      ],
    },
    {
      title: 'Essential duas',
      icon: BookOpen,
      note: 'The Arabic and the transliteration are the same in every language; only the meaning is translated.',
      fields: [
        ...heading('duas'),
        ...form.duas.items.flatMap((_, i): TriFieldDef[] => [
          {
            path: ['duas', 'items', i, 'arabic'],
            label: `Dua ${i + 1} — Arabic`,
            rows: 2,
            plain: true,
            forceRtl: true,
          },
          {
            path: ['duas', 'items', i, 'transliteration'],
            label: `Dua ${i + 1} — Transliteration`,
            rows: 2,
            plain: true,
          },
          { path: ['duas', 'items', i, 'meaning'], label: `Dua ${i + 1} — Meaning`, rows: 2 },
        ]),
      ],
    },
    {
      title: 'Find a mosque nearby',
      icon: MapPin,
      note: 'Heading plus the labels on the map controls.',
      fields: [
        ...heading('nearby'),
        { path: ['nearby', 'locateLabel'], label: 'Locate button', rows: 1 },
        { path: ['nearby', 'locatingLabel'], label: 'Locate button — while searching', rows: 1 },
        { path: ['nearby', 'nearestLabel'], label: '"Nearest" label', rows: 1 },
        { path: ['nearby', 'directionsLabel'], label: 'Directions link', rows: 1 },
      ],
    },
    {
      title: 'Register & get a mentor',
      icon: UserPlus,
      note: 'Heading, the form field placeholders and what the visitor sees after submitting.',
      fields: [
        ...heading('mentor'),
        { path: ['mentor', 'namePlaceholder'], label: 'Name placeholder', rows: 1 },
        { path: ['mentor', 'emailPlaceholder'], label: 'Email placeholder', rows: 1 },
        { path: ['mentor', 'phonePlaceholder'], label: 'Phone placeholder', rows: 1 },
        { path: ['mentor', 'messagePlaceholder'], label: 'Message placeholder', rows: 2 },
        { path: ['mentor', 'submitLabel'], label: 'Submit button', rows: 1 },
        { path: ['mentor', 'successTitle'], label: 'Success — Heading', rows: 1 },
        { path: ['mentor', 'successBody'], label: 'Success — Message', rows: 2 },
        { path: ['mentor', 'errorText'], label: 'Error message', rows: 2 },
      ],
    },
  ];
}

export default function NewMuslimContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <TriSectionEditor<NewMuslimContent>
          sectionKey={ContentKeys.newMuslim}
          defaults={NEW_MUSLIM_DEFAULT}
          groups={buildGroups}
          title="Welcome to Islam Page"
          blurb="First steps, essential duas, the mosque finder and the mentor form on /new-muslim"
          icon={Sparkles}
          iconBg="bg-rmc-green-light"
          iconColor="text-rmc-green"
          publicPath="/new-muslim"
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}
