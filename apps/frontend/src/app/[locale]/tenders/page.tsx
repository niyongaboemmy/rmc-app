import { redirect } from 'next/navigation';

/**
 * The standalone tenders board was folded into the tender service page, so this
 * route now just forwards there. Tender detail pages still live at
 * /tenders/<slug>; only this index is redundant.
 */
export default function TendersIndexRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/services/tender`);
}
