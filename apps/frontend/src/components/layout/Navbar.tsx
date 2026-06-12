'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permission } from '@/lib/permissions';
import Image from 'next/image';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import {
  Menu, X, ChevronDown, User, LayoutDashboard,
  Lock, Users, Shield, LogOut,
} from 'lucide-react';

function LogoBadge() {
  /* Frosted glass pill — sits over the dark / translucent navbar in every state */
  return (
    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center overflow-hidden transition-all duration-300 motion-safe:group-hover:scale-105 group-hover:bg-white/20">
      <Image
        src="/logo.webp"
        alt="RMC Logo"
        width={40}
        height={40}
        className="w-full h-full object-contain p-0.5"
      />
    </div>
  );
}

export function Navbar() {
  const t = useTranslations('nav');
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  /* Close any open menu on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* Lock body scroll while the mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navLinks = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/about`, label: t('about') },
    { href: `/${locale}/services`, label: t('services') },
    { href: `/${locale}/blog`, label: t('blog') },
    { href: `/${locale}/contact`, label: t('contact') },
  ];

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await logout();
    router.push(`/${locale}/login`);
  };

  /* Navbar text is always light — the bar is transparent over the dark hero and
     dark-glass once scrolled, so white reads cleanly in every state. */
  const linkClass = (active: boolean) =>
    `relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-transparent ${
      active ? 'text-white' : 'text-white/80 hover:text-white'
    }`;

  /* Dark bar once the user scrolls, or whenever the full-screen mobile menu is open */
  const barSolid = scrolled || mobileOpen;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Bar background layer — dark glass once scrolled / menu open. Kept as a SEPARATE
          layer so <nav> itself carries no backdrop-filter; a filtered ancestor would
          otherwise trap the fixed full-screen mobile menu inside the bar. */}
      <div
        aria-hidden
        className={`absolute inset-0 transition-all duration-300 ${
          barSolid
            ? 'bg-rmc-green-deep/90 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/10'
            : 'bg-transparent'
        }`}
      />
      {/* Scroll progress bar */}
      <div
        className="absolute top-0 left-0 h-[1.5px] bg-gradient-to-r from-rmc-gold to-rmc-green transition-all duration-150 ease-out z-50 shadow-sm shadow-rmc-gold/30"
        style={{ width: `${progress}%` }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">

          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2.5 group shrink-0">
            <LogoBadge />
            <div className="hidden sm:flex items-center gap-2.5 text-white transition-colors duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
              <div>
                <p className="text-sm font-bold leading-tight tracking-tight">Rwanda Muslim</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70 leading-tight">Community</p>
              </div>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(isActive(link.href))}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                {link.label}
                <span
                  className={`absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-rmc-gold transition-transform duration-200 origin-center ${
                    isActive(link.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-1.5 shrink-0">
            {isAuthenticated && user ? (
              <div className="hidden md:flex items-center gap-2">
                <PermissionGate anyOf={[Permission.USERS_VIEW, Permission.ROLES_VIEW, Permission.MEMBERS_VIEW]}>
                  <Link
                    href={`/${locale}/admin/members`}
                    className="text-sm font-medium px-3 py-2 rounded-lg transition-all text-white/80 hover:text-white hover:bg-white/10"
                  >
                    {t('admin')}
                  </Link>
                </PermissionGate>

                {/* User avatar dropdown */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    aria-label={`${user.firstName} ${user.lastName} — account menu`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border-white/25 bg-white/10 hover:bg-white/20 hover:border-white/50 focus-visible:ring-white focus-visible:ring-offset-transparent"
                  >
                    <div className="w-6 h-6 rounded-full bg-rmc-green flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <span className="text-sm font-medium max-w-[80px] truncate text-white">
                      {user.firstName}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 text-white/60 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-slide-down">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                        <span className="inline-block mt-1.5 text-xs bg-rmc-green/10 text-rmc-green px-2 py-0.5 rounded-full capitalize font-medium">
                          {user.role}
                        </span>
                      </div>
                      {[
                        { href: `/${locale}/profile`, Icon: User, label: t('profile') },
                        { href: `/${locale}/member/dashboard`, Icon: LayoutDashboard, label: t('dashboard') },
                        { href: `/${locale}/change-password`, Icon: Lock, label: t('changePassword') },
                      ].map(({ href, Icon, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-rmc-green transition-colors"
                        >
                          <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                          {label}
                        </Link>
                      ))}
                      <PermissionGate anyOf={[Permission.USERS_VIEW, Permission.ROLES_VIEW]}>
                        <div className="my-1 border-t border-gray-50" />
                        {[
                          { href: `/${locale}/admin/users`, Icon: Users, label: 'Users' },
                          { href: `/${locale}/admin/roles`, Icon: Shield, label: 'Roles' },
                        ].map(({ href, Icon, label }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-rmc-green transition-colors"
                          >
                            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                            {label}
                          </Link>
                        ))}
                      </PermissionGate>
                      <div className="my-1 border-t border-gray-50" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {t('logout')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href={`/${locale}/login`}
                  className="text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 text-white/80 hover:text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-transparent"
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  className="bg-rmc-green text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-rmc-green-dark transition-all duration-300 shadow-lg shadow-rmc-green/30 hover:shadow-rmc-green/50 motion-safe:hover:scale-105 motion-safe:active:scale-100 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green focus-visible:ring-offset-2 focus-visible:ring-offset-rmc-green-deep"
                >
                  {t('register')}
                </Link>
              </div>
            )}

            <LanguageSwitcher />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-11 h-11 -mr-1.5 rounded-lg transition-all duration-200 outline-none text-white hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-transparent"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen
                ? <X className="h-5 w-5" />
                : <Menu className="h-5 w-5" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — full-height dark panel covering the whole screen below the bar */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden fixed inset-x-0 top-14 bottom-0 z-40 bg-rmc-green-deep overflow-y-auto overscroll-contain animate-fade-in"
        >
          {/* Islamic texture + ambient brand glow */}
          <div aria-hidden className="absolute inset-0 pattern-islamic opacity-20 pointer-events-none" />
          <div aria-hidden className="absolute top-0 right-0 w-72 h-72 bg-rmc-green/20 rounded-full blur-[90px] pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 left-0 w-72 h-72 bg-rmc-gold/5 rounded-full blur-[90px] pointer-events-none" />
          <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />

          <div className="relative flex flex-col min-h-full px-5 pt-6 pb-8">
            {/* Nav links */}
            <div className="space-y-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`flex items-center px-4 py-3.5 rounded-2xl text-base font-semibold transition-all ${
                    isActive(link.href)
                      ? 'bg-white/10 text-rmc-gold-light border border-white/10'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Auth section — pinned to the bottom of the full-height panel */}
            <div className="mt-auto pt-6 border-t border-white/10">
              {isAuthenticated && user ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 mb-2">
                    <div className="w-10 h-10 rounded-full bg-rmc-green flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-white/50 capitalize">{user.role}</p>
                    </div>
                  </div>
                  <Link href={`/${locale}/profile`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-white/85 hover:bg-white/10 hover:text-white transition-colors">
                    <User className="w-4 h-4 text-white/50" /> {t('profile')}
                  </Link>
                  <Link href={`/${locale}/member/dashboard`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-white/85 hover:bg-white/10 hover:text-white transition-colors">
                    <LayoutDashboard className="w-4 h-4 text-white/50" /> {t('dashboard')}
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm text-red-300 hover:bg-red-500/15 transition-colors">
                    <LogOut className="w-4 h-4" /> {t('logout')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-4 py-3.5 border border-white/30 text-white rounded-2xl text-sm font-semibold hover:bg-white/10 hover:border-white/50 transition-colors"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href={`/${locale}/register`}
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-4 py-3.5 bg-rmc-green text-white rounded-2xl text-sm font-semibold shadow-lg shadow-rmc-green/30 hover:bg-rmc-green-dark transition-colors"
                  >
                    {t('register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
