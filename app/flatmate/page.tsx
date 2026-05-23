'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Icon, { BackToHome } from '@/app/components/Icon';

type Profile = {
  id: number;
  name: string;
  city: string;
  budget: number;
  lifestyle: string;
  schedule: string;
  cleanliness: string;
  smoking: string;
  pets: string;
  about: string;
  created_at: string;
};

export default function FlatmatePage() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searched, setSearched] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    city: '',
    budget: '',
    lifestyle: 'balanced',
    schedule: 'flexible',
    cleanliness: 'moderate',
    smoking: 'no',
    pets: 'no',
    about: ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function search() {
    const params = new URLSearchParams();
    if (form.city) params.set('city', form.city);
    if (form.budget) params.set('budget', form.budget);
    const res = await fetch(`/api/flatmate?${params}`);
    const data = await res.json();
    setProfiles(data.profiles || []);
    setSearched(true);
  }

  async function saveProfile() {
    if (!session?.user) { setMsg('Please log in first'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/flatmate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Profile created! Others can now find you.');
        setShowForm(false);
      } else {
        setMsg(data.error || 'Failed');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setSaving(false);
    }
  }

  const options: Record<string, string[]> = {
    lifestyle: ['quiet', 'balanced', 'social', 'party'],
    schedule: ['early_bird', 'flexible', 'night_owl'],
    cleanliness: ['relaxed', 'moderate', 'very_clean'],
    smoking: ['no', 'outside', 'yes'],
    pets: ['no', 'cat', 'dog', 'any']
  };

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <BackToHome />
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}><Icon name="users" size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />Flatmate Finder</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>Find your perfect flatmate based on lifestyle compatibility.</p>

      <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 14, background: '#fafbfc', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>City</label>
            <select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 13, minWidth: 140 }}>
              <option value="">Any</option>
              {['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Dunedin', 'Lincoln'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Max budget ($/wk)</label>
            <input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} placeholder="e.g. 250" style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 13, width: 100 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={search} className="btn btn-primary btn-sm">Search</button>
          <button onClick={() => setShowForm((v) => !v)} className="btn btn-outline btn-sm">📝 Create Profile</button>
        </div>
      </div>

      {showForm ? (
        <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 14, background: '#fff', marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>Your Flatmate Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {Object.entries(options).map(([key, vals]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</label>
                <select value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
                  {vals.map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>About you</label>
            <textarea value={form.about} onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))} rows={3} placeholder="Tell potential flatmates about yourself..." style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 8, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={saveProfile} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Saving...' : 'Save Profile'}</button>
            {msg ? <span style={{ fontSize: 12, color: msg.includes('created') ? '#166534' : '#991b1b' }}>{msg}</span> : null}
          </div>
        </div>
      ) : null}

      {searched && profiles.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>No flatmate profiles found. Be the first to create one!</p>
      ) : null}

      {profiles.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {profiles.map((p) => (
            <div key={p.id} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>{p.name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{p.city} · ${p.budget}/week</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[p.lifestyle, p.schedule, p.cleanliness].map((tag) => (
                    <span key={tag} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#f3f4f6', color: '#374151', textTransform: 'capitalize' }}>
                      {tag.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              {p.about ? <p style={{ margin: '8px 0 0', fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>{p.about}</p> : null}
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                {p.smoking === 'no' ? <span style={{ fontSize: 11, color: '#166534' }}>🚭 Non-smoker</span> : null}
                {p.pets !== 'no' ? <span style={{ fontSize: 11, color: '#6b7280' }}>🐾 {p.pets === 'any' ? 'Pet-friendly' : `Has ${p.pets}`}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
