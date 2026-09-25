import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  ArrowRight, 
  X, 
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
  Clock,
  Shield,
  ShieldCheck,
  Globe2,
  KeyRound,
  Info
} from 'lucide-react';
import { useAuth, DEMO_OPERATORS } from '../context/AuthContext';
import PolarisFlowDiagram from './PolarisFlowDiagram';

export default function AuthModal({ isOpen, onClose, isBarrier = false }) {
  const { profile, loginWithDemoRole, login, loading, error: authError, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('gateways'); // 'gateways' | 'personas' | 'credentials' | 'topology'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Live Clocks
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen && !isBarrier) return null;

  const istTimeStr = currentTime.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + ' IST';

  const utcTimeStr = currentTime.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + ' UTC';

  const handleQuickLogin = (roleOrOperatorId) => {
    setErrorMessage(null);
    const targetOperator = DEMO_OPERATORS.find(
      op => op.id === roleOrOperatorId || op.role === roleOrOperatorId || op.station_id === roleOrOperatorId
    ) || DEMO_OPERATORS[0];

    setSuccessMessage(`Switching to ${targetOperator.full_name} (${targetOperator.clearance.split(' ')[0]} ${targetOperator.clearance.split(' ')[1]})...`);
    
    setTimeout(() => {
      loginWithDemoRole(targetOperator.id);
      if (onClose) onClose();
    }, 450);
  };

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

    if (lower.includes('maitri')) target = DEMO_OPERATORS[1];
    else if (lower.includes('bharati')) target = DEMO_OPERATORS[2];
    else if (lower.includes('science') || lower.includes('ananya')) target = DEMO_OPERATORS[3];
    else if (lower.includes('power') || lower.includes('arjun')) target = DEMO_OPERATORS[4];
    else if (!target) target = DEMO_OPERATORS[0];

    handleQuickLogin(target.id);
  };

  const handleAutofillDemo = (operatorIndex = 0) => {
    const op = DEMO_OPERATORS[operatorIndex];
    setUsername(op.email);
    setPassword('MissionControl@2026');
    setErrorMessage(null);
  };

  return (
    <div className={`portal-modal-backdrop ${isBarrier ? 'barrier-mode' : ''}`} onClick={!isBarrier ? onClose : undefined}>
      <div className="portal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* ====================================================================
            TOP GOVERNMENT OF INDIA & MOES BANNER
            ==================================================================== */}
        <header className="portal-gov-header">
          <div className="gov-header-left">
            {/* Ashoka Lion Emblem */}
            <div className="ashoka-emblem-svg">
              <svg viewBox="0 0 48 56" width="34" height="40" fill="none">
                <path d="M24 2C20 2 17 5 17 9C17 11 18 13 20 14.5C18 15.5 16 17.5 16 20C16 23 18 25.5 21 26.5V30H14C11 30 9 32 9 35C9 37 10 39 12 40C9 41.5 7 44 7 47H41C41 44 39 41.5 36 40C38 39 39 37 39 35C39 32 37 30 34 30H27V26.5C30 25.5 32 23 32 20C32 17.5 30 15.5 28 14.5C30 13 31 11 31 9C31 5 28 2 24 2Z" fill="#1e3a5f" />
                <circle cx="24" cy="9" r="3" fill="#ffffff" />
                <circle cx="20" cy="20" r="2.5" fill="#ffffff" />
                <circle cx="28" cy="20" r="2.5" fill="#ffffff" />
                <circle cx="24" cy="44" r="3" stroke="#245b82" strokeWidth="1.2" />
                <rect x="12" y="50" width="24" height="3" rx="1.5" fill="#1e3a5f" />
              </svg>
            </div>
            <div className="gov-titles-col">
              <span className="gov-hindi">भारत सरकार | पृथ्वी विज्ञान मंत्रालय</span>
              <span className="gov-eng">Government of India • Ministry of Earth Sciences</span>
              <span className="gov-dept">National Centre for Polar and Ocean Research (NCPOR), Goa</span>
            </div>
          </div>

          <div className="gov-header-right">
            {/* Live Ticking Time Capsule */}
            <div className="portal-live-clocks-strip">
              <div className="portal-clock-item">
                <Clock size={12} className="text-cyan" />
                <span className="p-clk-lbl">IST:</span>
                <span className="p-clk-val">{istTimeStr}</span>
              </div>
              <div className="portal-clock-divider" />
              <div className="portal-clock-item">
                <Globe2 size={12} className="text-dim" />
                <span className="p-clk-lbl">UTC:</span>
                <span className="p-clk-val">{utcTimeStr}</span>
              </div>
            </div>

            {/* Azadi Ka Amrit Mahotsav Emblem Badge */}
            <div className="amrit-mahotsav-badge">
              <span className="amrit-number">75</span>
              <div className="amrit-text-col">
                <span className="amrit-line1">Azadi Ka</span>
                <span className="amrit-line2">Amrit Mahotsav</span>
              </div>
            </div>

            {!isBarrier && onClose && (
              <button className="portal-close-btn" onClick={onClose} title="Return to Dashboard">
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {/* ====================================================================
            MAIN HERO & LOGIN SPLIT BODY
            ==================================================================== */}
        <div className="portal-main-body">
          
          {/* LEFT HERO: Antarctic Landscape + Digital Twin Overlay */}
          <div className="portal-hero-section">
            <div className="hero-bg-image-wrap">
              <img src="/antarctic_hero_bg.jpg" alt="Antarctica Research Station" className="hero-bg-img" />
              <div className="hero-polar-gradient" />
            </div>

            {/* Top Brand Crest & Map Graphic */}
            <div className="hero-brand-row">
              <div className="hero-brand-left">
                <div className="hero-logo-container">
                  <svg viewBox="0 0 40 32" className="hero-polar-crest" fill="none">
                    <path d="M20 2L36 12V24L20 31L4 24V12L20 2Z" stroke="#245b82" strokeWidth="2" fill="rgba(2, 132, 199, 0.15)" />
                    <path d="M11 23L17 14L22 21L27 10L33 23H11Z" fill="#245b82" fillOpacity="0.5" />
                    <path d="M27 10L22 21L17 14L11 23H33L27 10Z" stroke="#245b82" strokeWidth="1.8" strokeLinejoin="round" />
                    <circle cx="27" cy="10" r="1.5" fill="#ffffff" />
                    <circle cx="17" cy="14" r="1.5" fill="#ffffff" />
                  </svg>
                </div>
                <div className="hero-brand-names">
                  <h1 className="hero-polaris-title">POLARIS</h1>
                  <span className="hero-polaris-subtitle">Polar Operations & Logistics Automated Remote Infrastructure System</span>
                </div>
              </div>

              {/* Glowing Antarctic Continent Radar Map */}
              <div className="hero-radar-map-box">
                <svg viewBox="0 0 160 160" className="hero-antarctic-svg">
                  <circle cx="80" cy="80" r="70" stroke="rgba(2, 132, 199, 0.2)" strokeWidth="1" fill="none" strokeDasharray="3 3" />
                  <circle cx="80" cy="80" r="50" stroke="rgba(2, 132, 199, 0.25)" strokeWidth="1" fill="none" />
                  <circle cx="80" cy="80" r="30" stroke="rgba(2, 132, 199, 0.3)" strokeWidth="1" fill="none" />
                  
                  <path 
                    d="M 80,32 C 96,30 114,40 126,55 C 138,70 134,95 120,115 C 108,130 85,135 68,128 C 50,122 36,105 34,88 C 32,72 45,55 58,45 C 68,36 74,33 80,32 Z" 
                    fill="rgba(255, 255, 255, 0.65)" 
                    stroke="#245b82"
                    strokeWidth="1.5"
                  />
                  
                  <g className="radar-station-pin" onClick={() => handleQuickLogin('station-bharati')} style={{ cursor: 'pointer' }}>
                    <circle cx="118" cy="62" r="4" fill="#245b82" className="animate-ping" opacity="0.8" />
                    <circle cx="118" cy="62" r="2.5" fill="#245b82" />
                    <text x="124" y="64" fill="#0f172a" fontSize="8" fontWeight="bold">Bharati</text>
                  </g>

                  <g className="radar-station-pin" onClick={() => handleQuickLogin('station-maitri')} style={{ cursor: 'pointer' }}>
                    <circle cx="106" cy="108" r="4" fill="#245b82" className="animate-ping" opacity="0.8" />
                    <circle cx="106" cy="108" r="2.5" fill="#245b82" />
                    <text x="112" y="110" fill="#0f172a" fontSize="8" fontWeight="bold">Maitri</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Main Headline & Tagline */}
            <div className="hero-headline-group">
              <h2 className="hero-headline-text">
                Switch Operational Context & Permissions
              </h2>
              <p className="hero-tagline-text">
                Current Authenticated Role: <strong>{profile?.full_name || 'Dr. Rajesh Sharma'}</strong> ({profile?.clearance || 'Level 5 Alpha'})
              </p>
            </div>

            {/* Interactive Station Preview Cards */}
            <div className="hero-station-cards-cluster">
              <div 
                className="portal-station-card" 
                onClick={() => handleQuickLogin('station-maitri')}
                title="Switch Context to Maitri Station"
              >
                <div className="p-st-thumb-wrap">
                  <img src="/stations/maitri.jpg" alt="Maitri Research Station" className="p-st-thumb" />
                </div>
                <div className="p-st-meta">
                  <div className="p-st-header-row">
                    <h4 className="p-st-name">Maitri Base</h4>
                    <span className="p-st-health-pill">Health 87%</span>
                  </div>
                  <span className="p-st-coord"><MapPin size={10} className="text-cyan" /> 70° 45′ S, 11° 44′ E</span>
                  <span className="p-st-region"><Compass size={10} className="text-dim" /> Schirmacher Oasis</span>
                  <div className="p-st-status-pill">
                    <span className="p-live-dot" /> Microgrid 132 kW
                  </div>
                </div>
              </div>

              <div 
                className="portal-station-card" 
                onClick={() => handleQuickLogin('station-bharati')}
                title="Switch Context to Bharati Station"
              >
                <div className="p-st-thumb-wrap">
                  <img src="/stations/bharati.jpg" alt="Bharati Research Station" className="p-st-thumb" />
                </div>
                <div className="p-st-meta">
                  <div className="p-st-header-row">
                    <h4 className="p-st-name">Bharati Base</h4>
                    <span className="p-st-health-pill">Health 92%</span>
                  </div>
                  <span className="p-st-coord"><MapPin size={10} className="text-cyan" /> 69° 24′ S, 76° 11′ E</span>
                  <span className="p-st-region"><Compass size={10} className="text-dim" /> Larsemann Hills</span>
                  <div className="p-st-status-pill">
                    <span className="p-live-dot" /> ISRO Radome Active
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 5-Column Feature Icons Strip */}
            <div className="hero-features-ribbon">
              <div className="h-feat-col">
                <Building2 size={16} className="h-feat-icon" />
                <span className="h-feat-label">Infrastructure<br />Monitoring</span>
              </div>
              <div className="h-feat-col">
                <Zap size={16} className="h-feat-icon" />
                <span className="h-feat-label">Energy Grid<br />& CHP</span>
              </div>
              <div className="h-feat-col">
                <Database size={16} className="h-feat-icon" />
                <span className="h-feat-label">Fuel & Ration<br />Forecasting</span>
              </div>
              <div className="h-feat-col">
                <Leaf size={16} className="h-feat-icon" />
                <span className="h-feat-label">Environmental<br />Analysis</span>
              </div>
              <div className="h-feat-col no-border">
                <Radio size={16} className="h-feat-icon" />
                <span className="h-feat-label">Priority Queue<br />Sat-Link</span>
              </div>
            </div>
          </div>

          {/* RIGHT LOGIN PANEL: Secure Mission Access + Tabs */}
          <div className="portal-login-section">
            <div className="login-panel-inner">
              
              {/* Header */}
              <div className="login-heading-block">
                <div className="login-title-row">
                  <ShieldCheck size={22} className="text-cyan" />
                  <h3 className="login-main-title">Switch User Context</h3>
                </div>
                <p className="login-main-subtitle">Choose clearance persona or switch active station</p>
              </div>

              {/* Login Mode Navigation Tabs */}
              <div className="portal-auth-nav-tabs">
                <button 
                  type="button" 
                  className={`auth-nav-tab-btn ${activeTab === 'gateways' ? 'active' : ''}`}
                  onClick={() => setActiveTab('gateways')}
                >
                  <Globe2 size={13} />
                  <span>Command Hubs</span>
                </button>
                <button 
                  type="button" 
                  className={`auth-nav-tab-btn ${activeTab === 'personas' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personas')}
                >
                  <Shield size={13} />
                  <span>Personnel</span>
                </button>
                <button 
                  type="button" 
                  className={`auth-nav-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
                  onClick={() => setActiveTab('credentials')}
                >
                  <KeyRound size={13} />
                  <span>Credentials</span>
                </button>
                <button 
                  type="button" 
                  className={`auth-nav-tab-btn ${activeTab === 'topology' ? 'active' : ''}`}
                  onClick={() => setActiveTab('topology')}
                >
                  <Sparkles size={13} />
                  <span>Flowchart</span>
                </button>
              </div>

              {/* Status alerts */}
              {errorMessage && (
                <div className="login-alert-box error">
                  <AlertCircle size={14} />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="login-alert-box success">
                  <CheckCircle2 size={14} />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* TAB 1: COMMAND GATEWAYS */}
              {activeTab === 'gateways' && (
                <div className="portal-workspaces-stack">
                  <div 
                    className="workspace-select-card card-gateway-india"
                    onClick={() => handleQuickLogin('india_operator')}
                  >
                    <div className="ws-card-left">
                      <div className="ws-circle-icon blue-circle">
                        <Building2 size={18} />
                      </div>
                      <div className="ws-text-wrap">
                        <div className="ws-title-row">
                          <h5 className="ws-heading">🇮🇳 INDIA CONTROL CENTRE</h5>
                          <span className="ws-role-pill pill-india">HQ Command</span>
                        </div>
                        <p className="ws-description">Multi-station telemetry, cross-station switching, ISRO uplink & national dispatch authority.</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="ws-arrow-icon" />
                  </div>

                  <div 
                    className="workspace-select-card card-gateway-maitri"
                    onClick={() => handleQuickLogin('station-maitri')}
                  >
                    <div className="ws-card-left">
                      <div className="ws-circle-icon cyan-circle">
                        <Activity size={18} />
                      </div>
                      <div className="ws-text-wrap">
                        <div className="ws-title-row">
                          <h5 className="ws-heading">🧊 MAITRI DASHBOARD</h5>
                          <span className="ws-role-pill pill-maitri">Station Lead</span>
                        </div>
                        <p className="ws-description">Schirmacher Oasis inland base microgrid, life support & Priyadarshini water management.</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="ws-arrow-icon" />
                  </div>

                  <div 
                    className="workspace-select-card card-gateway-bharati"
                    onClick={() => handleQuickLogin('station-bharati')}
                  >
                    <div className="ws-card-left">
                      <div className="ws-circle-icon green-circle">
                        <Zap size={18} />
                      </div>
                      <div className="ws-text-wrap">
                        <div className="ws-title-row">
                          <h5 className="ws-heading">🧊 BHARATI DASHBOARD</h5>
                          <span className="ws-role-pill pill-bharati">Station Lead</span>
                        </div>
                        <p className="ws-description">Larsemann Hills coastal radar, ISRO ground station, CHP plant & RO desalination.</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="ws-arrow-icon" />
                  </div>
                </div>
              )}

              {/* TAB 2: PERSONAS */}
              {activeTab === 'personas' && (
                <div className="portal-personas-list">
                  {DEMO_OPERATORS.map((op) => (
                    <div 
                      key={op.id}
                      className="portal-persona-card"
                      onClick={() => handleQuickLogin(op.id)}
                      title={`Click to switch to ${op.full_name}`}
                    >
                      <div className="persona-avatar-col">
                        <span className="persona-avatar-txt">{op.avatar || op.full_name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="persona-info-col">
                        <div className="persona-top-row">
                          <h5 className="persona-name">{op.full_name}</h5>
                          <span className="persona-clearance-pill">{op.clearance.split(' ')[0]}</span>
                        </div>
                        <span className="persona-title">{op.title}</span>
                        <span className="persona-location"><MapPin size={10} /> {op.locationBadge}</span>
                      </div>
                      <ChevronRight size={16} className="persona-arrow-icon" />
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: CREDENTIALS */}
              {activeTab === 'credentials' && (
                <form className="login-credentials-form" onSubmit={handleFormSubmit}>
                  <div className="portal-form-group">
                    <label className="portal-input-label">Operator ID / Email</label>
                    <div className="portal-input-wrap">
                      <User size={15} className="portal-input-icon" />
                      <input
                        type="text"
                        className="portal-text-input"
                        placeholder="e.g. maitri.operator@polaris.gov.in"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="portal-form-group">
                    <div className="portal-label-row">
                      <label className="portal-input-label">Mission Passcode</label>
                      <button 
                        type="button" 
                        className="portal-quick-autofill-btn"
                        onClick={() => handleAutofillDemo(1)}
                      >
                        Autofill Maitri Passcode
                      </button>
                    </div>
                    <div className="portal-input-wrap">
                      <Lock size={15} className="portal-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="portal-text-input"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="portal-pw-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="portal-submit-btn" disabled={loading}>
                    <span>Verify & Switch Context</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {/* TAB 4: ARCHITECTURE FLOWCHART */}
              {activeTab === 'topology' && (
                <div className="portal-topology-tab-content">
                  <PolarisFlowDiagram 
                    onNavigateNode={(target) => {
                      if (target === 'india') handleQuickLogin('india_operator');
                      else if (target === 'maitri') handleQuickLogin('station-maitri');
                      else if (target === 'bharati') handleQuickLogin('station-bharati');
                    }}
                    activeNode="auto"
                    compact={true}
                  />
                </div>
              )}

              {/* Security & Support Footer */}
              <div className="portal-login-footer">
                <div className="sec-notice-row">
                  <Lock size={12} className="text-dim" />
                  <span>Authorized Personnel Only</span>
                </div>
                <button 
                  type="button" 
                  className="support-link-btn"
                  onClick={() => {
                    logout();
                    if (onClose) onClose();
                  }}
                  style={{ color: '#b73b37', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                  title="Sign out and return to the Government Login Page"
                >
                  <span>Sign Out to Login Page →</span>
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* ====================================================================
            BOTTOM DARK NAVY FOOTER STRIP
            ==================================================================== */}
        <footer className="portal-dark-footer">
          <div className="footer-left-txt">
            <span>POLARIS &nbsp;|&nbsp; Ministry of Earth Sciences &nbsp;|&nbsp; National Centre for Polar & Ocean Research (NCPOR)</span>
          </div>
          <div className="footer-right-cluster">
            <span className="footer-motto-txt">Science • Exploration • Sustainability • Resilience</span>
            {/* Indian Flag Tricolor Bar */}
            <div className="flag-tricolor-bar">
              <span className="tri-bar-saffron" />
              <span className="tri-bar-white" />
              <span className="tri-bar-green" />
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
