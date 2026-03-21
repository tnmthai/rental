'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSession, signOut } from 'next-auth/react';

function normalizeImageUrls(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String).filter(Boolean);
  if (typeof input === 'string') {
    return input
      .split(/\r?\n|,/) 
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function extractKeywords(query: string): string[] {
  const stop = new Set([
    'room', 'house', 'flat', 'in', 'near', 'under', 'over', 'with', 'and', 'or',
    'the', 'a', 'an', 'nzd', 'week', 'wk', 'per', 'for', 'included', 'include'
  ]);
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && !stop.has(w))
    )
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, keywords: string[]) {
  if (!text || keywords.length === 0) return text;
  const pattern = keywords.map(escapeRegExp).join('|');
  if (!pattern) return text;
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    const hit = keywords.some((k) => part.toLowerCase() === k.toLowerCase());
    if (!hit) return <span key={idx}>{part}</span>;
    return (
      <mark key={idx} style={{ background: '#fff59d', padding: '0 2px', borderRadius: 3 }}>
        {part}
      </mark>
    );
  });
}

function formatDescription(text: string): string[] {
  return text
    .replace(/\s*•\s*/g, '\n• ')
    .replace(/\s+[-–—]\s+/g, '\n- ')
    .replace(/\s*\|\s*/g, '\n')
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function sanitizeDescriptionHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

function hasHtmlTags(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

function shouldHideDescription(description?: string | null, sourceUrl?: string | null): boolean {
  if (!description) return false;
  const isRoomiesSource = /roomies\.co\.nz/i.test(sourceUrl || '');
  const hasExternalPrefix = /^\s*\[External listing from Roomies\]/i.test(description);
  return isRoomiesSource && hasExternalPrefix;
}

const NZ_COORDS: Record<string, [number, number]> = {
  auckland: [-36.8485, 174.7633],
  wellington: [-41.2866, 174.7756],
  christchurch: [-43.5321, 172.6362],
  hamilton: [-37.787, 175.2793],
  dunedin: [-45.8788, 170.5028],
  nelson: [-41.2706, 173.284],
  lincoln: [-43.6458, 172.4704],
  rolleston: [-43.5947, 172.3822],
  palmerston_north: [-40.3564, 175.6111],
  tauranga: [-37.6878, 176.1651],
  rotorua: [-38.1368, 176.2497],
  napier: [-39.4928, 176.912],
  hastings: [-39.6381, 176.8495],
  new_plymouth: [-39.0556, 174.0752],
  whangarei: [-35.7251, 174.3237],
  invercargill: [-46.4132, 168.3538],
  queenstown: [-45.0312, 168.6626],
  wanaka: [-44.6967, 169.1367],
  blenheim: [-41.5134, 173.9612],
  gisborne: [-38.6623, 178.0176],
  masterton: [-40.9497, 175.6573],
  whanganui: [-39.9333, 175.05],
  canterbury: [-43.5, 171.5],
  selwyn: [-43.65, 172.25],
  northland: [-35.6, 174.3],
  waikato: [-37.7833, 175.2833],
  otago: [-45.2, 170.3],
  southland: [-46.2, 168.4]
};

function normalizePlaceKey(s?: string | null): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(district|city|region)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCoordsFromCity(city?: string | null): { lat: number; lng: number } | null {
  const normalized = normalizePlaceKey(city);
  if (!normalized) return null;

  const parts = normalized.split(',').map((x) => x.trim()).filter(Boolean);
  const candidates = parts.length ? [...parts, ...[...parts].reverse(), normalized] : [normalized];

  for (const c of candidates) {
    const words = c.split(/\s+/).filter(Boolean);
    if (NZ_COORDS[c]) return { lat: NZ_COORDS[c][0], lng: NZ_COORDS[c][1] };
    const compact = c.replace(/\s+/g, '_');
    if (NZ_COORDS[compact]) return { lat: NZ_COORDS[compact][0], lng: NZ_COORDS[compact][1] };

    for (let i = 0; i < words.length; i++) {
      if (NZ_COORDS[words[i]]) return { lat: NZ_COORDS[words[i]][0], lng: NZ_COORDS[words[i]][1] };
      if (i < words.length - 1) {
        const two = `${words[i]}_${words[i + 1]}`;
        if (NZ_COORDS[two]) return { lat: NZ_COORDS[two][0], lng: NZ_COORDS[two][1] };
      }
    }
  }

  return null;
}

function normalizeCoordScale(value: number, maxAbs: number): number {
  if (!Number.isFinite(value)) return value;
  let v = value;

  // Heal malformed numeric coordinates where decimal separator is lost,
  // e.g. 17248094250846224 -> 172.48094250846224
  // Keep scaling down until value is in valid range.
  let guard = 0;
  while (Math.abs(v) > maxAbs && guard < 20) {
    v = v / 10;
    guard += 1;
  }

  return v;
}

function normalizeCoords(lat?: number | string | null, lng?: number | string | null, city?: string | null): { lat: number; lng: number } | null {
  const missingCoords = lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '';
  if (missingCoords) {
    // Only fall back to town/city center when coordinates are missing.
    return inferCoordsFromCity(city);
  }

  let la = Number(lat);
  let lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;

  la = normalizeCoordScale(la, 90);
  lo = normalizeCoordScale(lo, 180);

  // Auto-fix swapped input: lat should be [-90, 90], lng should be [-180, 180].
  if (Math.abs(la) > 90 && Math.abs(lo) <= 90) {
    return { lat: lo, lng: la };
  }

  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
  return { lat: la, lng: lo };
}

type Hit = {
  id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  source_url: string;
  image_urls?: string[];
  description?: string | null;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string | null;
  available_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ExternalHit = {
  title: string;
  url: string;
  snippet?: string;
  source: 'web';
};

async function trackClientEvent(event_name: 'contact_click' | 'share_click', listing_id?: number) {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_name, listing_id: listing_id || null })
    });
  } catch {}
}

const I18N = {
  en: {
    aiNote: 'AI Note',
    signOut: 'Sign out',
    logIn: 'Log in',
    searchPlaceholder: 'Search rentals in natural language...',
    searching: 'Searching...',
    search: 'Search',
    save: 'Save',
    createListing: 'Create listing',
    myDashboard: 'My dashboard',
    aiOverview: 'AI Overview',
    internalListings: 'Our internal listings',
    viewDetail: 'View detail',
    share: 'Share',
    readMore: 'Read more',
    readLess: 'Read less',
    externalSuggestions: 'External web suggestions',
    externalHint: 'These are web results outside our internal database.',
    visits: 'visits',
    online: 'online',
    language: 'Language',
    english: 'English',
    vietnamese: 'Vietnamese',
    saveNeedLogin: 'Please log in first.',
    saveOk: 'Saved search created.',
    saveFail: 'Failed to save',
    searchingOverview1: 'Reading your request and extracting filters…',
    searchingOverview2: 'Checking internal listings and ranking best matches…',
    searchingOverview3: 'Almost done — preparing summary and suggestions…',
    noSource: '(no source url)',
    furnished: 'furnished',
    unfurnished: 'unfurnished',
    billsIncluded: 'bills included',
    billsSeparate: 'bills separate',
    near: 'near',
    available: 'available'
  },
  vi: {
    aiNote: 'Ghi chú AI',
    signOut: 'Đăng xuất',
    logIn: 'Đăng nhập',
    searchPlaceholder: 'Tìm nhà thuê bằng ngôn ngữ tự nhiên...',
    searching: 'Đang tìm...',
    search: 'Tìm',
    save: 'Lưu',
    createListing: 'Đăng tin',
    myDashboard: 'Bảng điều khiển',
    aiOverview: 'Tóm tắt AI',
    internalListings: 'Danh sách nội bộ',
    viewDetail: 'Xem chi tiết',
    share: 'Chia sẻ',
    readMore: 'Xem thêm',
    readLess: 'Thu gọn',
    externalSuggestions: 'Gợi ý từ web bên ngoài',
    externalHint: 'Đây là kết quả ngoài cơ sở dữ liệu nội bộ.',
    visits: 'lượt truy cập',
    online: 'đang online',
    language: 'Ngôn ngữ',
    english: 'English',
    vietnamese: 'Tiếng Việt',
    saveNeedLogin: 'Vui lòng đăng nhập trước.',
    saveOk: 'Đã lưu tìm kiếm.',
    saveFail: 'Lưu thất bại',
    searchingOverview1: 'Đang đọc yêu cầu và tách bộ lọc…',
    searchingOverview2: 'Đang kiểm tra dữ liệu nội bộ và xếp hạng kết quả…',
    searchingOverview3: 'Sắp xong — đang chuẩn bị tóm tắt và gợi ý…',
    noSource: '(không có nguồn)',
    furnished: 'đầy đủ nội thất',
    unfurnished: 'không nội thất',
    billsIncluded: 'đã gồm hóa đơn',
    billsSeparate: 'chưa gồm hóa đơn',
    near: 'gần',
    available: 'có thể ở từ'
  }
} as const;

const ListingMap = dynamic(() => import('./components/ListingMap'), { ssr: false });

type Lang = keyof typeof I18N;

export default function HomePage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('Room under 250 NZD/week near LU in Lincoln, furnished, bills included');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [aiOverview, setAiOverview] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [externalHits, setExternalHits] = useState<ExternalHit[]>([]);
  const [saveMsg, setSaveMsg] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [showAIDisclaimer, setShowAIDisclaimer] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [expandedDesc, setExpandedDesc] = useState<Record<number, boolean>>({});
  const keywords = useMemo(() => extractKeywords(query), [query]);
  const t = I18N[lang];
  const mapPoints = useMemo(
    () =>
      hits
        .map((h) => {
          const c = normalizeCoords(h.latitude, h.longitude, h.city);
          if (!c) return null;
          return {
            id: h.id,
            title: h.title,
            city: h.city,
            price_nzd_week: h.price_nzd_week,
            lat: c.lat,
            lng: c.lng
          };
        })
        .filter(Boolean) as Array<{ id: number; title: string; city: string; price_nzd_week: number; lat: number; lng: number }>,
    [hits]
  );

  async function run() {
    setLoading(true);
    setReply('');
    setHits([]);
    setExternalHits([]);

    const loadingSteps = [t.searchingOverview1, t.searchingOverview2, t.searchingOverview3];
    let step = 0;
    setAiOverview(loadingSteps[step]);
    const timer = setInterval(() => {
      step = Math.min(step + 1, loadingSteps.length - 1);
      setAiOverview(loadingSteps[step]);
    }, 900);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      const data = await res.json();
      setReply(data.reply || data.error || 'No reply');
      setAiOverview(data.aiOverview || '');
      setHits(data.results || []);
      setExternalHits(data.externalResults || []);
    } catch {
      setReply('Search failed. Please try again.');
      setAiOverview('');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  async function saveSearch() {
    if (!session?.user) {
      setSaveMsg(t.saveNeedLogin);
      return;
    }
    const res = await fetch('/api/my/saved-searches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Quick saved search', query })
    });
    const data = await res.json();
    setSaveMsg(res.ok ? t.saveOk : data.error || t.saveFail);
  }

  useEffect(() => {
    let timer: any;
    async function pollAdminCount() {
      const res = await fetch('/api/admin/moderation/count');
      if (!res.ok) return;
      const data = await res.json();
      const count = Number(data.pending_count || 0);
      setPendingCount(count);
      const key = 'admin_last_seen_pending_count';
      const lastSeen = Number(localStorage.getItem(key) || 0);
      setNewCount(Math.max(count - lastSeen, 0));
    }
    if (session?.user) {
      pollAdminCount();
      timer = setInterval(pollAdminCount, 20000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [session?.user]);

  useEffect(() => {
    async function trackVisit() {
      const key = 'rf_visit_counted';
      if (!sessionStorage.getItem(key)) {
        const r = await fetch('/api/metrics/visits', { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        if (typeof j.total === 'number') setVisitCount(j.total);
        sessionStorage.setItem(key, '1');
      } else {
        const r = await fetch('/api/metrics/visits');
        const j = await r.json().catch(() => ({}));
        if (typeof j.total === 'number') setVisitCount(j.total);
      }
    }
    trackVisit();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('rf_lang');
    if (saved === 'en' || saved === 'vi') setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('rf_lang', lang);
  }, [lang]);

  useEffect(() => {
    const storageKey = 'rf_online_session_id';
    let sessionId = localStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
      localStorage.setItem(storageKey, sessionId);
    }

    let timer: any;

    async function trackOnline() {
      const r = await fetch('/api/metrics/online', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const j = await r.json().catch(() => ({}));
      if (typeof j.online === 'number') setOnlineCount(j.online);
    }

    trackOnline();
    timer = setInterval(trackOnline, 45000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  function markAdminSeen() {
    localStorage.setItem('admin_last_seen_pending_count', String(pendingCount));
    setNewCount(0);
  }

  return (
    <main
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: '8px 16px 80px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        className="home-topbar"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: 82,
          gap: 12,
          width: '100vw',
          position: 'relative',
          left: '50%',
          marginLeft: '-50vw',
          padding: '0 56px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAIDisclaimer((v) => !v)}
            style={{
              border: '1px solid #d0d5dd',
              borderRadius: 999,
              padding: '6px 12px',
              background: '#fff',
              color: '#344054',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {t.aiNote}
          </button>
          {showAIDisclaimer ? (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                zIndex: 20,
                width: 380,
                maxWidth: '90vw',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fffef7',
                color: '#444',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                padding: '10px 12px',
                fontSize: 12,
                lineHeight: 1.45,
                whiteSpace: 'pre-line'
              }}
            >
              {`This app is made with AI, so you might see weird highlights or other small issues. Please ignore the bugs.\n\n\nThanks for understanding.`}
            </div>
          ) : null}
        </div>

        {session?.user ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#3c4043' }}>
            {(pendingCount > 0 || newCount > 0) ? (
              <a
                href="/admin/moderation"
                onClick={markAdminSeen}
                style={{ position: 'relative', textDecoration: 'none', fontSize: 18, lineHeight: 1, marginTop: 7 }}
                title="Moderation notifications"
              >
                🔔
                <span
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -10,
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: 999,
                    minWidth: 18,
                    height: 18,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '0 4px'
                  }}
                >
                  {newCount > 0 ? newCount : pendingCount}
                </span>
              </a>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                style={{ border: '1px solid #dadce0', borderRadius: 999, padding: '6px 12px', background: '#fff' }}
              >
                {t.signOut}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#5f6368' }}>
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt="profile"
                    style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #e5e7eb' }}
                  />
                ) : null}
                <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                  <div style={{ color: '#3c4043', fontWeight: 600 }}>{session.user.name || 'Google user'}</div>
                  <div>{session.user.email || ''}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/login" style={{ border: '1px solid #dadce0', borderRadius: 999, padding: '6px 12px', textDecoration: 'none', color: '#1a73e8' }}>
              {t.logIn}
            </a>
          </div>
        )}
      </header>

      <section style={{ textAlign: 'center', marginBottom: 26 }}>
        <a
          href="/"
          style={{
            display: 'inline-block',
            fontSize: 54,
            fontWeight: 800,
            letterSpacing: -1,
            marginBottom: 14,
            textDecoration: 'none',
            background: 'linear-gradient(90deg, #ff0000 0%, #ff7f00 20%, #ffd600 40%, #1e88e5 60%, #00c853 80%, #ff0000 100%)',
            backgroundSize: '250% 100%',
            animation: 'rainbowShift 14s ease-in-out infinite',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}
          title="Back to home"
        >
          RentFinder
        </a>

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: 10,
            border: '1px solid #dfe1e5',
            borderRadius: 999,
            boxShadow: '0 1px 6px rgba(32,33,36,.1)',
            background: '#fff'
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, padding: '8px 10px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run();
            }}
          />
          <button
            onClick={run}
            disabled={loading}
            style={{ border: 'none', borderRadius: 999, padding: '10px 18px', background: '#1a73e8', color: '#fff' }}
          >
            {loading ? t.searching : t.search}
          </button>
          <button
            onClick={saveSearch}
            style={{ border: '1px solid #dfe1e5', borderRadius: 999, padding: '10px 14px', background: '#fff' }}
          >
            {t.save}
          </button>
        </div>

        <p style={{ marginTop: 12, color: '#5f6368', fontSize: 13 }}>
          <a href="/post">{t.createListing}</a> · <a href="/dashboard">{t.myDashboard}</a>
        </p>
        {saveMsg ? <p style={{ marginTop: 4, fontSize: 12, color: '#5f6368' }}>{saveMsg}</p> : null}
      </section>

      {(aiOverview || reply) && (
        <section
          style={{
            marginBottom: 18,
            color: '#3c4043',
            fontSize: 15,
            border: '1px solid #e5e7eb',
            background: '#f8fafc',
            borderRadius: 10,
            padding: '10px 12px'
          }}
        >
          <strong>{t.aiOverview}:</strong> {aiOverview || reply}
        </section>
      )}

      {hits.length > 0 && (
        <section>
          {mapPoints.length > 0 ? <ListingMap points={mapPoints} /> : null}
          <h3 style={{ margin: '0 0 10px', color: '#111827' }}>{t.internalListings}</h3>
          {hits.map((h) => {
            const gallery = normalizeImageUrls(h.image_urls);
            return (
              <article
                key={h.id}
                style={{
                  border: '1px solid #e8ecf4',
                  borderRadius: 14,
                  padding: '14px 14px 12px',
                  marginBottom: 12,
                  background: '#fff',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#1a0dab', fontSize: 22 }}>{highlightText(h.title, keywords)}</h3>
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                      color: '#0f172a',
                      background: '#eaf2ff',
                      border: '1px solid #cfe1ff',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 14
                    }}
                  >
                    ${h.price_nzd_week}/week
                  </span>
                </div>

                <div style={{ color: '#006621', fontSize: 13, marginTop: 4 }}>
                  {h.source_url ? (
                    <a
                      href={h.source_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackClientEvent('contact_click', h.id)}
                      style={{ color: '#006621', textDecoration: 'none' }}
                    >
                      {h.source_url}
                    </a>
                  ) : (
                    t.noSource
                  )}
                </div>
                <div style={{ marginTop: 8, color: '#4d5156', fontSize: 14 }}>
                  {highlightText(h.city, keywords)} · {h.furnished ? t.furnished : t.unfurnished} · {h.bills_included ? t.billsIncluded : t.billsSeparate}
                  {h.near_school ? <> · {t.near} {highlightText(h.near_school, keywords)}</> : null}
                  {h.available_date ? <> · {t.available} {new Date(h.available_date).toLocaleDateString()}</> : null}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 13 }}>
                  <a href={`/listing/${h.id}`}>{t.viewDetail}</a>
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/listing/${h.id}`;
                      if (navigator.share) {
                        await navigator.share({ title: h.title, url }).catch(() => {});
                      } else {
                        await navigator.clipboard.writeText(url).catch(() => {});
                      }
                      trackClientEvent('share_click', h.id);
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#1a73e8', padding: 0, cursor: 'pointer' }}
                  >
                    {t.share}
                  </button>
                </div>
                {h.description && !shouldHideDescription(h.description, h.source_url) ? (
                  <div
                    style={{
                      margin: '10px 0 10px',
                      color: '#4d5156',
                      lineHeight: 1.55,
                      padding: '10px 12px',
                      background: '#f8fafc',
                      border: '1px solid #e5e7eb',
                      borderRadius: 10
                    }}
                  >
                    {hasHtmlTags(h.description) ? (
                      <div
                        className={!expandedDesc[h.id] ? 'descClamp' : undefined}
                        dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(h.description) }}
                      />
                    ) : (
                      <div className={!expandedDesc[h.id] ? 'descClamp' : undefined}>
                        {formatDescription(h.description).map((line, idx) => (
                          <p key={idx} style={{ margin: '0 0 6px' }}>
                            {line.startsWith('•') || line.startsWith('-') ? <strong>{line.slice(0, 1)} </strong> : null}
                            {highlightText(line.replace(/^[-•]\s*/, ''), keywords)}
                          </p>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setExpandedDesc((prev) => ({ ...prev, [h.id]: !prev[h.id] }))}
                      style={{ border: 'none', background: 'transparent', color: '#1a73e8', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      {expandedDesc[h.id] ? t.readLess : t.readMore}
                    </button>
                  </div>
                ) : null}

                {gallery.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, maxWidth: 650 }}>
                    {gallery.map((url, idx) => (
                      <a key={`${h.id}-${idx}`} href={url} target="_blank" title={`image-${idx + 1}`}>
                        <img
                          src={url}
                          alt={`${h.title}-${idx + 1}`}
                          style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }}
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}

      {externalHits.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: '0 0 8px', color: '#111827' }}>{t.externalSuggestions}</h3>
          <p style={{ margin: '0 0 10px', color: '#6b7280', fontSize: 13 }}>
            {t.externalHint}
          </p>
          <ul style={{ padding: 0, margin: 0 }}>
            {externalHits.map((x, idx) => (
              <li key={`${x.url}-${idx}`} style={{ listStyle: 'none', borderTop: '1px solid #eee', padding: '10px 0' }}>
                <a href={x.url} target="_blank" style={{ color: '#1a0dab', textDecoration: 'none', fontWeight: 600 }}>
                  {x.title}
                </a>
                <div style={{ color: '#006621', fontSize: 13 }}>{x.url}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 22, padding: '10px 0 4px', borderTop: '1px dashed #e5e7eb' }}>
        <h4 style={{ margin: '0 0 8px', color: '#111827' }}>Popular searches: room for rent in</h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
          <a href="/rent/auckland">Auckland</a>
          <a href="/rent/auckland-aut">Auckland (AUT)</a>
          <a href="/rent/hamilton">Hamilton</a>
          <a href="/rent/wellington">Wellington</a>
          <a href="/rent/christchurch">Christchurch</a>
          <a href="/rent/lincoln">Lincoln</a>
          <a href="/rent/dunedin">Dunedin</a>
          <a href="/rent/palmerston-north">Palmerston North</a>
        </div>
      </section>

      <footer
        style={{
          marginTop: 'auto',
          paddingTop: 14,
          borderTop: '1px solid #eceff3',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          color: '#6b7280',
          fontSize: 13
        }}
      >
        {typeof visitCount === 'number' ? <span>👀 {visitCount.toLocaleString()} {t.visits}</span> : null}
        {typeof onlineCount === 'number' ? <span>🟢 {onlineCount.toLocaleString()} {t.online}</span> : null}
        <span>🌐 {t.language}</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          aria-label={t.language}
          style={{
            border: '1px solid #d0d5dd',
            borderRadius: 999,
            padding: '6px 12px',
            background: '#fff',
            color: '#111827',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <option value="en">{t.english}</option>
          <option value="vi">{t.vietnamese}</option>
        </select>
      </footer>

      <style jsx global>{`
        @keyframes rainbowShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .descClamp {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .home-topbar {
            margin-bottom: 24px !important;
            padding: 0 14px !important;
          }
        }
      `}</style>
    </main>
  );
}
