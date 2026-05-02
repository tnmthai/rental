'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type ListingDetailMapProps = {
  title: string;
  city: string;
  price: number;
  lat: number;
  lng: number;
};

export default function ListingDetailMap({ title, city, price, lat, lng }: ListingDetailMapProps) {
  return (
    <div style={{ border: '1px solid #dbe3ec', borderRadius: 12, overflow: 'hidden', boxShadow: '0 14px 28px rgba(15, 23, 42, 0.08)' }}>
      <MapContainer center={[lat, lng]} zoom={14} style={{ width: '100%', height: 280 }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors'
          url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          detectRetina
        />
        <CircleMarker
          center={[lat, lng]}
          radius={10}
          pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.9, weight: 3 }}
        >
          <Popup>
            <div style={{ fontWeight: 700 }}>{title}</div>
            <div style={{ color: '#4b5563', fontSize: 13 }}>{city}</div>
            <div style={{ marginTop: 4 }}>${price}/week</div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
