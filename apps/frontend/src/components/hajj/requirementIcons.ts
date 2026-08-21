import type { LucideIcon } from 'lucide-react';
import {
  FileCheck2, Receipt, Banknote, Wallet, CircleDot, Plane, BookUser, Stamp,
  ShieldCheck, HeartPulse, CalendarDays, Users, MapPin, BookOpen, Syringe,
} from 'lucide-react';

/**
 * Fixed set of icons an admin can pick for a Hajj requirement. The stored value
 * is the name, so the data layer stays icon-agnostic (same trick as funeral steps).
 */
export const REQUIREMENT_ICONS: Record<string, LucideIcon> = {
  FileCheck2, Receipt, Banknote, Wallet, Plane, BookUser, Stamp,
  ShieldCheck, HeartPulse, CalendarDays, Users, MapPin, BookOpen, Syringe,
};

export const REQUIREMENT_ICON_NAMES = Object.keys(REQUIREMENT_ICONS);

/** Resolve a stored icon name; falls back to a neutral dot for unset/unknown. */
export function requirementIcon(name?: string): LucideIcon {
  return (name && REQUIREMENT_ICONS[name]) || CircleDot;
}
