'use client';

import { useEffect, useState } from 'react';

type Listing = {
  id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  furnished: boolean;
  bills_included: boolean;
  near_school: string | null;
  female_friendly: boolean;
  has_desk: boolean;
  description: string | null;
  image_urls: string[];
  source_url: string | null;
  is_featured: boolean;
};

export default function ComparePage() {
  const [ids, setIds] = useState<number[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ids') || '';
    const parsed = raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
    setIds(parsed);
  }, []);

  useEffect(() => {
    if (ids.length === 0) return;
    Promise.all(
      ids.map((id) =>
        fetch(`/api/listings?id=${id}`)
          .then((r) => r.json())
          .then((d) => d.item || d)
          .catch(() => null)
      )
    ).then((results) => setListings(results.filter(Boolean)));
  }, [ids]);

  if (ids.length === 0) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 32, textAlign: 'center' }}>
        <h1>Compare Listings</h1>
        <p style={{ color: '#6b7280' }}>Add listings to compare from search results.</p>
      </main>
    );
  }

  const rows = [
    { label: 'Price', key: 'price_nzd_week', format: (v: any) => `$${v}/week` },
    { label: 'City', key: 'city' },
    { label: 'Furnished', key: 'furnished', format: (v: any) => v ? '✅ Yes' : '❌ No' },
    { label: 'Bills Included', key: 'bills_included', format: (v: any) => v ? '✅ Yes' : '❌ No' },
    { label: 'Near School', key: 'near_school', format: (v: any) => v || '—' },
    { label: 'Female Friendly', key: 'female_friendly', format: (v: any) => v ? '✅ Yes' : '—' },
    { label: 'Study Desk', key: 'has_desk', format: (v: any) => v ? '✅ Yes' : '—' },
    { label: 'Featured', key: 'is_featured', format: (v: any) => v ? '⭐ Yes' : '—' }
  ];

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>Compare Listings</h1>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}></th>
              {listings.map((l) => (
                <th key={l.id} style={{ textAlign: 'center', padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>
                  {l.image_urls?.[0] ? (
                    <img src={l.image_urls[0]} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
                  ) : null}
                  <a href={`/listing/${l.id}`} style={{ fontWeight: 700, color: '#111827', textDecoration: 'none', fontSize: 13 }}>
                    {l.title}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{row.label}</td>
                {listings.map((l) => {
                  const val = (l as any)[row.key];
                  const display = row.format ? row.format(val) : (val ?? '—');
                  return (
                    <td key={l.id} style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', color: '#1f2937' }}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
