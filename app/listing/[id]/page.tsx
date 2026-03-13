import { getListingById } from '@/lib/db';
import SubNav from '@/app/components/SubNav';

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id || 0);
  const item = Number.isFinite(id) ? await getListingById(id) : null;

  if (!item) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <SubNav />
        <h1>Listing not found</h1>
      </main>
    );
  }

  const images: string[] = Array.isArray(item.image_urls) ? item.image_urls : [];

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <SubNav />

      <h1 style={{ marginBottom: 4 }}>{item.title}</h1>
      <div style={{ color: '#006621', fontSize: 14 }}>{item.source_url}</div>
      <p style={{ color: '#4d5156' }}>
        {item.city} · ${item.price_nzd_week}/week · {item.furnished ? 'furnished' : 'unfurnished'} ·{' '}
        {item.bills_included ? 'bills included' : 'bills separate'}
        {item.near_school ? ` · near ${item.near_school}` : ''}
      </p>
      <p style={{ color: '#4d5156', fontSize: 14 }}>
        Posted by: {item.user_name || 'Unknown'} {item.user_email ? `(${item.user_email})` : ''} · Posted at:{' '}
        {new Date(item.created_at).toLocaleString()}
      </p>

      {item.description ? <p style={{ lineHeight: 1.6 }}>{item.description}</p> : null}

      {images.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, maxWidth: 780 }}>
          {images.map((url, idx) => (
            <a key={`${item.id}-${idx}`} href={url} target="_blank">
              <img
                src={url}
                alt={`${item.title}-${idx + 1}`}
                style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }}
              />
            </a>
          ))}
        </div>
      ) : null}
    </main>
  );
}
