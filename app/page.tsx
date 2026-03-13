'use client';

import { useState } from 'react';
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
};

export default function HomePage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('Room under 250 NZD/week near LU in Lincoln, furnished, bills included');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);

  async function run() {
    setLoading(true);
    setReply('');
    setHits([]);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: query })
    });
    const data = await res.json();
    setReply(data.reply || data.error || 'No reply');
    setHits(data.results || []);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px 80px' }}>
      <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 24 }}>
        {session?.user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#3c4043' }}>
            <span>
              Hello {session.user.name || session.user.email?.split('@')[0] || 'there'}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              style={{ border: '1px solid #dadce0', borderRadius: 999, padding: '6px 12px', background: '#fff' }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/login" style={{ border: '1px solid #dadce0', borderRadius: 999, padding: '6px 12px', textDecoration: 'none', color: '#1a73e8' }}>
              Log in
            </a>
          </div>
        )}
      </header>

      <section style={{ textAlign: 'center', marginBottom: 26 }}>
        <div style={{ fontSize: 54, fontWeight: 700, letterSpacing: -1, marginBottom: 14 }}>
          <span style={{ color: '#4285F4' }}>R</span>
          <span style={{ color: '#EA4335' }}>e</span>
          <span style={{ color: '#FBBC05' }}>n</span>
          <span style={{ color: '#4285F4' }}>t</span>
          <span style={{ color: '#34A853' }}>F</span>
          <span style={{ color: '#EA4335' }}>i</span>
          <span style={{ color: '#4285F4' }}>n</span>
          <span style={{ color: '#34A853' }}>d</span>
          <span style={{ color: '#FBBC05' }}>e</span>
          <span style={{ color: '#EA4335' }}>r</span>
        </div>

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
            placeholder="Search rentals in natural language..."
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
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <p style={{ marginTop: 12, color: '#5f6368', fontSize: 13 }}>
          <a href="/post">Create listing</a>
        </p>
      </section>

      {reply && (
        <section style={{ marginBottom: 18, color: '#3c4043', fontSize: 15 }}>
          <strong>Assistant:</strong> {reply}
        </section>
      )}

      {hits.length > 0 && (
        <section>
          {hits.map((h) => {
            const gallery = normalizeImageUrls(h.image_urls);
            return (
              <article key={h.id} style={{ borderTop: '1px solid #eee', padding: '18px 0' }}>
                <h3 style={{ margin: 0, color: '#1a0dab', fontSize: 20 }}>{h.title}</h3>
                <div style={{ color: '#006621', fontSize: 13, marginTop: 3 }}>{h.source_url}</div>
                <div style={{ marginTop: 6, color: '#4d5156' }}>
                  {h.city} · ${h.price_nzd_week}/week · {h.furnished ? 'furnished' : 'unfurnished'} ·{' '}
                  {h.bills_included ? 'bills included' : 'bills separate'}
                  {h.near_school ? ` · near ${h.near_school}` : ''}
                </div>
                {h.description ? <p style={{ margin: '8px 0 10px', color: '#4d5156' }}>{h.description}</p> : null}

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
    </main>
  );
}
