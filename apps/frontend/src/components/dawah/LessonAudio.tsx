'use client';

import { useTranslations } from 'next-intl';
import { Headphones } from 'lucide-react';

/**
 * A lesson audio track: the self-hosted file served directly from the public
 * `dawah-media/` prefix (the file-server range-streams it, so the native scrubber
 * seeks for free). `preload="none"` — nothing downloads until the visitor plays.
 */
export function LessonAudio({ src, title }: { src: string; title: string }) {
  const t = useTranslations('dawah');
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 ring-1 ring-black/[0.02]">
      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rmc-green">
        <Headphones className="h-4 w-4" aria-hidden />
        {t('courses.audioLesson')}
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- lesson audio; the text body is the transcript */}
      <audio
        controls
        preload="none"
        src={src}
        aria-label={title}
        className="w-full"
      />
    </div>
  );
}
