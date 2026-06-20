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

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
