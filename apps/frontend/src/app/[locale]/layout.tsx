import type { Metadata } from 'next';
import { Poppins, Noto_Naskh_Arabic } from 'next/font/google';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { AuthProvider } from '@/contexts/AuthContext';
import { DonationCartProvider } from '@/contexts/DonationCartContext';
import { PWAInstallProvider } from '@/contexts/PWAInstallContext';
import { ToastProvider } from '@/components/ui/Toast';
import { PWAAutoInstallPrompt } from '@/components/ui/PWAAutoInstallPrompt';
import { AskAIButton } from '@/components/home/AskAIButton';
import { EditModeProvider } from '@/lib/edit-mode/EditModeProvider';
import { EditModeBar } from '@/components/edit-mode/EditModeBar';
import '../globals.css';

// Poppins — perfect circular geometric bowls, zero serifs, zero sharp angles.
// The standard font of modern Islamic apps (Athan, Muslim prayer platforms).
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-latin',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

// Noto Naskh Arabic — smooth flowing Naskh, the script of printed Qurans.
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
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

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = useMessages();
  const isRtl = locale === 'ar';

  return (
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`${poppins.variable} ${notoNaskh.variable}`}
    >
      <body className={isRtl ? 'font-arabic' : 'font-latin'}>
        <NextIntlClientProvider locale={locale} messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
