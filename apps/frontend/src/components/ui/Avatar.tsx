import { useState } from 'react';

const TITLE_WORDS = new Set(['sheikh', 'imam', 'imamu', 'hajji', 'haji', 'mufti', 'dr', 'mr', 'al']);

/** Two-letter initials from a person's name, skipping honorific titles. */
function initialsOf(name: string): string {
  const words = name
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !TITLE_WORDS.has(w.toLowerCase()));
  const pick = words.length ? words : name.split(/\s+/).filter(Boolean);
  return pick.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

/** Deterministic, calm background colour derived from the name. */
const PALETTE = ['#0d3d24', '#15803d', '#0e7490', '#5b21b6', '#9a3412', '#1e3a8a', '#9d174d'];
function colorOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

interface AvatarProps {
  name: string;
  photo?: string | null;
  /** Pixel diameter. */
  size?: number;
  className?: string;
}

/**
 * Round avatar that shows the person's photo when available and falls back to
 * their initials on a deterministic colour when there is no photo (or it fails
 * to load). Plain <img> so it works inside Leaflet popups.
 */
export function Avatar({ name, photo, size = 32, className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size, minWidth: size };

  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt={name}
        onError={() => setFailed(true)}
        style={dimension}
        className={`rounded-full object-cover ring-1 ring-black/5 ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={name}
      style={{ ...dimension, backgroundColor: colorOf(name), fontSize: Math.round(size * 0.4) }}
      className={`inline-flex items-center justify-center rounded-full font-semibold leading-none text-white ring-1 ring-black/5 ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
