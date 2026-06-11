'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Heart, GraduationCap, Globe, Users, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Slide {
  badge: string;
  title: string;
  description: string;
  cta: string;
  ctaHref: string;
  Icon: React.ComponentType<{ className?: string }>;
  image: string;
  imageAlt: string;
  stat: { value: string; label: string };
}

const SLIDES: Slide[] = [
  {
    badge: 'Scholarships 2025',
    title: 'Apply for the RMC Education Scholarship Program',
    description:
      "Full and partial scholarships for Muslim students across Rwanda — primary, secondary, and university levels. Applications close June 30th. Secure your child's future today.",
    cta: 'Apply Now',
    ctaHref: '/services',
    Icon: GraduationCap,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=900&auto=format&fit=crop',
    imageAlt: 'Graduation caps thrown in celebration',
    stat: { value: '500+', label: 'Scholarships awarded' },
  },
  {
    badge: 'Community Programs',
    title: 'Join Our Social Development Initiatives Across Rwanda',
    description:
      'Microfinance support, vocational training, health outreach, and youth empowerment projects spanning all five provinces. Together we build stronger communities.',
    cta: 'Learn More',
    ctaHref: '/about',
    Icon: Users,
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900&auto=format&fit=crop',
    imageAlt: 'Community members gathered together',
    stat: { value: '12,500+', label: 'Community members' },
  },
  {
    badge: 'Support Our Mission',
    title: 'Make a Difference — Donate to the Muslim Community',
    description:
      'Your donation supports mosques, schools, orphans, and social programs across Rwanda. Every contribution, big or small, builds a stronger ummah. Earn your reward today.',
    cta: 'Donate Now',
    ctaHref: '/contact',
    Icon: Heart,
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=900&auto=format&fit=crop',
    imageAlt: 'Hands giving charitable donation',
    stat: { value: '5,000+', label: 'Families supported' },
  },
  {
    badge: 'International Affairs',
    title: 'Global Islamic Cooperation & Partnerships',
    description:
      'RMC collaborates with international Islamic organizations, embassies, and NGOs to bring scholarships, resources, and global support to the Rwandan Muslim community.',
    cta: 'Discover More',
    ctaHref: '/about',
    Icon: Globe,
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=900&auto=format&fit=crop',
    imageAlt: 'International partnership handshake',
    stat: { value: '20+', label: 'Global partners' },
  },
];

export function WelcomeCarouselSection() {
  const { locale } = useParams<{ locale: string }>();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const { ref, visible } = useScrollReveal(0.1);

  const goTo = useCallback(
    (index: number) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 320);
    },
    [animating],
  );

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);

  useEffect(() => {
    const id = setInterval(next, 6500);
    return () => clearInterval(id);
  }, [next]);

  const slide = SLIDES[current];
  const { Icon } = slide;

  return (
    <section
      ref={ref}
      className={`relative bg-rmc-green-light/30 py-16 md:py-20 overflow-hidden transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Subtle top/bottom borders */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-green/20 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-green/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-green animate-pulse" />
            Welcome
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Updates &amp; Programs</h2>
          <p className="text-gray-500 mt-2 text-sm md:text-base max-w-xl mx-auto">
            Stay informed on RMC scholarships, community programs, and initiatives across Rwanda.
          </p>
        </div>

        {/* Carousel — flat, no card shadow */}
        <div className="relative rounded-2xl overflow-hidden border border-rmc-green/15">

          {/* Slide transition wrapper */}
          <div
            className={`transition-all duration-300 ease-out ${
              animating ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'
            }`}
          >
            {/* Split layout — consistent green-tinted background */}
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[380px] md:min-h-[420px] bg-white">

              {/* LEFT — text content */}
              <div className="flex flex-col justify-center px-8 md:px-12 py-10 md:py-14 order-2 md:order-1 bg-rmc-green-light/40">

                {/* Badge + icon row */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-rmc-green flex items-center justify-center shadow-md shadow-rmc-green/20">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-rmc-green shadow-sm">
                    {slide.badge}
                  </span>
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">
                  {slide.title}
                </h3>
                <p className="text-gray-500 text-sm md:text-base leading-relaxed mb-7 max-w-md">
                  {slide.description}
                </p>

                {/* Stat pill */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="px-4 py-2 rounded-xl bg-rmc-green text-white shadow-sm shadow-rmc-green/20">
                    <p className="text-lg font-bold leading-none">{slide.stat.value}</p>
                    <p className="text-[10px] font-medium opacity-80 mt-0.5">{slide.stat.label}</p>
                  </div>
                </div>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/${locale}${slide.ctaHref}`}
                    className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white bg-rmc-green hover:bg-rmc-green-dark shadow-lg shadow-rmc-green/20 hover:scale-105 hover:shadow-xl transition-all duration-200"
                  >
                    {slide.cta}
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href={`/${locale}/contact`}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-rmc-green border-2 border-rmc-green/30 hover:border-rmc-green hover:bg-rmc-green/5 bg-white transition-all duration-200"
                  >
                    <Heart className="w-4 h-4" />
                    Donate
                  </Link>
                </div>
              </div>

              {/* RIGHT — image */}
              <div className="relative min-h-[240px] md:min-h-0 order-1 md:order-2 overflow-hidden">
                <Image
                  src={slide.image}
                  alt={slide.imageAlt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={current === 0}
                />
                {/* Left fade to blend with content side */}
                <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-rmc-green-light/60 via-transparent to-transparent" />
                {/* Bottom gradient for mobile */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:hidden" />

                {/* Slide counter */}
                <div className="absolute top-4 right-4 bg-rmc-green/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  {current + 1} / {SLIDES.length}
                </div>
              </div>
            </div>
          </div>

          {/* Arrow nav */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow border border-rmc-green/20 flex items-center justify-center text-rmc-green hover:bg-rmc-green hover:text-white transition-all duration-200 hover:scale-110 z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow border border-rmc-green/20 flex items-center justify-center text-rmc-green hover:bg-rmc-green hover:text-white transition-all duration-200 hover:scale-110 z-10"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dots + thumbnail strip */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'w-7 h-2.5 bg-rmc-green' : 'w-2.5 h-2.5 bg-rmc-green/25 hover:bg-rmc-green/50'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Thumbnail strip */}
          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-rmc-green/15">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`relative w-12 h-8 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  i === current ? 'border-rmc-green scale-110 shadow-md' : 'border-transparent opacity-40 hover:opacity-70'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              >
                <Image src={s.image} alt={s.imageAlt} fill className="object-cover" sizes="48px" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
