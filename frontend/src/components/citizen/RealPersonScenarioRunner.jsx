import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, FileText, CheckCircle2, AlertTriangle, Clock, 
  MapPin, Send, ArrowRight, Activity, Globe, RefreshCw, Eye, Sparkles, UserCheck, Flame, Search
} from 'lucide-react';
import CivicHeatmapView from '../citizen/CivicHeatmapView';
import ReportIssueContainer from '../intake/ReportIssueContainer';
import { apiService } from '../../utils/apiService';

export default function RealPersonScenarioRunner({ userAuth }) {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // 10 UNIQUE REAL-PERSON MUNICIPAL CRISIS SCENARIOS & SOLUTIONS
  const SCENARIOS = [
    {
      id: 1,
      title: "Monsoon Flood & Sewer Overflow at Velachery Main Road",
      persona: "Karthik (Daily Commuter & Resident)",
      language: "Tamil / English",
      problem: "Heavy monsoon rains caused sewage main to burst near Velachery bus terminus, flooding 500m of road.",
      steps: [
        "1. Citizen records Tamil voice description inside the integrated text box.",
        "2. Sarvam AI translates Tamil STT audio into English.",
        "3. Gemini 2.5 Flash categorizes defect as DRAINAGE / CRITICAL severity.",
        "4. Auto-calculates 2-min Demo SLA Deadline.",
        "5. Officer accepts task & dispatches CMWSSB vacuum suction vehicle."
      ],
      solution: "Multi-modal Sarvam AI intake ensured instant 0-second classification without municipal counter visits."
    },
    {
      id: 2,
      title: "Broken High-Tension Electrical Wire near Anna Nagar Playground",
      persona: "Priya (School Teacher & Parent)",
      language: "English",
      problem: "Live high-voltage electrical cable snapped and dangling near school entrance during morning rain.",
      steps: [
        "1. Citizen captures photo with EXIF GPS coordinates.",
        "2. AI detects SAFETY / CRITICAL priority level.",
        "3. SLA Engine sets emergency 15-day policy (2-min demo clock).",
        "4. TNEB Field Officer receives priority dispatch.",
        "5. System auto-escalates to Zonal Supervisor if unhandled."
      ],
      solution: "Automatic backend SLA engine prevented electrocution hazard by auto-escalating without manual delay."
    },
    {
      id: 3,
      title: "Uncollected Garbage Dumping Dumpster at T. Nagar Commercial Hub",
      persona: "Ramesh (Shop Owner Association Secretary)",
      language: "Tamil",
      problem: "Solid waste overflow blocking pedestrian footpaths for 4 consecutive days.",
      steps: [
        "1. Citizen submits text complaint in Tamil.",
        "2. Multi-signal Deduplication Engine detects 6 duplicate complaints in 50m radius.",
        "3. Merges duplicate complaints into master ticket TN-2026-GARB01.",
        "4. Increments supporter count to 7 without creating spam tickets.",
        "5. SWM Department dispatches compactor truck."
      ],
      solution: "Spatial deduplication engine consolidated community complaints into a single high-priority work order."
    },
    {
      id: 4,
      title: "Deep Asphalt Pothole Causing Accidents on GST Road, Tambaram",
      persona: "Anand (Two-Wheeler Rider)",
      language: "English",
      problem: "Hidden 0.2m deep pothole causing multiple motorcycle falls during evening rush hour.",
      steps: [
        "1. Citizen submits pothole location via GPS.",
        "2. Highways Department AE submits site inspection report.",
        "3. Estimated cost calculated at ₹25,000.",
        "4. Officer submits budget approval request.",
        "5. System blocks officer self-approval (HTTP 403) and routes to Supervisor for approval."
      ],
      solution: "Strict RBAC security prevented corruption/self-approval while speeding up budget clearance."
    },
    {
      id: 5,
      title: "Offline Complaint Submission During Cyclone Storm Outage",
      persona: "Meena (Coastal Resident, Cuddalore)",
      language: "Tamil",
      problem: "Cellular networks down during cyclone; fallen tree blocking hospital emergency driveway.",
      steps: [
        "1. Citizen records complaint offline inside app.",
        "2. IndexedDB local sync engine queues complaint with status VOICE_PENDING_PROCESSING.",
        "3. Network restores 45 minutes later.",
        "4. Sync engine automatically uploads queue in background.",
        "5. Emergency response team dispatched."
      ],
      solution: "Offline-first IndexedDB architecture guaranteed zero loss of emergency civic complaints."
    },
    {
      id: 6,
      title: "Streetlight Blackout in K.K. Nagar Residential Colony",
      persona: "Sundar (Senior Citizen Welfare Member)",
      language: "English",
      problem: "Entire street dark for 2 weeks, raising safety concerns for women and elderly evening walkers.",
      steps: [
        "1. Citizen logs streetlight defect in My Civic Hub.",
        "2. Officer submits work order for LED replacement.",
        "3. Repair completed and officer uploads After-Photo evidence.",
        "4. Ticket transitions to WAITING_FOR_CITIZEN_VERIFICATION.",
        "5. Citizen inspects street and taps YES, CONFIRM RESOLUTION."
      ],
      solution: "Two-way resolution evidence verification ensured tickets are not falsely closed by contractors."
    },
    {
      id: 7,
      title: "Contaminated Drinking Water Supply in Madurai Ward 45",
      persona: "Lakshmi (Homemaker)",
      language: "Tamil",
      problem: "Sewage water mixing into drinking water pipelines causing illness in 15 households.",
      steps: [
        "1. Citizen submits voice complaint describing foul odor and brown water.",
        "2. AI tags issue as CMWSSB / WATER / CRITICAL.",
        "3. SLA Timer triggers automatic warning notification.",
        "4. Pipeline repair team isolates leak and flushes main lines.",
        "5. Citizen receives notification to verify water clarity."
      ],
      solution: "Sarvam voice intake allowed illiterate citizens to report public health contamination effortlessly."
    },
    {
      id: 8,
      title: "Broken Footpath Concrete & Exposed Rebar in Coimbatore",
      persona: "Vikram (Pedestrian Rights Activist)",
      language: "English",
      problem: "Damaged pedestrian walkway near hospital entrance tripping disabled visitors.",
      steps: [
        "1. Citizen files report with photo evidence.",
        "2. Hotspot map visualizes cluster on MapLibre vector map.",
        "3. Zonal Engineer issues work order for paver block relaying.",
        "4. Contractor attempts premature closure without photo evidence.",
        "5. System rejects closure; requires mandatory After-Photo upload."
      ],
      solution: "Mandatory photo evidence enforcement stopped premature contractor sign-offs."
    },
    {
      id: 9,
      title: "Encroached Public Park Space & Illegal Dumping in Salem",
      persona: "Ganesh (Resident Association President)",
      language: "Tamil",
      problem: "Illegal debris dumping inside public children's park area.",
      steps: [
        "1. Citizen uploads park complaint.",
        "2. Complaint displayed on anonymized public map.",
        "3. Parks department clears debris.",
        "4. Citizen finds partial clearing and taps NO, REOPEN COMPLAINT with mandatory reason.",
        "5. Ticket state changes to REOPENED for complete clearance."
      ],
      solution: "Mandatory reopen reason workflow empowered citizens to demand 100% complete civic work."
    },
    {
      id: 10,
      title: "Stagnant Water & Dengue Mosquito Breeding Ground in Trichy",
      persona: "Dr. Arul (Public Health Officer)",
      language: "English",
      problem: "Vacant plot with 1-foot stagnant water causing 12 dengue cases in neighborhood.",
      steps: [
        "1. Health officer files public safety alert on CivicPulse.",
        "2. System tags vector control team & dispatches larvicide spraying.",
        "3. SLA engine monitors 48-hour deadline.",
        "4. Spraying completed and verified.",
        "5. Community heatmap updates status to RESOLVED."
      ],
      solution: "End-to-end SLA tracking prevented disease outbreaks through timely municipal intervention."
    }
  ];

  const currentScenario = SCENARIOS[activeScenarioIdx];

  const runScenarioSimulation = () => {
    setIsRunning(true);
    setLogs([]);

    currentScenario.steps.forEach((step, idx) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[STEP ${idx + 1}] ${step}`]);
        if (idx === currentScenario.steps.length - 1) {
          setIsRunning(false);
        }
      }, (idx + 1) * 600);
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* HEADER */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px' }}>
              REAL-PERSON MUNICIPAL CRISIS SIMULATOR & SOLUTION AUDIT ENGINE
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              10 Unique Real-World Scenario Walkthroughs
            </h2>
          </div>

          <button
            onClick={runScenarioSimulation}
            disabled={isRunning}
            className="glass-btn glass-btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.88rem' }}
          >
            <Sparkles size={16} />
            <span>{isRunning ? 'Running Simulation...' : 'Simulate Scenario Solution'}</span>
          </button>
        </div>
      </div>

      {/* SCENARIO SELECTOR TABS (1 TO 10) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px' }}>
        {SCENARIOS.map((sc, idx) => (
          <button
            key={sc.id}
            onClick={() => { setActiveScenarioIdx(idx); setLogs([]); }}
            className={`glass-btn ${activeScenarioIdx === idx ? 'glass-btn-primary' : ''}`}
            style={{ fontSize: '0.78rem', padding: '8px 14px', whiteSpace: 'nowrap' }}
          >
            <span>Scenario {sc.id}</span>
          </button>
        ))}
      </div>

      {/* ACTIVE SCENARIO DETAIL CARD */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div>
            <span className="badge badge-high" style={{ marginBottom: '8px' }}>
              SCENARIO {currentScenario.id} OF 10
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
              {currentScenario.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              👤 <strong>Persona:</strong> {currentScenario.persona} | 🗣️ <strong>Language:</strong> {currentScenario.language}
            </p>
          </div>

          <div style={{ background: '#090d16', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Engine Status:</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>✓ FULLY RESOLVABLE</div>
          </div>
        </div>

        {/* PROBLEM DESCRIPTION */}
        <div style={{ background: '#090d16', padding: '16px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fca5a5', marginBottom: '6px' }}>
            🚨 Real-World Municipal Problem:
          </h4>
          <p style={{ fontSize: '0.9rem', color: '#f8fafc', lineHeight: '1.5' }}>
            "{currentScenario.problem}"
          </p>
        </div>

        {/* LIVE STEP SIMULATION LOGS */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#6366f1" />
            <span>CivicPulse Automated Workflow Steps Execution:</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentScenario.steps.map((st, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  background: logs.length > i ? 'rgba(99, 102, 241, 0.15)' : '#090d16',
                  border: `1px solid ${logs.length > i ? '#6366f1' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  color: logs.length > i ? '#f8fafc' : 'var(--text-dim)',
                  transition: 'all 0.3s ease'
                }}
              >
                {st}
              </div>
            ))}
          </div>
        </div>

        {/* SYSTEM SOLUTION SUMMARY */}
        <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '16px', borderRadius: '10px', border: '1px solid #10b981' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#6ee7b7', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} />
            <span>CivicPulse Engineered Solution:</span>
          </h4>
          <p style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>
            {currentScenario.solution}
          </p>
        </div>
      </div>

    </div>
  );
}
