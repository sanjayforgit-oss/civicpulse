import React, { useState, useEffect } from 'react';
import { Building2, Globe, Shield, UserCheck, LayoutDashboard, Sparkles, Lock, User, PlayCircle, LogOut, Compass } from 'lucide-react';
import SplashScreen from './components/auth/SplashScreen';
import LanguageSelectScreen from './components/auth/LanguageSelectScreen';
import SignUpScreen from './components/auth/SignUpScreen';
import EmailOtpScreen from './components/auth/EmailOtpScreen';
import DemoIdentityScreen from './components/auth/DemoIdentityScreen';
import LoginScreen from './components/auth/LoginScreen';
import RecoveryScreen from './components/auth/RecoveryScreen';
import CitizenProfileScreen from './components/auth/CitizenProfileScreen';

import HomeScreen from './components/citizen/HomeScreen';
import CitizenPortal from './components/CitizenPortal';
import CivicHeatmapView from './components/citizen/CivicHeatmapView';
import NavigationBar from './components/navigation/NavigationBar';
import NotificationDrawer from './components/citizen/NotificationDrawer';
import SyncStatusBanner from './components/citizen/SyncStatusBanner';
import OfflineQueueModal from './components/citizen/OfflineQueueModal';
import TranscriptReviewModal from './components/citizen/TranscriptReviewModal';
import ComplaintTimelineModal from './components/citizen/ComplaintTimelineModal';
import ResolutionVerificationModal from './components/citizen/ResolutionVerificationModal';
import DemoRunnerModal from './components/citizen/DemoRunnerModal';
import ReportIssueContainer from './components/intake/ReportIssueContainer';
import RealPersonScenarioRunner from './components/citizen/RealPersonScenarioRunner';

import OfficerPortal from './components/OfficerPortal';
import AdminDashboard from './components/AdminDashboard';
import { INITIAL_MOCK_COMPLAINTS } from './mockData';
import { apiService } from './utils/apiService';

export default function App() {
  const [lang, setLang] = useState('English');
  const [activeRole, setActiveRole] = useState('CITIZEN'); // 'CITIZEN' | 'OFFICER' | 'ADMIN'
  const [complaints, setComplaints] = useState(INITIAL_MOCK_COMPLAINTS);
  
  // Navigation & Modal State
  const [authStep, setAuthStep] = useState('login'); // 'splash' | 'language' | 'signup' | 'otp' | 'identity' | 'login' | 'app'
  const [activeTab, setActiveTab] = useState('home');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isDemoRunnerOpen, setIsDemoRunnerOpen] = useState(false);
  const [isScenarioRunnerOpen, setIsScenarioRunnerOpen] = useState(false);
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null);

  const [registrationData, setRegistrationData] = useState({ email: '', password: '', demoOtp: '' });
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check existing session token on mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        if (apiService.getToken()) {
          const profile = await apiService.getUserProfile();
          setUserProfile(profile);
          setIsAuthenticated(true);
          setLang(profile.preferred_language || 'English');
          setActiveRole(profile.role || 'CITIZEN');
          setAuthStep('app');
          
          // Load real user complaints from Database
          try {
            const myIssues = await apiService.getMyComplaints();
            if (myIssues && myIssues.length > 0) {
              setComplaints(myIssues);
            }
          } catch (err) {
            console.warn('Could not fetch initial database complaints:', err);
          }
        }
      } catch (e) {
        apiService.clearTokens();
        setIsAuthenticated(false);
      }
    };
    checkExistingAuth();
  }, []);

  const handleAuthSuccess = async (tokenData) => {
    setIsAuthenticated(true);
    const role = tokenData.role || 'CITIZEN';
    setActiveRole(role);
    setUserProfile({
      civic_user_id: tokenData.user_id,
      role: role,
      preferred_language: tokenData.preferred_language || 'English',
      email: tokenData.email || (role === 'OFFICER' ? 'officer@gov.in' : 'citizen@example.com'),
      officer_id: tokenData.officer_id || null
    });
    setAuthStep('app');
    setActiveTab('home');

    // Load real user complaints from Database upon login
    try {
      const myIssues = await apiService.getMyComplaints();
      if (myIssues && myIssues.length > 0) {
        setComplaints(myIssues);
      }
    } catch (err) {
      console.warn('Could not fetch user complaints on login:', err);
    }
  };


  const handleLogout = () => {
    apiService.clearTokens();
    setIsAuthenticated(false);
    setUserProfile(null);
    setAuthStep('login');
    setActiveRole('CITIZEN');
    setActiveTab('home');
  };

  const handleNewComplaintCreated = (newIssue) => {
    setComplaints(prev => [newIssue, ...prev]);
    setActiveTab('hub');
  };

  const handleOpenIssueDetail = (issue) => {
    setSelectedIssueDetail(issue);
    setIsTimelineModalOpen(true);
  };

  const formattedPublicIssues = complaints.map(c => ({
    id: c.id,
    category: c.categoryEn || c.category || 'ROADS',
    title_ta: c.titleTa || c.original_description || 'சாக்கடை அடைப்பு',
    title_en: c.titleEn || c.processed_description || 'Civic Infrastructure Defect',
    location_ward: c.ward || c.location_ward || 'Ward 104, Anna Nagar',
    status: c.status || 'OPEN',
    supporters_count: c.reporterCount || c.supporters_count || 1,
    reports_count: c.reporterCount || c.reports_count || 1,
    created_at: c.createdAt || c.created_at || new Date().toISOString(),
    priority: c.priority || 'MEDIUM',
    photo_url: c.photoUrl || c.media_url
  }));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Offline Connectivity Banner */}
      <SyncStatusBanner onOpenQueue={() => setIsQueueModalOpen(true)} />

      {/* Main Top Government Header */}
      <header className="glass-panel" style={{
        padding: '14px 20px',
        margin: '12px 14px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Building2 size={20} color="#ffffff" />
          </div>

          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.3px', color: '#f8fafc' }}>
              CivicPulse
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Tamil Nadu State Government AI Civic Redressal & Satellite Map Engine
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* REAL PERSON CRISIS SIMULATOR BUTTON */}
          <button
            onClick={() => setIsScenarioRunnerOpen(!isScenarioRunnerOpen)}
            className="glass-btn"
            style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: '#38bdf8', color: '#38bdf8' }}
          >
            <Compass size={14} />
            <span>10 Real-Person Scenarios</span>
          </button>

          {/* Interactive Demo Walkthrough Trigger Button */}
          <button
            onClick={() => setIsDemoRunnerOpen(true)}
            className="glass-btn glass-btn-primary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <PlayCircle size={14} />
            <span>20-Step Journey</span>
          </button>

          {isAuthenticated && userProfile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`badge ${activeRole === 'CITIZEN' ? 'badge-low' : activeRole === 'OFFICER' ? 'badge-medium' : 'badge-escalated'}`}>
                {activeRole}
              </span>

              <button
                onClick={handleLogout}
                className="glass-btn glass-btn-danger"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                title="Logout"
              >
                <LogOut size={14} />
                <span>Logout ({userProfile.email ? userProfile.email.split('@')[0] : userProfile.officer_id || 'User'})</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthStep('login')}
              className="glass-btn"
              style={{ fontSize: '0.8rem' }}
            >
              <Lock size={14} />
              <span>Sign Up / Log In</span>
            </button>
          )}
        </div>
      </header>

      {/* REAL PERSON SCENARIOS RUNNER MODAL / VIEW */}
      {isScenarioRunnerOpen && (
        <div style={{ margin: '14px 14px 0' }}>
          <RealPersonScenarioRunner userAuth={userProfile} />
        </div>
      )}

      {/* Main Container */}
      <main style={{ flex: 1, padding: '14px', marginBottom: isAuthenticated && activeRole === 'CITIZEN' ? '70px' : '0' }}>
        {!isAuthenticated || authStep !== 'app' ? (
          <>
            {authStep === 'splash' && (
              <SplashScreen onStart={() => setAuthStep('language')} />
            )}

            {authStep === 'language' && (
              <LanguageSelectScreen
                selectedLang={lang}
                onSelectLang={setLang}
                onContinue={() => setAuthStep('signup')}
              />
            )}

            {authStep === 'signup' && (
              <SignUpScreen
                selectedLang={lang}
                onOtpRequested={(data) => {
                  setRegistrationData(data);
                  setAuthStep('otp');
                }}
                onNavigateLogin={() => setAuthStep('login')}
              />
            )}

            {authStep === 'otp' && (
              <EmailOtpScreen
                email={registrationData.email}
                password={registrationData.password}
                demoOtp={registrationData.demoOtp}
                onOtpVerified={() => setAuthStep('identity')}
                onBack={() => setAuthStep('signup')}
              />
            )}

            {authStep === 'identity' && (
              <DemoIdentityScreen
                email={registrationData.email}
                password={registrationData.password}
                preferredLang={lang}
                onRegistrationSuccess={handleAuthSuccess}
              />
            )}

            {authStep === 'login' && (
              <LoginScreen
                onLoginSuccess={handleAuthSuccess}
                onNavigateSignUp={() => setAuthStep('signup')}
                onNavigateForgot={() => setAuthStep('recovery')}
              />
            )}

            {authStep === 'recovery' && (
              <RecoveryScreen onBackToLogin={() => setAuthStep('login')} />
            )}
          </>
        ) : (
          /* AUTHENTICATED DASHBOARDS BASED ON BACKEND USER ROLE */
          <>
            {activeRole === 'CITIZEN' && (
              <>
                {activeTab === 'home' && (
                  <HomeScreen
                    userProfile={userProfile}
                    onReportClick={() => setActiveTab('report')}
                    onViewAllMyComplaints={() => setActiveTab('hub')}
                    onViewDetails={handleOpenIssueDetail}
                    onOpenNotifications={() => setIsNotificationOpen(true)}
                    onOpenProfile={() => setActiveTab('profile')}
                    lang={lang}
                  />
                )}

                {activeTab === 'report' && (
                  <ReportIssueContainer
                    userAuth={userProfile}
                    onComplaintCreated={handleNewComplaintCreated}
                  />
                )}

                {activeTab === 'hub' && (
                  <CitizenPortal
                    lang={lang}
                    complaints={complaints}
                    setComplaints={setComplaints}
                    userAuth={userProfile}
                  />
                )}

                {activeTab === 'map' && (
                  <CivicHeatmapView
                    publicIssues={formattedPublicIssues}
                    onViewDetails={handleOpenIssueDetail}
                  />
                )}

                {activeTab === 'profile' && (
                  <CitizenProfileScreen
                    userProfile={userProfile}
                    onLogout={handleLogout}
                    onLanguageChange={(newLang) => setLang(newLang)}
                  />
                )}
              </>
            )}

            {(activeRole === 'OFFICER' || activeRole === 'SUPERVISOR') && (
              <OfficerPortal
                lang={lang}
                complaints={complaints}
                setComplaints={setComplaints}
              />
            )}

            {activeRole === 'ADMIN' && (
              <AdminDashboard complaints={complaints} lang={lang} />
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Navigation Bar for Citizen */}
      {isAuthenticated && activeRole === 'CITIZEN' && (
        <NavigationBar
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
          onReportClick={() => setActiveTab('report')}
        />
      )}

      {/* Modals & Drawers */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <OfflineQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
      />

      <ComplaintTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        issueDetail={selectedIssueDetail}
      />

      <DemoRunnerModal
        isOpen={isDemoRunnerOpen}
        onClose={() => setIsDemoRunnerOpen(false)}
        userAuth={userProfile}
      />

    </div>
  );
}
