import Link from 'next/link';
import { ArrowRight, MapPin, CheckCircle2, Building2 } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { pick, projectPct, projectMoneyShort, type ProjectItem } from '@/lib/content-api';

/** Resolve a cover image: pass through URLs / absolute paths, expand file-server keys. */
function resolveImg(v?: string): string {
  if (!v) return '';
  return /^https?:\/\//.test(v) || v.startsWith('/') ? v : fileUrl(v);
}

export function ProjectCard({ project, locale }: { project: ProjectItem; locale: string }) {
  const title = pick(project.title, locale);
  const summary = pick(project.summary, locale);
  const pct = projectPct(project.fundCollected, project.fundNeeded);
  const funded = pct >= 100;
  const done = project.status === 'completed';
  const img = resolveImg(project.imageKey);

  return (
    <Link
      href={`/${locale}/projects/${project.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:border-rmc-green/30 hover:shadow-[0_28px_60px_-30px_rgba(26,122,74,0.45)] motion-safe:hover:-translate-y-1.5"
    >
      {/* Cover */}
      <div className="relative h-52 w-full overflow-hidden bg-rmc-green-light">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out motion-safe:group-hover:scale-[1.07]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rmc-green to-rmc-green-deep">
            <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-20" />
            <Building2 className="relative h-12 w-12 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/5" />

        {/* Category + status */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {project.category && (
            <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-rmc-green-dark shadow-sm backdrop-blur">
              {project.category}
            </span>
          )}
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rmc-green px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-white shadow-sm">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </span>
          )}
        </div>

        {/* Title + location over the image */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-base font-bold leading-snug text-white drop-shadow-sm line-clamp-2">{title}</h3>
          {project.location && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-white/80">
              <MapPin className="h-3 w-3 shrink-0" />
              {project.location}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {summary && <p className="line-clamp-2 text-[13px] leading-relaxed text-gray-500">{summary}</p>}

        {/* Funding */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <span className="text-[13px] font-bold tabular-nums text-gray-900">
              {projectMoneyShort(project.currency, project.fundCollected)}
              <span className="text-[11px] font-medium text-gray-400"> raised</span>
            </span>
            <span className={`inline-flex items-center gap-1 text-sm font-extrabold tabular-nums ${funded ? 'text-[#8A6A0F]' : 'text-rmc-green'}`}>
              {funded && <CheckCircle2 className="h-3.5 w-3.5" />}
              {pct}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${funded ? 'bg-gradient-to-r from-rmc-gold to-rmc-gold-light' : 'bg-gradient-to-r from-rmc-green to-rmc-green-dark'}`}
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            of <span className="font-semibold text-gray-600">{projectMoneyShort(project.currency, project.fundNeeded)}</span> goal
          </p>
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-rmc-green/[0.07] px-3.5 py-1.5 text-xs font-bold text-rmc-green transition-colors group-hover:bg-rmc-green group-hover:text-white">
          View project
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
        </span>
      </div>
    </Link>
  );
}
