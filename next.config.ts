import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// Alleen het echte domein (SITE_URL) mag in Google. Al het andere — *.up.railway.app,
// staging, een site zonder SITE_URL — krijgt noindex. Zie docs/SEO.md.
const siteHost = process.env.SITE_URL ? new URL(process.env.SITE_URL).host : undefined

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      // uploaded media (served through Payload)
      { pathname: '/api/media/file/**' },
      // static design/fallback images shipped in the repo (public/images/**)
      { pathname: '/images/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        ...(siteHost && { missing: [{ type: 'host' as const, value: siteHost.replace(/\./g, '\\.') }] }),
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  // 301's van oude URL's (bv. de vorige website) → redirects.json. Zie docs/SEO.md.
  async redirects() {
    return JSON.parse(readFileSync(path.resolve(dirname, 'redirects.json'), 'utf8'))
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
