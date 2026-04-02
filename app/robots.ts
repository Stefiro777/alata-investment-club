import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/login', '/api/'] },
    ],
    sitemap: 'https://alatainvestmentclub.com/sitemap.xml',
  }
}
