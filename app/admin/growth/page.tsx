'use client';

import { useEffect, useMemo, useState } from 'react';
import SubNav from '@/app/components/SubNav';

type GrowthData = {
  windowDays: number;
  daily: Array<{ day: string; listings_new: number }>;
  baselinePerDay: number;
  targetPerDay: number;
  listingWithImagePct: number;
  listingWithContactClickPct: number;
  repeatPosterPct: number;
  eventCounts: Array<{ event_name: string; count: number }>;
};

export default function AdminGrowthPage() {
  const [days, setDays] = useState(14);
  const [data, setData] = useState<GrowthData | null>(null);
  const [msg, setMsg] = useState('');

  async function load(nextDays = days) {
    const res = await fetch(`/api/admin/growth-metrics?days=${nextDays}`);
    const j = await res.json();
    if (!res.ok) {
      setMsg(j.error || 'Forbidden');
      return;
    }
    setMsg('');
    setData(j.data || null);
  }

  useEffect(() => {
    load(days);
  }, [days]);

  const maxDaily = useMemo(() => {
    if (!data?.daily?.length) return 1;
    return Math.max(...data.daily.map((x) => x.listings_new), 1);
  }, [data]);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <SubNav />
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>Admin · Growth Dashboard</h1>
        <p style={{ color: '#667085', margin: '8px 0 0' }}>Daily baseline + event tracking health</p>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                border: '1px solid #d0d5dd',
                background: days === d ? '#111827' : '#fff',
                color: days === d ? '#fff' : '#111827',
                borderRadius: 8,
                padding: '7px 11px'
              }}
            >
              Last {d} days
            </button>
          ))}
          <a
            href="/admin/moderation"
            style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '7px 11px', textDecoration: 'none', color: '#111827' }}
          >
            Moderation
          </a>
          <a
            href="/admin/users"
            style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '7px 11px', textDecoration: 'none', color: '#111827' }}
          >
            Users
          </a>
        </div>
      </header>

      {msg ? (
        <div style={{ marginBottom: 14, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fef2f2', color: '#991b1b' }}>
          {msg}
        </div>
      ) : null}

      {data ? (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
            <MetricCard label="Baseline / day" value={data.baselinePerDay.toFixed(2)} />
            <MetricCard label="Target / day (10x)" value={String(data.targetPerDay)} />
            <MetricCard label="Listings with image" value={`${data.listingWithImagePct.toFixed(1)}%`} />
            <MetricCard label="Listings with contact click" value={`${data.listingWithContactClickPct.toFixed(1)}%`} />
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Listings per day</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {data.daily.map((d) => (
                <div key={d.day} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#475467' }}>{d.day}</div>
                  <div style={{ background: '#eef2ff', borderRadius: 999, height: 12, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max((d.listings_new / maxDaily) * 100, 2)}%`, background: '#4f46e5' }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.listings_new}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Tracked events</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.eventCounts.map((e) => (
                  <li key={e.event_name} style={{ marginBottom: 6 }}>
                    <b>{e.event_name}</b>: {e.count}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Health checks</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Repeat poster: <b>{data.repeatPosterPct.toFixed(1)}%</b></li>
                <li>Events enabled: <b>listing_created / listing_published / contact_click / share_click / renew_click</b></li>
                <li>Baseline window: <b>{data.windowDays} days</b></li>
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
      <div style={{ fontSize: 12, color: '#667085' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}
