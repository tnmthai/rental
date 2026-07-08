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
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    fontWeight: 700,
    textDecoration: 'none',
    border: '1px solid var(--border-default)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s ease'
  };

  const disabledStyle: React.CSSProperties = {
    ...btnStyle,
    opacity: 0.4,
    cursor: 'default',
    pointerEvents: 'none'
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginTop: 28,
      paddingTop: 24,
      borderTop: '1px solid var(--border-default)'
    }}>
      <Link href={prevHref} style={prevPage ? btnStyle : disabledStyle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Prev
      </Link>

      <span style={{
        fontSize: 14,
        color: 'var(--text-faint)',
        fontWeight: 600,
        minWidth: 60,
        textAlign: 'center'
      }}>
        {currentPage} / {totalPages}
      </span>

      <Link href={nextHref} style={nextPage ? btnStyle : disabledStyle}>
        Next
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </nav>
  );
}
