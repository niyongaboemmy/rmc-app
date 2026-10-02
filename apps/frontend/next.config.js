const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

// Allow next/image to load files served by the file-server (gallery, etc.).
// Derived from the env URL so it works in dev (localhost:3002) and other envs.
function fileServerPattern() {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002');
    return {
      protocol: u.protocol.replace(':', ''),
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
    };
  } catch {
    return { protocol: 'http', hostname: 'localhost', port: '3002' };
  }
}

/**
 * Tenders, Scholarships and Jobs moved to one admin shape:
 * /admin/<section>/{manage,applications,reports}. These keep bookmarks and open
 * tabs from before the move working. Order matters — first match wins, so the
 * specific paths sit above the `:id` catch-alls, and those exclude the new
 * segment names so they never redirect a page that already moved.
 */
const L = '/:locale(rw|en|ar)';
const NEW_SEGMENTS = 'applications|manage|reports';
const legacyAdminRedirects = [
  // Tenders
  [`${L}/admin/content/tenders`, '/:locale/admin/tenders/manage'],
  [`${L}/admin/tenders`, '/:locale/admin/tenders/applications'],
  [`${L}/admin/tenders/board/:tenderId`, '/:locale/admin/tenders/applications/board/:tenderId'],
  [`${L}/admin/tenders/:id((?!${NEW_SEGMENTS})[^/]+)`, '/:locale/admin/tenders/applications/:id'],
  // Scholarships (the section was also renamed scholarship → scholarships)
  [`${L}/admin/scholarship`, '/:locale/admin/scholarships/applications'],
  [`${L}/admin/scholarship/programs`, '/:locale/admin/scholarships/manage'],
  [`${L}/admin/scholarship/reports`, '/:locale/admin/scholarships/reports'],
  [`${L}/admin/scholarship/board/:programId`, '/:locale/admin/scholarships/applications/board/:programId'],
  [`${L}/admin/scholarship/:id`, '/:locale/admin/scholarships/applications/:id'],
  [`${L}/admin/scholarships`, '/:locale/admin/scholarships/applications'],
  // Jobs
  [`${L}/admin/job-postings`, '/:locale/admin/jobs/manage'],
  [`${L}/admin/jobs`, '/:locale/admin/jobs/applications'],
  [`${L}/admin/jobs/:id((?!${NEW_SEGMENTS})[^/]+)`, '/:locale/admin/jobs/applications/:id'],
].map(([source, destination]) => ({ source, destination, permanent: false }));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return legacyAdminRedirects;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // isomorphic-dompurify bundles jsdom, which reads internal files via relative
  // paths webpack can't bundle (ENOENT on default-stylesheet.css). Keep it
  // external so it's required as a normal Node module on the server.
  experimental: {
    serverComponentsExternalPackages: ['isomorphic-dompurify'],
  },
  images: {
    // Generated thumbnails are kept on disk for 30 days instead of Next's
    // 60-second default. Sources such as the CMS file-server and the postimg
    // fallback portraits never change under a given URL, and re-fetching a
    // slow external host every minute is what made the leader cards crawl.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'life-in-morocco.com' },
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: 'i.postimg.cc' },
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'cdn.isengesho.com' },
      fileServerPattern(),
    ],
  },
};

module.exports = withNextIntl(nextConfig);
