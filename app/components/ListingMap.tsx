'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';

type Point = {
  id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  lat: number;
  lng: number;
};

type DisplayPoint = Point & {
  clusterCount: number;
};

function FitBounds({ points }: { points: DisplayPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 12);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.25));
  }, [map, points]);

  return null;
}

export default function ListingMap({ points }: { points: Point[] }) {
  const displayPoints = useMemo<DisplayPoint[]>(() => {
    const groups = new Map<string, Point[]>();
    for (const p of points) {
      const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }

    const spread: DisplayPoint[] = [];
    groups.forEach((group) => {
      if (group.length === 1) {
        spread.push({ ...group[0], clusterCount: 1 });
        return;
      }

      // If multiple listings share the same coordinate, spread them a bit
      // so all pins remain visible/clickable instead of fully overlapping.
      const radius = 0.0012; // ~130m latitude
      group.forEach((p, i) => {
        const angle = (2 * Math.PI * i) / group.length;
        const latOffset = radius * Math.sin(angle);
        const lngOffset = (radius * Math.cos(angle)) / Math.max(Math.cos((p.lat * Math.PI) / 180), 0.1);
        spread.push({ ...p, lat: p.lat + latOffset, lng: p.lng + lngOffset, clusterCount: group.length });
      });
    });

    return spread;
  }, [points]);

  if (!displayPoints.length) return null;

  return (
    <section style={{ marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 10px', color: '#111827' }}>Map view</h3>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <MapContainer center={[-41.2865, 174.7762]} zoom={5} style={{ width: '100%', height: 360 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <FitBounds points={displayPoints} />
          {displayPoints.map((p, idx) => (
            <CircleMarker
              key={`${p.id}-${idx}`}
              center={[p.lat, p.lng]}
              radius={8}
              pathOptions={{ color: '#1a73e8', fillColor: '#1a73e8', fillOpacity: 0.8 }}
            >
              <Tooltip direction='top' offset={[0, -8]} opacity={1} permanent>
                {`${p.price_nzd_week}$/w`}
              </Tooltip>
              <Popup>
                {p.clusterCount > 1 ? (
                  <div style={{ marginBottom: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#1d4ed8',
                        background: '#dbeafe',
                        border: '1px solid #bfdbfe',
                        borderRadius: 999,
                        padding: '2px 8px'
                      }}
                    >
                      {p.clusterCount} listings at this area
                    </span>
                  </div>
                ) : null}
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: '#4b5563' }}>{p.city}</div>
                <div style={{ marginTop: 4 }}>${p.price_nzd_week}/week</div>
                <a href={`/listing/${p.id}`} style={{ display: 'inline-block', marginTop: 6 }}>View detail</a>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
