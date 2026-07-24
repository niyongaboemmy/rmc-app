import { getRequestConfig } from 'next-intl/server';

const LOCALES = ['en', 'rw', 'ar'] as const;
const DEFAULT_LOCALE = 'en';

// next-intl 3.22+: read the locale via `requestLocale` and return it explicitly.
// The old `({ locale })` arg is deprecated and can arrive undefined, which made
// `import('./messages/undefined.json')` throw and break rendering.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = LOCALES.includes(requested as (typeof LOCALES)[number])
    ? (requested as string)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
