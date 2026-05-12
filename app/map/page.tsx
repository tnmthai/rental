'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SubNav from '@/app/components/SubNav';

const ListingMap = dynamic(() => import('@/app/components/ListingMap'), { ssr: false });

type MapPoint = {
  id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  lat: number;
  lng: number;
};

export default function MapPage() {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/listings/map');
        const data = await res.json();
        const items = (data.items || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          city: item.city,
          price_nzd_week: item.price_nzd_week,
          lat: Number(item.latitude),
          lng: Number(item.longitude)
        })).filter((p: MapPoint) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        setPoints(items);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '18px 16px 60px' }}>
      <SubNav />
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>Map View</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b' }}>
          {loading ? 'Loading listings...' : `${points.length} approved listings shown on map`}
        </p>
      </header>

      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)'
      }}>
        <ListingMap points={points} />
      </div>

      <section style={{ marginTop: 22, padding: '14px 0', borderTop: '1px dashed #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Click any marker to see listing details. Blue markers with $/w tooltips indicate approved listings.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href="/"
              style={{
                border: '1px solid #0f766e',
                borderRadius: 999,
                padding: '8px 16px',
                textDecoration: 'none',
                color: '#0f766e',
                fontWeight: 700,
                fontSize: 14
              }}
            >
              ← Back to search
            </a>
            <a
              href="/post"
              style={{
                border: '1px solid #0f766e',
                borderRadius: 999,
                padding: '8px 16px',
                background: '#0f766e',
                textDecoration: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14
              }}
            >
              Post a listing
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
