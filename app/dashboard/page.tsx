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
  moderation_note?: string | null;
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
type Notification = {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  read: boolean;
  listing_id?: number | null;
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

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'approved' ? 'status-approved' :
    status === 'rejected' ? 'status-rejected' :
    status === 'pending' ? 'status-pending' :
    'status-expired';
  return <span className={`status-badge ${cls}`}>{status}</span>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [wanted, setWanted] = useState<WantedPost[]>([]);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const [a, b, c, d, e, f] = await Promise.all([
      fetch('/api/my/listings'),
      fetch('/api/my/saved-searches'),
      fetch('/api/admin/growth-metrics?days=14'),
      fetch('/api/my/wanted'),
      fetch('/api/my/favorites'),
      fetch('/api/my/notifications')
    ]);
    const aj = await a.json();
    const bj = await b.json();
    const cj = await c.json().catch(() => ({}));
    const dj = await d.json().catch(() => ({}));
    const ej = await e.json().catch(() => ({}));
    const fj = await f.json().catch(() => ({}));
    setListings(aj.items || []);
    setSaved(bj.items || []);
    setWanted(dj.items || []);
    setFavorites(ej.items || []);
    setNotifications(fj.items || []);
    if (c.ok) setGrowth(cj.data || null);
  }

  useEffect(() => {
    if (session?.user) load();
  }, [session?.user]);

  async function act(listing_id: number, action: 'pause' | 'resume' | 'extend' | 'renew') {
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

  if (status === 'loading') return <main className="page-container"><SubNav /><p className="text-muted">Loading...</p></main>;

  if (!session?.user)
    return (
      <main className="page-container">
        <SubNav />
        <h1>My Dashboard</h1>
        <p className="text-muted">Please sign in first.</p>
        <button onClick={() => signIn(undefined, { callbackUrl: '/dashboard' })} className="btn btn-blue">Go to login</button>
      </main>
    );

  return (
    <main className="page-container">
      <SubNav />
      <h1 style={{ margin: '0 0 4px' }}>My Dashboard</h1>
      <p className="text-muted">Hello {session.user.name || session.user.email}</p>
      {msg ? <p style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{msg}</p> : null}

      <section className="section" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Moderation</h2>
        <p className="text-muted">
          If you are admin, open <a href="/admin/moderation">/admin/moderation</a>
        </p>
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>My Listings</h2>
        <div className="scroll-container">
          <ul style={{ padding: 10, margin: 0 }}>
            {listings.map((l) => (
              <li key={l.id} className="list-item">
                <b>{l.title}</b> · {l.city} · ${l.price_nzd_week}/week · <StatusBadge status={l.status} />
                {l.moderation_note ? (
                  <div style={{ marginTop: 6, padding: '4px 8px', background: 'var(--status-error-bg)', border: '1px solid #fecaca', borderRadius: 6, color: 'var(--status-error)', fontSize: 13 }}>
                    Rejection reason: {l.moderation_note}
                  </div>
                ) : null}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Created: {new Date(l.created_at).toLocaleString()} · Expires: {l.expires_at ? new Date(l.expires_at).toLocaleString() : 'N/A'}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  {l.status === 'expired' ? (
                    <button onClick={() => act(l.id, 'renew')} className="btn btn-primary btn-sm">Renew (30d)</button>
                  ) : (
                    <>
                      <button onClick={() => act(l.id, 'pause')} className="btn btn-outline btn-sm">Pause</button>
                      <button onClick={() => act(l.id, 'resume')} className="btn btn-outline btn-sm">Resume</button>
                      <button onClick={() => act(l.id, 'extend')} className="btn btn-outline btn-sm">Extend +7d</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>My Room Requests</h2>
        <div className="scroll-container">
          <ul style={{ padding: 10, margin: 0 }}>
            {wanted.map((w) => (
              <li key={w.id} className="list-item">
                <b>{w.title}</b> · {w.city} · budget ${w.budget_nzd_week}/week · <StatusBadge status={w.status} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Created: {new Date(w.created_at).toLocaleString()} · Expires: {w.expires_at ? new Date(w.expires_at).toLocaleString() : 'N/A'}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => actWanted(w.id, 'pause')} className="btn btn-outline btn-sm">Pause</button>
                  <button onClick={() => actWanted(w.id, 'resume')} className="btn btn-outline btn-sm">Resume</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Notifications</h2>
        <div className="scroll-container">
          {notifications.length === 0 ? (
            <p style={{ padding: 12, color: 'var(--text-muted)' }}>No notifications yet.</p>
          ) : (
            <ul style={{ padding: 10, margin: 0 }}>
              {notifications.map((n) => (
                <li key={n.id} className="list-item" style={{ background: n.read ? '#fff' : '#f0f9ff', borderColor: n.read ? 'var(--border-default)' : '#bfdbfe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <b style={{ color: n.read ? 'var(--text-muted)' : 'var(--status-info)' }}>{n.title}</b>
                      {n.body ? <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{n.body}</div> : null}
                      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    {n.listing_id ? (
                      <a href={`/listing/${n.listing_id}`} style={{ color: 'var(--brand-blue)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>View</a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {notifications.some((n) => !n.read) ? (
          <button
            onClick={async () => {
              await fetch('/api/my/notifications', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
              await load();
            }}
            className="btn btn-outline btn-sm"
            style={{ marginTop: 8 }}
          >
            Mark all as read
          </button>
        ) : null}
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Favorites</h2>
        <div className="scroll-container">
          {favorites.length === 0 ? (
            <p style={{ padding: 12, color: 'var(--text-muted)' }}>No saved listings yet.</p>
          ) : (
            <ul style={{ padding: 10, margin: 0 }}>
              {favorites.map((f) => (
                <li key={f.id} className="list-item">
                  <a href={`/listing/${f.listing_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <b>{f.title}</b> · {f.city} · ${f.price_nzd_week}/week · <StatusBadge status={f.status} />
                  </a>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Saved: {new Date(f.created_at).toLocaleString()}
                  </div>
                  <button
                    onClick={async () => {
                      await fetch('/api/my/favorites', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ listing_id: f.listing_id }) });
                      await load();
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ marginTop: 8 }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Saved Searches</h2>
        <ul style={{ padding: 0, margin: 0 }}>
          {saved.map((s) => (
            <li key={s.id} className="list-item">
              <b>{s.name}</b>: {s.query}
            </li>
          ))}
        </ul>
      </section>

      {growth ? (
        <section className="card card-body" style={{ marginTop: 20 }}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Growth Baseline (Last {growth.windowDays} days)</h2>
          <p style={{ marginTop: 0 }}>
            Baseline: <b>{growth.baselinePerDay.toFixed(2)}</b> listings/day → Target (10x): <b>{growth.targetPerDay}</b> listings/day
          </p>
          <ul>
            <li>Listings/day (avg): <b>{growth.baselinePerDay.toFixed(2)}</b></li>
            <li>% with image: <b>{growth.listingWithImagePct.toFixed(1)}%</b></li>
            <li>% with contact click: <b>{growth.listingWithContactClickPct.toFixed(1)}%</b></li>
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
