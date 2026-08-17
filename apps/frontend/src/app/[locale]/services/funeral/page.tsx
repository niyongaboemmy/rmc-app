import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { Moon, FileText, Landmark, type LucideIcon } from 'lucide-react';
import { BackToServices } from '@/components/services/BackToServices';
import { FuneralActionCard } from '@/components/funeral/FuneralActionCard';
import { FuneralCallBar } from '@/components/funeral/FuneralCallBar';
import { FuneralDescription } from '@/components/funeral/FuneralDescription';
import { FuneralProcessSteps } from '@/components/funeral/FuneralProcessSteps';
import { FuneralTransportsSection } from '@/components/funeral/FuneralTransportsSection';
import { HERO_AYAH, HERO_IMAGE } from '@/components/funeral/data';
import {
  FuneralHeroCopy,
  FuneralAyahRef,
  FuneralQuickHeading,
  FuneralActionText,
  FuneralCtaCopy,
} from '@/components/funeral/FuneralPageCopy';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

type Tone = 'green' | 'gold' | 'slate';

// Every section's copy is read from the CMS on the server, so render per request —
// an admin's edit must not wait for a rebuild.
export const dynamic = 'force-dynamic';

/**
 * The one section this page owns. Nearly every consumer is a client island, so
 * reading it here is what puts the saved copy in the HTML instead of the seeded
 * defaults; `FuneralDescription` is server-side and takes the blob as a prop.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.funeral];

export default async function FuneralServicesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const content = await fetchSiteContent(PAGE_CONTENT_KEYS);
  // Handed to the one server-rendered section below; the client islands read the
  // same blob through the provider, so nothing fetches it twice.
  const funeral = content[ContentKeys.funeral];
  const base = `/${locale}/services/funeral`;

  // Quick-action cards.
  const actions: { key: 'report' | 'cemetery'; icon: LucideIcon; href: string; tone: Tone }[] = [
    { key: 'report', icon: FileText, href: `${base}/request`, tone: 'green' },
    { key: 'cemetery', icon: Landmark, href: `${base}/cemeteries`, tone: 'slate' },
  ];

  return (
    <SiteContentProvider content={content}>
      <div className="min-h-screen">
        <Navbar />
        <main>
          {/* ── Hero ── */}
          <section
            className="relative flex flex-col overflow-hidden text-white"
            style={{ minHeight: 'max(42vh, 320px)' }}
          >
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
              priority
            />
            {/* Darkening wash so the ayah and title stay legible over the photo. */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/70 to-black/45" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-25" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/50 to-transparent" aria-hidden="true" />

            <div className="relative flex flex-1 items-center justify-center px-6 pt-32 pb-4 text-center sm:px-8 lg:px-12">
              <div className="mx-auto max-w-4xl">
              <div className="mb-3 flex justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                  <Moon className="h-7 w-7 text-rmc-gold-light" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </div>
              <p className="mb-1.5 font-arabic text-xl leading-relaxed text-rmc-gold-light drop-shadow md:text-2xl" dir="rtl" lang="ar">
                {HERO_AYAH}
              </p>
              <FuneralAyahRef className="mb-4 block text-xs font-medium uppercase tracking-[0.18em] text-white/50" />
              <FuneralHeroCopy />
              </div>
            </div>

            <BackToServices locale={locale} />
          </section>

          {/* ── Quick actions + stats ── */}
          <section className="relative bg-transparent py-16 md:py-20">
            <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" aria-hidden="true" />
            <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
              <div className="mb-6 max-w-2xl">
                <FuneralQuickHeading />
              </div>

              {/* Capped to the heading's measure above: the section reads as one
                  left-aligned column, and two cards across the full 7xl row were
                  wider than the text introducing them. */}
              <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
                {actions.map((a) => (
                  <FuneralActionCard
                    key={a.key}
                    href={a.href}
                    icon={a.icon}
                    tone={a.tone}
                    title={<FuneralActionText card={a.key} field="title" />}
                    desc={<FuneralActionText card={a.key} field="desc" />}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ── What RMC does for the family (admin-written) ── */}
          <FuneralDescription saved={funeral} />

          {/* ── What happens next: the lifecycle steps families will track ── */}
          <FuneralProcessSteps />

          {/* ── Available transport means (grouped by mosque) ── */}
          <FuneralTransportsSection />

          {/* ── Closing CTA ── */}
          <section className="relative overflow-hidden bg-rmc-green-deep py-16 text-center text-white md:py-20">
            <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-15" aria-hidden="true" />
            <div className="relative mx-auto max-w-2xl px-6 sm:px-8 lg:px-12">
              <FuneralCtaCopy
                reportHref={`${base}/request`}
                contactHref={`/${locale}/contact`}
              />
            </div>
          </section>
        </main>
        <Footer />
        <FuneralCallBar />
      </div>
    </SiteContentProvider>
  );
}
