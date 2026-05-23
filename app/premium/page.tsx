'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function PremiumPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<number | null>(null);

  async function subscribe(plan: number) {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setLoading(null);
    }
  }

  const features = [
    { icon: '♾️', title: 'Unlimited listings', desc: 'Post as many rooms as you want' },
    { icon: '📊', title: 'Analytics dashboard', desc: 'See views, clicks, and engagement' },
    { icon: '✅', title: 'Verified badge', desc: 'Build trust with a verified landlord badge' },
    { icon: '⭐', title: '1 free boost/month', desc: 'Feature 1 listing per month at no extra cost' },
    { icon: '🔔', title: 'Priority notifications', desc: 'Your listings appear first in search alerts' },
    { icon: '💬', title: 'Priority support', desc: 'Get help within 24 hours' }
  ];

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
          ⭐ RentFinder Premium
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 500, margin: '0 auto' }}>
          Supercharge your listings. Get more views, more tenants, and powerful tools.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 40 }}>
        {features.map((f) => (
          <div key={f.title} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{f.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ padding: 24, border: '2px solid #e5e7eb', borderRadius: 16, background: '#fff', textAlign: 'center', minWidth: 240 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Monthly</h3>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#111827' }}>$29<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>/mo</span></div>
          <button
            onClick={() => subscribe(0)}
            disabled={loading !== null}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '10px 20px',
              border: '1px solid #0f766e',
              borderRadius: 10,
              background: '#fff',
              color: '#0f766e',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {loading === 0 ? 'Redirecting...' : 'Get Monthly'}
          </button>
        </div>

        <div style={{ padding: 24, border: '2px solid #0f766e', borderRadius: 16, background: 'linear-gradient(135deg, #f0fdfa, #eff6ff)', textAlign: 'center', minWidth: 240, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#0f766e', color: '#fff', padding: '4px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>BEST VALUE</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Yearly</h3>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#111827' }}>$249<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>/yr</span></div>
          <div style={{ fontSize: 13, color: '#0f766e', fontWeight: 600, marginBottom: 4 }}>Save 28%</div>
          <button
            onClick={() => subscribe(1)}
            disabled={loading !== null}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '10px 20px',
              border: 'none',
              borderRadius: 10,
              background: '#0f766e',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {loading === 1 ? 'Redirecting...' : 'Get Yearly'}
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#9ca3af' }}>
        Payments secured by Stripe. Cancel anytime.
      </p>
    </main>
  );
}
