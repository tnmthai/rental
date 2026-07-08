import { notFound } from 'next/navigation';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import Icon from '@/app/components/Icon';

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

function getPost(slug: string) {
  const dir = path.join(process.cwd(), 'content', 'blog');
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
    const { meta, content } = parseFrontmatter(raw);
    if ((meta.slug || f.replace(/\.md$/, '')) === slug) {
      return {
        title: meta.title || slug,
        date: meta.date || '',
        excerpt: meta.excerpt || '',
        content
      };
    }
  }
  return null;
}

function getReadingTime(text: string): string {
  const words = text.split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdToHtml(md: string): string {
  let html = md;

  // Headings (must process before other inline rules)
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => {
    const isOrdered = /<li>\d+\./.test(match);
    return isOrdered ? `<ol>${match}</ol>` : `<ul>${match}</ul>`;
  });

  // Paragraphs: double newline
  html = html.replace(/\n\n+/g, '</p><p>');

  // Wrap remaining plain text lines in <p>
  html = html.replace(/^(?!<[hulo]|<\/|<li|<hr|<blockquote)(.+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  // Clean up nested blockquotes
  html = html.replace(/<blockquote><p><\/p><\/blockquote>/g, '');

  return html;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  return {
    title: post ? `${post.title} — RentFinder NZ` : 'Blog — RentFinder NZ',
    description: post ? (post.excerpt || post.content.slice(0, 160)) : ''
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <main style={{ maxWidth: 740, margin: '0 auto', padding: '24px 16px' }}>
      <a
        href="/blog"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-muted)',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 32,
          transition: 'color 0.15s'
        }}
      >
        <Icon name="arrowLeft" size={16} />
        Back to Blog
      </a>

      <article>
        <div className="blog-article-header">
          <h1>{post.title}</h1>
          <div className="blog-article-meta">
            <span>{formatDate(post.date)}</span>
            <span className="blog-reading-time">{getReadingTime(post.content)}</span>
          </div>
        </div>

        <div
          className="blog-article"
          dangerouslySetInnerHTML={{ __html: mdToHtml(post.content) }}
        />
      </article>

      <div className="blog-article-bottom-nav">
        <Link
          href="/blog"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--brand-primary)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 700
          }}
        >
          <Icon name="arrowLeft" size={16} />
          Back to Blog
        </Link>
      </div>
    </main>
  );
}
