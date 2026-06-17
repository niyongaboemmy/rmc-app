'use client';

import { useEffect, useRef } from 'react';

export function useTilt(strength = 8) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleEnter = () => {
      el.style.transition = 'transform 0.1s ease-out';
    };

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const yPct = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      el.style.transition = 'transform 0.05s linear';
      el.style.transform = `perspective(700px) rotateY(${xPct * strength}deg) rotateX(${-yPct * strength}deg) translateZ(6px)`;
    };

    const handleLeave = () => {
      el.style.transition = 'transform 0.45s cubic-bezier(.4,0,.2,1)';
      el.style.transform = 'perspective(700px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
    };

    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);

    return () => {
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [strength]);

  return ref;
}
