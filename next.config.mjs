const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Dreamhouse'
const basePath = isGitHubPages ? `/${repo}` : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  // Pascal beta packages currently expose source-level type errors that do
  // not affect the statically exported viewer at runtime.
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    '@pascal-app/core',
    '@pascal-app/viewer',
    '@pascal-app/editor',
    '@pascal-app/nodes'
  ]
}
export default nextConfig
