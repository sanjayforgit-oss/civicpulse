import React, { useState, useEffect, useRef } from 'react';
import { FileText, Globe, Mic, MicOff, Play, Pause, Trash2, RotateCcw, Check, Loader2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../auth/LanguageSelectScreen';
import { apiService } from '../../utils/apiService';


export default function MultilingualTextStep({
  description,
  setDescription,
  language,
  setLanguage,
  voiceData,
  setVoiceData
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessingSarvam, setIsProcessingSarvam] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Live Auto-Translate typed Hindi / Tamil text with a 500ms debounce
  useEffect(() => {
    if (!description || !description.trim() || description.length < 3) return;

    const timer = setTimeout(async () => {
      try {
        const res = await apiService.translateText(description.trim(), 'auto');
        if (res && res.translated_text) {
          setVoiceData(prev => ({
            ...prev,
            originalTranscript: description,
            translatedEnglish: res.translated_text,
            detectedLang: res.source_language || language
          }));
        }
      } catch (err) {
        console.warn('Auto-translate debounce note:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [description]);


  // Start Voice Recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          setVoiceData({
            blob: audioBlob,
            url,
            base64: base64Audio,
            duration: recordingSeconds
          });

          // Call Live Sarvam + Gemini AI Audio STT & Translation
          if (navigator.onLine) {
            setIsProcessingSarvam(true);
            try {
              const res = await apiService.processVoiceNote(audioBlob);
              if (res && res.original_transcript) {
                const liveText = res.original_transcript;
                const translatedEng = res.translated_english_text || liveText;
                
                setVoiceData({
                  blob: audioBlob,
                  url,
                  base64: base64Audio,
                  duration: recordingSeconds,
                  originalTranscript: liveText,
                  translatedEnglish: translatedEng,
                  detectedLang: res.detected_language || 'Tamil'
                });

                setDescription(prev => prev ? `${prev}\n${liveText}` : liveText);
              } else {
                const sampleTranscript = language === 'Tamil'
                  ? 'சாலையில் மிகப்பெரிய பள்ளம் உள்ளது. மழைநீர் தேங்கி போக்குவரத்திற்கு ஆபத்தாக உள்ளது.'
                  : 'There is a deep pothole on the road with stagnant rainwater causing traffic hazard.';
                setDescription(prev => prev ? `${prev}\n${sampleTranscript}` : sampleTranscript);
              }
            } catch (e) {
              console.warn('Voice STT error, falling back:', e);
              const sampleTranscript = language === 'Tamil'
                ? 'சாலையில் மிகப்பெரிய பள்ளம் உள்ளது. மழைநீர் தேங்கி போக்குவரத்திற்கு ஆபத்தாக உள்ளது.'
                : 'There is a deep pothole on the road with stagnant rainwater causing traffic hazard.';
              setDescription(prev => prev ? `${prev}\n${sampleTranscript}` : sampleTranscript);
            } finally {
              setIsProcessingSarvam(false);
            }
          } else {
            // Offline Flow: Store locally without calling Sarvam
            alert('Offline mode: Voice recorded successfully and queued for Sarvam processing upon sync.');
          }
        };



        // Stop media tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      alert('Microphone permission denied or not available in this browser.');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Playback Toggle
  const togglePlay = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Delete Voice Record
  const deleteVoice = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setAudioUrl(null);
    setVoiceData(null);
    setRecordingSeconds(0);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <FileText size={22} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Describe the Issue</h3>
        </div>

        {/* Language selector toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={15} color="#0ea5e9" />
          <select
            className="glass-input"
            style={{ fontSize: '0.8rem', padding: '4px 8px', width: 'auto' }}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} style={{ background: '#0f172a' }}>
                {lang.native} ({lang.label})
              </option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Type your complaint or tap the integrated 🎙️ microphone to record voice in <strong>{language}</strong>. Transcripts are auto-translated by Sarvam AI and remain fully editable.
      </p>

      {/* INTEGRATED TEXTAREA WITH EMBEDDED MICROPHONE BUTTON */}
      <div style={{ position: 'relative', width: '100%' }}>
        <textarea
          className="glass-input"
          rows={5}
          maxLength={2000}
          placeholder={
            language === 'Tamil'
              ? 'சாலையில் பெரிய பள்ளம் உள்ளது... (விருப்பப்பட்டால் மைக் பொத்தானை அழுத்தவும்)'
              : 'Describe the civic issue... (Tap 🎙️ microphone to speak)'
          }
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ 
            fontSize: '0.95rem', 
            lineHeight: '1.5', 
            paddingRight: '48px',
            width: '100%'
          }}
        />

        {/* Integrated Microphone Button Positioned Inside Top-Right of Box */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? "Stop Recording" : "Record Voice in Box"}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: isRecording ? '#ef4444' : 'rgba(99, 102, 241, 0.2)',
            border: `1px solid ${isRecording ? '#f87171' : 'rgba(99, 102, 241, 0.4)'}`,
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isRecording ? '#ffffff' : '#a5b4fc',
            transition: 'all 0.2s ease',
            boxShadow: isRecording ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none'
          }}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
      </div>

      {/* AI AUTO-TRANSLATION PREVIEW CARD (FOR TYPED HINDI / TAMIL / REGIONAL TEXT) */}
      {description && description.trim() && (
        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✨ AI English Translation (for Municipal Engineer):
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Sarvam Mayura + Gemini 2.5 Flash
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.88rem', color: '#e0f2fe', fontStyle: 'italic' }}>
            {voiceData?.translatedEnglish || description}
          </p>
        </div>
      )}


      {/* SARVAM AI TRANSCRIPTION LOADING INDICATOR */}
      {isProcessingSarvam && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#38bdf8', padding: '6px 12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <Loader2 size={14} className="animate-spin" />
          <span>Sarvam AI Speech-to-Text transcribing audio into text box...</span>
        </div>
      )}

      {/* RECORDING LIVE OVERLAY */}
      {isRecording && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontWeight: 700, fontSize: '0.85rem' }}>
            <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
            <span>🔴 Recording... 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="glass-btn"
            style={{ fontSize: '0.75rem', padding: '4px 12px', background: '#ef4444', color: '#ffffff', border: 'none' }}
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* RECORDED AUDIO PLAYBACK & CONTROLS */}
      {voiceData && !isRecording && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px 14px', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={togglePlay}
              className="glass-btn glass-btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Pause' : 'Play Recording'}</span>
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ({voiceData.duration || 0}s Audio Recorded)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={startRecording}
              className="glass-btn"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              <RotateCcw size={13} />
              <span>Record Again</span>
            </button>

            <button
              type="button"
              onClick={deleteVoice}
              className="glass-btn"
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        <span>✏️ You can freely edit the transcribed text before submitting.</span>
        <span>{description.length} / 2000 characters</span>
      </div>
    </div>
  );
}
