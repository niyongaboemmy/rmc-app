'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePWAInstall } from '@/contexts/PWAInstallContext';

export function PWAInstallButton() {
  const t = useTranslations('footer.pwa');
  const { isReady, isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Visibility depends on client-only signals (navigator/beforeinstallprompt),
  // so the server always renders nothing. Gate on a mounted flag so the first
  // client render matches the server and hydration doesn't mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Hide when already installed or when Chrome prompt isn't available (non-iOS)
  if (isInstalled) return null;
  if (!isIOS && !isReady) return null;

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    // Chrome: directly trigger the native browser install dialog
    await triggerInstall();
  };

  const buttonClass =
    'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rmc-green/15 border border-rmc-green/30 text-rmc-green-light hover:bg-rmc-green/25 hover:border-rmc-green/50 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold/50';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={buttonClass}
        aria-label={t('installAriaLabel')}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        {t('install')}
      </button>

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
