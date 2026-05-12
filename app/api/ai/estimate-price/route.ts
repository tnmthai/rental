import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const city = String(body.city || '').trim();
  const furnished = Boolean(body.furnished);
  const billsIncluded = Boolean(body.bills_included);
  const nearSchool = String(body.near_school || '').trim();

  if (!city) {
    return NextResponse.json({ error: 'City is required' }, { status: 400 });
  }

  const p = getPool();

  // Find similar listings from DB
  const params: Array<string | boolean> = [];
  const where: string[] = ["status = 'approved'", "(expires_at IS NULL OR expires_at > now())"];

  params.push(`%${city}%`);
  where.push(`city ILIKE $${params.length}`);

  if (furnished) {
    params.push(true);
    where.push(`furnished = $${params.length}`);
  }
  if (billsIncluded) {
    params.push(true);
    where.push(`bills_included = $${params.length}`);
  }

  const { rows: similar } = await p.query(
    `SELECT price_nzd_week, city, furnished, bills_included, near_school
     FROM listings
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT 20`,
    params
  );

  const prices = similar.map((r: any) => Number(r.price_nzd_week)).filter((n: number) => Number.isFinite(n) && n > 0);

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  if (!apiKey || prices.length === 0) {
    // Fallback: simple stats
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      return NextResponse.json({
        estimate: `$${min} - $${max}/week`,
        average: `$${avg}/week`,
        sample_size: prices.length,
        source: 'database'
      });
    }
    return NextResponse.json({
      estimate: 'Not enough data',
      average: null,
      sample_size: 0,
      source: 'none'
    });
  }

  const stats = {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    count: prices.length
  };

  const prompt = `Based on these similar rental listings in ${city}, NZ:
- Price range: $${stats.min} - $${stats.max}/week
- Average: $${stats.avg}/week
- Sample size: ${stats.count} listings
- Furnished: ${furnished ? 'Yes' : 'No'}
- Bills included: ${billsIncluded ? 'Yes' : 'No'}
${nearSchool ? `- Near: ${nearSchool}` : ''}

Estimate a reasonable price range for a similar rental. Reply in this exact format:
LOW-HIGH
where LOW and HIGH are numbers in NZD per week. Example: 180-250
Then on a new line, a brief 1-sentence explanation.`;

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a NZ rental price analyst. Reply concisely.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.3
      })
    });

    if (!res.ok) {
      return NextResponse.json({
        estimate: `$${stats.min} - $${stats.max}/week`,
        average: `$${stats.avg}/week`,
        sample_size: stats.count,
        source: 'database'
      });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    const match = reply.match(/(\d+)\s*[-–]\s*(\d+)/);

    return NextResponse.json({
      estimate: match ? `$${match[1]} - $${match[2]}/week` : `$${stats.min} - $${stats.max}/week`,
      average: `$${stats.avg}/week`,
      sample_size: stats.count,
      explanation: reply.split('\n').slice(1).join(' ').trim() || null,
      source: 'ai'
    });
  } catch {
    return NextResponse.json({
      estimate: `$${stats.min} - $${stats.max}/week`,
      average: `$${stats.avg}/week`,
      sample_size: stats.count,
      source: 'database'
    });
  }
}
