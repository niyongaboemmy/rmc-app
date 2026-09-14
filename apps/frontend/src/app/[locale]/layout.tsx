import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { DonationCartProvider } from '@/contexts/DonationCartContext';
import { PWAInstallProvider } from '@/contexts/PWAInstallContext';
import { ToastProvider } from '@/components/ui/Toast';
import { PWAAutoInstallPrompt } from '@/components/ui/PWAAutoInstallPrompt';
import { AskAIButton } from '@/components/home/AskAIButton';
import { EditModeProvider } from '@/lib/edit-mode/EditModeProvider';
import { EditModeBar } from '@/components/edit-mode/EditModeBar';
import '../globals.css';

// Both faces are self-hosted from src/fonts rather than fetched through
// next/font/google. That loader downloads from fonts.gstatic.com at compile
// time and, when the network is unreachable, silently emits only its
// local("Arial") fallback face — no build error, but the whole app renders in
// Arial. Vendoring the woff2 removes the build-time network dependency.
//
// Each file is the variable font for one subset, matching the subsets
// next/font/google was configured to download.

// Plus Jakarta Sans — a humanist geometric sans with a slightly warmer, more
// contemporary feel than Poppins. Keeps the same --font-latin slot so every
// downstream consumer (Tailwind font-sans/body/display, globals.css) picks it
// up unchanged.
const plusJakarta = localFont({
  src: '../../fonts/PlusJakartaSans-latin-variable.woff2',
  variable: '--font-latin',
  weight: '200 800', // variable axis — covers every weight the app uses
  style: 'normal',
  display: 'swap',
  adjustFontFallback: 'Arial',
  fallback: ['system-ui', 'sans-serif'],
});

// Noto Naskh Arabic — smooth flowing Naskh, the script of printed Qurans.
const notoNaskh = localFont({
  src: '../../fonts/NotoNaskhArabic-arabic-variable.woff2',
  variable: '--font-arabic',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  fallback: ['serif'],
});

export const metadata: Metadata = {
  title: 'RMC Digital Platform',
  description: 'Rwanda Muslim Community Digital Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'black-translucent',
    title: 'RMC',
  },
  // Standard counterpart to apple-mobile-web-app-capable (which Next emits via
  // appleWebApp); the iOS-only tag is deprecated on its own in modern browsers.
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: '/logo.webp',
    shortcut: '/logo.webp',
    apple: '/logo.webp',
  },
};

/**
 * Admin-managed copy the SHARED CHROME needs, read here so it lands in the
 * server-rendered HTML of every page rather than appearing a beat after hydration.
 *
 * Two things live in the layout rather than in each page. The footer is on 48 of the
 * 50 public pages that render CMS copy, and many of those pages are client components
 * — wiring it per page would mean restructuring every one of them. And
 * `EditablePageHero` picks its key per page, so carrying the page-hero keys costs
 * almost nothing and covers the two client pages that use it (contact,
 * member/register) without touching them.
 *
 * There is no `tendersHero`: /tenders is now a redirect stub and nothing renders that
 * section, so fetching it only bloated every page's HTML payload.
 *
 * Page-specific sections are NOT here: a page wraps its own tree in a nested
 * `SiteContentProvider`, which merges over this map. Both calls share one round-trip
 * (see `fetchSiteContent`), so a page adding its own is free.
 */
const SHARED_CONTENT_KEYS = [
  ContentKeys.social,
  ContentKeys.contact,
  ContentKeys.registerHero,
  ContentKeys.contactHero,
  ContentKeys.servicesHero,
  ContentKeys.newMuslimHero,
  ContentKeys.galleryHero,
];

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // `getMessages` is the async counterpart of the `useMessages` this used to call —
  // needed because the layout now awaits the shared content above.
  const [messages, sharedContent] = await Promise.all([
    getMessages({ locale }),
    fetchSiteContent(SHARED_CONTENT_KEYS),
  ]);
  const isRtl = locale === 'ar';

  return (
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`${plusJakarta.variable} ${notoNaskh.variable}`}
    >
      <body className={isRtl ? 'font-arabic' : 'font-latin'}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* Server-read copy for the shared chrome. A page may nest its own
              provider inside; the two maps merge. */}
          <SiteContentProvider content={sharedContent}>
            <AuthProvider>
              <PWAInstallProvider>
                <ToastProvider position="top-right">
                  <DonationCartProvider>
                    {/* In-context "Edit Mode" — super-admins edit real pages in place */}
                    <EditModeProvider>
                      {children}
                      <PWAAutoInstallPrompt />
                      {/* Floating "Ask AI" assistant — shown on every public page */}
                      <AskAIButton />
                      {/* Floating publish/discard bar — only visible in edit mode */}
                      <EditModeBar />
                    </EditModeProvider>
                  </DonationCartProvider>
                </ToastProvider>
              </PWAInstallProvider>
            </AuthProvider>
          </SiteContentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
