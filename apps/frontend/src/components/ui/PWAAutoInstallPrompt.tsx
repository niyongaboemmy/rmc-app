'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, Monitor, Tablet, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type DeviceType = 'phone' | 'tablet' | 'desktop';
type Platform = 'chrome' | 'ios' | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_auto_dismissed_at';
const DISMISS_DAYS = 7;

function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIPad =
    /iPad/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  if (isIPad) return 'tablet';
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/.test(ua) || window.innerWidth < 768) return 'phone';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  if (isIOS) return 'ios';
  return /Chrome|CriOS|OPR|Edg|SamsungBrowser/.test(ua) ? 'chrome' : 'other';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return (Date.now() - parseInt(ts)) / (1000 * 60 * 60 * 24) < DISMISS_DAYS;
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

const DEVICE_ICON = {
  phone: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

const AUTO_PROMPT_DELAY: Record<DeviceType, number> = {
  phone: 1500,
  tablet: 2000,
  desktop: 3000,
};

export function PWAAutoInstallPrompt() {
  const t = useTranslations('footer.pwa.auto');
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [platform, setPlatform] = useState<Platform>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const det = detectDevice();
    const plt = detectPlatform();
    setDevice(det);
    setPlatform(plt);

    // iOS — show instructions banner after delay (no beforeinstallprompt)
    if (plt === 'ios') {
      const timer = window.setTimeout(() => {
        if (!isStandalone() && !wasDismissedRecently()) setVisible(true);
      }, AUTO_PROMPT_DELAY[det]);
      return () => window.clearTimeout(timer);
    }

    // Chrome / Chromium-based
    if (plt === 'chrome') {
      const handler = async (e: Event) => {
        e.preventDefault();
        const bip = e as BeforeInstallPromptEvent;

        if (det === 'phone' || det === 'tablet') {
          // Auto-trigger native install dialog — no custom banner needed
          await new Promise<void>((r) => window.setTimeout(r, AUTO_PROMPT_DELAY[det]));
          if (isStandalone() || wasDismissedRecently()) return;
          await bip.prompt();
          const { outcome } = await bip.userChoice;
          if (outcome === 'accepted') setInstalled(true);
          else saveDismissed();
        } else {
          // Desktop — save prompt and show floating banner
          setDeferredPrompt(bip);
          window.setTimeout(() => {
            if (!isStandalone() && !wasDismissedRecently()) setVisible(true);
          }, AUTO_PROMPT_DELAY[det]);
        }
      };

      window.addEventListener('beforeinstallprompt', handler);
      window.addEventListener('appinstalled', () => setInstalled(true));
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    saveDismissed();
  };

  const handleInstall = async () => {
    if (platform === 'ios') {
      setShowIOSSteps(true);
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    }
    dismiss();
  };

  if (installed || !visible) return null;

  const DeviceIcon = DEVICE_ICON[device];

  // iOS bottom-sheet
  if (platform === 'ios') {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[300] p-3 sm:p-4 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rmc-green/15 border border-rmc-green/25 flex items-center justify-center">
                <DeviceIcon className="w-4 h-4 text-rmc-green-light" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t('title')}</p>
                <p className="text-[11px] text-white/40">{t('subtitleIOS')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="text-white/30 hover:text-white/60 transition-colors p-1"
              aria-label={t('dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {showIOSSteps ? (
            <ol className="space-y-2.5 text-xs text-white/60 leading-relaxed mt-3">
              <li className="flex gap-2.5">
                <span className="w-4 h-4 rounded-full bg-rmc-green/20 text-rmc-green-light text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step1') }} />
              </li>
              <li className="flex gap-2.5">
                <span className="w-4 h-4 rounded-full bg-rmc-green/20 text-rmc-green-light text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step2') }} />
              </li>
              <li className="flex gap-2.5">
                <span className="w-4 h-4 rounded-full bg-rmc-green/20 text-rmc-green-light text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step3') }} />
              </li>
            </ol>
          ) : (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rmc-green text-white text-xs font-semibold hover:bg-rmc-green/90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {t('install')}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:text-white/70 transition-colors"
              >
                {t('later')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Chrome — floating card (bottom-right)
  return (
    <div className="fixed bottom-4 right-4 z-[300] w-72 bg-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rmc-green/15 border border-rmc-green/25 flex items-center justify-center">
            <DeviceIcon className="w-4.5 h-4.5 text-rmc-green-light" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t('title')}</p>
            <p className="text-[11px] text-white/40">{t('subtitleDesktop')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-white/30 hover:text-white/60 transition-colors p-0.5 mt-0.5"
          aria-label={t('dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rmc-green text-white text-xs font-semibold hover:bg-rmc-green/90 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {t('install')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:text-white/70 transition-colors"
        >
          {t('later')}
        </button>
      </div>
    </div>
  );
}
