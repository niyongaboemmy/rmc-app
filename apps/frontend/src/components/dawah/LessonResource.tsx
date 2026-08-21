'use client';

import { useTranslations } from 'next-intl';
import { FileText, ExternalLink, Link2 } from 'lucide-react';

/**
 * A lesson that is a document or an external link. Both open in a new tab —
 * a public PDF can't be framed cross-origin (the file-server sets
 * X-Frame-Options: SAMEORIGIN), and a link is by definition off-site.
 */
export function LessonResource({
  kind, href, sublabel,
}: { kind: 'pdf' | 'link'; href: string; sublabel?: string }) {
  const t = useTranslations('dawah');
  const Icon = kind === 'pdf' ? FileText : Link2;
  const cta = kind === 'pdf' ? t('courses.openPdf') : t('courses.openLink');
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 ring-1 ring-black/[0.02] transition-colors hover:border-rmc-green/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-green"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rmc-green/10 text-rmc-green">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">{cta}</p>
        {sublabel && <p dir="ltr" className="truncate text-start text-xs text-gray-400">{sublabel}</p>}
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-rmc-green" aria-hidden />
    </a>
  );
}
