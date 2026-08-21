'use client';

import { useTranslations } from 'next-intl';
import { HeroBackLink } from './HeroBackLink';

/**
 * The back-to-services pill at the bottom of every service hero.
 *
 * One component, one translation key. The service pages had each grown their
 * own copy, which drifted into four different keys and four different labels
 * ("Back to services", "Back to Services", "All Services", "Back to All
 * Services") — and only some of them flipped the arrow for RTL.
 *
 * Sub-pages that point back at their parent service use {@link HeroBackLink}
 * directly, so both share one look.
 */
export function BackToServices({ locale }: { locale: string }) {
  const t = useTranslations('services');

  return <HeroBackLink href={`/${locale}/services`} label={t('backToServices')} />;
}
