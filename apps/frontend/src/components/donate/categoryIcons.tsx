/* Icon registry for admin-managed donation categories: maps a stable icon NAME
   (stored in the DB) to a lucide-react component. Admins pick from ICON_NAMES. */
import {
  GraduationCap, HandHeart, BookOpen, CalendarDays, Heart, Home, Users,
  Stethoscope, Utensils, Baby, Building2, Moon, Star, Gift, Sparkles,
  Droplet, HelpingHand, Landmark, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  GraduationCap, HandHeart, BookOpen, CalendarDays, Heart, Home, Users,
  Stethoscope, Utensils, Baby, Building2, Moon, Star, Gift, Sparkles,
  Droplet, HelpingHand, Landmark,
};

/** Names offered in the admin icon picker (insertion order). */
export const ICON_NAMES = Object.keys(CATEGORY_ICONS);

/** Resolve an icon name to a component, falling back to HandHeart. */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || HandHeart;
}
