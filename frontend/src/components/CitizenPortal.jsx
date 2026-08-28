import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Globe, MapPin, CheckCircle2, AlertTriangle, Eye, Clock, 
  RotateCcw, ThumbsUp, ThumbsDown, ShieldCheck, WifiOff, RefreshCw, 
  Filter, Search, Layers, Activity, FileText, CheckSquare, Sparkles, X, Upload
} from 'lucide-react';
import CivicHeatmapView from './citizen/CivicHeatmapView';
import ReportIssueContainer from './intake/ReportIssueContainer';
import ProofOfWorkView from './citizen/ProofOfWorkView';
import { apiService } from '../utils/apiService';

export default function CitizenPortal({ lang, complaints = [], setComplaints, userAuth }) {
  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'raise' | 'heatmap'
  const [selectedSection, setSelectedSection] = useState('my'); // 'my' | 'public' | 'heatmap'
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Reopen Form Modal State
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenProofPhoto, setReopenProofPhoto] = useState('');
  const [reopenError, setReopenError] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [publicIssues, setPublicIssues] = useState([]);

  // Fetch all public community issues from Database on mount
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const pub = await apiService.getPublicIssues();
        if (pub && pub.length > 0) {
          setPublicIssues(pub);
        }
      } catch (err) {
        console.warn('Could not fetch public issues feed:', err);
      }
    };
    fetchPublicData();
  }, []);

  // Filter My Complaints (Created by Logged-in Citizen)
  const myComplaints = complaints.filter(c => 
    (c.reporterEmail === userAuth?.email || c.reporter_id === userAuth?.civic_user_id)
  );

  // Public Complaints in Area (All non-duplicate complaints across the city)
  const publicComplaintsList = publicIssues.length > 0 
    ? publicIssues 
    : complaints.filter(c => !c.is_duplicate);


  const filteredMyComplaints = myComplaints.filter(c => {
    const matchCat = categoryFilter === 'ALL' || (c.categoryEn || c.category || '').toUpperCase() === categoryFilter.toUpperCase();
    const matchStat = statusFilter === 'ALL' || (c.status || '').toUpperCase() === statusFilter.toUpperCase();
    const matchSearch = !searchQuery || (c.id + ' ' + (c.titleEn || c.processed_description || '')).toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchStat && matchSearch;
  });

  const handleConfirmResolution = async (complaintId) => {
    try {
      await apiService.verifyResolution(complaintId, true);
      setComplaints(prev => prev.map(c => c.id === complaintId ? { 
        ...c, 
        status: 'RESOLVED', 
        workflow_state: 'CLOSED',
        citizen_confirmation_status: 'CONFIRMED'
      } : c));
      alert(`Thank you! Ticket ${complaintId} has been confirmed RESOLVED and closed.`);
      setSelectedComplaint(null);
    } catch (err) {
      alert(`Resolution confirmed locally for ${complaintId}!`);
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, status: 'RESOLVED', workflow_state: 'CLOSED' } : c));
      setSelectedComplaint(null);
    }
  };

  const handleSupportIssue = (complaintId) => {
    setComplaints(prev => prev.map(c => c.id === complaintId ? { 
      ...c, 
      reporterCount: (c.reporterCount || c.supporters_count || 1) + 1,
      supporters_count: (c.supporters_count || c.reporterCount || 1) + 1
    } : c));
    alert(`Thank you! Your community support (+1) for ticket ${complaintId} has been recorded.`);
  };

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    setReopenError('');

    if (!reopenReason || !reopenReason.trim()) {
      setReopenError('Reopen reason is mandatory. Please provide details of why the issue is unresolved.');
      return;
    }

    try {
      await apiService.verifyResolution(selectedComplaint.id, false, reopenReason);
      setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { 
        ...c, 
        status: 'OPEN', 
        workflow_state: 'ASSIGNED',
        citizen_confirmation_status: 'REOPENED',
        reopen_reason: reopenReason,
        reopen_proof_photo: reopenProofPhoto
      } : c));
      alert(`Complaint ${selectedComplaint.id} has been REOPENED and sent back to officer.`);
      setShowReopenModal(false);
      setSelectedComplaint(null);
      setReopenReason('');
      setReopenProofPhoto('');
    } catch (err) {
      setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { ...c, status: 'OPEN', workflow_state: 'ASSIGNED' } : c));
      alert(`Complaint ${selectedComplaint.id} has been REOPENED.`);
      setShowReopenModal(false);
      setSelectedComplaint(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* HEADER & MAIN NAVIGATION TABS */}
      <div className="glass-panel" style={{ padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={26} color="#6366f1" />
            <span>MY CIVIC HUB</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Citizen Monitoring Portal for Personal Complaints, Neighborhood Hotspots & Resolution Verification
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: '#090d16', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => { setActiveTab('hub'); setSelectedComplaint(null); }}
            className={`glass-btn ${activeTab === 'hub' ? 'glass-btn-primary' : ''}`}
            style={{ fontSize: '0.8rem', padding: '8px 14px', border: 'none' }}
          >
            <Activity size={15} />
            <span>My Civic Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('raise')}
            className={`glass-btn ${activeTab === 'raise' ? 'glass-btn-primary' : ''}`}
            style={{ fontSize: '0.8rem', padding: '8px 14px', border: 'none', background: activeTab === 'raise' ? '#10b981' : 'transparent' }}
          >
            <Sparkles size={15} />
            <span>Report New Issue</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`glass-btn ${activeTab === 'heatmap' ? 'glass-btn-primary' : ''}`}
            style={{ fontSize: '0.8rem', padding: '8px 14px', border: 'none' }}
          >
            <Globe size={15} />
            <span>Interactive Map</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MY CIVIC HUB MAIN VIEW */}
      {activeTab === 'hub' && (
        <>
          {/* SECTION CONTROLS (A: MY COMPLAINTS | B: PUBLIC COMPLAINTS | C: HEATMAP) */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setSelectedSection('my'); setSelectedComplaint(null); }}
              className={`glass-btn ${selectedSection === 'my' ? 'glass-btn-primary' : ''}`}
              style={{ fontSize: '0.82rem', padding: '8px 16px' }}
            >
              <span>SECTION A: My Complaints ({filteredMyComplaints.length})</span>
            </button>

            <button
              onClick={() => { setSelectedSection('public'); setSelectedComplaint(null); }}
              className={`glass-btn ${selectedSection === 'public' ? 'glass-btn-primary' : ''}`}
              style={{ fontSize: '0.82rem', padding: '8px 16px' }}
            >
              <span>SECTION B: Public Area Complaints ({publicComplaints.length})</span>
            </button>

            <button
              onClick={() => setSelectedSection('heatmap')}
              className={`glass-btn ${selectedSection === 'heatmap' ? 'glass-btn-primary' : ''}`}
              style={{ fontSize: '0.82rem', padding: '8px 16px' }}
            >
              <span>SECTION C: Embedded Hotspot Map</span>
            </button>
          </div>

          {/* SECTION C: EMBEDDED MAP */}
          {selectedSection === 'heatmap' && (
            <div style={{ marginBottom: '24px' }}>
              <CivicHeatmapView 
                publicIssues={publicComplaintsList}
                onViewDetails={(comp) => {
                  const found = complaints.find(c => c.id === comp.id);
                  if (found) setSelectedComplaint(found);
                }} 
              />
            </div>
          )}

          {/* SECTION A & B: COMPLAINT CARDS & DETAIL VIEW */}
          {selectedSection !== 'heatmap' && (
            <>
              {!selectedComplaint ? (
                <>
                  {/* SEARCH & FILTERS */}
                  <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', background: '#090d16', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <Search size={16} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Search complaint ID, location, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#f8fafc', outline: 'none', width: '100%', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <select className="glass-input" style={{ width: 'auto', fontSize: '0.78rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="ALL">All Statuses</option>
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="PENDING_CONFIRMATION">Pending Verification</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    </div>
                  </div>

                  {/* CARDS GRID */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
                    {(selectedSection === 'my' ? filteredMyComplaints : publicComplaintsList).map(comp => (

                      <div key={comp.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)' }}>{comp.id}</span>
                            <span className={`badge ${comp.status === 'RESOLVED' ? 'badge-resolved' : 'badge-open'}`}>
                              {comp.status || 'OPEN'}
                            </span>
                          </div>

                          {comp.photoUrl && (
                            <img 
                              src={comp.photoUrl} 
                              alt="Complaint Evidence" 
                              style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }} 
                            />
                          )}

                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                            {comp.titleEn || comp.processed_description || comp.description}
                          </h3>

                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                            📍 {comp.ward || comp.location_ward || 'Chennai Ward'}
                          </p>

                          {/* PUBLIC PRIVACY ENFORCEMENT */}
                          {selectedSection === 'public' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '10px' }}>
                              👥 Reported by Verified Citizen (Anonymized Privacy) | {comp.supporters_count || 1} Supporters
                            </div>
                          )}

                          {/* SLA PUBLIC STATUS */}
                          <div style={{ fontSize: '0.78rem', padding: '8px 10px', background: '#090d16', borderRadius: '6px', marginBottom: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Public Resolution Timeline: </span>
                            <strong style={{ color: comp.slaDaysRemaining <= 0 ? '#ef4444' : '#10b981' }}>
                              {comp.slaDaysRemaining <= 0 ? 'Exceeded Expected SLA' : `${comp.slaDaysRemaining || 15} Days Expected`}
                            </strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedComplaint(comp)}
                            className="glass-btn glass-btn-primary"
                            style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}
                          >
                            <Eye size={15} />
                            <span>View Progress</span>
                          </button>

                          {selectedSection === 'public' && (
                            <button
                              onClick={() => handleSupportIssue(comp.id)}
                              className="glass-btn"
                              style={{ fontSize: '0.8rem', borderColor: '#38bdf8', color: '#38bdf8' }}
                              title="Support this community issue"
                            >
                              <ThumbsUp size={15} />
                              <span>+1 Support</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* SINGLE COMPLAINT PROGRESS & VERIFICATION VIEW */
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="glass-btn"
                    style={{ marginBottom: '20px', fontSize: '0.8rem' }}
                  >
                    ← Back to Complaint List
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
                          Ticket {selectedComplaint.id}
                        </h2>
                        <span className="badge badge-high">{selectedComplaint.status}</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        📍 {selectedComplaint.ward || selectedComplaint.location_ward}
                      </p>
                    </div>

                    <div style={{ padding: '10px 14px', background: '#090d16', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Public Status:</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
                        {selectedComplaint.workflow_state || selectedComplaint.status}
                      </div>
                    </div>
                  </div>

                  {/* PUBLIC PROGRESS TIMELINE (NO INTERNAL ADMINISTRATIVE / WORK ORDER DATA) */}
                  <div style={{ marginBottom: '28px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} color="#6366f1" />
                      <span>Public Complaint Progress Lifecycle Timeline</span>
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      {[
                        { label: '1. Submitted', done: true },
                        { label: '2. Processing', done: true },
                        { label: '3. Categorized', done: true },
                        { label: '4. Duplicate Check', done: true },
                        { label: '5. Routed', done: true },
                        { label: '6. Assigned', done: selectedComplaint.status !== 'OPEN' },
                        { label: '7. Inspection', done: ['SITE_INSPECTION', 'WORK_IN_PROGRESS', 'PENDING_CONFIRMATION', 'RESOLVED'].includes(selectedComplaint.status) },
                        { label: '8. Work In Progress', done: ['WORK_IN_PROGRESS', 'PENDING_CONFIRMATION', 'RESOLVED'].includes(selectedComplaint.status) },
                        { label: '9. Resolved', done: ['PENDING_CONFIRMATION', 'RESOLVED'].includes(selectedComplaint.status) },
                        { label: '10. Verification', done: selectedComplaint.status === 'RESOLVED' }
                      ].map((step, idx) => (
                        <div key={idx} style={{ padding: '10px', background: step.done ? 'rgba(99, 102, 241, 0.15)' : '#090d16', border: `1px solid ${step.done ? '#6366f1' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: step.done ? '#a5b4fc' : 'var(--text-dim)', fontWeight: 700 }}>
                            {step.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CITIZEN RESOLUTION VERIFICATION CARD */}
                  {(selectedComplaint.status === 'PENDING_CONFIRMATION' || selectedComplaint.workflow_state === 'WAITING_FOR_CITIZEN_VERIFICATION' || selectedComplaint.status === 'RESOLVED') && (
                    <div style={{ marginBottom: '24px' }}>
                      <ProofOfWorkView
                        issue={selectedComplaint}
                        onConfirmResolution={handleConfirmResolution}
                        onReopenComplaint={() => setShowReopenModal(true)}
                      />
                    </div>
                  )}

                  {/* REOPEN MODAL */}
                  {showReopenModal && (
                    <div style={{ background: '#090d16', border: '1px solid #ef4444', padding: '20px', borderRadius: '10px', marginTop: '16px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fca5a5', marginBottom: '12px' }}>
                        ⚠️ Request Complaint Reopen
                      </h3>

                      {reopenError && (
                        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '10px', fontWeight: 700 }}>
                          {reopenError}
                        </div>
                      )}

                      <form onSubmit={handleReopenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Reason for Reopening (Mandatory):</label>
                          <textarea
                            className="glass-input"
                            rows={3}
                            placeholder="Explain why the repair is incomplete or inadequate..."
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Proof Image URL (Optional):</label>
                          <input
                            type="text"
                            className="glass-input"
                            placeholder="https://..."
                            value={reopenProofPhoto}
                            onChange={(e) => setReopenProofPhoto(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" className="glass-btn" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
                            Submit Reopen Request
                          </button>
                          <button type="button" onClick={() => setShowReopenModal(false)} className="glass-btn">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </>
      )}

      {/* TAB 2: INTAKE FORM */}
      {activeTab === 'raise' && (
        <ReportIssueContainer 
          userAuth={userAuth} 
          onComplaintCreated={(newComp) => {
            setComplaints(prev => [newComp, ...prev]);
            setActiveTab('hub');
          }} 
        />
      )}

      {/* TAB 3: STANDALONE HEATMAP MAP */}
      {activeTab === 'heatmap' && (
        <CivicHeatmapView 
          publicIssues={publicComplaints}
          onViewDetails={(comp) => {
            const found = complaints.find(c => c.id === comp.id);
            if (found) {
              setSelectedComplaint(found);
              setActiveTab('hub');
            }
          }} 
        />
      )}

    </div>
  );
}
