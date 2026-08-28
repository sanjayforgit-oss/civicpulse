import React from 'react';
import CivicHeatmapView from './CivicHeatmapView';

export default function MapPlaceholderView({ publicIssues = [], onViewDetails }) {
  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <CivicHeatmapView onViewDetails={onViewDetails} />
    </div>
  );
}
