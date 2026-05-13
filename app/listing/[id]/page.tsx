import Script from 'next/script';
import { getListingById } from '@/lib/db';
import SubNav from '@/app/components/SubNav';
import ListingGallery from '@/app/components/ListingGallery';
import ListingDetailMap from '@/app/components/ListingDetailMap';
import FavoriteButtonWrapper from './FavoriteButtonWrapper';
import ShareButtons from '@/app/components/ShareButtons';

function formatDescription(text: string): string[] {
  return text
    .replace(/\s*•\s*/g, '\n• ')
    .replace(/\s+[-–—]\s+/g, '\n- ')
    .replace(/\s*\|\s*/g, '\n')
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function sanitizeDescriptionHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

function hasHtmlTags(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

function shouldHideDescription(description?: string | null, sourceUrl?: string | null): boolean {
  if (!description) return false;
  const isRoomiesSource = /roomies\.co\.nz/i.test(sourceUrl || '');
  const hasExternalPrefix = /^\s*\[External listing from Roomies\]/i.test(description);
  return isRoomiesSource && hasExternalPrefix;
}

const NZ_COORDS: Record<string, [number, number]> = {
  lincoln: [-43.640065697016475, 172.48548578309143],
  auckland: [-36.8485, 174.7633],
  christchurch: [-43.5321, 172.6362],
  wellington: [-41.2866, 174.7756],
  nelson: [-41.2706, 173.284],
  rolleston: [-43.5947, 172.3822]
};

function inferCoordsFromCity(city?: string | null): { lat: number; lng: number } | null {
  const t = (city || '').toLowerCase();
  for (const [k, v] of Object.entries(NZ_COORDS)) {
    if (t.includes(k)) return { lat: v[0], lng: v[1] };
  }
  return null;
}

function normalizeCoords(lat?: number | string | null, lng?: number | string | null, city?: string | null): { lat: number; lng: number } | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '') {
    return inferCoordsFromCity(city);
  }

  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return inferCoordsFromCity(city);
  if (Math.abs(la) > 90 && Math.abs(lo) <= 90) {
    return { lat: lo, lng: la };
  }
  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return inferCoordsFromCity(city);
  return { lat: la, lng: lo };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId || 0);
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
  const coords = normalizeCoords(item.latitude, item.longitude, item.city);

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <SubNav />

      <h1 style={{ marginBottom: 4 }}>{item.title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 8px' }}>
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          background: item.status === 'approved' ? '#dcfce7' : item.status === 'rejected' ? '#fee2e2' : item.status === 'pending' ? '#fef9c3' : '#f3f4f6',
          color: item.status === 'approved' ? '#166534' : item.status === 'rejected' ? '#991b1b' : item.status === 'pending' ? '#854d0e' : '#6b7280'
        }}>
          {item.status === 'approved' ? '✅ Approved' : item.status === 'rejected' ? '❌ Rejected' : item.status === 'pending' ? '⏳ Pending' : '⏸️ Paused'}
        </span>
        {item.is_featured ? (
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: '#fef3c7',
            color: '#92400e'
          }}>
            ⭐ Featured
          </span>
        ) : null}
        {item.user_verified ? (
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: '#d1fae5',
            color: '#065f46'
          }}>
            ✅ Verified Landlord
          </span>
        ) : null}
      </div>
      {item.status === 'rejected' && item.moderation_note ? (
        <div style={{ margin: '4px 0 8px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
          <strong>Rejection reason:</strong> {item.moderation_note}
        </div>
      ) : null}
      <div style={{ color: '#006621', fontSize: 14 }}>
        {item.source_url ? (
          <a data-track-contact="1" data-listing-id={item.id} href={item.source_url} target="_blank" rel="noreferrer" style={{ color: '#006621', textDecoration: 'none' }}>
            {item.source_url}
          </a>
        ) : null}
      </div>
      <p style={{ color: '#4d5156' }}>
        {item.city} · ${item.price_nzd_week}/week · {item.furnished ? 'furnished' : 'unfurnished'} ·{' '}
        {item.bills_included ? 'bills included' : 'bills separate'}
        {item.near_school ? ` · near ${item.near_school}` : ''}
      </p>
      <div style={{ margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <FavoriteButtonWrapper listingId={item.id} />
        <ShareButtons listingId={item.id} title={item.title} />
      </div>
      <p style={{ color: '#4d5156', fontSize: 14 }}>
        Posted at: {new Date(item.created_at).toLocaleString()}
      </p>

      {coords ? (
        <section style={{ margin: '10px 0 14px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Location map</h3>
          <ListingDetailMap title={item.title} city={item.city} price={Number(item.price_nzd_week || 0)} lat={coords.lat} lng={coords.lng} />
        </section>
      ) : null}

      {item.description && !shouldHideDescription(item.description, item.source_url) ? (
        <div
          style={{
            margin: '8px 0 10px',
            color: '#4d5156',
            lineHeight: 1.55,
            padding: '10px 12px',
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: 8
          }}
        >
          {hasHtmlTags(item.description) ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(item.description) }} />
          ) : (
            formatDescription(item.description).map((line, idx) => (
              <p key={idx} style={{ margin: '0 0 6px' }}>
                {line.startsWith('•') || line.startsWith('-') ? <strong>{line.slice(0, 1)} </strong> : null}
                {line.replace(/^[-•]\s*/, '')}
              </p>
            ))
          )}
        </div>
      ) : null}

      {images.length > 0 ? <ListingGallery title={item.title} images={images} /> : null}

      <Script id="listing-event-track" strategy="afterInteractive">{`
        (() => {
          document.querySelectorAll('[data-track-contact="1"]').forEach((el) => {
            el.addEventListener('click', () => {
              const listingId = Number(el.getAttribute('data-listing-id') || 0);
              fetch('/api/events', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ event_name: 'contact_click', listing_id: listingId })
              }).catch(() => {});
            });
          });
        })();
      `}</Script>
    </main>
  );
}
