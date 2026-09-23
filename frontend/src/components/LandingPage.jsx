import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  ArrowRight, 
  Building2, 
  Zap, 
  Database, 
  Leaf, 
  Radio, 
  MapPin, 
  Compass, 
  Headphones, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Layers,
  ChevronRight,
  Shield,
  ShieldCheck,
  Globe2,
  Sparkles,
  KeyRound,
  Fingerprint,
  Cpu,
  BarChart2,
  Settings,
  Mountain,
  FileText,
  Key,
  Users,
  GitBranch,
  Network
} from 'lucide-react';
import { useAuth, DEMO_OPERATORS } from '../context/AuthContext';
import PolarisFlowDiagram from './PolarisFlowDiagram';

export default function LandingPage() {
  const { loginWithDemoRole, login, loading } = useAuth();
  
  // Navigation & Login State
  const [activeTab, setActiveTab] = useState('gateways'); // 'gateways' | 'credentials' | 'personas' | 'topology'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Status & Feedback Messages
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Quick Login Handler
  const handleQuickLogin = (roleOrOperatorId) => {
    setErrorMessage(null);
    const targetOperator = DEMO_OPERATORS.find(
      op => op.id === roleOrOperatorId || op.role === roleOrOperatorId || op.station_id === roleOrOperatorId
    ) || DEMO_OPERATORS[0];

    setSuccessMessage(`Authorizing ${targetOperator.full_name} (${targetOperator.clearance.split(' ')[0]} ${targetOperator.clearance.split(' ')[1] || ''})...`);
    
    setTimeout(() => {
      loginWithDemoRole(targetOperator.id);
    }, 400);
  };

  // Form Submit Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      handleQuickLogin('india_operator');
      return;
    }

    const lower = username.toLowerCase().trim();
    let target = DEMO_OPERATORS.find(
      op => op.email.toLowerCase() === lower || 
            op.full_name.toLowerCase().includes(lower) || 
            (op.station_id && lower.includes(op.station_id.replace('station-', '')))
    );

    if (lower.includes('maitri')) {
      target = DEMO_OPERATORS[1];
    } else if (lower.includes('bharati')) {
      target = DEMO_OPERATORS[2];
    } else if (lower.includes('science') || lower.includes('ananya')) {
      target = DEMO_OPERATORS[3];
    } else if (lower.includes('power') || lower.includes('arjun')) {
      target = DEMO_OPERATORS[4];
    } else if (!target) {
      target = DEMO_OPERATORS[0];
    }

    setSuccessMessage(`Access Granted: ${target.full_name}. Entering POLARIS Mission Control...`);
    setTimeout(() => {
      loginWithDemoRole(target.id);
    }, 400);
  };

  return (
    <div className="polaris-login-page-root">
      
      {/* ====================================================================
          TOP GOVERNMENT OF INDIA & MOES BANNER
          ==================================================================== */}
      <header className="polaris-login-header">
        
        {/* Left: Ashoka Lion Emblem + Ministry of Earth Sciences */}
        <div className="login-header-left">
          <div className="ashoka-emblem-wrap">
            <svg viewBox="0 0 48 56" width="30" height="36" fill="none">
              <path d="M24 2C20 2 17 5 17 9C17 11 18 13 20 14.5C18 15.5 16 17.5 16 20C16 23 18 25.5 21 26.5V30H14C11 30 9 32 9 35C9 37 10 39 12 40C9 41.5 7 44 7 47H41C41 44 39 41.5 36 40C38 39 39 37 39 35C39 32 37 30 34 30H27V26.5C30 25.5 32 23 32 20C32 17.5 30 15.5 28 14.5C30 13 31 11 31 9C31 5 28 2 24 2Z" fill="#ffffff" />
              <circle cx="24" cy="9" r="3" fill="#0f172a" />
              <circle cx="20" cy="20" r="2.5" fill="#0f172a" />
              <circle cx="28" cy="20" r="2.5" fill="#0f172a" />
              <circle cx="24" cy="44" r="3" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x="12" y="50" width="24" height="3" rx="1.5" fill="#ffffff" />
            </svg>
          </div>
          <div className="login-gov-titles">
            <span className="gov-title-hindi">भारत सरकार | पृथ्वी विज्ञान मंत्रालय</span>
            <span className="gov-title-eng">Government of India | Ministry of Earth Sciences</span>
            <span className="gov-title-dept">National Centre for Polar and Ocean Research (NCPOR)</span>
          </div>
        </div>

        {/* Center: POLARIS Brand Crest & Tagline */}
        <div className="login-header-center">
          <div className="polaris-crest-icon">
            <svg viewBox="0 0 40 32" width="34" height="26" fill="none">
              <path d="M20 2L36 12V24L20 31L4 24V12L20 2Z" stroke="#38bdf8" strokeWidth="2" fill="rgba(56, 189, 248, 0.2)" />
              <path d="M11 23L17 14L22 21L27 10L33 23H11Z" fill="#38bdf8" fillOpacity="0.7" />
              <path d="M27 10L22 21L17 14L11 23H33L27 10Z" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="polaris-center-text">
            <div className="polaris-crest-name">POLARIS</div>
            <div className="polaris-crest-sub">
              <span>Polar Operations &amp; Logistics</span>
              <span>Automated Remote Infrastructure System</span>
            </div>
          </div>
        </div>

        {/* Right: Restricted Access Badge */}
        <div className="login-header-right">
          <div className="restricted-access-box">
            <Lock size={15} className="text-cyan" />
            <div className="restricted-text-col">
              <span className="restricted-line1">RESTRICTED ACCESS</span>
              <span className="restricted-line2">Government Use Only</span>
            </div>
          </div>
        </div>

      </header>

      {/* ====================================================================
          MAIN SPLIT BODY: LEFT HERO PHOTO & RIGHT LOGIN PORTAL
          ==================================================================== */}
      <div className="polaris-login-body">
        
        {/* ====================================================================
            LEFT HERO SECTION (Landscape + Radar Map + Floating Station Cards)
            ==================================================================== */}
        <div className="login-hero-pane">
          
          {/* Background Photo */}
          <div className="hero-photo-wrapper">
            <img 
              src="/antarctic_hero_bg.jpg" 
              alt="Antarctic Research Station Landscape" 
              className="hero-photo-img"
            />
            <div className="hero-photo-overlay" />
          </div>

          {/* Top Left Brand Tag */}
          <div className="hero-top-tag">
            <span className="hero-tag-dash">—</span>
            <span className="hero-tag-name">POLARIS</span>
          </div>

          {/* Hero Main Headline */}
          <div className="hero-headline-cluster">
            <h1 className="hero-main-title">
              Mission Operations<br />
              for a Resilient Antarctic Presence
            </h1>
            <div className="hero-sub-pillars">
              <span>MONITOR</span>
              <span className="pillar-sep">|</span>
              <span>OPERATE</span>
              <span className="pillar-sep">|</span>
              <span>ANALYSE</span>
              <span className="pillar-sep">|</span>
              <span>SUPPORT</span>
            </div>
          </div>

          {/* Top Right Antarctic Radar Map Overlay */}
          <div className="hero-radar-overlay">
            <svg viewBox="0 0 200 200" className="hero-radar-svg">
              {/* Concentric Radar Range Rings */}
              <circle cx="100" cy="100" r="90" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" fill="none" strokeDasharray="3 3" />
              <circle cx="100" cy="100" r="65" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" fill="none" strokeDasharray="2 2" />
              <circle cx="100" cy="100" r="40" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" fill="none" />
              
              {/* Radar Crosshairs */}
              <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
              <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />

              {/* Antarctic Continent Silhouette Vector */}
              <path 
                d="M 100,45 C 120,42 145,55 160,75 C 175,95 168,125 150,148 C 132,168 105,172 85,162 C 62,154 45,132 42,112 C 40,92 55,70 72,58 C 85,48 92,46 100,45 Z" 
                fill="rgba(255, 255, 255, 0.85)" 
                stroke="#38bdf8" 
                strokeWidth="1.5"
              />
              
              {/* Bharati Station Pin (Top-Right Coast) */}
              <g className="map-station-pin" aria-label="Bharati Station location">
                <circle cx="148" cy="78" r="4.5" fill="#0284c7" className="animate-ping" opacity="0.8" />
                <circle cx="148" cy="78" r="3.5" fill="#0f172a" />
                <circle cx="148" cy="78" r="2" fill="#38bdf8" />
                <text x="156" y="81" fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="sans-serif">Bharati</text>
              </g>

              {/* Maitri Station Pin (Bottom-Right Oasis) */}
              <g className="map-station-pin" aria-label="Maitri Station location">
                <circle cx="132" cy="135" r="4.5" fill="#0284c7" className="animate-ping" opacity="0.8" />
                <circle cx="132" cy="135" r="3.5" fill="#0f172a" />
                <circle cx="132" cy="135" r="2" fill="#38bdf8" />
                <text x="140" y="138" fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="sans-serif">Maitri</text>
              </g>
            </svg>

            {/* Coordinates Box */}
            <div className="hero-coords-box">
              <span className="coords-continent-title">ANTARCTICA</span>
              <span className="coords-station-line">Maitri: 70° 45′ S, 11° 44′ E</span>
              <span className="coords-station-line">Bharati: 69° 24′ S, 76° 17′ E</span>
            </div>
          </div>

          {/* Bottom 5-Column Feature Icons Strip */}
          <div className="hero-bottom-features-bar">
            <div className="feature-item-col">
              <Activity size={18} className="feature-icon" />
              <span className="feature-label">Infrastructure<br />Monitoring</span>
            </div>
            <div className="feature-item-col">
              <Zap size={18} className="feature-icon" />
              <span className="feature-label">Energy<br />Management</span>
            </div>
            <div className="feature-item-col">
              <Database size={18} className="feature-icon" />
              <span className="feature-label">Resource<br />Operations</span>
            </div>
            <div className="feature-item-col">
              <Leaf size={18} className="feature-icon" />
              <span className="feature-label">Environmental<br />Monitoring</span>
            </div>
            <div className="feature-item-col no-border">
              <BarChart2 size={18} className="feature-icon" />
              <span className="feature-label">Data &amp; Analytics</span>
            </div>
          </div>

        </div>

        {/* ====================================================================
            RIGHT LOGIN PORTAL PANEL ("Mission Access Portal")
            ==================================================================== */}
        <div className="login-portal-pane">
          
          {/* Top Title Block */}
          <div className="portal-title-block">
            <h2 className="portal-main-heading">Mission Access Portal</h2>
            <p className="portal-main-subheading">Secure Authentication &amp; Clearance Verification</p>
          </div>

          {/* Navigation Tab Pills */}
          <div className="portal-nav-pills-row">
            <button 
              type="button" 
              className={`portal-tab-pill ${activeTab === 'gateways' ? 'active' : ''}`}
              onClick={() => setActiveTab('gateways')}
            >
              <Building2 size={14} />
              <span>Command Hubs</span>
            </button>
            <button 
              type="button" 
              className={`portal-tab-pill ${activeTab === 'credentials' ? 'active' : ''}`}
              onClick={() => setActiveTab('credentials')}
            >
              <Key size={14} />
              <span>Credentials</span>
            </button>
            <button 
              type="button" 
              className={`portal-tab-pill ${activeTab === 'personas' ? 'active' : ''}`}
              onClick={() => setActiveTab('personas')}
            >
              <Users size={14} />
              <span>Personnel</span>
            </button>
            <button 
              type="button" 
              className={`portal-tab-pill ${activeTab === 'topology' ? 'active' : ''}`}
              onClick={() => setActiveTab('topology')}
            >
              <Network size={14} />
              <span>System Flow</span>
            </button>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="portal-alert-box error">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="portal-alert-box success">
              <CheckCircle2 size={14} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================================================================
              TAB 1: COMMAND HUBS (3 Operational Authority Action Cards)
              ================================================================ */}
          {activeTab === 'gateways' && (
            <div className="portal-content-gateways">
              <div className="portal-section-intro">
                <span>Select an operational authority to access POLARIS:</span>
              </div>

              <div className="authority-cards-list">
                
                {/* 1. India Control Centre */}
                <div 
                  className="authority-action-card"
                  onClick={() => handleQuickLogin('india_operator')}
                >
                  <div className="authority-card-left">
                    <div className="authority-icon-box">
                      <Building2 size={20} className="text-navy" />
                    </div>
                    <div className="authority-text-col">
                      <h4 className="authority-title">India Control Centre</h4>
                      <span className="authority-sub">National Operations &amp; Mission Coordination</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="authority-chevron" />
                </div>

                {/* 2. Maitri Station */}
                <div 
                  className="authority-action-card"
                  onClick={() => handleQuickLogin('station-maitri')}
                >
                  <div className="authority-card-left">
                    <div className="authority-icon-box">
                      <Mountain size={20} className="text-navy" />
                    </div>
                    <div className="authority-text-col">
                      <h4 className="authority-title">Maitri Station</h4>
                      <span className="authority-sub">Station Operations &amp; Data Access</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="authority-chevron" />
                </div>

                {/* 3. Bharati Station */}
                <div 
                  className="authority-action-card"
                  onClick={() => handleQuickLogin('station-bharati')}
                >
                  <div className="authority-card-left">
                    <div className="authority-icon-box">
                      <Radio size={20} className="text-navy" />
                    </div>
                    <div className="authority-text-col">
                      <h4 className="authority-title">Bharati Station</h4>
                      <span className="authority-sub">Station Operations &amp; Data Access</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="authority-chevron" />
                </div>

              </div>
            </div>
          )}

          {/* ================================================================
              TAB 2: CREDENTIALS FORM
              ================================================================ */}
          {activeTab === 'credentials' && (
            <form className="portal-credentials-form" onSubmit={handleFormSubmit}>
              <div className="portal-form-group">
                <label className="portal-input-label">Operator ID / Email</label>
                <div className="portal-input-wrap">
                  <User size={15} className="portal-input-icon" />
                  <input
                    type="text"
                    className="portal-text-input"
                    placeholder="e.g. india.operator@polaris.gov.in"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="portal-form-group">
                <label className="portal-input-label">Security Passcode</label>
                <div className="portal-input-wrap">
                  <Lock size={15} className="portal-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="portal-text-input"
                    placeholder="Enter mission passcode"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="portal-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="portal-submit-btn" disabled={loading}>
                <span>Verify &amp; Access Mission Control</span>
                <ArrowRight size={16} />
              </button>

              <div className="portal-fast-pass-strip">
                <span className="fast-pass-lbl">1-Click Fast Pass:</span>
                <div className="fast-pass-chips">
                  <button type="button" className="fast-pass-chip" onClick={() => handleQuickLogin('india_operator')}>
                    🇮🇳 India HQ
                  </button>
                  <button type="button" className="fast-pass-chip" onClick={() => handleQuickLogin('station-maitri')}>
                    🧊 Maitri
                  </button>
                  <button type="button" className="fast-pass-chip" onClick={() => handleQuickLogin('station-bharati')}>
                    🧊 Bharati
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ================================================================
              TAB 3: PERSONNEL CLEARANCE DIRECTORY
              ================================================================ */}
          {activeTab === 'personas' && (
            <div className="portal-personnel-list">
              {DEMO_OPERATORS.map((op) => (
                <div 
                  key={op.id}
                  className="authority-action-card"
                  onClick={() => handleQuickLogin(op.id)}
                >
                  <div className="authority-card-left">
                    <div className="authority-icon-box">
                      <span className="font-bold text-navy text-xs">{op.avatar || op.full_name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="authority-text-col">
                      <h4 className="authority-title">{op.full_name}</h4>
                      <span className="authority-sub">{op.title} &bull; {op.clearance.split(' ')[0]}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="authority-chevron" />
                </div>
              ))}
            </div>
          )}

          {/* ================================================================
              TAB 4: SYSTEM FLOWCHART
              ================================================================ */}
          {activeTab === 'topology' && (
            <div className="portal-flow-container">
              <PolarisFlowDiagram 
                onNavigateNode={(target) => {
                  if (target === 'india') handleQuickLogin('india_operator');
                  else if (target === 'maitri') handleQuickLogin('station-maitri');
                  else if (target === 'bharati') handleQuickLogin('station-bharati');
                }}
                activeNode="login"
                compact={true}
              />
            </div>
          )}

          {/* ================================================================
              BOTTOM SECURITY & MOTTO FOOTER
              ================================================================ */}
          <div className="portal-security-footer">
            <div className="sec-policy-col">
              <Lock size={13} className="sec-lock-icon" />
              <div className="sec-text-lines">
                <span className="sec-line-bold">Authorised Personnel Only</span>
                <span className="sec-line-sub">Access subject to MoES security protocols</span>
              </div>
            </div>

            <div className="sec-motto-col">
              <span>SCIENCE &nbsp;|&nbsp; SOVEREIGNTY &nbsp;|&nbsp; SUSTAINABILITY</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
