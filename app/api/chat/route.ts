import { NextRequest, NextResponse } from 'next/server';
import { searchListings } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

type Need = {
  city?: string;
  suburb?: string;
  maxPrice?: number;
  furnished?: boolean;
  billsIncluded?: boolean;
  nearSchool?: string;
  queryText?: string;
};

function parseNeedRuleBased(msg: string): Need {
  const lower = msg.toLowerCase();
  const city = lower.includes('auckland')
    ? 'Auckland'
    : lower.includes('christchurch')
      ? 'Christchurch'
      : lower.includes('wellington')
        ? 'Wellington'
        : lower.includes('lincoln')
          ? 'Lincoln'
          : undefined;

  const m = lower.match(/(\d{2,4})\s*(nzd|\$)?\/?\s*(week|wk|tuần)?/);
  const maxPrice = m ? Number(m[1]) : undefined;

  const furnished = /(furnished|full furnished|đầy đủ nội thất|nội thất)/.test(lower) ? true : undefined;
  const billsIncluded = /(bills included|include bills|bao bill|bao điện nước|đã gồm hóa đơn)/.test(lower)
    ? true
    : undefined;

  const nearSchool = lower.includes('aut')
    ? 'AUT'
    : lower.includes('uoa') || lower.includes('auckland university')
      ? 'UoA'
      : lower.includes('lu') || lower.includes('lincoln university')
        ? 'LU'
        : undefined;

  const suburb = lower.includes('lincoln') ? 'lincoln' : undefined;

  return { city, suburb, maxPrice, furnished, billsIncluded, nearSchool, queryText: msg.trim() };
}

async function parseNeedAI(message: string): Promise<Need | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  if (!apiKey) return null;

  const prompt = `Extract rental search filters from user query. Return strict JSON only with keys:
city, suburb, maxPrice, furnished, billsIncluded, nearSchool, queryText.
Use null when unknown. Query: ${message}`;

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a strict JSON extractor.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return null;

  try {
    const j = JSON.parse(text);
    return {
      city: j.city || undefined,
      suburb: j.suburb || undefined,
      maxPrice: j.maxPrice ? Number(j.maxPrice) : undefined,
      furnished: typeof j.furnished === 'boolean' ? j.furnished : undefined,
      billsIncluded: typeof j.billsIncluded === 'boolean' ? j.billsIncluded : undefined,
      nearSchool: j.nearSchool || undefined,
      queryText: j.queryText || message
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`chat:${ip}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a bit and retry.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
      );
    }

    const { message } = await req.json();
    const userText = String(message || '').trim();

    const aiNeed = await parseNeedAI(userText);
    const need = aiNeed || parseNeedRuleBased(userText);

    const results = await searchListings(need);

    const detailBits: string[] = [];
    if (need.city) detailBits.push(`in ${need.city}`);
    if (need.maxPrice) detailBits.push(`under ${need.maxPrice} NZD/week`);
    if (need.suburb) detailBits.push(`around ${need.suburb}`);
    if (need.furnished) detailBits.push('furnished');
    if (need.billsIncluded) detailBits.push('bills included');
    if (need.nearSchool) detailBits.push(`near ${need.nearSchool}`);

    const mode = aiNeed ? 'AI-assisted' : 'rule-based';
    const reply = results.length
      ? `Found ${results.length} matching options${detailBits.length ? ` (${detailBits.join(', ')})` : ''}. (${mode})`
      : 'No matching listings yet. Try increasing budget, expanding location, or removing one filter.';

    return NextResponse.json({ reply, filters: need, results, mode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
