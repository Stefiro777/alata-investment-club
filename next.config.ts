import type { NextConfig } from 'next'

const CSP = [
  "default-src 'self'",
  // Next.js inline scripts + Clarity + Calendly + Vercel
  "script-src 'self' 'unsafe-inline' https://www.clarity.ms https://c.bing.com https://calendly.com https://assets.calendly.com https://va.vercel-scripts.com https://vercel.live",
  // Inline styles + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: Supabase storage, Brandfetch logos, LinkedIn CDN (featured report thumbnails via Make), data URIs, blobs
  "img-src 'self' data: blob: https://iyigyfygsalvvveeeheq.supabase.co https://*.supabase.co https://*.supabase.in https://api.brandfetch.io https://cdn.brandfetch.io https://asset.brandfetch.io https://media.licdn.com https://*.licdn.com https://*.cdninstagram.com",
  // XHR/fetch: Supabase API, Vercel Analytics, Clarity
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://vitals.vercel-insights.com https://va.vercel-scripts.com https://www.clarity.ms https://c.bing.com",
  // Calendly embeds + PDF preview via blob: and Supabase storage
  "frame-src 'self' blob: https://calendly.com https://assets.calendly.com https://iyigyfygsalvvveeeheq.supabase.co",
  // PDF <object>/<embed> preview: blob: URLs and Supabase storage
  "object-src 'self' blob: https://iyigyfygsalvvveeeheq.supabase.co",
  // Prevent clickjacking (redundant with X-Frame-Options but defence-in-depth)
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: CSP },
]

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  trailingSlash: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
