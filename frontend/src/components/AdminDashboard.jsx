import React, { useState } from 'react';
import { 
  Shield, Layers, Flame, AlertCircle, TrendingUp, CheckCircle, MapPin, 
  Clock, DollarSign, Activity, Zap, Users, BarChart3, ArrowUpRight, Award, AlertTriangle, CheckSquare
} from 'lucide-react';
import { TN_DEPARTMENTS, ESCALATION_LEVELS } from '../mockData';
import CivicHeatmapView from './citizen/CivicHeatmapView';
import { apiService } from '../utils/apiService';

export default function AdminDashboard({ lang = 'en', complaints = [] }) {
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [isDemoSlaMode, setIsDemoSlaMode] = useState(true);
  const [selectedEscalationLevel, setSelectedEscalationLevel] = useState('ALL');

  // Metric counts
  const totalComplaints = complaints.length;
  const openCount = complaints.filter(c => c.status === 'OPEN').length;
  const inProgressCount = complaints.filter(c => c.status === 'IN_PROGRESS' || c.workflow_state === 'IN_PROGRESS').length;
  const escalatedCount = complaints.filter(c => (c.escalationLevel && c.escalationLevel > 1) || c.slaDaysRemaining <= 0).length;
  const pendingConfirmation = complaints.filter(c => c.status === 'PENDING_CONFIRMATION').length;
  const resolvedCount = complaints.filter(c => c.status === 'RESOLVED').length;

  // Departmental Budget Allocation Metrics
  const deptBudgets = [
    { id: 'HIGHWAYS', name: 'Highways & Infrastructure', allocated: 2500000, spent: 1120000, activeTickets: 14 },
    { id: 'SWM', name: 'Solid Waste Management', allocated: 1800000, spent: 850000, activeTickets: 22 },
    { id: 'TNEB', name: 'TNEB Electricity Board', allocated: 2000000, spent: 940000, activeTickets: 8 },
    { id: 'CMWSSB', name: 'Water & Sewerage Board', allocated: 3000000, spent: 1750000, activeTickets: 19 },
    { id: 'CORPORATION', name: 'Municipal Corporation', allocated: 1500000, spent: 620000, activeTickets: 11 }
  ];

  const handleToggleSlaMode = async () => {
    try {
      const newMode = !isDemoSlaMode;
      setIsDemoSlaMode(newMode);
      await apiService.configureSlaMode(newMode);
      alert(`SLA Clock configured to: ${newMode ? 'DEMO MODE (2 Mins Critical / 5 Mins Normal)' : 'PRODUCTION MODE (15 Days Critical / 30 Days Normal)'}`);
    } catch (e) {
      alert(`SLA Mode set to: ${!isDemoSlaMode ? 'Demo Mode' : 'Production Mode'}`);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* EXECUTIVE HEADER */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-escalated" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid #6366f1' }}>
                STATE COMMAND & CONTROL CENTER
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tamil Nadu Governance Portal</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
              Executive Administrator & State Collector Portal
            </h2>
          </div>

          {/* DEMO SLA CLOCK CONTROLLER SWITCH */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#090d16', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>SLA ENGINE POLICY:</div>
              <div style={{ fontSize: '0.82rem', color: isDemoSlaMode ? '#f59e0b' : '#10b981', fontWeight: 800 }}>
                {isDemoSlaMode ? '⚡ DEMO CLOCK (2 Mins)' : '📅 PRODUCTION (15 Days)'}
              </div>
            </div>

            <button
              onClick={handleToggleSlaMode}
              className="glass-btn glass-btn-primary"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              <Zap size={14} />
              <span>Toggle SLA Policy</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP METRIC SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL CIVIC TICKETS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{totalComplaints}</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid #0ea5e9' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE OPEN TICKETS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{openCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>WORK IN PROGRESS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fde047', marginTop: '4px' }}>{inProgressCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid #a855f7' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>HIERARCHY ESCALATED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e9d5ff', marginTop: '4px' }}>{escalatedCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERIFIED & RESOLVED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6ee7b7', marginTop: '4px' }}>{resolvedCount}</div>
        </div>
      </div>

      {/* DEPARTMENTAL BUDGET ALLOCATION MATRIX */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={18} color="#10b981" />
          <span>Departmental Budget Authorization & Expenditure Tracker</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {deptBudgets.map(dept => {
            const pctSpent = Math.round((dept.spent / dept.allocated) * 100);
            return (
              <div key={dept.id} style={{ background: '#090d16', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>{dept.name}</span>
                  <span className="badge badge-low">{dept.activeTickets} Tickets</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Spent: ₹{dept.spent.toLocaleString()}</span>
                  <span>Allocated: ₹{dept.allocated.toLocaleString()}</span>
                </div>

                {/* PROGRESS BAR */}
                <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${pctSpent}%`, height: '100%', background: pctSpent > 80 ? '#ef4444' : '#10b981', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-LEVEL ADMINISTRATIVE ESCALATION HIERARCHY TRAIL */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} color="#a855f7" />
          <span>5-Level Automatic Administrative Escalation Hierarchy</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {[
            { level: 'L1', title: 'Ward Assistant Engineer', timeout: '24h (Real) / 1m (Demo)', color: '#38bdf8' },
            { level: 'L2', title: 'Zonal Executive Engineer', timeout: '48h (Real) / 2m (Demo)', color: '#f59e0b' },
            { level: 'L3', title: 'City Deputy Commissioner', timeout: '72h (Real) / 3m (Demo)', color: '#a855f7' },
            { level: 'L4', title: 'District Collector', timeout: '96h (Real) / 4m (Demo)', color: '#ef4444' },
            { level: 'L5', title: 'CM Special Cell', timeout: '120h (Real) / 5m (Demo)', color: '#f43f5e' }
          ].map(lvl => (
            <div key={lvl.level} style={{ background: '#090d16', padding: '14px', borderRadius: '8px', borderLeft: `4px solid ${lvl.color}` }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: lvl.color }}>{lvl.level} ESCALATION LEVEL</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>{lvl.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>Timeout: {lvl.timeout}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STATEWIDE REAL SATELLITE HEATMAP COMMAND MAP */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={18} color="#38bdf8" />
          <span>Statewide Geospatial Hotspot Satellite Visualizer</span>
        </h3>
        <CivicHeatmapView />
      </div>

    </div>
  );
}
