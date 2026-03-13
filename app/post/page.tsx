'use client';

import { useState } from 'react';

export default function PostListingPage() {
  const [form, setForm] = useState({
    title: '',
    city: 'Auckland',
    price_nzd_week: 250,
    source_url: '',
    description: '',
    furnished: true,
    bills_included: false,
    near_school: 'AUT'
  });
  const [images, setImages] = useState<FileList | null>(null);
  const [descFile, setDescFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  async function onSubmit() {
    setSubmitting(true);
    setMsg('');
    try {
      let imageUrls: string[] = [];

      if (images && images.length > 0) {
        const fd = new FormData();
        fd.set('city', form.city);
        Array.from(images).forEach((file) => fd.append('images', file));

        const upRes = await fetch('/api/upload-cloudinary', { method: 'POST', body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Image upload failed');
        imageUrls = upData.urls || [];
      }

      let description = form.description;
      if (descFile) description = await descFile.text();

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, image_urls: imageUrls, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save listing');

      setMsg(`✅ Listing #${data.item.id} posted with ${imageUrls.length} Cloudinary images`);
      setForm({ ...form, title: '', source_url: '', description: '' });
      setImages(null);
      setDescFile(null);
    } catch (e: any) {
      setMsg(`❌ ${e.message || 'Something went wrong'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto' }}>
      <h1>Create Listing (Cloudinary)</h1>
      <p>Dedicated posting page: upload multiple images to Cloudinary + optional description file.</p>

      <div style={{ display: 'grid', gap: 10 }}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input
          type="number"
          placeholder="Price NZD/week"
          value={form.price_nzd_week}
          onChange={(e) => setForm({ ...form, price_nzd_week: Number(e.target.value) })}
        />
        <input
          placeholder="Source URL (Facebook/TradeMe...)"
          value={form.source_url}
          onChange={(e) => setForm({ ...form, source_url: e.target.value })}
        />

        <label>
          Upload multiple images:
          <input type="file" accept="image/*" multiple onChange={(e) => setImages(e.target.files)} />
        </label>

        <textarea
          placeholder="Description text"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label>
          Or upload description file (.txt/.md):
          <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => setDescFile(e.target.files?.[0] || null)} />
        </label>

        <input
          placeholder="Near school (AUT/UoA/LU...)"
          value={form.near_school}
          onChange={(e) => setForm({ ...form, near_school: e.target.value })}
        />

        <label>
          <input
            type="checkbox"
            checked={form.furnished}
            onChange={(e) => setForm({ ...form, furnished: e.target.checked })}
          />{' '}
          Furnished
        </label>

        <label>
          <input
            type="checkbox"
            checked={form.bills_included}
            onChange={(e) => setForm({ ...form, bills_included: e.target.checked })}
          />{' '}
          Bills included
        </label>

        <button onClick={onSubmit} disabled={submitting} style={{ padding: '10px 16px', width: 220 }}>
          {submitting ? 'Publishing...' : 'Publish Listing'}
        </button>

        {msg ? <p>{msg}</p> : null}
      </div>
    </main>
  );
}
