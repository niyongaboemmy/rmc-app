'use client';

/**
 * Discovery filter for the campaign grid — an "All" tab plus one tab per admin
 * category that actually has campaigns (a campaign belongs to a category via its
 * `fundType` key). Counts are shown so donors see where the causes are.
 */

interface Tab {
  key: string;
  label: string;
  count: number;
}

export function CategoryTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}) {
  if (tabs.length <= 2) return null; // just "All" + one category → no point filtering

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              on ? 'bg-rmc-green text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                on ? 'bg-white/25' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
