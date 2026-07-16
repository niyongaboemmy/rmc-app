/*
 * Root-level 404 fallback.
 *
 * Next.js renders THIS (not `app/[locale]/not-found.tsx`) on a hard load /
 * refresh of an unmatched URL — nested not-found boundaries only kick in on
 * soft, in-app navigation. It renders in the bare root layout with no
 * globals.css / Tailwind / next-intl / Navbar, so it is fully self-contained:
 * its own <html>/<body>, inline styles and a scoped <style> for the animation.
 * Kept visually aligned with the localized page: light background, green/gold
 * geometric medallion and a mosque-skyline horizon.
 */
export default function RootNotFound() {
  const green = '#1A7A4A';
  const greenDeep = '#0D3D24';
  const gold = '#D4A017';
  const bg = '#f4f5f2';

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <style>{`
          @keyframes nf-spin { to { transform: rotate(360deg); } }
          @keyframes nf-spin-rev { to { transform: rotate(-360deg); } }
          @keyframes nf-pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
          @keyframes nf-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
          @media (prefers-reduced-motion: reduce) {
            .nf-spin, .nf-spin-rev, .nf-pulse, .nf-up { animation: none !important; }
          }
        `}</style>

        <div
          style={{
            position: 'relative',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem',
            overflow: 'hidden',
            color: greenDeep,
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            backgroundColor: bg,
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(13,61,36,0.04) 0, rgba(13,61,36,0.04) 1px, transparent 1px, transparent 22px), repeating-linear-gradient(-45deg, rgba(13,61,36,0.04) 0, rgba(13,61,36,0.04) 1px, transparent 1px, transparent 22px)',
          }}
        >
          {/* 4 · medallion · 4 */}
          <div
            className="nf-up"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '1.75rem',
              animation: 'nf-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            <span style={{ fontSize: '5rem', fontWeight: 800, lineHeight: 1, color: greenDeep }}>4</span>

            <span
              style={{
                position: 'relative',
                width: 112,
                height: 112,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Outer ring — clockwise */}
              <svg
                viewBox="0 0 100 100"
                width="112"
                height="112"
                fill="none"
                aria-hidden="true"
                className="nf-spin"
                style={{ position: 'absolute', inset: 0, color: green, animation: 'nf-spin 40s linear infinite' }}
              >
                <rect x="24" y="24" width="52" height="52" rx="6" stroke="currentColor" strokeWidth="2.5" />
                <rect x="24" y="24" width="52" height="52" rx="6" transform="rotate(45 50 50)" stroke="currentColor" strokeWidth="2.5" />
              </svg>
              {/* Middle ring — counter-clockwise */}
              <svg
                viewBox="0 0 100 100"
                width="74"
                height="74"
                fill="none"
                aria-hidden="true"
                className="nf-spin-rev"
                style={{ position: 'absolute', color: gold, animation: 'nf-spin-rev 30s linear infinite' }}
              >
                <rect x="24" y="24" width="52" height="52" rx="6" stroke="currentColor" strokeWidth="2.5" />
                <rect x="24" y="24" width="52" height="52" rx="6" transform="rotate(45 50 50)" stroke="currentColor" strokeWidth="2.5" />
              </svg>
              {/* Inner filled star */}
              <svg viewBox="0 0 100 100" width="46" height="46" fill={greenDeep} aria-hidden="true" style={{ position: 'relative' }}>
                <rect x="30" y="30" width="40" height="40" rx="4" />
                <rect x="30" y="30" width="40" height="40" rx="4" transform="rotate(45 50 50)" />
                <circle cx="50" cy="50" r="6.5" fill={gold} />
              </svg>
            </span>

            <span style={{ fontSize: '5rem', fontWeight: 800, lineHeight: 1, color: greenDeep }}>4</span>
          </div>

          <div
            aria-hidden="true"
            style={{
              width: '6rem',
              height: 1,
              margin: '0 auto 1.5rem',
              background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
            }}
          />

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: greenDeep }}>
            Page Not Found
          </h1>
          <p style={{ color: '#4b5563', maxWidth: '26rem', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
            The page you&rsquo;re looking for may have moved, or never existed. Let us guide you back.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="/en"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                borderRadius: '9999px',
                background: green,
                color: '#ffffff',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Back to Home
            </a>
            <a
              href="/en/services"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.7)',
                border: `1px solid ${green}55`,
                color: greenDeep,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Explore Services
            </a>
          </div>

          {/* Mosque skyline horizon */}
          <svg
            viewBox="0 0 1200 240"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
            fill={greenDeep}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 'auto', opacity: 0.9 }}
          >
            <rect x="0" y="176" width="1200" height="64" />
            <path d="M96 176 C96 138 120 120 150 120 C180 120 204 138 204 176 Z" />
            <path d="M1000 176 C1000 140 1022 124 1050 124 C1078 124 1100 140 1100 176 Z" />
            <path d="M250 176 C250 120 296 86 330 86 C364 86 410 120 410 176 Z" />
            <path d="M790 176 C790 120 836 86 870 86 C904 86 950 120 950 176 Z" />
            <rect x="470" y="92" width="16" height="84" />
            <path d="M462 92 C462 74 470 62 478 60 C486 62 494 74 494 92 Z" />
            <rect x="714" y="92" width="16" height="84" />
            <path d="M706 92 C706 74 714 62 722 60 C730 62 738 74 738 92 Z" />
            <path d="M524 176 C524 104 556 54 600 44 C644 54 676 104 676 176 Z" />
            <rect x="596" y="28" width="8" height="20" />
            <path d="M600 8c-9 2-15 10-15 19s6 17 15 19c-5-4-8-11-8-19s3-15 8-19z" fill={gold} />
          </svg>
        </div>
      </body>
    </html>
  );
}
