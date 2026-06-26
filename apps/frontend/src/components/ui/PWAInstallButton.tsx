'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Smartphone, X, Chrome } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Platform = 'chrome' | 'ios' | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as Record<string, unknown>).MSStream;
  if (isIOS) return 'ios';
  const isChromium = /Chrome|CriOS|OPR|Edg|SamsungBrowser/.test(ua);
  return isChromium ? 'chrome' : 'other';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PWAInstallButton() {
  const t = useTranslations('footer.pwa');
  const [platform, setPlatform] = useState<Platform>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setPlatform(detectPlatform());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    if (!showHint) return;
    const close = (e: MouseEvent) => {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowHint(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showHint]);

  if (installed) return null;

  const handleClick = async () => {
    if (platform === 'ios') {
      setShowIOSModal(true);
      return;
    }
    if (platform === 'chrome' && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    // Chrome (prompt not yet ready) or other browser — show tooltip
    setShowHint((v) => !v);
  };

  // Tooltip copy differs: Chrome users just need to look at the address bar;
  // other browsers need to switch to Chrome entirely.
  const hintText = platform === 'chrome' ? t('chromeNotReady') : t('useChrome');

  const buttonClass =
    'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rmc-green/15 border border-rmc-green/30 text-rmc-green-light hover:bg-rmc-green/25 hover:border-rmc-green/50 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold/50';

  return (
    <>
      <div className="relative" ref={hintRef}>
        <button
          type="button"
          onClick={handleClick}
          className={buttonClass}
          aria-label={t('installAriaLabel')}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          {t('install')}
        </button>

        {showHint && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-900 border border-white/10 rounded-xl p-3.5 shadow-xl z-50 text-xs text-white/70 leading-relaxed">
            <div className="flex items-start gap-2">
              <Chrome className="w-4 h-4 text-rmc-gold shrink-0 mt-0.5" />
              <p>{hintText}</p>
            </div>
            <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-zinc-900 border-r border-b border-white/10 rotate-45" />
          </div>
        )}
      </div>

      {showIOSModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-rmc-gold" />
                <span className="font-semibold text-white text-sm">{t('ios.title')}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="space-y-3 text-sm text-white/65 leading-relaxed">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-rmc-green/20 text-rmc-green-light text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step1') }} />
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-rmc-green/20 text-rmc-green-light text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step2') }} />
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-rmc-green/20 text-rmc-green-light text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step3') }} />
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
