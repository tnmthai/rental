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
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a strict JSON extractor. Output JSON only.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return null;

  try {
    const normalized = String(text).trim();
    const candidate = normalized.startsWith('{')
      ? normalized
      : (normalized.match(/\{[\s\S]*\}/)?.[0] || '');
    if (!candidate) return null;
    const j = JSON.parse(candidate);
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

function hasAnyStructuredFilter(need: Need): boolean {
  return Boolean(
    need.city || need.suburb || need.maxPrice || need.furnished || need.billsIncluded || need.nearSchool
  );
}

function isShortQuery(message: string): boolean {
  const words = message.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 3;
}

function shortQuerySuggestion(message: string): string {
  const topic = message.trim() || 'room for rent';
  return `Your query "${topic}" is a bit short, so results can be inaccurate. Try a clearer format like: "Room in Lincoln under 250 NZD/week, furnished, bills included, near LU". Include at least city, budget, and 1-2 preferences for better matches.`;
}

async function buildAIOverview(message: string, need: Need, results: any[]): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  if (!apiKey) return null;

  const compact = results.slice(0, 5).map((r) => ({
    title: r?.title,
    city: r?.city,
    price_nzd_week: r?.price_nzd_week,
    furnished: r?.furnished,
    bills_included: r?.bills_included,
    near_school: r?.near_school,
    available_date: r?.available_date
  }));

  const prompt = `User query: ${message}\nParsed filters: ${JSON.stringify(need)}\nTop results: ${JSON.stringify(compact)}\n\nWrite a short AI overview in plain English (2-4 sentences):\n- answer the user's intent directly\n- mention the best match quality\n- if no results, suggest what to relax first\nNo markdown.`;

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are an assistant that writes concise AI overview summaries for rental search.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  return text ? String(text).trim() : null;
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

    const mode = aiNeed ? 'AI-assisted' : 'rule-based (fallback)';
    const reply = results.length
      ? `Found ${results.length} matching options${detailBits.length ? ` (${detailBits.join(', ')})` : ''}. (${mode})`
      : 'No matching listings yet. Try increasing budget, expanding location, or removing one filter.';

    const shortNoResultHint = !results.length && isShortQuery(userText) && !hasAnyStructuredFilter(need)
      ? shortQuerySuggestion(userText)
      : null;

    const aiOverview =
      shortNoResultHint ||
      (await buildAIOverview(userText, need, results)) ||
      (results.length
        ? `I found ${results.length} relevant listings and ranked the strongest matches first. The top cards should fit your request best, while lower cards may miss one or more conditions.`
        : 'I could not find matching listings right now. Try relaxing price, location, or one optional condition to see more results.');

    return NextResponse.json({ reply, aiOverview, filters: need, results, mode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
