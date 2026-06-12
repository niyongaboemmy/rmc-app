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

function LogoBadge({ scrolled }: { scrolled: boolean }) {
  if (scrolled) {
    /* On white navbar — no box, just the logo with a subtle shadow */
    return (
      <div className="transition-all duration-300 motion-safe:group-hover:scale-105 shrink-0">
        <Image
          src="/logo.webp"
          alt="RMC Logo"
          width={40}
          height={40}
          className="w-10 h-10 object-contain drop-shadow-sm"
        />
      </div>
    );
  }
  /* Over dark hero — small frosted glass pill to contain the white bg */
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
    await logout();
    router.push(`/${locale}/login`);
  };

  const linkClass = (active: boolean) =>
    `relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
      active
        ? scrolled ? 'text-rmc-green' : 'text-white'
        : scrolled
          ? 'text-gray-600 hover:text-rmc-green'
          : 'text-white/80 hover:text-white'
    } ${
      scrolled
        ? 'focus-visible:ring-rmc-green focus-visible:ring-offset-white'
        : 'focus-visible:ring-white focus-visible:ring-offset-transparent'
    }`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-200/70'
          : 'bg-transparent'
      }`}
    >
      {/* Scroll progress bar */}
      <div
        className="absolute top-0 left-0 h-[1.5px] bg-gradient-to-r from-rmc-gold to-rmc-green transition-all duration-150 ease-out z-50 shadow-sm shadow-rmc-gold/30"
        style={{ width: `${progress}%` }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">

          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2.5 group shrink-0">
            <LogoBadge scrolled={scrolled} />
            <div className={`hidden sm:flex items-center gap-2.5 transition-colors duration-200 ${scrolled ? 'text-rmc-green' : 'text-white'}`}>
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
                  className={`absolute bottom-1 left-3 right-3 h-0.5 rounded-full transition-transform duration-200 origin-center ${
                    scrolled ? 'bg-rmc-green' : 'bg-rmc-gold'
                  } ${
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
                    className={`text-sm font-medium px-3 py-2 rounded-lg transition-all ${
                      scrolled
                        ? 'text-gray-600 hover:text-rmc-green hover:bg-rmc-green-light'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      scrolled
                        ? 'border-gray-200 bg-white hover:border-rmc-green/40 hover:bg-rmc-green-light focus-visible:ring-rmc-green focus-visible:ring-offset-white'
                        : 'border-white/25 bg-white/10 hover:bg-white/20 hover:border-white/50 focus-visible:ring-white focus-visible:ring-offset-transparent'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-rmc-green flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <span className={`text-sm font-medium max-w-[80px] truncate ${scrolled ? 'text-gray-800' : 'text-white'}`}>
                      {user.firstName}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${userMenuOpen ? 'rotate-180' : ''} ${scrolled ? 'text-gray-400' : 'text-white/60'}`} />
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
                  className={`text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    scrolled
                      ? 'text-gray-600 hover:text-rmc-green hover:bg-rmc-green-light focus-visible:ring-rmc-green focus-visible:ring-offset-white'
                      : 'text-white/80 hover:text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-transparent'
                  }`}
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  className="bg-rmc-green text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-rmc-green-dark transition-all duration-300 shadow-lg shadow-rmc-green/30 hover:shadow-rmc-green/50 motion-safe:hover:scale-105 motion-safe:active:scale-100 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {t('register')}
                </Link>
              </div>
            )}

            <LanguageSwitcher scrolled={scrolled} />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden flex items-center justify-center w-11 h-11 -mr-1.5 rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                scrolled
                  ? 'text-gray-600 hover:bg-gray-100 focus-visible:ring-rmc-green focus-visible:ring-offset-white'
                  : 'text-white hover:bg-white/15 focus-visible:ring-white focus-visible:ring-offset-transparent'
              }`}
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

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          {/* Backdrop — tap to dismiss */}
          <div
            className="md:hidden fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-menu"
            className="md:hidden relative z-50 bg-white border-t border-gray-100 shadow-xl rounded-b-2xl animate-slide-down max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain"
          >
          <div className="px-4 pt-3 pb-2 space-y-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? 'text-rmc-green bg-rmc-green-light'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-rmc-green'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
            {isAuthenticated && user ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 mb-2">
                  <div className="w-9 h-9 rounded-full bg-rmc-green flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                  </div>
                </div>
                <Link href={`/${locale}/profile`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  <User className="w-4 h-4 text-gray-400" /> {t('profile')}
                </Link>
                <Link href={`/${locale}/member/dashboard`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  <LayoutDashboard className="w-4 h-4 text-gray-400" /> {t('dashboard')}
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> {t('logout')}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-3 border border-rmc-green/30 text-rmc-green rounded-xl text-sm font-semibold hover:bg-rmc-green-light hover:border-rmc-green/50 transition-colors"
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-3 bg-rmc-green text-white rounded-xl text-sm font-semibold hover:bg-rmc-green-dark transition-colors"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </nav>
  );
}
