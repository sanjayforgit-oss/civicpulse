import React, { useState } from 'react';
import { Camera, FileText, MapPin, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import PhotoCaptureStep from './PhotoCaptureStep';
import MultilingualTextStep from './MultilingualTextStep';
import LocationPickerStep from './LocationPickerStep';
import ReviewSubmitStep from './ReviewSubmitStep';
import { apiService } from '../../utils/apiService';
import { syncEngine } from '../../utils/syncEngine';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ReportIssueContainer({ userAuth, onComplaintCreated }) {
  const [step, setStep] = useState(1); // 1: Photo, 2: Description & Voice Box, 3: Location, 4: Review
  
  // Intake state
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState(userAuth?.preferred_language || 'English');
  const [voiceData, setVoiceData] = useState(null);
  
  const [locationData, setLocationData] = useState({
    lat: 13.0827,
    lng: 80.2707,
    accuracy: 15.0,
    ward: '',
    source: 'GPS'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleExifLocation = (exifLoc) => {
    setLocationData(prev => ({
      ...prev,
      lat: exifLoc.lat,
      lng: exifLoc.lng,
      ward: typeof exifLoc.ward === 'string' ? exifLoc.ward : exifLoc.ward?.name || '',
      source: 'EXIF'
    }));
  };

  const handleFinalSubmit = async () => {
    setFeedback(null);

    // Validation: Require at least one content input (Photo, Text, or Voice)
    const hasPhoto = Boolean(photoUrl);
    const hasText = Boolean(description && description.trim());
    const hasVoice = Boolean(voiceData);

    if (!hasPhoto && !hasText && !hasVoice) {
      setFeedback({
        type: 'error',
        text: 'Please provide at least a Photo, Text Description, or Voice Recording before submitting!'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const wardString = typeof locationData.ward === 'string' 
        ? locationData.ward 
        : (locationData.ward?.name || 'Greater Chennai Corporation (Ward 104 - Anna Nagar)');

      const issuePayload = {
        description: description.trim() || null,
        language: language || 'English',
        media_url: photoUrl || null,
        voice_url: voiceData?.base64 || null,
        latitude: locationData.lat,
        longitude: locationData.lng,
        location_source: locationData.source,
        location_accuracy: locationData.accuracy,
        location_ward: wardString
      };

      // Check if network is offline
      if (!navigator.onLine) {
        // Queue in IndexedDB for auto-sync when online
        const offlineRecord = await syncEngine.enqueueOfflineComplaint(issuePayload);
        setFeedback({
          type: 'warning',
          text: `Offline — your complaint has been saved locally with status VOICE_PENDING_PROCESSING. It will upload and process automatically when connectivity returns.`
        });
        
        if (onComplaintCreated) {
          onComplaintCreated({
            id: offlineRecord.offline_submission_id,
            description: issuePayload.description || 'Offline Voice/Photo Complaint',
            location_ward: issuePayload.location_ward,
            status: 'WAITING_FOR_SYNC',
            media_url: issuePayload.media_url,
            created_at: offlineRecord.created_at
          });
        }
      } else {
        // Online intake API submission
        const res = await apiService.createIssue(issuePayload);

        // Also sync directly to Firebase Firestore for teammate's database
        try {
          const issuesCol = collection(db, 'issues');
          await addDoc(issuesCol, {
            ...issuePayload,
            backend_issue_id: res.id,
            reporterEmail: userAuth?.email || 'citizen@example.com',
            status: 'OPEN',
            created_at: serverTimestamp()
          });
        } catch (firebaseErr) {
          console.warn('Firebase Firestore mirror sync note:', firebaseErr.message);
        }

        setFeedback({
          type: 'success',
          text: `Complaint registered successfully! Issue ID: ${res.id}`
        });

        if (onComplaintCreated) {
          onComplaintCreated(res);
        }
      }


      // Reset form
      setTimeout(() => {
        setPhotoUrl('');
        setDescription('');
        setVoiceData(null);
        setStep(1);
        setFeedback(null);
      }, 1800);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to submit complaint.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Wizard Header Progress Indicator */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              CITIZEN INTAKE WIZARD (STEP {step} OF 4)
            </span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              {step === 1 && 'Capture Defect Photo'}
              {step === 2 && 'Integrated Text & Voice Description'}
              {step === 3 && 'GPS & Satellite Location Verification'}
              {step === 4 && 'Review & Final Submission'}
            </h2>
          </div>

          <span className="badge badge-low" style={{ fontSize: '0.75rem' }}>
            {userAuth?.preferred_language || 'English'}
          </span>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              onClick={() => setStep(s)}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: s <= step ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                cursor: 'pointer',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="glass-panel" style={{
          padding: '14px 20px',
          borderColor: feedback.type === 'success' ? '#10b981' : feedback.type === 'warning' ? '#f59e0b' : '#ef4444',
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : feedback.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedback.type === 'error' ? <AlertCircle color="#ef4444" /> : <CheckCircle2 color={feedback.type === 'success' ? '#10b981' : '#f59e0b'} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Active Wizard Step Component */}
      {step === 1 && (
        <PhotoCaptureStep
          photoUrl={photoUrl}
          setPhotoUrl={setPhotoUrl}
          onExifLocationDetected={handleExifLocation}
        />
      )}

      {step === 2 && (
        <MultilingualTextStep
          description={description}
          setDescription={setDescription}
          language={language}
          setLanguage={setLanguage}
          voiceData={voiceData}
          setVoiceData={setVoiceData}
        />
      )}

      {step === 3 && (
        <LocationPickerStep
          locationData={locationData}
          setLocationData={setLocationData}
          onComplete={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <ReviewSubmitStep
          photoUrl={photoUrl}
          description={description}
          voiceData={voiceData}
          locationData={locationData}
          language={language}
          isSubmitting={isSubmitting}
          onEditStep={(s) => setStep(s)}
          onSubmit={handleFinalSubmit}
        />
      )}

      {/* Wizard Footer Navigation Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep(prev => prev - 1)}
          className="glass-btn"
          style={{ padding: '10px 18px', opacity: step === 1 ? 0.4 : 1 }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep(prev => prev + 1)}
            className="glass-btn glass-btn-primary"
            style={{ padding: '10px 22px' }}
          >
            <span>Next Step</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Ready to submit
          </span>
        )}
      </div>
    </div>
  );
}
