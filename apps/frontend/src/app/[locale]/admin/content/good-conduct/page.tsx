'use client';

import { ShieldCheck, ClipboardCheck, ListChecks, FileText } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { TriSectionEditor } from '@/components/admin/content/TriSectionEditor';
import type { TriFieldDef, TriFieldGroup } from '@/components/admin/content/TriFields';
import { ContentKeys, GOOD_CONDUCT_DEFAULT, type GoodConductContent } from '@/lib/content-api';

/**
 * Wording on the Good Conduct service page (/services/good-conduct).
 *
 * Every field here is ALSO editable in place on the live page in Edit Mode. This screen
 * exists for the same reason the other content editors do: an admin who wants to work
 * through a page's copy in all three languages should not have to hunt each string down
 * on the page itself, and translating is far easier with the language tabs than by
 * switching locale and re-finding the field.
 *
 * ── Adding and removing entries happens on the PAGE, not here ───────────────────────
 *
 * `buildGroups` takes the saved form, so the requirement and step fields follow whatever
 * count is stored rather than the count that happened to be seeded — an admin who adds a
 * sixth requirement in Edit Mode finds it here on the next load. But the add/remove/
 * reorder controls live inline: those lists are read UNMERGED precisely so a deletion
 * rewrites the whole array, and a path-addressed form cannot express that.
 */
const requirementFields = (form: GoodConductContent): TriFieldDef[] =>
  form.requirements.items.flatMap((_, i): TriFieldDef[] => [
    { path: ['requirements', 'items', i, 'title'], label: `Requirement ${i + 1} — What is needed`, rows: 1 },
    { path: ['requirements', 'items', i, 'text'], label: `Requirement ${i + 1} — Detail`, rows: 2 },
  ]);

const stepFields = (form: GoodConductContent): TriFieldDef[] =>
  form.steps.items.flatMap((_, i): TriFieldDef[] => [
    { path: ['steps', 'items', i, 'title'], label: `Step ${i + 1} — Title`, rows: 1 },
    { path: ['steps', 'items', i, 'text'], label: `Step ${i + 1} — What happens`, rows: 2 },
  ]);

function buildGroups(form: GoodConductContent): TriFieldGroup[] {
  return [
    {
      title: 'Page header',
      icon: ShieldCheck,
      note: 'The banner at the top of /services/good-conduct.',
      fields: [
        { path: ['hero', 'title'], label: 'Heading', rows: 1 },
        { path: ['hero', 'lede'], label: 'Subheading', rows: 2 },
      ],
    },
    {
      title: 'About the certificate',
      icon: FileText,
      note: 'What the certificate confirms, and who typically asks for it.',
      fields: [
        { path: ['about', 'eyebrow'], label: 'Eyebrow', rows: 1 },
        { path: ['about', 'title'], label: 'Heading', rows: 1 },
        { path: ['about', 'body'], label: 'Description', rows: 4 },
      ],
    },
    {
      title: 'Before you apply',
      icon: ClipboardCheck,
      note: 'What an applicant needs ready. Add or remove entries on the page itself, in Edit Mode.',
      fields: [
        { path: ['requirements', 'title'], label: 'Heading', rows: 1 },
        { path: ['requirements', 'lede'], label: 'Intro line', rows: 2 },
        ...requirementFields(form),
      ],
    },
    {
      title: 'How it works',
      icon: ListChecks,
      note: 'What happens after a request is submitted.',
      fields: [
        { path: ['steps', 'title'], label: 'Heading', rows: 1 },
        ...stepFields(form),
      ],
    },
    {
      title: 'The two cards',
      icon: FileText,
      note: 'The apply and track links at the foot of the page.',
      fields: [
        { path: ['cta', 'applyTitle'], label: 'Apply card — Title', rows: 1 },
        { path: ['cta', 'applyText'], label: 'Apply card — Description', rows: 2 },
        { path: ['cta', 'applyCta'], label: 'Apply card — Link text', rows: 1 },
        { path: ['cta', 'statusTitle'], label: 'Track card — Title', rows: 1 },
        { path: ['cta', 'statusText'], label: 'Track card — Description', rows: 2 },
        { path: ['cta', 'statusCta'], label: 'Track card — Link text', rows: 1 },
      ],
    },
  ];
}

export default function GoodConductContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <TriSectionEditor<GoodConductContent>
          sectionKey={ContentKeys.goodConduct}
          defaults={GOOD_CONDUCT_DEFAULT}
          groups={buildGroups}
          title="Good Conduct Page"
          blurb="Heading, what the certificate is, what applying requires, and the two cards on /services/good-conduct"
          icon={ShieldCheck}
          iconBg="bg-rmc-green-light"
          iconColor="text-rmc-green"
          publicPath="/services/good-conduct"
          records={{
            label: 'Good Conduct Requests',
            href: '/admin/good-conduct',
            note: 'The requests themselves — reviewing, issuing and rejecting',
          }}
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}
