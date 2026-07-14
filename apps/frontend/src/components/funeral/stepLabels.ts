import type { FuneralStepConfig, StepText } from './types';

/** Select the active-locale string, falling back to English. */
export function pickStep(t: StepText | undefined, locale: string): string {
  if (!t) return '';
  const v = locale === 'rw' ? t.rw : locale === 'ar' ? t.ar : t.en;
  return v && v.trim() ? v : t.en;
}

/** Build the title/description/color/icon maps the FuneralTimeline expects. */
export function buildStepLabels(steps: FuneralStepConfig[], locale: string) {
  const stages: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  const colors: Record<string, string> = {};
  const icons: Record<string, string> = {};
  for (const s of steps) {
    stages[s.key] = pickStep(s.title, locale) || s.key;
    descriptions[s.key] = pickStep(s.description, locale);
    if (s.color) colors[s.key] = s.color;
    if (s.icon) icons[s.key] = s.icon;
  }
  return { stages, descriptions, colors, icons };
}
