'use client';

import { useState, useEffect } from 'react';

export default function FavoriteButton({ listingId, initialFavorited = false, onToggle, size = 'small' }: {
  listingId: number;
  initialFavorited?: boolean;
  onToggle?: (favorited: boolean) => void;
  size?: 'small' | 'medium';
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  async function toggle() {
    setLoading(true);
    try {
      if (favorited) {
        const res = await fetch('/api/my/favorites', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ listing_id: listingId })
        });
        if (res.ok) {
          setFavorited(false);
          onToggle?.(false);
        }
      } else {
        const res = await fetch('/api/my/favorites', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ listing_id: listingId })
        });
        if (res.ok) {
          setFavorited(true);
          onToggle?.(true);
        }
      }
    } catch {}
    setLoading(false);
  }

  const iconSize = size === 'medium' ? 22 : 18;

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={loading}
      title={favorited ? 'Remove from favorites' : 'Save to favorites'}
      style={{
        border: 'none',
        background: 'transparent',
        cursor: loading ? 'default' : 'pointer',
        padding: 4,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: iconSize,
        lineHeight: 1,
        opacity: loading ? 0.5 : 1,
        transition: 'transform 0.15s ease',
        transform: favorited ? 'scale(1.1)' : 'scale(1)'
      }}
    >
      {favorited ? '❤️' : '🤍'}
    </button>
  );
}
