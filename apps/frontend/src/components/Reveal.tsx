'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms before this element eases in */
  delay?: number;
  /** IntersectionObserver visibility threshold (0–1) */
  threshold?: number;
}

/**
 * Wraps content and smoothly eases it in (fade + rise) the first time it scrolls
 * into view. Reuses the shared `.reveal` system in globals.css and the
 * `useScrollReveal` observer, so reveals look identical across the whole app.
 * Honors `prefers-reduced-motion` (the CSS guard disables the motion).
 */
export function Reveal({ children, className = '', delay = 0, threshold = 0.12 }: RevealProps) {
  const { ref, visible } = useScrollReveal(threshold);
  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal${visible ? ' visible' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}
