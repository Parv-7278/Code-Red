import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FlaskConical, 
  FolderGit2, 
  Database, 
  MapPin, 
  Users, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  Send,
  Radio,
  Clock,
  CheckCircle2,
  Calendar,
  Eye,
  Maximize2,
  Box,
  Cpu,
  Compass,
  Activity,
  CloudSnow,
  Thermometer,
  Shield,
  Zap,
  Mic,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  GitCompare,
  RefreshCw,
  Search,
  Check,
  Info,
  HelpCircle,
  Bot,
  Wind,
  Droplets,
  Gauge,
  UploadCloud,
  FileCheck,
  X,
  Sliders,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { useModal } from '../context/ModalContext';
import { analyzeResearchData, askResearchAI, getAIAnalystStatus, generate24HourReport } from '../services/api';
import SummaryReportModal from './SummaryReportModal';
import ResearchAnalysisModal from './ResearchAnalysisModal';
import HistoricalComparisonModal from './HistoricalComparisonModal';
import { useStationClock, getStationTimezone, getStationTimezoneLabel } from '../utils/timeUtils';

export default function ResearchView({ selectedStation = 'station-maitri', onSelectStation }) {
  const { profile, isIndiaOperator, isStationOperator, assignedStation } = useAuth();
  const { telemetry } = useTelemetry();
  const { openDrillDown } = useModal();

  const effectiveStation = isStationOperator && assignedStation 
    ? assignedStation 
    : (selectedStation === 'all-stations' ? 'station-maitri' : selectedStation);

  const isBharati = effectiveStation === 'station-bharati';
  const stationDisplayName = isBharati ? 'Bharati' : 'Maitri';
  const stationCoords = isBharati ? "69° 24′ S, 76° 17′ E" : "70° 45′ S, 11° 44′ E";
  const stationRegion = isBharati ? "Larsemann Hills" : "Schirmacher Oasis";

  // Navigation State
  const [sidebarTab, setSidebarTab] = useState('research');
  const [subTab, setSubTab] = useState('overview');
  const [dataFlowRange, setDataFlowRange] = useState('Last 7 Days');
  
  // Visualization Card state (Maitri layout)
  const [visCategory, setVisCategory] = useState('satellite');
  const [selectedDate, setSelectedDate] = useState('10 Sep 2025');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [is3DView, setIs3DView] = useState(false);
  const [layers, setLayers] = useState({
    surfaceTemp: true,
    snowDepth: true,
    iceVelocity: false,
    elevation: false,
  });

  // AI Assistant state
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: isBharati
        ? `Based on the latest satellite data and field observations, the ice shelf near Bharati Station shows a 12% increase in surface melting rate compared to last month. This may impact the planned drilling schedule for Project IceCore-3. I recommend increasing monitoring frequency in this region.`
        : `Based on the latest satellite data, the ice velocity near the Maitri station has increased by 12% compared to last month. This could indicate changes in the local ice dynamics. Would you like to view the detailed analysis or compare with historical data?`
    }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Analysis & Historical Comparison Modals State
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // 24-Hour Comprehensive Summary Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [summaryReportData, setSummaryReportData] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleGenerateSummaryReport = async (stationOverride) => {
    setIsGeneratingReport(true);
    try {
      const targetStation = (typeof stationOverride === 'string' && stationOverride.trim() !== '')
        ? stationOverride.trim()
        : (selectedStation === 'all-stations' && isIndiaOperator
            ? 'all-stations'
            : effectiveStation);

      const reportRes = await generate24HourReport(
        { stationId: targetStation },
        profile?.role,
        profile?.assigned_station
      );

      setSummaryReportData(reportRes);
      setReportGenerated(true);
      setIsReportModalOpen(true);

      const exec = reportRes.report?.executive_summary || reportRes.executive_summary || {};
      const stName = reportRes.station_name || (targetStation.includes('bharati') ? 'Bharati' : targetStation.includes('all') ? 'All Antarctic Stations' : 'Maitri');
      const aiText = `24-Hour Comprehensive Operational & Research Report compiled for ${stName}. Overall Station Status: ${exec.overall_status || 'NORMAL'} (Risk Index: ${exec.overall_risk_score ?? 18}/100). ${exec.ai_summary || 'All monitored modules synchronized.'}`;

      setAiMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'ai',
          text: aiText,
          hasReportAction: true,
        }
      ]);
    } catch (err) {
      console.error('Failed to generate summary report:', err);
      setAiMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'ai',
          text: `Error compiling 24-hour report: ${err.message || 'Check database connection.'}`,
        }
      ]);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Time & Live Clock
  const stationClock = useStationClock(effectiveStation);
  const currentTimeStr = stationClock.dateTimeStr;

  // Update initial message when station changes
  useEffect(() => {
    setAiMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: isBharati
          ? `Based on the latest satellite data and field observations, the ice shelf near Bharati Station shows a 12% increase in surface melting rate compared to last month. This may impact the planned drilling schedule for Project IceCore-3. I recommend increasing monitoring frequency in this region.`
          : `Based on the latest satellite data, the ice velocity near the Maitri station has increased by 12% compared to last month. This could indicate changes in the local ice dynamics. Would you like to view the detailed analysis or compare with historical data?`
      }
    ]);
  }, [isBharati]);

  const handleToggleLayer = (layerKey) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Handle Direct View Analysis Modal
  const handleViewAnalysis = () => {
    setIsAnalysisModalOpen(true);
    setAiMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', text: 'View detailed satellite analysis' },
      { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: `Opening high-resolution CryoSat-2 & ISRO NISAR satellite cryosphere briefing for ${stationDisplayName} Station. Subsurface firn compaction and +12% ice velocity surge highlighted.`,
        hasAnalysisAction: true 
      }
    ]);
    openDrillDown({
      title: `Detailed Satellite Cryosphere & Ice Dynamics Analysis (${stationDisplayName})`,
      type: 'RESEARCH_ANALYSIS',
      station: stationDisplayName
    });
  };

  // Handle Direct Compare with Past Modal
  const handleCompareWithPast = () => {
    setIsComparisonModalOpen(true);
    setAiMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', text: 'Compare with historical cryosphere data' },
      { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: `Compiling 5-year longitudinal cryosphere comparative benchmark (2021–2026) for ${stationDisplayName} Station. Decadal warming rate +0.32°C/decade recorded.`,
        hasCompareAction: true 
      }
    ]);
    openDrillDown({
      title: `5-Year Historical Cryosphere & Climate Comparison (${stationDisplayName})`,
      type: 'HISTORICAL_COMPARISON',
      station: stationDisplayName
    });
  };

  // Connected AI Analysis API Call
  const handleSendAiMessage = async (queryText) => {
    const query = queryText || aiInput;
    if (!query.trim()) return;

    const qLower = query.toLowerCase();
    if (qLower.includes('analysis') || qLower.includes('satellite') || qLower.includes('view analysis')) {
      handleViewAnalysis();
      setAiInput('');
      return;
    }

    if (qLower.includes('past') || qLower.includes('compare') || qLower.includes('history') || qLower.includes('historical')) {
      handleCompareWithPast();
      setAiInput('');
      return;
    }

    const userMsg = { id: Date.now(), sender: 'user', text: query };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');

    if (qLower.includes('summary report') || qLower.includes('24h report') || qLower.includes('24-hour report') || qLower.includes('operational report')) {
      handleGenerateSummaryReport(effectiveStation);
      return;
    }

    setIsAiTyping(true);

    try {
      const response = await askResearchAI({
        stationId: effectiveStation,
        question: query,
        timeRange: '7d',
        timezone: getStationTimezone(effectiveStation),
        timezone_label: getStationTimezoneLabel(effectiveStation)
      }, profile?.role, profile?.assigned_station);

      if (response?.hasReportAction && response?.summaryReportData) {
        setSummaryReportData(response.summaryReportData);
        setReportGenerated(true);
      }

      const replyText = response?.answer || response?.summary || 
        `Analysis complete for ${stationDisplayName} Station: Subsurface cryosphere profiles indicate steady compaction. CryoSat-2 and NISAR interferometry models confirm localized ice shelf grounding line equilibrium.`;

      setAiMessages(prev => [
        ...prev, 
        { 
          id: Date.now() + 1, 
          sender: 'ai', 
          text: replyText,
          hasReportAction: !!response?.hasReportAction
        }
      ]);
    } catch (err) {
      let reply = `Analysis complete for ${stationDisplayName} Station: Subsurface cryosphere profiles indicate steady compaction. CryoSat-2 and NISAR interferometry models confirm localized ice shelf grounding line equilibrium.`;
      let hasAction = false;
      if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('report')) {
        reply = `Summary Synthesis: ${isBharati ? '8' : '12'} active research projects across Glaciology, Atmospheric Sciences, and Space Weather. Telemetry throughput 99.8% nominal via Ku-Band ISRO satellite downlink.`;
        hasAction = true;
      }
      setAiMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: reply, hasReportAction: hasAction }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // 7-Day Chart Data Points
  const chartPoints = [
    { day: '6 Sep', sensor: 1.8, field: 1.2, lab: 0.9 },
    { day: '7 Sep', sensor: 2.3, field: 1.5, lab: 1.1 },
    { day: '8 Sep', sensor: 2.4, field: 1.6, lab: 1.4 },
    { day: '9 Sep', sensor: 3.2, field: 1.9, lab: 1.5 },
    { day: '10 Sep', sensor: 3.4, field: 2.3, lab: 1.7 },
    { day: '11 Sep', sensor: 4.6, field: 2.8, lab: 1.9 },
    { day: '12 Sep', sensor: 3.8, field: 2.4, lab: 1.6 },
  ];

  // SVG Line Path Generator
  const svgWidth = 480;
  const svgHeight = 150;
  const padLeft = 38;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 22;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const maxY = 5.0;

  const getCoordinates = (key) => {
    return chartPoints.map((pt, i) => {
      const x = padLeft + (i / (chartPoints.length - 1)) * plotW;
      const y = padTop + (1 - (pt[key] / maxY)) * plotH;
      return { x, y, val: pt[key], day: pt.day };
    });
  };

  const sensorCoords = getCoordinates('sensor');
  const fieldCoords = getCoordinates('field');
  const labCoords = getCoordinates('lab');

  const makeSmoothSvgPath = (coords) => {
    if (!coords.length) return '';
    let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx.toFixed(1)},${p0.y.toFixed(1)} ${mx.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  };

  const sensorPath = makeSmoothSvgPath(sensorCoords);
  const fieldPath = makeSmoothSvgPath(fieldCoords);
  const labPath = makeSmoothSvgPath(labCoords);

  // Bharati Projects (Exact Match with Screenshot)
  const bharatiProjects = [
    { id: 1, name: 'Glaciology & Climate Change', sub: 'Ice core analysis, surface mass balance', status: 'Ongoing', daysLeft: '12 days left', icon: Compass, color: '#10b981', badgeClass: 'badge-ongoing' },
    { id: 2, name: 'Atmospheric Studies', sub: 'Weather pattern analysis, ozone', status: 'Ongoing', daysLeft: '18 days left', icon: CloudSnow, color: '#10b981', badgeClass: 'badge-ongoing' },
    { id: 3, name: 'Marine Ecosystem', sub: 'Ocean biology, plankton studies', status: 'Ongoing', daysLeft: '25 days left', icon: Activity, color: '#10b981', badgeClass: 'badge-ongoing' },
    { id: 4, name: 'Seismology & Geophysics', sub: 'Earthquake monitoring, crustal movement', status: 'Planned', daysLeft: '4 days left', icon: Zap, color: '#38bdf8', badgeClass: 'badge-planned-blue' },
    { id: 5, name: 'Space Weather Monitoring', sub: 'Solar activity, radiation levels', status: 'Ongoing', daysLeft: '32 days left', icon: Cpu, color: '#10b981', badgeClass: 'badge-ongoing' },
  ];

  // Maitri Projects
  const maitriProjects = [
    { id: 1, name: 'Glaciology & Climate Change', sub: 'Subsurface cryosphere core extraction', status: 'Active', daysLeft: '12 days left', icon: Compass, color: '#38bdf8', badgeClass: 'badge-active' },
    { id: 2, name: 'Atmospheric Studies', sub: 'Tropospheric ozone concentration', status: 'Active', daysLeft: '18 days left', icon: CloudSnow, color: '#38bdf8', badgeClass: 'badge-active' },
    { id: 3, name: 'Marine Ecosystem', sub: 'Coastal plankton distribution', status: 'Active', daysLeft: '25 days left', icon: Activity, color: '#38bdf8', badgeClass: 'badge-active' },
    { id: 4, name: 'Seismology & Geophysics', sub: 'Broadband seismic network calibration', status: 'Planned', daysLeft: '45 days left', icon: Zap, color: '#94a3b8', badgeClass: 'badge-planned' },
    { id: 5, name: 'Space Weather Monitoring', sub: 'Ionospheric scintillation alerts', status: 'Active', daysLeft: '32 days left', icon: Cpu, color: '#38bdf8', badgeClass: 'badge-active' },
  ];

  const currentProjects = isBharati ? bharatiProjects : maitriProjects;

  // Bharati Live Research Feed
  const bharatiLiveFeed = [
    { id: 1, title: 'Ice core sample analysis completed', desc: 'Preliminary results uploaded to repository.', time: '2h ago', icon: FlaskConical },
    { id: 2, title: 'Field team at Larsemann Hills', desc: 'GPS coordinates and photos synced.', time: '6h ago', icon: MapPin },
    { id: 3, title: 'New publication draft uploaded', desc: 'Glaciology Research – v2.1', time: '8h ago', icon: FileText },
    { id: 4, title: 'Maintenance completed - Weather Station', desc: 'System back online and transmitting data.', time: '10h ago', icon: CheckCircle2 },
  ];

  // Maitri Live Research Feed
  const maitriLiveFeed = [
    { id: 1, title: 'New data received from AWS-2 weather station', desc: 'Temperature, wind speed and pressure updated.', time: '2h ago', icon: CloudSnow },
    { id: 2, title: 'Ice core sample analysis completed', desc: 'Preliminary results uploaded to repository.', time: '4h ago', icon: Database },
    { id: 3, title: 'Field team at Larsemann Hills', desc: 'GPS coordinates and photos synced.', time: '6h ago', icon: MapPin },
    { id: 4, title: 'New publication draft uploaded', desc: 'Glaciology Research – v2.1', time: '8h ago', icon: FileText },
    { id: 5, title: 'Maintenance completed - Weather Station', desc: 'System back online and transmitting data.', time: '10h ago', icon: CheckCircle2 },
  ];

  const currentLiveFeed = isBharati ? bharatiLiveFeed : maitriLiveFeed;

  // Equipment & Lab Status List for Maitri
  const equipmentStatusList = [
    { id: 1, name: 'AWS-2 Weather Station', status: 'Online', lastUpdated: '12 Sep, 14:21', badgeClass: 'badge-online', type: 'Meteorology', health: 96 },
    { id: 2, name: 'Seismometer (BH-01)', status: 'Online', lastUpdated: '12 Sep, 14:15', badgeClass: 'badge-online', type: 'Geophysics', health: 94 },
    { id: 3, name: 'Ice Core Drill', status: 'Standby', lastUpdated: '12 Sep, 12:44', badgeClass: 'badge-standby', type: 'Glaciology', health: 88 },
    { id: 4, name: 'Spectrometer Lab', status: 'Online', lastUpdated: '12 Sep, 14:10', badgeClass: 'badge-online', type: 'Optics', health: 98 },
    { id: 5, name: 'GPS Station', status: 'Online', lastUpdated: '12 Sep, 14:12', badgeClass: 'badge-online', type: 'Geodesy', health: 99 },
    { id: 6, name: 'Weather Balloon', status: 'Scheduled', lastUpdated: '12 Sep, 16:00', badgeClass: 'badge-scheduled', type: 'Atmosphere', health: 90 },
  ];

  // Key Equipment for Bharati
  const bharatiKeyEquipment = [
    { id: 1, name: 'Generator G-01', status: 'Online', lastUpdated: '12 Sep, 14:12', statusColor: '#10b981' },
    { id: 2, name: 'Generator G-02', status: 'Maintenance', lastUpdated: '12 Sep, 10:32', statusColor: '#ef4444' },
    { id: 3, name: 'Communication System', status: 'Online', lastUpdated: '12 Sep, 09:47', statusColor: '#10b981' },
  ];

  // Bharati Active Alerts for Sidebar
  const bharatiSidebarAlerts = [
    { id: 1, title: 'Generator G-01 Vibration High', time: '12:48 PM', desc: 'Bharati Station • Maintenance Required', icon: AlertCircle, color: '#ef4444' },
    { id: 2, title: 'Fuel Level Low', time: '10:21 AM', desc: 'Diesel Tank 2 (Refill Required)', icon: Shield, color: '#f59e0b' },
    { id: 3, title: 'Temperature Anomaly', time: '08:17 AM', desc: 'Lab 3 (Ice Core Storage)', icon: Thermometer, color: '#f59e0b' },
  ];

  return (
    <div className="india-dashboard-container">
      
      {/* Station health summary column */}
      <aside className="india-sidebar-col">
        {/* Station Health Index now occupies the former navigation area. */}
        <div className="sidebar-health-card">
          <div className="card-mini-title">STATION HEALTH INDEX</div>
          
          <div className="health-gauge-box">
            <button type="button" className="gauge-side-nav-btn gauge-nav-left" title="Previous station subsystem" onClick={(e) => e.stopPropagation()}>
              <ChevronLeft size={13} />
            </button>
            <svg viewBox="0 0 120 120" className="gauge-svg">
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="rgba(30, 58, 95, 0.6)"
                strokeWidth="7"
                strokeDasharray="216 288"
                strokeLinecap="round"
                transform="rotate(135 60 60)"
              />
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="#00e699"
                strokeWidth="7"
                strokeDasharray={`${isBharati ? '182' : '188'} 288`}
                strokeLinecap="round"
                transform="rotate(135 60 60)"
                style={{ filter: 'drop-shadow(0 0 6px #00e699)' }}
              />
            </svg>
            <div className="gauge-value-text">
              <span className="gauge-score-large">{isBharati ? '84' : '87'}</span>
              <span className="gauge-score-denom">/100</span>
              <span className="gauge-status-word">GOOD</span>
            </div>
            <button type="button" className="gauge-side-nav-btn gauge-nav-right" title="Next station subsystem" onClick={(e) => e.stopPropagation()}>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="subsystems-metrics-list">
            <div className="subsys-metric-row">
              <span className="subsys-lbl"><Cpu size={11} className="text-cyan" /> Infrastructure</span>
              <span className="subsys-val val-green">{isBharati ? '88' : '91'}</span>
            </div>
            <div className="subsys-metric-row">
              <span className="subsys-lbl"><Zap size={11} className="text-cyan" /> Energy</span>
              <span className={`subsys-val ${isBharati ? 'val-amber' : 'val-green'}`}>{isBharati ? '76' : '84'}</span>
            </div>
            <div className="subsys-metric-row">
              <span className="subsys-lbl"><Box size={11} className="text-cyan" /> Logistics</span>
              <span className="subsys-val val-green">{isBharati ? '82' : '89'}</span>
            </div>
            <div className="subsys-metric-row">
              <span className="subsys-lbl"><AlertTriangle size={11} className={isBharati ? 'text-cyan' : 'text-amber'} /> Environment</span>
              <span className={`subsys-val ${isBharati ? 'val-green' : 'val-amber'}`}>{isBharati ? '85' : '78'}</span>
            </div>
            <div className="subsys-metric-row">
              <span className="subsys-lbl"><Radio size={11} className="text-cyan" /> Communication</span>
              <span className="subsys-val val-green">{isBharati ? '80' : '94'}</span>
            </div>
          </div>
        </div>

        {/* SIDEBAR BOTTOM SECTION: BHARATI ACTIVE ALERTS VS MAITRI ACTIVE RESEARCH */}
        {isBharati ? (
          <div className="sidebar-bharati-alerts-card">
            <div className="active-res-header-row">
              <span className="card-mini-title">ACTIVE ALERTS</span>
              <span className="view-all-link" onClick={() => setSidebarTab('alerts')}>View All →</span>
            </div>

            <div className="bharati-alerts-list">
              {bharatiSidebarAlerts.map((alt) => {
                const IconComp = alt.icon;
                return (
                  <div key={alt.id} className="bharati-alert-row-item">
                    <div className="b-alt-icon-wrap" style={{ color: alt.color }}>
                      <IconComp size={13} />
                    </div>
                    <div className="b-alt-info-col">
                      <div className="b-alt-top-line">
                        <span className="b-alt-title">{alt.title}</span>
                        <span className="b-alt-time">{alt.time}</span>
                      </div>
                      <span className="b-alt-desc">{alt.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bharati-unread-alerts-footer">
              <span className="unread-txt">Total Unread Alerts</span>
              <span className="unread-badge">3</span>
            </div>
          </div>
        ) : (
          <div className="sidebar-active-research-card">
            <div className="active-res-header-row">
              <span className="card-mini-title">ACTIVE RESEARCH</span>
              <span className="view-all-link" onClick={() => setSubTab('projects')}>View All</span>
            </div>

            <div className="active-res-items-list">
              {currentProjects.slice(0, 3).map((proj) => {
                const IconComp = proj.icon;
                return (
                  <div key={proj.id} className="active-res-item">
                    <div className="active-res-icon-wrap">
                      <IconComp size={13} className="text-cyan" />
                    </div>
                    <div className="active-res-info">
                      <span className="active-res-name">{proj.name}</span>
                      <span className="active-res-sub">Ongoing • {proj.daysLeft}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Weather Pill */}
            <div className="sidebar-weather-pill">
              <div className="w-pill-left">
                <CloudSnow size={15} className="text-cyan" />
                <div className="w-pill-text">
                  <span className="w-pill-temp">-18.7°C</span>
                  <span className="w-pill-cond">Light Snow</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </aside>

      {/* ====================================================================
          MAIN CENTER WORKSPACE AREA
          ==================================================================== */}
      <main className="india-main-workspace">
        
        {/* TOP STATION HERO BANNER */}
        {isBharati ? (
          <div className="bharati-hero-banner">
            <div className="bharati-hero-left">
              <div className="bharati-img-box">
                <img src="/stations/bharati.jpg" alt="Bharati Station Antarctica" className="bharati-hero-photo" />
                <div className="bharati-img-overlay-glow" />
              </div>
              <div className="bharati-hero-text">
                <div className="b-hero-title-row">
                  <h1 className="bharati-title-large">Bharati Station</h1>
                  <span className="bharati-status-pill">
                    <span className="b-status-dot" /> Operational
                  </span>
                </div>
                <div className="b-hero-meta-row">
                  <span className="b-coord-tag">
                    <Compass size={12} className="text-cyan" /> 69° 24′ S, 76° 17′ E
                  </span>
                  <span className="b-region-tag">Larsemann Hills</span>
                  <span className="b-updated-tag">Last Updated: 12 Sep 2025, 14:28 IST</span>
                </div>
              </div>
            </div>

            <div className="bharati-hero-weather-box">
              <div className="b-weather-primary">
                <CloudSnow size={26} className="text-cyan animate-pulse" />
                <div className="b-w-temp-block">
                  <span className="b-temp-val">-18.7°C</span>
                  <span className="b-temp-cond">Light Snow</span>
                </div>
              </div>
              <div className="b-weather-metrics-cluster">
                <div className="b-w-metric">
                  <Wind size={12} className="text-cyan" />
                  <span className="b-w-lbl">Wind</span>
                  <span className="b-w-val">28 km/h</span>
                </div>
                <div className="b-w-metric">
                  <Droplets size={12} className="text-cyan" />
                  <span className="b-w-lbl">Humidity</span>
                  <span className="b-w-val">68%</span>
                </div>
                <div className="b-w-metric">
                  <Gauge size={12} className="text-cyan" />
                  <span className="b-w-lbl">Pressure</span>
                  <span className="b-w-val">987 hPa</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <header className="research-main-header">
            <div className="r-header-left-cluster">
              <div className="r-beaker-icon-box">
                <FlaskConical size={24} className="text-cyan animate-pulse" />
              </div>
              <div className="r-titles-group">
                <h1 className="r-main-title">Research</h1>
                <span className="r-main-subtitle">Scientific Research &amp; Data Analytics</span>
              </div>
            </div>

            <div className="r-header-right-cluster">
              <span className="r-motto-text">Advancing knowledge for a sustainable tomorrow</span>
              <div className="r-datetime-pill">
                <Calendar size={13} className="text-cyan" />
                <span className="r-datetime-val">{currentTimeStr}</span>
                <span className="r-live-dot-badge">
                  <span className="live-dot" /> Live Data
                </span>
              </div>
            </div>
          </header>
        )}

        {/* SUB-NAVIGATION TABS RIBBON */}
        <div className="research-subnav-ribbon">
          <div className="subnav-left-pills">
            <button 
              type="button" 
              className={`subnav-pill ${subTab === 'overview' ? 'active' : ''}`}
              onClick={() => setSubTab('overview')}
            >
              Research Overview
            </button>
            <button 
              type="button" 
              className={`subnav-pill ${subTab === 'projects' ? 'active' : ''}`}
              onClick={() => setSubTab('projects')}
            >
              {isBharati ? 'Active Projects' : 'Projects'}
            </button>
            <button 
              type="button" 
              className={`subnav-pill ${subTab === 'field' ? 'active' : ''}`}
              onClick={() => setSubTab('field')}
            >
              Field Observations
            </button>
            <button 
              type="button" 
              className={`subnav-pill ${subTab === 'data' ? 'active' : ''}`}
              onClick={() => setSubTab('data')}
            >
              Data &amp; Analytics
            </button>
            <button 
              type="button" 
              className={`subnav-pill ${subTab === 'publications' ? 'active' : ''}`}
              onClick={() => setSubTab('publications')}
            >
              Publications
            </button>
            <button 
              type="button" 
              className={`subnav-pill ${subTab === 'collaboration' ? 'active' : ''}`}
              onClick={() => setSubTab('collaboration')}
            >
              {isBharati ? 'Collaborations' : 'Collaboration'}
            </button>
            <button 
              type="button" 
              className={`subnav-pill ${subTab === 'lab' ? 'active' : ''}`}
              onClick={() => setSubTab('lab')}
            >
              {isBharati ? 'Equipment & Labs' : 'Lab & Equipment'}
            </button>
          </div>

          {/* Quick Station Switcher */}
          {isIndiaOperator && onSelectStation && (
            <div className="research-station-toggle-group">
              <span className="station-toggle-label">Station:</span>
              <button
                type="button"
                className={`research-station-btn ${effectiveStation === 'station-maitri' && selectedStation !== 'all-stations' ? 'active' : ''}`}
                onClick={() => onSelectStation('station-maitri')}
                title="Switch to Maitri Station"
              >
                ❄️ Maitri
              </button>
              <button
                type="button"
                className={`research-station-btn ${effectiveStation === 'station-bharati' ? 'active' : ''}`}
                onClick={() => onSelectStation('station-bharati')}
                title="Switch to Bharati Station"
              >
                🏔️ Bharati
              </button>
              <button
                type="button"
                className={`research-station-btn ${selectedStation === 'all-stations' ? 'active' : ''}`}
                onClick={() => onSelectStation('all-stations')}
                title="View All Stations"
              >
                🇮🇳 All
              </button>
            </div>
          )}
        </div>

        {/* 5 TOP METRIC KPI CARDS HORIZONTAL STRIP */}
        <div className="research-kpi-ribbon-5col">
          {/* Card 1 */}
          <div className="kpi-box-item">
            <div className="kpi-icon-square">
              <Compass size={18} className="text-cyan" />
            </div>
            <div className="kpi-text-wrap">
              <span className="kpi-label">{isBharati ? 'Active Research Projects' : 'Total Research Projects'}</span>
              <div className="kpi-value-row">
                <span className="kpi-number">{isBharati ? '8' : '12'}</span>
              </div>
              <span className="kpi-sub-detail">
                {isBharati 
                  ? <><strong>5</strong> Ongoing &nbsp;|&nbsp; <strong>2</strong> Planned &nbsp;|&nbsp; <strong>1</strong> Completed</>
                  : <><strong>6</strong> Active &nbsp;|&nbsp; <strong>4</strong> Completed &nbsp;|&nbsp; <strong>2</strong> Planned</>
                }
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="kpi-box-item">
            <div className="kpi-icon-square">
              <Database size={18} className="text-cyan" />
            </div>
            <div className="kpi-text-wrap">
              <span className="kpi-label">Data Collected (This Month)</span>
              <div className="kpi-value-row">
                <span className="kpi-number">{isBharati ? '6.2' : '4.8'} <span className="kpi-unit">TB</span></span>
              </div>
              <span className="kpi-sub-detail text-emerald">↑ {isBharati ? '18%' : '12%'} vs last month</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="kpi-box-item">
            <div className="kpi-icon-square">
              <MapPin size={18} className="text-cyan" />
            </div>
            <div className="kpi-text-wrap">
              <span className="kpi-label">{isBharati ? 'Field Campaigns' : 'Active Field Campaigns'}</span>
              <div className="kpi-value-row">
                <span className="kpi-number">{isBharati ? '2' : '3'}</span>
              </div>
              <span className="kpi-sub-detail">
                {isBharati ? 'Glaciology | Atmosphere' : 'Glaciology | Atmosphere | Marine'}
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="kpi-box-item">
            <div className="kpi-icon-square">
              <Users size={18} className="text-cyan" />
            </div>
            <div className="kpi-text-wrap">
              <span className="kpi-label">Research Personnel</span>
              <div className="kpi-value-row">
                <span className="kpi-number">{isBharati ? '16' : '18'}</span>
              </div>
              <span className="kpi-sub-detail">Scientists &nbsp;|&nbsp; Researchers &nbsp;|&nbsp; Support Staff</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="kpi-box-item">
            <div className="kpi-icon-square">
              <FileText size={18} className="text-cyan" />
            </div>
            <div className="kpi-text-wrap">
              <span className="kpi-label">Key Publications</span>
              <div className="kpi-value-row">
                <span className="kpi-number">{isBharati ? '5' : '7'}</span>
              </div>
              <span className="kpi-sub-detail">Submitted &nbsp;|&nbsp; <strong>{isBharati ? '2' : '3'}</strong> Under Review</span>
            </div>
          </div>
        </div>

        {/* ====================================================================
            MIDDLE SECTION
            For Bharati: 3 Columns (Data Flow | Research Projects | Live Feed)
            For Maitri: 2 Columns (Data Flow | Research Projects)
            ==================================================================== */}
        <div className={isBharati ? "bharati-middle-3col-grid" : "research-middle-grid"}>
          
          {/* MIDDLE COLUMN 1: Research Activity & Data Flow Line Chart */}
          <div className="research-chart-card">
            <div className="chart-card-top-header">
              <h3 className="chart-card-title">Research Activity &amp; Data Flow</h3>
              <div className="chart-controls-cluster">
                <div className="chart-legend-row">
                  <span className="chart-legend-item"><span className="legend-bullet bullet-sensor" /> {isBharati ? 'Satellite Data' : 'Sensor Data'}</span>
                  <span className="chart-legend-item"><span className="legend-bullet bullet-field" /> Field Data</span>
                  <span className="chart-legend-item"><span className="legend-bullet bullet-lab" /> Lab Data</span>
                </div>
                <div className="chart-dropdown-pill" onClick={(e) => e.stopPropagation()}>
                  <span>{dataFlowRange}</span>
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>

            {/* SVG Spline Chart */}
            <div className="chart-svg-container">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="data-flow-svg">
                {[0, 1, 2, 3, 4, 5].map((val) => {
                  const y = padTop + (1 - val / maxY) * plotH;
                  return (
                    <g key={val} className="grid-line-group">
                      <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="rgba(30, 58, 95, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
                      <text x={padLeft - 8} y={y + 3.5} fill="#64748b" fontSize="8.5" textAnchor="end" fontFamily="monospace">
                        {val} GB
                      </text>
                    </g>
                  );
                })}

                {chartPoints.map((pt, i) => {
                  const x = padLeft + (i / (chartPoints.length - 1)) * plotW;
                  return (
                    <text key={pt.day} x={x} y={svgHeight - 4} fill="#64748b" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                      {pt.day}
                    </text>
                  );
                })}

                <path d={sensorPath} fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px rgba(56, 189, 248, 0.5))' }} />
                <path d={fieldPath} fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px rgba(52, 211, 153, 0.5))' }} />
                <path d={labPath} fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.5))' }} />

                <circle cx={sensorCoords[6].x} cy={sensorCoords[6].y} r="3.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx={fieldCoords[6].x} cy={fieldCoords[6].y} r="3.5" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx={labCoords[6].x} cy={labCoords[6].y} r="3.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          {/* MIDDLE COLUMN 2: Research Projects List Card */}
          <div className="research-projects-card">
            <div className="r-projects-header">
              <h3 className="card-heading-title">Research Projects</h3>
              <span className="view-all-action-btn" onClick={() => setSubTab('projects')}>View All →</span>
            </div>

            <div className="r-projects-list">
              {currentProjects.map((p) => {
                const IconComp = p.icon;
                return (
                  <div key={p.id} className="r-project-row">
                    <div className="r-proj-left">
                      <div className="r-proj-icon-circle">
                        <IconComp size={13} className="text-cyan" />
                      </div>
                      <div className="r-proj-info">
                        <span className="r-proj-title">{p.name}</span>
                        <span className="r-proj-sub">{p.sub}</span>
                      </div>
                    </div>
                    <span className={`r-proj-status-badge ${p.badgeClass || (p.status === 'Active' || p.status === 'Ongoing' ? 'badge-ongoing' : 'badge-planned-blue')}`}>
                      ● {p.status} <span className="badge-days">{p.daysLeft}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MIDDLE COLUMN 3 (FOR BHARATI): Live Research Feed */}
          {isBharati && (
            <div className="live-feed-middle-card">
              <div className="feed-card-header">
                <h3 className="card-heading-title">Live Research Feed</h3>
                <span className="view-all-action-btn" onClick={() => setSubTab('overview')}>View All →</span>
              </div>

              <div className="feed-items-list">
                {bharatiLiveFeed.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <div key={item.id} className="feed-row-item">
                      <div className="feed-icon-circle">
                        <IconComp size={11} className="text-cyan" />
                      </div>
                      <div className="feed-text-col">
                        <span className="feed-item-title">{item.title}</span>
                        <span className="feed-item-desc">{item.desc}</span>
                      </div>
                      <span className="feed-item-time">{item.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ====================================================================
            BOTTOM SECTION
            For Bharati: 4 Columns (Environmental Conditions | Resource & Equipment | Research Insights | AI Research Assistant)
            For Maitri: 3 Columns (Satellite Map | Equipment & Lab | Feed & AI)
            ==================================================================== */}
        {isBharati ? (
          <div className="bharati-bottom-4col-grid">
            
            {/* 1. Environmental Conditions Card */}
            <div className="bharati-env-conditions-card">
              <div className="b-card-header">
                <h3 className="card-heading-title">Environmental Conditions</h3>
                <span className="view-all-action-btn" onClick={(e) => { e.stopPropagation(); setSidebarTab('environment'); }}>View Details →</span>
              </div>

              {/* 4 Mini Metrics Grid */}
              <div className="bharati-env-metrics-grid">
                <div className="b-env-metric-tile">
                  <span className="b-env-lbl">Temperature</span>
                  <div className="b-env-val-row">
                    <Thermometer size={12} className="text-cyan" />
                    <span className="b-env-val">-18.7°C</span>
                  </div>
                  <span className="b-env-sub text-cyan">↑ 0.8°C 24h</span>
                </div>

                <div className="b-env-metric-tile">
                  <span className="b-env-lbl">Wind Speed</span>
                  <div className="b-env-val-row">
                    <Wind size={12} className="text-cyan" />
                    <span className="b-env-val">28 km/h</span>
                  </div>
                  <span className="b-env-sub text-cyan">↑ 5 km/h 24h</span>
                </div>

                <div className="b-env-metric-tile">
                  <span className="b-env-lbl">Humidity</span>
                  <div className="b-env-val-row">
                    <Droplets size={12} className="text-cyan" />
                    <span className="b-env-val">68%</span>
                  </div>
                  <span className="b-env-sub text-cyan">↑ 4% 24h</span>
                </div>

                <div className="b-env-metric-tile">
                  <span className="b-env-lbl">Pressure</span>
                  <div className="b-env-val-row">
                    <Gauge size={12} className="text-cyan" />
                    <span className="b-env-val">987 hPa</span>
                  </div>
                  <span className="b-env-sub text-amber">↓ 2 hPa 24h</span>
                </div>
              </div>

              {/* Mini Multi-Line SVG Chart */}
              <div className="b-env-chart-wrap">
                <svg viewBox="0 0 280 85" className="b-env-mini-svg">
                  {[-10, -20, -30].map((val, idx) => {
                    const y = 10 + idx * 28;
                    return (
                      <g key={val}>
                        <line x1="30" y1={y} x2="275" y2={y} stroke="rgba(30, 58, 95, 0.35)" strokeWidth="1" strokeDasharray="2 2" />
                        <text x="24" y={y + 3} fill="#64748b" fontSize="7.5" textAnchor="end" fontFamily="monospace">{val}</text>
                      </g>
                    );
                  })}
                  {['08 Sep', '09 Sep', '10 Sep', '11 Sep', '12 Sep'].map((d, i) => {
                    const x = 36 + i * 58;
                    return (
                      <text key={d} x={x} y="78" fill="#64748b" fontSize="7" textAnchor="middle" fontFamily="monospace">{d}</text>
                    );
                  })}
                  {/* Temp Line (cyan) */}
                  <path d="M 36,46 C 65,42 94,48 123,45 C 152,42 181,38 210,40 C 239,42 255,44 268,43" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
                  {/* Wind Line (teal) */}
                  <path d="M 36,54 C 65,52 94,49 123,51 C 152,48 181,46 210,48 C 239,45 255,43 268,42" fill="none" stroke="#34d399" strokeWidth="1.8" />
                  {/* Pressure Line (purple/blue) */}
                  <path d="M 36,60 C 65,58 94,62 123,59 C 152,56 181,61 210,58 C 239,57 255,59 268,60" fill="none" stroke="#818cf8" strokeWidth="1.8" />
                </svg>
                <div className="b-env-legend-row">
                  <span className="b-leg-item"><span className="leg-dot bg-cyan" /> Temperature</span>
                  <span className="b-leg-item"><span className="leg-dot bg-emerald" /> Wind Speed</span>
                  <span className="b-leg-item"><span className="leg-dot bg-indigo" /> Pressure</span>
                </div>
              </div>
            </div>

            {/* 2. Resource & Equipment Status Card */}
            <div className="bharati-resource-equip-card">
              <div className="b-card-header">
                <h3 className="card-heading-title">Resource &amp; Equipment Status</h3>
                <span className="view-all-action-btn" onClick={(e) => { e.stopPropagation(); setSidebarTab('infrastructure'); }}>View All →</span>
              </div>

              {/* 4 Circular Progress Gauges */}
              <div className="bharati-circular-gauges-row">
                {/* Fuel */}
                <div className="b-circle-gauge-item">
                  <div className="b-ring-box">
                    <svg viewBox="0 0 50 50" className="b-ring-svg">
                      <circle cx="25" cy="25" r="18" fill="none" stroke="rgba(30,58,95,0.5)" strokeWidth="4" />
                      <circle cx="25" cy="25" r="18" fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 * (1 - 0.68)} strokeLinecap="round" transform="rotate(-90 25 25)" />
                    </svg>
                    <span className="b-ring-pct">68%</span>
                  </div>
                  <span className="b-ring-lbl">Fuel</span>
                  <span className="b-ring-sub">8,160 / 12,000 L</span>
                </div>

                {/* Power */}
                <div className="b-circle-gauge-item">
                  <div className="b-ring-box">
                    <svg viewBox="0 0 50 50" className="b-ring-svg">
                      <circle cx="25" cy="25" r="18" fill="none" stroke="rgba(30,58,95,0.5)" strokeWidth="4" />
                      <circle cx="25" cy="25" r="18" fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 * (1 - 0.76)} strokeLinecap="round" transform="rotate(-90 25 25)" />
                    </svg>
                    <span className="b-ring-pct">76%</span>
                  </div>
                  <span className="b-ring-lbl">Power</span>
                  <span className="b-ring-sub">96 / 125 kW</span>
                </div>

                {/* Water */}
                <div className="b-circle-gauge-item">
                  <div className="b-ring-box">
                    <svg viewBox="0 0 50 50" className="b-ring-svg">
                      <circle cx="25" cy="25" r="18" fill="none" stroke="rgba(30,58,95,0.5)" strokeWidth="4" />
                      <circle cx="25" cy="25" r="18" fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 * (1 - 0.82)} strokeLinecap="round" transform="rotate(-90 25 25)" />
                    </svg>
                    <span className="b-ring-pct">82%</span>
                  </div>
                  <span className="b-ring-lbl">Water</span>
                  <span className="b-ring-sub">32,800 / 40,000 L</span>
                </div>

                {/* Supplies */}
                <div className="b-circle-gauge-item">
                  <div className="b-ring-box">
                    <svg viewBox="0 0 50 50" className="b-ring-svg">
                      <circle cx="25" cy="25" r="18" fill="none" stroke="rgba(30,58,95,0.5)" strokeWidth="4" />
                      <circle cx="25" cy="25" r="18" fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 * (1 - 0.71)} strokeLinecap="round" transform="rotate(-90 25 25)" />
                    </svg>
                    <span className="b-ring-pct">71%</span>
                  </div>
                  <span className="b-ring-lbl">Supplies</span>
                  <span className="b-ring-sub">2.1 / 3.0 T</span>
                </div>
              </div>

              {/* Key Equipment Table */}
              <div className="bharati-key-equip-section">
                <div className="b-subhead-row">
                  <span className="b-subhead-txt">Key Equipment</span>
                  <div className="b-equip-cols-head">
                    <span>Status</span>
                    <span>Last Updated</span>
                  </div>
                </div>

                <div className="b-equip-list">
                  {bharatiKeyEquipment.map(eq => (
                    <div key={eq.id} className="b-equip-row">
                      <span className="b-eq-name">{eq.name}</span>
                      <div className="b-eq-right">
                        <span className="b-eq-status" style={{ color: eq.statusColor }}>
                          ● {eq.status}
                        </span>
                        <span className="b-eq-time">{eq.lastUpdated}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Research Insights Card */}
            <div className="bharati-insights-card">
              <div className="b-card-header">
                <h3 className="card-heading-title">Research Insights</h3>
                <span className="view-all-action-btn" onClick={(e) => { e.stopPropagation(); setSubTab('data'); }}>View All →</span>
              </div>

              <div className="bharati-insights-list">
                {/* Insight 1 */}
                <div className="b-insight-box">
                  <div className="b-ins-left-icon">
                    <TrendingUp size={14} className="text-rose-400" />
                  </div>
                  <div className="b-ins-text-block">
                    <div className="b-ins-title-row">
                      <span className="b-ins-title">Glacier Retreat Rate</span>
                      <span className="b-ins-metric text-rose-400">+12%</span>
                    </div>
                    <span className="b-ins-desc">Increased melting rate observed in Larsemann region.</span>
                  </div>
                </div>

                {/* Insight 2 */}
                <div className="b-insight-box">
                  <div className="b-ins-left-icon">
                    <CloudSnow size={14} className="text-emerald-400" />
                  </div>
                  <div className="b-ins-text-block">
                    <div className="b-ins-title-row">
                      <span className="b-ins-title">Atmospheric CO2 Levels</span>
                      <span className="b-ins-metric text-emerald-400">Stable</span>
                    </div>
                    <span className="b-ins-desc">No significant change in last 30 days.</span>
                  </div>
                </div>

                {/* Insight 3 */}
                <div className="b-insight-box">
                  <div className="b-ins-left-icon">
                    <Activity size={14} className="text-cyan" />
                  </div>
                  <div className="b-ins-text-block">
                    <div className="b-ins-title-row">
                      <span className="b-ins-title">Seismic Activity</span>
                      <span className="b-ins-metric text-cyan">Low</span>
                    </div>
                    <span className="b-ins-desc">Minor tremors detected (M 2.1).</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Buttons */}
              <div className="bharati-quick-actions-bar" onClick={(e) => e.stopPropagation()}>
                <span className="quick-actions-label">Quick Actions</span>
                <div className="quick-actions-btns-row">
                  <button type="button" className="b-quick-btn" onClick={() => handleSendAiMessage('Upload research telemetry')}>
                    <UploadCloud size={11} /> Upload Data
                  </button>
                  <button type="button" className="b-quick-btn" onClick={() => handleSendAiMessage('View recent field reports')}>
                    <FileCheck size={11} /> View Field Reports
                  </button>
                  <button type="button" className="b-quick-btn" onClick={() => handleSendAiMessage('Open laboratory spectrometer portal')}>
                    <FlaskConical size={11} /> Open Lab Portal
                  </button>
                </div>
              </div>
            </div>

            {/* 4. AI Research Assistant (Beta) Card */}
            <div className="bharati-ai-assistant-card">
              <div className="b-card-header">
                <div className="ai-header-left">
                  <Bot size={13} className="text-cyan" />
                  <span className="ai-title-txt">AI Research Assistant</span>
                  <span className="ai-beta-tag">Beta</span>
                </div>
                <X size={12} className="text-dim cursor-pointer hover:text-cyan" title="Collapse" />
              </div>

              <div className="ai-bubble-content-area">
                <div className="b-ai-bot-circle">
                  <Bot size={14} className="text-cyan" />
                </div>
                <div className="b-ai-message-text">
                  <div>
                    {aiMessages[aiMessages.length - 1]?.text || 
                      `Based on the latest satellite data and field observations, the ice shelf near Bharati Station shows a 12% increase in surface melting rate compared to last month. This may impact the planned drilling schedule for Project IceCore-3. I recommend increasing monitoring frequency in this region.`
                    }
                  </div>
                  {aiMessages[aiMessages.length - 1]?.hasReportAction && (
                    <button 
                      type="button"
                      className="ai-view-report-inline-btn"
                      style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '6px', color: '#38bdf8', fontSize: '11px', cursor: 'pointer' }}
                      onClick={() => setIsReportModalOpen(true)}
                    >
                      <FileText size={11} /> View Full 24-Hour Operational Report
                    </button>
                  )}
                  {aiMessages[aiMessages.length - 1]?.hasAnalysisAction && (
                    <button 
                      type="button"
                      className="ai-view-report-inline-btn"
                      style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '6px', color: '#38bdf8', fontSize: '11px', cursor: 'pointer' }}
                      onClick={() => setIsAnalysisModalOpen(true)}
                    >
                      <Layers size={11} /> Open Detailed Satellite Analysis
                    </button>
                  )}
                  {aiMessages[aiMessages.length - 1]?.hasCompareAction && (
                    <button 
                      type="button"
                      className="ai-view-report-inline-btn"
                      style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '6px', color: '#c084fc', fontSize: '11px', cursor: 'pointer' }}
                      onClick={() => setIsComparisonModalOpen(true)}
                    >
                      <GitCompare size={11} /> Open 5-Year Historical Comparison
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Action Suggestion Buttons */}
              <div className="b-ai-actions-row">
                <button type="button" className="b-ai-pill-btn" onClick={handleViewAnalysis}>
                  View Analysis
                </button>
                <button type="button" className="b-ai-pill-btn" onClick={handleCompareWithPast}>
                  Compare with Past
                </button>
                <button 
                  type="button" 
                  className={`b-ai-pill-btn summary-report-pill ${isGeneratingReport ? 'generating' : ''} ${reportGenerated && (summaryReportData?.station_id === 'station-bharati' || summaryReportData?.station_id === 'all-stations') ? 'generated' : ''}`}
                  onClick={() => {
                    if (summaryReportData && (summaryReportData.station_id === 'station-bharati' || summaryReportData.station_id === 'all-stations')) {
                      setIsReportModalOpen(true);
                    } else {
                      handleGenerateSummaryReport('station-bharati');
                    }
                  }}
                  disabled={isGeneratingReport}
                  title="Generate AI-powered comprehensive 24-hour operational and research report for Bharati Station"
                >
                  {isGeneratingReport ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={11} className="animate-spin" />
                      GENERATING 24-HOUR REPORT...
                    </span>
                  ) : reportGenerated && (summaryReportData?.station_id === 'station-bharati' || summaryReportData?.station_id === 'all-stations') ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                      <Check size={11} />
                      REPORT GENERATED
                    </span>
                  ) : (
                    'Summary Report'
                  )}
                </button>
              </div>

              {/* Input Form */}
              <form 
                className="b-ai-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAiMessage();
                }}
              >
                <input
                  type="text"
                  className="b-ai-input-field"
                  placeholder="Ask anything about research data, trends, or insights..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                />
                <button type="submit" className="b-ai-send-btn" title="Send question to AI analyst">
                  <Send size={12} />
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* MAITRI BOTTOM 3-COLUMN GRID */
          <div className="research-bottom-3col-grid">
            
            {/* COLUMN 1: Research Data & Visualizations (Satellite Thermal Map) */}
            <div className="vis-map-card">
              <div className="vis-card-top-bar">
                <div className="vis-top-title-row">
                  <h3 className="card-heading-title">Research Data &amp; Visualizations</h3>
                </div>
                <div className="vis-filter-tabs-row">
                  <button type="button" className={`vis-tab-pill ${visCategory === 'satellite' ? 'active' : ''}`} onClick={() => setVisCategory('satellite')}>Satellite Imagery</button>
                  <button type="button" className={`vis-tab-pill ${visCategory === 'climate' ? 'active' : ''}`} onClick={() => setVisCategory('climate')}>Climate Data</button>
                  <button type="button" className={`vis-tab-pill ${visCategory === 'ocean' ? 'active' : ''}`} onClick={() => setVisCategory('ocean')}>Ocean Data</button>
                  <button type="button" className={`vis-tab-pill ${visCategory === 'atmospheric' ? 'active' : ''}`} onClick={() => setVisCategory('atmospheric')}>Atmospheric Data</button>
                  <button type="button" className={`vis-tab-pill ${visCategory === 'glacier' ? 'active' : ''}`} onClick={() => setVisCategory('glacier')}>Glacier Monitoring</button>
                </div>
              </div>

              {/* Map Canvas with Controls Overlay */}
              <div className={`vis-canvas-container ${is3DView ? 'mode-3d-active' : ''}`}>
                
                {/* Top-Left Date Dropdown */}
                <div className="sat-date-pill" onClick={() => setDateDropdownOpen(!dateDropdownOpen)}>
                  <Calendar size={13} className="text-cyan" />
                  <span className="sat-date-text">{selectedDate}</span>
                  <ChevronDown size={13} className={`sat-date-chevron ${dateDropdownOpen ? 'rotate-180' : ''}`} />
                  {dateDropdownOpen && (
                    <div className="sat-date-menu">
                      {['10 Sep 2025', '09 Sep 2025', '08 Sep 2025', '05 Sep 2025', '01 Sep 2025', 'Historical Mean'].map((d) => (
                        <div
                          key={d}
                          className={`sat-date-item ${d === selectedDate ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(d);
                            setDateDropdownOpen(false);
                          }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Left Layers Checklist Panel */}
                <div className="sat-layers-panel">
                  <div className="sat-layer-row" onClick={() => handleToggleLayer('surfaceTemp')}>
                    <div className={`sat-custom-checkbox ${layers.surfaceTemp ? 'checked' : ''}`}>
                      {layers.surfaceTemp && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="sat-layer-label">Surface Temperature</span>
                  </div>

                  <div className="sat-layer-row" onClick={() => handleToggleLayer('snowDepth')}>
                    <div className={`sat-custom-checkbox ${layers.snowDepth ? 'checked' : ''}`}>
                      {layers.snowDepth && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="sat-layer-label">Snow Depth</span>
                  </div>

                  <div className="sat-layer-row" onClick={() => handleToggleLayer('iceVelocity')}>
                    <div className={`sat-custom-checkbox ${layers.iceVelocity ? 'checked' : ''}`}>
                      {layers.iceVelocity && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="sat-layer-label">Ice Velocity</span>
                  </div>

                  <div className="sat-layer-row" onClick={() => handleToggleLayer('elevation')}>
                    <div className={`sat-custom-checkbox ${layers.elevation ? 'checked' : ''}`}>
                      {layers.elevation && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="sat-layer-label">Elevation</span>
                  </div>
                </div>

                {/* Satellite Terrain Viewport + Organic Multi-Spectral SVG Overlay */}
                <div className="vis-map-viewport">
                  <img
                    src="/antarctic_satellite_hd.jpg"
                    alt="Antarctic Cryosphere Satellite Imagery"
                    className="vis-terrain-bg-img"
                  />

                  {/* Multi-Spectral Contour Radar & Thermal SVG */}
                  <svg className="sat-contour-svg-overlay" viewBox="0 0 600 360" preserveAspectRatio="none">
                    <defs>
                      <radialGradient id="satSpectralRadial" cx="50%" cy="46%" r="48%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                        <stop offset="16%" stopColor="#f97316" stopOpacity="0.90" />
                        <stop offset="32%" stopColor="#eab308" stopOpacity="0.84" />
                        <stop offset="52%" stopColor="#22c55e" stopOpacity="0.76" />
                        <stop offset="72%" stopColor="#06b6d4" stopOpacity="0.70" />
                        <stop offset="88%" stopColor="#2563eb" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
                      </radialGradient>

                      <radialGradient id="satNorthThermalFlare" cx="50%" cy="22%" r="30%">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity="0.98" />
                        <stop offset="45%" stopColor="#ea580c" stopOpacity="0.88" />
                        <stop offset="80%" stopColor="#eab308" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                      </radialGradient>

                      <filter id="satGlowSoft" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Multi-layer Organic Contour Heatmap */}
                    <g filter="url(#satGlowSoft)" className="sat-contours-group" opacity={layers.surfaceTemp || layers.snowDepth || layers.iceVelocity || layers.elevation ? 0.95 : 0.2}>
                      {/* Main organic spectral body */}
                      <path
                        d="M 240,48 C 295,35 365,58 395,108 C 425,158 440,225 410,285 C 380,340 310,348 255,325 C 200,300 170,250 178,190 C 185,130 200,60 240,48 Z"
                        fill="url(#satSpectralRadial)"
                      />

                      {/* North High-Heat Anomaly Peak */}
                      <path
                        d="M 285,55 C 320,40 350,55 360,80 C 370,105 352,125 325,130 C 295,135 272,118 268,96 C 265,78 272,62 285,55 Z"
                        fill="url(#satNorthThermalFlare)"
                      />

                      {/* Topographic Contour Vector Outlines */}
                      <path d="M 225,95 C 275,75 350,85 375,130 C 400,175 395,245 355,280 C 315,315 250,298 215,255 C 180,212 190,135 225,95 Z" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeDasharray="3 3" />
                      <path d="M 245,130 C 285,115 338,122 355,155 C 372,188 368,230 338,255 C 308,280 265,270 240,240 C 215,210 220,155 245,130 Z" fill="none" stroke="rgba(56,189,248,0.55)" strokeWidth="1.4" />
                      <path d="M 268,160 C 298,148 330,155 342,180 C 354,205 348,232 325,245 C 302,258 278,248 265,225 C 252,202 256,178 268,160 Z" fill="none" stroke="rgba(250,204,21,0.65)" strokeWidth="1.4" />
                    </g>

                    {/* Streamlines when Ice Velocity is checked */}
                    {layers.iceVelocity && (
                      <g className="sat-velocity-vectors" opacity="0.85">
                        <path d="M 230,140 Q 250,165 280,180" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />
                        <path d="M 260,120 Q 290,150 320,170" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />
                        <path d="M 290,105 Q 320,135 350,155" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />
                      </g>
                    )}
                  </svg>

                  {/* Station Callout Badge (Maitri / Bharati) */}
                  <div className="sat-station-callout-marker">
                    <div className="sat-station-badge-content">
                      <div className="sat-station-radar-icon">
                        <Radio size={12} className="text-cyan" />
                        <span className="sat-ping-radar-glow" />
                      </div>
                      <span className="sat-station-title-txt">{stationDisplayName} Station</span>
                    </div>
                    <div className="sat-station-target-pin" />
                  </div>

                  {/* Right-Side Vertical Thermal Colorbar Legend */}
                  <div className="sat-legend-capsule">
                    <div className="sat-legend-bar-track">
                      <div
                        className="sat-legend-bar-gradient"
                        style={{
                          background: layers.surfaceTemp
                            ? 'linear-gradient(to bottom, #ef4444 0%, #f97316 20%, #eab308 45%, #22c55e 65%, #06b6d4 85%, #1d4ed8 100%)'
                            : layers.snowDepth
                            ? 'linear-gradient(to bottom, #38bdf8 0%, #0284c7 35%, #10b981 70%, #047857 100%)'
                            : 'linear-gradient(to bottom, #f43f5e 0%, #fb923c 35%, #facc15 70%, #38bdf8 100%)'
                        }}
                      />
                    </div>
                    <div className="sat-legend-ticks">
                      {layers.surfaceTemp ? (
                        <>
                          <span className="sat-tick-item"><span className="tick-dash" />-10°C</span>
                          <span className="sat-tick-item"><span className="tick-dash" />-20°C</span>
                          <span className="sat-tick-item"><span className="tick-dash" />-30°C</span>
                          <span className="sat-tick-item"><span className="tick-dash" />-40°C</span>
                        </>
                      ) : layers.snowDepth ? (
                        <>
                          <span className="sat-tick-item"><span className="tick-dash" />4.0 m</span>
                          <span className="sat-tick-item"><span className="tick-dash" />3.0 m</span>
                          <span className="sat-tick-item"><span className="tick-dash" />2.0 m</span>
                          <span className="sat-tick-item"><span className="tick-dash" />1.0 m</span>
                        </>
                      ) : (
                        <>
                          <span className="sat-tick-item"><span className="tick-dash" />240 m/a</span>
                          <span className="sat-tick-item"><span className="tick-dash" />180 m/a</span>
                          <span className="sat-tick-item"><span className="tick-dash" />120 m/a</span>
                          <span className="sat-tick-item"><span className="tick-dash" />60 m/a</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom-Left Coordinates Reticle HUD */}
                  <div className="sat-coords-hud-badge" onClick={handleViewAnalysis} title="View GPS Cryosphere Positioning">
                    <div className="sat-crosshair-icon-wrap">
                      <Compass size={14} className="text-cyan" />
                    </div>
                    <div className="sat-coords-text-col">
                      <span className="sat-coords-val">{stationCoords}</span>
                      <div className="sat-coords-underline-glow" />
                    </div>
                    <ChevronRight size={13} className="text-cyan sat-hud-arrow" />
                  </div>

                  {/* Bottom-Right Controls: 3D View & Fullscreen Action Buttons */}
                  <div className="sat-bottom-controls-group">
                    <button
                      type="button"
                      className={`sat-btn-3d ${is3DView ? 'active' : ''}`}
                      onClick={() => setIs3DView(!is3DView)}
                      title="Toggle 3D Elevation & Perspective View"
                    >
                      <Box size={13} className="text-cyan" />
                      <span>3D View</span>
                    </button>

                    <button
                      type="button"
                      className="sat-btn-fullscreen"
                      onClick={handleViewAnalysis}
                      title="Open Fullscreen Detailed Satellite Analysis"
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>

                </div>
              </div>
            </div>

            {/* COLUMN 2: Equipment & Lab Status */}
            <div className="equipment-status-card">
              <div className="equip-card-header">
                <h3 className="card-heading-title">Equipment &amp; Lab Status</h3>
                <span className="view-all-action-btn" onClick={() => setSubTab('lab')}>View All →</span>
              </div>

              <div className="equip-table-header">
                <span>Equipment</span>
                <span>Status</span>
                <span>Last Updated</span>
              </div>

              <div className="equip-items-list">
                {equipmentStatusList.map((eq) => (
                  <div key={eq.id} className="equip-row-item">
                    <div className="equip-name-col">
                      <Cpu size={12} className="text-cyan" />
                      <span className="equip-name-txt">{eq.name}</span>
                    </div>
                    <div className="equip-status-col">
                      <span className={`equip-badge ${eq.badgeClass}`}>
                        {eq.status}
                      </span>
                    </div>
                    <div className="equip-time-col">
                      <span>{eq.lastUpdated}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 3: Live Research Feed + AI Research Assistant */}
            <div className="live-feed-ai-card">
              
              {/* Top: Live Research Feed */}
              <div className="feed-sub-card">
                <div className="feed-card-header">
                  <h3 className="card-heading-title">Live Research Feed</h3>
                  <span className="view-all-action-btn" onClick={() => setSubTab('overview')}>View All →</span>
                </div>

                <div className="feed-items-list">
                  {maitriLiveFeed.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <div key={item.id} className="feed-row-item">
                        <div className="feed-icon-circle">
                          <IconComp size={11} className="text-cyan" />
                        </div>
                        <div className="feed-text-col">
                          <span className="feed-item-title">{item.title}</span>
                          <span className="feed-item-desc">{item.desc}</span>
                        </div>
                        <span className="feed-item-time">{item.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom: AI Research Assistant (Beta) */}
              <div className="ai-assistant-box">
                <div className="ai-header-row">
                  <div className="ai-header-left">
                    <Bot size={13} className="text-cyan" />
                    <span className="ai-title-txt">AI Research Assistant</span>
                    <span className="ai-beta-tag">Beta</span>
                  </div>
                </div>

                <div className="ai-messages-scroll-area">
                  {aiMessages.map((msg) => (
                    <div key={msg.id} className={`ai-msg-bubble ${msg.sender === 'user' ? 'user-msg' : 'ai-msg'}`}>
                      {msg.sender === 'ai' && (
                        <div className="ai-bot-avatar">
                          <Bot size={11} className="text-cyan" />
                        </div>
                      )}
                      <div>
                        <p className="ai-msg-text">{msg.text}</p>
                        {msg.hasReportAction && (
                          <button 
                            type="button"
                            className="ai-view-report-inline-btn"
                            onClick={() => setIsReportModalOpen(true)}
                          >
                            <FileText size={11} /> View Full 24-Hour Operational Report
                          </button>
                        )}
                        {msg.hasAnalysisAction && (
                          <button 
                            type="button"
                            className="ai-view-report-inline-btn"
                            style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                            onClick={() => setIsAnalysisModalOpen(true)}
                          >
                            <Layers size={11} /> Open Detailed Satellite Analysis
                          </button>
                        )}
                        {msg.hasCompareAction && (
                          <button 
                            type="button"
                            className="ai-view-report-inline-btn"
                            style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#c084fc' }}
                            onClick={() => setIsComparisonModalOpen(true)}
                          >
                            <GitCompare size={11} /> Open 5-Year Historical Comparison
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isAiTyping && (
                    <div className="ai-msg-bubble ai-msg">
                      <span className="ai-typing-dots">Analyzing cryosphere telemetry...</span>
                    </div>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="ai-quick-actions-row">
                  <button type="button" className="ai-action-btn" onClick={handleViewAnalysis}>
                    View Analysis
                  </button>
                  <button type="button" className="ai-action-btn" onClick={handleCompareWithPast}>
                    Compare with Past
                  </button>
                  <button 
                    type="button" 
                    className={`ai-action-btn summary-report-btn ${isGeneratingReport ? 'generating' : ''} ${reportGenerated && (summaryReportData?.station_id === 'station-maitri' || summaryReportData?.station_id === 'all-stations') ? 'generated' : ''}`}
                    onClick={() => {
                      if (summaryReportData && (summaryReportData.station_id === 'station-maitri' || summaryReportData.station_id === 'all-stations')) {
                        setIsReportModalOpen(true);
                      } else {
                        handleGenerateSummaryReport('station-maitri');
                      }
                    }}
                    disabled={isGeneratingReport}
                    title="Generate AI-powered comprehensive 24-hour operational and research report"
                  >
                    {isGeneratingReport ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={11} className="animate-spin" />
                        GENERATING 24-HOUR REPORT...
                      </span>
                    ) : reportGenerated && (summaryReportData?.station_id === 'station-maitri' || summaryReportData?.station_id === 'all-stations') ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                        <Check size={11} />
                        REPORT GENERATED
                      </span>
                    ) : (
                      'Summary Report'
                    )}
                  </button>
                </div>

                {/* Chat Input Box */}
                <form 
                  className="ai-chat-input-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiMessage();
                  }}
                >
                  <input
                    type="text"
                    className="ai-chat-text-input"
                    placeholder="Ask anything about research data, trends, or insights..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                  />
                  <button type="submit" className="ai-chat-send-btn" title="Send message">
                    <Send size={12} />
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}

        {/* ====================================================================
            BOTTOM FOOTER (MATCHING SCREENSHOT)
            ==================================================================== */}
        <footer className="polaris-station-research-footer">
          <div className="p-footer-left">
            <span>POLARIS</span>
            <span className="p-footer-sep">|</span>
            <span>Ministry of Earth Sciences</span>
            <span className="p-footer-sep">|</span>
            <span>Government of India</span>
          </div>

          <div className="p-footer-center-projects">
            <div className="p-footer-proj-tag">
              <Compass size={12} className="text-cyan" />
              <span>Glaciology &amp; Climate Change</span>
            </div>
            <div className="p-footer-proj-tag">
              <CloudSnow size={12} className="text-cyan" />
              <span>Atmospheric Studies</span>
            </div>
            <div className="p-footer-proj-tag">
              <Activity size={12} className="text-cyan" />
              <span>Marine Ecosystem</span>
            </div>
            <div className="p-footer-proj-tag">
              <Zap size={12} className="text-cyan" />
              <span>Seismology &amp; Geophysics</span>
            </div>
            <div className="p-footer-proj-tag">
              <Cpu size={12} className="text-cyan" />
              <span>Space Weather Monitoring</span>
            </div>
          </div>

          <div className="p-footer-right">
            <span>For a Safer, Smarter and More Resilient Antarctic Future</span>
            <div className="footer-tricolor-badge">
              <span className="ft-saffron" />
              <span className="ft-white" />
              <span className="ft-green" />
            </div>
          </div>
        </footer>

      </main>

      {/* 24-Hour Operational & Research Report Modal */}
      <SummaryReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportData={summaryReportData}
        selectedStation={selectedStation === 'all-stations' && isIndiaOperator ? 'all-stations' : effectiveStation}
        isLoading={isGeneratingReport}
        onRegenerate={handleGenerateSummaryReport}
      />

      {/* Detailed Satellite Cryosphere Analysis Modal */}
      <ResearchAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        selectedStation={effectiveStation}
        onSelectStation={onSelectStation}
      />

      {/* 5-Year Historical Cryosphere & Climate Comparison Modal */}
      <HistoricalComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        selectedStation={effectiveStation}
        onSelectStation={onSelectStation}
      />

    </div>
  );
}
