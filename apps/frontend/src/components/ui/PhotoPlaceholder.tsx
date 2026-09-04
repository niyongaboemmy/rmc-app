import { ImageIcon } from 'lucide-react';

/**
 * The block that stands in for a photo until it arrives.
 *
 * Absolutely positioned, so it fills whatever box the photo will occupy and the
 * layout does not move when the two swap — the point of a placeholder is that
 * nothing jumps once it goes.
 *
 * `tone="dark"` is for photos sitting on the deep-green carousel and the
 * lightbox backdrop, where the grey used everywhere else reads as a light patch
 * punched out of the dark rather than as an absence.
 */
export function PhotoPlaceholder({
  tone = 'light',
  icon = false,
  className = '',
}: {
  tone?: 'light' | 'dark';
  /** Show a photo glyph — worth it on a large area, noise on a small tile. */
  icon?: boolean;
  className?: string;
}) {
  const dark = tone === 'dark';

  return (
    <div
      aria-hidden
      // aria-hidden, and no status role: a decorative stand-in announced as
      // "loading" would have a screen reader wait for something it is never
      // shown. The alt text on the photo itself is what carries the meaning.
      className={`absolute inset-0 grid animate-pulse place-items-center motion-reduce:animate-none ${
        dark ? 'bg-white/[0.07]' : 'bg-gradient-to-br from-gray-100 via-gray-200/70 to-gray-100'
      } ${className}`}
    >
      {icon && (
        <ImageIcon
          className={`h-8 w-8 ${dark ? 'text-white/25' : 'text-gray-300'}`}
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}
