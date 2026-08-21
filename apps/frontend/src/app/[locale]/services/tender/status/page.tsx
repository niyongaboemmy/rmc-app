import { redirect } from 'next/navigation';

/**
 * The signed-in "your bids" tracker was replaced by the OTP bid page, which shows
 * a bid in full and lets the bidder correct or withdraw it without an account.
 * This route stays only to forward the links already in the wild — confirmation
 * emails, SMS and bookmarks — rather than 404ing them.
 *
 * /tenders/bid renders its own OTP gate when there is no session, so arriving
 * here cold lands on "enter your bid reference", which is what this page was for.
 */
export default function TenderStatusRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/tenders/bid`);
}
