'use client';

import { useEffect, useState } from 'react';
import SubNav from '@/app/components/SubNav';

type UserItem = {
  id: number;
  name?: string | null;
  email: string;
  provider?: string | null;
  provider_id?: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || 'Forbidden');
      return;
    }
    setItems(data.items || []);
  }

  async function removeUser(id: number, email: string) {
    const ok = window.confirm(`Delete user ${email}? This cannot be undone.`);
    if (!ok) return;

    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: id })
    });
    const data = await res.json();
    setMsg(res.ok ? `Deleted user #${id}` : data.error || 'failed');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <SubNav />
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>Admin · Users</h1>
        <p style={{ color: '#667085', margin: '8px 0 0' }}>Manage registered users</p>
      </header>

      {msg ? (
        <div style={{ marginBottom: 14, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#f8fafc' }}>
          {msg}
        </div>
      ) : null}

      <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
        <a href="/admin/moderation" style={{ color: '#1a73e8' }}>← Back to Moderation</a>
        <a href="/admin/growth" style={{ color: '#1a73e8' }}>Open Growth dashboard</a>
      </div>

      {items.length === 0 ? <p style={{ color: '#667085' }}>No users found.</p> : null}

      <ul style={{ padding: 0, margin: 0 }}>
        {items.map((u) => (
          <li key={u.id} style={{ listStyle: 'none', border: '1px solid #e5e7eb', padding: 12, borderRadius: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{u.name || 'Unnamed user'}</div>
                <div style={{ color: '#475467' }}>{u.email}</div>
                <div style={{ color: '#667085', fontSize: 13, marginTop: 4 }}>
                  Provider: {u.provider || 'email'} · Joined: {new Date(u.created_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => removeUser(u.id, u.email)}
                style={{ border: '1px solid #dc2626', background: '#dc2626', color: '#fff', borderRadius: 8, padding: '8px 12px' }}
              >
                Delete user
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
