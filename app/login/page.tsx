'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

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
    <main style={{ maxWidth: 420, margin: '40px auto', padding: 20, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h1 style={{ marginTop: 0 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>

      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        <button onClick={() => signIn('google', { callbackUrl: '/' })}>Continue with Google</button>
        <button onClick={() => signIn('facebook', { callbackUrl: '/' })}>Continue with Facebook</button>
      </div>

      <div style={{ textAlign: 'center', color: '#6b7280', marginBottom: 12 }}>or use email</div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        {mode === 'register' ? (
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        ) : null}
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in with email' : 'Create account'}
        </button>
      </form>

      <p style={{ marginTop: 14, fontSize: 14 }}>
        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={{ border: 'none', background: 'transparent', color: '#1a73e8', cursor: 'pointer', padding: 0 }}
        >
          {mode === 'login' ? 'Register' : 'Sign in'}
        </button>
      </p>

      {message ? <p style={{ color: '#b91c1c' }}>{message}</p> : null}
    </main>
  );
}
