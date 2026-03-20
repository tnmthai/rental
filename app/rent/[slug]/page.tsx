import type { Metadata } from 'next';
import Link from 'next/link';
import { searchListings } from '@/lib/db';
import { UNIVERSITY_LOCATIONS, getUniversityLocationBySlug } from '@/lib/university-seo';

type Props = { params: { slug: string } };

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: Props): Metadata {
  const item = getUniversityLocationBySlug(params.slug);
  if (!item) {
    return {
      title: 'Room for rent in New Zealand | RentFinder'
    };
  }

  const title = `Room for rent in ${item.location}, New Zealand | RentFinder`;
  const description = `Find room for rent in ${item.location}. Browse student-friendly rentals near ${item.university}, compare weekly prices, furnished options, and bills included listings.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/rent/${item.slug}`
    },
    keywords: [
      `room for rent in ${item.location}`,
      `flat for rent in ${item.location}`,
      `student accommodation ${item.location}`,
      `rent near ${item.university}`,
      `${item.location} rentals`,
      'New Zealand rentals'
    ],
    openGraph: {
      title,
      description,
      url: `/rent/${item.slug}`,
      type: 'website',
      locale: 'en_NZ'
    }
  };
}

export default async function RentByLocationPage({ params }: Props) {
  const item = getUniversityLocationBySlug(params.slug);
  if (!item) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1>Location not found</h1>
        <p>Try our available student-focused rental locations.</p>
      </main>
    );
  }

  const rows = await searchListings({ city: item.location });

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 6 }}>Room for rent in {item.location}</h1>
      <p style={{ color: '#4b5563', marginTop: 0 }}>
        Student-focused rentals near {item.university}
        {item.regionHint ? ` (${item.regionHint})` : ''}.
      </p>

      <p style={{ color: '#4b5563' }}>
        Looking for a room for rent in {item.location}? Compare weekly rent, furnished options, and listing details.
      </p>

      <div style={{ margin: '14px 0 20px' }}>
        <Link href="/" style={{ color: '#1a73e8', textDecoration: 'none' }}>← Back to search</Link>
      </div>

      {rows.length === 0 ? (
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, background: '#fafafa' }}>
          <strong>No internal listings yet in {item.location}.</strong>
          <p style={{ marginBottom: 0, color: '#4b5563' }}>
            Try broader search from homepage, or check nearby areas.
          </p>
        </section>
      ) : (
        <section>
          {rows.slice(0, 40).map((h: any) => (
            <article key={h.id} style={{ borderTop: '1px solid #eee', padding: '14px 0' }}>
              <h3 style={{ margin: '0 0 4px', color: '#1a0dab' }}>
                <Link href={`/listing/${h.id}`} style={{ color: '#1a0dab', textDecoration: 'none' }}>
                  {h.title}
                </Link>
              </h3>
              <div style={{ color: '#006621', fontSize: 13 }}>{h.city}</div>
              <div style={{ color: '#4d5156', marginTop: 5 }}>
                ${h.price_nzd_week}/week · {h.furnished ? 'furnished' : 'unfurnished'} · {h.bills_included ? 'bills included' : 'bills separate'}
              </div>
            </article>
          ))}
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <h3>Popular university locations</h3>
        <ul>
          {UNIVERSITY_LOCATIONS.map((u) => (
            <li key={u.slug}>
              <Link href={`/rent/${u.slug}`}>Room for rent in {u.location}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
