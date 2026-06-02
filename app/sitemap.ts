import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { UNIVERSITY_LOCATIONS } from '@/lib/university-seo';
import { getPool } from '@/lib/db';

const SITE_URL = 'https://www.rentfinder.nz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: `${SITE_URL}/map`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3
    },
    {
      url: `${SITE_URL}/post`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${SITE_URL}/wanted`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7
    }
  ];

  // University / city landing pages
  const universityRoutes: MetadataRoute.Sitemap = UNIVERSITY_LOCATIONS.map((u) => ({
    url: `${SITE_URL}/rent/${u.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.85
  }));

  // Individual listing pages (top 500 most recent)
  let listingRoutes: MetadataRoute.Sitemap = [];
  try {
    const { rows } = await getPool().query(
      "SELECT id, created_at FROM listings WHERE status = 'active' ORDER BY created_at DESC LIMIT 500"
    );
    listingRoutes = rows.map((r: any) => ({
      url: `${SITE_URL}/listing/${r.id}`,
      lastModified: new Date(r.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6
    }));
  } catch {
    // DB unavailable during build — skip listing routes
  }

  // Blog posts
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const blogDir = path.join(process.cwd(), 'content', 'blog');
    if (fs.existsSync(blogDir)) {
      const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));
      blogRoutes = files.map((file) => {
        const raw = fs.readFileSync(path.join(blogDir, file), 'utf8');
        const dateMatch = raw.match(/date:\s*["']?(\d{4}-\d{2}-\d{2})/);
        const slug = file.replace(/\.md$/, '');
        return {
          url: `${SITE_URL}/blog/${slug}`,
          lastModified: dateMatch ? new Date(dateMatch[1]) : now,
          changeFrequency: 'monthly' as const,
          priority: 0.7
        };
      });
    }
  } catch {
    // ignore
  }

  return [...staticRoutes, ...universityRoutes, ...listingRoutes, ...blogRoutes];
}
