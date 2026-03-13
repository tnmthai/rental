'use client';

import { useMemo, useState } from 'react';

type NzLocation = {
  region: string;
  areas: Array<{ area: string; suburbs: string[] }>;
};

const NZ_LOCATIONS: NzLocation[] = [
  {
    region: 'Auckland',
    areas: [
      { area: 'Auckland City', suburbs: ['CBD', 'Mount Eden', 'Newmarket', 'Grafton'] },
      { area: 'North Shore', suburbs: ['Takapuna', 'Albany', 'Birkenhead'] },
      { area: 'Manukau', suburbs: ['Papatoetoe', 'Manurewa', 'Flat Bush'] }
    ]
  },
  {
    region: 'Canterbury',
    areas: [
      { area: 'Christchurch City', suburbs: ['Riccarton', 'Ilam', 'Sydenham'] },
      { area: 'Selwyn District', suburbs: ['Lincoln', 'Rolleston'] }
    ]
  },
  {
    region: 'Wellington',
    areas: [
      { area: 'Wellington City', suburbs: ['Te Aro', 'Kelburn', 'Newtown'] },
      { area: 'Lower Hutt', suburbs: ['Petone', 'Alicetown'] }
    ]
  }
];

export default function PostListingPage() {
  const [form, setForm] = useState({
    title: '',
    region: 'Auckland',
    area: 'Auckland City',
    suburb: 'CBD',
    price_nzd_week: 250,
    source_url: '',
    description: '',
    furnished: true,
    bills_included: false,
    near_school: 'AUT'
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
          near_school: form.near_school
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save listing');

      setMsg(`✅ Listing #${data.item.id} posted with ${imageUrls.length} image(s)`);
      setForm({ ...form, title: '', source_url: '', description: '' });
      setImages(null);
    } catch (e: any) {
      setMsg(`❌ ${e.message || 'Something went wrong'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '28px 16px 48px' }}>
      <section style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 22, background: '#fff' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Create Listing</h1>
        <p style={{ marginTop: 0, color: '#4b5563' }}>
          Publish a rental post with multiple images and clear location hierarchy for New Zealand.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span>Title</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunny room near LU" />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Region</span>
            <select
              value={form.region}
              onChange={(e) => {
                const region = e.target.value;
                const nextAreas = NZ_LOCATIONS.find((r) => r.region === region)?.areas ?? [];
                const firstArea = nextAreas[0]?.area ?? '';
                const firstSuburb = nextAreas[0]?.suburbs[0] ?? '';
                setForm({ ...form, region, area: firstArea, suburb: firstSuburb });
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
            <span>City / District</span>
            <select
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
            <span>Suburb</span>
            <select value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })}>
              {suburbs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Price (NZD / week)</span>
            <input
              type="number"
              value={form.price_nzd_week}
              onChange={(e) => setForm({ ...form, price_nzd_week: Number(e.target.value) })}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span>Source URL</span>
            <input
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              placeholder="Facebook / TradeMe / etc"
            />
          </label>

          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span>Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Include details like move-in date, bond, flatmates, transport..."
            />
          </label>

          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span>Images</span>
            <input type="file" accept="image/*" multiple onChange={(e) => setImages(e.target.files)} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Near School</span>
            <input value={form.near_school} onChange={(e) => setForm({ ...form, near_school: e.target.value })} placeholder="AUT / UoA / LU" />
          </label>

          <div style={{ display: 'flex', gap: 18, alignItems: 'end' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.furnished} onChange={(e) => setForm({ ...form, furnished: e.target.checked })} />
              Furnished
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.bills_included}
                onChange={(e) => setForm({ ...form, bills_included: e.target.checked })}
              />
              Bills included
            </label>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={onSubmit} disabled={submitting} style={{ padding: '10px 18px' }}>
            {submitting ? 'Publishing...' : 'Publish Listing'}
          </button>
          {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}
        </div>
      </section>
    </main>
  );
}
