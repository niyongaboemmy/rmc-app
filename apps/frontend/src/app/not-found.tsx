/*
 * Root-level 404 fallback.
 *
 * Next.js renders THIS (not `app/[locale]/not-found.tsx`) on a hard load /
 * refresh of an unmatched URL — nested not-found boundaries only kick in on
 * soft, in-app navigation. It renders in the bare root layout with no
 * globals.css / Tailwind / next-intl / Navbar, so it is fully self-contained:
 * its own <html>/<body> and inline styles. Kept intentionally minimal.
 */
export default function RootNotFound() {
  const green = '#1A7A4A';
  const greenDeep = '#0D3D24';
  const gold = '#D4A017';
  const bg = '#f4f5f2';

  return (
    <html lang="en">
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
          <p style={{ fontSize: '5rem', fontWeight: 800, lineHeight: 1, margin: 0, color: green }}>404</p>

          <div
            aria-hidden="true"
            style={{
              width: '4rem',
              height: 1,
              margin: '1.5rem auto',
              background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
            }}
          />

          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Page not found</h1>
          <p style={{ color: '#6b7280', maxWidth: '24rem', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
            The page you&rsquo;re looking for may have moved, or never existed.
          </p>

          <a
            href="/en"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.6rem',
              borderRadius: '9999px',
              background: green,
              color: '#ffffff',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to Home
          </a>
        </div>
      </body>
    </html>
  );
}
