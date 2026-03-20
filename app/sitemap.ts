import type { MetadataRoute } from 'next';
import { UNIVERSITY_LOCATIONS } from '@/lib/university-seo';

const SITE_URL = 'https://www.rentfinder.nz';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: `${SITE_URL}/post`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4
    }
  ];

  const universityRoutes: MetadataRoute.Sitemap = UNIVERSITY_LOCATIONS.map((u) => ({
    url: `${SITE_URL}/rent/${u.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.85
  }));

  return [...staticRoutes, ...universityRoutes];
}
