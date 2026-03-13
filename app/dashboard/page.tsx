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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const [a, b] = await Promise.all([fetch('/api/my/listings'), fetch('/api/my/saved-searches')]);
    const aj = await a.json();
    const bj = await b.json();
    setListings(aj.items || []);
    setSaved(bj.items || []);
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
        <h2>My Listings</h2>
        <ul style={{ padding: 0 }}>
          {listings.map((l) => (
            <li key={l.id} style={{ listStyle: 'none', border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 10 }}>
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

      <section style={{ marginTop: 20 }}>
        <h2>Moderation</h2>
        <p>
          If you are admin, open <a href="/admin/moderation">/admin/moderation</a>
        </p>
      </section>
    </main>
  );
}
