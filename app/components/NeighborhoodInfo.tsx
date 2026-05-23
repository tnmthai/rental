'use client';

import { useEffect, useState } from 'react';

type Place = {
  name: string;
  type: string;
  distance: number;
};

const CATEGORIES: Record<string, { icon: string; label: string; tags: string[] }> = {
  supermarket: { icon: '🛒', label: 'Supermarkets', tags: ['shop=supermarket', 'shop=convenience'] },
  restaurant: { icon: '🍽️', label: 'Restaurants', tags: ['amenity=restaurant', 'amenity=fast_food'] },
  bus: { icon: '🚌', label: 'Bus Stops', tags: ['highway=bus_stop', 'public_transport=platform'] },
  school: { icon: '🎓', label: 'Schools/Uni', tags: ['amenity=school', 'amenity=university'] },
  park: { icon: '🌳', label: 'Parks', tags: ['leisure=park'] },
  gym: { icon: '💪', label: 'Gyms', tags: ['leisure=fitness_centre'] },
  pharmacy: { icon: '💊', label: 'Pharmacy', tags: ['amenity=pharmacy'] }
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NeighborhoodInfo({ lat, lng }: { lat: number; lng: number }) {
  const [places, setPlaces] = useState<Record<string, Place[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNearby() {
      setLoading(true);
      const results: Record<string, Place[]> = {};

      for (const [key, cat] of Object.entries(CATEGORIES)) {
        const tagQuery = cat.tags.map((t) => `node[${t}](around:1000,${lat},${lng});`).join('\n');
        const query = `[out:json][timeout:5];\n(\n${tagQuery}\n);\nout body;`;

        try {
          const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
          const data = await res.json();
          const items: Place[] = (data.elements || [])
            .map((el: any) => ({
              name: el.tags?.name || cat.label.replace(/s$/, ''),
              type: key,
              distance: haversineKm(lat, lng, el.lat, el.lon)
            }))
            .sort((a: Place, b: Place) => a.distance - b.distance)
            .slice(0, 3);
          results[key] = items;
        } catch {
          results[key] = [];
        }
      }

      setPlaces(results);
      setLoading(false);
    }

    fetchNearby();
  }, [lat, lng]);

  if (loading) {
    return (
      <section style={{ margin: '12px 0', padding: 14, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fafbfc' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>📍 Nearby Amenities</h3>
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Loading neighborhood info...</p>
      </section>
    );
  }

  const hasAny = Object.values(places).some((arr) => arr.length > 0);
  if (!hasAny) return null;

  return (
    <section style={{ margin: '12px 0', padding: 14, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fafbfc' }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>📍 Nearby Amenities (within 1km)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const items = places[key] || [];
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{cat.icon} {cat.label}</div>
              {items.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: '#6b7280', padding: '2px 0' }}>
                  {p.name} <span style={{ color: '#9ca3af' }}>({(p.distance * 1000).toFixed(0)}m)</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
