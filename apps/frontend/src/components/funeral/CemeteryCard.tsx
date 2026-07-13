import { MapPin, Users, UserRound, Phone, Navigation, ArrowRight } from 'lucide-react';
import type { Cemetery } from './types';
import { occupancyPercent } from './data';

interface Labels {
  capacity: string;
  contact: string;
  directions: string;
  locate: string;
  occupancy: string;
}

/**
 * Cemetery directory card. Presentational + a couple of links (server-safe).
 * The "Locate on map" button is wired by the parent via onLocate.
 */
export function CemeteryCard({
  cemetery,
  labels,
  locale,
  active,
  onLocate,
}: {
  cemetery: Cemetery;
  labels: Labels;
  locale: string;
  active?: boolean;
  onLocate?: () => void;
}) {
  const pct = occupancyPercent(cemetery.used, cemetery.capacity);
  const nearFull = pct >= 85;
  const mapsQuery =
    cemetery.lat != null && cemetery.lng != null
      ? `${cemetery.lat},${cemetery.lng}`
      : encodeURIComponent(cemetery.address);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ring-1 transition-all duration-300 ${
        active ? 'border-rmc-green ring-rmc-green/30' : 'border-gray-100 ring-black/5 hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green ring-1 ring-rmc-green/15">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-gray-900">{cemetery.name}</h3>
          <p className="mt-0.5 text-[12.5px] text-gray-500">{cemetery.address}</p>
        </div>
      </div>

      {/* Occupancy */}
      <div className="mt-4">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <Users className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" /> {labels.capacity}
          </span>
          <span className="font-bold tabular-nums text-gray-800">
            {cemetery.used.toLocaleString(locale)} / {cemetery.capacity.toLocaleString(locale)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${nearFull ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rmc-green to-rmc-green-dark'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-400">{labels.occupancy}: {pct}%</p>
      </div>

      {/* Contact */}
      <div className="mt-4 space-y-1.5 border-t border-gray-50 pt-3">
        <p className="flex items-center gap-2 text-[13px] text-gray-600">
          <UserRound className="h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
          <span className="text-gray-400">{labels.contact}:</span>
          <span className="font-medium text-gray-800">{cemetery.contactPerson}</span>
        </p>
        <a href={`tel:${cemetery.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-rmc-green">
          <Phone className="h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
          <span className="font-medium tabular-nums text-gray-800">{cemetery.phone}</span>
        </a>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {onLocate && (
          <button
            type="button"
            onClick={onLocate}
            className="inline-flex items-center gap-1 rounded-full border border-rmc-green/30 px-3 py-1.5 text-[12px] font-semibold text-rmc-green transition-colors hover:bg-rmc-green hover:text-white"
          >
            <Navigation className="h-3 w-3" aria-hidden="true" /> {labels.locate}
          </button>
        )}
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-rmc-green px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-rmc-green-dark"
        >
          {labels.directions} <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
