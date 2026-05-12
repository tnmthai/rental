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
  { icon: '🤖', title: 'AI-powered', desc: 'Our intelligent search understands natural language queries and returns relevant listings ranked by match quality.' },
  { icon: '🇳🇿', title: 'Built for NZ', desc: 'Designed specifically for the New Zealand rental market. We understand local universities, cities, and rental culture.' },
  { icon: '💡', title: 'Community-driven', desc: 'Anyone can share a room or post a request. We connect renters and hosts directly, without middlemen.' }
];

const stats = [
  { number: '20+', label: 'Cities covered' },
  { number: '1000+', label: 'Listings indexed' },
  { number: '8', label: 'University areas' },
  { number: 'Free', label: 'Always' }
];

const sections = [
  { title: 'Values', items: values, type: 'values' as const },
  { title: 'Stats', items: stats, type: 'stats' as const }
];

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>
      <a
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: '#0f766e',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 32
        }}
      >
        ← Back to RentFinder
      </a>

      <section style={{ textAlign: 'center', marginBottom: 48 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #ccfbf1',
            borderRadius: 999,
            padding: '7px 14px',
            background: '#f0fdfa',
            color: '#0f766e',
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 16
          }}
        >
          Our story
        </div>
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 900,
            color: '#0f172a',
            margin: '0 0 16px',
            lineHeight: 1.2
          }}
        >
          Making rental search{' '}
          <span style={{ background: 'linear-gradient(90deg, #0f766e, #2563eb)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            smarter
          </span>
        </h1>
        <p style={{ fontSize: 17, color: '#4b5563', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
          RentFinder was born from a simple frustration: finding a rental room in New Zealand shouldn't require
          hours of scrolling through dozens of websites. We built an AI-powered search to change that.
        </p>
      </section>

      <section
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 20,
          padding: 'clamp(24px, 4vw, 40px)',
          marginBottom: 48
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Why we built RentFinder</h2>
        <div style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
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

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 24px', textAlign: 'center' }}>By the numbers</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 16
          }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                background: '#fff'
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  background: 'linear-gradient(90deg, #0f766e, #2563eb)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  marginBottom: 6
                }}
              >
                {s.number}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 24px', textAlign: 'center' }}>What we believe in</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16
          }}
        >
          {values.map((v, i) => (
            <div
              key={i}
              style={{
                padding: '24px 20px',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                background: '#fff'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{v.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{v.title}</h3>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          background: 'linear-gradient(135deg, #0f766e, #2563eb)',
          borderRadius: 20,
          padding: 'clamp(28px, 4vw, 48px)',
          textAlign: 'center',
          color: '#fff'
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Ready to find your next room?</h2>
        <p style={{ fontSize: 15, opacity: 0.9, margin: '0 0 24px' }}>
          Start searching with natural language. It's fast, free, and smart.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            background: '#fff',
            color: '#0f766e',
            padding: '12px 28px',
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 15,
            textDecoration: 'none',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
          }}
        >
          Start searching →
        </a>
      </section>
    </main>
  );
}
