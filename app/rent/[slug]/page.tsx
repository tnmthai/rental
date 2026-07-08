import type { Metadata } from 'next';
import Link from 'next/link';
import { searchListings } from '@/lib/db';
import { UNIVERSITY_LOCATIONS, getUniversityLocationBySlug } from '@/lib/university-seo';
import Pagination from './Pagination';
import Icon from '@/app/components/Icon';

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
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '0 16px' }}>
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-primary-light) 0%, var(--brand-blue-light) 100%)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-light)',
          padding: '40px 24px',
          marginBottom: 32,
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 900,
            margin: '0 0 8px',
            color: 'var(--text-primary)'
          }}>
            Room for rent in {item.location}
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            margin: '0 0 6px',
            fontSize: 16
          }}>
            Student-focused rentals near {item.university}
            {item.regionHint ? ` (${item.regionHint})` : ''}
          </p>
          <p style={{
            color: 'var(--text-secondary)',
            margin: 0,
            fontSize: 15,
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6
          }}>
            Compare weekly rent, furnished options, and listing details.
          </p>
        </div>

        {/* Back Link */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600
          }}>
            <Icon name="arrowLeft" size={16} />
            Back to search
          </Link>
        </div>

        {allRows.length === 0 ? (
          <section style={{
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            background: 'var(--bg-card)',
            textAlign: 'center'
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>No listings yet in {item.location}.</strong>
            <p style={{ marginBottom: 0, color: 'var(--text-muted)', marginTop: 8 }}>
              Try broader search from homepage, or check nearby areas.
            </p>
          </section>
        ) : (
          <section>
            {/* Results count */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border-default)'
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{allRows.length}</strong> rooms available
              </p>
              <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: 0 }}>
                Page {safePage} of {totalPages}
              </p>
            </div>

            {/* Listing Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rows.map((h: any) => (
                <Link
                  key={h.id}
                  href={`/listing/${h.id}`}
                  style={{
                    display: 'block',
                    padding: '18px 20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {/* Price - top right */}
                  <div style={{
                    position: 'absolute',
                    top: 18,
                    right: 20,
                    fontSize: 20,
                    fontWeight: 900,
                    color: 'var(--brand-primary)'
                  }}>
                    ${h.price_nzd_week}
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>/wk</span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    margin: '0 0 8px',
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    paddingRight: 100,
                    lineHeight: 1.3
                  }}>
                    {h.title}
                  </h3>

                  {/* Location */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    marginBottom: 12
                  }}>
                    <Icon name="map" size={14} />
                    {h.city}, New Zealand
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={h.furnished ? 'badge badge-brand' : 'badge badge-neutral'}>
                      {h.furnished ? 'Furnished' : 'Unfurnished'}
                    </span>
                    <span className={h.bills_included ? 'badge badge-success' : 'badge badge-neutral'}>
                      {h.bills_included ? 'Bills included' : 'Bills separate'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                basePath={`/rent/${slug}`}
              />
            )}
          </section>
        )}

        {/* Popular Locations */}
        <section style={{
          marginTop: 40,
          padding: '28px 24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)'
        }}>
          <h3 style={{
            margin: '0 0 16px',
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--text-primary)'
          }}>
            Popular university locations
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8
          }}>
            {UNIVERSITY_LOCATIONS.map((u) => (
              <Link
                key={u.slug}
                href={`/rent/${u.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background 0.15s ease',
                  background: u.slug === slug ? 'var(--brand-primary-light)' : 'transparent',
                  border: u.slug === slug ? '1px solid var(--brand-primary-border)' : '1px solid transparent'
                }}
              >
                <Icon name="map" size={14} color={u.slug === slug ? 'var(--brand-primary)' : 'var(--text-faint)'} />
                {u.location}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
