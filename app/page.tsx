'use client';

import { useState } from 'react';

type Hit = { id: number; title: string; city: string; price_nzd_week: number; source_url: string; note?: string };

export default function HomePage() {
  const [query, setQuery] = useState('Phòng dưới 250 NZD/tuần gần AUT, Auckland');
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
    setReply(data.reply || 'No reply');
    setHits(data.results || []);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1>Student Rental NZ (MVP)</h1>
      <p>Nhập nhu cầu bằng ngôn ngữ tự nhiên, app sẽ lọc listing phù hợp.</p>
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
        <section style={{ marginTop: 24 }}>
          <h2>Assistant</h2>
          <p>{reply}</p>
        </section>
      )}

      {hits.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2>Kết quả</h2>
          <ul>
            {hits.map((h) => (
              <li key={h.id} style={{ marginBottom: 8 }}>
                <b>{h.title}</b> — {h.city} — ${h.price_nzd_week}/week —{' '}
                <a href={h.source_url} target="_blank">
                  nguồn
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
