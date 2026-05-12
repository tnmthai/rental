'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import SubNav from '@/app/components/SubNav';

type Listing = {
  id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  status: string;
  created_at: string;
  expires_at?: string | null;
};

type SavedSearch = { id: number; name: string; query: string; created_at: string };
type Favorite = {
  id: number;
  listing_id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  status: string;
  created_at: string;
};
type WantedPost = {
  id: number;
  title: string;
  city: string;
  budget_nzd_week: number;
  status: string;
  created_at: string;
  expires_at?: string | null;
};
type GrowthData = {
  windowDays: number;
  daily: Array<{ day: string; listings_new: number }>;
  baselinePerDay: number;
  targetPerDay: number;
  listingWithImagePct: number;
  listingWithContactClickPct: number;
  repeatPosterPct: number;
  eventCounts: Array<{ event_name: string; count: number }>;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [wanted, setWanted] = useState<WantedPost[]>([]);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const [a, b, c, d, e] = await Promise.all([
      fetch('/api/my/listings'),
      fetch('/api/my/saved-searches'),
      fetch('/api/admin/growth-metrics?days=14'),
      fetch('/api/my/wanted'),
      fetch('/api/my/favorites')
    ]);
    const aj = await a.json();
    const bj = await b.json();
    const cj = await c.json().catch(() => ({}));
    const dj = await d.json().catch(() => ({}));
    const ej = await e.json().catch(() => ({}));
    setListings(aj.items || []);
    setSaved(bj.items || []);
    setWanted(dj.items || []);
    setFavorites(ej.items || []);
    if (c.ok) setGrowth(cj.data || null);
  }

  useEffect(() => {
    if (session?.user) load();
  }, [session?.user]);

  async function act(listing_id: number, action: 'pause' | 'resume' | 'extend') {
    const res = await fetch('/api/my/listings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listing_id, action, days: 7 })
    });
    const data = await res.json();
    setMsg(res.ok ? `${action} done for #${listing_id}` : data.error || 'Action failed');
    await load();
  }

  async function actWanted(wanted_id: number, action: 'pause' | 'resume') {
    const res = await fetch('/api/my/wanted', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wanted_id, action })
    });
    const data = await res.json();
    setMsg(res.ok ? `${action} done for request #${wanted_id}` : data.error || 'Action failed');
    await load();
  }

  if (status === 'loading') return <main style={{ padding: 24 }}><SubNav />Loading...</main>;
  if (!session?.user)
    return (
      <main style={{ padding: 24 }}>
        <SubNav />
        <h1>My Dashboard</h1>
        <p>Please sign in first.</p>
        <button onClick={() => signIn(undefined, { callbackUrl: '/dashboard' })}>Go to login</button>
      </main>
    );

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <SubNav />
      <h1>My Dashboard</h1>
      <p>Hello {session.user.name || session.user.email}</p>
      {msg ? <p>{msg}</p> : null}

      <section style={{ marginTop: 20 }}>
        <h2>Moderation</h2>
        <p>
          If you are admin, open <a href="/admin/moderation">/admin/moderation</a>
        </p>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>My Listings</h2>
        <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4, border: '1px solid #f0f0f0', borderRadius: 10 }}>
          <ul style={{ padding: 10, margin: 0 }}>
            {listings.map((l) => (
              <li key={l.id} style={{ listStyle: 'none', border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 10, background: '#fff' }}>
                <b>{l.title}</b> · {l.city} · ${l.price_nzd_week}/week · status: {l.status}
                <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                  Created: {new Date(l.created_at).toLocaleString()} · Expires: {l.expires_at ? new Date(l.expires_at).toLocaleString() : 'N/A'}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => act(l.id, 'pause')}>Pause</button>
                  <button onClick={() => act(l.id, 'resume')}>Resume</button>
                  <button onClick={() => act(l.id, 'extend')}>Extend +7d</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>My Room Requests</h2>
        <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4, border: '1px solid #f0f0f0', borderRadius: 10 }}>
          <ul style={{ padding: 10, margin: 0 }}>
            {wanted.map((w) => (
              <li key={w.id} style={{ listStyle: 'none', border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 10, background: '#fff' }}>
                <b>{w.title}</b> · {w.city} · budget ${w.budget_nzd_week}/week · status: {w.status}
                <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                  Created: {new Date(w.created_at).toLocaleString()} · Expires: {w.expires_at ? new Date(w.expires_at).toLocaleString() : 'N/A'}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => actWanted(w.id, 'pause')}>Pause</button>
                  <button onClick={() => actWanted(w.id, 'resume')}>Resume</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Saved Listings (Favorites)</h2>
        <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4, border: '1px solid #f0f0f0', borderRadius: 10 }}>
          {favorites.length === 0 ? (
            <p style={{ padding: 12, color: '#667085' }}>No saved listings yet.</p>
          ) : (
            <ul style={{ padding: 10, margin: 0 }}>
              {favorites.map((f) => (
                <li key={f.id} style={{ listStyle: 'none', border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 10, background: '#fff' }}>
                  <a href={`/listing/${f.listing_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <b>{f.title}</b> · {f.city} · ${f.price_nzd_week}/week · status: {f.status}
                  </a>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                    Saved: {new Date(f.created_at).toLocaleString()}
                  </div>
                  <button
                    onClick={async () => {
                      await fetch('/api/my/favorites', {
                        method: 'DELETE',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ listing_id: f.listing_id })
                      });
                      await load();
                    }}
                    style={{ marginTop: 8, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Saved Searches</h2>
        <ul>
          {saved.map((s) => (
            <li key={s.id}>
              <b>{s.name}</b>: {s.query}
            </li>
          ))}
        </ul>
      </section>

      {growth ? (
        <section style={{ marginTop: 20, border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Growth Baseline (Last {growth.windowDays} days)</h2>
          <p style={{ marginTop: 0 }}>
            Baseline: <b>{growth.baselinePerDay.toFixed(2)}</b> listings/day → Target (10x): <b>{growth.targetPerDay}</b> listings/day
          </p>
          <ul>
            <li>Listing mới/ngày (avg): <b>{growth.baselinePerDay.toFixed(2)}</b></li>
            <li>% listing có ảnh: <b>{growth.listingWithImagePct.toFixed(1)}%</b></li>
            <li>% listing có contact click: <b>{growth.listingWithContactClickPct.toFixed(1)}%</b></li>
            <li>Repeat poster: <b>{growth.repeatPosterPct.toFixed(1)}%</b></li>
          </ul>

          <h3 style={{ marginBottom: 6 }}>Daily listings</h3>
          <ul>
            {growth.daily.map((d) => (
              <li key={d.day}>{d.day}: {d.listings_new}</li>
            ))}
          </ul>

          <h3 style={{ marginBottom: 6 }}>Tracked events</h3>
          <ul>
            {growth.eventCounts.map((e) => (
              <li key={e.event_name}>{e.event_name}: {e.count}</li>
            ))}
          </ul>
        </section>
      ) : null}

    </main>
  );
}
