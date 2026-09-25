import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Zap, 
  Package, 
  Mountain, 
  Radio, 
  Search, 
  Maximize2, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Droplets,
  Fuel,
  Compass,
  Layers,
  Thermometer,
  Shield,
  Activity,
  Server
} from 'lucide-react';
import { STATIONS_DATA } from '../data/stationsData';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';
import AIPredictionIndicator from './AIPredictionIndicator';

export default function InfrastructureView({ selectedStation = 'station-maitri' }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [infoSubTab, setInfoSubTab] = useState('overview'); // 'overview' | 'systems' | 'maintenance'
  const [viewMode, setViewMode] = useState('3D'); // '3D' | 'Map'
  const canvasRef = useRef(null);

  const stationData = STATIONS_DATA[selectedStation] || STATIONS_DATA['station-maitri'];
  const buildingsData = stationData.buildings || {};
  const buildingKeys = Object.keys(buildingsData);

  // Default selected building to first building if not set or invalid for this station
  const currentBuildingId = (selectedBuildingId && buildingsData[selectedBuildingId]) 
    ? selectedBuildingId 
    : buildingKeys[0] || 'main-control';

  const selectedBuilding = buildingsData[currentBuildingId] || Object.values(buildingsData)[0] || {
    name: 'Research Facility',
    status: 'Normal',
    statusType: 'normal',
    type: 'Scientific Operations',
    builtYear: '2012',
    area: '1,000 m²',
    occupancy: '20 / 25',
    description: 'Polar research station facility.',
    systems: [],
    maintenance: { health: '95%', lastInspection: '15 May 2025', nextScheduled: '15 Jun 2025', notes: 'Nominal' }
  };

  const carouselCardIds = buildingKeys;

  const filteredCardIds = carouselCardIds.filter((id) => {
    const b = buildingsData[id];
    if (!b) return false;
    if (activeCategory === 'critical' && b.category !== 'critical') return false;
    if (activeCategory === 'utilities' && b.category !== 'utilities') return false;
    if (activeCategory === 'storage' && b.category !== 'storage') return false;
    if (activeCategory === 'others' && b.category !== 'others') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.type.toLowerCase().includes(q);
    }
    return true;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.6 + 0.4,
      speedX: Math.random() * 1.5 - 2,
      speedY: Math.random() * 1.1 + 0.6,
      opacity: Math.random() * 0.5 + 0.2
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 245, 255, ${p.opacity})`;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) {
          p.y = 0;
          p.x = Math.random() * canvas.width;
        }
      });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const scenePins = Object.values(buildingsData);
  const healthData = stationData.health || { total: 87, rating: 'Good', infrastructure: 91, energy: 84, logistics: 89, environment: 78, communication: 94 };

  const healthScore = healthData.total;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - healthScore / 100);

  return (
    <div className="infra-view-layout">
      {/* ====================================================================
          LEFT SIDEBAR: Station Identity Card + Station Health Index
          ==================================================================== */}
      <aside className="infra-left-sidebar">
        {/* Station Identity Card */}
        <div className="infra-station-card polaris-card">
          <div className="infra-station-thumb-wrap">
            <img 
              src={stationData.heroImage} 
              alt={stationData.name} 
              className="infra-station-img"
            />
            <div className="thumb-scanline" />
          </div>
          <div className="infra-station-meta">
            <h3 className="infra-st-name">{stationData.fullName ? stationData.fullName.toUpperCase() : `${stationData.name} STATION`}</h3>
            <div className="infra-st-coords mono-num">{stationData.coords}</div>
            <div className="infra-st-region">{stationData.region}</div>
            <div className="infra-st-status">
              <span className="live-dot" />
              <span>{stationData.status}</span>
            </div>
          </div>
        </div>

        {/* Station Health Index */}
        <div className="infra-health-card polaris-card">
          <div className="card-header-simple">
            <span className="card-title">Station Health Index</span>
          </div>

          <div className="infra-radial-wrap">
            <div className="infra-gauge-box">
              <svg width="115" height="115" className="gauge-svg">
                <defs>
                  <linearGradient id="infraHealthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#187451" />
                    <stop offset="100%" stopColor="#147889" />
                  </linearGradient>
                </defs>
                <circle
                  cx="57.5"
                  cy="57.5"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(30, 58, 95, 0.4)"
                  strokeWidth="7"
                />
                <circle
                  cx="57.5"
                  cy="57.5"
                  r={radius}
                  fill="transparent"
                  stroke="url(#infraHealthGrad)"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 57.5 57.5)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="infra-gauge-center">
                <div className="infra-gauge-score mono-num">{healthScore}<span className="score-den">/100</span></div>
                <span className="infra-good-badge" style={{ color: healthData.ratingColor || '#187451' }}>{healthData.rating}</span>
              </div>
            </div>
          </div>

          {/* Subsystem Health Bars */}
          <div className="infra-health-bars-list">
            {[
              { label: 'Infrastructure', score: healthData.infrastructure, color: '#187451', icon: Building2 },
              { label: 'Energy', score: healthData.energy, color: '#187451', icon: Zap },
              { label: 'Logistics', score: healthData.logistics, color: '#187451', icon: Package },
              { label: 'Environment', score: healthData.environment, color: healthData.environment >= 90 ? '#187451' : '#946013', icon: Mountain },
              { label: 'Communication', score: healthData.communication, color: '#187451', icon: Radio },
            ].map((bar, i) => {
              const BarIcon = bar.icon;
              return (
                <div key={i} className="infra-hbar-row">
                  <div className="hbar-label-wrap">
                    <BarIcon size={12} style={{ color: bar.color }} />
                    <span className="hbar-label">{bar.label}</span>
                  </div>
                  <div className="hbar-track">
                    <div 
                      className="hbar-fill" 
                      style={{ width: `${bar.score}%`, backgroundColor: bar.color }} 
                    />
                  </div>
                  <span className="hbar-val mono-num" style={{ color: bar.color }}>{bar.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ====================================================================
          CENTER MAIN CONTENT: 3D Scene + Building Filter/Cards
          ==================================================================== */}
      <section className="infra-center-section">
        {/* AI Predictive Intelligence Section Indicator */}
        <AIPredictionIndicator category="infrastructure" />

        {/* Top 3D Digital Twin Viewport */}
        <div className="infra-scene-card polaris-card">
          <div className="infra-scene-header">
            <div className="infra-scene-title-wrap">
              <span className="infra-scene-title">Infrastructure Overview – {stationData.name} Station</span>
              <span className="infra-view-pill">
                <span className="view-pill-dot">⊙</span> 3D View
              </span>
            </div>

            <div className="infra-scene-controls">
              <div className="view-switch-pill">
                <button 
                  className={`v-switch-btn ${viewMode === '3D' ? 'active' : ''}`}
                  onClick={() => setViewMode('3D')}
                >
                  3D
                </button>
                <button 
                  className={`v-switch-btn ${viewMode === 'Map' ? 'active' : ''}`}
                  onClick={() => setViewMode('Map')}
                >
                  Map
                </button>
              </div>
              <button className="expand-btn" title="Fullscreen">
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* 3D Visual Canvas Viewport */}
          <div className="infra-viewport-container">
            <div 
              className="infra-scene-canvas" 
              style={{ backgroundImage: `url(${stationData.heroImage})` }}
            >
              <div className="twin-grid-overlay" />
              <canvas ref={canvasRef} className="snow-particle-canvas" />

              {/* Floating Labeled Building Markers */}
              {scenePins.map((pin) => {
                const isSelected = currentBuildingId === pin.id;
                const isWarning = pin.statusType === 'warning';

                return (
                  <div
                    key={pin.id}
                    className={`infra-pin-tag ${isSelected ? 'selected' : ''} ${isWarning ? 'warning' : ''}`}
                    style={{ top: pin.pinPos?.top || '35%', left: pin.pinPos?.left || '50%' }}
                    onClick={() => setSelectedBuildingId(pin.id)}
                  >
                    <div className="infra-pin-box">
                      <span className="infra-pin-title">{pin.name}</span>
                      <div className="infra-pin-badge">
                        <span className={isWarning ? 'warn-dot' : 'live-dot'} />
                        <span className="badge-txt">{pin.status}</span>
                      </div>
                    </div>
                    <div className="pin-stem" />
                    <div className="pin-anchor-dot" />
                  </div>
                );
              })}
            </div>

            {/* Compass Rose */}
            <div className="twin-compass-widget">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="20" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1.2" strokeDasharray="3 3" />
                <polygon points="22,6 25.5,22 18.5,22" fill="#b73b37" />
                <polygon points="22,38 25.5,22 18.5,22" fill="#94a3b8" />
                <circle cx="22" cy="22" r="2.5" fill="#ffffff" />
                <text x="22" y="5" fill="#b73b37" fontSize="6.5" fontWeight="bold" textAnchor="middle">N</text>
                <text x="40" y="24" fill="#64748b" fontSize="6.5" fontWeight="bold" textAnchor="middle">E</text>
                <text x="22" y="43" fill="#64748b" fontSize="6.5" fontWeight="bold" textAnchor="middle">S</text>
                <text x="4" y="24" fill="#64748b" fontSize="6.5" fontWeight="bold" textAnchor="middle">W</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Building Filter & Cards Carousel */}
        <div className="infra-bottom-panel polaris-card">
          <div className="infra-filter-bar">
            <div className="infra-filter-tabs">
              {[
                { id: 'all', label: 'All Buildings' },
                { id: 'critical', label: 'Critical Systems' },
                { id: 'utilities', label: 'Utilities' },
                { id: 'storage', label: 'Storage & Logistics' },
                { id: 'others', label: 'Others' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`filter-tab-btn ${activeCategory === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="infra-search-box">
              <Search size={13} className="search-icon" />
              <input
                type="text"
                placeholder="Search building or system..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="infra-search-input"
              />
            </div>
          </div>

          {/* Dynamic Building Cards Grid */}
          <div className="infra-cards-grid">
            {filteredCardIds.map((id) => {
              const b = buildingsData[id];
              if (!b) return null;
              const isSelected = currentBuildingId === b.id;
              const isWarning = b.statusType === 'warning';

              return (
                <ExpandableTelemetryCard
                  key={b.id}
                  title={b.name}
                  category={b.type || 'STATION INFRASTRUCTURE'}
                  value={b.metricVal}
                  status={isWarning ? 'warning' : 'nominal'}
                  icon={Building2}
                  color={isWarning ? '#946013' : '#187451'}
                  subtext={`Area: ${b.area || 'N/A'} • Occupancy: ${b.occupancy || 'N/A'}`}
                  details={[
                    { label: 'Category', value: b.type || 'Structure', color: '#146b80' },
                    { label: 'Built Year', value: b.builtYear || '2012', color: '#1d3044' },
                    { label: 'Occupancy', value: b.occupancy || 'Nominal', color: '#187451' },
                    { label: 'Floor Area', value: b.area || 'N/A', color: '#1d3044' },
                    { label: 'SCADA Health', value: b.maintenance?.health || '96%', color: '#187451' },
                  ]}
                  interpretation={b.description || 'Polar research station structure engineered for extreme low temperature and wind load resilience.'}
                  stationName={stationData.name}
                  onClick={() => setSelectedBuildingId(b.id)}
                >
                  <div
                    className={`infra-bldg-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="bldg-thumb-box">
                      <img src={b.image} alt={b.name} className="bldg-thumb-img" />
                      <div className="thumb-scanline" />
                    </div>

                    <div className="bldg-meta-box">
                      <div className="bldg-name-row">
                        <span className="bldg-name">{b.name}</span>
                      </div>

                      <div className="bldg-status-row">
                        <span className={isWarning ? 'warn-dot' : 'live-dot'} />
                        <span className={`bldg-status-txt ${isWarning ? 'text-amber' : 'text-green'}`}>
                          {b.status}
                        </span>
                      </div>

                      <div className="bldg-footer-row">
                        <div className="bldg-metric-wrap">
                          <span className="bldg-m-val mono-num">{b.metricVal}</span>
                          <span className="bldg-m-lbl">{b.metricLabel}</span>
                        </div>
                        <ChevronRight size={14} className="bldg-arrow-icon" />
                      </div>
                    </div>
                  </div>
                </ExpandableTelemetryCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          RIGHT SIDEBAR: Detailed Information Panel
          ==================================================================== */}
      <aside className="infra-right-sidebar polaris-card">
        {/* Panel Header */}
        <div className="detail-panel-header">
          <div className="detail-panel-title-wrap">
            <Building2 size={15} className="detail-header-icon" />
            <span className="detail-panel-title">Detailed Information</span>
          </div>
          <button className="expand-btn">
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Selected Building Hero */}
        <div className="selected-bldg-hero">
          <div className="bldg-icon-circle">
            <Building2 size={18} />
          </div>
          <div className="selected-bldg-meta">
            <h4 className="selected-bldg-title">{selectedBuilding.name}</h4>
            <div className="selected-bldg-status">
              <span className={selectedBuilding.statusType === 'warning' ? 'warn-dot' : 'live-dot'} />
              <span>{selectedBuilding.status}</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs: Overview / Systems / Maintenance */}
        <div className="detail-subtabs-bar">
          <button 
            className={`detail-subtab-btn ${infoSubTab === 'overview' ? 'active' : ''}`}
            onClick={() => setInfoSubTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`detail-subtab-btn ${infoSubTab === 'systems' ? 'active' : ''}`}
            onClick={() => setInfoSubTab('systems')}
          >
            Systems
          </button>
          <button 
            className={`detail-subtab-btn ${infoSubTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setInfoSubTab('maintenance')}
          >
            Maintenance
          </button>
        </div>

        {/* Tab Content */}
        {infoSubTab === 'overview' && (
          <div className="detail-content-scroll">
            {/* Building Photo */}
            <div className="detail-photo-wrap">
              <img 
                src={selectedBuilding.image} 
                alt={selectedBuilding.name} 
                className="detail-photo-img" 
              />
              <div className="thumb-scanline" />
            </div>

            {/* Description */}
            <p className="detail-description-txt">
              {selectedBuilding.description}
            </p>

            {/* Specifications Key-Value List */}
            <div className="detail-specs-table">
              <div className="spec-row">
                <span className="spec-label">Building Type</span>
                <span className="spec-val">{selectedBuilding.type}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Built Year</span>
                <span className="spec-val mono-num">{selectedBuilding.builtYear}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Area</span>
                <span className="spec-val mono-num">{selectedBuilding.area}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Occupancy</span>
                <span className="spec-val mono-num">{selectedBuilding.occupancy}</span>
              </div>
            </div>

            {/* Key Systems Checklist */}
            <div className="detail-key-systems-section">
              <span className="key-systems-heading">Key Systems</span>
              <div className="key-systems-list">
                {(selectedBuilding.systems || []).map((sys, idx) => (
                  <div key={idx} className="key-system-row">
                    <div className="sys-name-wrap">
                      <Zap size={13} className="sys-icon" />
                      <span className="sys-name">{sys.name}</span>
                    </div>
                    <div className="sys-status-badge">
                      <span className={sys.statusType === 'warning' ? 'warn-dot' : 'live-dot'} />
                      <span className={sys.statusType === 'warning' ? 'text-amber' : 'text-green'}>
                        {sys.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {infoSubTab === 'systems' && (
          <div className="detail-content-scroll">
            <div className="systems-tab-list">
              {(selectedBuilding.systems || []).map((sys, idx) => (
                <div key={idx} className="system-tab-card">
                  <div className="sys-header-line">
                    <span className="sys-title">{sys.name}</span>
                    <span className={`sys-status-pill ${sys.statusType}`}>
                      {sys.status}
                    </span>
                  </div>
                  <div className="sys-telemetry-row">
                    <span>Telemetry stream active</span>
                    <span className="mono-num text-cyan">100% Signal</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {infoSubTab === 'maintenance' && (
          <div className="detail-content-scroll">
            <div className="maintenance-tab-box">
              <div className="maint-row">
                <span className="maint-lbl">Overall Health</span>
                <span className="maint-val mono-num text-green">{selectedBuilding.maintenance?.health || '95%'}</span>
              </div>
              <div className="maint-row">
                <span className="maint-lbl">Last Inspection</span>
                <span className="maint-val mono-num">{selectedBuilding.maintenance?.lastInspection || '10 May 2025'}</span>
              </div>
              <div className="maint-row">
                <span className="maint-lbl">Next Scheduled</span>
                <span className="maint-val mono-num text-cyan">{selectedBuilding.maintenance?.nextScheduled || '10 Jun 2025'}</span>
              </div>
              <div className="maint-notes-box">
                <span className="maint-notes-lbl">Engineering Log:</span>
                <p className="maint-notes-txt">{selectedBuilding.maintenance?.notes || 'Facility structural integrity verified nominal.'}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
