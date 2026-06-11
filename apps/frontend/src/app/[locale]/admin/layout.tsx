'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';

const STORAGE_KEY = 'rmc_admin_sidebar_collapsed';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Desktop: collapsed icon-rail vs full sidebar
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: off-canvas drawer open/closed
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setCollapsed(saved === 'true');
    setMounted(true);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close mobile drawer on lg+ resize
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleDesktop = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const expandDesktop = useCallback(() => {
    setCollapsed(false);
    localStorage.setItem(STORAGE_KEY, 'false');
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="w-7 h-7 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-latin">

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <AdminSidebar
        collapsed={collapsed}
        onToggle={toggleDesktop}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ── Main content ── */}
      {/*
        Mobile  : no left margin (sidebar is overlay)
        lg collapsed : ml-16
        lg expanded  : ml-60
      */}
      <div
        className={`
          flex flex-col flex-1 min-w-0 transition-[margin] duration-200 ease-in-out
          ml-0
          ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}
        `}
      >
        <AdminTopBar
          onExpandSidebar={expandDesktop}
          sidebarCollapsed={collapsed}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
