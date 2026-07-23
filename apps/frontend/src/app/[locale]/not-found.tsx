import { NotFoundView } from '@/components/layout/NotFoundView';

// Server component boundary: rendered when `notFound()` is thrown inside the
// `[locale]` segment (including the `[...rest]` catch-all for unmatched URLs).
// A plain server component here is picked up more reliably than a client one;
// all the interactive/animated work lives in the client `NotFoundView`.
export default function LocaleNotFound() {
  return <NotFoundView />;
}
