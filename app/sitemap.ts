import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://alatainvestmentclub.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://alatainvestmentclub.com/reports', lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://alatainvestmentclub.com/team', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://alatainvestmentclub.com/partners', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://alatainvestmentclub.com/career-service', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://alatainvestmentclub.com/join-us', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
  ]
}
