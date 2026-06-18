'use client';

import { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  /** Entrance direction. */
  variant?: 'up' | 'left' | 'right';
  /** Delay (ms) before the transition runs once the block is in view. */
  delay?: number;
  className?: string;
}

/**
 * Smoothly reveals its children (fade + slide) the first time they scroll into
 * view, using the shared `.reveal` CSS system (easeOutExpo, reduced-motion safe).
 * Wrap a whole section to give it a clean entrance animation.
 */
export function Reveal({ children, variant = 'up', delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Re-trigger every time the section enters/leaves the viewport, so it
    // animates again whenever the user scrolls back to it (not just once).
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const base = variant === 'left' ? 'reveal-left' : variant === 'right' ? 'reveal-right' : 'reveal';

  return (
    <div
      ref={ref}
      className={`${base}${visible ? ' visible' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
