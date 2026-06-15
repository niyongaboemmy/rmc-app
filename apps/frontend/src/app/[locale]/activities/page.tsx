import type { Metadata } from 'next';
import { ActivitiesPageClient } from '@/components/activities/ActivitiesPageClient';

export const metadata: Metadata = {
  title: 'Activities & Events — RMC',
  description: "Follow RMC's most recent activities and mark your calendar for the community events ahead.",
};

export default function ActivitiesPage() {
  return <ActivitiesPageClient />;
}
