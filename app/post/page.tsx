'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import SubNav from '@/app/components/SubNav';
import { NZ_LOCATIONS, getSchools } from '@/lib/nz-data';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const editorModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }, { indent: '-1' }, { indent: '+1' }],
    ['blockquote', 'code-block'],
    ['clean']
  ]
};

const editorFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'align',
  'indent',
  'blockquote',
  'code-block'
];

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
    near_school: '(None)'
  });

  const [images, setImages] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const areas = useMemo(() => {
    return NZ_LOCATIONS.find((r) => r.region === form.region)?.areas ?? [];
  }, [form.region]);

  const suburbs = useMemo(() => {
    return areas.find((a) => a.area === form.area)?.suburbs ?? [];
  }, [areas, form.area]);

  const schools = useMemo(() => {
    return getSchools(form.region, form.area);
  }, [form.region, form.area]);

  async function onSubmit() {
    setSubmitting(true);
    setMsg('');
    try {
      let imageUrls: string[] = [];

      if (images && images.length > 0) {
        const fd = new FormData();
        fd.set('city', form.suburb || form.area || form.region);
        Array.from(images).forEach((file) => fd.append('images', file));

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
          available_date: form.available_date || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save listing');

      setMsg(`✅ Listing #${data.item.id} posted with ${imageUrls.length} image(s)`);
      setForm({ ...form, title: '', source_url: '', description: '', duration_days: 30, available_date: '' });
      setImages(null);
    } catch (e: any) {
      setMsg(`❌ ${e.message || 'Something went wrong'}`);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '11px 12px',
    border: '1px solid #dbe3ef',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    background: '#fff'
  };

  if (status === 'loading') {
    return <main style={{ maxWidth: 980, margin: '0 auto', padding: '34px 16px' }}><SubNav />Loading...</main>;
  }

  if (!session?.user) {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '60px 16px' }}>
        <SubNav />
        <section style={{ border: '1px solid #e7edf5', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0 }}>Sign in required</h1>
          <p style={{ color: '#5b677a' }}>Please sign in before creating a listing.</p>
          <button
            onClick={() => signIn(undefined, { callbackUrl: '/post' })}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #1a73e8', background: '#1a73e8', color: '#fff' }}
          >
            Go to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '34px 16px 56px', background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 220px)' }}>
      <SubNav />
      <section
        style={{
          border: '1px solid #e7edf5',
          borderRadius: 18,
          padding: 24,
          background: '#fff',
          boxShadow: '0 10px 30px rgba(20, 61, 120, 0.06)'
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8, fontWeight: 700, letterSpacing: -0.2 }}>Create Listing</h1>
        <p style={{ marginTop: 0, color: '#5b677a' }}>
          Publish a rental post with multiple images and a structured NZ location selector.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Title</span>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunny room near LU" />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Region</span>
            <select
              style={inputStyle}
              value={form.region}
              onChange={(e) => {
                const region = e.target.value;
                const nextAreas = NZ_LOCATIONS.find((r) => r.region === region)?.areas ?? [];
                const firstArea = nextAreas[0]?.area ?? '';
                const firstSuburb = nextAreas[0]?.suburbs[0] ?? '';
                setForm({ ...form, region, area: firstArea, suburb: firstSuburb, near_school: '(None)' });
              }}
            >
              {NZ_LOCATIONS.map((r) => (
                <option key={r.region} value={r.region}>
                  {r.region}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>City / District</span>
            <select
              style={inputStyle}
              value={form.area}
              onChange={(e) => {
                const area = e.target.value;
                const firstSuburb = areas.find((a) => a.area === area)?.suburbs[0] ?? '';
                setForm({ ...form, area, suburb: firstSuburb });
              }}
            >
              {areas.map((a) => (
                <option key={a.area} value={a.area}>
                  {a.area}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Suburb</span>
            <select style={inputStyle} value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })}>
              {suburbs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Price (NZD / week)</span>
            <input
              style={inputStyle}
              type="number"
              value={form.price_nzd_week}
              onChange={(e) => setForm({ ...form, price_nzd_week: Number(e.target.value) })}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Listing duration (days)</span>
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={180}
              value={form.duration_days}
              onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Available date</span>
            <input
              style={inputStyle}
              type="date"
              value={form.available_date}
              onChange={(e) => setForm({ ...form, available_date: e.target.value })}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Nearby University / Polytechnic (Optional)</span>
            <select style={inputStyle} value={form.near_school} onChange={(e) => setForm({ ...form, near_school: e.target.value })}>
              {schools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: 18, alignItems: 'end' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#374151' }}>
              <input type="checkbox" checked={form.furnished} onChange={(e) => setForm({ ...form, furnished: e.target.checked })} />
              Furnished
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#374151' }}>
              <input
                type="checkbox"
                checked={form.bills_included}
                onChange={(e) => setForm({ ...form, bills_included: e.target.checked })}
              />
              Bills included
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Source URL (Optional)</span>
            <input
              style={inputStyle}
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              placeholder="Facebook / TradeMe / etc"
            />
          </label>

          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Description</span>
            <div style={{ border: '1px solid #dbe3ef', borderRadius: 10, overflow: 'hidden' }}>
              <ReactQuill
                theme="snow"
                value={form.description}
                onChange={(value) => setForm({ ...form, description: value })}
                modules={editorModules}
                formats={editorFormats}
                placeholder="Write listing details with rich formatting..."
                style={{ background: '#fff' }}
              />
            </div>
            <small style={{ color: '#6b7280' }}>
              Supports bold, italic, underline, alignment, indent/tab, bullet/number list, and text color.
            </small>
          </label>

          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>Images</span>
            <input style={inputStyle} type="file" accept="image/*" multiple onChange={(e) => setImages(e.target.files)} />
            <small style={{ color: '#6b7280' }}>You can select multiple images in one upload.</small>
          </label>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              padding: '11px 18px',
              borderRadius: 10,
              border: '1px solid #1a73e8',
              background: '#1a73e8',
              color: '#fff',
              fontWeight: 600
            }}
          >
            {submitting ? 'Publishing...' : 'Publish Listing'}
          </button>
          {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}
        </div>
      </section>

      <style jsx global>{`
        .ql-editor {
          min-height: 180px;
          font-size: 14px;
        }
      `}</style>
    </main>
  );
}
