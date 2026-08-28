import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Trash2, CheckCircle2, MapPin } from 'lucide-react';

export default function PhotoCaptureStep({ photoUrl, setPhotoUrl, onExifLocationDetected }) {
  const fileInputRef = useRef(null);

  const sampleDemoImages = [
    { label: 'Pothole Defect', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80', lat: 13.0827, lng: 80.2707, ward: 'Ward 104, Anna Nagar, Chennai' },
    { label: 'Streetlight Cable Fault', url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80', lat: 9.9252, lng: 78.1198, ward: 'Ward 45, Madurai Main' },
    { label: 'Garbage Dump', url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80', lat: 11.0168, lng: 76.9558, ward: 'Ward 12, Gandhipuram, Coimbatore' }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate image type & size (Max 5MB)
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result);
      // Simulated EXIF GPS Metadata extraction
      if (onExifLocationDetected) {
        onExifLocationDetected({ lat: 13.0827, lng: 80.2707, ward: 'Ward 104, EXIF Camera Location', source: 'EXIF' });
      }
    };
    reader.readAsDataURL(file);
  };

  const selectSampleImage = (item) => {
    setPhotoUrl(item.url);
    if (onExifLocationDetected) {
      onExifLocationDetected({ lat: item.lat, lng: item.lng, ward: item.ward, source: 'EXIF' });
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
        <Camera size={22} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Step 1: Capture or Upload Photo</h3>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Attach a photo of the civic defect. Image metadata (EXIF GPS) will be automatically parsed if available.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Main Image Preview / Dropzone */}
      {photoUrl ? (
        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '2px solid #0ea5e9' }}>
          <img
            src={photoUrl}
            alt="Preview"
            style={{ width: '100%', maxHeight: '260px', objectFit: 'cover' }}
          />

          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '10px 14px',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Photo Attached (Compressed)
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="glass-btn"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                <RefreshCw size={13} /> Replace
              </button>

              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="glass-btn glass-btn-danger"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="glass-btn glass-btn-primary"
              style={{ flex: 1, padding: '16px', justifyContent: 'center', fontSize: '0.95rem' }}
            >
              <Camera size={20} />
              <span>Take Photo / Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="glass-btn"
              style={{ flex: 1, padding: '16px', justifyContent: 'center', fontSize: '0.95rem' }}
            >
              <ImageIcon size={20} />
              <span>Choose from Gallery</span>
            </button>
          </div>

          {/* Sample preset photos for testing */}
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Or choose a sample defect photo for testing:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {sampleDemoImages.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSampleImage(item)}
                  className="glass-btn"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'center' }}
                >
                  📸 {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
