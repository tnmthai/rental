import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { BackToHome } from '@/app/components/Icon';

type Post = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
};

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      meta[key] = val;
    }
  }
  return { meta, content: match[2].trim() };
}

function getPosts(): Post[] {
  const dir = path.join(process.cwd(), 'content', 'blog');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
      const { meta, content } = parseFrontmatter(raw);
      return {
        title: meta.title || f.replace(/\.md$/, ''),
        slug: meta.slug || f.replace(/\.md$/, ''),
        date: meta.date || '',
        excerpt: meta.excerpt || content.slice(0, 160)
      };
    })
    .sort((a, b) => (b.date > a.date ? 1 : -1));
}

export const metadata = {
  title: 'Blog — RentFinder NZ',
  description: 'Tips, guides, and insights about renting in New Zealand.'
};

export default function BlogPage() {
  const posts = getPosts();

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <BackToHome />
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Blog</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>Tips, guides, and insights about renting in New Zealand.</p>

      {posts.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No posts yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{
                display: 'block',
                padding: '16px 20px',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.2s'
              }}
            >
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#111827' }}>{post.title}</h2>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: '#9ca3af' }}>{post.date}</p>
              <p style={{ margin: 0, fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>{post.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
