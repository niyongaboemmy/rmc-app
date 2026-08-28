import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, FileText, Search } from 'lucide-react';
import { BackToServices } from '@/components/services/BackToServices';
import {
  ContentKeys,
  GOOD_CONDUCT_DEFAULT,
  mergeContent,
  pick,
  type GoodConductContent,
} from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * Copy comes from the site-content store rather than the i18n bundle, so RMC can edit it
 * without a deploy — the same move the tender, jobs and scholarship boards already made.
 * The defaults are the exact strings this page used to read from `services.conduct`, so
 * nothing changes for a visitor until an admin edits something.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.goodConduct];

export default async function GoodConductServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const saved = await fetchSiteContent(PAGE_CONTENT_KEYS);
  const content = mergeContent<GoodConductContent>(
    GOOD_CONDUCT_DEFAULT,
    saved[ContentKeys.goodConduct],
  );

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
              <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">{pick(content.hero.title, locale)}</h1>
              <p className="text-white/75 text-base max-w-2xl mx-auto leading-relaxed">{pick(content.hero.lede, locale)}</p>
            </div>
          </div>

          <BackToServices locale={locale} />
        </section>

        {/* CTA cards */}
        <section className="bg-gray-50/60 pattern-light py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-5">
            <Link
              href={`/${locale}/services/good-conduct/apply`}
              className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center">
                <FileText className="w-5 h-5 text-rmc-green-dark" />
              </div>
              <p className="font-bold text-gray-900">{pick(content.cta.applyTitle, locale)}</p>
              <p className="text-sm text-gray-500 flex-1">{pick(content.cta.applyText, locale)}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green group-hover:gap-2.5 transition-all">
                {pick(content.cta.applyCta, locale)} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              href={`/${locale}/services/good-conduct/status`}
              className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center">
                <Search className="w-5 h-5 text-rmc-green-dark" />
              </div>
              <p className="font-bold text-gray-900">{pick(content.cta.statusTitle, locale)}</p>
              <p className="text-sm text-gray-500 flex-1">{pick(content.cta.statusText, locale)}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green group-hover:gap-2.5 transition-all">
                {pick(content.cta.statusCta, locale)} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </SiteContentProvider>
  );
}
