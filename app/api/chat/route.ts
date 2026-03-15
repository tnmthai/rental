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

type ExternalHit = {
  title: string;
  url: string;
  snippet?: string;
  source: 'web';
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

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
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
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;

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

function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function tryExtractUddg(urlOrPath: string): string | null {
  const raw = decodeHtmlEntities(urlOrPath || '');

  // Handle relative redirect path: /l/?uddg=...
  if (raw.startsWith('/l/?') || raw.startsWith('/?')) {
    const q = raw.split('?')[1] || '';
    const usp = new URLSearchParams(q);
    const uddg = usp.get('uddg');
    if (uddg) return safeDecode(uddg);
  }

  // Handle absolute duckduckgo redirect URL: https://duckduckgo.com/l/?uddg=...
  try {
    const u = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    if (u.hostname.includes('duckduckgo.com')) {
      const uddg = u.searchParams.get('uddg');
      if (uddg) return safeDecode(uddg);
    }
  } catch {
    // ignore
  }

  return null;
}

function normalizeDuckUrl(raw: string): string {
  if (!raw) return raw;
  const decoded = decodeHtmlEntities(raw.trim());

  const extracted = tryExtractUddg(decoded);
  if (extracted && /^https?:\/\//i.test(extracted)) return extracted;

  if (decoded.startsWith('//')) return `https:${decoded}`;
  if (decoded.startsWith('/')) return `https://duckduckgo.com${decoded}`;
  return decoded;
}

function detectSearchRegion(message: string, need: Need): 'vn' | 'nz' | 'auto' {
  const t = `${message} ${need.city || ''} ${need.suburb || ''}`.toLowerCase();

  // Prefer geography/currency intent over language.
  const vnGeoHints = [
    'vietnam', 'việt nam', 'hanoi', 'ha noi', 'ho chi minh', 'hcm', 'sai gon', 'saigon',
    'da nang', 'can tho', 'quận', 'phường', 'district '
  ];
  const nzGeoHints = [
    'new zealand', 'auckland', 'wellington', 'christchurch', 'hamilton', 'dunedin', 'palmerston north'
  ];

  const vnCurrencyHints = ['vnd', 'vnđ', 'đ/tháng', 'trieu', 'triệu', 'million vnd'];
  const nzCurrencyHints = ['nzd', 'nz$', '$/week', 'per week'];

  if (vnGeoHints.some((k) => t.includes(k)) || vnCurrencyHints.some((k) => t.includes(k))) return 'vn';
  if (nzGeoHints.some((k) => t.includes(k)) || nzCurrencyHints.some((k) => t.includes(k))) return 'nz';

  return 'auto';
}

async function searchExternalWeb(message: string, need: Need): Promise<ExternalHit[]> {
  const locationPart = [need.suburb, need.city].filter(Boolean).join(' ');
  const budgetPart = need.maxPrice ? `under ${need.maxPrice}` : '';
  const region = detectSearchRegion(message, need);

  const nzSites = 'site:trademe.co.nz OR site:realestate.co.nz OR site:myrent.co.nz OR site:oneroof.co.nz';
  const vnSites = 'site:chotot.com OR site:batdongsan.com.vn OR site:alonhadat.com.vn OR site:mogi.vn';

  const strictQuery = (
    region === 'vn'
      ? `${message} ${locationPart} ${budgetPart} thuê trọ ${vnSites}`
      : region === 'nz'
        ? `${message} ${locationPart} ${budgetPart} rent ${nzSites}`
        : `${message} ${locationPart} ${budgetPart} rent OR thuê trọ ${nzSites} OR ${vnSites}`
  )
    .trim()
    .replace(/\s+/g, ' ');

  const broadQuery = (
    region === 'vn'
      ? `${message} ${locationPart} ${budgetPart} thuê nhà phòng trọ việt nam`
      : region === 'nz'
        ? `${message} ${locationPart} ${budgetPart} new zealand rent`
        : `${message} ${locationPart} ${budgetPart} room for rent`
  ).trim().replace(/\s+/g, ' ');

  const run = async (query: string): Promise<ExternalHit[]> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    try {
      const endpoints = [
        `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      ];

      let html = '';
      for (const endpoint of endpoints) {
        const res = await fetch(endpoint, {
          headers: {
            'user-agent': 'Mozilla/5.0',
            accept: 'text/html'
          },
          signal: controller.signal
        });
        if (!res.ok) continue;
        html = await res.text();
        if (html && html.length > 1000) break;
      }

      if (!html) return [];

      const out: ExternalHit[] = [];
      const patterns = [
        /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        /<a[^>]*class=["'][^"']*result-link[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        /<a[^>]*href=["']([^"']*uddg=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      ];

      for (const anchorRe of patterns) {
        let m: RegExpExecArray | null;
        while ((m = anchorRe.exec(html)) && out.length < 12) {
          const url = normalizeDuckUrl(m[1] || '');
          const title = String(m[2] || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (!url || !title) continue;
          if (!/^https?:\/\//i.test(url)) continue;
          try {
            const host = new URL(url).hostname.toLowerCase();
            if (host.includes('duckduckgo.com')) continue;
          } catch {
            continue;
          }
          out.push({ title, url, source: 'web' });
        }
      }

      const dedup = new Map<string, ExternalHit>();
      for (const x of out) dedup.set(x.url, x);
      return Array.from(dedup.values()).slice(0, 6);
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  };

  const strict = await run(strictQuery);
  if (strict.length > 0) return strict;

  const broad = await run(broadQuery);
  if (broad.length > 0) return broad;

  const fallbackQuery = `${message} ${locationPart} room for rent`.trim().replace(/\s+/g, ' ');
  return run(fallbackQuery);
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

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
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
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return text ? String(text).trim() : null;
  } catch {
    return null;
  }
}

function pickRelevantInternalResults(rows: any[]): any[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const conditionCount = Number(rows[0]?.condition_count || 0);
  if (!Number.isFinite(conditionCount) || conditionCount <= 0) {
    // If we cannot infer meaningful filters from query, don't force internal results.
    return [];
  }

  const minScore = Math.max(1, Math.ceil(conditionCount * 0.5));
  return rows.filter((r) => Number(r?.match_score || 0) >= minScore);
}

function isVietnamLikeListing(row: any): boolean {
  const text = `${row?.city || ''} ${row?.title || ''} ${row?.description || ''}`.toLowerCase();
  const vnHints = [
    'việt', 'viet', 'vietnam', 'hà nội', 'ha noi', 'hanoi', 'hồ chí minh', 'ho chi minh',
    'sài gòn', 'sai gon', 'hcm', 'tp.hcm', 'đà nẵng', 'da nang', 'cần thơ', 'can tho', 'quận', 'phường'
  ];
  return vnHints.some((k) => text.includes(k));
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
    const region = detectSearchRegion(userText, need);

    const rawResults = await searchListings(need);
    const relevant = pickRelevantInternalResults(rawResults);
    const results = region === 'vn'
      ? relevant.filter(isVietnamLikeListing)
      : region === 'nz'
        ? relevant
        : [];

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

    const wantsExternal = /(\bexternal\b|\bweb\b|ngoài|outside)/i.test(userText);
    const shouldFetchExternal = results.length === 0 || wantsExternal;
    const externalResults = shouldFetchExternal ? await searchExternalWeb(userText, need) : [];

    const aiOverview =
      shortNoResultHint ||
      (await buildAIOverview(userText, need, results)) ||
      (results.length
        ? `I found ${results.length} relevant listings in our internal database and ranked the strongest matches first. ${externalResults.length ? `I also found ${externalResults.length} external web suggestions.` : ''}`
        : externalResults.length
          ? `No listings matched in our internal database right now, but I found ${externalResults.length} external web suggestions you can check.`
          : 'I could not find matching listings right now. Try relaxing price, location, or one optional condition to see more results.');

    return NextResponse.json({ reply, aiOverview, filters: need, results, externalResults, mode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
