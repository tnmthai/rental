import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type Post = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  content: string;
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
        excerpt: meta.excerpt || content.slice(0, 160),
        content
      };
    })
    .sort((a, b) => (b.date > a.date ? 1 : -1));
}

export async function GET() {
  const posts = getPosts().map(({ content, ...rest }) => rest);
  return NextResponse.json({ posts });
}
