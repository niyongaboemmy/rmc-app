import { notFound } from 'next/navigation';

// Any URL under a valid locale that matches no real route falls through to this
// catch-all, which triggers the localized not-found boundary in
// `app/[locale]/not-found.tsx`. Without it, Next.js would render the bare root
// `app/not-found.tsx` (no navbar / providers / translations) for typo'd URLs.
export default function CatchAllNotFound() {
  notFound();
}
