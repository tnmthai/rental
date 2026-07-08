'use client';

import Link from 'next/link';

export default function Pagination({
  currentPage,
  totalPages,
  basePath
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const prevHref = prevPage ? `${basePath}?page=${prevPage}` : '#';
  const nextHref = nextPage ? `${basePath}?page=${nextPage}` : '#';

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    textDecoration: 'none',
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#374151',
    transition: 'all 0.15s ease',
    cursor: 'pointer'
  };

  const disabledStyle: React.CSSProperties = {
    ...btnStyle,
    opacity: 0.4,
    cursor: 'default',
    pointerEvents: 'none'
  };

  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
      <Link
        href={prevHref}
        style={prevPage ? btnStyle : disabledStyle}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Prev
      </Link>

      <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>
        {currentPage} / {totalPages}
      </span>

      <Link
        href={nextHref}
        style={nextPage ? btnStyle : disabledStyle}
      >
        Next
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </nav>
  );
}
