'use client';

import { useEffect, useState } from 'react';

type Props = {
  title: string;
  images: string[];
};

export default function ListingGallery({ title, images }: Props) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActive(null);
        return;
      }
      if (e.key === 'ArrowRight') {
        setActive((prev) => (prev === null ? 0 : (prev + 1) % images.length));
      }
      if (e.key === 'ArrowLeft') {
        setActive((prev) => (prev === null ? 0 : (prev - 1 + images.length) % images.length));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, images.length]);

  if (!images.length) return null;

  const showPrev = () => setActive((prev) => (prev === null ? 0 : (prev - 1 + images.length) % images.length));
  const showNext = () => setActive((prev) => (prev === null ? 0 : (prev + 1) % images.length));

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {images.map((url, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            style={{ border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
            aria-label={`Open image ${idx + 1}`}
          >
            <img
              src={url}
              alt={`${title}-${idx + 1}`}
              style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }}
            />
          </button>
        ))}
      </div>

      {active !== null ? (
        <div
          onClick={() => setActive(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', width: 'min(100%, 1000px)' }}
          >
            <button
              onClick={() => setActive(null)}
              style={{
                position: 'absolute',
                right: 8,
                top: 8,
                border: 'none',
                borderRadius: 999,
                width: 34,
                height: 34,
                background: 'rgba(17, 24, 39, .8)',
                color: '#fff',
                cursor: 'pointer',
                zIndex: 2
              }}
              aria-label="Close"
            >
              ✕
            </button>

            <img
              src={images[active]}
              alt={`${title}-${active + 1}`}
              style={{ width: '100%', maxHeight: '84vh', objectFit: 'contain', borderRadius: 10 }}
            />

            {images.length > 1 ? (
              <>
                <button
                  onClick={showPrev}
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    borderRadius: 999,
                    width: 40,
                    height: 40,
                    background: 'rgba(17, 24, 39, .75)',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  onClick={showNext}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    borderRadius: 999,
                    width: 40,
                    height: 40,
                    background: 'rgba(17, 24, 39, .75)',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            ) : null}

            <div style={{ textAlign: 'center', marginTop: 8, color: '#e5e7eb', fontSize: 13 }}>
              {active + 1} / {images.length}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
