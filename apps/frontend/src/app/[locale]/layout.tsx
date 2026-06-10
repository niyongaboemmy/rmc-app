import type { Metadata } from 'next';
import { Inter, Noto_Naskh_Arabic } from 'next/font/google';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { AuthProvider } from '@/contexts/AuthContext';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'RMC Digital Platform',
  description: 'Rwanda Muslim Community Digital Platform',
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
  const fontClass = isRtl ? notoNaskhArabic.variable : inter.variable;

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={fontClass}>
      <body className={isRtl ? 'font-arabic' : 'font-sans'}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
