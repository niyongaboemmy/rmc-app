'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Bell, Search, ChevronRight, Home, X, PanelLeft, Menu, ExternalLink, User, LogOut, Settings } from 'lucide-react';

/* ── Breadcrumbs ── */
function useBreadcrumbs(locale: string, t: ReturnType<typeof useTranslations>) {
  const pathname = usePathname();
  const stripped = pathname.replace(`/${locale}`, '').replace(/^\//, '');
  const parts = stripped.split('/').filter(Boolean);

  const MAP: Record<string, string> = {
    admin:          t('sidebar.dashboard'),
    members:        t('sidebar.members'),
    users:          t('sidebar.users'),
    roles:          t('sidebar.roles'),
    mosques:        t('sidebar.mosques'),
    'prayer-times': t('sidebar.prayer'),
    content:        t('sidebar.content'),
    reports:        t('sidebar.reports'),
    settings:       t('sidebar.settings'),
  };

  const crumbs: { label: string; href?: string }[] = [];
  let path = `/${locale}`;
  for (const part of parts) {
    path += `/${part}`;
    crumbs.push({ label: MAP[part] ?? part, href: path });
  }
  if (crumbs.length > 1) {
    crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label };
  }
  return crumbs;
}

/* ── Notifications ── */
interface Notif { id: number; title: string; time: string; read: boolean }
const INIT_NOTIFS: Notif[] = [
  { id: 1, title: '3 applications pending review',         time: '2m ago',  read: false },
  { id: 2, title: 'Amina Uwase joined as Standard member', time: '18m ago', read: false },
  { id: 3, title: 'System migration completed',            time: '1h ago',  read: true  },
];

interface Props {
  onExpandSidebar: () => void;
  sidebarCollapsed: boolean;
  onMobileMenuOpen: () => void;
}

export function AdminTopBar({ onExpandSidebar, sidebarCollapsed, onMobileMenuOpen }: Props) {
  const t = useTranslations('admin');
  const { locale } = useParams<{ locale: string }>();
  const router     = useRouter();
  const { user, logout } = useAuth();
  const crumbs = useBreadcrumbs(locale, t);

  const [searchOpen, setSearchOpen]   = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifs, setNotifs]           = useState(INIT_NOTIFS);

  const notifRef   = useRef<HTMLDivElement>(null);
  const userRef    = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);
  const unread     = notifs.filter((n) => !n.read).length;

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    router.push(`/${locale}/login`);
  };

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 sm:px-4 gap-2 sticky top-0 z-30 shrink-0">

      {/* ── Mobile hamburger (< lg) ── */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Desktop expand-rail button (hidden on mobile) ── */}
      {sidebarCollapsed && (
        <button
          onClick={onExpandSidebar}
          className="hidden lg:flex p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}

      {/* ── Breadcrumbs — hide on xs to save space ── */}
      <nav className="hidden sm:flex items-center gap-0.5 text-[13px] flex-1 min-w-0">
        <Link href={`/${locale}/admin`} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1">
          <Home className="w-3.5 h-3.5" />
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-0.5 min-w-0">
            <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
            {c.href ? (
              <Link href={c.href} className="text-gray-400 hover:text-gray-700 px-1 py-0.5 rounded truncate transition-colors max-w-[120px] sm:max-w-none">
                {c.label}
              </Link>
            ) : (
              <span className="text-gray-800 font-medium px-1 py-0.5 truncate max-w-[140px] sm:max-w-none">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* On xs screens, push actions to right with flex-1 spacer */}
      <div className="flex-1 sm:hidden" />

      {/* ── Right actions ── */}
      <div className="flex items-center gap-0.5 shrink-0">

        {/* Back to website */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-gray-500 hover:text-rmc-green hover:bg-rmc-green/[0.06] transition-colors"
          title={t('topbar.viewSite')}
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">{t('topbar.viewSite')}</span>
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />

        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white animate-fade-in w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder={t('topbar.search')}
              className="text-[13px] text-gray-700 placeholder-gray-400 outline-none flex-1 min-w-0 bg-transparent"
              onBlur={() => setSearchOpen(false)}
            />
            <button onClick={() => setSearchOpen(false)}>
              <X className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-[min(288px,calc(100vw-1.5rem))] bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-slide-down">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                <span className="text-[13px] font-semibold text-gray-900">Notifications</span>
                {unread > 0 && (
                  <button
                    onClick={() => setNotifs((p) => p.map((n) => ({ ...n, read: true })))}
                    className="text-[11px] text-rmc-green font-medium hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <ul>
                {notifs.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => setNotifs((p) => p.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-rmc-green/[0.03]' : ''}`}
                  >
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-rmc-green'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] leading-snug ${n.read ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>{n.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Language switcher */}
        <LanguageSwitcher scrolled />

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />

        {/* User pill + dropdown */}
        <div className="relative hidden sm:block" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            {user?.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profilePhotoUrl}
                alt=""
                className="w-7 h-7 rounded-full object-cover shrink-0 ring-2 ring-rmc-green/20"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-rmc-green flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
            <div className="hidden md:block leading-none text-left">
              <p className="text-[12px] font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
            </div>
            <ChevronRight className={`hidden md:block w-3 h-3 text-gray-400 transition-transform duration-150 ${userMenuOpen ? 'rotate-90' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-slide-down">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
              </div>
              {/* Menu items */}
              <div className="py-1">
                <Link
                  href={`/${locale}/profile`}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-rmc-green transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  My Profile
                </Link>
                <Link
                  href={`/${locale}/admin/settings`}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-rmc-green transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Settings
                </Link>
              </div>
              <div className="border-t border-gray-50 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
