'use client';

import { useState } from 'react';

function trackShareEvent(listingId: number) {
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_name: 'share_click', listing_id: listingId })
    });
  } catch {}
}

export default function ShareButtons({ listingId, title, compact = false }: {
  listingId: number;
  title: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function getShareUrl() {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/listing/${listingId}`;
    }
    return `https://www.rentfinder.nz/listing/${listingId}`;
  }

  function shareWhatsApp() {
    const url = getShareUrl();
    const text = encodeURIComponent(`${title} - ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    trackShareEvent(listingId);
  }

  function shareFacebook() {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    trackShareEvent(listingId);
  }

  async function shareZalo() {
    await copyLink();
    alert('Link copied! Paste it in Zalo to share.');
    trackShareEvent(listingId);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
    trackShareEvent(listingId);
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: getShareUrl() });
      } catch {}
    } else {
      await copyLink();
    }
    trackShareEvent(listingId);
  }

  const btnStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: 999,
    padding: compact ? '5px 10px' : '7px 14px',
    fontSize: compact ? 12 : 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    lineHeight: 1.3
  };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <button onClick={shareWhatsApp} style={{ ...btnStyle, background: '#25D366', color: '#fff' }}>
        📱 WhatsApp
      </button>
      <button onClick={shareFacebook} style={{ ...btnStyle, background: '#1877F2', color: '#fff' }}>
        📘 Facebook
      </button>
      <button onClick={shareZalo} style={{ ...btnStyle, background: '#0068FF', color: '#fff' }}>
        💬 Zalo
      </button>
      <button onClick={copyLink} style={{ ...btnStyle, background: '#f1f5f9', color: '#334155', border: '1px solid #d8e0eb' }}>
        {copied ? '✅ Copied!' : '🔗 Copy link'}
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator ? (
        <button onClick={nativeShare} style={{ ...btnStyle, background: '#f1f5f9', color: '#334155', border: '1px solid #d8e0eb' }}>
          ↗️ Share
        </button>
      ) : null}
    </div>
  );
}
