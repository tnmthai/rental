import type { Metadata } from 'next';
import Link from 'next/link';
import { searchListings } from '@/lib/db';
import { UNIVERSITY_LOCATIONS, getUniversityLocationBySlug } from '@/lib/university-seo';
import Pagination from './Pagination';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = getUniversityLocationBySlug(slug);
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

export default async function RentByLocationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const item = getUniversityLocationBySlug(slug);
  if (!item) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1>Location not found</h1>
        <p>Try our available student-focused rental locations.</p>
      </main>
    );
  }

  const [rowsByCity, rowsByUniversity] = await Promise.all([
    searchListings({ city: item.location }),
    searchListings({ nearSchool: item.university })
  ]);

  const rowMap = new Map<number, any>();
  [...rowsByCity, ...rowsByUniversity].forEach((r: any) => rowMap.set(Number(r.id), r));
  const allRows = Array.from(rowMap.values()).sort((a: any, b: any) => {
    const pa = Number(a?.price_nzd_week || 0);
    const pb = Number(b?.price_nzd_week || 0);
    if (pa !== pb) return pa - pb;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });

  const totalPages = Math.ceil(allRows.length / PAGE_SIZE);
  const safePage = Math.min(currentPage, totalPages || 1);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const rows = allRows.slice(startIdx, startIdx + PAGE_SIZE);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Room for rent in ${item.location}, New Zealand`,
    description: `Student-friendly rentals near ${item.university} in ${item.location}. Compare weekly prices, furnished options, and bills included listings.`,
    url: `https://www.rentfinder.nz/rent/${item.slug}`,
    numberOfItems: allRows.length,
    itemListElement: allRows.slice(0, 40).map((h: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Apartment',
        name: h.title,
        url: `https://www.rentfinder.nz/listing/${h.id}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: h.city,
          addressCountry: 'NZ'
        },
        offers: {
          '@type': 'Offer',
          price: h.price_nzd_week,
          priceCurrency: 'NZD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: h.price_nzd_week,
            priceCurrency: 'NZD',
            billingDuration: 'P1W'
          }
        }
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

        {allRows.length === 0 ? (
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, background: '#fafafa' }}>
            <strong>No internal listings yet in {item.location}.</strong>
            <p style={{ marginBottom: 0, color: '#4b5563' }}>
              Try broader search from homepage, or check nearby areas.
            </p>
          </section>
        ) : (
          <section>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 12px' }}>
              Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, allRows.length)} of {allRows.length} listings
            </p>

            {rows.map((h: any) => (
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

            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                basePath={`/rent/${slug}`}
              />
            )}
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
    </>
  );
}
