'use client';

import { useEffect, useState } from 'react';

type Pending = { id: number; user_id: number; title: string; city: string; price_nzd_week: number; created_at: string };

export default function ModerationPage() {
  const [items, setItems] = useState<Pending[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch('/api/admin/moderation');
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || 'Forbidden');
      return;
    }
    setItems(data.items || []);
  }

  async function act(id: number, action: 'approve' | 'reject') {
    const res = await fetch('/api/admin/moderation', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listing_id: id, action })
    });
    const data = await res.json();
    setMsg(res.ok ? `${action}d #${id}` : data.error || 'failed');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1>Moderation Queue</h1>
      <p style={{ color: '#666' }}>Admin only</p>
      {msg ? <p>{msg}</p> : null}
      <ul style={{ padding: 0 }}>
        {items.map((i) => (
          <li key={i.id} style={{ listStyle: 'none', border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 10 }}>
            <b>{i.title}</b> · {i.city} · ${i.price_nzd_week}/week
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={() => act(i.id, 'approve')}>Approve</button>
              <button onClick={() => act(i.id, 'reject')}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
