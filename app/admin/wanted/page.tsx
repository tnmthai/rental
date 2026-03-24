'use client';

import { useEffect, useState } from 'react';
import SubNav from '@/app/components/SubNav';

type WantedItem = {
  id: number;
  title: string;
  city: string;
  budget_nzd_week: number;
  status: 'pending' | 'approved' | 'rejected' | 'paused';
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
};

export default function AdminWantedPage() {
  const [items, setItems] = useState<WantedItem[]>([]);
  const [scope, setScope] = useState<'pending' | 'all'>('pending');
  const [msg, setMsg] = useState('');

  async function load(nextScope = scope) {
    const res = await fetch(`/api/admin/wanted?scope=${nextScope}`);
    const j = await res.json();
    if (!res.ok) return setMsg(j.error || 'Forbidden');
    setItems(j.items || []);
  }

  async function act(wanted_id: number, action: 'approve' | 'reject' | 'pause') {
    const res = await fetch('/api/admin/wanted', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wanted_id, action })
    });
    const j = await res.json();
    setMsg(res.ok ? `${action}d #${wanted_id}` : j.error || 'failed');
    await load();
  }

  async function removeWanted(wanted_id: number) {
    const ok = window.confirm(`Delete room request #${wanted_id}?`);
    if (!ok) return;
    const res = await fetch('/api/admin/wanted', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wanted_id })
    });
    const j = await res.json();
    setMsg(res.ok ? `deleted #${wanted_id}` : j.error || 'failed');
    await load();
  }

  useEffect(() => {
    load(scope);
  }, [scope]);

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <SubNav />
      <h1 style={{ marginTop: 0 }}>Wanted Posts Moderation</h1>
      <p style={{ color: '#667085' }}>Admin only · Review people looking for rooms.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setScope('pending')}>Pending only</button>
        <button onClick={() => setScope('all')}>All requests</button>
        <a href="/admin/moderation">Listing moderation</a>
      </div>

      {msg ? <p>{msg}</p> : null}
      {items.length === 0 ? <p>No requests.</p> : null}

      <ul style={{ padding: 0, margin: 0 }}>
        {items.map((i) => (
          <li key={i.id} style={{ listStyle: 'none', border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <b>{i.title}</b> · {i.city} · budget ${i.budget_nzd_week}/week
            <div style={{ fontSize: 13, color: '#667085', marginTop: 5 }}>
              Status: {i.status} · Posted: {new Date(i.created_at).toLocaleString()}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {i.status === 'pending' ? (
                <>
                  <button onClick={() => act(i.id, 'approve')}>Approve</button>
                  <button onClick={() => act(i.id, 'reject')}>Reject</button>
                </>
              ) : (
                <button onClick={() => act(i.id, 'pause')}>Pause</button>
              )}
              <button onClick={() => removeWanted(i.id)} style={{ color: '#b91c1c' }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
