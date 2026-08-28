import React from 'react';
import { Home, Layers, PlusCircle, MapPin, User } from 'lucide-react';

export default function NavigationBar({ activeTab, onTabChange, onReportClick }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'hub', label: 'My Civic Hub', icon: Layers },
    { id: 'report', label: 'Report', icon: PlusCircle, isProminent: true },
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="glass-panel" style={{
      position: 'sticky',
      bottom: '12px',
      margin: '0 auto',
      maxWidth: '640px',
      width: 'calc(100% - 24px)',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 1000,
      borderRadius: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      borderColor: 'rgba(255, 255, 255, 0.15)'
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isProminent) {
          return (
            <button
              key={tab.id}
              onClick={onReportClick}
              className="glass-btn glass-btn-primary"
              style={{
                borderRadius: '50px',
                padding: '10px 18px',
                boxShadow: '0 0 20px rgba(14, 165, 233, 0.6)',
                transform: 'translateY(-12px)',
                border: '2px solid #38bdf8'
              }}
            >
              <PlusCircle size={22} color="#ffffff" />
              <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Report</span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon size={20} color={isActive ? '#0ea5e9' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 700 : 500 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
