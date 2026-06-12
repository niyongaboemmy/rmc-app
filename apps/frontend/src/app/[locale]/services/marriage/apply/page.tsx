import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, CheckCircle2, Heart } from 'lucide-react';
import { MarriageApplicationForm } from '@/components/services/MarriageApplicationForm';

export default async function MarriageApplyPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('services.marriage.apply');
  const points = ['p1', 'p2', 'p3'] as const;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="bg-gray-50/60 pattern-light">
        <div className="max-w-7xl mx-auto px-4 py-10 lg:py-16">
          <Link
            href={`/${locale}/services/marriage`}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-rose-700 text-sm font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t('title')}
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* ── Left: descriptive image column ── */}
            <div className="lg:sticky lg:top-24">
              <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[420px] lg:min-h-[640px] flex">
                <Image
                  src="https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80"
                  alt="Islamic marriage"
                  fill
                  className="object-cover object-center"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-950/90 via-rose-950/40 to-black/30" />
                <div className="absolute inset-0 pattern-islamic opacity-20" />

                <div className="relative mt-auto p-8 lg:p-10 text-white">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-5 ring-1 ring-white/25">
                    <Heart className="w-6 h-6 text-white" strokeWidth={2.25} />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold mb-3 drop-shadow">{t('aside.heading')}</h2>
                  <p className="text-white/75 text-sm leading-relaxed mb-7 max-w-md">{t('aside.text')}</p>
                  <ul className="space-y-3">
                    {points.map((p) => (
                      <li key={p} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                        <span className="text-white/90 text-sm">{t(`aside.${p}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ── Right: application form ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 sm:p-8 lg:p-10">
              <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
                <p className="text-gray-500 text-sm">{t('subtitle')}</p>
              </div>
              <MarriageApplicationForm />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
