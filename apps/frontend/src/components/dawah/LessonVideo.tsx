'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Play, Video } from 'lucide-react';
import { parseMediaEmbed } from '@/lib/dawah/media';

/**
 * A lesson video: an external YouTube/Vimeo embed, rendered as a FACADE — a
 * poster + play button that only injects the `<iframe>` on click. No third-party
 * JS loads until the visitor chooses to play, so the course page stays fast.
 *
 * Returns null for an unrecognised/removed URL so the lesson browser falls back to the
 * lesson's text body. Video is external-only — there is no self-hosted path.
 */
export function LessonVideo({ mediaUrl, title }: { mediaUrl: string; title: string }) {
  const t = useTranslations('dawah');
  const embed = parseMediaEmbed(mediaUrl);
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  if (!embed) return null;

  const showThumb = Boolean(embed.thumbnailUrl) && !thumbFailed;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-rmc-green-deep ring-1 ring-black/5">
      {playing ? (
        <iframe
          src={embed.embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; web-share; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`${t('courses.playVideo')} — ${title}`}
          className="group absolute inset-0 h-full w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rmc-gold"
        >
          {showThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.thumbnailUrl as string}
              alt=""
              aria-hidden
              onError={() => setThumbFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden className="grid h-full w-full place-items-center bg-gradient-to-br from-rmc-green to-rmc-green-deep">
              <span className="absolute inset-0 pattern-islamic opacity-[0.12]" />
              <Video className="relative h-10 w-10 text-white/70" />
            </span>
          )}
          <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" aria-hidden />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-rmc-green shadow-lg transition-transform duration-200 group-hover:scale-105"
          >
            <Play className="ms-0.5 h-7 w-7 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}
