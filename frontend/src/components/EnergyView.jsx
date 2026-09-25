import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Building2, 
  Zap, 
  Package, 
  Mountain, 
  Wrench, 
  Radio, 
  Bell, 
  Bot, 
  CloudSnow, 
  Wind, 
  Compass, 
  Droplets, 
  Gauge, 
  Eye, 
  Clock, 
  Sun, 
  Fuel, 
  BatteryCharging, 
  ChevronRight, 
  AlertTriangle, 
  Flame, 
  Activity, 
  CheckCircle2, 
  Download, 
  BarChart3, 
  Cpu, 
  Check,
  RefreshCw,
  Sparkles,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Thermometer,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  X,
  Play,
  RotateCcw,
  Copy
} from 'lucide-react';
import { STATIONS_DATA } from '../data/stationsData';
import { useStationClock, formatStationTime, formatStationDate, getStationTimezoneLabel } from '../utils/timeUtils';
import { fetchEnergyAIInsights, fetchEnergyPrediction } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';
import AIPredictionIndicator from './AIPredictionIndicator';
import WhatIfSimulator from './WhatIfSimulator';

export default function EnergyView({ 
  selectedStation = 'station-maitri', 
  onOpenAlerts,
  onOpenReport 
}) {
  const [breakdownPeriod, setBreakdownPeriod] = useState('today'); // 'today' | '7days' | '30days'
  const [forecastPeriod, setForecastPeriod] = useState('7days'); // '7days' | '30days'
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('predictive'); // 'predictive' | 'overview' | 'generators' | 'storage' | 'subsystems' | 'whatif' | 'directives'
  const [selectedHorizon, setSelectedHorizon] = useState('24h'); // '1h' | '6h' | '24h'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState('');
  const [mitigationFeedback, setMitigationFeedback] = useState(null);
  const [copiedReport, setCopiedReport] = useState(false);

  const auth = useAuth() || {};
  const { role, assignedStation } = auth;
  const { telemetry } = useTelemetry() || {};

  const stationData = STATIONS_DATA[selectedStation] || STATIONS_DATA['station-maitri'];
  const energy = stationData.energy;
  const weather = stationData.weather;
  const liveClock = useStationClock(stationData.timezone || (selectedStation.includes('bharati') ? 'Antarctica/Mawson' : 'UTC'));
  const energyStatus = stationData.energyStatus || { score: 84, rating: 'Good', subsystems: [] };

  const isBharati = selectedStation === 'station-bharati';

  // Dynamic AI State initialized with data-driven predictive model schema
  const [aiInsightsData, setAiInsightsData] = useState(() => ({
    station_id: isBharati ? 'bharati' : 'maitri',
    station_name: isBharati ? 'BHARATI' : 'MAITRI',
    model: 'RandomForestRegressor',
    data_points_used: 168,
    prediction: {
      battery_1h: isBharati ? 88.4 : 78.5,
      battery_6h: isBharati ? 88.5 : 78.3,
      battery_24h: isBharati ? 88.3 : 78.3,
      power_1h: isBharati ? 151.6 : 109.0,
      power_6h: isBharati ? 147.1 : 105.4,
      power_24h: isBharati ? 152.7 : 109.2,
      generator_temp_1h: isBharati ? 77.0 : 82.8,
      generator_temp_6h: isBharati ? 76.7 : 82.5,
      generator_temp_24h: isBharati ? 77.2 : 83.4
    },
    generator_risk: 'NORMAL',
    energy_risk: 'NORMAL',
    confidence: 0.82,
    demand_trend: 'Stable baseline load (±1.5 kW)',
    battery_trend: 'Float charge equilibrium',
    recommendation: isBharati
      ? 'NOMINAL: Bharati microgrid operates within Gaussian equilibrium tolerances. Sustained 24h reserve (88.3%) covers forecast draw.'
      : 'NOMINAL: Maitri microgrid operates within Gaussian equilibrium tolerances. Sustained 24h reserve (78.3%) and generation headroom covers forecast demand.',
    summary: isBharati
      ? 'Bharati microgrid generation (+185.0 kW) operates at optimal thermal equilibrium, sustaining an average load of 148.0 kW with +37.0 kW net surplus.'
      : 'Maitri microgrid generation (+132.0 kW) comfortably covers total scientific and base habitation draw (+105.0 kW) with +27.0 kW net surplus.',
    recommendations: isBharati
      ? [
          'Maintain baseline seawater desalination trace heating at nominal 24 kW load.',
          'Schedule bifacial solar panel snow-clearing sweep if coastal mist reduces irradiance by >15%.',
          'Verify CHP heat-recovery glycol thermal loop balancing with living habitat HVAC.'
        ]
      : [
          'Authorize microgrid load balancing protocols on Generator G-02 during high katabatic wind intervals.',
          'Verify Priyadarshini Lake intake anti-freeze trace heating circuit continuity (8 kW).',
          'Rotate baseload dispatch to Generator G-01 to allow G-02 stator thermal dissipation.'
        ],
    provider: 'RandomForestRegressor Predictive Model'
  }));

  // Run real-time data-driven predictive model on station change or trigger
  const runEnergyAIScan = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // Connect directly to /api/ai/energy-prediction
      const res = await fetchEnergyPrediction(selectedStation, [1, 6, 24], role, assignedStation);
      if (res && res.prediction) {
        setAiInsightsData(prev => ({
          ...prev,
          ...res,
          recommendations: [res.recommendation, ...(prev.recommendations || [])].filter(Boolean)
        }));
        setLastAnalyzedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.debug('[EnergyView] AI Prediction scan notice:', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedStation, role, assignedStation]);

  useEffect(() => {
    runEnergyAIScan();
  }, [runEnergyAIScan]);


  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && insightModalOpen) {
        setInsightModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [insightModalOpen]);

  const handleExecuteMitigation = (actionName) => {
    setMitigationFeedback(`Action dispatched: [${actionName}] applied to the microgrid controller.`);
    setTimeout(() => setMitigationFeedback(null), 4000);
  };

  const handleCopyDiagnosticReport = () => {
    const reportText = `POLARIS MICROGRID AI DIAGNOSTIC REPORT
Station: ${stationData.name} (${stationData.region})
Timestamp: ${liveClock.dateStr} ${liveClock.timeStrWithSeconds} (${stationData.timezone_label || 'UTC'})
AI Provider: ${aiInsightsData.provider || 'POLARIS Microgrid Engine'}
Confidence: ${aiInsightsData.confidence || 'HIGH'}

1. POWER BALANCE:
- Total Generation: ${energy.generation} kW
- Total Consumption: ${energy.consumption} kW
- Net Grid Surplus: +${energy.surplus} kW
- BESS Battery Storage: ${energy.batteryPercent}% (${energy.batteryChargeKWh})
- Fuel Reserves: ${energy.fuelLiters} (${energy.fuelDays} runtime)

2. EXECUTIVE SYNTHESIS:
${aiInsightsData.summary}

3. RECOMMENDED ACTIONS:
${(aiInsightsData.recommendations || []).map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Subsystem icons mapper
  const getSubsystemIcon = (label) => {
    const l = label.toLowerCase();
    if (l.includes('gen') || l.includes('chp')) return Zap;
    if (l.includes('load') || l.includes('cons')) return Activity;
    if (l.includes('batt') || l.includes('bess')) return BatteryCharging;
    if (l.includes('fuel')) return Fuel;
    if (l.includes('solar')) return Sun;
    if (l.includes('wind')) return Wind;
    return Zap;
  };


  return (
    <div className="energy-view-layout">
      {/* ====================================================================
          LEFT SIDEBAR: Station Identity Card + Weather + Local Time
          ==================================================================== */}
      <aside className="energy-left-sidebar">
        {/* Station Identity Card */}
        <div className="energy-station-card polaris-card">
          <div className="energy-station-thumb">
            <img src={stationData.heroImage} alt={stationData.name} className="st-thumb-img" />
            <div className="thumb-scanline" />
          </div>
          <div className="energy-station-meta">
            <h3 className="st-name-title">{stationData.fullName ? stationData.fullName.toUpperCase() : `${stationData.name} STATION`}</h3>
            <div className="st-coords-text mono-num">{stationData.coords}</div>
            <div className="st-oasis-text">{stationData.region}</div>
            <div className="st-status-row">
              <span className="live-dot" />
              <span>{stationData.status}</span>
            </div>
          </div>
        </div>

        {/* Weather Overview Widget */}
        <div className="energy-weather-card polaris-card">
          <div className="e-weather-header">
            <div className="e-weather-cloud">
              <svg viewBox="0 0 40 30" width="34" height="26" fill="none">
                <circle cx="12" cy="10" r="6" fill="#946013" fillOpacity="0.8" />
                <path d="M28 14C27.5 9 22 6 17 8C12 6 6 10 7 15C3 17 2 23 7 25C9 26 30 26 31 25C35 24 36 17 31 15C30 14.5 29 14 28 14Z" fill="#146b80" fillOpacity="0.25" stroke="#146b80" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="e-weather-temp-wrap">
              <span className="e-temp-num mono-num">{weather.temp}{weather.unit}</span>
              <span className="e-temp-cond">{weather.condition}</span>
            </div>
          </div>

          <div className="e-weather-details-list">
            <div className="e-w-row">
              <span className="e-w-lbl"><Wind size={11} /> Wind Speed</span>
              <span className="e-w-val mono-num">{weather.windSpeed}</span>
            </div>
            <div className="e-w-row">
              <span className="e-w-lbl"><Compass size={11} /> Wind Direction</span>
              <span className="e-w-val mono-num">{weather.windDir}</span>
            </div>
            <div className="e-w-row">
              <span className="e-w-lbl"><Droplets size={11} /> Humidity</span>
              <span className="e-w-val mono-num">{weather.humidity}</span>
            </div>
            <div className="e-w-row">
              <span className="e-w-lbl"><Gauge size={11} /> Pressure</span>
              <span className="e-w-val mono-num">{weather.pressure}</span>
            </div>
            <div className="e-w-row">
              <span className="e-w-lbl"><Eye size={11} /> Visibility</span>
              <span className="e-w-val mono-num">{weather.visibility}</span>
            </div>
          </div>
        </div>

        {/* Local Station Time Widget */}
        <div className="energy-time-card polaris-card">
          <div className="e-time-hdr">
            <Clock size={12} className="text-cyan" />
            <span>Local Station Time ({stationData.name})</span>
          </div>
          <div className="e-time-digits mono-num">{liveClock.timeStrWithSeconds}</div>
          <div className="e-time-date">
            <span>{liveClock.dateStr}</span>
            <span className="e-tz-badge" style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px', background: 'rgba(56, 189, 248, 0.15)', color: '#146b80', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              {stationData.timezone_label || (isBharati ? 'UTC+5' : 'UTC+0')}
            </span>
          </div>
          <div className="e-time-system-status">
            <span className="live-dot" />
            <span>Operational • {stationData.timezone || (isBharati ? 'Antarctica/Mawson' : 'UTC')}</span>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          CENTER MAIN CONTENT: Energy Management Dashboard
          ==================================================================== */}
      <section className="energy-center-section">
        {/* Top Title Bar & Metric Badges */}
        <div className="energy-header-banner">
          <div className="banner-title-block">
            <h2 className="banner-heading">Energy Management – {stationData.name}</h2>
            <p className="banner-sub">Monitor real-time microgrid power generation, load distribution and storage reserves.</p>
          </div>

          {/* AI Predictive Intelligence Section Indicator */}
          <AIPredictionIndicator category="energy" />

          <div className="banner-metrics-cluster">
            <ExpandableTelemetryCard
              title="Total Power Generation"
              category="MICROGRID GENERATION"
              value={energy.generation}
              unit="kW"
              status="nominal"
              icon={Zap}
              color="#187451"
              subtext="Aggregated Real-Time Station Output"
              details={[
                { label: 'Total Output', value: `${energy.generation} kW`, color: '#187451' },
                { label: 'Genset G-01', value: `${energy.sources?.gen1?.current || 65} kW`, color: '#146b80' },
                { label: 'Genset G-02', value: `${energy.sources?.gen2?.current || 0} kW`, color: '#146b80' },
                { label: 'Solar/Wind Harvest', value: `${(energy.sources?.solar?.current || 0) + (energy.sources?.wind?.current || 0)} kW`, color: '#187451' },
              ]}
              interpretation="All power generating assets synchronized with the 415V 3-phase station distribution bus."
              stationName={stationData.name}
            >
              <div className="banner-metric-pill gen-pill">
                <div className="pill-icon-box green-box"><Zap size={13} /></div>
                <div className="pill-meta">
                  <span className="pill-lbl">Total Generation</span>
                  <span className="pill-val mono-num">{energy.generation} kW</span>
                </div>
              </div>
            </ExpandableTelemetryCard>

            <ExpandableTelemetryCard
              title="Total Power Consumption"
              category="MICROGRID DEMAND"
              value={energy.consumption}
              unit="kW"
              status="nominal"
              icon={Activity}
              color="#245b82"
              subtext="Combined Habitat & Science Lab Demand"
              details={[
                { label: 'Active Station Load', value: `${energy.consumption} kW`, color: '#245b82' },
                { label: 'Heating Loops', value: `${Math.round(energy.consumption * 0.42)} kW`, color: '#946013' },
                { label: 'Science Instruments', value: `${Math.round(energy.consumption * 0.28)} kW`, color: '#147889' },
                { label: 'Base Life Support', value: `${Math.round(energy.consumption * 0.30)} kW`, color: '#187451' },
              ]}
              interpretation="Station electrical demand is operating within standard diurnal limits."
              stationName={stationData.name}
            >
              <div className="banner-metric-pill cons-pill">
                <div className="pill-icon-box blue-box"><Activity size={13} /></div>
                <div className="pill-meta">
                  <span className="pill-lbl">Total Consumption</span>
                  <span className="pill-val mono-num">{energy.consumption} kW</span>
                </div>
              </div>
            </ExpandableTelemetryCard>

            <ExpandableTelemetryCard
              title="Station Battery Bank (BESS)"
              category="ENERGY STORAGE"
              value={energy.batteryPercent}
              unit="%"
              percent={energy.batteryPercent}
              status="nominal"
              icon={BatteryCharging}
              color="#187451"
              subtext="Uninterruptible Lithium-Titanate BESS"
              details={[
                { label: 'State of Charge (SoC)', value: `${energy.batteryPercent}%`, color: '#187451' },
                { label: 'Current Charge', value: energy.batteryChargeKWh || '410 kWh', color: '#146b80' },
                { label: 'Total Capacity', value: energy.batteryCapacityKWh || '500 kWh', color: '#1d3044' },
                { label: 'Autonomy Duration', value: '14.5 Hours', color: '#187451' },
              ]}
              interpretation="Battery bank is in float equilibrium with zero cell over-voltage warnings."
              stationName={stationData.name}
            >
              <div className="banner-metric-pill batt-pill">
                <div className="pill-icon-box green-box"><BatteryCharging size={13} /></div>
                <div className="pill-meta">
                  <span className="pill-lbl">Battery Charge</span>
                  <span className="pill-val mono-num">{energy.batteryPercent}%</span>
                </div>
              </div>
            </ExpandableTelemetryCard>

            <button 
              className="forecast-quick-btn"
              onClick={() => onOpenReport && onOpenReport({ label: `7-Day Polar Energy Forecast (${stationData.name})` })}
            >
              <Zap size={13} />
              <span>Energy Forecast</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Top Grid: Power Generation & Consumption Curve + Generation Sources */}
        <div className="energy-top-row-grid">
          {/* Card 1: Power Generation & Consumption */}
          <div className="energy-gen-cons-card polaris-card">
            <div className="card-header-with-action">
              <div className="hdr-title-with-pill">
                <span className="card-title">Power Generation & Consumption</span>
                <span className="live-pill-badge"><span className="live-dot" /> Live</span>
              </div>
              <div className="chart-legend-simple">
                <span className="leg-item"><span className="leg-dot green-dot" /> Generation</span>
                <span className="leg-item"><span className="leg-dot blue-dot" /> Consumption</span>
              </div>
            </div>

            <div className="gen-cons-body-grid">
              {/* Left Line Chart */}
              <div className="gen-cons-chart-wrap">
                <svg viewBox="0 0 380 150" className="gen-cons-svg">
                  {/* Grid Lines */}
                  <line x1="35" y1="20" x2="375" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="35" y1="50" x2="375" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="35" y1="80" x2="375" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="35" y1="110" x2="375" y2="110" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                  {/* Y-Axis Labels */}
                  <text x="30" y="24" fill="#64748b" fontSize="7.5" textAnchor="end" className="mono-num">{isBharati ? '250' : '200'}</text>
                  <text x="30" y="54" fill="#64748b" fontSize="7.5" textAnchor="end" className="mono-num">{isBharati ? '200' : '150'}</text>
                  <text x="30" y="84" fill="#64748b" fontSize="7.5" textAnchor="end" className="mono-num">{isBharati ? '150' : '100'}</text>
                  <text x="30" y="114" fill="#64748b" fontSize="7.5" textAnchor="end" className="mono-num">{isBharati ? '75' : '50'}</text>
                  <text x="30" y="138" fill="#64748b" fontSize="7.5" textAnchor="end" className="mono-num">0</text>
                  <text x="35" y="10" fill="#475569" fontSize="6.5">Power (kW)</text>

                  {/* Consumption Curve (Blue) */}
                  <path
                    d={isBharati 
                      ? "M 40,76 Q 85,82 130,75 T 220,68 T 310,62 T 375,58"
                      : "M 40,86 Q 85,94 130,88 T 220,80 T 310,74 T 375,70"}
                    fill="none"
                    stroke="#245b82"
                    strokeWidth="2.2"
                  />
                  {/* Consumption Data Points */}
                  <circle cx="40" cy={isBharati ? 76 : 86} r="2.5" fill="#245b82" />
                  <circle cx="95" cy={isBharati ? 80 : 92} r="2.5" fill="#245b82" />
                  <circle cx="150" cy={isBharati ? 74 : 85} r="2.5" fill="#245b82" />
                  <circle cx="205" cy={isBharati ? 70 : 82} r="2.5" fill="#245b82" />
                  <circle cx="260" cy={isBharati ? 66 : 78} r="2.5" fill="#245b82" />
                  <circle cx="315" cy={isBharati ? 62 : 74} r="2.5" fill="#245b82" />
                  <circle cx="370" cy={isBharati ? 58 : 70} r="2.5" fill="#245b82" />

                  {/* Generation Curve (Green) */}
                  <path
                    d={isBharati 
                      ? "M 40,64 Q 85,58 130,60 T 220,48 T 310,50 T 375,38"
                      : "M 40,78 Q 85,72 130,76 T 220,64 T 310,68 T 375,52"}
                    fill="none"
                    stroke="#187451"
                    strokeWidth="2.2"
                  />
                  {/* Generation Data Points */}
                  <circle cx="40" cy={isBharati ? 64 : 78} r="2.5" fill="#187451" />
                  <circle cx="95" cy={isBharati ? 59 : 73} r="2.5" fill="#187451" />
                  <circle cx="150" cy={isBharati ? 60 : 75} r="2.5" fill="#187451" />
                  <circle cx="205" cy={isBharati ? 50 : 65} r="2.5" fill="#187451" />
                  <circle cx="260" cy={isBharati ? 53 : 71} r="2.5" fill="#187451" />
                  <circle cx="315" cy={isBharati ? 49 : 67} r="2.5" fill="#187451" />
                  <circle cx="370" cy={isBharati ? 38 : 52} r="3" fill="#ffffff" stroke="#187451" strokeWidth="2" />

                  {/* X-Axis Horizontal Base Line */}
                  <line x1="35" y1="135" x2="375" y2="135" stroke="rgba(255,255,255,0.1)" />

                  {/* X-Axis Time Ticks */}
                  <text x="40" y="146" fill="#64748b" fontSize="7" textAnchor="middle" className="mono-num">00:00</text>
                  <text x="95" y="146" fill="#64748b" fontSize="7" textAnchor="middle" className="mono-num">04:00</text>
                  <text x="150" y="146" fill="#64748b" fontSize="7" textAnchor="middle" className="mono-num">08:00</text>
                  <text x="205" y="146" fill="#64748b" fontSize="7" textAnchor="middle" className="mono-num">12:00</text>
                  <text x="260" y="146" fill="#64748b" fontSize="7" textAnchor="middle" className="mono-num">16:00</text>
                  <text x="315" y="146" fill="#64748b" fontSize="7" textAnchor="middle" className="mono-num">20:00</text>
                  <text x="370" y="146" fill="#64748b" fontSize="7" textAnchor="middle" className="mono-num">24:00</text>
                </svg>
              </div>

              {/* Right Donut Load */}
              <div className="current-load-donut-wrap">
                <span className="load-title-lbl">Current Load</span>
                <div className="donut-and-breakdown">
                  {/* SVG Doughnut */}
                  <div className="donut-relative-box">
                    <svg width="86" height="86" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(30,58,95,0.3)" strokeWidth="11" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#245b82" strokeWidth="11" strokeDasharray="100 138" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#147889" strokeWidth="11" strokeDasharray="43 195" strokeDashoffset="-100" transform="rotate(-90 50 50)" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#946013" strokeWidth="11" strokeDasharray="36 202" strokeDashoffset="-143" transform="rotate(-90 50 50)" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#187451" strokeWidth="11" strokeDasharray="19 219" strokeDashoffset="-179" transform="rotate(-90 50 50)" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#705296" strokeWidth="11" strokeDasharray="40 198" strokeDashoffset="-198" transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="donut-center-txt">
                      <span className="donut-val mono-num">{energy.consumption} <span className="d-unit">kW</span></span>
                      <span className="donut-sub">Total Consumption</span>
                    </div>
                  </div>

                  {/* Load Labels */}
                  <div className="load-categories-list">
                    {energy.breakdown.map((item, idx) => (
                      <div key={idx} className="load-cat-row">
                        <span className="cat-dot" style={{ backgroundColor: item.color }} />
                        <span className="cat-name">{item.name}</span>
                        <span className="cat-pct mono-num">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Generation Sources Grid */}
          <div className="energy-sources-card polaris-card">
            <div className="card-header-simple">
              <span className="card-title">Generation Sources ({stationData.name})</span>
            </div>

            <div className="sources-four-grid">
              {/* Source 1 */}
              <ExpandableTelemetryCard
                title={energy.sources.gen1.name}
                category="PRIMARY GENERATOR"
                value={`${energy.sources.gen1.current} kW`}
                percent={energy.sources.gen1.loadPct}
                status={energy.sources.gen1.status.toLowerCase().includes('running') ? 'nominal' : 'warning'}
                icon={Cpu}
                color="#187451"
                subtext={`Max Rating: ${energy.sources.gen1.max} kW • Runtime: ${energy.sources.gen1.runtime}`}
                details={[
                  { label: 'Current Output', value: `${energy.sources.gen1.current} kW`, color: '#187451' },
                  { label: 'Max Rating', value: `${energy.sources.gen1.max} kW`, color: '#1d3044' },
                  { label: 'Load Factor', value: `${energy.sources.gen1.loadPct}%`, color: '#187451' },
                  { label: 'Coolant Temp', value: isBharati ? '+68.2°C' : '+72.4°C', color: '#187451' },
                  { label: 'Oil Pressure', value: '4.8 bar', color: '#146b80' },
                  { label: 'Total Engine Hours', value: energy.sources.gen1.runtime, color: '#1d3044' },
                ]}
                interpretation="Primary continuous baseload heavy diesel generator supplying synchronous 50Hz 415V 3-phase station microgrid."
                stationName={stationData.name}
              >
                <div className="source-item-box">
                  <div className="source-top-line">
                    <div className="src-icon-name">
                      <Cpu size={14} className="text-cyan" />
                      <span className="src-title">{energy.sources.gen1.name}</span>
                    </div>
                    <span className="src-status"><span className="live-dot" /> {energy.sources.gen1.status}</span>
                  </div>
                  <div className="src-output-row">
                    <span className="src-out-main mono-num">{energy.sources.gen1.current} kW <span className="src-out-max">/ {energy.sources.gen1.max} kW</span></span>
                  </div>
                  <div className="src-bar-track">
                    <div className="src-bar-fill green-fill" style={{ width: `${energy.sources.gen1.loadPct}%` }} />
                  </div>
                  <div className="src-footer-info">
                    <span className="src-load-txt">{energy.sources.gen1.loadPct}% Load</span>
                    <span className="src-runtime mono-num">Runtime: {energy.sources.gen1.runtime}</span>
                  </div>
                </div>
              </ExpandableTelemetryCard>

              {/* Source 2 */}
              <ExpandableTelemetryCard
                title={energy.sources.gen2.name}
                category="SECONDARY GENERATOR"
                value={`${energy.sources.gen2.current} kW`}
                percent={energy.sources.gen2.loadPct}
                status={energy.sources.gen2.status.toLowerCase().includes('warning') ? 'warning' : 'nominal'}
                icon={Cpu}
                color={energy.sources.gen2.status.toLowerCase().includes('warning') ? '#946013' : '#187451'}
                subtext={`Max Rating: ${energy.sources.gen2.max} kW • Runtime: ${energy.sources.gen2.runtime}`}
                details={[
                  { label: 'Current Output', value: `${energy.sources.gen2.current} kW`, color: '#146b80' },
                  { label: 'Max Rating', value: `${energy.sources.gen2.max} kW`, color: '#1d3044' },
                  { label: 'Load Factor', value: `${energy.sources.gen2.loadPct}%`, color: '#946013' },
                  { label: 'Stator Temp', value: isBharati ? '+78.5°C (Warm)' : '+76.8°C', color: '#946013' },
                  { label: 'Auto Start Link', value: 'Armed (ATS Ready)', color: '#187451' },
                ]}
                interpretation="Standby / peaking diesel generator configured for automated sync upon primary bus step-load transients."
                stationName={stationData.name}
              >
                <div className="source-item-box">
                  <div className="source-top-line">
                    <div className="src-icon-name">
                      <Cpu size={14} className="text-cyan" />
                      <span className="src-title">{energy.sources.gen2.name}</span>
                    </div>
                    <span className="src-status"><span className="live-dot" /> {energy.sources.gen2.status}</span>
                  </div>
                  <div className="src-output-row">
                    <span className="src-out-main mono-num">{energy.sources.gen2.current} kW <span className="src-out-max">/ {energy.sources.gen2.max} kW</span></span>
                  </div>
                  <div className="src-bar-track">
                    <div className="src-bar-fill green-fill" style={{ width: `${energy.sources.gen2.loadPct}%` }} />
                  </div>
                  <div className="src-footer-info">
                    <span className="src-load-txt">{energy.sources.gen2.loadPct}% Load</span>
                    <span className="src-runtime mono-num">Runtime: {energy.sources.gen2.runtime}</span>
                  </div>
                </div>
              </ExpandableTelemetryCard>

              {/* Source 3: Solar */}
              <ExpandableTelemetryCard
                title={energy.sources.solar.name}
                category="RENEWABLE SOLAR HARVEST"
                value={`${energy.sources.solar.current} kW`}
                percent={energy.sources.solar.loadPct}
                status="nominal"
                icon={Sun}
                color="#eab308"
                subtext={`Max Rating: ${energy.sources.solar.max} kW • Status: ${energy.sources.solar.status}`}
                details={[
                  { label: 'Active Yield', value: `${energy.sources.solar.current} kW`, color: '#eab308' },
                  { label: 'Array Nameplate', value: `${energy.sources.solar.max} kW`, color: '#1d3044' },
                  { label: 'Solar Irradiance', value: '380 W/m²', color: '#eab308' },
                  { label: 'MPPT Tracking Eff', value: '98.6%', color: '#187451' },
                  { label: 'Inverter Status', value: 'Grid-Tie Synchronized', color: '#187451' },
                ]}
                interpretation="Bifacial Antarctic solar photovoltaic array capturing direct sunlight and high-albedo snow surface reflection."
                stationName={stationData.name}
              >
                <div className="source-item-box">
                  <div className="source-top-line">
                    <div className="src-icon-name">
                      <Sun size={14} className="text-amber" />
                      <span className="src-title">{energy.sources.solar.name}</span>
                    </div>
                    <span className="src-status"><span className="live-dot" /> {energy.sources.solar.status}</span>
                  </div>
                  <div className="src-output-row">
                    <span className="src-out-main mono-num">{energy.sources.solar.current} kW <span className="src-out-max">/ {energy.sources.solar.max} kW</span></span>
                  </div>
                  <div className="src-bar-track">
                    <div className="src-bar-fill cyan-fill" style={{ width: `${energy.sources.solar.loadPct}%` }} />
                  </div>
                  <div className="src-footer-info">
                    <span className="src-load-txt">{energy.sources.solar.loadPct}% Load</span>
                    <span className="src-runtime mono-num">{energy.sources.solar.runtime}</span>
                  </div>
                </div>
              </ExpandableTelemetryCard>

              {/* Source 4: Wind */}
              <ExpandableTelemetryCard
                title={energy.sources.wind.name}
                category="RENEWABLE WIND TURBINES"
                value={`${energy.sources.wind.current} kW`}
                percent={energy.sources.wind.loadPct}
                status="nominal"
                icon={Wind}
                color="#147889"
                subtext={`Max Rating: ${energy.sources.wind.max} kW • Status: ${energy.sources.wind.status}`}
                details={[
                  { label: 'Active Output', value: `${energy.sources.wind.current} kW`, color: '#147889' },
                  { label: 'Turbine Capacity', value: `${energy.sources.wind.max} kW`, color: '#1d3044' },
                  { label: 'Rotor RPM', value: '28.4 RPM', color: '#146b80' },
                  { label: 'Nacelle De-Icing', value: 'Active Heating Nominal', color: '#187451' },
                  { label: 'Brake Lock', value: 'Disengaged / Generation Active', color: '#187451' },
                ]}
                interpretation="Direct-drive arctic cold-climate wind turbines harnessing continuous katabatic airflow."
                stationName={stationData.name}
              >
                <div className="source-item-box">
                  <div className="source-top-line">
                    <div className="src-icon-name">
                      <Wind size={14} className="text-cyan" />
                      <span className="src-title">{energy.sources.wind.name}</span>
                    </div>
                    <span className="src-status"><span className="live-dot" /> {energy.sources.wind.status}</span>
                  </div>
                  <div className="src-output-row">
                    <span className="src-out-main mono-num">{energy.sources.wind.current} kW <span className="src-out-max">/ {energy.sources.wind.max} kW</span></span>
                  </div>
                  <div className="src-bar-track">
                    <div className="src-bar-fill cyan-fill" style={{ width: `${energy.sources.wind.loadPct}%` }} />
                  </div>
                  <div className="src-footer-info">
                    <span className="src-load-txt">{energy.sources.wind.loadPct}% Load</span>
                    <span className="src-runtime mono-num">{energy.sources.wind.runtime}</span>
                  </div>
                </div>
              </ExpandableTelemetryCard>
            </div>
          </div>
        </div>

        {/* Middle Grid: 3 Cards (Breakdown, Battery, Fuel) */}
        <div className="energy-middle-row-grid">
          {/* Card 1: Energy Consumption Breakdown */}
          <ExpandableTelemetryCard
            title="Energy Consumption Breakdown"
            category="LOAD DISTRIBUTION"
            value={`${energy.consumption} kW`}
            status="nominal"
            icon={Activity}
            color="#245b82"
            subtext="Detailed Subsystem Load Profile"
            details={energy.breakdown?.map(b => ({
              label: b.name,
              value: `${b.kw} kW (${b.pct}%)`,
              color: b.color
            }))}
            interpretation="Thermal life support heating represents the largest continuous baseload, followed by active scientific laboratory equipment."
            stationName={stationData.name}
          >
            <div className="e-breakdown-card polaris-card">
              <div className="card-header-with-action">
                <span className="card-title">Energy Consumption Breakdown</span>
                <div className="period-pill-switch">
                  <button 
                    className={`p-pill-btn ${breakdownPeriod === 'today' ? 'active' : ''}`}
                    onClick={() => setBreakdownPeriod('today')}
                  >
                    Today
                  </button>
                  <button 
                    className={`p-pill-btn ${breakdownPeriod === '7days' ? 'active' : ''}`}
                    onClick={() => setBreakdownPeriod('7days')}
                  >
                    7 Days
                  </button>
                  <button 
                    className={`p-pill-btn ${breakdownPeriod === '30days' ? 'active' : ''}`}
                    onClick={() => setBreakdownPeriod('30days')}
                  >
                    30 Days
                  </button>
                </div>
              </div>

              <div className="breakdown-content-flex">
                <div className="bd-donut-wrap">
                  <svg width="84" height="84" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(30,58,95,0.3)" strokeWidth="11" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#245b82" strokeWidth="11" strokeDasharray="100 138" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#147889" strokeWidth="11" strokeDasharray="43 195" strokeDashoffset="-100" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#946013" strokeWidth="11" strokeDasharray="36 202" strokeDashoffset="-143" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#187451" strokeWidth="11" strokeDasharray="19 219" strokeDashoffset="-179" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#705296" strokeWidth="11" strokeDasharray="40 198" strokeDashoffset="-198" transform="rotate(-90 50 50)" />
                  </svg>
                  <div className="bd-center-label">
                    <span className="bd-c-val mono-num">{energy.consumption} <span className="d-unit">kW</span></span>
                    <span className="bd-c-sub">Total Consumption</span>
                  </div>
                </div>

                <div className="bd-details-rows">
                  {energy.breakdown.map((bItem, bIdx) => (
                    <div key={bIdx} className="bd-row">
                      <div className="bd-cat">
                        <span className="cat-dot" style={{ backgroundColor: bItem.color }} /> {bItem.name}
                      </div>
                      <span className="bd-val mono-num">{bItem.kw} kW ({bItem.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ExpandableTelemetryCard>

          {/* Card 2: Battery Storage */}
          <ExpandableTelemetryCard
            title="Battery Storage (BESS)"
            category="STORAGE SUBSYSTEM"
            value={`${energy.batteryPercent}%`}
            percent={energy.batteryPercent}
            status="nominal"
            icon={BatteryCharging}
            color="#187451"
            subtext="500 kWh Lithium-Titanate Uninterruptible Battery Bank"
            details={[
              { label: 'State of Charge (SoC)', value: `${energy.batteryPercent}%`, color: '#187451' },
              { label: 'Stored Energy', value: energy.batteryChargeKWh || '410 kWh', color: '#146b80' },
              { label: 'Nameplate Capacity', value: energy.batteryCapacityKWh || '500 kWh', color: '#1d3044' },
              { label: 'Float Inverter Status', value: 'Online (Synchronized)', color: '#187451' },
              { label: 'Cell Voltage Spread', value: '4 mV (Optimal)', color: '#187451' },
            ]}
            interpretation="BESS provides clean sine-wave buffering for sensitive atmospheric physics and spectrometry payloads."
            stationName={stationData.name}
          >
            <div className="e-battery-card polaris-card">
              <div className="card-header-with-action">
                <span className="card-title">Battery Storage (BESS)</span>
                <span className="live-pill-badge"><span className="live-dot" /> Live</span>
              </div>

              <div className="battery-hero-stats">
                <div className="b-hero-left">
                  <div className="b-icon-box">
                    <BatteryCharging size={18} className="text-green" />
                  </div>
                  <div className="b-pct-meta">
                    <span className="b-pct-num mono-num">{energy.batteryPercent}%</span>
                    <span className="b-pct-lbl">Charge Level</span>
                  </div>
                </div>

                <div className="b-hero-right">
                  <div className="b-spec-col">
                    <span className="b-spec-lbl">Current Charge</span>
                    <span className="b-spec-val mono-num">{energy.batteryChargeKWh}</span>
                  </div>
                  <div className="b-spec-col">
                    <span className="b-spec-lbl">Capacity</span>
                    <span className="b-spec-val mono-num">{energy.batteryCapacityKWh}</span>
                  </div>
                </div>
              </div>

              <div className="battery-chart-box">
                <svg viewBox="0 0 260 75" className="battery-svg">
                  <defs>
                    <linearGradient id="battGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#187451" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#187451" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="25" y1="12" x2="255" y2="12" stroke="rgba(255,255,255,0.05)" />
                  <line x1="25" y1="36" x2="255" y2="36" stroke="rgba(255,255,255,0.05)" />
                  <line x1="25" y1="60" x2="255" y2="60" stroke="rgba(255,255,255,0.05)" />

                  <text x="20" y="15" fill="#64748b" fontSize="6.5" textAnchor="end" className="mono-num">100</text>
                  <text x="20" y="39" fill="#64748b" fontSize="6.5" textAnchor="end" className="mono-num">75</text>
                  <text x="20" y="63" fill="#64748b" fontSize="6.5" textAnchor="end" className="mono-num">50</text>

                  <polygon points="30,42 65,38 100,40 135,33 170,30 205,32 250,28 250,60 30,60" fill="url(#battGrad)" />
                  <path d="M 30,42 L 65,38 L 100,40 L 135,33 L 170,30 L 205,32 L 250,28" fill="none" stroke="#187451" strokeWidth="1.8" />
                  <circle cx="250" cy="28" r="2.5" fill="#187451" />

                  <text x="30" y="70" fill="#64748b" fontSize="6" textAnchor="middle" className="mono-num">00:00</text>
                  <text x="74" y="70" fill="#64748b" fontSize="6" textAnchor="middle" className="mono-num">04:00</text>
                  <text x="118" y="70" fill="#64748b" fontSize="6" textAnchor="middle" className="mono-num">08:00</text>
                  <text x="162" y="70" fill="#64748b" fontSize="6" textAnchor="middle" className="mono-num">12:00</text>
                  <text x="206" y="70" fill="#64748b" fontSize="6" textAnchor="middle" className="mono-num">16:00</text>
                  <text x="250" y="70" fill="#64748b" fontSize="6" textAnchor="middle" className="mono-num">24:00</text>
                </svg>
              </div>
            </div>
          </ExpandableTelemetryCard>

          {/* Card 3: Fuel Storage */}
          <ExpandableTelemetryCard
            title="Fuel Storage & Reserve"
            category="STRATEGIC FUEL CACHE"
            value={`${energy.fuelDays} Days`}
            percent={energy.fuelBarPercent}
            status={energy.fuelDays < 45 ? 'warning' : 'nominal'}
            icon={Fuel}
            color="#946013"
            subtext={`Total Volume: ${energy.fuelLiters} • Daily Burn: ${energy.dailyUsageL}`}
            details={[
              { label: 'Days Remaining', value: `${energy.fuelDays} Days`, color: '#946013' },
              { label: 'Total Liters', value: energy.fuelLiters || '50,200 L', color: '#1d3044' },
              { label: 'Daily Consumption', value: energy.dailyUsageL || '1,167 L/day', color: '#146b80' },
              { label: 'Tank Trace Heat', value: '-4.2°C (Active)', color: '#187451' },
              { label: 'Resupply Window', value: '35 Days until MV Vasiliy Golovnin', color: '#946013' },
            ]}
            interpretation="Arctic-grade low-temperature fuel tanks heated continuously to avoid paraffin waxing."
            stationName={stationData.name}
          >
            <div className="e-fuel-card polaris-card">
              <div className="card-header-with-action">
                <span className="card-title">Fuel Storage & Reserve</span>
                <span className="live-pill-badge"><span className="live-dot" /> Live</span>
              </div>

              <div className="fuel-hero-stats">
                <div className="f-hero-left">
                  <div className="f-icon-box">
                    <Fuel size={18} className="text-amber" />
                  </div>
                  <div className="f-pct-meta">
                    <span className="f-days-num mono-num">{energy.fuelDays}</span>
                    <span className="f-days-lbl">Estimated Remaining</span>
                  </div>
                </div>

                <div className="f-hero-right">
                  <div className="f-spec-col">
                    <span className="f-spec-lbl">Total Fuel</span>
                    <span className="f-spec-val mono-num">{energy.fuelLiters}</span>
                  </div>
                  <div className="f-spec-col">
                    <span className="f-spec-lbl">Daily Usage</span>
                    <span className="f-spec-val mono-num">{energy.dailyUsageL}</span>
                  </div>
                </div>
              </div>

              <div className="fuel-progress-row">
                <div className="fuel-bar-track">
                  <div className="fuel-bar-fill" style={{ width: `${energy.fuelBarPercent}%` }} />
                </div>
                <span className="fuel-bar-pct mono-num">{energy.fuelBarPercent}%</span>
              </div>

              <div className="fuel-trend-box">
                <span className="f-trend-sub-lbl">Fuel Consumption Trend</span>
                <svg viewBox="0 0 260 55" className="fuel-svg">
                  <line x1="20" y1="12" x2="255" y2="12" stroke="rgba(255,255,255,0.05)" />
                  <line x1="20" y1="28" x2="255" y2="28" stroke="rgba(255,255,255,0.05)" />
                  <line x1="20" y1="44" x2="255" y2="44" stroke="rgba(255,255,255,0.05)" />

                  <text x="16" y="14" fill="#64748b" fontSize="5.5" textAnchor="end" className="mono-num">2.0k</text>
                  <text x="16" y="30" fill="#64748b" fontSize="5.5" textAnchor="end" className="mono-num">1.5k</text>
                  <text x="16" y="46" fill="#64748b" fontSize="5.5" textAnchor="end" className="mono-num">1.0k</text>

                  <path d="M 25,24 L 75,20 L 125,32 L 175,34" fill="none" stroke="#946013" strokeWidth="1.8" />
                  <circle cx="25" cy="24" r="2" fill="#946013" />
                  <circle cx="75" cy="20" r="2" fill="#946013" />
                  <circle cx="125" cy="32" r="2" fill="#946013" />
                  <circle cx="175" cy="34" r="2" fill="#946013" />

                  <path d="M 175,34 L 215,38 L 250,42" fill="none" stroke="#146b80" strokeWidth="1.8" strokeDasharray="3 3" />
                  <circle cx="215" cy="38" r="2" fill="none" stroke="#146b80" />
                  <circle cx="250" cy="42" r="2" fill="none" stroke="#146b80" />

                  <text x="35" y="52" fill="#64748b" fontSize="5.5" textAnchor="middle">19 May</text>
                  <text x="105" y="52" fill="#64748b" fontSize="5.5" textAnchor="middle">21 May</text>
                  <text x="175" y="52" fill="#64748b" fontSize="5.5" textAnchor="middle">23 May</text>
                  <text x="240" y="52" fill="#64748b" fontSize="5.5" textAnchor="middle">25 May</text>
                </svg>
              </div>
            </div>
          </ExpandableTelemetryCard>
        </div>

        {/* Bottom Grid: Energy Forecast + AI Energy Insights */}
        <div className="energy-bottom-row-grid">
          {/* Card 1: Energy Forecast */}
          <div className="e-forecast-card polaris-card">
            <div className="card-header-with-action">
              <span className="card-title">Energy Forecast (7-Day Trend)</span>
              <div className="period-pill-switch">
                <button 
                  className={`p-pill-btn ${forecastPeriod === '7days' ? 'active' : ''}`}
                  onClick={() => setForecastPeriod('7days')}
                >
                  Next 7 Days
                </button>
                <button 
                  className={`p-pill-btn ${forecastPeriod === '30days' ? 'active' : ''}`}
                  onClick={() => setForecastPeriod('30days')}
                >
                  Next 30 Days
                </button>
              </div>
            </div>

            <div className="forecast-stat-tiles">
              <div className="f-tile-item">
                <span className="f-tile-lbl"><Zap size={11} className="text-cyan" /> Expected Generation</span>
                <span className="f-tile-val mono-num">{energy.forecast.expectedGen}</span>
                <span className="f-tile-delta text-green">{energy.forecast.genDelta}</span>
              </div>

              <div className="f-tile-item">
                <span className="f-tile-lbl"><Activity size={11} className="text-cyan" /> Expected Consumption</span>
                <span className="f-tile-val mono-num">{energy.forecast.expectedCons}</span>
                <span className="f-tile-delta text-green">{energy.forecast.consDelta}</span>
              </div>

              <div className="f-tile-item">
                <span className="f-tile-lbl"><BatteryCharging size={11} className="text-green" /> Battery Reserve</span>
                <span className="f-tile-val mono-num">{energy.forecast.batteryReserve}</span>
                <span className="f-tile-delta text-dim">(at current trend)</span>
              </div>
            </div>

            <div className="forecast-chart-wrap">
              <svg viewBox="0 0 380 90" className="forecast-svg">
                <line x1="30" y1="15" x2="375" y2="15" stroke="rgba(255,255,255,0.05)" />
                <line x1="30" y1="40" x2="375" y2="40" stroke="rgba(255,255,255,0.05)" />
                <line x1="30" y1="65" x2="375" y2="65" stroke="rgba(255,255,255,0.05)" />

                <text x="25" y="18" fill="#64748b" fontSize="6.5" textAnchor="end" className="mono-num">200</text>
                <text x="25" y="43" fill="#64748b" fontSize="6.5" textAnchor="end" className="mono-num">150</text>
                <text x="25" y="68" fill="#64748b" fontSize="6.5" textAnchor="end" className="mono-num">100</text>

                <path d="M 35,46 L 90,44 L 145,47 L 200,43 L 255,48 L 310,45 L 365,49" fill="none" stroke="#245b82" strokeWidth="1.8" />
                <path d="M 35,38 L 90,36 L 145,34 L 200,38 L 255,35 L 310,36 L 365,33" fill="none" stroke="#187451" strokeWidth="1.8" />

                <text x="35" y="82" fill="#64748b" fontSize="6" textAnchor="middle">26 May</text>
                <text x="90" y="82" fill="#64748b" fontSize="6" textAnchor="middle">27 May</text>
                <text x="145" y="82" fill="#64748b" fontSize="6" textAnchor="middle">28 May</text>
                <text x="200" y="82" fill="#64748b" fontSize="6" textAnchor="middle">29 May</text>
                <text x="255" y="82" fill="#64748b" fontSize="6" textAnchor="middle">30 May</text>
                <text x="310" y="82" fill="#64748b" fontSize="6" textAnchor="middle">31 May</text>
                <text x="365" y="82" fill="#64748b" fontSize="6" textAnchor="middle">01 Jun</text>
              </svg>
            </div>
          </div>

          {/* Card 2: AI PREDICTIVE ENERGY ANALYSIS */}
          <div className="e-ai-insights-card polaris-card">
            <div className="card-header-with-action">
              <div className="ai-title-wrap">
                <Sparkles size={14} className="text-cyan animate-pulse" />
                <span className="card-title">MICROGRID FORECAST</span>
              </div>
              <div className="ai-header-controls">
                <span className="ai-pred-station-tag">{stationData.name.toUpperCase()}</span>
                <span className="ai-engine-tag">{aiInsightsData.model?.replace('Regressor', '') || 'ML Regressor'}</span>
                <button 
                  className="ai-scan-quick-btn"
                  onClick={runEnergyAIScan}
                  title="Re-run Energy Prediction Model"
                  disabled={isAnalyzing}
                >
                  <RefreshCw size={11} className={isAnalyzing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {isAnalyzing ? (
              <div className="ai-scanning-state" style={{ padding: '28px 10px', textAlign: 'center' }}>
                <RefreshCw size={20} className="animate-spin text-cyan" />
                <div style={{ fontSize: '0.74rem', color: '#146b80', marginTop: '8px', fontWeight: 600 }}>
                  Computing multi-horizon forecasts on {stationData.name} telemetry...
                </div>
                <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px' }}>
                  Evaluating +6h work shift and +24h diurnal cycle models
                </div>
              </div>
            ) : (
              <div className="ai-pred-container">
                {/* Visual Horizon Summary Bar */}
                <div style={{ 
                  background: '#f4f7f9',
                  borderRadius: '6px', 
                  padding: '8px 10px',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#146b80', letterSpacing: '0.05em' }}>
                      PROJECTED MICROGRID CONDITIONS: NOW vs IN 6H vs AFTER 1 DAY
                    </span>
                    <span style={{ fontSize: '0.58rem', color: '#187451', fontWeight: 700 }}>
                      ✓ ML Regressor Active
                    </span>
                  </div>

                  {/* 3-Column Timeline: Live Now vs In 6 Hours vs In 24 Hours / 1 Day */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    {/* Column 1: Live Now */}
                    <div style={{ 
                      background: '#f4f7f9',
                      padding: '8px 6px', 
                      borderRadius: '4px', 
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#536579', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '3px' }}>
                        NOW (LIVE)
                      </div>
                      <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.62rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Batt: </span>
                          <strong style={{ color: '#187451' }}>{energy.batteryPercent}%</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Load: </span>
                          <strong style={{ color: '#146b80' }}>{energy.consumption} kW</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Temp: </span>
                          <strong style={{ color: isBharati ? '#187451' : '#946013' }}>{isBharati ? '69.8°C' : '78.4°C'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: In 6 Hours */}
                    {(() => {
                      const b6 = aiInsightsData.prediction?.battery_6h ?? 78.3;
                      const p6 = aiInsightsData.prediction?.power_6h ?? 105.4;
                      const t6 = aiInsightsData.prediction?.generator_temp_6h ?? (isBharati ? 71.0 : 82.5);
                      const bDelta = (b6 - energy.batteryPercent).toFixed(1);
                      const pDelta = (p6 - energy.consumption).toFixed(1);
                      const tDelta = (t6 - (isBharati ? 69.8 : 78.4)).toFixed(1);

                      return (
                        <div style={{ 
                          background: 'rgba(2, 132, 199, 0.12)', 
                          padding: '8px 6px', 
                          borderRadius: '4px', 
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#146b80', borderBottom: '1px solid rgba(56,189,248,0.2)', paddingBottom: '3px' }}>
                            IN 6 HOURS
                          </div>
                          <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.62rem' }}>
                            <div>
                              <span style={{ color: '#536579' }}>Batt: </span>
                              <strong style={{ color: '#146b80' }}>{b6}%</strong>
                              <span style={{ fontSize: '0.52rem', marginLeft: '2px', color: bDelta >= 0 ? '#187451' : '#946013' }}>
                                ({bDelta >= 0 ? `+${bDelta}` : bDelta}%)
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#536579' }}>Load: </span>
                              <strong style={{ color: '#946013' }}>{p6} kW</strong>
                              <span style={{ fontSize: '0.52rem', marginLeft: '2px', color: '#536579' }}>
                                ({pDelta >= 0 ? `+${pDelta}` : pDelta})
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#536579' }}>Temp: </span>
                              <strong style={{ color: t6 >= 85 ? '#b73b37' : '#e2e8f0' }}>{t6}°C</strong>
                              <span style={{ fontSize: '0.52rem', marginLeft: '2px', color: tDelta >= 0 ? '#946013' : '#187451' }}>
                                ({tDelta >= 0 ? `+${tDelta}` : tDelta})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Column 3: After 1 Day (24 Hours) */}
                    {(() => {
                      const b24 = aiInsightsData.prediction?.battery_24h ?? 78.3;
                      const p24 = aiInsightsData.prediction?.power_24h ?? 109.2;
                      const t24 = aiInsightsData.prediction?.generator_temp_24h ?? (isBharati ? 72.5 : 83.4);
                      const bDelta = (b24 - energy.batteryPercent).toFixed(1);
                      const pDelta = (p24 - energy.consumption).toFixed(1);
                      const tDelta = (t24 - (isBharati ? 69.8 : 78.4)).toFixed(1);

                      return (
                        <div style={{ 
                          background: 'rgba(245, 158, 11, 0.1)', 
                          padding: '8px 6px', 
                          borderRadius: '4px', 
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#946013', borderBottom: '1px solid rgba(245,158,11,0.2)', paddingBottom: '3px' }}>
                            AFTER 1 DAY (24H)
                          </div>
                          <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.62rem' }}>
                            <div>
                              <span style={{ color: '#536579' }}>Batt: </span>
                              <strong style={{ color: b24 < 65 ? '#946013' : '#187451' }}>{b24}%</strong>
                              <span style={{ fontSize: '0.52rem', marginLeft: '2px', color: bDelta >= 0 ? '#187451' : '#946013' }}>
                                ({bDelta >= 0 ? `+${bDelta}` : bDelta}%)
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#536579' }}>Load: </span>
                              <strong style={{ color: '#946013' }}>{p24} kW</strong>
                              <span style={{ fontSize: '0.52rem', marginLeft: '2px', color: '#536579' }}>
                                ({pDelta >= 0 ? `+${pDelta}` : pDelta})
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#536579' }}>Temp: </span>
                              <strong style={{ color: t24 >= 85 ? '#b73b37' : '#e2e8f0' }}>{t24}°C</strong>
                              <span style={{ fontSize: '0.52rem', marginLeft: '2px', color: tDelta >= 0 ? '#946013' : '#187451' }}>
                                ({tDelta >= 0 ? `+${tDelta}` : tDelta})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Generator Risk, Battery Risk & Confidence Badges */}
                <div className="ai-pred-risks-row" style={{ marginTop: '4px' }}>
                  <div className="ai-pred-risk-item">
                    <span style={{ color: '#536579' }}>Thermal Risk:</span>
                    <span className={`ai-pred-badge ${(aiInsightsData.generator_risk || 'NORMAL').toLowerCase()}`}>
                      {aiInsightsData.generator_risk || 'NORMAL'}
                    </span>
                  </div>
                  <div className="ai-pred-risk-item">
                    <span style={{ color: '#536579' }}>Grid Risk:</span>
                    <span className={`ai-pred-badge ${(aiInsightsData.energy_risk || 'NORMAL').toLowerCase()}`}>
                      {aiInsightsData.energy_risk || 'NORMAL'}
                    </span>
                  </div>
                  <div className="ai-pred-risk-item">
                    <span style={{ color: '#536579' }}>ML Confidence:</span>
                    <span className="ai-pred-conf-score">
                      {Math.round((aiInsightsData.confidence || 0.88) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className="ai-summary-callout" style={{ margin: '4px 0 4px 0' }}>
                  <div className="ai-robot-badge">
                    <Bot size={14} />
                  </div>
                  <p className="ai-summary-text" style={{ fontSize: '0.62rem' }}>
                    <strong>24-hour operating note: </strong>
                    {aiInsightsData.recommendation || aiInsightsData.summary}
                  </p>
                </div>
              </div>
            )}

            <div className="ai-pred-meta-strip">
              <span>Engine: {aiInsightsData.model || 'RandomForestRegressor'} ({aiInsightsData.data_points_used || 168} records)</span>
              <span>Updated: {lastAnalyzedAt || 'Just now'}</span>
            </div>

            <div className="ai-card-footer">
              <button 
                className="ai-view-details-btn"
                onClick={() => setInsightModalOpen(true)}
              >
                Review forecast details
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Polar Microgrid Stress & What-If Simulator */}
        <div style={{ marginTop: '12px' }}>
          <WhatIfSimulator 
            selectedStation={selectedStation} 
            onOpenReport={onOpenReport} 
          />
        </div>
      </section>


      {/* ====================================================================
          RIGHT SIDEBAR: Energy Status + Recent Alerts + Quick Actions
          ==================================================================== */}
      <aside className="energy-right-sidebar">
        {/* Card 1: Energy Status Circular Gauge */}
        <div className="e-status-gauge-card polaris-card">
          <div className="card-header-simple">
            <span className="card-title">Energy Status</span>
          </div>

          <ExpandableTelemetryCard
            title="Composite Energy Health Rating"
            category="MICROGRID RELIABILITY"
            value={`${energyStatus.score} / 100`}
            percent={energyStatus.score}
            status={energyStatus.score >= 85 ? 'nominal' : 'warning'}
            icon={ShieldCheck}
            color="#187451"
            subtext={`Microgrid Health: ${energyStatus.rating.toUpperCase()}`}
            details={(energyStatus.subsystems || []).map(s => ({
              label: s.label,
              value: s.val,
              color: s.color
            }))}
            interpretation="Aggregated diagnostic index reflecting genset thermal state, battery SoC, line frequency, and voltage harmonic distortion."
            stationName={stationData.name}
          >
            <div className="e-gauge-circle-wrap">
              <div className="e-gauge-box">
                <svg width="100" height="100">
                  <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(30,58,95,0.4)" strokeWidth="7" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="42" 
                    fill="transparent" 
                    stroke="#187451"
                    strokeWidth="7" 
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - energyStatus.score / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)" 
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="e-gauge-center">
                  <span className="e-gauge-score mono-num">{energyStatus.score}<span className="den">/100</span></span>
                  <span className="e-good-badge" style={{ color: energyStatus.rating === 'Optimal' ? '#187451' : '#187451' }}>{energyStatus.rating}</span>
                </div>
              </div>
            </div>
          </ExpandableTelemetryCard>

          {/* Subsystem Health Breakdown Rows */}
          <div className="e-subsystems-list">
            {(energyStatus.subsystems || []).map((sub, idx) => {
              const SubIcon = getSubsystemIcon(sub.label);
              return (
                <ExpandableTelemetryCard
                  key={idx}
                  title={`${sub.label} Telemetry`}
                  category="ENERGY SUBSYSTEM"
                  value={sub.val}
                  status={sub.val.toLowerCase().includes('optimal') || sub.val.toLowerCase().includes('nominal') || sub.val.toLowerCase().includes('good') ? 'nominal' : 'warning'}
                  icon={SubIcon}
                  color={sub.color}
                  details={[
                    { label: 'Subsystem Name', value: sub.label, color: sub.color },
                    { label: 'Diagnostic Rating', value: sub.val, color: sub.color },
                    { label: 'SCADA Telemetry', value: 'Live Bus Synced', color: '#146b80' }
                  ]}
                  interpretation={`Operating parameters for ${sub.label} are continually ingested and verified against safe polar engineering margins.`}
                  stationName={stationData.name}
                  className="e-subsystem-row-wrapper"
                >
                  <div className="e-subsystem-row">
                    <div className="e-sub-left">
                      <SubIcon size={12} style={{ color: sub.color }} />
                      <span className="e-sub-label">{sub.label}</span>
                    </div>
                    <div className="e-sub-right">
                      <span className="e-sub-val mono-num" style={{ color: sub.color }}>{sub.val}</span>
                    </div>
                  </div>
                </ExpandableTelemetryCard>
              );
            })}
          </div>
        </div>

        {/* Card 2: Recent Alerts */}
        <div className="e-recent-alerts-card polaris-card">
          <div className="card-header-with-action">
            <span className="card-title">Recent Alerts</span>
            <button className="card-action-link" onClick={onOpenAlerts}>View All</button>
          </div>

          <div className="e-alerts-list">
            {(stationData.alerts || []).map((alt) => {
              let alertClass = 'amber-alert';
              let Icon = AlertTriangle;
              let bgClass = 'amber-bg';

              if (alt.severity === 'critical') {
                alertClass = 'red-alert';
                Icon = Flame;
                bgClass = 'red-bg';
              } else if (alt.severity === 'info') {
                alertClass = 'blue-alert';
                Icon = Activity;
                bgClass = 'blue-bg';
              }

              return (
                <div key={alt.id} className={`e-alert-item ${alertClass}`}>
                  <div className={`e-alert-icon-box ${bgClass}`}><Icon size={12} /></div>
                  <div className="e-alert-meta">
                    <span className="e-alert-title">{alt.title}</span>
                    <span className="e-alert-sub mono-num">{alt.time} • {alt.source}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Quick Actions */}
        <div className="e-quick-actions-card polaris-card">
          <div className="card-header-simple">
            <span className="card-title">Quick Actions</span>
          </div>

          <div className="quick-actions-btns-list">
            <button 
              className="quick-act-btn"
              onClick={() => onOpenReport && onOpenReport({
                id: isBharati ? 'gen-fail-bharati' : 'gen-fail',
                name: `What-If Grid Load Surge & Generator Trip Simulation (${stationData.name})`,
                label: `What-If Grid Load Surge & Generator Trip Simulation (${stationData.name})`,
                category: 'MICROGRID TRANSIENT STRESS TEST',
                description: `Dynamic thermodynamic load surge and generator trip simulation across ${stationData.name} 415V distribution bus.`,
                params: {
                  powerDropPct: isBharati ? -32 : -28,
                  lostCapacityKw: isBharati ? 59.2 : 36.4,
                  batteryHours: isBharati ? 18.0 : 16.0,
                  loadShedRecommendation: isBharati 
                    ? 'Auto-shed non-critical laboratory instruments and secondary HVAC trace heaters (-45 kW).'
                    : 'Auto-shed Science Lab trace heaters and non-essential laundry load (-28 kW).',
                  missionRisk: 'HIGH',
                  riskScore: 78,
                  mitigationAction: 'Engage standby generator G-01 via Remote SCADA console within 15 minutes.'
                }
              })}
            >
              <Zap size={13} className="text-cyan" />
              <span>Run What-If Simulation</span>
            </button>
            <button 
              className="quick-act-btn"
              onClick={() => onOpenReport && onOpenReport({ label: `7-Day Polar Energy Forecast (${stationData.name})` })}
            >
              <BarChart3 size={13} className="text-cyan" />
              <span>View Energy Forecast</span>
            </button>
            <button 
              className="quick-act-btn"
              onClick={() => onOpenReport && onOpenReport({ label: `${stationData.name} Primary Power Generation Health` })}
            >
              <Wrench size={13} className="text-cyan" />
              <span>Check Generation Health</span>
            </button>
            <button className="quick-act-btn" onClick={() => alert(`Exporting ${stationData.name} Mission Energy Telemetry PDF...`)}>
              <Download size={13} className="text-cyan" />
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          MODAL: Functional Energy AI Diagnostics & Microgrid Synthesis
          ==================================================================== */}
      {insightModalOpen && (
        <div className="energy-diag-overlay" onClick={() => setInsightModalOpen(false)}>
          <div className="energy-diag-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="energy-diag-header">
              <div className="energy-diag-header-left">
                <div className="energy-diag-icon-badge">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="energy-diag-badge-row">
                    <span className="energy-diag-tag-live">MICROGRID FORECAST REVIEW</span>
                    <span className="energy-diag-station-tag">{stationData.name.toUpperCase()} STATION</span>
                    <span className="energy-diag-conf-tag">CONFIDENCE: {aiInsightsData.confidence || 'HIGH'}</span>
                    <span className="energy-diag-conf-tag">TZ: {stationData.timezone_label || (isBharati ? 'UTC+5' : 'UTC+0')}</span>
                  </div>
                  <h3 className="energy-diag-title">
                    {stationData.name} microgrid telemetry and forecast
                  </h3>
                  <div className="energy-diag-meta-line">
                    <span className="energy-diag-meta-item">
                      <Clock size={11} /> <strong>Station Time:</strong> {liveClock.dateStr} {liveClock.timeStrWithSeconds}
                    </span>
                    <span className="energy-diag-meta-item">
                      <Compass size={11} /> <strong>Location:</strong> {stationData.coords} ({stationData.region})
                    </span>
                    <span className="energy-diag-meta-item">
                      <Cpu size={11} /> <strong>Engine:</strong> {aiInsightsData.provider || 'POLARIS Microgrid Engine'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="energy-diag-header-right">
                <button 
                  className="energy-diag-scan-btn" 
                  onClick={runEnergyAIScan}
                  disabled={isAnalyzing}
                >
                  <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
                  <span>{isAnalyzing ? 'Scanning Grid...' : 'Re-Run Grid Scan'}</span>
                </button>
                <button 
                  className="energy-diag-close-btn" 
                  onClick={() => setInsightModalOpen(false)}
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="energy-diag-tabs-bar">
              <button 
                className={`energy-diag-tab-btn ${modalTab === 'predictive' ? 'active' : ''}`}
                onClick={() => setModalTab('predictive')}
              >
                <Sparkles size={13} />
                <span>Forecast model (1h / 6h / 24h)</span>
              </button>
              <button 
                className={`energy-diag-tab-btn ${modalTab === 'overview' ? 'active' : ''}`}
                onClick={() => setModalTab('overview')}
              >
                <Zap size={13} />
                <span>Grid Balance &amp; Synthesis</span>
              </button>
              <button 
                className={`energy-diag-tab-btn ${modalTab === 'generators' ? 'active' : ''}`}
                onClick={() => setModalTab('generators')}
              >
                <Cpu size={13} />
                <span>Generator Thermal &amp; Stator Health</span>
              </button>
              <button 
                className={`energy-diag-tab-btn ${modalTab === 'storage' ? 'active' : ''}`}
                onClick={() => setModalTab('storage')}
              >
                <BatteryCharging size={13} />
                <span>BESS &amp; Arctic Fuel Reserves</span>
              </button>
              <button 
                className={`energy-diag-tab-btn ${modalTab === 'subsystems' ? 'active' : ''}`}
                onClick={() => setModalTab('subsystems')}
              >
                <Layers size={13} />
                <span>Subsystems &amp; Environmental Telemetry</span>
              </button>
              <button 
                className={`energy-diag-tab-btn ${modalTab === 'whatif' ? 'active' : ''}`}
                onClick={() => setModalTab('whatif')}
              >
                <Zap size={13} />
                <span>What-If Stress Simulation</span>
              </button>
              <button 
                className={`energy-diag-tab-btn ${modalTab === 'directives' ? 'active' : ''}`}
                onClick={() => setModalTab('directives')}
              >
                <ShieldCheck size={13} />
                <span>Engineering Directives &amp; Automation</span>
              </button>
            </div>

            {/* Mitigation Alert Banner (if action clicked) */}
            {mitigationFeedback && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '8px 20px',
                color: '#187451',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>{mitigationFeedback}</span>
                <button 
                  onClick={() => setMitigationFeedback(null)}
                  style={{ background: 'none', border: 'none', color: '#187451', cursor: 'pointer' }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="energy-diag-body">
              {/* Top Hero KPI Bar */}
              <div className="energy-diag-hero-bar">
                <div className="energy-diag-hero-item">
                  <div className="energy-diag-hero-icon text-cyan">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="energy-diag-hero-val">{energy.generation} kW</div>
                    <span className="energy-diag-hero-lbl">Total Grid Generation</span>
                    <span className="energy-diag-hero-sub text-green">Surplus: +{energy.surplus} kW</span>
                  </div>
                </div>

                <div className="energy-diag-hero-item">
                  <div className="energy-diag-hero-icon text-amber">
                    <Activity size={18} />
                  </div>
                  <div>
                    <div className="energy-diag-hero-val">{energy.consumption} kW</div>
                    <span className="energy-diag-hero-lbl">Station Load Demand</span>
                    <span className="energy-diag-hero-sub">{stationData.name} Microgrid</span>
                  </div>
                </div>

                <div className="energy-diag-hero-item">
                  <div className="energy-diag-hero-icon text-green">
                    <BatteryCharging size={18} />
                  </div>
                  <div>
                    <div className="energy-diag-hero-val">{energy.batteryPercent}%</div>
                    <span className="energy-diag-hero-lbl">BESS State of Charge</span>
                    <span className="energy-diag-hero-sub text-cyan">{energy.batteryChargeKWh} ({energy.forecast?.batteryReserve || '2.8d'})</span>
                  </div>
                </div>

                <div className="energy-diag-hero-item">
                  <div className="energy-diag-hero-icon" style={{ color: '#946013' }}>
                    <Fuel size={18} />
                  </div>
                  <div>
                    <div className="energy-diag-hero-val">{energy.fuelDays}</div>
                    <span className="energy-diag-hero-lbl">Fuel Reserve Runway</span>
                    <span className="energy-diag-hero-sub" style={{ color: '#946013' }}>{energy.fuelLiters} ({energy.dailyUsageL}/day)</span>
                  </div>
                </div>
              </div>

              {/* TAB 0: AI Predictive Model & Multi-Horizon Analysis */}
              {modalTab === 'predictive' && (
                <>
                  <div className="energy-diag-callout" style={{ borderLeft: '3px solid #146b80' }}>
                    <div className="energy-diag-callout-icon">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '0.76rem', fontWeight: '800', color: '#146b80', margin: 0 }}>
                          ENERGY FORECAST ({stationData.name.toUpperCase()})
                        </h4>
                        <span className="ai-pred-station-tag">{stationData.name.toUpperCase()} DATASET</span>
                      </div>
                      <p className="energy-diag-callout-text" style={{ fontSize: '0.68rem', lineHeight: 1.4 }}>
                        {aiInsightsData.recommendation || aiInsightsData.summary}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.62rem', color: '#536579' }}>
                        <span><strong>Model:</strong> {aiInsightsData.model || 'RandomForestRegressor'}</span>
                        <span><strong>Data Points Ingested:</strong> {aiInsightsData.data_points_used || 168}</span>
                        <span><strong>Confidence:</strong> {Math.round((aiInsightsData.confidence || 0.82) * 100)}%</span>
                        <span><strong>Demand Trend:</strong> {aiInsightsData.demand_trend || 'Stable'}</span>
                        <span><strong>Battery Trend:</strong> {aiInsightsData.battery_trend || 'Equilibrium'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Horizon Projection Cards: Now vs In 6 Hours vs After 1 Day (24h) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '10px 0' }}>
                    {[
                      { horizon: 'Current State', hKey: 'now', timeLabel: 'Live Baseline (t₀)', isLive: true },
                      { horizon: 'In 6 Hours', hKey: '6h', timeLabel: 'Next Shift (+6h)', isLive: false },
                      { horizon: 'After 1 Day (24h)', hKey: '24h', timeLabel: 'Tomorrow Outlook (+24h)', isLive: false }
                    ].map(h => {
                      let batt, power, temp, bDelta, pDelta, tDelta;
                      if (h.isLive) {
                        batt = energy.batteryPercent;
                        power = energy.consumption;
                        temp = isBharati ? 69.8 : 78.4;
                        bDelta = 0;
                        pDelta = 0;
                        tDelta = 0;
                      } else {
                        batt = aiInsightsData.prediction?.[`battery_${h.hKey}`] ?? 78.0;
                        power = aiInsightsData.prediction?.[`power_${h.hKey}`] ?? 109.0;
                        temp = aiInsightsData.prediction?.[`generator_temp_${h.hKey}`] ?? (isBharati ? 71.5 : 82.5);
                        bDelta = (batt - energy.batteryPercent).toFixed(1);
                        pDelta = (power - energy.consumption).toFixed(1);
                        tDelta = (temp - (isBharati ? 69.8 : 78.4)).toFixed(1);
                      }

                      return (
                        <div key={h.hKey} className="energy-diag-panel" style={{ 
                          background: h.isLive ? 'rgba(30, 41, 59, 0.75)' : h.hKey === '6h' ? 'rgba(2, 132, 199, 0.14)' : 'rgba(245, 158, 11, 0.12)', 
                          border: h.isLive ? '1px solid rgba(255,255,255,0.1)' : h.hKey === '6h' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                          padding: '12px' 
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: h.isLive ? '#e2e8f0' : h.hKey === '6h' ? '#146b80' : '#946013' }}>
                              {h.horizon}
                            </span>
                            <span style={{ fontSize: '0.58rem', color: '#536579', background: 'rgba(227, 234, 239, 0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                              {h.timeLabel}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Battery */}
                            <div style={{ background: 'rgba(2, 132, 199, 0.1)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(2, 132, 199, 0.25)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.58rem', color: '#536579' }}>BATTERY RESERVE</span>
                                {!h.isLive && (
                                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: bDelta >= 0 ? '#187451' : '#946013' }}>
                                    {bDelta >= 0 ? `+${bDelta}%` : `${bDelta}%`}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: batt < 65 ? '#946013' : '#187451' }}>{batt}%</div>
                            </div>

                            {/* Power Draw */}
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.58rem', color: '#536579' }}>POWER DEMAND</span>
                                {!h.isLive && (
                                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#536579' }}>
                                    {pDelta >= 0 ? `+${pDelta} kW` : `${pDelta} kW`}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#946013' }}>{power} kW</div>
                            </div>

                            {/* Generator Core Temp */}
                            <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.58rem', color: '#536579' }}>GENERATOR CORE TEMP</span>
                                {!h.isLive && (
                                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: tDelta >= 0 ? '#946013' : '#187451' }}>
                                    {tDelta >= 0 ? `+${tDelta}°C` : `${tDelta}°C`}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: temp >= 85 ? '#b73b37' : '#e2e8f0' }}>{temp}°C</div>
                              <span style={{ fontSize: '0.55rem', color: temp >= 95 ? '#b73b37' : temp >= 85 ? '#946013' : '#187451' }}>
                                {temp >= 95 ? 'CRITICAL THERMAL RUNAWAY (>95°C)' : temp >= 85 ? 'HIGH TEMP WARNING (≥85°C)' : '✓ Normal Thermal Margin'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dual Risk Analysis Matrix */}
                  <div className="energy-diag-2col-grid">
                    <div className="energy-diag-panel">
                      <span className="energy-diag-panel-title">
                        <Cpu size={14} /> Generator Thermal Risk Assessment
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.68rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Thermal Risk Status:</span>
                          <span className={`ai-pred-badge ${(aiInsightsData.generator_risk || 'NORMAL').toLowerCase()}`}>
                            {aiInsightsData.generator_risk || 'NORMAL'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#536579' }}>
                          <span>Warning Level Threshold:</span>
                          <span style={{ color: '#946013', fontWeight: 600 }}>85.0°C</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#536579' }}>
                          <span>Critical Shutdown Threshold:</span>
                          <span style={{ color: '#b73b37', fontWeight: 600 }}>95.0°C</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#536579' }}>
                          <span>Predicted 24h Peak Core:</span>
                          <span style={{ fontWeight: 700, color: '#1d3044' }}>{aiInsightsData.prediction?.generator_temp_24h ?? 83.4}°C</span>
                        </div>
                      </div>
                    </div>

                    <div className="energy-diag-panel">
                      <span className="energy-diag-panel-title">
                        <BatteryCharging size={14} /> Energy &amp; Battery Reserve Risk Assessment
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.68rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Energy Grid Risk Status:</span>
                          <span className={`ai-pred-badge ${(aiInsightsData.energy_risk || 'NORMAL').toLowerCase()}`}>
                            {aiInsightsData.energy_risk || 'NORMAL'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#536579' }}>
                          <span>Battery Reserve Warning Threshold:</span>
                          <span style={{ color: '#946013', fontWeight: 600 }}>&lt; 65.0%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#536579' }}>
                          <span>Battery Critical Depletion Threshold:</span>
                          <span style={{ color: '#b73b37', fontWeight: 600 }}>&lt; 38.0%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#536579' }}>
                          <span>Predicted 24h Charge:</span>
                          <span style={{ fontWeight: 700, color: '#187451' }}>{aiInsightsData.prediction?.battery_24h ?? 78.3}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 1: Grid Balance & Executive Synthesis */}
              {modalTab === 'overview' && (
                <>
                  <div className="energy-diag-callout">
                    <div className="energy-diag-callout-icon">
                      <Bot size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.74rem', fontWeight: '800', color: '#146b80', margin: '0 0 4px 0' }}>
                         Microgrid operating summary
                      </h4>
                      <p className="energy-diag-callout-text">
                        {aiInsightsData.summary}
                      </p>
                    </div>
                  </div>

                  <div className="energy-diag-2col-grid">
                    <div className="energy-diag-panel">
                      <span className="energy-diag-panel-title">
                        <Zap size={14} /> Active Generation Sources Matrix ({stationData.name})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(energy.sources || {}).map(([key, src]) => (
                          <div key={key} style={{
                            background: '#f4f7f9',
                            border: '1px solid rgba(56, 189, 248, 0.15)',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1d3044' }}>{src.name}</div>
                              <div style={{ fontSize: '0.62rem', color: '#536579' }}>{src.runtime}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className="mono-num" style={{ fontSize: '0.76rem', fontWeight: '800', color: '#146b80' }}>
                                {src.current} kW <span style={{ fontSize: '0.6rem', color: '#64748b' }}>/ {src.max} kW</span>
                              </div>
                              <div style={{ fontSize: '0.6rem', color: '#187451', fontWeight: '700' }}>{src.loadPct}% Load</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="energy-diag-panel">
                      <span className="energy-diag-panel-title">
                        <Activity size={14} /> Subsystem Load Distribution Breakdown
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(energy.breakdown || []).map((b, idx) => (
                          <div key={idx} style={{
                            background: '#f4f7f9',
                            border: '1px solid rgba(56, 189, 248, 0.15)',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: b.color }} />
                              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1d3044' }}>{b.name}</span>
                            </div>
                            <div className="mono-num" style={{ fontSize: '0.74rem', fontWeight: '700', color: '#1d3044' }}>
                              {b.kw} kW ({b.pct}%)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: Generator Thermal & Stator Health */}
              {modalTab === 'generators' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="energy-diag-gen-row">
                    <div className="energy-diag-gen-header">
                      <div className="energy-diag-gen-name">
                        {isBharati ? 'CHP Generator 1 (Combined Heat & Power)' : 'Diesel Generator G-01 (Baseload Prime)'}
                      </div>
                      <span className="energy-diag-gen-status optimal">ONLINE • OPTIMAL</span>
                    </div>
                    <div className="energy-diag-gen-metrics-row">
                      <div>
                        <span className="energy-diag-gen-m-lbl">Core Temperature</span>
                        <span className="energy-diag-gen-m-val mono-num" style={{ color: '#187451' }}>{isBharati ? '71.5°C' : '68.2°C'}</span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Warning Limit</span>
                        <span className="energy-diag-gen-m-val mono-num">85.0°C</span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Stator Vibration</span>
                        <span className="energy-diag-gen-m-val mono-num">1.8 mm/s (Norm)</span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Glycol Flow</span>
                        <span className="energy-diag-gen-m-val mono-num">42.4 L/min</span>
                      </div>
                    </div>
                    <div className="energy-diag-thermal-bar-wrap">
                      <div className="energy-diag-thermal-bar-fill optimal" style={{ width: isBharati ? '71.5%' : '68.2%' }} />
                    </div>
                  </div>

                  <div className="energy-diag-gen-row">
                    <div className="energy-diag-gen-header">
                      <div className="energy-diag-gen-name">
                        {isBharati ? 'CHP Generator 2 (Peak Synchronized)' : 'Diesel Generator G-02 (Secondary Continuous)'}
                      </div>
                      <span className={`energy-diag-gen-status ${isBharati ? 'optimal' : 'warning'}`}>
                        {isBharati ? 'ONLINE • OPTIMAL' : 'ELEVATED THERMAL ADVISORY'}
                      </span>
                    </div>
                    <div className="energy-diag-gen-metrics-row">
                      <div>
                        <span className="energy-diag-gen-m-lbl">Core Temperature</span>
                        <span className="energy-diag-gen-m-val mono-num" style={{ color: isBharati ? '#187451' : '#946013' }}>
                          {isBharati ? '69.8°C' : '78.4°C'}
                        </span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Warning Limit</span>
                        <span className="energy-diag-gen-m-val mono-num">85.0°C (Margin +6.6°C)</span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Stator Vibration</span>
                        <span className="energy-diag-gen-m-val mono-num">{isBharati ? '2.1 mm/s (Norm)' : '2.4 mm/s (+3.4% trend)'}</span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Glycol Flow</span>
                        <span className="energy-diag-gen-m-val mono-num">38.1 L/min</span>
                      </div>
                    </div>
                    <div className="energy-diag-thermal-bar-wrap">
                      <div className={`energy-diag-thermal-bar-fill ${isBharati ? 'optimal' : 'warning'}`} style={{ width: isBharati ? '69.8%' : '78.4%' }} />
                    </div>
                  </div>

                  <div className="energy-diag-gen-row">
                    <div className="energy-diag-gen-header">
                      <div className="energy-diag-gen-name">
                        {isBharati ? 'Auxiliary Generator 3 (Cold Emergency Standby)' : 'Diesel Generator G-03 (Cold Standby)'}
                      </div>
                      <span className="energy-diag-gen-status optimal" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#146b80', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                        READY FOR AUTO-CRANK (15s)
                      </span>
                    </div>
                    <div className="energy-diag-gen-metrics-row">
                      <div>
                        <span className="energy-diag-gen-m-lbl">Block Pre-Heater</span>
                        <span className="energy-diag-gen-m-val mono-num" style={{ color: '#187451' }}>+45.0°C (Active)</span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Starter Battery</span>
                        <span className="energy-diag-gen-m-val mono-num">27.6 V (Float)</span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Lube Oil Sump</span>
                        <span className="energy-diag-gen-m-val mono-num">100% Full</span>
                      </div>
                      <div>
                        <span className="energy-diag-gen-m-lbl">Auto-Bus Sync</span>
                        <span className="energy-diag-gen-m-val mono-num" style={{ color: '#187451' }}>ARMED</span>
                      </div>
                    </div>
                  </div>

                  <div className="energy-diag-directive-card warning">
                    <ShieldAlert size={16} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div className="energy-diag-dir-title">Thermal balancing advisory</div>
                      <p className="energy-diag-dir-desc">
                        {isBharati 
                          ? 'CHP heat-recovery loops are effectively warming living habitat glycol circuits. Maintain 65 kW baseload dispatch.'
                          : 'Rotate baseload dispatch to Generator G-01 during high katabatic wind intervals to allow G-02 stator thermal dissipation before warning limit (85°C).'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BESS & Arctic Fuel Reserves */}
              {modalTab === 'storage' && (
                <div className="energy-diag-2col-grid">
                  <div className="energy-diag-panel">
                    <span className="energy-diag-panel-title">
                      <BatteryCharging size={14} /> Battery Energy Storage System (BESS)
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>State of Charge (SOC)</span>
                        <span className="mono-num" style={{ fontSize: '0.85rem', fontWeight: '800', color: '#187451' }}>{energy.batteryPercent}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Usable Energy Storage</span>
                        <span className="mono-num" style={{ fontSize: '0.74rem', color: '#1d3044' }}>{energy.batteryChargeKWh} / {energy.batteryCapacityKWh}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>State of Health (SOH)</span>
                        <span className="mono-num" style={{ fontSize: '0.74rem', color: '#187451' }}>94.2%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Inverter Bus Efficiency</span>
                        <span className="mono-num" style={{ fontSize: '0.74rem', color: '#146b80' }}>96.8% (400V 3Φ 50Hz)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Peak-Shaving Buffer</span>
                        <span className="mono-num" style={{ fontSize: '0.74rem', color: '#187451' }}>ARMED ({isBharati ? 'ISRO Radome Pass' : 'Storm Gale'})</span>
                      </div>
                    </div>
                  </div>

                  <div className="energy-diag-panel">
                    <span className="energy-diag-panel-title">
                      <Fuel size={14} /> Arctic Diesel Logistics &amp; Depletion Model
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Total Usable Fuel</span>
                        <span className="mono-num" style={{ fontSize: '0.85rem', fontWeight: '800', color: '#946013' }}>{energy.fuelLiters}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Daily Burn Rate</span>
                        <span className="mono-num" style={{ fontSize: '0.74rem', color: '#1d3044' }}>{energy.dailyUsageL} / day</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Projected Operational Runway</span>
                        <span className="mono-num" style={{ fontSize: '0.74rem', color: '#187451' }}>{energy.fuelDays}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Tank Storage Capacity</span>
                        <span className="mono-num" style={{ fontSize: '0.74rem', color: '#146b80' }}>{energy.fuelBarPercent}% Full</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Resupply Window Risk</span>
                        <span className="mono-num" style={{ fontSize: '0.74rem', color: '#187451' }}>LOW (Exceeds 35-day winter min)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Subsystems & Environmental Telemetry */}
              {modalTab === 'subsystems' && (
                <div className="energy-diag-2col-grid">
                  <div className="energy-diag-panel">
                    <span className="energy-diag-panel-title">
                      <Building2 size={14} /> Station Critical Subsystem Loads
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ background: '#f4f7f9', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1d3044' }}>
                          {isBharati ? 'ISRO Satellite Ground Station Radome' : 'Lake Priyadarshini Water Intake Heating'}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#187451', marginTop: '2px' }}>
                          {isBharati ? '50 kW continuous with 15 kW tracking burst buffer' : '8 kW anti-freeze trace heating nominal'}
                        </div>
                      </div>

                      <div style={{ background: '#f4f7f9', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1d3044' }}>
                          {isBharati ? 'Seawater Reverse Osmosis Desalination' : 'Habitation & Environmental Life Support'}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#146b80', marginTop: '2px' }}>
                          {isBharati ? '24 kW load maintaining 4,200 L daily potable output' : '44 kW base habitation electrical draw'}
                        </div>
                      </div>

                      <div style={{ background: '#f4f7f9', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1d3044' }}>
                          Scientific &amp; Analytical Research Labs
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#705296', marginTop: '2px' }}>
                          {isBharati ? '21 kW (Oceanography, Seismology & Atmospheric Physics)' : '19 kW (Atmospheric Physics, Geomagnetism & Biology)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="energy-diag-panel">
                    <span className="energy-diag-panel-title">
                      <Wind size={14} /> Environmental Telemetry Synchronized
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Ambient Surface Temperature</span>
                        <span className="mono-num" style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1d3044' }}>{weather.temp}{weather.unit}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Katabatic Wind Velocity</span>
                        <span className="mono-num" style={{ fontSize: '0.72rem', fontWeight: '700', color: '#146b80' }}>{weather.windSpeed} ({weather.windDir})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Atmospheric Barometric Pressure</span>
                        <span className="mono-num" style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1d3044' }}>{weather.pressure}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                        <span style={{ fontSize: '0.68rem', color: '#536579' }}>Calculated Surface Wind Chill</span>
                        <span className="mono-num" style={{ fontSize: '0.72rem', fontWeight: '700', color: '#146b80' }}>{isBharati ? '-28.6°C Wind Chill' : '-32.1°C Wind Chill'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: What-If Dynamic Stress Simulation */}
              {modalTab === 'whatif' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <WhatIfSimulator 
                    selectedStation={selectedStation}
                    onOpenReport={(reportObj) => {
                      setInsightModalOpen(false);
                      if (onOpenReport) onOpenReport(reportObj);
                    }}
                  />
                </div>
              )}

              {/* TAB 6: Engineering Directives & Automation Controls */}
              {modalTab === 'directives' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#146b80', marginBottom: '4px' }}>
                    Prioritized microgrid actions
                  </span>
                  {(aiInsightsData.recommendations || []).map((rec, idx) => (
                    <div key={idx} className="energy-diag-directive-card optimal">
                      <CheckCircle2 size={16} className="text-green" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div className="energy-diag-dir-title">Operational Directive #{idx + 1}</div>
                        <p className="energy-diag-dir-desc">{rec}</p>
                      </div>
                      <button 
                        className="energy-diag-btn-secondary"
                        style={{ fontSize: '0.62rem', padding: '3px 8px', alignSelf: 'center' }}
                        onClick={() => handleExecuteMitigation(`Directive #${idx + 1}`)}
                      >
                        Apply Directive
                      </button>
                    </div>
                  ))}

                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                      className="energy-diag-btn-primary"
                      onClick={() => handleExecuteMitigation(isBharati ? 'BESS Satellite Burst Buffer Armed' : 'Generator G-02 Thermal Relief Dispatched')}
                    >
                      <Play size={12} style={{ marginRight: '5px', display: 'inline' }} />
                      {isBharati ? 'Arm BESS Peak-Shaving Buffer' : 'Dispatch Generator G-02 Thermal Relief'}
                    </button>
                    <button 
                      className="energy-diag-btn-secondary"
                      onClick={() => handleExecuteMitigation(isBharati ? 'Seawater Desal Glycol Balance' : 'Lake Priyadarshini Anti-Freeze Verify')}
                    >
                      <Check size={12} style={{ marginRight: '5px', display: 'inline' }} />
                      {isBharati ? 'Verify Desal Glycol Balance' : 'Verify Priyadarshini Lake Trace Continuity'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="energy-diag-footer">
              <div className="energy-diag-footer-left">
                <Shield size={13} className="text-cyan" />
                <span>POLARIS Microgrid Engine v2.4 • Live Telemetry Link Active {lastAnalyzedAt ? `• Last Scanned ${lastAnalyzedAt}` : ''}</span>
              </div>
              <div className="energy-diag-footer-right">
                <button className="energy-diag-btn-secondary" onClick={handleCopyDiagnosticReport}>
                  <Copy size={12} style={{ marginRight: '4px', display: 'inline' }} />
                  {copiedReport ? 'Copied to Clipboard!' : 'Copy Summary'}
                </button>
                <button className="energy-diag-btn-primary" onClick={() => setInsightModalOpen(false)}>
                  Done / Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
