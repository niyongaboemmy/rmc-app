'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePWAInstall } from '@/contexts/PWAInstallContext';

const DISMISS_KEY = 'pwa_auto_dismissed_at';
const DISMISS_DAYS = 7;

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

export function PWAAutoInstallPrompt() {
  const t = useTranslations('footer.pwa.auto');
  const { isReady, isInstalled, isIOS, isMobile, triggerInstall } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Mobile Chrome: auto-trigger the native install dialog after a short delay.
  useEffect(() => {
    if (!isMobile || isIOS || isInstalled || autoTriggered) return;
    if (!isReady) return;
    if (wasDismissedRecently()) return;

    setAutoTriggered(true);
    const timer = window.setTimeout(async () => {
      const outcome = await triggerInstall();
      if (outcome === 'dismissed') saveDismissed();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isReady, isMobile, isIOS, isInstalled, autoTriggered, triggerInstall]);

  // Mobile iOS: show the manual steps sheet after a short delay.
  useEffect(() => {
    if (!isMobile || !isIOS || isInstalled) return;
    if (wasDismissedRecently()) return;

    const timer = window.setTimeout(() => {
      if (!wasDismissedRecently()) setVisible(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isMobile, isIOS, isInstalled]);

  const dismiss = () => {
    setVisible(false);
    saveDismissed();
  };

  // Only render the iOS bottom-sheet; Chrome install is handled silently above.
  if (!visible || isInstalled || !isIOS) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[300] p-3 sm:p-4 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{t('title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 ml-2"
            aria-label={t('dismiss')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showIOSSteps ? (
          <ol className="space-y-2.5 text-xs text-gray-600 leading-relaxed mt-3">
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step1') }} />
            </li>
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step2') }} />
            </li>
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span dangerouslySetInnerHTML={{ __html: t.raw('ios.step3') }} />
            </li>
          </ol>
        ) : (
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setShowIOSSteps(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-green-600 text-white text-sm font-semibold hover:bg-green-700 active:bg-green-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('getApp')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="px-4 py-2.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              {t('later')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
