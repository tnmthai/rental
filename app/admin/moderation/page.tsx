'use client';

import { useEffect, useState } from 'react';
import SubNav from '@/app/components/SubNav';

type ListingItem = {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  title: string;
  city: string;
  price_nzd_week: number;
  source_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'paused';
};

export default function ModerationPage() {
  const [items, setItems] = useState<ListingItem[]>([]);
  const [msg, setMsg] = useState('');
  const [scope, setScope] = useState<'pending' | 'all'>('pending');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    title?: string;
    city?: string;
    price_nzd_week?: number;
    source_url?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    status?: ListingItem['status'];
  }>({});

  async function load(nextScope = scope) {
    const res = await fetch(`/api/admin/moderation?scope=${nextScope}`);
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

  async function removeListing(id: number) {
    const ok = window.confirm(`Delete listing #${id}? This cannot be undone.`);
    if (!ok) return;

    const res = await fetch('/api/admin/moderation', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listing_id: id })
    });
    const data = await res.json();
    setMsg(res.ok ? `deleted #${id}` : data.error || 'failed');
    await load();
  }

  function beginEdit(item: ListingItem) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      city: item.city,
      price_nzd_week: item.price_nzd_week,
      source_url: item.source_url || '',
      latitude: item.latitude ?? '',
      longitude: item.longitude ?? '',
      status: item.status
    });
  }

  async function saveEdit(id: number) {
    const res = await fetch('/api/admin/moderation', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        listing_id: id,
        action: 'update',
        ...draft,
        latitude:
          draft.latitude === '' || draft.latitude === null || draft.latitude === undefined
            ? null
            : Number(draft.latitude),
        longitude:
          draft.longitude === '' || draft.longitude === null || draft.longitude === undefined
            ? null
            : Number(draft.longitude)
      })
    });
    const data = await res.json();
    setMsg(res.ok ? `updated #${id}` : data.error || 'failed');
    if (res.ok) {
      setEditingId(null);
      setDraft({});
      await load();
    }
  }

  useEffect(() => {
    load(scope);
  }, [scope]);

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <SubNav />
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>Moderation Queue</h1>
        <p style={{ color: '#667085', margin: '8px 0 0' }}>Admin only · Review pending listings, browse old posts, and delete posts</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setScope('pending')}
            style={{
              border: '1px solid #d0d5dd',
              background: scope === 'pending' ? '#111827' : '#fff',
              color: scope === 'pending' ? '#fff' : '#111827',
              borderRadius: 8,
              padding: '7px 11px'
            }}
          >
            Pending only
          </button>
          <button
            onClick={() => setScope('all')}
            style={{
              border: '1px solid #d0d5dd',
              background: scope === 'all' ? '#111827' : '#fff',
              color: scope === 'all' ? '#fff' : '#111827',
              borderRadius: 8,
              padding: '7px 11px'
            }}
          >
            All posts (including old)
          </button>
          <a
            href="/admin/users"
            style={{
              border: '1px solid #d0d5dd',
              background: '#fff',
              color: '#111827',
              borderRadius: 8,
              padding: '7px 11px',
              textDecoration: 'none'
            }}
          >
            Manage users
          </a>
          <a
            href="/admin/growth"
            style={{
              border: '1px solid #d0d5dd',
              background: '#fff',
              color: '#111827',
              borderRadius: 8,
              padding: '7px 11px',
              textDecoration: 'none'
            }}
          >
            Growth dashboard
          </a>
        </div>
      </header>

      {msg ? (
        <div style={{ marginBottom: 14, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#f8fafc' }}>
          {msg}
        </div>
      ) : null}

      {items.length === 0 ? <p style={{ color: '#667085' }}>{scope === 'pending' ? 'No pending listings.' : 'No listings found.'}</p> : null}

      <ul style={{ padding: 0, margin: 0 }}>
        {items.map((i) => (
          <li
            key={i.id}
            style={{
              listStyle: 'none',
              border: '1px solid #e5e7eb',
              padding: 14,
              borderRadius: 12,
              marginBottom: 12,
              background: '#fff',
              boxShadow: '0 2px 8px rgba(16,24,40,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                {editingId === i.id ? (
                  <div style={{ display: 'grid', gap: 8, marginBottom: 8, maxWidth: 560 }}>
                    <input
                      value={String(draft.title ?? '')}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      placeholder="Title"
                      style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '8px 10px' }}
                    />
                    <input
                      value={String(draft.city ?? '')}
                      onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                      placeholder="City"
                      style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '8px 10px' }}
                    />
                    <input
                      type="number"
                      value={Number(draft.price_nzd_week ?? 0)}
                      onChange={(e) => setDraft((d) => ({ ...d, price_nzd_week: Number(e.target.value) }))}
                      placeholder="Price / week"
                      style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '8px 10px' }}
                    />
                    <input
                      value={String(draft.source_url ?? '')}
                      onChange={(e) => setDraft((d) => ({ ...d, source_url: e.target.value }))}
                      placeholder="Source URL"
                      style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '8px 10px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        type="number"
                        step="any"
                        value={String(draft.latitude ?? '')}
                        onChange={(e) => setDraft((d) => ({ ...d, latitude: e.target.value }))}
                        placeholder="Latitude"
                        style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '8px 10px' }}
                      />
                      <input
                        type="number"
                        step="any"
                        value={String(draft.longitude ?? '')}
                        onChange={(e) => setDraft((d) => ({ ...d, longitude: e.target.value }))}
                        placeholder="Longitude"
                        style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '8px 10px' }}
                      />
                    </div>
                    <select
                      value={String(draft.status ?? i.status)}
                      onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ListingItem['status'] }))}
                      style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '8px 10px', width: 180 }}
                    >
                      <option value="pending">pending</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                      <option value="paused">paused</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{i.title}</h3>
                    <div style={{ color: '#475467' }}>
                      {i.city} · ${i.price_nzd_week}/week
                    </div>
                  </>
                )}
                <div style={{ marginTop: 8, fontSize: 13, color: '#667085' }}>
                  Posted by: <b>{i.user_name || 'Unknown'}</b>
                  {i.user_email ? ` (${i.user_email})` : ''}
                </div>
                <div style={{ marginTop: 2, fontSize: 13, color: '#667085' }}>
                  Posted at: {new Date(i.created_at).toLocaleString()}
                </div>
                <div style={{ marginTop: 2, fontSize: 13, color: '#667085' }}>Status: {i.status}</div>
                <div style={{ marginTop: 6, fontSize: 13, display: 'flex', gap: 10 }}>
                  <a href={`/listing/${i.id}`} style={{ color: '#1a73e8' }}>
                    View full post
                  </a>
                  {i.source_url ? (
                    <a href={i.source_url} target="_blank" style={{ color: '#1a73e8' }}>
                      Open source ↗
                    </a>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {editingId === i.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(i.id)}
                      style={{ border: '1px solid #2563eb', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 12px' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setDraft({});
                      }}
                      style={{ border: '1px solid #d0d5dd', background: '#fff', color: '#111827', borderRadius: 8, padding: '8px 12px' }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => beginEdit(i)}
                    style={{ border: '1px solid #2563eb', background: '#fff', color: '#2563eb', borderRadius: 8, padding: '8px 12px' }}
                  >
                    Edit
                  </button>
                )}

                {i.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => act(i.id, 'approve')}
                      style={{ border: '1px solid #16a34a', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '8px 12px' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(i.id, 'reject')}
                      style={{ border: '1px solid #dc2626', background: '#fff', color: '#dc2626', borderRadius: 8, padding: '8px 12px' }}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  onClick={() => removeListing(i.id)}
                  style={{ border: '1px solid #dc2626', background: '#dc2626', color: '#fff', borderRadius: 8, padding: '8px 12px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
