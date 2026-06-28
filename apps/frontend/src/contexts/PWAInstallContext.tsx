'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallContextValue {
  isReady: boolean;       // beforeinstallprompt captured and ready to fire
  isInstalled: boolean;
  isIOS: boolean;
  isMobile: boolean;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))
  );
}

function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPod|iPad/.test(navigator.userAgent) || window.innerWidth < 1024;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS] = useState(() => (typeof window !== 'undefined' ? detectIOS() : false));
  const [isMobile] = useState(() => (typeof window !== 'undefined' ? detectMobile() : false));

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setIsInstalled(true);
    return outcome;
  }, [deferredPrompt]);

  return (
    <PWAInstallContext.Provider
      value={{
        isReady: !!deferredPrompt,
        isInstalled,
        isIOS,
        isMobile,
        triggerInstall,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall() {
  const ctx = useContext(PWAInstallContext);
  if (!ctx) throw new Error('usePWAInstall must be used inside PWAInstallProvider');
  return ctx;
}
