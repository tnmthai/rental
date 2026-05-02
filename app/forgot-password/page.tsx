'use client';

import { FormEvent, useState } from 'react';
import SubNav from '@/app/components/SubNav';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset link.');

      setMessage(data.message || 'If that email is registered, a reset link has been sent.');
      setSuccess(true);
    } catch (e: any) {
      setMessage(e.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', padding: 20, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <SubNav />
      <h1 style={{ marginTop: 0 }}>Forgot password</h1>
      <p style={{ color: '#475467', marginBottom: 16 }}>
        Enter the email address for your account and we will send a password reset link.
      </p>

      {success ? (
        <div style={{ padding: 14, border: '1px solid #d1fae5', borderRadius: 10, background: '#ecfdf5', color: '#065f46' }}>
          {message}
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}

      {message && !success ? <p style={{ marginTop: 14, color: '#b91c1c' }}>{message}</p> : null}
    </main>
  );
}
