'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { VERSES } from '@/data/verses';
import { useAuth } from '@/contexts/AuthContext';
import { usePageEdit } from '@/contexts/PageEditContext';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permission } from '@/lib/permissions';
import Image from 'next/image';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import {
  Menu, X, ChevronDown, User, LayoutDashboard,
  Lock, Users, Shield, LogOut, Heart, Pencil,
  Compass, GraduationCap, Library, MessagesSquare,
  LayoutGrid, Moon, FileText, Briefcase,
  type LucideIcon,
} from 'lucide-react';

function LogoBadge() {
  /* Frosted glass pill — sits over the dark / translucent navbar in every state */
  return (
    <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center overflow-hidden transition-all duration-300 motion-safe:group-hover:scale-105">
      <Image
        src="/logo.webp"
        alt="RMC Logo"
        width={80}
        height={80}
        className="w-full h-full object-contain drop-shadow-sm"
      />
    </div>
  );
}

interface NavbarProps {
  /**
   * Render the dark bar from the very top instead of only once scrolled.
   *
   * The bar's text is ALWAYS white, because it normally floats transparent over
   * a dark PageHero. A page with no dark hero (e.g. the course detail page, which
   * opens straight onto white) would therefore paint white links on white and the
   * nav would vanish. Such a page passes `solid` to opt out of transparency.
   */
  solid?: boolean;
}

/** A leaf link, or a parent that opens a dropdown of `children`. */
interface NavChild {
  href: string;
  Icon: LucideIcon;
  label: string;
  desc: string;
}
interface NavLinkItem {
  href: string;
  label: string;
  mobileOnly?: boolean;
  children?: NavChild[];
  /** Lay the dropdown out two-up. For long lists — a single column of 8 runs off
   *  the bottom of a short laptop screen. Mobile is always one column. */
  columns?: 1 | 2;
}

export function Navbar({ solid = false }: NavbarProps = {}) {
  const t = useTranslations('nav');
  // The dropdown's child labels already exist under the `dawah` namespace —
  // reused rather than re-translated, so the menu and the pages it points at can
  // never drift apart.
  const td = useTranslations('dawah');
  // Same trick for Services: reuse the service pages' own strings.
  const ts = useTranslations('services');
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  // The Bismillah + verse ticker belong to the Home page only. usePathname()
  // includes the locale prefix, so Home is "/", "/en", "/en/", etc.
  const isHome = pathname === '/' || pathname === `/${locale}` || pathname === `/${locale}/`;
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  // Present only on pages that expose inline editing (e.g. Contact) — null elsewhere.
  const pageEdit = usePageEdit();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // WHICH dropdown is open, keyed by the parent's href — not a boolean. There is
  // more than one dropdown now (Services, Dawah); a boolean would open them in
  // lockstep, and one shared ref would only ever bind to whichever rendered last.
  // A single key also gives mutual exclusion for free: opening one closes the other.
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
      // Close the dropdown only when the click missed EVERY menu — otherwise
      // clicking inside one menu would close it via another menu's check.
      const insideAMenu = Object.values(menuRefs.current).some(
        (el) => el && el.contains(e.target as Node),
      );
      if (!insideAMenu) setOpenMenu(null);
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
        setOpenMenu(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* No "close on pathname change" effect here, deliberately. Each menu item
     closes the panel in its own onClick, so such an effect would be redundant —
     and it raced: it lands a tick AFTER the route commits, so a cursor that
     reaches the trigger in that window gets the panel opened by pointerenter and
     then shut again by the effect. Since pointerenter will not re-fire for a
     stationary cursor, the menu stays stuck shut until the user jiggles the
     mouse. Open state follows the cursor; the route does not get a vote. */

  /* Lock body scroll while the mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navLinks: NavLinkItem[] = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/about`, label: t('about') },
    {
      href: `/${locale}/services`,
      label: t('services'),
      columns: 2,
      // Titles/descriptions come from the `services` namespace the service pages
      // themselves use — already translated in all three locales, so the menu adds
      // no translation debt and cannot drift from the pages it points at.
      //
      // The hrefs mirror src/app/[locale]/services/page.tsx, which is the
      // authoritative list: note `conduct` lives at /services/good-conduct and
      // `tender` at /tenders, NOT at /services/{slug}. The footer's service links
      // disagree with both — see the report.
      children: [
        { href: `/${locale}/services`, Icon: LayoutGrid, label: t('servicesMenu.overview'), desc: t('servicesMenu.overviewDesc') },
        { href: `/${locale}/services/marriage`, Icon: Heart, label: ts('marriage.title'), desc: ts('marriage.desc') },
        { href: `/${locale}/services/funeral`, Icon: Moon, label: ts('funeral.title'), desc: ts('funeral.desc') },
        { href: `/${locale}/services/good-conduct`, Icon: Shield, label: ts('conduct.title'), desc: ts('conduct.desc') },
        { href: `/${locale}/services/scholarship`, Icon: GraduationCap, label: ts('scholarship.title'), desc: ts('scholarship.desc') },
        { href: `/${locale}/services/hajj`, Icon: Compass, label: ts('hajj.title'), desc: ts('hajj.desc') },
        { href: `/${locale}/tenders`, Icon: FileText, label: ts('tender.title'), desc: ts('tender.desc') },
        { href: `/${locale}/services/jobs`, Icon: Briefcase, label: ts('jobs.title'), desc: ts('jobs.desc') },
      ],
    },
    {
      href: `/${locale}/dawah`,
      label: t('dawah'),
      children: [
        // Overview first: the parent is a dropdown trigger, not a link, so this
        // is the only way to reach the Dawah landing page from the navbar.
        { href: `/${locale}/dawah`, Icon: Compass, label: t('dawahMenu.overview'), desc: t('dawahMenu.overviewDesc') },
        { href: `/${locale}/dawah/courses`, Icon: GraduationCap, label: td('courses.title'), desc: td('courses.subtitle') },
        { href: `/${locale}/dawah/library`, Icon: Library, label: td('library.title'), desc: td('library.subtitle') },
        // Fourth item. Stays ONE column — `columns: 2` kicks in at 8 (Services), where a
        // single column would run off a short laptop screen. Four does not.
        { href: `/${locale}/dawah/discussions`, Icon: MessagesSquare, label: td('discussions.nav'), desc: td('discussions.navDesc') },
      ],
    },
    { href: `/${locale}/projects`, label: t('projects') },
    { href: `/${locale}/blog`, label: t('blog'), mobileOnly: true },
    { href: `/${locale}/gallery`, label: t('gallery') },
    { href: `/${locale}/contact`, label: t('contact') },
  ];

  const isActive = (href: string) => pathname === href;

  /**
   * A parent is active for its whole subtree — /dawah/courses/foo must still
   * light up "Dawah". Exact-match `isActive` stays for leaves and for the
   * children inside the dropdown.
   */
  const isSectionActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await logout();
    router.push(`/${locale}/login`);
  };

  /* Navbar text is always light — the bar is transparent over the dark hero and
     dark-glass once scrolled, so white reads cleanly in every state. */
  const linkClass = (active: boolean) =>
    `relative px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-transparent ${
      active ? 'text-white' : 'text-white/80 hover:text-white'
    }`;

  /* Dark bar once the user scrolls, or whenever the full-screen mobile menu is open */
  const barSolid = solid || scrolled || mobileOpen;

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

      {/* ── Bismillah — Home page only; shows at the very top and collapses away once scrolled. ── */}
      {isHome && (
      <div
        aria-hidden={scrolled}
        className={`relative z-10 overflow-hidden transition-all duration-300 ${
          scrolled ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-12 opacity-100'
        }`}
      >
        <p className="text-center font-arabic text-xs leading-none py-1 tracking-wide text-rmc-gold-light/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" dir="rtl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
      </div>
      )}

      {/* ── Verse of the day — Home page only; slim right-to-left ticker below the Bismillah,
            staying visible while scrolling, collapsing only while the mobile menu is open. ── */}
      {isHome && (
      <div
        aria-hidden={mobileOpen}
        className={`relative z-10 overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-10 opacity-100'
        }`}
      >
        <div className="relative overflow-hidden border-y border-white/10 bg-rmc-green-deep/90 backdrop-blur-sm">
          <div className="flex w-max animate-marquee py-1.5" style={{ animationDuration: '110s' }}>
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center shrink-0" aria-hidden={dup === 1}>
                {VERSES.map((v, i) => (
                  <span key={i} className="flex items-center gap-2.5 px-10 whitespace-nowrap text-xs">
                    <span className="font-arabic text-white" dir="rtl">
                      {v.ar}
                    </span>
                    <span className="text-white/25">—</span>
                    <span className="text-white/65 italic">&ldquo;{v.en}&rdquo;</span>
                    <span className="text-rmc-gold text-[10px] font-semibold tracking-wide">{v.ref}</span>
                    <span className="text-rmc-gold/40 pl-5" aria-hidden="true">
                      ◆
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-14 md:h-16">

          {/* ── Left — menu ── */}
          <div className="flex items-center">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-11 h-11 -ml-2 rounded-lg transition-all duration-200 outline-none text-white hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-transparent"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.filter((l) => !l.mobileOnly).map((link) => (
                link.children ? (
                  // Hover opens the menu, but ONLY for a real mouse. `pointerenter`
                  // also fires on a tap, so an unguarded hover handler would open
                  // the menu and let the follow-up click immediately toggle it shut
                  // — the classic "dropdown does nothing on touch" bug. Touch and
                  // keyboard both go through the button's onClick instead.
                  <div
                    key={link.href}
                    className="relative"
                    ref={(el) => { menuRefs.current[link.href] = el; }}
                    onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpenMenu(link.href); }}
                    onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpenMenu((k) => (k === link.href ? null : k)); }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMenu((k) => (k === link.href ? null : link.href))}
                      aria-expanded={openMenu === link.href}
                      aria-haspopup="menu"
                      className={`${linkClass(isSectionActive(link.href))} inline-flex items-center gap-1`}
                    >
                      {link.label}
                      <ChevronDown
                        aria-hidden
                        className={`h-3 w-3 shrink-0 opacity-60 transition-all duration-200 group-hover:opacity-100 ${
                          openMenu === link.href ? 'rotate-180 opacity-100' : ''
                        }`}
                      />
                      <span
                        className={`absolute bottom-1 left-2.5 right-2.5 h-px rounded-full bg-rmc-gold transition-transform duration-200 origin-center ${
                          isSectionActive(link.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                      />
                    </button>

                    {openMenu === link.href && (
                      // Two elements on purpose. The OUTER one starts flush at
                      // `top-full` and carries the 8px offset as PADDING, not a
                      // margin — that padding is a hover bridge. With a margin the
                      // gap belongs to no element, so travelling from the trigger
                      // to the menu leaves the wrapper, fires pointerleave, and
                      // the menu shuts under the cursor before it arrives.
                      //
                      // `start-0` not `left-0`: the panel hangs off the leading
                      // edge of its trigger, which flips under RTL.
                      <div className="absolute start-0 top-full pt-2 z-50">
                        {/* Exactly the bar's own solid layer: bg-rmc-green-deep/90 +
                            backdrop-blur-xl. The /90 is not a readability risk —
                            the 24px backdrop blur averages whatever is behind into
                            a flat wash first, so even a hard white/black split
                            under the panel moves it by ~4/255. Keep the blur if you
                            touch the alpha; the two go together.

                            Every border and fill below is mixed from rmc-green
                            (#1A7A4A) over rmc-green-deep (#0D3D24) — the same hue
                            family as the surface. A white-alpha wash would have
                            desaturated toward grey and read as a foreign panel
                            dropped on the navbar. */}
                        <div
                          role="menu"
                          className={`rounded-lg border border-rmc-green/30 bg-rmc-green-deep/90 p-1.5 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.65)] backdrop-blur-xl animate-slide-down ${
                            link.columns === 2 ? 'w-[34rem]' : 'w-72'
                          }`}
                        >
                          <div className={`grid gap-1.5 ${link.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {link.children.map(({ href, Icon, label, desc }) => (
                              <Link
                                key={href}
                                href={href}
                                role="menuitem"
                                onClick={() => setOpenMenu(null)}
                                aria-current={isActive(href) ? 'page' : undefined}
                                // Text block then icon, in a `justify-between` row:
                                // flex-direction follows the writing direction, so
                                // the icon sits at the trailing edge — right in
                                // English, and it mirrors to the left in Arabic
                                // without a second rule.
                                className={`group/item flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 outline-none transition-colors duration-200 ${
                                  isActive(href)
                                    ? 'border-rmc-gold/40 bg-rmc-gold/[0.08]'
                                    : 'border-rmc-green/25 bg-rmc-green/[0.12] hover:border-rmc-green/60 hover:bg-rmc-green/25 focus-visible:border-rmc-green/60 focus-visible:bg-rmc-green/25'
                                }`}
                              >
                                <span className="min-w-0">
                                  <span
                                    className={`block truncate text-[13px] font-semibold transition-colors ${
                                      isActive(href) ? 'text-rmc-gold-light' : 'text-white/90 group-hover/item:text-white'
                                    }`}
                                  >
                                    {label}
                                  </span>
                                  {/* Secondary line. line-clamp-2 because these
                                      strings are the pages' own subtitles — reused
                                      rather than re-translated, so they run long. */}
                                  <span className="mt-0.5 text-[11px] leading-snug text-white/45 line-clamp-2">
                                    {desc}
                                  </span>
                                </span>
                                <Icon
                                  aria-hidden
                                  className={`h-4 w-4 shrink-0 transition-colors ${
                                    isActive(href)
                                      ? 'text-rmc-gold-light'
                                      : 'text-white/35 group-hover/item:text-rmc-gold-light'
                                  }`}
                                />
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={linkClass(isActive(link.href))}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                    <span
                      className={`absolute bottom-1 left-2.5 right-2.5 h-px rounded-full bg-rmc-gold transition-transform duration-200 origin-center ${
                        isActive(link.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                    />
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* ── Center — logo ── */}
          <Link
            href={`/${locale}`}
            aria-label="Rwanda Muslim Community — home"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group"
          >
            <LogoBadge />
          </Link>

          {/* ── Right — Donate + Sign in + Language ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Donate */}
            <Link
              href={`/${locale}/donate`}
              className="hidden sm:inline-flex items-center gap-1.5 bg-rmc-green text-white px-3.5 py-1.5 rounded-lg text-[13px] font-semibold shadow-sm shadow-rmc-green/20 hover:bg-rmc-green-dark transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <Heart className="w-3.5 h-3.5 shrink-0" />
              {t('donate')}
            </Link>

            {/* Inline "Edit" — only where the page offers it (Contact) and the user may edit. */}
            {pageEdit?.canEdit && !pageEdit.editing && (
              <button
                type="button"
                onClick={pageEdit.startEdit}
                className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 hover:border-white/50 transition-all duration-200 text-white/80 hover:text-white"
              >
                <Pencil className="w-3.5 h-3.5 shrink-0" />
                Edit
              </button>
            )}

            {isAuthenticated && user ? (
              <div className="hidden lg:flex items-center gap-2">
                <PermissionGate anyOf={[Permission.USERS_VIEW, Permission.ROLES_VIEW, Permission.MEMBERS_VIEW]}>
                  <Link
                    href={`/${locale}/admin/members`}
                    className="text-[13px] font-medium px-3 py-1.5 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 hover:border-white/50 transition-all duration-200 text-white/80 hover:text-white"
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
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border-white/25 bg-white/10 hover:bg-white/20 hover:border-white/50 focus-visible:ring-white focus-visible:ring-offset-transparent"
                  >
                    <div className="w-5 h-5 rounded-full bg-rmc-green flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <span className="text-[13px] font-medium max-w-[72px] truncate text-white">
                      {user.firstName}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 shrink-0 text-white/60 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute end-0 mt-2 w-56 bg-white rounded-lg shadow-2xl border border-gray-100 py-2 z-50 animate-slide-down">
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
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg border border-white/30 text-white text-[13px] font-medium hover:bg-white/10 hover:border-white/50 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-transparent"
              >
                {t('login')}
              </Link>
            )}

            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Mobile menu — full-height dark panel covering the whole screen below the bar */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden fixed inset-x-0 top-[76px] bottom-0 z-40 bg-rmc-green-deep overflow-y-auto overscroll-contain animate-fade-in"
        >
          <div aria-hidden className="absolute inset-0 pattern-islamic opacity-20 pointer-events-none" />
          <div aria-hidden className="absolute top-0 right-0 w-72 h-72 bg-rmc-green/20 rounded-full blur-[90px] pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 left-0 w-72 h-72 bg-rmc-gold/5 rounded-full blur-[90px] pointer-events-none" />
          <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />

          <div className="relative flex flex-col min-h-full px-5 pt-6 pb-8">
            <div className="space-y-1.5">
              {navLinks.map((link) => (
                link.children ? (
                  // No flyout on a phone — the children expand in place, so the
                  // whole section is reachable with one thumb.
                  <div key={link.href}>
                    <button
                      type="button"
                      onClick={() => setOpenMobileMenu((k) => (k === link.href ? null : link.href))}
                      aria-expanded={openMobileMenu === link.href}
                      className={`flex w-full items-center justify-between px-4 py-3.5 rounded-2xl text-base font-semibold transition-all ${
                        isSectionActive(link.href)
                          ? 'bg-white/10 text-rmc-gold-light border border-white/10'
                          : 'text-white/85 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {link.label}
                      <ChevronDown
                        aria-hidden
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openMobileMenu === link.href ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {openMobileMenu === link.href && (
                      <div className="mt-1 space-y-1 border-s border-white/10 ms-4 ps-3">
                        {link.children.map(({ href, Icon, label }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            aria-current={isActive(href) ? 'page' : undefined}
                            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm transition-colors ${
                              isActive(href)
                                ? 'bg-white/10 text-rmc-gold-light'
                                : 'text-white/75 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {label}
                            <Icon className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
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
                )
              ))}
            </div>

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
                  <PermissionGate anyOf={[Permission.USERS_VIEW, Permission.ROLES_VIEW, Permission.MEMBERS_VIEW]}>
                    <Link href={`/${locale}/admin/members`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-white/85 hover:bg-white/10 hover:text-white transition-colors">
                      <Shield className="w-4 h-4 text-white/50" /> {t('admin')}
                    </Link>
                  </PermissionGate>
                  <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm text-red-300 hover:bg-red-500/15 transition-colors">
                    <LogOut className="w-4 h-4" /> {t('logout')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href={`/${locale}/donate`}
                    onClick={() => setMobileOpen(false)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-rmc-green text-white rounded-lg text-sm font-semibold shadow-sm shadow-rmc-green/20 hover:bg-rmc-green-dark transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5" /> {t('donate')}
                  </Link>
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-4 py-3.5 border border-white/30 text-white rounded-2xl text-sm font-semibold hover:bg-white/10 hover:border-white/50 transition-colors"
                  >
                    Sign in
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
