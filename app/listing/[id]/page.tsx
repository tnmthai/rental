import Script from 'next/script';
import { getListingById } from '@/lib/db';
import SubNav from '@/app/components/SubNav';

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

function buildMapEmbedUrl(lat?: number | null, lng?: number | null): string | null {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  const la = Number(lat);
  const lo = Number(lng);
  const delta = 0.02;
  const left = lo - delta;
  const right = lo + delta;
  const top = la + delta;
  const bottom = la - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${la}%2C${lo}`;
}

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
  const mapUrl = buildMapEmbedUrl(item.latitude, item.longitude);

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <SubNav />

      <h1 style={{ marginBottom: 4 }}>{item.title}</h1>
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
      <div style={{ margin: '8px 0 12px' }}>
        <button data-share-btn="1" data-listing-id={item.id} data-share-title={item.title} style={{ border: 'none', background: 'transparent', color: '#1a73e8', padding: 0, cursor: 'pointer' }}>
          Share listing
        </button>
      </div>
      <p style={{ color: '#4d5156', fontSize: 14 }}>
        Posted by: {item.user_name || 'Unknown'} {item.user_email ? `(${item.user_email})` : ''} · Posted at:{' '}
        {new Date(item.created_at).toLocaleString()}
      </p>

      {mapUrl ? (
        <section style={{ margin: '10px 0 14px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Location map</h3>
          <iframe
            title="listing-map"
            src={mapUrl}
            style={{ width: '100%', maxWidth: 780, height: 260, border: '1px solid #e5e7eb', borderRadius: 8 }}
            loading="lazy"
          />
        </section>
      ) : null}

      {item.description ? (
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

      <Script id="listing-event-track" strategy="afterInteractive">{`
        (() => {
          const postEvent = async (eventName, listingId) => {
            try {
              await fetch('/api/events', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ event_name: eventName, listing_id: listingId })
              });
            } catch (_) {}
          };

          document.querySelectorAll('[data-track-contact="1"]').forEach((el) => {
            el.addEventListener('click', () => {
              postEvent('contact_click', Number(el.getAttribute('data-listing-id') || 0));
            });
          });

          document.querySelectorAll('[data-share-btn="1"]').forEach((el) => {
            el.addEventListener('click', async () => {
              const listingId = Number(el.getAttribute('data-listing-id') || 0);
              const title = el.getAttribute('data-share-title') || 'Listing';
              const url = window.location.href;
              if (navigator.share) {
                await navigator.share({ title, url }).catch(() => {});
              } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(url).catch(() => {});
              }
              postEvent('share_click', listingId);
            });
          });
        })();
      `}</Script>
    </main>
  );
}
