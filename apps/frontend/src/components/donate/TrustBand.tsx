'use client';

/**
 * Trust + reassurance band near the foot of the donate page — the confidence a
 * donor needs before giving: secure payment, transparency, and a closing
 * spiritual note. Static, reassurance-only content (no fabricated numbers).
 */

import { ShieldCheck, Eye, HeartHandshake } from 'lucide-react';

const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Secure Mobile Money',
    body: 'Payments are processed securely through MTN Mobile Money — approve right on your phone.',
  },
  {
    icon: Eye,
    title: 'Full transparency',
    body: 'Every campaign shows exactly how much has been raised against its goal, updated live.',
  },
  {
    icon: HeartHandshake,
    title: '100% to the cause',
    body: 'Your Zakat and Sadaqah reach the community they were intended for, with your niyyah honoured.',
  },
];

export function TrustBand() {
  return (
    <section className="relative overflow-hidden bg-rmc-green-deep py-14 text-white md:py-16">
      <div className="absolute inset-0 pattern-islamic opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,160,23,0.15),transparent_60%)]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center font-arabic text-lg leading-loose text-rmc-gold-light md:text-xl" dir="rtl">
          مَّن ذَا الَّذِي يُقْرِضُ اللَّهَ قَرْضًا حَسَنًا
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-rmc-gold/15 text-rmc-gold-light">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-[13px] leading-relaxed text-white/70">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
