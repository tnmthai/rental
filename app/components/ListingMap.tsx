'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';

type Point = {
  id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  lat: number;
  lng: number;
};

function FitBounds({ points }: { points: Point[] }) {
  const map = useMap();

  useMemo(() => {
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
  if (!points.length) return null;

  return (
    <section style={{ marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 10px', color: '#111827' }}>Map view</h3>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <MapContainer center={[-41.2865, 174.7762]} zoom={5} style={{ width: '100%', height: 360 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <FitBounds points={points} />
          {points.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={8}
              pathOptions={{ color: '#1a73e8', fillColor: '#1a73e8', fillOpacity: 0.8 }}
            >
              <Tooltip direction='top' offset={[0, -8]} opacity={1} permanent>
                ${p.price_nzd_week}
              </Tooltip>
              <Popup>
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
