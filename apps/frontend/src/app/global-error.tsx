'use client';

import { useEffect } from 'react';

/*
 * Last-resort error boundary.
 *
 * Only reached when `[locale]/layout.tsx` itself throws (a failed provider,
 * content fetch, …) — everything below it is handled by `[locale]/error.tsx`.
 * It REPLACES the root layout, so like `app/not-found.tsx` it has no
 * globals.css / Tailwind / next-intl / Navbar: own <html>/<body>, inline styles,
 * English only. Nothing here may depend on what might be the thing that broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const green = '#1A7A4A';
  const greenDeep = '#0D3D24';
  const gold = '#D4A017';
  const bg = '#f4f5f2';

  const button = {
    display: 'inline-block',
    padding: '0.75rem 1.6rem',
    borderRadius: '9999px',
    fontWeight: 600,
    fontSize: '0.9375rem',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as const;

  return (
    <html lang="en">
      <head>
        <title>Something went wrong</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem',
            color: greenDeep,
            backgroundColor: bg,
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          <p style={{ fontSize: '5rem', fontWeight: 800, lineHeight: 1, margin: 0, color: green }}>500</p>

          <div
            aria-hidden="true"
            style={{
              width: '4rem',
              height: 1,
              margin: '1.5rem auto',
              background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
            }}
          />

          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#6b7280', maxWidth: '24rem', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
            We hit an unexpected problem loading the site. Please try again in a moment.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{ ...button, border: 'none', background: green, color: '#ffffff' }}
            >
              Try Again
            </button>
            {/* Plain <a>, not next/link: a full reload is the point when the layout is broken. */}
            <a href="/en" style={{ ...button, border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}>
              Back to Home
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
              Reference: <span style={{ fontFamily: 'ui-monospace, monospace' }}>{error.digest}</span>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
