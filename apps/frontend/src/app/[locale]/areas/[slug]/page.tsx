import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Home, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AreaDetail } from '@/components/areas/AreaDetail';
import {
  ContentKeys,
  AREAS_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  type AreasContent,
} from '@/lib/content-api';

export default async function AreaDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const { locale, slug } = params;

  const raw = await getSiteContent<AreasContent>(ContentKeys.areas).catch(() => null);
  const content: AreasContent = raw ? mergeContent(AREAS_DEFAULT, raw) : AREAS_DEFAULT;

  const item = content.items.find((a) => a.slug === slug);
  if (!item) notFound();

  const pillarIndex = content.items.indexOf(item) + 1;
  const title = pick(item.title, locale);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-10" aria-label="Breadcrumb">
          <Link href={`/${locale}`} className="hover:text-rmc-green transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/${locale}#areas`} className="hover:text-rmc-green transition-colors">
            Areas of Intervention
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600 font-medium">{title}</span>
        </nav>

        <AreaDetail item={item} locale={locale} pillarIndex={pillarIndex} />

        <div className="mt-14">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
