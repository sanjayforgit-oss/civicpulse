import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, RefreshCw, Volume2, CheckCircle2 } from 'lucide-react';

export default function VoiceRecordStep({ voiceData, setVoiceData }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(voiceData?.audioUrl || null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert to Base64 data URL for offline storage & intake payload
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceData({
            audioUrl: url,
            base64: reader.result,
            duration: '0:15'
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access permission required to record audio note.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSimulateDemoVoice = () => {
    const demoUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    setAudioUrl(demoUrl);
    setVoiceData({
      audioUrl: demoUrl,
      base64: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA...',
      duration: '0:10'
    });
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setVoiceData(null);
    setIsPlaying(false);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
        <Mic size={22} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Step 3: Voice Note Recording</h3>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Record a voice note in regional language. Saved locally for offline compatibility.
      </p>

      {audioUrl ? (
        <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Volume2 size={20} color="#10b981" />
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} /> Voice Note Recorded
              </div>
              <audio src={audioUrl} controls style={{ height: '32px', marginTop: '6px' }} />
            </div>
          </div>

          <button
            type="button"
            onClick={deleteRecording}
            className="glass-btn glass-btn-danger"
            style={{ padding: '8px', borderRadius: '50%' }}
            title="Delete Recording"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="glass-btn glass-btn-danger"
              style={{ padding: '16px', justifyContent: 'center', fontSize: '1rem', animation: 'pulse 1.5s infinite' }}
            >
              <Square size={20} />
              <span>Stop Recording Audio</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={startRecording}
                className="glass-btn glass-btn-primary"
                style={{ flex: 1, padding: '14px', justifyContent: 'center', fontSize: '0.9rem' }}
              >
                <Mic size={18} />
                <span>Start Microphone Recording</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateDemoVoice}
                className="glass-btn"
                style={{ flex: 1, padding: '14px', justifyContent: 'center', fontSize: '0.85rem' }}
              >
                🎙️ Simulate Demo Voice
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
