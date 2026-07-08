import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import Icon from '@/app/components/Icon';

type Post = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  readingTime: string;
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

function getReadingTime(text: string): string {
  const words = text.split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
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
        excerpt: meta.excerpt || content.slice(0, 160),
        readingTime: getReadingTime(content)
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
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <a
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-muted)',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 24,
          transition: 'color 0.15s'
        }}
      >
        <Icon name="arrowLeft" size={16} />
        Home
      </a>

      <div className="blog-hero">
        <h1>
          <span className="gradient-text">Blog</span>
        </h1>
        <p>Tips, guides, and insights about renting in New Zealand.</p>
      </div>

      {posts.length === 0 ? (
        <div className="blog-empty">
          <p>No posts yet. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="blog-card"
            >
              <h2>{post.title}</h2>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <div className="blog-card-meta">
                <span>{formatDate(post.date)}</span>
                <span className="blog-reading-time">{post.readingTime}</span>
              </div>
              <span className="blog-card-link">
                Read more
                <Icon name="chevronRight" size={16} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
