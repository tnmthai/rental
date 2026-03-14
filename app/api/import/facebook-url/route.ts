import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

type ImportPayload = {
  source_url: string;
};

function isFacebookUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    return host.includes('facebook.com') || host.includes('fb.com') || host.includes('m.facebook.com');
  } catch {
    return false;
  }
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/');
}

function getMeta(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, 'i')
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeHtml(m[1]).trim();
  }
  return undefined;
}

function parsePriceNzdWeekly(text: string): number | undefined {
  const normalized = text.toLowerCase().replace(/,/g, ' ');
  const m = normalized.match(/(?:\$|nzd\s*)?(\d{2,4})(?:\s*(?:nzd)?)\s*(?:\/\s*(?:week|wk)|per\s*week|weekly|tuần|\/\s*tuần)?/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 50 || n > 5000) return undefined;
  return n;
}

function inferCity(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes('auckland')) return 'Auckland';
  if (t.includes('christchurch')) return 'Christchurch';
  if (t.includes('wellington')) return 'Wellington';
  if (t.includes('lincoln')) return 'Lincoln';
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`import-facebook:${ip}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many import requests. Please retry later.' },
        { status: 429 }
      );
    }

    const body = (await req.json()) as ImportPayload;
    const sourceUrl = String(body?.source_url || '').trim();

    if (!sourceUrl || !isFacebookUrl(sourceUrl)) {
      return NextResponse.json({ error: 'Please provide a valid Facebook URL.' }, { status: 400 });
    }

    const response = await fetch(sourceUrl, {
      method: 'GET',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Cannot fetch URL (${response.status})` }, { status: 400 });
    }

    const html = await response.text();

    const ogTitle = getMeta(html, 'og:title');
    const ogDescription = getMeta(html, 'og:description');
    const ogImage = getMeta(html, 'og:image');

    const title = ogTitle || 'Facebook rental listing';
    const description = ogDescription || '';
    const price_nzd_week = parsePriceNzdWeekly(`${title} ${description}`);
    const city = inferCity(`${title} ${description}`);

    return NextResponse.json({
      item: {
        source_url: sourceUrl,
        title,
        description,
        price_nzd_week,
        city,
        image_urls: ogImage ? [ogImage] : []
      },
      note: 'Imported metadata from Facebook URL. Please review before publishing.'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Import failed' }, { status: 500 });
  }
}
