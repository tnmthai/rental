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
  femalePreferred?: boolean;
  requiresDesk?: boolean;
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
        : lower.includes('nelson')
          ? 'Nelson'
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
      : lower.includes('uc') || lower.includes('university of canterbury') || lower.includes('canterbury university')
        ? 'UC'
        : lower.includes('lu') || lower.includes('lincoln university')
          ? 'LU'
          : undefined;

  const suburb = lower.includes('lincoln') ? 'lincoln' : undefined;

  const femalePreferred = /(female preferred|prefer female|female only|girls only|ưu tiên nữ|nữ)/.test(lower)
    ? true
    : undefined;

  const requiresDesk = /(study desk|desk|bàn học|bàn làm việc)/.test(lower)
    ? true
    : undefined;

  return { city, suburb, maxPrice, furnished, billsIncluded, nearSchool, femalePreferred, requiresDesk, queryText: msg.trim() };
}

function asSafeString(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t : undefined;
  }
  return undefined;
}

async function parseNeedAI(message: string): Promise<Need | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  if (!apiKey) return null;

  const prompt = `Extract rental search filters from user query. Return strict JSON only with keys:
city, suburb, maxPrice, furnished, billsIncluded, nearSchool, femalePreferred, requiresDesk, queryText.
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
      city: asSafeString(j.city),
      suburb: asSafeString(j.suburb),
      maxPrice: j.maxPrice ? Number(j.maxPrice) : undefined,
      furnished: typeof j.furnished === 'boolean' ? j.furnished : undefined,
      billsIncluded: typeof j.billsIncluded === 'boolean' ? j.billsIncluded : undefined,
      nearSchool: asSafeString(j.nearSchool),
      femalePreferred: typeof j.femalePreferred === 'boolean' ? j.femalePreferred : undefined,
      requiresDesk: typeof j.requiresDesk === 'boolean' ? j.requiresDesk : undefined,
      queryText: asSafeString(j.queryText) || message
    };
  } catch {
    return null;
  }
}

function hasAnyStructuredFilter(need: Need): boolean {
  return Boolean(
    need.city || need.suburb || need.maxPrice || need.furnished || need.billsIncluded || need.nearSchool || need.femalePreferred || need.requiresDesk
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
      return Array.from(dedup.values()).slice(0, 5);
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

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeListingConsistency(row: any): any {
  const title = normalizeText(String(row?.title || ''));
  const description = normalizeText(String(row?.description || ''));
  const hay = `${title} ${description}`;

  const looksUnfurnished = /(unfurnished|khong noi that|trong|không nội thất)/.test(hay);
  const looksFurnished = /(furnished|fully furnished|day du noi that|đầy đủ nội thất)/.test(hay);
  const femaleFriendly = /(female preferred|female only|girls only|nu|nữ)/.test(hay);
  const hasDesk = /(study desk|desk|ban hoc|bàn học|ban lam viec|bàn làm việc)/.test(hay);

  let furnished = Boolean(row?.furnished);
  if (looksUnfurnished) furnished = false;
  else if (looksFurnished) furnished = true;

  return {
    ...row,
    furnished,
    female_friendly: femaleFriendly,
    has_desk: hasDesk
  };
}

function dedupeListings(rows: any[]): any[] {
  const byKey = new Map<string, any>();
  for (const row of rows) {
    const source = String(row?.source_url || '').trim().toLowerCase();
    const key = source
      ? `src:${source}`
      : `sig:${normalizeText(String(row?.title || ''))}|${normalizeText(String(row?.city || ''))}|${Number(row?.price_nzd_week || 0)}`;

    if (!byKey.has(key)) {
      byKey.set(key, row);
      continue;
    }

    const old = byKey.get(key);
    const oldScore = Number(old?.match_score || 0);
    const newScore = Number(row?.match_score || 0);
    if (newScore > oldScore) byKey.set(key, row);
  }
  return Array.from(byKey.values());
}

function applyPreferenceSignals(results: any[], need: Need): any[] {
  if (!Array.isArray(results) || results.length === 0) return [];

  const ranked = [...results].sort((a, b) => {
    const aBoost = (need.femalePreferred && a.female_friendly ? 2 : 0) + (need.requiresDesk && a.has_desk ? 2 : 0);
    const bBoost = (need.femalePreferred && b.female_friendly ? 2 : 0) + (need.requiresDesk && b.has_desk ? 2 : 0);
    if (bBoost !== aBoost) return bBoost - aBoost;
    return Number(a.price_nzd_week || 0) - Number(b.price_nzd_week || 0);
  });

  return ranked;
}

function applyHardConstraints(results: any[], need: Need): any[] {
  if (!Array.isArray(results) || results.length === 0) return [];

  let out = [...results];

  if (need.maxPrice) {
    out = out.filter((r) => Number(r?.price_nzd_week || 0) > 0 && Number(r.price_nzd_week) <= Number(need.maxPrice));
  }

  const locNeed = normalizeText(`${need.suburb || ''} ${need.city || ''}`.trim());
  if (locNeed) {
    out = out.filter((r) => {
      const hay = normalizeText(`${r?.city || ''} ${r?.title || ''} ${r?.near_school || ''}`);
      return hay.includes(locNeed) || locNeed.split(' ').some((w) => w.length >= 4 && hay.includes(w));
    });
  }

  if (typeof need.furnished === 'boolean') {
    out = out.filter((r) => Boolean(r?.furnished) === need.furnished);
  }

  if (typeof need.billsIncluded === 'boolean') {
    out = out.filter((r) => Boolean(r?.bills_included) === need.billsIncluded);
  }

  return out;
}

function applyHardConstraintsWithFallback(results: any[], need: Need): any[] {
  const strict = applyHardConstraints(results, need);
  if (strict.length > 0) return strict;

  // Relax order: billsIncluded -> furnished -> location; keep maxPrice if possible.
  let relaxed = [...results];
  if (need.maxPrice) {
    relaxed = relaxed.filter((r) => Number(r?.price_nzd_week || 0) > 0 && Number(r.price_nzd_week) <= Number(need.maxPrice));
  }

  if (typeof need.furnished === 'boolean') {
    const x = relaxed.filter((r) => Boolean(r?.furnished) === need.furnished);
    if (x.length) relaxed = x;
  }

  if (need.city || need.suburb) {
    const locNeed = normalizeText(`${need.suburb || ''} ${need.city || ''}`.trim());
    const x = relaxed.filter((r) => {
      const hay = normalizeText(`${r?.city || ''} ${r?.title || ''} ${r?.near_school || ''}`);
      return hay.includes(locNeed) || locNeed.split(' ').some((w) => w.length >= 4 && hay.includes(w));
    });
    if (x.length) relaxed = x;
  }

  return relaxed;
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
    femaleFriendly: r?.female_friendly,
    hasDeskMention: r?.has_desk,
    available_date: r?.available_date
  }));

  const unmet: string[] = [];
  if (need.nearSchool && compact.length && !compact.some((r) => String(r.near_school || '').toLowerCase().includes(String(need.nearSchool || '').toLowerCase()))) {
    unmet.push(`near ${need.nearSchool}`);
  }
  if (need.femalePreferred && compact.length && !compact.some((r) => r.femaleFriendly)) unmet.push('female preferred');
  if (need.requiresDesk && compact.length && !compact.some((r) => r.hasDeskMention)) unmet.push('study desk');

  const prompt = `User query: ${message}\nParsed filters: ${JSON.stringify(need)}\nTop results: ${JSON.stringify(compact)}\nPotential unmet constraints: ${JSON.stringify(unmet)}\n\nWrite a short AI overview in plain English (2-4 sentences):\n- answer the user's intent directly\n- never claim a constraint is satisfied unless explicit in data\n- if constraints are unmet, state that clearly and suggest what to relax first\n- do not mention listings outside the filtered scope as "best"\nNo markdown.`;

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

const NZ_COORDS: Record<string, [number, number]> = {
  auckland: [-36.8485, 174.7633],
  wellington: [-41.2866, 174.7756],
  christchurch: [-43.5321, 172.6362],
  hamilton: [-37.7870, 175.2793],
  dunedin: [-45.8788, 170.5028],
  nelson: [-41.2706, 173.2840],
  lincoln: [-43.640065697016475, 172.48548578309143],
  uc: [-43.5235, 172.5833],
  university_of_canterbury: [-43.5235, 172.5833],
  lu: [-43.640065697016475, 172.48548578309143],
  lincoln_university: [-43.640065697016475, 172.48548578309143],
  canterbury: [-43.5, 171.5],
  selwyn: [-43.65, 172.25],
  palmerston_north: [-40.3564, 175.6111],
  tauranga: [-37.6878, 176.1651],
  rotorua: [-38.1368, 176.2497],
  napier: [-39.4928, 176.9120],
  hastings: [-39.6381, 176.8495],
  new_plymouth: [-39.0556, 174.0752],
  whangarei: [-35.7251, 174.3237],
  invercargill: [-46.4132, 168.3538],
  queenstown: [-45.0312, 168.6626]
};

function normalizePlaceKey(s?: string | null): string | null {
  if (!s) return null;
  const t = String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t || null;
}

function findCoordFromText(input?: string | null): [number, number] | null {
  const key = normalizePlaceKey(input);
  if (!key) return null;

  if (NZ_COORDS[key]) return NZ_COORDS[key];

  const parts = key.split(/\s|,/).filter(Boolean);
  for (const p of parts) {
    if (NZ_COORDS[p]) return NZ_COORDS[p];
  }

  // Handle two-word keys like "palmerston north" / "new plymouth"
  for (let i = 0; i < parts.length - 1; i++) {
    const two = `${parts[i]}_${parts[i + 1]}`;
    if (NZ_COORDS[two]) return NZ_COORDS[two];
  }

  return null;
}

function distanceKm(a: [number, number], b: [number, number]): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function applyDistanceFilter(results: any[], need: Need, maxKm = 50): any[] {
  const anchorText = need.city || need.suburb || need.nearSchool || null;
  const anchor = findCoordFromText(anchorText);
  if (!anchor) return results;

  return results.filter((row) => {
    const target = findCoordFromText(row?.city || row?.near_school || row?.title || '');
    if (!target) return true; // unknown location: keep for now
    return distanceKm(anchor, target) <= maxKm;
  });
}

function normalizeSchoolName(input?: string | null): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandSchoolAliases(input?: string | null): string[] {
  const s = normalizeSchoolName(input);
  if (!s) return [];

  const out = new Set<string>([s]);

  // University of Canterbury aliases
  if (/(\buc\b|university of canterbury|canterbury university)/.test(s)) {
    out.add('uc');
    out.add('university of canterbury');
    out.add('canterbury university');
  }

  // Lincoln University aliases
  if (/(\blu\b|lincoln university)/.test(s)) {
    out.add('lu');
    out.add('lincoln university');
  }

  // University of Auckland aliases
  if (/(\buoa\b|university of auckland|auckland university)/.test(s)) {
    out.add('uoa');
    out.add('university of auckland');
    out.add('auckland university');
  }

  // AUT aliases
  if (/(\baut\b|auckland university of technology)/.test(s)) {
    out.add('aut');
    out.add('auckland university of technology');
  }

  return Array.from(out);
}

function isGenericUniversityOnly(input?: string | null): boolean {
  const s = normalizeSchoolName(input);
  return !!s && /\buniversity\b/.test(s) && !/\b(of|aut|uoa|uc|lu|lincoln|canterbury|auckland|waikato|otago|massey|victoria)\b/.test(s);
}

function canonicalizeNearSchool(input?: string | null): string | undefined {
  const s = normalizeSchoolName(input);
  if (!s) return undefined;

  if (/(\blu\b|lincoln university)/.test(s)) return 'Lincoln University';
  if (/(\buc\b|university of canterbury|canterbury university)/.test(s)) return 'University of Canterbury';
  if (/(\buoa\b|university of auckland|auckland university)/.test(s)) return 'University of Auckland';
  if (/(\baut\b|auckland university of technology)/.test(s)) return 'AUT';

  return typeof input === 'string' ? input.trim() || undefined : undefined;
}

function inferNearSchoolFromMessage(message: string): string | undefined {
  const s = normalizeSchoolName(message);
  if (!s) return undefined;

  if (/(\blu\b|lincoln university)/.test(s)) return 'Lincoln University';
  if (/(\buc\b|university of canterbury|canterbury university)/.test(s)) return 'University of Canterbury';
  if (/(\buoa\b|university of auckland|auckland university)/.test(s)) return 'University of Auckland';
  if (/(\baut\b|auckland university of technology)/.test(s)) return 'AUT';

  return undefined;
}

function applyNearSchoolStrictFilter(results: any[], need: Need): any[] {
  if (!need.nearSchool) return results;

  const aliases = expandSchoolAliases(need.nearSchool);
  if (aliases.length === 0) return results;

  return results.filter((row) => {
    const near = normalizeSchoolName(row?.near_school || '');
    if (!near) return false;

    if (isGenericUniversityOnly(near)) return false;

    return aliases.some((alias) => {
      if (!alias) return false;
      if (alias.length <= 3) {
        const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
        return re.test(near);
      }
      return near.includes(alias);
    });
  });
}

async function rankResultsWithAI(message: string, need: Need, candidates: any[]): Promise<any[]> {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  if (!apiKey) return candidates;

  const compact = candidates.slice(0, 40).map((r) => ({
    id: r.id,
    title: r.title,
    city: r.city,
    price: r.price_nzd_week,
    furnished: !!r.furnished,
    billsIncluded: !!r.bills_included,
    nearSchool: r.near_school || null
  }));

  const prompt = `You rank rental listings for user intent.\nReturn strict JSON only: {"ids":[...]} where ids are listing ids ordered best->worst.\nIf none suitable return {"ids":[]}.\n\nUser query: ${message}\nParsed need: ${JSON.stringify(need)}\nCandidates: ${JSON.stringify(compact)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);
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
          { role: 'system', content: 'You are a strict JSON ranker for rental search relevance.' },
          { role: 'user', content: prompt }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return candidates;

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return candidates;

    const normalized = String(text).trim();
    const candidateJson = normalized.startsWith('{') ? normalized : (normalized.match(/\{[\s\S]*\}/)?.[0] || '');
    if (!candidateJson) return candidates;

    const parsed = JSON.parse(candidateJson);
    const ids = Array.isArray(parsed?.ids) ? parsed.ids.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x)) : [];
    if (!ids.length) return [];

    const byId = new Map<number, any>(candidates.map((x) => [Number(x.id), x]));
    const ranked = ids.map((id: number) => byId.get(id)).filter((x: any): x is any => Boolean(x));
    const leftovers = candidates.filter((x) => !ids.includes(Number(x.id)));
    return [...ranked, ...leftovers];
  } catch {
    return candidates;
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

    const ruleNeed = parseNeedRuleBased(userText);
    const aiNeed = await parseNeedAI(userText);
    const parsedNeed: Need = {
      ...ruleNeed,
      ...(aiNeed || {}),
      // Hard-priority for explicit rule-detected constraints from user text.
      nearSchool: ruleNeed.nearSchool || asSafeString(aiNeed?.nearSchool),
      city: ruleNeed.city || asSafeString(aiNeed?.city),
      suburb: ruleNeed.suburb || asSafeString(aiNeed?.suburb),
      maxPrice: ruleNeed.maxPrice || (typeof aiNeed?.maxPrice === 'number' ? aiNeed.maxPrice : undefined),
      furnished: typeof ruleNeed.furnished === 'boolean' ? ruleNeed.furnished : (typeof aiNeed?.furnished === 'boolean' ? aiNeed.furnished : undefined),
      billsIncluded: typeof ruleNeed.billsIncluded === 'boolean' ? ruleNeed.billsIncluded : (typeof aiNeed?.billsIncluded === 'boolean' ? aiNeed.billsIncluded : undefined),
      queryText: asSafeString(aiNeed?.queryText) || userText
    };

    const forcedNearSchool = inferNearSchoolFromMessage(userText);

    const need: Need = {
      ...parsedNeed,
      city: asSafeString(parsedNeed.city),
      suburb: asSafeString(parsedNeed.suburb),
      nearSchool: forcedNearSchool || canonicalizeNearSchool(asSafeString(parsedNeed.nearSchool)),
      queryText: asSafeString(parsedNeed.queryText) || userText
    };
    const region = detectSearchRegion(userText, need);

    const rawResults = await searchListings(need);

    const relaxedNeed: Need = {
      ...need,
      nearSchool: undefined,
      furnished: undefined,
      billsIncluded: undefined
    };
    const relaxedResults = await searchListings(relaxedNeed);

    const mergedMap = new Map<number, any>();
    [...rawResults, ...relaxedResults].forEach((r) => mergedMap.set(Number(r.id), normalizeListingConsistency(r)));
    const merged = dedupeListings(Array.from(mergedMap.values()));

    const relevant = pickRelevantInternalResults(merged);
    const basePool = relevant.length ? relevant : merged;

    const regionResults = region === 'vn'
      ? basePool.filter(isVietnamLikeListing)
      : basePool;

    const distanceFiltered = applyDistanceFilter(regionResults, need, 50);
    const aiRanked = await rankResultsWithAI(userText, need, distanceFiltered);

    const strictSchoolFiltered = applyNearSchoolStrictFilter(aiRanked, need);
    const schoolScoped = need.nearSchool
      ? (strictSchoolFiltered.length ? strictSchoolFiltered : aiRanked)
      : aiRanked;

    const hardConstrained = applyHardConstraintsWithFallback(schoolScoped, need);
    const results = applyPreferenceSignals(hardConstrained, need);

    const detailBits: string[] = [];
    if (need.city) detailBits.push(`in ${need.city}`);
    if (need.maxPrice) detailBits.push(`under ${need.maxPrice} NZD/week`);
    if (need.suburb) detailBits.push(`around ${need.suburb}`);
    if (need.furnished) detailBits.push('furnished');
    if (need.billsIncluded) detailBits.push('bills included');
    if (need.nearSchool) detailBits.push(`near ${need.nearSchool}`);
    if (need.femalePreferred) detailBits.push('female preferred');
    if (need.requiresDesk) detailBits.push('study desk');

    const mode = 'AI-ranking (semantic)';
    const reply = results.length
      ? `Found ${results.length} matching options${detailBits.length ? ` (${detailBits.join(', ')})` : ''}. (${mode})`
      : 'No matching listings yet. Try increasing budget, expanding location, or removing one filter.';

    const shortNoResultHint = !results.length && isShortQuery(userText) && !hasAnyStructuredFilter(need)
      ? shortQuerySuggestion(userText)
      : null;

    const wantsExternal = /(\bexternal\b|\bweb\b|ngoài|outside)/i.test(userText);
    const shouldFetchExternal = results.length < 5 || wantsExternal;
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
