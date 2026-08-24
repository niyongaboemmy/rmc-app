'use client';

/**
 * Contact-page editing, on the site-wide Edit Mode.
 *
 * This page used to run an editing system of its own — its own provider, its own
 * draft/save/cancel, its own floating toolbar, and its own trigger in the Navbar via
 * `PageEditContext`. That put TWO edit buttons in the navbar on this page and nowhere
 * else, driving two mechanisms that could not see each other: the page-local one owned
 * these rows, while the hero (an `EditablePageHero`) answered only to the global one. An
 * admin had to know which button edited which half.
 *
 * What is left here is a thin adapter so the page's call sites keep reading the same:
 * `useEditableContent` supplies the content and the editing flag, and `InlineText` does
 * the editing, exactly as on the areas, funeral, hajj and service-board pages.
 *
 * ── The plain fields are not editable in place ─────────────────────────────────────
 *
 * Phone, phone link and the two emails are dashboard-only (Content → Contact), which is
 * the same call the funeral call bar makes about its number: a phone number is not prose,
 * and a mistyped one fails silently — nothing on the page looks wrong, the link simply
 * stops reaching anyone. The dashboard puts the displayed number beside the `tel:` link
 * it must agree with, which is where that edit belongs.
 */

import { useLocale } from 'next-intl';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  CONTACT_DEFAULT,
  ContentKeys,
  pick,
  raw,
  type ContactContent,
  type Locale,
} from '@/lib/content-api';

/** Fields carrying a translation. The plain strings are dashboard-only — see above. */
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

type Tag = keyof JSX.IntrinsicElements;

/** The page's content plus whether Edit Mode is on, from the site-wide store. */
export function useContactContent(): { content: ContactContent; editing: boolean } {
  const { content, editing } = useEditableContent<ContactContent>(
    ContentKeys.contact,
    CONTACT_DEFAULT,
  );
  return { content, editing };
}

/**
 * A translated field, edited in place in the language being viewed.
 *
 * The old control offered en/rw/ar tabs on one screen. Edit Mode instead edits the locale
 * you are looking at — you switch language to translate, and see the result as a reader
 * of that language would. That is how every other editable page in the app behaves.
 */
export function EditableTri({
  field,
  as = 'span',
  className = '',
  multiline: _multiline = false,
  bare = false,
}: {
  field: TriField;
  as?: Tag;
  className?: string;
  /** Accepted for the page's row loop; InlineText is contentEditable, so long text
   *  wraps without needing a textarea variant. */
  multiline?: boolean;
  bare?: boolean;
}) {
  void _multiline;
  const locale = useLocale();
  const lang = locale as Locale;
  const { content, setField } = useEditableContent<ContactContent>(
    ContentKeys.contact,
    CONTACT_DEFAULT,
  );

  return (
    <InlineText
      as={bare ? 'span' : (as as 'span')}
      lang={locale}
      value={pick(content[field], locale)}
      // This locale's OWN text, so an untranslated field opens empty rather than
      // pre-filled with the English it currently falls back to.
      editValue={raw(content[field], locale)}
      onCommit={(v) => setField((d) => { d[field][lang] = v; })}
      className={className}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      placeholder="Enter text…"
    />
  );
}

/**
 * A plain shared string — phone, phone link, email. Rendered, never edited here.
 *
 * Kept as a component so the page's row loop stays symmetric with `EditableTri`, and so
 * there is one place to look when asking why these are not editable in place.
 */
export function EditablePlain({
  field,
  as = 'span',
  className = '',
}: {
  field: PlainField;
  as?: Tag;
  className?: string;
  /** Accepted and ignored — the old inline input took one. */
  placeholder?: string;
  inputType?: string;
}) {
  const { content } = useContactContent();
  const As = as as Tag;
  return <As className={className}>{content[field]}</As>;
}
