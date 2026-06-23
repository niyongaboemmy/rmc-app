import type { Metadata } from 'next';
import { Poppins, Noto_Naskh_Arabic } from 'next/font/google';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { AuthProvider } from '@/contexts/AuthContext';
import { DonationCartProvider } from '@/contexts/DonationCartContext';
import { ToastProvider } from '@/components/ui/Toast';
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
            <ToastProvider position="top-right">
              <DonationCartProvider>
                {children}
              </DonationCartProvider>
            </ToastProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
