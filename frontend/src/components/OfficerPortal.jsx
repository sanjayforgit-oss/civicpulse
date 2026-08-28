import React, { useState, useEffect } from 'react';
import { 
  Clock, ShieldAlert, CheckCircle, Upload, Camera, FileText, UserCheck, 
  AlertCircle, ArrowRight, Eye, DollarSign, Hammer, ClipboardList, Map, 
  CheckSquare, Activity, AlertTriangle, Layers, PauseCircle, PlayCircle, Zap
} from 'lucide-react';
import CivicHeatmapView from './citizen/CivicHeatmapView';
import ProofOfWorkView from './citizen/ProofOfWorkView';
import { TN_DEPARTMENTS } from '../mockData';
import { apiService } from '../utils/apiService';

export default function OfficerPortal({ lang, complaints = [], setComplaints }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'assigned' | 'inspections' | 'work_orders' | 'approvals' | 'map'
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Active Action Modal inside Detail
  const [activeModal, setActiveModal] = useState(null); // null | 'inspection' | 'budget' | 'work_order' | 'evidence' | 'pause'
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [pauseReason, setPauseReason] = useState('AWAITING_APPROVAL');

  // Form States
  const [inspectionData, setInspectionData] = useState({
    problem_condition: 'Severe asphalt erosion with water logging',
    severity: 'HIGH',
    dimensions: '2.5m x 1.2m x 0.15m',
    safety_risk: 'MEDIUM',
    required_materials: 'Cold-mix asphalt, crushed aggregate stone',
    required_manpower: 3,
    preliminary_estimate: 25000,
    inspection_notes: 'Inspected on site. High risk to two-wheelers during monsoon rains.',
    recommended_action: 'Immediate resurfacing & asphalt leveling'
  });

  const [budgetData, setBudgetData] = useState({
    estimated_cost: 25000,
    reason: 'Requires special cold-mix bitumen & road roller hire.'
  });

  const [workOrderData, setWorkOrderData] = useState({
    work_description: 'Resurface damaged road patch with cold-mix asphalt.',
    materials: 'Bitumen emulsion, aggregate base',
    manpower: 4,
    estimated_cost: 25000,
    assigned_team: 'internal_field_team',
    deadline_days: 3,
    priority: 'HIGH'
  });

  const [evidenceData, setEvidenceData] = useState({
    after_photo_url: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=600&q=80',
    completion_notes: 'Asphalt repair completed, compacted, and traffic restored.',
    completion_latitude: 13.0827,
    completion_longitude: 80.2707
  });

  // Department List from mockData (supports Object or Array)
  const deptList = Array.isArray(TN_DEPARTMENTS) 
    ? TN_DEPARTMENTS 
    : Object.values(TN_DEPARTMENTS);

  // Filtered list based on department selection
  const filteredComplaints = selectedDept === 'ALL'
    ? complaints
    : complaints.filter(c => c.department === selectedDept);

  // Summary Metrics
  const summaryMetrics = {
    new_assignments: filteredComplaints.filter(c => c.status === 'OPEN' || c.status === 'ASSIGNED').length,
    high_priority: filteredComplaints.filter(c => c.priority === 'HIGH' || c.priority === 'CRITICAL').length,
    in_progress: filteredComplaints.filter(c => c.status === 'IN_PROGRESS' || c.workflow_state === 'IN_PROGRESS').length,
    sla_nearing: filteredComplaints.filter(c => c.slaDaysRemaining <= 2).length,
    overdue: filteredComplaints.filter(c => c.slaDaysRemaining <= 0).length,
    completed: filteredComplaints.filter(c => c.status === 'PENDING_CONFIRMATION' || c.status === 'RESOLVED').length
  };

  const handleAcceptTask = (complaintId) => {
    setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, status: 'ACCEPTED', workflow_state: 'ACCEPTED' } : c));
    alert(`Task ${complaintId} Accepted! Status updated to ACCEPTED.`);
  };

  const handleSubmitInspection = (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { 
      ...c, 
      workflow_state: 'SITE_INSPECTION',
      estimatedCost: inspectionData.preliminary_estimate,
      budgetStatus: inspectionData.preliminary_estimate > 20000 ? 'BUDGET_CHECK_REQUIRED' : 'BUDGET_NOT_REQUIRED'
    } : c));
    alert('Site Inspection Report submitted successfully!');
    setActiveModal(null);
  };

  const handleSubmitBudgetRequest = (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { 
      ...c, 
      workflow_state: 'APPROVAL_PENDING',
      budgetStatus: 'AWAITING_APPROVAL',
      estimatedCost: budgetData.estimated_cost
    } : c));
    alert('Funding request submitted for Supervisor review.');
    setActiveModal(null);
  };

  const handleCreateWorkOrder = (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { 
      ...c, 
      workflow_state: 'WORK_ORDER_CREATED',
      status: 'IN_PROGRESS',
      assignedTeam: workOrderData.assigned_team
    } : c));
    alert('Work Order created and dispatched to field team!');
    setActiveModal(null);
  };

  const handleSubmitEvidence = (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { 
      ...c, 
      workflow_state: 'WAITING_FOR_CITIZEN_VERIFICATION',
      status: 'PENDING_CONFIRMATION',
      afterPhotoUrl: evidenceData.after_photo_url,
      workNotes: evidenceData.completion_notes
    } : c));
    alert('Resolution evidence uploaded! Ticket submitted for Citizen Verification.');
    setActiveModal(null);
    setSelectedComplaint(null);
  };

  const handlePauseSLA = (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? {
      ...c,
      slaPaused: true,
      slaPauseReason: pauseReason,
      history: [
        ...(c.history || []),
        {
          step: `SLA Paused (${pauseReason})`,
          note: `Officer logged legitimate pause reason: ${pauseReason}`,
          timestamp: new Date().toISOString()
        }
      ]
    } : c));
    alert(`SLA Timer paused under legitimate rule: ${pauseReason}`);
    setActiveModal(null);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '30px' }}>
      
      {/* Officer Workspace Header & Sub-Navigation */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={22} color="#f59e0b" />
            <span>Municipal Officer Workspace</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Operational Portal for Assigned Department Tickets, Automatic SLA Engine & Work Orders
          </p>
        </div>

        {/* DEMO MODE CLOCK & NAVIGATION TABS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', color: '#a5b4fc' }}>
            <Zap size={14} color="#f59e0b" />
            <span><strong>DEMO MODE SLA:</strong> 2 Mins (Critical) / 5 Mins (Normal)</span>
          </div>

          <div style={{ display: 'flex', gap: '6px', background: '#090d16', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedComplaint(null); }} 
              className={`glass-btn ${activeTab === 'dashboard' ? 'glass-btn-primary' : ''}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px', border: 'none' }}
            >
              <Activity size={14} />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => { setActiveTab('assigned'); setSelectedComplaint(null); }} 
              className={`glass-btn ${activeTab === 'assigned' ? 'glass-btn-primary' : ''}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px', border: 'none' }}
            >
              <ClipboardList size={14} />
              <span>Assigned ({filteredComplaints.length})</span>
            </button>

            <button 
              onClick={() => setActiveTab('map')} 
              className={`glass-btn ${activeTab === 'map' ? 'glass-btn-primary' : ''}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px', border: 'none' }}
            >
              <Map size={14} />
              <span>Satellite Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* DEPARTMENT FILTER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Department:</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', ...deptList.map(d => d.id)].map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`glass-btn ${selectedDept === dept ? 'glass-btn-primary' : ''}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              {dept === 'ALL' ? 'All Departments' : deptList.find(d => d.id === dept)?.nameEn || dept}
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD TAB METRICS CARDS */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #38bdf8' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>NEW ASSIGNMENTS</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{summaryMetrics.new_assignments}</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #f43f5e' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>HIGH PRIORITY</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fca5a5', marginTop: '4px' }}>{summaryMetrics.high_priority}</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>IN PROGRESS</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fde047', marginTop: '4px' }}>{summaryMetrics.in_progress}</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #a855f7' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>SLA NEARING</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e9d5ff', marginTop: '4px' }}>{summaryMetrics.sla_nearing}</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>OVERDUE</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{summaryMetrics.overdue}</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>COMPLETED</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6ee7b7', marginTop: '4px' }}>{summaryMetrics.completed}</div>
          </div>
        </div>
      )}

      {/* SATELLITE MAP TAB */}
      {activeTab === 'map' && (
        <div style={{ marginBottom: '24px' }}>
          <CivicHeatmapView publicIssues={filteredComplaints.map(c => ({
            id: c.id,
            category: c.categoryEn || 'ROADS',
            lat: c.lat,
            lon: c.lon,
            ward: c.ward,
            status: c.status
          }))} />
        </div>
      )}

      {/* COMPLAINT LIST & DETAIL VIEW */}
      {!selectedComplaint ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredComplaints.map(comp => (
            <div key={comp.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px' }}>
                    {comp.id}
                  </span>
                  <span className={`badge ${comp.priority === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                    {comp.priority || 'MEDIUM'} PRIORITY
                  </span>
                </div>

                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  {comp.titleEn || comp.processed_description}
                </h3>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  📍 {comp.ward || 'Chennai Ward'}
                </p>

                {/* AUTOMATIC SLA & ESCALATION STATUS (NO MANUAL ESCALATE BUTTON EXISTS) */}
                <div style={{ padding: '10px 12px', background: '#090d16', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '14px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>SLA Policy (Configured):</span>
                    <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                      {comp.priority === 'CRITICAL' || comp.priority === 'HIGH' ? '15 Days (Real) / 2 Mins (Demo)' : '30 Days (Real) / 5 Mins (Demo)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Escalation Status:</span>
                    <span style={{ color: comp.slaPaused ? '#38bdf8' : comp.slaDaysRemaining <= 0 ? '#ef4444' : comp.slaDaysRemaining <= 2 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                      {comp.slaPaused 
                        ? `⏸️ PAUSED (${comp.slaPauseReason})` 
                        : comp.slaDaysRemaining <= 0 
                        ? '🚨 AUTO-ESCALATED (Level 1)' 
                        : comp.slaDaysRemaining <= 2 
                        ? '⚠️ APPROACHING DEADLINE' 
                        : '✅ ON TIME'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD ACTIONS */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedComplaint(comp)}
                  className="glass-btn glass-btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}
                >
                  <Eye size={14} />
                  <span>View Details</span>
                </button>

                {comp.status === 'OPEN' && (
                  <button
                    onClick={() => handleAcceptTask(comp.id)}
                    className="glass-btn"
                    style={{ fontSize: '0.78rem', borderColor: 'var(--accent-green)', color: '#6ee7b7' }}
                  >
                    <CheckCircle size={14} />
                    <span>Accept Task</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* SINGLE COMPLAINT OPERATIONAL DETAIL VIEW */
        <div className="glass-panel" style={{ padding: '24px' }}>
          <button
            onClick={() => { setSelectedComplaint(null); setActiveModal(null); }}
            className="glass-btn"
            style={{ marginBottom: '18px', fontSize: '0.8rem' }}
          >
            ← Back to Complaints List
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
                  Ticket {selectedComplaint.id}
                </h2>
                <span className="badge badge-high">{selectedComplaint.priority} PRIORITY</span>
                <span className="badge badge-escalated">STATE: {selectedComplaint.workflow_state || selectedComplaint.status}</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                📍 {selectedComplaint.ward} | Department: {selectedComplaint.department}
              </p>
            </div>

            {/* AUTOMATIC SLA ESCALATION STATUS PANEL */}
            <div style={{ padding: '10px 14px', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Automatic Backend SLA Escalation Engine:</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: selectedComplaint.slaPaused ? '#38bdf8' : selectedComplaint.slaDaysRemaining <= 0 ? '#ef4444' : '#10b981' }}>
                {selectedComplaint.slaPaused
                  ? `⏸️ SLA PAUSED (${selectedComplaint.slaPauseReason})`
                  : selectedComplaint.slaDaysRemaining <= 0
                  ? '🚨 AUTO-ESCALATED TO ZONAL SUPERVISOR'
                  : `✅ ON TIME (${selectedComplaint.slaDaysRemaining} Days Remaining)`}
              </div>
            </div>
          </div>

          {/* TWO COLUMN COMPLAINT DETAIL & WORKFLOW ACTIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            
            {/* LEFT COLUMN: CITIZEN EVIDENCE & AI ANALYSIS */}
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
                📷 Citizen Intake Photo Evidence
              </h4>
              <img
                src={selectedComplaint.photoUrl || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80"}
                alt="Intake Evidence"
                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '14px' }}
              />

              <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Original Citizen Description:</div>
                <p style={{ fontSize: '0.88rem', color: '#f8fafc', fontWeight: 500, marginBottom: '10px' }}>
                  "{selectedComplaint.titleTa || selectedComplaint.original_description}"
                </p>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Sarvam AI English Translation:</div>
                <p style={{ fontSize: '0.88rem', color: '#38bdf8', fontWeight: 600 }}>
                  "{selectedComplaint.titleEn || selectedComplaint.processed_description}"
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: OFFICER WORKFLOW ACTIONS & STAGES */}
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
                ⚙️ Officer Operational Workflow Actions
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <button
                  onClick={() => setActiveModal('inspection')}
                  className="glass-btn glass-btn-primary"
                  style={{ justifyContent: 'space-between', padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={16} />
                    <span>1. Submit Site Inspection Report</span>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => setActiveModal('budget')}
                  className="glass-btn"
                  style={{ justifyContent: 'space-between', padding: '12px 16px', borderColor: '#f59e0b', color: '#fde047' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={16} />
                    <span>2. Fund / Budget Check & Approval</span>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => setActiveModal('work_order')}
                  className="glass-btn"
                  style={{ justifyContent: 'space-between', padding: '12px 16px', borderColor: '#38bdf8', color: '#38bdf8' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Hammer size={16} />
                    <span>3. Issue Work Order to Field Team</span>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => setActiveModal('evidence')}
                  className="glass-btn"
                  style={{ justifyContent: 'space-between', padding: '12px 16px', borderColor: '#10b981', color: '#6ee7b7' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={16} />
                    <span>4. Upload Repair Evidence (Before/After)</span>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => setActiveModal('pause')}
                  className="glass-btn"
                  style={{ justifyContent: 'space-between', padding: '12px 16px', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PauseCircle size={16} color="#a855f7" />
                    <span>Pause SLA Timer (Legitimate Condition)</span>
                  </div>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* AUDIT LOG TRAIL */}
              <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  📜 Action Accountability & Audit Log Trail
                </h5>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedComplaint.history ? selectedComplaint.history.map((h, idx) => (
                    <div key={idx} style={{ padding: '6px 8px', background: '#131c2e', borderRadius: '6px' }}>
                      <strong style={{ color: '#f8fafc' }}>{h.step}:</strong> {h.note}
                    </div>
                  )) : (
                    <div>Task assigned to Ward Assistant Engineer.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PROOF OF WORK VERIFICATION PANEL FOR OFFICER */}
          {(selectedComplaint.afterPhotoUrl || selectedComplaint.resolution_after_photo || selectedComplaint.status === 'PENDING_CONFIRMATION' || selectedComplaint.status === 'RESOLVED') && (
            <div style={{ marginBottom: '24px' }}>
              <ProofOfWorkView issue={selectedComplaint} isOfficer={true} />
            </div>
          )}

          {/* DYNAMIC ACTION MODALS */}

          {/* SLA PAUSE MODAL */}
          {activeModal === 'pause' && (
            <div style={{ background: '#090d16', padding: '20px', borderRadius: '10px', border: '1px solid #a855f7', marginTop: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e9d5ff', marginBottom: '12px' }}>
                ⏸️ Pause SLA Timer (Legitimate Audited Condition)
              </h3>

              <form onSubmit={handlePauseSLA} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Legitimate Pause Reason:</label>
                  <select className="glass-input" value={pauseReason} onChange={e => setPauseReason(e.target.value)}>
                    <option value="AWAITING_APPROVAL">AWAITING APPROVAL (Inter-departmental)</option>
                    <option value="AWAITING_EXTERNAL_AGENCY">AWAITING EXTERNAL AGENCY (TNEB / Metro Water)</option>
                    <option value="COURT_HOLD">COURT / LEGAL HOLD</option>
                    <option value="NATURAL_DISASTER">NATURAL DISASTER (Cyclone / Monsoon Flood)</option>
                    <option value="MATERIAL_UNAVAILABLE">MATERIAL UNAVAILABLE (Supply Chain Delay)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="glass-btn glass-btn-primary" style={{ background: '#a855f7', borderColor: '#9333ea' }}>Confirm SLA Pause</button>
                  <button type="button" onClick={() => setActiveModal(null)} className="glass-btn">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* 1. SITE INSPECTION FORM MODAL */}
          {activeModal === 'inspection' && (
            <div style={{ background: '#090d16', padding: '20px', borderRadius: '10px', border: '1px solid var(--primary)', marginTop: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
                📋 Submit Site Inspection Report
              </h3>

              <form onSubmit={handleSubmitInspection} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Problem Condition:</label>
                  <input className="glass-input" value={inspectionData.problem_condition} onChange={e => setInspectionData({...inspectionData, problem_condition: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approx Dimensions:</label>
                  <input className="glass-input" value={inspectionData.dimensions} onChange={e => setInspectionData({...inspectionData, dimensions: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Preliminary Cost Estimate (₹):</label>
                  <input type="number" className="glass-input" value={inspectionData.preliminary_estimate} onChange={e => setInspectionData({...inspectionData, preliminary_estimate: Number(e.target.value)})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recommended Action:</label>
                  <input className="glass-input" value={inspectionData.recommended_action} onChange={e => setInspectionData({...inspectionData, recommended_action: e.target.value})} />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="submit" className="glass-btn glass-btn-primary">Submit Inspection Report</button>
                  <button type="button" onClick={() => setActiveModal(null)} className="glass-btn">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* 2. BUDGET APPROVAL MODAL */}
          {activeModal === 'budget' && (
            <div style={{ background: '#090d16', padding: '20px', borderRadius: '10px', border: '1px solid #f59e0b', marginTop: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fde047', marginBottom: '12px' }}>
                💰 Fund & Budget Approval Request
              </h3>

              <form onSubmit={handleSubmitBudgetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required Cost Estimate (₹):</label>
                  <input type="number" className="glass-input" value={budgetData.estimated_cost} onChange={e => setBudgetData({...budgetData, estimated_cost: Number(e.target.value)})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Justification / Reason:</label>
                  <textarea className="glass-input" rows={2} value={budgetData.reason} onChange={e => setBudgetData({...budgetData, reason: e.target.value})} />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="glass-btn" style={{ background: '#f59e0b', borderColor: '#d97706', color: '#ffffff' }}>Submit Request to Supervisor</button>
                  <button type="button" onClick={() => setActiveModal(null)} className="glass-btn">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* 3. WORK ORDER MODAL */}
          {activeModal === 'work_order' && (
            <div style={{ background: '#090d16', padding: '20px', borderRadius: '10px', border: '1px solid #38bdf8', marginTop: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginBottom: '12px' }}>
                🔨 Create Formal Work Order
              </h3>

              <form onSubmit={handleCreateWorkOrder} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Work Description:</label>
                  <input className="glass-input" value={workOrderData.work_description} onChange={e => setWorkOrderData({...workOrderData, work_description: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Execution Team:</label>
                  <select className="glass-input" value={workOrderData.assigned_team} onChange={e => setWorkOrderData({...workOrderData, assigned_team: e.target.value})}>
                    <option value="internal_field_team">Internal Highways Field Team</option>
                    <option value="maintenance_team">Zonal Maintenance Unit</option>
                    <option value="contractor">Approved Municipal Contractor</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="submit" className="glass-btn glass-btn-primary">Dispatch Work Order</button>
                  <button type="button" onClick={() => setActiveModal(null)} className="glass-btn">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* 4. EVIDENCE UPLOAD MODAL */}
          {activeModal === 'evidence' && (
            <div style={{ background: '#090d16', padding: '20px', borderRadius: '10px', border: '1px solid #10b981', marginTop: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#6ee7b7', marginBottom: '12px' }}>
                📸 Upload Resolution Repair Evidence
              </h3>

              <form onSubmit={handleSubmitEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>After Repair Photo URL:</label>
                  <input className="glass-input" value={evidenceData.after_photo_url} onChange={e => setEvidenceData({...evidenceData, after_photo_url: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Officer Completion Notes:</label>
                  <textarea className="glass-input" rows={2} value={evidenceData.completion_notes} onChange={e => setEvidenceData({...evidenceData, completion_notes: e.target.value})} />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="glass-btn glass-btn-primary">Submit for Citizen Verification</button>
                  <button type="button" onClick={() => setActiveModal(null)} className="glass-btn">Cancel</button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
