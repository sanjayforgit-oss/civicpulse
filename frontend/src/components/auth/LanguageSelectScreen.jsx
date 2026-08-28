import React from 'react';
import { Globe, ArrowRight, Check } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: "English", label: "English", native: "English" },
  { code: "Tamil", label: "Tamil", native: "தமிழ்" },
  { code: "Hindi", label: "Hindi", native: "हिन्दी" },
  { code: "Telugu", label: "Telugu", native: "తెలుగు" },
  { code: "Kannada", label: "Kannada", native: "கன்னட" },
  { code: "Malayalam", label: "Malayalam", native: "മലയാളം" },
  { code: "Bengali", label: "Bengali", native: "বাংলা" }
];

export default function LanguageSelectScreen({ selectedLang, onSelectLang, onContinue }) {
  return (
    <div style={{
      maxWidth: '460px',
      margin: '20px auto',
      padding: '28px 24px',
      textAlign: 'center'
    }} className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
        <Globe size={24} color="#0ea5e9" />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Choose Your Language</h2>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Select preferred language for citizen UI & Sarvam AI voice translation.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = selectedLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => onSelectLang(lang.code)}
              className="glass-btn"
              style={{
                padding: '14px 18px',
                justify: 'space-between',
                borderColor: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.12)',
                background: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{lang.native}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({lang.label})</span>
              </div>
              {isSelected && <Check size={18} color="#0ea5e9" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        className="glass-btn glass-btn-primary"
        style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '1rem' }}
      >
        <span>Continue with {selectedLang}</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
