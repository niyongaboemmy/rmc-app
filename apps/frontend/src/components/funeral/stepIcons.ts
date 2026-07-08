import type { LucideIcon } from 'lucide-react';
import {
  FileText, ShieldCheck, Phone, Droplets, Package, Users, Truck, Landmark,
  CheckCircle2, Clock, Heart, Moon, HandHeart, MapPin, Flag, Sparkles,
} from 'lucide-react';

/** Fixed set of icons an admin can pick for a funeral lifecycle step. */
export const STEP_ICONS: Record<string, LucideIcon> = {
  FileText, ShieldCheck, Phone, Droplets, Package, Users, Truck, Landmark,
  CheckCircle2, Clock, Heart, Moon, HandHeart, MapPin, Flag, Sparkles,
};

export const STEP_ICON_NAMES = Object.keys(STEP_ICONS);

/** Resolve a stored icon name to its component (undefined when unset/unknown). */
export function stepIcon(name?: string): LucideIcon | undefined {
  return name ? STEP_ICONS[name] : undefined;
}
