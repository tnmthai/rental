'use client';

import { useEffect, useMemo, useState } from 'react';
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
    noSource: '(không có nguồn)',
    furnished: 'đầy đủ nội thất',
    unfurnished: 'không nội thất',
    billsIncluded: 'đã gồm hóa đơn',
    billsSeparate: 'chưa gồm hóa đơn',
    near: 'gần',
    available: 'có thể ở từ'
  }
} as const;

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

  async function run() {
    setLoading(true);
    setReply('');
    setAiOverview('');
    setHits([]);
    setExternalHits([]);
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
    setLoading(false);
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
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '8px 16px 80px' }}>
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
                {h.description ? (
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

      <footer
        style={{
          marginTop: 28,
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
