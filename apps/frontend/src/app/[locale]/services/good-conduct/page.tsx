import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, FileText, Search } from 'lucide-react';
import { BackToServices } from '@/components/services/BackToServices';
import {
  GoodConductCtaCopy,
  GoodConductDetails,
  GoodConductHeroCopy,
} from '@/components/services/good-conduct/GoodConductDetails';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * Copy comes from the site-content store rather than the i18n bundle, so RMC can edit it
 * without a deploy — the same move the tender, jobs and scholarship boards already made.
 * The defaults are the exact strings this page used to read from `services.conduct`, so
 * nothing changes for a visitor until an admin edits something.
 *
 * The page stays a SERVER component and keeps the layout, imagery and links. Only the
 * text is lifted into client islands, exactly as the three board pages do it — which is
 * also why the hero here is still hand-rolled rather than a PageHero: all four service
 * landings share this markup, and swapping one would break the set.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.goodConduct];

export default async function GoodConductServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // Fetched here so the copy is in the server HTML; the islands below read it from the
  // provider rather than merging it again.
  const saved = await fetchSiteContent(PAGE_CONTENT_KEYS);

  return (
    <SiteContentProvider content={saved}>
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="relative text-white overflow-hidden flex flex-col"
          style={{ minHeight: 'max(42vh, 320px)' }}
        >
          <Image
            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80"
            alt="Good Conduct Certificate"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/65 to-black/45" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />

          <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center mb-4 pt-24">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-xl shadow-rmc-green-dark/50 ring-1 ring-white/20">
                  <ShieldCheck className="w-7 h-7 text-white" strokeWidth={2.25} />
                </div>
              </div>
              <GoodConductHeroCopy />
            </div>
          </div>

          <BackToServices locale={locale} />
        </section>

        {/* What it is, what you need, and what happens next — all inline-editable. */}
        <GoodConductDetails />

        {/* CTA cards */}
        <section className="bg-white py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-5">
            <Link
              href={`/${locale}/services/good-conduct/apply`}
              className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center">
                <FileText className="w-5 h-5 text-rmc-green-dark" />
              </div>
              <GoodConductCtaCopy card="apply" />
            </Link>

            <Link
              href={`/${locale}/services/good-conduct/status`}
              className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center">
                <Search className="w-5 h-5 text-rmc-green-dark" />
              </div>
              <GoodConductCtaCopy card="status" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </SiteContentProvider>
  );
}
