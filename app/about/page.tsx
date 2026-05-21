import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About RentFinder NZ — AI-Powered Rental Search for New Zealand',
  description:
    'Learn about RentFinder NZ, the AI-powered platform helping students and renters find rooms and flats across New Zealand.',
  alternates: { canonical: '/about' },
  robots: { index: true, follow: true }
};

const values = [
  { icon: '🎯', title: 'Simplicity first', desc: 'Finding a rental should be easy. We use AI to cut through the noise and surface the best matches for your needs.' },
  { icon: '⚡', title: 'AI-powered', desc: 'Our intelligent search understands natural language queries and returns relevant listings ranked by match quality.' },
  { icon: '🇳🇿', title: 'Built for NZ', desc: 'Designed specifically for the New Zealand rental market. We understand local universities, cities, and rental culture.' },
  { icon: '💡', title: 'Community-driven', desc: 'Anyone can share a room or post a request. We connect renters and hosts directly, without middlemen.' }
];

const stats = [
  { number: '20+', label: 'Cities covered' },
  { number: '1000+', label: 'Listings indexed' },
  { number: '8', label: 'University areas' }
];

export default function AboutPage() {
  return (
    <main className="page-container">
      <a href="/" className="back-link">← Back to RentFinder</a>

      <section className="hero">
        <div className="hero-badge">Our story</div>
        <h1>
          Making rental search <span className="gradient-text">smarter</span>
        </h1>
        <p>
          RentFinder was born from a simple frustration: finding a rental room in New Zealand shouldn't require
          hours of scrolling through dozens of websites. We built an AI-powered search to change that.
        </p>
      </section>

      <section className="section" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 'clamp(24px, 4vw, 40px)' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 16px' }}>Why we built RentFinder</h2>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15 }}>
          <p style={{ margin: '0 0 14px' }}>
            It started when a friend moved to Christchurch for university and spent weeks searching for a room.
            She checked Trade Me, Facebook groups, university boards, and Roomies — each with different formats,
            outdated listings, and no way to filter by what actually mattered (furnished, bills included, near campus).
          </p>
          <p style={{ margin: '0 0 14px' }}>
            We thought: what if you could just type what you want in plain English and get the best matches?
            That's how RentFinder's AI search was born.
          </p>
          <p style={{ margin: 0 }}>
            Today, RentFinder indexes listings from multiple sources across 20+ New Zealand cities, with smart
            filters for price, location, furnishing, bills, and university proximity. And it's completely free.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 24px', textAlign: 'center' }}>By the numbers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {stats.map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div className="gradient-text" style={{ fontSize: 32, fontWeight: 900, marginBottom: 6 }}>
                {s.number}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 24px', textAlign: 'center' }}>What we believe in</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {values.map((v, i) => (
            <div key={i} className="card card-body">
              <div style={{ fontSize: 32, marginBottom: 12 }}>{v.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px' }}>{v.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-blue))', borderRadius: 'var(--radius-xl)', padding: 'clamp(28px, 4vw, 48px)', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Ready to find your next room?</h2>
        <p style={{ fontSize: 15, opacity: 0.9, margin: '0 0 24px' }}>
          Start searching with natural language. It's fast, free, and smart.
        </p>
        <a href="/" className="btn btn-outline" style={{ background: '#fff', color: 'var(--brand-primary)', fontWeight: 800 }}>
          Start searching →
        </a>
      </section>
    </main>
  );
}
