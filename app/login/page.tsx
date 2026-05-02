'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

const inputStyle = {
  width: '100%',
  border: '1px solid #d8dee8',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 15,
  color: '#111827',
  background: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box' as const
};

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Register failed');
      }

      const r = await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: '/'
      });
      if (r?.error) setMessage(r.error);
    } catch (e: any) {
      setMessage(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'grid',
        placeItems: 'center',
        padding: '34px 16px',
        color: '#111827'
      }}
    >
      <section
        className="loginShell"
        style={{
          width: '100%',
          maxWidth: 980,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 0.9fr) minmax(360px, 1fr)',
          border: '1px solid #e5eaf2',
          borderRadius: 24,
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.12)'
        }}
      >
        <aside
          className="loginAside"
          style={{
            padding: 34,
            background: 'linear-gradient(135deg, #0f766e 0%, #2563eb 54%, #7c3aed 100%)',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 34
          }}
        >
          <div>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.45)',
                borderRadius: 999,
                padding: '8px 13px',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
                background: 'rgba(255,255,255,0.12)'
              }}
            >
              Back to home
            </a>

            <div style={{ marginTop: 52 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.4 }}>RentFinder</div>
              <h1 style={{ margin: '14px 0 12px', fontSize: 38, lineHeight: 1.05, letterSpacing: 0, fontWeight: 850 }}>
                Your rental search, saved and ready.
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 1.6 }}>
                Sign in to post listings, save searches, and keep your rental workflow in one calm place.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {['Save useful searches', 'Post rooms faster', 'Manage your dashboard'].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 14,
                  fontWeight: 650
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#a7f3d0', flex: '0 0 auto' }} />
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section style={{ padding: '34px clamp(22px, 5vw, 46px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 22 }}>
            <p style={{ margin: '0 0 8px', color: '#2563eb', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Account
            </p>
            <h2 style={{ margin: 0, fontSize: 30, letterSpacing: 0, lineHeight: 1.15 }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ margin: '9px 0 0', color: '#64748b', lineHeight: 1.5 }}>
              {mode === 'login' ? 'Continue with your saved searches and listings.' : 'Start saving searches and posting rooms in minutes.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 4, borderRadius: 999, background: '#f1f5f9', marginBottom: 18 }}>
            {(['login', 'register'] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => {
                  setMode(nextMode);
                  setMessage('');
                }}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '9px 12px',
                  background: mode === nextMode ? '#ffffff' : 'transparent',
                  color: mode === nextMode ? '#0f172a' : '#64748b',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: mode === nextMode ? '0 6px 18px rgba(15, 23, 42, 0.08)' : 'none'
                }}
              >
                {nextMode === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                border: '1px solid #d8dee8',
                borderRadius: 12,
                padding: '11px 12px',
                background: '#fff',
                color: '#111827',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <span style={{ color: '#4285F4', fontSize: 18, fontWeight: 900 }}>G</span>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => signIn('facebook', { callbackUrl: '/' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                border: '1px solid #1877f2',
                borderRadius: 12,
                padding: '11px 12px',
                background: '#1877F2',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900 }}>f</span>
              Continue with Facebook
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>
            <span style={{ height: 1, background: '#e2e8f0', flex: 1 }} />
            or use email
            <span style={{ height: 1, background: '#e2e8f0', flex: 1 }} />
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            {mode === 'register' ? (
              <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 800 }}>
                Name
                <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              </label>
            ) : null}
            <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 800 }}>
              Email
              <input placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 800 }}>
              Password
              <input
                placeholder="Minimum 6 characters"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              style={{
                border: 'none',
                borderRadius: 12,
                padding: '13px 16px',
                marginTop: 2,
                background: loading ? '#93c5fd' : '#2563eb',
                color: '#fff',
                fontSize: 15,
                fontWeight: 850,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : '0 12px 26px rgba(37, 99, 235, 0.22)'
              }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in with email' : 'Create account'}
            </button>
          </form>

          {message ? (
            <p style={{ margin: '14px 0 0', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
              {message}
            </p>
          ) : null}
        </section>
      </section>

      <style jsx>{`
        @media (max-width: 820px) {
          .loginShell {
            grid-template-columns: 1fr !important;
            border-radius: 18px !important;
          }

          .loginAside {
            padding: 24px !important;
          }
        }
      `}</style>
    </main>
  );
}
