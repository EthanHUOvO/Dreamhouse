/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.GITHUB_ACTIONS === 'true' ? '/Dreamhouse' : '',
  assetPrefix: process.env.GITHUB_ACTIONS === 'true' ? '/Dreamhouse' : '',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
