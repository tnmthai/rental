'use client';

import { useEffect, useState } from 'react';
import FavoriteButton from '@/app/components/FavoriteButton';

export default function FavoriteButtonWrapper({ listingId }: { listingId: number }) {
  const [favorited, setFavorited] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/my/favorites');
        if (!res.ok) { setChecked(true); return; }
        const data = await res.json();
        const ids = new Set((data.items || []).map((f: any) => Number(f.listing_id)));
        setFavorited(ids.has(listingId));
      } catch {}
      setChecked(true);
    }
    check();
  }, [listingId]);

  if (!checked) return null;

  return (
    <FavoriteButton
      listingId={listingId}
      initialFavorited={favorited}
      size="medium"
      onToggle={setFavorited}
    />
  );
}
