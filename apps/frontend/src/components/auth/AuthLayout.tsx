import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function AuthLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    /* Root: full viewport, no window scroll */
    <div className="flex h-screen overflow-hidden">

      {/* ── Fixed brand panel (lg+) ─────────────────────────────── */}
      <aside
        aria-hidden="true"
        className="
          hidden lg:flex
          lg:w-[44%] xl:w-[42%] 2xl:w-[38%]
          h-screen overflow-hidden
          relative flex-col flex-shrink-0
          bg-rmc-green-deep
        "
      >
        {/* Gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-rmc-green-deep via-[#155e38] to-[#1e8a55]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Geometric tile pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="geo-auth" x="0" y="0" width="72" height="72" patternUnits="userSpaceOnUse">
              <path d="M36 0L72 36L36 72L0 36Z" fill="none" stroke="white" strokeWidth="0.7" />
              <path d="M36 14L58 36L36 58L14 36Z" fill="none" stroke="white" strokeWidth="0.7" />
              <circle cx="36" cy="36" r="3.5" fill="white" opacity="0.6" />
              <circle cx="0"  cy="0"  r="2"   fill="white" opacity="0.4" />
              <circle cx="72" cy="0"  r="2"   fill="white" opacity="0.4" />
              <circle cx="0"  cy="72" r="2"   fill="white" opacity="0.4" />
              <circle cx="72" cy="72" r="2"   fill="white" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geo-auth)" />
        </svg>

        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-72 h-72 rounded-full bg-rmc-green/35 blur-3xl animate-float" />
        <div className="pointer-events-none absolute bottom-10 -left-16 w-80 h-80 rounded-full bg-rmc-gold/20 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-rmc-green-dark/20 blur-3xl" />

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col h-full px-8 xl:px-12 2xl:px-14 py-8 xl:py-10 select-none">

          {/* Logo + wordmark */}
          <div className="animate-fade-left flex items-center gap-3" style={{ animationDelay: '0ms' }}>
            <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden">
              <Image
                src="/logo.webp"
                alt="RMC Logo"
                width={44}
                height={44}
                className="object-cover w-full h-full"
                priority
              />
            </div>
            <div className="leading-tight">
              <p className="text-white font-bold text-sm tracking-wide">Rwanda Muslim</p>
              <p className="text-white/60 text-xs">Community</p>
            </div>
          </div>

          {/* Hero block — vertically centered */}
          <div className="flex-1 flex flex-col justify-center space-y-5 py-6">
            <div
              className="animate-fade-left inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3.5 py-1 w-fit"
              style={{ animationDelay: '80ms' }}
            >
              <svg className="w-3 h-3 text-rmc-gold-light shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-white/75 text-xs font-medium">Trusted Digital Platform</span>
            </div>

            <h2
              className="animate-fade-left text-[1.9rem] xl:text-[2.25rem] 2xl:text-[2.5rem] font-bold text-white leading-[1.15]"
              style={{ animationDelay: '160ms' }}
            >
              Your Faith,<br />
              <span className="text-rmc-gold-light">Connected.</span>
            </h2>

            <p
              className="animate-fade-left text-white/60 text-sm xl:text-base leading-relaxed max-w-xs"
              style={{ animationDelay: '240ms' }}
            >
              Manage your membership, access Islamic resources, and stay connected with the Muslim community across Rwanda.
            </p>

            {/* Logo image feature */}
            <div
              className="animate-fade-left flex items-center gap-4 pt-2"
              style={{ animationDelay: '320ms' }}
            >
              <div className="w-16 h-16 xl:w-20 xl:h-20 rounded-2xl bg-white/10 ring-1 ring-white/20 overflow-hidden flex items-center justify-center animate-float">
                <Image
                  src="/logo.webp"
                  alt="RMC"
                  width={80}
                  height={80}
                  className="object-contain w-full h-full p-1"
                />
              </div>
              <div className="space-y-1">
                <p className="text-white font-semibold text-sm">Rwanda Muslim Community</p>
                <p className="text-white/50 text-xs">Digital platform for the Ummah</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="animate-fade-left grid grid-cols-3 gap-3 py-6 border-y border-white/15"
            style={{ animationDelay: '400ms' }}
          >
            {([
              { value: '10K+', label: 'Members' },
              { value: '50+',  label: 'Mosques' },
              { value: '24/7', label: 'Support' },
            ] as const).map((s, i) => (
              <div
                key={s.label}
                className="text-center group cursor-default"
              >
                <p className="text-xl xl:text-2xl font-bold text-white group-hover:text-rmc-gold-light transition-colors duration-300">
                  {s.value}
                </p>
                <p className="text-white/45 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Copyright */}
          <p
            className="animate-fade-left text-white/25 text-xs mt-6"
            style={{ animationDelay: '480ms' }}
          >
            © {year} Rwanda Muslim Community
          </p>
        </div>
      </aside>

      {/* ── Scrollable form panel ────────────────────────────────── */}
      <main className="flex-1 h-screen overflow-y-auto bg-gray-50/40 lg:bg-white">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 bg-rmc-green px-5 py-3 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-white/20 ring-1 ring-white/30 overflow-hidden flex items-center justify-center shrink-0">
            <Image
              src="/logo.webp"
              alt="RMC Logo"
              width={36}
              height={36}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm leading-tight">Rwanda Muslim Community</p>
            <p className="text-white/60 text-xs">Digital Platform</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
        </div>

        {/* Desktop: back-home button pinned top-right */}
        <div className="hidden lg:flex justify-end px-8 pt-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rmc-green font-medium px-4 py-2 rounded-xl border border-gray-200 hover:border-rmc-green/40 bg-white hover:bg-rmc-green-light shadow-sm hover:shadow-md transition-all duration-200"
          >
            <svg className="w-4 h-4 -translate-x-0 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Centered form */}
        <div className="flex min-h-[calc(100%-56px)] lg:min-h-[calc(100%-60px)] items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
