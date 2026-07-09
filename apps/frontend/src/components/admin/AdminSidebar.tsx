'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { useInboxUnread } from '@/contexts/InboxUnreadContext';
import {
  LayoutDashboard, Users, Shield, UserCheck, Landmark,
  Clock, BarChart2, Settings, ChevronLeft, ChevronRight,
  LogOut, BookOpen, X, Heart, Wallet, Inbox, GraduationCap, Mail, HardDrive,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  key: string;
  href: string;
  icon: React.ElementType;
  labelKey: string;
  permission?: Permission;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', href: '/admin',             icon: LayoutDashboard, labelKey: 'sidebar.dashboard', group: 'main'    },
  { key: 'members',   href: '/admin/members',      icon: UserCheck,       labelKey: 'sidebar.members',   group: 'main',   permission: Permission.MEMBERS_VIEW      },
  { key: 'marriage',  href: '/admin/marriage',     icon: Heart,           labelKey: 'sidebar.marriage',  group: 'main',   permission: Permission.MARRIAGE_VIEW     },
  { key: 'goodConduct', href: '/admin/good-conduct', icon: ShieldCheck,   labelKey: 'sidebar.goodConduct', group: 'main', permission: Permission.GOOD_CONDUCT_VIEW },
  { key: 'mosques',   href: '/admin/mosques',      icon: Landmark,        labelKey: 'sidebar.mosques',   group: 'main',   permission: Permission.MOSQUES_VIEW      },
  { key: 'schools',   href: '/admin/schools',      icon: GraduationCap,   labelKey: 'sidebar.schools',   group: 'main',   permission: Permission.SCHOOLS_VIEW      },
  { key: 'prayer',    href: '/admin/prayer-times', icon: Clock,           labelKey: 'sidebar.prayer',    group: 'main',   permission: Permission.PRAYER_TIMES_VIEW },
  { key: 'finance',   href: '/admin/donations',    icon: Wallet,          labelKey: 'sidebar.finance',   group: 'main',   permission: Permission.DONATIONS_VIEW    },
  { key: 'inbox',     href: '/admin/inbox',        icon: Inbox,           labelKey: 'sidebar.inbox',     group: 'content', permission: Permission.CONTACT_MESSAGES_VIEW },
  { key: 'drive',     href: '/admin/drive',        icon: HardDrive,       labelKey: 'sidebar.drive',     group: 'content', permission: Permission.DRIVE_ADMIN       },
  { key: 'content',   href: '/admin/content',      icon: BookOpen,        labelKey: 'sidebar.content',   group: 'content', permission: Permission.CONTENT_VIEW      },
  { key: 'subscribers', href: '/admin/subscribers', icon: Mail,           labelKey: 'sidebar.subscribers', group: 'content', permission: Permission.SUBSCRIBERS_VIEW },
  { key: 'users',     href: '/admin/users',        icon: Users,           labelKey: 'sidebar.users',     group: 'system', permission: Permission.USERS_VIEW        },
  { key: 'roles',     href: '/admin/roles',        icon: Shield,          labelKey: 'sidebar.roles',     group: 'system', permission: Permission.ROLES_VIEW        },
  { key: 'reports',   href: '/admin/reports',      icon: BarChart2,       labelKey: 'sidebar.reports',   group: 'system', permission: Permission.REPORTS_VIEW      },
  { key: 'settings',  href: '/admin/settings',     icon: Settings,        labelKey: 'sidebar.settings',  group: 'system', permission: Permission.SYSTEM_SETTINGS   },
];

const GROUPS = [
  { key: 'main',    labelKey: 'sidebar.group.main'    },
  { key: 'content', labelKey: 'sidebar.group.content' },
  { key: 'system',  labelKey: 'sidebar.group.system'  },
];

// Collapsed sidebar width in px (lg:w-16 = 4rem)
const COLLAPSED_W = 64;

interface SidebarNavItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  locale: string;
  label: string;
  badge?: number;
  onMobileClose: () => void;
}

function SidebarNavItem({ item, active, collapsed, locale, label, badge = 0, onMobileClose }: SidebarNavItemProps) {
  const [tooltipY, setTooltipY] = useState<number | null>(null);
  const Icon = item.icon;
  const badgeText = badge > 99 ? '99+' : String(badge);

  return (
    <li className={collapsed ? 'lg:flex lg:justify-center' : ''}>
      <Link
        href={`/${locale}${item.href}`}
        onClick={onMobileClose}
        onMouseEnter={(e) => {
          if (collapsed) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipY(rect.top + rect.height / 2);
          }
        }}
        onMouseLeave={() => setTooltipY(null)}
        className={`
          group relative flex items-center rounded-md transition-all duration-150
          h-10 px-2 gap-3
          ${collapsed ? 'lg:h-9 lg:w-9 lg:justify-center lg:px-0 lg:gap-0' : 'lg:h-9 lg:gap-2.5'}
          ${active
            ? 'bg-rmc-green/8 text-rmc-green'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        {active && (
          <span className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-rmc-green ${
            collapsed ? 'lg:hidden' : ''
          }`} />
        )}

        <Icon className={`shrink-0 ${
          collapsed ? 'lg:w-[18px] lg:h-[18px] w-4 h-4' : 'w-4 h-4'
        } ${active ? 'text-rmc-green' : ''}`} />

        <span className={`text-[13px] font-medium truncate ${
          collapsed ? 'lg:hidden' : ''
        } ${active ? 'text-rmc-green font-semibold' : ''}`}>
          {label}
        </span>

        {/* Unread badge — inline pill when expanded */}
        {badge > 0 && (
          <span className={`ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none ${
            collapsed ? 'lg:hidden' : ''
          }`}>
            {badgeText}
          </span>
        )}

        {/* Unread badge — dot on the icon when collapsed (lg only) */}
        {badge > 0 && collapsed && (
          <span className="hidden lg:flex absolute top-0.5 right-0.5 items-center justify-center min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold leading-none ring-2 ring-white">
            {badgeText}
          </span>
        )}
      </Link>

      {/* Tooltip rendered via portal — escapes all overflow constraints */}
      {collapsed && tooltipY !== null && createPortal(
        <span
          style={{ top: tooltipY, left: COLLAPSED_W + 6 }}
          className="fixed z-[99999] -translate-y-1/2 px-2.5 py-1.5 text-[11px] font-semibold bg-gray-900 text-white rounded-lg whitespace-nowrap shadow-xl pointer-events-none hidden lg:block"
        >
          {label}
        </span>,
        document.body,
      )}
    </li>
  );
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AdminSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const t = useTranslations('admin');
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const { unread: unreadCount } = useInboxUnread();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isActive = (href: string) => {
    const full = `/${locale}${href}`;
    return href === '/admin' ? pathname === full : pathname.startsWith(full);
  };

  const canSee = (item: NavItem) => !item.permission || hasPermission(item.permission);

  const handleLogout = async () => {
    await logout();
    window.location.href = `/${locale}/login`;
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-100
        transition-transform duration-200 ease-in-out
        w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 ${collapsed ? 'lg:w-16' : 'lg:w-60'}
      `}
    >
      {/* Brand / header */}
      <div className={`flex items-center h-14 px-4 border-b border-gray-100 shrink-0 ${
        collapsed ? 'lg:justify-center' : 'justify-between gap-2.5'
      }`}>
        <Link href={`/${locale}/admin`} className="flex items-center gap-2.5 min-w-0" onClick={onMobileClose}>
          <div className="w-7 h-7 rounded-lg bg-rmc-green flex items-center justify-center shrink-0">
            <Image src="/logo.webp" alt="RMC" width={20} height={20} className="object-contain" />
          </div>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-[13px] font-bold text-gray-900 leading-none truncate">RMC Admin</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5 uppercase tracking-wide truncate">
              {t('sidebar.panel')}
            </p>
          </div>
        </Link>

        <button
          onClick={onToggle}
          className={`hidden lg:flex w-6 h-6 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ${
            collapsed ? 'lg:hidden' : ''
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onMobileClose}
          className="lg:hidden ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation — overflow-x-hidden is safe now because tooltips use portals */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group.key && canSee(i));
          if (!items.length) return null;
          return (
            <div key={group.key} className={`mb-4 ${collapsed ? 'lg:px-2 px-3' : 'px-3'}`}>
              <p className={`text-[10px] font-semibold tracking-widest uppercase text-gray-400 px-2 mb-1 ${
                collapsed ? 'lg:hidden' : ''
              }`}>
                {t(group.labelKey)}
              </p>

              <ul className="space-y-px">
                {items.map((item) => (
                  mounted ? (
                    <SidebarNavItem
                      key={item.key}
                      item={item}
                      active={isActive(item.href)}
                      collapsed={collapsed}
                      locale={locale}
                      label={t(item.labelKey)}
                      badge={item.key === 'inbox' ? unreadCount : 0}
                      onMobileClose={onMobileClose}
                    />
                  ) : (
                    // SSR placeholder — no tooltip, no portal
                    <li key={item.key}>
                      <Link
                        href={`/${locale}${item.href}`}
                        className={`
                          relative flex items-center rounded-md transition-all duration-150
                          h-10 px-2 gap-3
                          ${collapsed ? 'lg:h-9 lg:w-9 lg:justify-center lg:px-0 lg:gap-0' : 'lg:h-9 lg:gap-2.5'}
                          ${isActive(item.href) ? 'bg-rmc-green/8 text-rmc-green' : 'text-gray-500'}
                        `}
                      >
                        <item.icon className={`shrink-0 w-4 h-4 ${isActive(item.href) ? 'text-rmc-green' : ''}`} />
                        <span className={`text-[13px] font-medium truncate ${collapsed ? 'lg:hidden' : ''}`}>
                          {t(item.labelKey)}
                        </span>
                      </Link>
                    </li>
                  )
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gray-100 py-3 shrink-0 ${
        collapsed ? 'lg:px-2 lg:flex lg:justify-center px-3' : 'px-3'
      }`}>
        {collapsed && mounted && (
          <ExpandButton onToggle={onToggle} />
        )}

        <div className={`space-y-px ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
            <div className="w-7 h-7 rounded-full bg-rmc-green flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-gray-900 truncate leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-gray-400 truncate capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-[13px] text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {t('sidebar.logout')}
          </button>
        </div>
      </div>
    </aside>
  );
}

function ExpandButton({ onToggle }: { onToggle: () => void }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipY, setTooltipY] = useState(0);

  return (
    <>
      <button
        onClick={onToggle}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipY(rect.top + rect.height / 2);
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
        className="hidden lg:flex w-9 h-9 items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {showTooltip && createPortal(
        <span
          style={{ top: tooltipY, left: COLLAPSED_W + 6 }}
          className="fixed z-[99999] -translate-y-1/2 px-2.5 py-1.5 text-[11px] font-semibold bg-gray-900 text-white rounded-lg whitespace-nowrap shadow-xl pointer-events-none hidden lg:block"
        >
          Expand
        </span>,
        document.body,
      )}
    </>
  );
}
