import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Heart, FileText, ClipboardList, GraduationCap, Home, Briefcase, ArrowRight } from 'lucide-react';

const services = [
  { key: 'marriage', Icon: Heart, color: 'bg-rose-50 border-rose-100 hover:border-rose-300', iconBg: 'bg-rose-100', iconColor: 'text-rose-500' },
  { key: 'funeral', Icon: FileText, color: 'bg-slate-50 border-slate-100 hover:border-slate-300', iconBg: 'bg-slate-100', iconColor: 'text-slate-500' },
  { key: 'conduct', Icon: ClipboardList, color: 'bg-blue-50 border-blue-100 hover:border-blue-300', iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
  { key: 'scholarship', Icon: GraduationCap, color: 'bg-violet-50 border-violet-100 hover:border-violet-300', iconBg: 'bg-violet-100', iconColor: 'text-violet-500' },
  { key: 'hijra', Icon: Home, color: 'bg-amber-50 border-amber-100 hover:border-amber-300', iconBg: 'bg-amber-100', iconColor: 'text-amber-500' },
  { key: 'tender', Icon: ClipboardList, color: 'bg-cyan-50 border-cyan-100 hover:border-cyan-300', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-500' },
  { key: 'jobs', Icon: Briefcase, color: 'bg-green-50 border-green-100 hover:border-green-300', iconBg: 'bg-green-100', iconColor: 'text-green-500' },
] as const;

export default async function ServicesPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Header */}
        <section className="relative text-white py-36 px-4 overflow-hidden min-h-[380px] flex items-center">
          <Image
            src="https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large"
            alt="RMC Services"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />
          <div className="relative max-w-4xl mx-auto text-center w-full">
            <div className="inline-flex items-center gap-2 bg-rmc-gold/20 border border-rmc-gold/30 text-rmc-gold px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold" />
              Our Services
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{t('services.title')}</h1>
            <p className="text-white/75 text-lg max-w-2xl mx-auto">{t('services.subtitle')}</p>
          </div>
        </section>

        {/* Services grid */}
        <section className="py-20 px-4 pattern-light">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map(({ key, Icon, color, iconBg, iconColor }) => (
                <div
                  key={key}
                  className={`group relative rounded-2xl border ${color} p-8 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-white overflow-hidden`}
                >
                  {/* Subtle gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-current opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300" />
                  <div className="relative">
                    <div className={`w-13 h-13 w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-rmc-green transition-colors">
                      {t(`services.${key}.title`)}
                    </h2>
                    <p className="text-gray-500 leading-relaxed text-sm">
                      {t(`services.${key}.desc`)}
                    </p>
                    <div className="mt-6 flex items-center gap-1.5 text-rmc-green font-semibold text-sm opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200">
                      {t('common.learnMore')} <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-20 px-4 text-center overflow-hidden">
          <Image
            src="https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large"
            alt="Join RMC"
            fill
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rmc-green-deep/90 via-black/70 to-black/80" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to access our services?</h2>
            <p className="text-white/60 mb-10 text-base">Register as a member to apply for marriage certificates, scholarships, and more.</p>
            <a
              href="/en/register"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-rmc-gold text-white font-semibold rounded-full hover:bg-amber-500 transition-all duration-200 shadow-xl shadow-rmc-gold/25 hover:shadow-rmc-gold/40 hover:scale-105 active:scale-100"
            >
              Register Now <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
