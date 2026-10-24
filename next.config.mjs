const privateLanOrigins = [
  '127.0.0.1',
  '10.*.*.*',
  '192.168.*.*',
  ...Array.from({ length: 16 }, (_, index) => `172.${index + 16}.*.*`),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  // The launcher exposes the dev server on the LAN. Next 16 otherwise blocks
  // its HMR endpoint when the page is opened through a local/forwarded IPv4.
  allowedDevOrigins: privateLanOrigins,
  // Multiple launcher instances need separate development caches.
  distDir: process.env.DREAMHOUSE_DIST_DIR || '.next',
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    '@pascal-app/core',
    '@pascal-app/editor',
    '@pascal-app/nodes',
    '@pascal-app/viewer',
  ],
}
export default nextConfig
