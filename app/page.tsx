'use client';

import { useState } from 'react';

type Hit = {
  id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  source_url: string;
  image_url?: string | null;
  description?: string | null;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string | null;
};

export default function HomePage() {
  const [query, setQuery] = useState('Phòng dưới 250 NZD/tuần gần AUT, Auckland, furnished, bills included');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);

  const [form, setForm] = useState({
    title: '',
    city: 'Auckland',
    price_nzd_week: 250,
    source_url: '',
    image_url: '',
    description: '',
    furnished: true,
    bills_included: false,
    near_school: 'AUT'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

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

  async function submitListing() {
    setSubmitting(true);
    setSubmitMsg('');
    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitMsg(`Lỗi: ${data.error || 'submit failed'}`);
    } else {
      setSubmitMsg(`Đã đăng listing #${data.item.id}`);
      setForm({ ...form, title: '', source_url: '', image_url: '', description: '' });
    }
    setSubmitting(false);
  }

  return (
    <main style={{ maxWidth: 920, margin: '0 auto' }}>
      <h1>Student Rental NZ (Vòng 2)</h1>
      <p>Chat tìm phòng + form đăng tin cơ bản.</p>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h2>Tìm bằng chat</h2>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: 12 }}
        />
        <div style={{ marginTop: 12 }}>
          <button onClick={run} disabled={loading} style={{ padding: '10px 16px' }}>
            {loading ? 'Đang tìm...' : 'Tìm bằng chat'}
          </button>
        </div>

        {reply && (
          <section style={{ marginTop: 20 }}>
            <h3>Assistant</h3>
            <p>{reply}</p>
          </section>
        )}

        {hits.length > 0 && (
          <section style={{ marginTop: 20 }}>
            <h3>Kết quả</h3>
            <ul>
              {hits.map((h) => (
                <li key={h.id} style={{ marginBottom: 16, listStyle: 'none', border: '1px solid #eee', padding: 10, borderRadius: 8 }}>
                  {h.image_url ? (
                    <img
                      src={h.image_url}
                      alt={h.title}
                      style={{ width: '100%', maxWidth: 420, height: 'auto', borderRadius: 8, marginBottom: 8 }}
                    />
                  ) : null}
                  <div>
                    <b>{h.title}</b> — {h.city} — ${h.price_nzd_week}/week — {h.furnished ? 'furnished' : 'unfurnished'} —{' '}
                    {h.bills_included ? 'bills included' : 'bills separate'}
                    {h.near_school ? ` — near ${h.near_school}` : ''}
                  </div>
                  {h.description ? <p style={{ margin: '6px 0' }}>{h.description}</p> : null}
                  <a href={h.source_url} target="_blank">
                    nguồn
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16 }}>
        <h2>Đăng listing mới</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            placeholder="Tiêu đề"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input
            type="number"
            placeholder="Price NZD/week"
            value={form.price_nzd_week}
            onChange={(e) => setForm({ ...form, price_nzd_week: Number(e.target.value) })}
          />
          <input
            placeholder="Source URL"
            value={form.source_url}
            onChange={(e) => setForm({ ...form, source_url: e.target.value })}
          />
          <input
            placeholder="Image URL (vd: /uploads/auckland/room1.jpg)"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          />
          <textarea
            placeholder="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            placeholder="Near school (AUT/UoA...)"
            value={form.near_school}
            onChange={(e) => setForm({ ...form, near_school: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={form.furnished}
              onChange={(e) => setForm({ ...form, furnished: e.target.checked })}
            />{' '}
            Furnished
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.bills_included}
              onChange={(e) => setForm({ ...form, bills_included: e.target.checked })}
            />{' '}
            Bills included
          </label>
          <button onClick={submitListing} disabled={submitting} style={{ padding: '10px 16px', width: 200 }}>
            {submitting ? 'Đang gửi...' : 'Đăng listing'}
          </button>
          {submitMsg && <p>{submitMsg}</p>}
        </div>
      </section>
    </main>
  );
}
