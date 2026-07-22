'use client';

/**
 * Funding progress for a campaign — the animated bar + the Raised / Goal /
 * Remaining figures. The percentage and totals come from the live computed
 * `receivedAmount` (completed donations) vs the campaign target, so this is the
 * single visual source of truth for progress across the card, featured block and
 * detail page.
 */

import { useEffect, useRef, useState } from 'react';
import { money } from './donateData';

export function fundedPct(raised: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((raised / target) * 100));
}

export function CampaignProgress({
  raised,
  target,
  currency,
  size = 'card',
}: {
  raised: number;
  target: number;
  currency: string;
  size?: 'card' | 'full';
}) {
  const pct = fundedPct(raised, target);
  const remaining = Math.max(0, target - raised);

  // Animate the bar in when it first scrolls into view.
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const full = size === 'full';

  return (
    <div ref={ref}>
      <div className={`flex items-end justify-between ${full ? 'mb-2' : 'mb-1.5'}`}>
        <span className={`font-bold tabular-nums text-rmc-green ${full ? 'text-2xl md:text-3xl' : 'text-base'}`}>
          {money(currency, raised)}
        </span>
        <span className={`font-semibold tabular-nums text-rmc-gold ${full ? 'text-sm' : 'text-xs'}`}>
          {pct}%
        </span>
      </div>

      <div
        className={`relative w-full overflow-hidden rounded-full bg-gray-100 ${full ? 'h-3' : 'h-2'}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-rmc-green to-rmc-green-dark transition-[width] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: `${shown ? pct : 0}%` }}
        />
      </div>

      <div className={`mt-2 flex items-center justify-between ${full ? 'text-sm' : 'text-[11px]'} text-gray-500`}>
        <span>
          <span className="font-semibold text-gray-700">{money(currency, target)}</span> goal
        </span>
        <span>
          <span className="font-semibold text-gray-700">{money(currency, remaining)}</span> to go
        </span>
      </div>
    </div>
  );
}
