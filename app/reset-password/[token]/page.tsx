'use client';

import { FormEvent, useState } from 'react';
import SubNav from '@/app/components/SubNav';

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const token = params?.token || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      setMessage(data.message || 'Password updated successfully.');
      setSuccess(true);
    } catch (e: any) {
      setMessage(e.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', padding: 20, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <SubNav />
      <h1 style={{ marginTop: 0 }}>Reset password</h1>

      <p style={{ color: '#475467', marginBottom: 16 }}>
        Enter a new password for your account. This link expires after one hour.
      </p>

      {success ? (
        <div style={{ padding: 14, border: '1px solid #d1fae5', borderRadius: 10, background: '#ecfdf5', color: '#065f46' }}>
          {message}
          <div style={{ marginTop: 12 }}>
            <a href="/login" style={{ color: '#1a73e8', textDecoration: 'none' }}>
              Sign in with your new password
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <input
            placeholder="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            placeholder="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading || !token}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}

      {message && !success ? <p style={{ marginTop: 14, color: '#b91c1c' }}>{message}</p> : null}
    </main>
  );
}
