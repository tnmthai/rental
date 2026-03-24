'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import SubNav from '@/app/components/SubNav';

export default function WantedPostPage() {
  const { data: session } = useSession();
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    city: 'Lincoln, Canterbury',
    budget_nzd_week: 250,
    description: '',
    furnished: true,
    bills_included: false,
    near_school: 'Lincoln University',
    available_date: ''
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return setMsg('Please log in first.');

    const r = await fetch('/api/wanted', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form)
    });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'Your room request is posted.' : j.error || 'Failed to post request');
    if (r.ok) setForm({ ...form, title: '', description: '' });
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <SubNav />
      <h1>Post your room request</h1>
      <p style={{ color: '#6b7280' }}>Tell landlords what room you are looking for.</p>

      {!session?.user ? (
        <button onClick={() => signIn()} style={{ padding: '10px 14px', borderRadius: 8 }}>Log in to post</button>
      ) : null}

      <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <input placeholder="Title (e.g., Looking for furnished room near LU)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input placeholder="City / area" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input type="number" placeholder="Budget NZD/week" value={form.budget_nzd_week} onChange={(e) => setForm({ ...form, budget_nzd_week: Number(e.target.value || 0) })} />
        <input placeholder="Near university/polytechnic (optional)" value={form.near_school} onChange={(e) => setForm({ ...form, near_school: e.target.value })} />
        <label><input type="checkbox" checked={form.furnished} onChange={(e) => setForm({ ...form, furnished: e.target.checked })} /> Furnished preferred</label>
        <label><input type="checkbox" checked={form.bills_included} onChange={(e) => setForm({ ...form, bills_included: e.target.checked })} /> Bills included preferred</label>
        <input type="date" value={form.available_date} onChange={(e) => setForm({ ...form, available_date: e.target.value })} />
        <textarea placeholder="Description (move-in date, lifestyle, preferences...)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} />

        <button type="submit" style={{ padding: '10px 14px', borderRadius: 8 }}>Post request</button>
      </form>

      {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}
    </main>
  );
}
