'use client';

import { BackToHome } from '@/app/components/Icon';
import Icon from '@/app/components/Icon';

export default function PremiumPage() {
  const features = [
    { icon: 'grid', title: 'Unlimited listings', desc: 'Post as many rooms as you want' },
    { icon: 'trendingUp', title: 'Analytics dashboard', desc: 'See views, clicks, and engagement' },
    { icon: 'shield', title: 'Verified badge', desc: 'Build trust with a verified landlord badge' },
    { icon: 'zap', title: 'Free boost/month', desc: 'Feature 1 listing per month at no extra cost' },
    { icon: 'bell', title: 'Priority notifications', desc: 'Your listings appear first in search alerts' },
    { icon: 'mail', title: 'Priority support', desc: 'Get help within 24 hours' }
  ];

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <BackToHome />
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
          RentFinder Premium
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 500, margin: '0 auto' }}>
          All premium features are now free for everyone. Supercharge your listings at no cost.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 40 }}>
        {features.map((f) => (
          <div key={f.title} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
            <div style={{ marginBottom: 8, color: '#0f766e' }}><Icon name={f.icon} size={22} /></div>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{f.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: 24, border: '2px solid #0f766e', borderRadius: 16, background: 'linear-gradient(135deg, #f0fdfa, #eff6ff)' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: '#0f766e' }}>100% Free</h2>
        <p style={{ margin: 0, fontSize: 15, color: '#4b5563' }}>
          All premium features are included for every user. No payment required.
        </p>
      </div>

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#9ca3af' }}>
        Enjoy all features at no cost. 🏠
      </p>
    </main>
  );
}
