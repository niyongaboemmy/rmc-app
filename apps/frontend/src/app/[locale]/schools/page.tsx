import type { Metadata } from 'next';
import { SchoolsPageClient } from '@/components/schools/SchoolsPageClient';

export const metadata: Metadata = {
  title: 'Find Islamic Schools — RMC',
  description:
    'Find Islamic primary, secondary, madrassa and vocational schools across Rwanda on an interactive map.',
};

export default function SchoolsPage() {
  return <SchoolsPageClient />;
}
