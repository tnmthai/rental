'use client';

import { useEffect, useState } from 'react';
import SubNav from '@/app/components/SubNav';

type Wanted = {
  id: number;
  title: string;
  city: string;
  budget_nzd_week: number;
  description?: string;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string;
  created_at: string;
};

export default function WantedPage() {
  const [items, setItems] = useState<Wanted[]>([]);

  useEffect(() => {
    fetch('/api/wanted')
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <SubNav />
      <h1>Room requests (People looking for rooms)</h1>
      <p style={{ color: '#6b7280' }}>
        Looking for tenants? See what renters are asking for. <a href="/wanted/post">Post your room request</a>.
      </p>

      {items.length === 0 ? <p>No requests yet.</p> : null}

      {items.map((x) => (
        <article key={x.id} style={{ borderTop: '1px solid #eee', padding: '12px 0' }}>
          <h3 style={{ margin: '0 0 4px' }}>{x.title}</h3>
          <div style={{ color: '#4b5563' }}>
            {x.city} · Budget ${x.budget_nzd_week}/week · {x.furnished ? 'furnished preferred' : 'furnished optional'} · {x.bills_included ? 'bills included preferred' : 'bills flexible'}
            {x.near_school ? <> · near {x.near_school}</> : null}
          </div>
          {x.description ? <p style={{ margin: '6px 0 0', color: '#374151' }}>{x.description}</p> : null}
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Posted: {new Date(x.created_at).toLocaleString()}</div>
        </article>
      ))}
    </main>
  );
}
