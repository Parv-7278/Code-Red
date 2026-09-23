import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  User, 
  ChevronDown, 
  Lock,
  LayoutDashboard,
  Box,
  Cpu,
  Zap,
  Package,
  CloudSnow,
  FlaskConical,
  Layers,
  FileText,
  Check,
  Building2,
  Globe2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AIPredictionIndicator from './AIPredictionIndicator';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  selectedStation, 
  onSelectStation, 
  unreadCount = 3,
  onOpenAlerts,
  onOpenAuth 
}) {
  const { profile, isIndiaOperator, isStationOperator, assignedStation, loginWithDemoRole, logout } = useAuth();
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsStationDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isStationDropdownOpen) {
        setIsStationDropdownOpen(false);
      }
    };
    if (isStationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStationDropdownOpen]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'digital-twin', label: 'Digital Twin', icon: Box },
    { id: 'infrastructure', label: 'Infrastructure', icon: Cpu },
    { id: 'energy', label: 'Energy', icon: Zap },
    { id: 'logistics', label: 'Logistics', icon: Package },
    { id: 'environment', label: 'Environment', icon: CloudSnow },
    { id: 'research', label: 'Research', icon: FlaskConical },
    { id: 'telemetry', label: 'Telemetry', icon: Layers },
    { id: 'simulations', label: 'Reports', icon: FileText },
  ];

  // Dynamic Context Title based on selection (INDIA / MAITRI / BHARATI)
  const isIndia = selectedStation === 'all-stations' || (isIndiaOperator && selectedStation === 'all-stations');
  const isBharati = selectedStation === 'station-bharati';
  
  const contextSubtitle = isIndia 
    ? 'INDIA CONTROL CENTRE' 
    : isBharati 
    ? 'BHARATI STATION' 
    : 'MAITRI STATION';

  const currentStationLabel = isBharati 
    ? 'Bharati Station' 
    : isIndia
    ? 'India HQ (All Stations)'
    : 'Maitri Station';

  const currentStationShort = isBharati ? 'BHARATI' : (isIndia ? 'INDIA HQ' : 'MAITRI');

  const handleSelectStationOption = (stId) => {
    setIsStationDropdownOpen(false);
    if (stId === 'all-stations') {
      if (onSelectStation) onSelectStation('all-stations');
    } else if (stId === 'station-maitri') {
      if (onSelectStation) onSelectStation('station-maitri');
    } else if (stId === 'station-bharati') {
      if (onSelectStation) onSelectStation('station-bharati');
    }
  };

  return (
    <header className="polaris-header">
      {/* Brand & Logo + Dynamic Operational Context */}
      <div className="header-left-cluster">
        <div 
          className="header-brand" 
          onClick={() => isIndiaOperator && onSelectStation && onSelectStation('all-stations')} 
          style={{ cursor: isIndiaOperator ? 'pointer' : 'default' }}
          title={isIndiaOperator ? 'Click to return to India HQ Control Centre' : undefined}
        >
          <div className="logo-container">
            <svg className="polar-logo-svg" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2L36 12V24L20 31L4 24V12L20 2Z" stroke="#38bdf8" strokeWidth="1.8" fill="rgba(6, 182, 212, 0.12)" />
              <path d="M11 23L17 14L22 21L27 10L33 23H11Z" fill="#0284c7" fillOpacity="0.4" />
              <path d="M27 10L22 21L17 14L11 23H33L27 10Z" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M27 10L24.5 15.5L27 17L29.5 15L27 10Z" fill="#ffffff" />
              <path d="M17 14L14.8 18.5L17 19.5L19 18.5L17 14Z" fill="#ffffff" />
              <line x1="8" y1="26" x2="32" y2="26" stroke="#00e699" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">POLARIS</h1>
            <span className="brand-subtitle">{isIndia ? 'INDIA CONTROL CENTRE' : 'ANTARCTIC DIGITAL TWIN'}</span>
          </div>
        </div>

        {/* Station Selector Dropdown Pill */}
        <div className="header-station-dropdown-wrap" ref={dropdownRef}>
          <button 
            type="button" 
            className="station-selector-dropdown-btn"
            onClick={() => isIndiaOperator && setIsStationDropdownOpen(!isStationDropdownOpen)}
            title={isIndiaOperator ? 'Switch Active Polar Station' : 'Assigned Local Station'}
          >
            <Building2 size={13} className="text-cyan" style={{ marginRight: '4px' }} />
            <span className="st-name-text">{currentStationLabel}</span>
            {isIndiaOperator ? (
              <ChevronDown size={13} className="text-dim" />
            ) : null}
            <span className="st-status-badge">
              <span className="st-online-dot" /> Online (Assigned)
            </span>
          </button>

          {isStationDropdownOpen && isIndiaOperator && (
            <div className="station-dropdown-menu">
              <div 
                className={`st-dropdown-item ${selectedStation === 'all-stations' ? 'selected' : ''}`}
                onClick={() => handleSelectStationOption('all-stations')}
              >
                <div className="st-drop-text">
                  <span className="st-drop-name">🇮🇳 India HQ Command</span>
                  <span className="st-drop-loc">Unified Multi-Station Control</span>
                </div>
                {selectedStation === 'all-stations' && <Check size={14} className="text-cyan" />}
              </div>

              <div 
                className={`st-dropdown-item ${selectedStation === 'station-maitri' ? 'selected' : ''}`}
                onClick={() => handleSelectStationOption('station-maitri')}
              >
                <div className="st-drop-text">
                  <span className="st-drop-name">🧊 Maitri Station</span>
                  <span className="st-drop-loc">Schirmacher Oasis (70°45′S)</span>
                </div>
                {selectedStation === 'station-maitri' && <Check size={14} className="text-cyan" />}
              </div>

              <div 
                className={`st-dropdown-item ${selectedStation === 'station-bharati' ? 'selected' : ''}`}
                onClick={() => handleSelectStationOption('station-bharati')}
              >
                <div className="st-drop-text">
                  <span className="st-drop-name">📡 Bharati Station</span>
                  <span className="st-drop-loc">Larsemann Hills (69°24′S)</span>
                </div>
                {selectedStation === 'station-bharati' && <Check size={14} className="text-cyan" />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Top Navigation Tabs with Icons */}
      <nav className="header-nav">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${isActive ? 'active' : ''}`}
            >
              <IconComp size={13} className="nav-tab-icon" />
              <span className="nav-tab-label">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="nav-tab-badge">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="header-controls">
        {/* AI Predictive Intelligence Header Pill */}
        <AIPredictionIndicator compact={true} />

        {/* Notification Bell */}
        <button 
          className="notification-btn" 
          onClick={onOpenAlerts}
          title="Active Alerts"
        >
          <Bell size={17} className="bell-icon" />
          <span className="notification-badge">{unreadCount}</span>
        </button>

        {/* Mission Controller Profile Badge */}
        <div 
          className="user-profile-badge interactive-profile-badge" 
          onClick={onOpenAuth}
          title="Open Operator Identity & Access Workspace"
        >
          <div className="avatar-circle">
            <User size={14} />
          </div>
          <div className="user-info">
            <span className="user-role">
              {profile?.full_name ? profile.full_name : (isIndiaOperator ? 'Dr. Rajesh Sharma' : 'Cmdr. Vikram')}
            </span>
            <span className="user-station-sub">
              {isIndiaOperator ? 'India HQ' : (selectedStation === 'station-bharati' ? 'Bharati' : 'Maitri')}
            </span>
          </div>
          <div className="user-status-pill">
            <span>{currentStationShort}</span>
            <span className="status-mini-dot" />
          </div>
        </div>
      </div>
    </header>
  );
}
