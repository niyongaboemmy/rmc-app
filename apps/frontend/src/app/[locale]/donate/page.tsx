import type { Metadata } from 'next';
import { DonatePageClient } from '@/components/donate/DonatePageClient';

export const metadata: Metadata = {
  title: 'Donate — RMC',
  description: "Support the Rwanda Muslim Community. Choose a program, give once or recurring, in your currency, with the payment method you prefer.",
};

export default function DonatePage({ searchParams }: { searchParams: { cause?: string } }) {
  return <DonatePageClient initialCause={searchParams.cause} />;
}
