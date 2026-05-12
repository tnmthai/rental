'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import SubNav from '@/app/components/SubNav';
import { NZ_LOCATIONS, getSchools } from '@/lib/nz-data';

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '12px 13px',
  border: '1px solid #d8e0eb',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: '#111827',
  boxSizing: 'border-box'
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
  color: '#334155',
  fontSize: 13,
  fontWeight: 800
};

function ToggleChip({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        border: checked ? '1px solid #2563eb' : '1px solid #d8e0eb',
        borderRadius: 999,
        padding: '9px 12px',
        background: checked ? '#eff6ff' : '#ffffff',
        color: checked ? '#1d4ed8' : '#475569',
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer'
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: '#2563eb' }} />
      {label}
    </label>
  );
}

export default function PostListingPage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    title: '',
    region: 'Auckland',
    area: 'Auckland City',
    suburb: 'CBD',
    price_nzd_week: 250,
    source_url: '',
    description: '',
    duration_days: 30,
    available_date: '',
    furnished: true,
    bills_included: false,
    near_school: '(None)',
    latitude: '',
    longitude: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const areas = useMemo(() => NZ_LOCATIONS.find((r) => r.region === form.region)?.areas ?? [], [form.region]);
  const suburbs = useMemo(() => areas.find((a) => a.area === form.area)?.suburbs ?? [], [areas, form.area]);
  const schools = useMemo(() => getSchools(form.region, form.area), [form.region, form.area]);
  const selectedImageCount = images.length;

  function addImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...newFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeImage(idx: number) {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    setSubmitting(true);
    setMsg('');
    try {
      let imageUrls: string[] = [];

      if (images.length > 0) {
        const fd = new FormData();
        fd.set('city', form.suburb || form.area || form.region);
        images.forEach((file) => fd.append('images', file));

        const upRes = await fetch('/api/upload-cloudinary', { method: 'POST', body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Image upload failed');
        imageUrls = upData.urls || [];
      }

      const cityLabel = `${form.suburb}, ${form.area}, ${form.region}`;
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          city: cityLabel,
          price_nzd_week: form.price_nzd_week,
          source_url: form.source_url,
          image_urls: imageUrls,
          description: form.description,
          furnished: form.furnished,
          bills_included: form.bills_included,
          near_school: form.near_school === '(None)' ? null : form.near_school,
          duration_days: form.duration_days,
          available_date: form.available_date || null,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save listing');

      setMsg(`Listing #${data.item.id} submitted with ${imageUrls.length} image(s). It will appear after moderation.`);
      setForm({ ...form, title: '', source_url: '', description: '', duration_days: 30, available_date: '', latitude: '', longitude: '' });
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImages([]);
      setImagePreviews([]);
    } catch (e: any) {
      setMsg(e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '34px 16px' }}>
        <SubNav />
        <p style={{ color: '#64748b' }}>Loading...</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 16px' }}>
        <SubNav />
        <section style={{ border: '1px solid #dbeafe', borderRadius: 22, padding: 30, background: '#f8fbff', textAlign: 'center', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)' }}>
          <p style={{ margin: '0 0 8px', color: '#2563eb', fontWeight: 850, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 }}>Host tools</p>
          <h1 style={{ margin: '0 0 10px', fontSize: 34, letterSpacing: 0 }}>Sign in to create a listing</h1>
          <p style={{ margin: '0 auto 22px', color: '#64748b', lineHeight: 1.6, maxWidth: 520 }}>Add photos, rental details, location, availability, and moderation-ready highlights for renters.</p>
          <button onClick={() => signIn(undefined, { callbackUrl: '/post' })} style={{ padding: '12px 18px', borderRadius: 999, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontWeight: 850, cursor: 'pointer' }}>
            Go to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 16px 64px' }}>
      <SubNav />
      <section style={{ marginBottom: 22, display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.25fr) minmax(260px, 0.75fr)', alignItems: 'stretch' }} className="postHero">
        <div style={{ border: '1px solid #dbeafe', borderRadius: 24, padding: 28, background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 56%, #ecfeff 100%)', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)' }}>
          <p style={{ margin: '0 0 8px', color: '#2563eb', fontWeight: 850, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>Create listing</p>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.1, letterSpacing: 0 }}>Publish a room renters can understand fast.</h1>
          <p style={{ margin: '12px 0 0', color: '#526173', fontSize: 16, lineHeight: 1.65, maxWidth: 680 }}>Add the practical details first: price, location, photos, availability, and what is included. RentFinder turns it into a searchable listing for NZ renters.</p>
        </div>
        <aside style={{ border: '1px solid #e5eaf2', borderRadius: 24, padding: 22, background: '#0f172a', color: '#fff', display: 'grid', alignContent: 'center', gap: 14 }}>
          {['Photos improve trust', 'Pending moderation by default', 'Listings can run up to 180 days'].map((item) => (
            <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#dbeafe', fontWeight: 750 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: '#38bdf8' }} />
              {item}
            </div>
          ))}
        </aside>
      </section>

      <section style={{ border: '1px solid #e5eaf2', borderRadius: 24, background: '#ffffff', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
        <div style={{ padding: 24, borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Listing details</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b' }}>Required basics, location, amenities, and photos.</p>
          </div>
          <span style={{ border: '1px solid #bbf7d0', color: '#166534', background: '#f0fdf4', borderRadius: 999, padding: '7px 11px', fontSize: 13, fontWeight: 850 }}>Signed in</span>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }} className="postGrid">
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            Title
            <input style={fieldStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sunny furnished room near Lincoln University" />
          </label>

          <label style={labelStyle}>
            Region
            <select
              style={fieldStyle}
              value={form.region}
              onChange={(e) => {
                const region = e.target.value;
                const nextAreas = NZ_LOCATIONS.find((r) => r.region === region)?.areas ?? [];
                const firstArea = nextAreas[0]?.area ?? '';
                const firstSuburb = nextAreas[0]?.suburbs[0] ?? '';
                setForm({ ...form, region, area: firstArea, suburb: firstSuburb, near_school: '(None)' });
              }}
            >
              {NZ_LOCATIONS.map((r) => <option key={r.region} value={r.region}>{r.region}</option>)}
            </select>
          </label>

          <label style={labelStyle}>
            City / District
            <select style={fieldStyle} value={form.area} onChange={(e) => {
              const area = e.target.value;
              const firstSuburb = areas.find((a) => a.area === area)?.suburbs[0] ?? '';
              setForm({ ...form, area, suburb: firstSuburb });
            }}>
              {areas.map((a) => <option key={a.area} value={a.area}>{a.area}</option>)}
            </select>
          </label>

          <label style={labelStyle}>
            Suburb
            <select style={fieldStyle} value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })}>
              {suburbs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label style={labelStyle}>
            Price (NZD / week)
            <input style={fieldStyle} type="number" min={1} value={form.price_nzd_week} onChange={(e) => setForm({ ...form, price_nzd_week: Number(e.target.value) })} />
          </label>

          <label style={labelStyle}>
            Listing duration
            <input style={fieldStyle} type="number" min={1} max={180} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
          </label>

          <label style={labelStyle}>
            Available date
            <input style={fieldStyle} type="date" value={form.available_date} onChange={(e) => setForm({ ...form, available_date: e.target.value })} />
          </label>

          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            Nearby university / polytechnic
            <select style={fieldStyle} value={form.near_school} onChange={(e) => setForm({ ...form, near_school: e.target.value })}>
              {schools.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ToggleChip checked={form.furnished} label="Furnished" onChange={(checked) => setForm({ ...form, furnished: checked })} />
            <ToggleChip checked={form.bills_included} label="Bills included" onChange={(checked) => setForm({ ...form, bills_included: checked })} />
          </div>

          <label style={labelStyle}>
            Latitude (optional)
            <input style={fieldStyle} type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="-36.8485" />
          </label>

          <label style={labelStyle}>
            Longitude (optional)
            <input style={fieldStyle} type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="174.7633" />
          </label>

          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            Source URL
            <input style={fieldStyle} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="Facebook, Trade Me, Roomies, or your preferred contact link" />
          </label>

          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            Description
            <textarea
              style={{ ...fieldStyle, minHeight: 190, resize: 'vertical', lineHeight: 1.55 }}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Room vibe, flatmates, transport, parking, bills, house rules..."
            />
            <small style={{ color: '#64748b', fontWeight: 600 }}>Keep contact instructions clear and practical.</small>
          </label>

          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            Images
            <div style={{ border: '1px dashed #93c5fd', borderRadius: 16, padding: 18, background: '#f8fbff' }}>
              <input
                style={{ ...fieldStyle, border: 'none', padding: 0, background: 'transparent' }}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => addImages(e.target.files)}
              />
              <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: 13, fontWeight: 650 }}>
                {selectedImageCount ? `${selectedImageCount} image(s) selected` : 'Upload bright, real photos of the room and shared spaces.'}
              </p>
              {imagePreviews.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                  {imagePreviews.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 100, height: 100, borderRadius: 10, overflow: 'hidden', border: '1px solid #d8e0eb' }}>
                      <img src={url} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: 'none',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontSize: 14,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1
                        }}
                        title="Remove image"
                      >
                        ×
                      </button>
                      <span style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>

        <div style={{ padding: 24, borderTop: '1px solid #eef2f7', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button onClick={onSubmit} disabled={submitting} style={{ padding: '13px 18px', borderRadius: 999, border: '1px solid #2563eb', background: submitting ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 850, cursor: submitting ? 'default' : 'pointer', boxShadow: submitting ? 'none' : '0 12px 26px rgba(37, 99, 235, 0.2)' }}>
            {submitting ? 'Publishing...' : 'Publish listing'}
          </button>
          {msg ? <p style={{ margin: 0, color: msg.toLowerCase().includes('submitted') ? '#166534' : '#b91c1c', fontWeight: 750 }}>{msg}</p> : null}
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 820px) {
          .postHero,
          .postGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
