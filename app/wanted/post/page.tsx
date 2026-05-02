'use client';

import type { CSSProperties, FormEvent } from 'react';
import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import SubNav from '@/app/components/SubNav';

const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #d8e0eb',
  borderRadius: 12,
  padding: '12px 13px',
  fontSize: 14,
  color: '#111827',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box'
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
  color: '#334155',
  fontSize: 13,
  fontWeight: 800
};

function PreferenceChip({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        border: checked ? '1px solid #0f766e' : '1px solid #d8e0eb',
        borderRadius: 999,
        padding: '9px 12px',
        background: checked ? '#ecfdf5' : '#fff',
        color: checked ? '#0f766e' : '#475569',
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer'
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: '#0f766e' }} />
      {label}
    </label>
  );
}

export default function WantedPostPage() {
  const { data: session, status } = useSession();
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    city: 'Lincoln, Canterbury',
    budget_nzd_week: 250,
    description: '',
    furnished: true,
    bills_included: false,
    near_school: 'Lincoln University',
    available_date: ''
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      setMsg('Please log in first.');
      return;
    }

    setSubmitting(true);
    setMsg('');
    try {
      const r = await fetch('/api/wanted', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Failed to post request');
      setMsg('Your room request is posted.');
      setForm({ ...form, title: '', description: '' });
    } catch (e: any) {
      setMsg(e.message || 'Failed to post request');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '34px 16px' }}>
        <SubNav />
        <p style={{ color: '#64748b' }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1060, margin: '0 auto', padding: '30px 16px 64px' }}>
      <SubNav />

      <section className="wantedHero" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(260px, 0.9fr)', gap: 18, marginBottom: 22 }}>
        <div style={{ border: '1px solid #ccfbf1', borderRadius: 24, padding: 28, background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 58%, #eef2ff 100%)', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)' }}>
          <p style={{ margin: '0 0 8px', color: '#0f766e', fontWeight: 850, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>Room request</p>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.1, letterSpacing: 0 }}>Tell hosts what you are looking for.</h1>
          <p style={{ margin: '12px 0 0', color: '#526173', fontSize: 16, lineHeight: 1.65 }}>Post a clear request with your budget, preferred location, move-in date, and must-haves so room owners can contact you faster.</p>
        </div>
        <aside style={{ border: '1px solid #e5eaf2', borderRadius: 24, padding: 22, background: '#102a43', color: '#fff', display: 'grid', alignContent: 'center', gap: 14 }}>
          {['Mention your move-in timing', 'Be honest about budget', 'Add lifestyle preferences'].map((item) => (
            <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#d9f99d', fontWeight: 750 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: '#84cc16' }} />
              {item}
            </div>
          ))}
        </aside>
      </section>

      {!session?.user ? (
        <section style={{ border: '1px solid #fed7aa', borderRadius: 18, padding: 18, background: '#fff7ed', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <strong style={{ color: '#9a3412' }}>Login required</strong>
            <p style={{ margin: '4px 0 0', color: '#9a3412' }}>Sign in before posting your room request.</p>
          </div>
          <button onClick={() => signIn(undefined, { callbackUrl: '/wanted/post' })} style={{ padding: '11px 16px', borderRadius: 999, border: '1px solid #ea580c', background: '#ea580c', color: '#fff', fontWeight: 850, cursor: 'pointer' }}>
            Log in to post
          </button>
        </section>
      ) : null}

      <form onSubmit={submit} style={{ border: '1px solid #e5eaf2', borderRadius: 24, background: '#fff', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
        <div style={{ padding: 24, borderBottom: '1px solid #eef2f7' }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Request details</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>The clearer this is, the easier it is for hosts to match you.</p>
        </div>

        <div className="wantedGrid" style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            Title
            <input style={fieldStyle} placeholder="Looking for furnished room near LU" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>

          <label style={labelStyle}>
            City / area
            <input style={fieldStyle} placeholder="Lincoln, Canterbury" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          </label>

          <label style={labelStyle}>
            Budget (NZD / week)
            <input style={fieldStyle} type="number" min={1} placeholder="250" value={form.budget_nzd_week} onChange={(e) => setForm({ ...form, budget_nzd_week: Number(e.target.value || 0) })} required />
          </label>

          <label style={labelStyle}>
            Near university / polytechnic
            <input style={fieldStyle} placeholder="Lincoln University" value={form.near_school} onChange={(e) => setForm({ ...form, near_school: e.target.value })} />
          </label>

          <label style={labelStyle}>
            Available from
            <input style={fieldStyle} type="date" value={form.available_date} onChange={(e) => setForm({ ...form, available_date: e.target.value })} />
          </label>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <PreferenceChip checked={form.furnished} label="Furnished preferred" onChange={(checked) => setForm({ ...form, furnished: checked })} />
            <PreferenceChip checked={form.bills_included} label="Bills included preferred" onChange={(checked) => setForm({ ...form, bills_included: checked })} />
          </div>

          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            Description
            <textarea
              style={{ ...fieldStyle, minHeight: 170, resize: 'vertical', lineHeight: 1.55 }}
              placeholder="Move-in timing, study/work schedule, parking, pets, flatmate preferences, and anything flexible..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </div>

        <div style={{ padding: 24, borderTop: '1px solid #eef2f7', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" disabled={submitting || !session?.user} style={{ padding: '13px 18px', borderRadius: 999, border: '1px solid #0f766e', background: submitting || !session?.user ? '#99f6e4' : '#0f766e', color: '#fff', fontWeight: 850, cursor: submitting || !session?.user ? 'default' : 'pointer', boxShadow: submitting || !session?.user ? 'none' : '0 12px 26px rgba(15, 118, 110, 0.2)' }}>
            {submitting ? 'Posting...' : 'Post request'}
          </button>
          {msg ? <p style={{ margin: 0, color: msg.toLowerCase().includes('posted') ? '#166534' : '#b91c1c', fontWeight: 750 }}>{msg}</p> : null}
        </div>
      </form>

      <style jsx>{`
        @media (max-width: 820px) {
          .wantedHero,
          .wantedGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
