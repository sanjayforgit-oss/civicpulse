import React from 'react';
import { MapPin, Camera, Image as ImageIcon } from 'lucide-react';
import { TN_DISTRICTS_WARDS } from '../mockData';

export default function PhotoLocationPicker({ lang, location, setLocation, photoUrl, setPhotoUrl }) {
  const samplePhotos = [
    { labelTa: "சாக்கடை கழிவுநீர்", labelEn: "Sewage Overflow", url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80" },
    { labelTa: "குப்பை குவியல்", labelEn: "Garbage Dump", url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80" },
    { labelTa: "ரோட்டுப் பள்ளம்", labelEn: "Road Pothole", url: "https://images.unsplash.com/photo-1584463699966-4122d258dd8d?auto=format&fit=crop&w=600&q=80" },
    { labelTa: "தெருவிளக்கு பழுது", labelEn: "Broken Streetlight", url: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80" }
  ];

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
          <MapPin size={18} color="#0ea5e9" />
          <span>{lang === 'ta' ? 'இடம் & மாநகராட்சி வார்டு தேர்வு:' : 'Select District / Ward Location:'}</span>
        </label>
        <select
          className="glass-input"
          value={location.name || ''}
          onChange={(e) => {
            if (!e.target.value) {
              setLocation({ name: '', lat: 13.0827, lon: 80.2707 });
              return;
            }
            const selected = TN_DISTRICTS_WARDS.find(item => item.name === e.target.value);
            if (selected) setLocation(selected);
          }}
        >
          <option value="" style={{ background: '#0f172a', color: '#888' }}>
            {lang === 'ta' ? '-- இடத்தைத் தேர்ந்தெடுக்கவும் (இயல்புநிலை இல்லை) --' : '-- Select Location (No Default Selected) --'}
          </option>
          {TN_DISTRICTS_WARDS.map((loc, idx) => (
            <option key={idx} value={loc.name} style={{ background: '#0f172a', color: '#fff' }}>
              {loc.name} (GPS: {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)})
            </option>
          ))}
        </select>
      </div>

      {/* Manual Coordinate Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Latitude:
          </label>
          <input
            type="number"
            step="any"
            className="glass-input"
            value={location.lat || 13.0827}
            onChange={(e) => setLocation(prev => ({ ...prev, lat: parseFloat(e.target.value) || 13.0827 }))}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Longitude:
          </label>
          <input
            type="number"
            step="any"
            className="glass-input"
            value={location.lon || location.lng || 80.2707}
            onChange={(e) => setLocation(prev => ({ ...prev, lon: parseFloat(e.target.value) || 80.2707, lng: parseFloat(e.target.value) || 80.2707 }))}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
          <Camera size={18} color="#0ea5e9" />
          <span>{lang === 'ta' ? 'புகைப்படம் பதிவேற்றம்:' : 'Upload Defect Photo:'}</span>
        </label>

        {photoUrl ? (
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <img
              src={photoUrl}
              alt="Uploaded defect"
              style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-color)' }}
            />
            <button
              onClick={() => setPhotoUrl('')}
              className="glass-btn glass-btn-danger"
              style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 10px', fontSize: '0.75rem' }}
            >
              {lang === 'ta' ? 'மாற்று' : 'Change Photo'}
            </button>
          </div>
        ) : (
          <div style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.4)',
            marginBottom: '12px'
          }}>
            <ImageIcon size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {lang === 'ta' ? 'மாதிரி புகைப்படத்தைத் தேர்ந்தெடுக்கவும்:' : 'Or choose a sample photo for testing:'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {samplePhotos.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setPhotoUrl(sample.url)}
                  className="glass-btn"
                  style={{ fontSize: '0.75rem', padding: '6px', justifyContent: 'center' }}
                >
                  {lang === 'ta' ? sample.labelTa : sample.labelEn}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
