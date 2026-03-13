'use client';

export default function SubNav() {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <button
        onClick={() => window.history.back()}
        style={{ border: '1px solid #ddd', background: '#fff', borderRadius: 8, padding: '6px 10px' }}
      >
        ← Back
      </button>
      <a href="/" style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px', textDecoration: 'none', color: '#111' }}>
        🏠 Home
      </a>
    </div>
  );
}
