'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

// ─── Islamic-themed Unsplash images ──────────────────────────────────────────
const PAGE_CONFIG: Record<string, { src: string; quote: string; ref: string; accent: string }> = {
  login: {
    src: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=85',
    quote: '"And whoever relies upon Allah — then He is sufficient for him. Indeed, Allah will accomplish His purpose."',
    ref: '— At-Talaq 65:3',
    accent: 'from-emerald-950/95 via-emerald-900/70 to-black/80',
  },
  register: {
    src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
    quote: '"And of His signs is that He created for you from yourselves mates that you may find tranquillity in them, and He placed between you affection and mercy."',
    ref: '— Ar-Rum 30:21',
    accent: 'from-slate-950/95 via-slate-900/70 to-black/80',
  },
  'forgot-password': {
    src: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1200&q=85',
    quote: '"Verily, with hardship comes ease."',
    ref: '— Ash-Sharh 94:5',
    accent: 'from-rose-950/95 via-rose-900/60 to-black/80',
  },
  'reset-password': {
    src: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1200&q=85',
    quote: '"Verily, with hardship comes ease."',
    ref: '— Ash-Sharh 94:5',
    accent: 'from-rose-950/95 via-rose-900/60 to-black/80',
  },
};

const DEFAULT_CONFIG = PAGE_CONFIG.login;

function getConfig(pathname: string) {
  const segment = Object.keys(PAGE_CONFIG).find((key) => pathname.includes(key));
  return segment ? PAGE_CONFIG[segment] : DEFAULT_CONFIG;
}

// ─── Decorative Islamic geometric SVG ────────────────────────────────────────
function IslamicBorder() {
  return (
    <svg
      viewBox="0 0 400 24"
      fill="none"
      className="w-full opacity-30"
      aria-hidden="true"
    >
      <path
        d="M0 12 Q50 0 100 12 Q150 24 200 12 Q250 0 300 12 Q350 24 400 12"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {[50, 150, 250, 350].map((cx) => (
        <g key={cx} transform={`translate(${cx}, 12)`}>
          <polygon points="0,-5 5,0 0,5 -5,0" fill="currentColor" opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params   = useParams<{ locale?: string }>();
  const locale   = params?.locale ?? 'rw';
  const config   = getConfig(pathname);
  const t        = useTranslations('auth');

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Left: sticky image panel ── */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-[460px] xl:w-[520px] shrink-0 flex-col overflow-hidden">

        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src={config.src}
            alt="Islamic architecture"
            fill
            className="object-cover object-center scale-[1.02] transition-transform duration-[10s] ease-out"
            priority
          />
        </div>

        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-b ${config.accent}`} />

        {/* Islamic pattern */}
        <div className="absolute inset-0 pattern-islamic opacity-[0.08]" />

        {/* Vignette edges */}
        <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]" />

        {/* Content */}
        <div className="relative flex flex-col h-full px-10 py-10">

          {/* Top: RMC branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <span className="text-white text-lg">☽</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Rwanda Muslim</p>
              <p className="text-white/50 text-[10px] tracking-widest uppercase mt-0.5">Community</p>
            </div>
          </div>

          {/* Middle: decorative spacer */}
          <div className="flex-1 flex flex-col justify-center gap-6">
            <IslamicBorder />
            <div className="text-center px-4">
              <p className="text-white/20 text-6xl font-arabic leading-none">الله</p>
            </div>
            <IslamicBorder />
          </div>

          {/* Bottom: Quranic quote */}
          <div className="space-y-5">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 px-6 py-5">
              {/* Arabic bismillah decoration */}
              <p className="text-white/30 text-2xl text-center font-arabic mb-3 tracking-widest">
                ﷽
              </p>
              <p className="text-white/80 text-sm leading-relaxed italic text-center">
                {config.quote}
              </p>
              <p className="text-white/40 text-[11px] text-center mt-3 font-medium tracking-wide">
                {config.ref}
              </p>
            </div>

            <p className="text-white/25 text-[10px] text-center tracking-widest uppercase">
              © {new Date().getFullYear()} Rwanda Muslim Community
            </p>
          </div>
        </div>
      </aside>

      {/* ── Right: form panel — page scrolls naturally ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-14 lg:px-16">
        {/* Back to home */}
        <div className="w-full max-w-sm mb-6">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('backToHome')}
          </Link>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
