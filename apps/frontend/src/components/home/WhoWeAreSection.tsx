'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Target, Eye, BookOpen, CheckCircle2 } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const VALUES = [
  { label: 'Unity across all provinces of Rwanda', },
  { label: 'Education and Islamic scholarship support', },
  { label: 'Transparency in community governance', },
  { label: 'Social welfare for every Muslim family', },
];

export function WhoWeAreSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: leftRef, visible: leftVisible } = useScrollReveal(0.15);
  const { ref: rightRef, visible: rightVisible } = useScrollReveal(0.15);

  return (
    <section className="relative bg-white py-20 md:py-28 overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rmc-green-light rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rmc-gold/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — image collage */}
          <div
            ref={leftRef}
            className={`relative transition-all duration-700 ${leftVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
          >
            {/* Main image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
              <Image
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900&auto=format&fit=crop"
                alt="RMC Community gathering"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep/60 to-transparent" />

              {/* Stat badge over image */}
              <div className="absolute bottom-5 left-5 right-5 flex gap-3">
                <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 text-center shadow-lg">
                  <p className="text-2xl font-bold text-rmc-green">12,500+</p>
                  <p className="text-xs text-gray-500 font-medium">Active Members</p>
                </div>
                <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 text-center shadow-lg">
                  <p className="text-2xl font-bold text-rmc-green">320+</p>
                  <p className="text-xs text-gray-500 font-medium">Mosques</p>
                </div>
                <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 text-center shadow-lg">
                  <p className="text-2xl font-bold text-rmc-green">5</p>
                  <p className="text-xs text-gray-500 font-medium">Provinces</p>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-rmc-green rounded-2xl flex flex-col items-center justify-center text-white shadow-xl shadow-rmc-green/30 rotate-3">
              <p className="text-2xl font-bold leading-none">25+</p>
              <p className="text-[10px] font-medium opacity-80 text-center leading-tight mt-0.5">Years of Service</p>
            </div>
          </div>

          {/* Right — text */}
          <div
            ref={rightRef}
            className={`transition-all duration-700 delay-150 ${rightVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
          >
            <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-rmc-green" />
              Who We Are
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-5">
              Rwanda Muslim Community —{' '}
              <span className="text-rmc-green">Serving the Ummah</span>
            </h2>

            <p className="text-gray-500 leading-relaxed mb-6 text-sm md:text-base">
              The Rwanda Muslim Community (RMC) is the umbrella organization representing Muslims across all provinces of Rwanda. Founded on the principles of Islamic brotherhood, we coordinate religious, educational, and social services for over 500,000 Muslims nationwide.
            </p>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-rmc-green-light rounded-2xl p-5 border border-rmc-green/10">
                <div className="w-9 h-9 bg-rmc-green rounded-xl flex items-center justify-center mb-3">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1.5">Our Mission</h4>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Unite and serve the Muslim community in Rwanda through digital innovation, promoting Islamic values, education, and social welfare.
                </p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                <div className="w-9 h-9 bg-rmc-gold rounded-xl flex items-center justify-center mb-3">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1.5">Our Vision</h4>
                <p className="text-gray-500 text-xs leading-relaxed">
                  A digitally empowered, unified, and prosperous Muslim community contributing to Rwanda's development.
                </p>
              </div>
            </div>

            {/* Values list */}
            <div className="space-y-2.5 mb-8">
              {VALUES.map((v) => (
                <div key={v.label} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-rmc-green shrink-0" />
                  <span className="text-gray-600 text-sm">{v.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/${locale}/about`}
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-rmc-green text-white text-sm font-bold rounded-full shadow-lg shadow-rmc-green/25 hover:bg-rmc-green-dark hover:scale-105 transition-all duration-200"
              >
                <BookOpen className="w-4 h-4" />
                Learn Our Story
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-gray-200 text-gray-600 text-sm font-semibold rounded-full hover:border-rmc-green hover:text-rmc-green transition-all duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
