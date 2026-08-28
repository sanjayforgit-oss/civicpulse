import React, { useState } from 'react';
import { Layers, FileText, Globe, Flame, Search } from 'lucide-react';
import PublicIssueCard from './PublicIssueCard';
import EmptyState from './EmptyState';
import CivicHeatmapView from './CivicHeatmapView';

export default function MyCivicHubScreen({
  myComplaints = [],
  publicIssues = [],
  onReportClick,
  onViewDetails,
  lang = 'en'
}) {
  const [hubTab, setHubTab] = useState('my_complaints'); // 'my_complaints' | 'public_issues' | 'heatmap'
  const [searchQuery, setSearchQuery] = useState('');

  const filterList = (list) => {
    return list.filter(item => 
      (item.title_en + item.title_ta + item.category + item.location_ward + item.id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  };

  const filteredMyComplaints = filterList(myComplaints);
  const filteredPublicIssues = filterList(publicIssues);

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hub Header */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Layers size={24} color="#0ea5e9" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>My Civic Hub</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Unified portal to manage your raised tickets, explore public community issues, and view real-time civic heatmaps.
        </p>
      </div>

      {/* Hub Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setHubTab('my_complaints')}
          className={`glass-btn ${hubTab === 'my_complaints' ? 'glass-btn-primary' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.85rem' }}
        >
          <FileText size={16} />
          <span>My Complaints ({myComplaints.length})</span>
        </button>

        <button
          onClick={() => setHubTab('public_issues')}
          className={`glass-btn ${hubTab === 'public_issues' ? 'glass-btn-primary' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.85rem' }}
        >
          <Globe size={16} />
          <span>Public Complaints ({publicIssues.length})</span>
        </button>

        <button
          onClick={() => setHubTab('heatmap')}
          className={`glass-btn ${hubTab === 'heatmap' ? 'glass-btn-primary' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.85rem' }}
        >
          <Flame size={16} />
          <span>Heatmap</span>
        </button>
      </div>

      {/* Search Input for Complaints & Public Lists */}
      {hubTab !== 'heatmap' && (
        <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="glass-input"
            style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem' }}
            placeholder="Search by ticket ID, ward, or issue keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* TAB 1: MY COMPLAINTS */}
      {hubTab === 'my_complaints' && (
        <div>
          {filteredMyComplaints.length === 0 ? (
            <EmptyState
              title="No Complaints Yet"
              description="You have not filed any civic issues yet. Notice a pothole or streetlight fault? Report it now!"
              actionText="Report A Civic Issue"
              onAction={onReportClick}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
              {filteredMyComplaints.map(issue => (
                <PublicIssueCard key={issue.id} issue={issue} onViewDetails={onViewDetails} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PUBLIC COMPLAINTS */}
      {hubTab === 'public_issues' && (
        <div>
          {filteredPublicIssues.length === 0 ? (
            <EmptyState
              title="No Public Issues Nearby"
              description="There are currently no public complaints in your area."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
              {filteredPublicIssues.map(issue => (
                <PublicIssueCard key={issue.id} issue={issue} onViewDetails={onViewDetails} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CIVIC ISSUE HEATMAP */}
      {hubTab === 'heatmap' && (
        <CivicHeatmapView onViewDetails={onViewDetails} />
      )}
    </div>
  );
}
