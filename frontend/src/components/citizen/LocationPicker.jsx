import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Crosshair } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { isValidCoordinate, ensureValidCenter } from '../../utils/gis';

// Custom Marker Pin Icon
const pinIcon = new L.DivIcon({
  className: 'custom-pin-icon',
  html: `
    <div style="
      background: #0f766e;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(15, 118, 110, 0.4);
      border: 2.5px solid #ffffff;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: #ffffff;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Map click listener component
function LocationMarker({ position, onPositionChange }) {
  const map = useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position && isValidCoordinate(position[0], position[1]) ? (
    <Marker
      position={position}
      icon={pinIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          if (pos && isValidCoordinate(pos.lat, pos.lng)) {
            onPositionChange(pos.lat, pos.lng);
          }
        },
      }}
    />
  ) : null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}) {
  const { t } = useLanguage();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const defaultCenter = useMemo(() => [19.0760, 72.8777], []);
  const currentPos = useMemo(() => {
    if (isValidCoordinate(latitude, longitude)) {
      return [Number(latitude), Number(longitude)];
    }
    return ensureValidCenter(defaultCenter);
  }, [latitude, longitude, defaultCenter]);

  const handlePositionChange = (lat, lng) => {
    onLocationChange(lat, lng);
  };

  const handleGetGPS = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onLocationChange(lat, lng);
        setGpsLoading(false);
      },
      (err) => {
        onLocationChange(19.0760, 72.8777);
        setGpsError("Could not access device GPS. Defaulted to city coordinates.");
        setGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-teal-700" />
          <span>{t('location_label')}</span>
        </label>
        <button
          type="button"
          onClick={handleGetGPS}
          disabled={gpsLoading}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition-all cursor-pointer"
        >
          <Navigation className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
          <span>{gpsLoading ? 'Acquiring GPS...' : t('gps_btn')}</span>
        </button>
      </div>

      {/* Map Container */}
      <div className="h-56 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
        <MapContainer
          center={currentPos}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={currentPos}
            onPositionChange={handlePositionChange}
          />
        </MapContainer>

        <div className="absolute bottom-2 left-2 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 flex items-center space-x-1.5 shadow-sm font-medium">
          <Crosshair className="w-3 h-3 text-teal-700" />
          <span>Click map or drag pin to adjust coordinates</span>
        </div>
      </div>

      {/* Coordinates pill */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>{t('selected_coords')}:</span>
        <span className="font-mono text-slate-800 font-semibold">
          {isValidCoordinate(latitude, longitude)
            ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
            : '19.07600, 72.87770'}
        </span>
      </div>

      {gpsError && (
        <p className="text-[11px] text-amber-700">{gpsError}</p>
      )}
    </div>
  );
}
