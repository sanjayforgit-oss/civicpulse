import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Compass, CheckCircle2, Navigation } from 'lucide-react';
import L from 'leaflet';
import { TN_DISTRICTS_WARDS } from '../../mockData';

// Fix Leaflet Default Icon Assets Path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

export default function LocationPickerStep({ locationData, setLocationData, onComplete }) {
  const [loadingGps, setLoadingGps] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  const currentLat = locationData.lat || 13.0827;
  const currentLng = locationData.lng || locationData.lon || 80.2707;
  const currentWard = typeof locationData.ward === 'string' ? locationData.ward : (locationData.ward?.name || '');

  const isExifLocked = locationData.source === 'EXIF';

  // Initialize Interactive Satellite/Street Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 14,
        zoomControl: true
      });

      // Satellite Imagery Tile Layer
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
      }).addTo(map);

      // Draggable Location Pin Marker (Only draggable if not locked by Photo EXIF)
      const marker = L.marker([currentLat, currentLng], { draggable: !isExifLocked }).addTo(map);
      marker.bindPopup(
        isExifLocked 
          ? '🔒 <b>Location Locked by Photo EXIF Metadata</b>' 
          : '<b>Drag to pick exact defect location</b>'
      ).openPopup();

      marker.on('dragend', (e) => {
        if (locationData.source === 'EXIF') return; // Enforce EXIF provenance
        const newCoords = e.target.getLatLng();
        setLocationData(prev => ({
          ...prev,
          lat: newCoords.lat,
          lng: newCoords.lng,
          source: 'MAP_PIN'
        }));
        setIsConfirmed(true);
      });

      // Map Click Event to move marker & pick coordinates
      map.on('click', (e) => {
        if (locationData.source === 'EXIF') {
          alert('📍 Location is strictly locked to the photo\'s EXIF GPS metadata to ensure civic complaint authenticity.');
          return;
        }
        marker.setLatLng(e.latlng);
        setLocationData(prev => ({
          ...prev,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          source: 'MAP_CLICK'
        }));
        setIsConfirmed(true);
      });

      leafletMapRef.current = map;
      markerRef.current = marker;
    }
  }, []);


  // Sync Leaflet map center when coordinates change
  useEffect(() => {
    if (leafletMapRef.current && markerRef.current) {
      leafletMapRef.current.setView([currentLat, currentLng], 15);
      markerRef.current.setLatLng([currentLat, currentLng]);
    }
  }, [currentLat, currentLng]);

  const handleFetchGps = () => {
    setLoadingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocationData(prev => ({
            ...prev,
            lat: lat,
            lng: lng,
            accuracy: Math.round(position.coords.accuracy),
            source: 'LIVE_GPS',
            ward: prev.ward || 'Greater Chennai Corporation (Ward 104 - Anna Nagar)'
          }));
          setLoadingGps(false);
          setIsConfirmed(true);
        },
        (error) => {
          // Fallback location on browser denied/timeout
          alert('⚠️ GPS Access Denied or Timeout! The browser is blocking location access. We have fallen back to the default map view. Please manually drag the pin or allow location permissions.');
          setLocationData(prev => ({
            ...prev,
            lat: 13.0827,
            lng: 80.2707,
            accuracy: 12,
            source: 'LIVE_GPS_FALLBACK',
            ward: prev.ward || 'Greater Chennai Corporation (Ward 104 - Anna Nagar)'
          }));
          setLoadingGps(false);
          setIsConfirmed(true);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setLoadingGps(false);
    }
  };

  const selectWardOption = (wardName) => {
    if (!wardName) {
      setLocationData(prev => ({ ...prev, ward: '' }));
      return;
    }
    const selectedObj = TN_DISTRICTS_WARDS.find(item => item.name === wardName);
    setLocationData(prev => ({
      ...prev,
      ward: wardName,
      lat: selectedObj ? selectedObj.lat : prev.lat,
      lng: selectedObj ? selectedObj.lon : prev.lng,
      source: 'MANUAL_WARD'
    }));
    setIsConfirmed(true);
  };

  const handleManualCoordinateChange = (field, val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setLocationData(prev => ({
      ...prev,
      [field]: num,
      source: 'MANUAL_COORDINATES'
    }));
    setIsConfirmed(true);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <MapPin size={22} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Step 3: Location & Coordinate Verification</h3>
        </div>

        {isExifLocked ? (
          <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '12px', border: '1px solid #10b981', fontWeight: 700 }}>
            🔒 EXIF Camera GPS Locked
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '12px' }}>
            🛰️ Live Device GPS (Default)
          </span>
        )}
      </div>

      {isExifLocked ? (
        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', fontSize: '0.85rem', color: '#a7f3d0' }}>
          📍 <strong>Tamper-Proof EXIF Metadata:</strong> Location coordinates are permanently locked to the exact GPS tags extracted from your uploaded photo.
        </div>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No EXIF GPS tags found in photo. Coordinates are automatically set to your <strong>Live Device GPS</strong>. You can adjust the pin on the map if needed.
        </p>
      )}

      {/* Primary Live GPS Detect Button */}
      <button
        type="button"
        onClick={handleFetchGps}
        disabled={loadingGps || isExifLocked}
        className="glass-btn glass-btn-primary"
        style={{ padding: '12px', justifyContent: 'center', fontSize: '0.9rem' }}
      >
        <Navigation size={18} />
        <span>{loadingGps ? 'Detecting Live GPS...' : 'Detect Live Device GPS Location'}</span>
      </button>

      {/* Live Esri Satellite Leaflet Map Container */}
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, marginBottom: '6px' }}>
          🗺️ Live Satellite Map (Click or Drag Marker to Pick Location):
        </label>
        <div
          ref={mapContainerRef}
          style={{
            height: '240px',
            width: '100%',
            borderRadius: '14px',
            border: '2px solid var(--border-color)',
            overflow: 'hidden',
            zIndex: 1
          }}
        />
      </div>

      {/* Manual Latitude & Longitude Input Fields (Option for Exact Coordinates) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Latitude Coordinate:
          </label>
          <input
            type="number"
            step="any"
            className="glass-input"
            value={currentLat}
            disabled={isExifLocked}
            onChange={(e) => handleManualCoordinateChange('lat', e.target.value)}
            placeholder="e.g. 13.0827"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Longitude Coordinate:
          </label>
          <input
            type="number"
            step="any"
            className="glass-input"
            value={currentLng}
            disabled={isExifLocked}
            onChange={(e) => handleManualCoordinateChange('lng', e.target.value)}
            placeholder="e.g. 80.2707"
          />
        </div>
      </div>


      {/* Ward Dropdown Picker (Removed Default Selection -> Requires Explicit Choice) */}
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Select Ward Area (Optional):
        </label>
        <select
          className="glass-input"
          value={currentWard}
          onChange={(e) => selectWardOption(e.target.value)}
        >
          <option value="" style={{ background: '#0f172a' }}>
            -- Select Ward / District (No Default Selected) --
          </option>
          {TN_DISTRICTS_WARDS.map((wardObj, idx) => (
            <option key={idx} value={wardObj.name} style={{ background: '#0f172a' }}>
              {wardObj.name}
            </option>
          ))}
        </select>
      </div>

      {/* Explicit Location Confirmation Button */}
      <button
        type="button"
        onClick={() => setIsConfirmed(!isConfirmed)}
        className={`glass-btn ${isConfirmed ? 'glass-btn-primary' : ''}`}
        style={{ padding: '12px', justifyContent: 'center', fontSize: '0.9rem' }}
      >
        <CheckCircle2 size={18} color={isConfirmed ? '#ffffff' : '#6ee7b7'} />
        <span>{isConfirmed ? 'Location Confirmed ✓' : 'Click to Confirm Location'}</span>
      </button>
    </div>
  );
}
