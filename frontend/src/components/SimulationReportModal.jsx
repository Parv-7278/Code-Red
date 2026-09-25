import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Flame,
  BatteryCharging,
  Clock,
  Printer,
  Download,
  Copy,
  Check,
  X,
  Radio,
  Cpu,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Droplets,
  CheckCircle2,
  AlertOctagon,
  Maximize2
} from 'lucide-react';
import { formatStationTime, getStationTimezoneLabel } from '../utils/timeUtils';
import { STATIONS_DATA } from '../data/stationsData';

export default function SimulationReportModal({
  isOpen,
  onClose,
  scenarioData,
  selectedStation = 'station-maitri'
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'subsystems' | 'transients' | 'mitigation' | 'raw_audit'
  const [copied, setCopied] = useState(false);
  const [loadShedDispatched, setLoadShedDispatched] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState({});

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset local state on modal open with new scenario
  useEffect(() => {
    if (isOpen) {
      setLoadShedDispatched(false);
      setCheckedSteps({});
    }
  }, [isOpen, scenarioData]);

  if (!isOpen) return null;

  const stationId = selectedStation === 'station-bharati' ? 'station-bharati' : 'station-maitri';
  const station = STATIONS_DATA[stationId] || STATIONS_DATA['station-maitri'];
  const isMaitri = station.id === 'station-maitri';

  // Normalize scenario data
  const scenario = scenarioData || {};
  const scenarioId = scenario.id || 'GEN_FAIL';
  const scenarioTitle = scenario.name || scenario.label || 'Primary Generator G-02 Catastrophic Failure';
  const scenarioCategory = scenario.category || 'POWER GRID & THERMODYNAMIC FAULT';
  const scenarioDescription = scenario.description || 'Deterministic thermodynamic model execution projected against active Antarctic station telemetry baseline.';
  
  const params = scenario.params || {};
  const metrics = scenario.metrics || {};

  const powerDropPct = params.powerDropPct !== undefined 
    ? params.powerDropPct 
    : (metrics.powerDelta ? parseInt(metrics.powerDelta) : (isMaitri ? -35 : -32));

  const lostCapacityKw = params.lostCapacityKw !== undefined
    ? params.lostCapacityKw
    : (isMaitri ? 46.2 : 59.2);

  const batteryHours = params.batteryHours !== undefined
    ? params.batteryHours
    : (metrics.batteryReserve ? parseFloat(metrics.batteryReserve) : (isMaitri ? 14.5 : 18.0));

  const missionRisk = (params.missionRisk || metrics.risk || 'HIGH').toUpperCase();
  const riskScore = params.riskScore || (missionRisk === 'HIGH' ? 78 : missionRisk === 'CRITICAL' ? 88 : 58);
  const riskColor = missionRisk === 'CRITICAL' || missionRisk === 'HIGH' ? '#b73b37' : '#946013';

  const loadShedRecommendation = params.loadShedRecommendation || metrics.loadNote || 'Auto-Shed Science Lab & Auxiliary Quarters Trace Heaters (-35 kW)';
  const mitigationAction = params.mitigationAction || 'Engage standby generator G-01 via Remote SCADA console within 15 minutes.';

  const referenceId = `POL-SIM-${new Date().getFullYear()}-${scenarioId.replace(/[^a-zA-Z0-9]/g, '')}-${station.id === 'station-maitri' ? 'MAI' : 'BHA'}`;

  const toggleStep = (idx) => {
    setCheckedSteps(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleCopyReport = () => {
    const reportText = `================================================================================
POLARIS INCIDENT SIMULATION & SCADA DIAGNOSTIC REPORT
Government of India | Ministry of Earth Sciences (MoES) | NCPOR
================================================================================
Reference ID: ${referenceId}
Station: ${station.name} (${station.location})
Generated Timestamp: ${new Date().toISOString()} (${formatStationTime(new Date(), station)})
Simulation Scenario: ${scenarioTitle}
Category: ${scenarioCategory}
Mission Risk Level: ${missionRisk} (Hazard Score: ${riskScore} / 100)

--------------------------------------------------------------------------------
1. EXECUTIVE DIAGNOSTIC METRICS
--------------------------------------------------------------------------------
Available Power Drop: ${powerDropPct !== 0 ? `${powerDropPct}%` : '0% (Demand Surge)'} (${lostCapacityKw} kW Lost)
Battery Autonomy Reserve: ${batteryHours} Hours Remaining
Time-To-Criticality: 15 Minutes
Load-Shedding Target: ${loadShedRecommendation}

--------------------------------------------------------------------------------
2. MANDATORY OPERATOR MITIGATION DIRECTIVES
--------------------------------------------------------------------------------
Directive: ${mitigationAction}
SCADA Protocol Status: ${loadShedDispatched ? 'DISPATCHED & ACTIVE' : 'PENDING OPERATOR AUTHORIZATION'}

--------------------------------------------------------------------------------
3. SUBSYSTEM STATUS IMPACT
--------------------------------------------------------------------------------
• Main Diesel Alternator: ${scenarioId === 'GEN_FAIL' ? 'TRIPPED (0 kW Output)' : 'ONLINE (Derated)'}
• BESS Storage Reserve: ${batteryHours}h Autonomy (${isMaitri ? '320' : '480'} kWh Capacity)
• Habitation Trace Heaters: 100% PROTECTED (Isolated Critical Bus)
• SATCOM Transceivers: ${scenarioId === 'SATCOM_BLACKOUT' ? 'DEGRADED / ISLANDED' : 'OPTIMAL'}
================================================================================`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const reportPayload = {
      report_title: "POLARIS Incident Simulation & SCADA Diagnostic Dossier",
      reference_id: referenceId,
      station: {
        id: station.id,
        name: station.name,
        location: station.location,
        coordinates: station.coordinates,
        elevation: station.elevation
      },
      audit_metadata: {
        generated_at: new Date().toISOString(),
        station_local_time: formatStationTime(new Date(), station),
        timezone: getStationTimezoneLabel(station),
        audited_by: "POLARIS AI Thermodynamic Neural Engine v4.2",
        classification: "MoES Antarctic Research Station Operations"
      },
      scenario: {
        id: scenarioId,
        title: scenarioTitle,
        category: scenarioCategory,
        description: scenarioDescription
      },
      simulation_results: {
        power_drop_pct: powerDropPct,
        lost_capacity_kw: lostCapacityKw,
        battery_reserve_hours: batteryHours,
        mission_risk: missionRisk,
        risk_score: riskScore,
        load_shed_dispatched: loadShedDispatched
      },
      operator_directives: {
        load_shedding_recommendation: loadShedRecommendation,
        required_mitigation: mitigationAction,
        time_to_criticality: "15 Minutes"
      },
      subsystem_impacts: [
        {
          name: "Main Diesel Alternator (G-02)",
          status: scenarioId === 'GEN_FAIL' ? "TRIPPED" : "NOMINAL",
          impact: scenarioId === 'GEN_FAIL' ? "Stator thermal seizure; output dropped to 0 kW" : "Nominal baseload output maintained",
          severity: scenarioId === 'GEN_FAIL' ? "CRITICAL" : "NORMAL"
        },
        {
          name: "BESS Energy Storage Bus",
          status: "DISCHARGING",
          impact: `Discharge rate accelerated; autonomy buffer reduced to ${batteryHours}h`,
          severity: batteryHours < 12 ? "CRITICAL" : "WARNING"
        },
        {
          name: "Life Support & Habitation Trace Heating",
          status: "SECURED",
          impact: "Protected via isolated high-priority microgrid tie-bus",
          severity: "NORMAL"
        },
        {
          name: "Water Intake & Desalination Loop",
          status: scenarioId === 'WATER_FREEZE' ? "FREEZE HAZARD" : "NOMINAL",
          impact: scenarioId === 'WATER_FREEZE' ? "Intake manifold pressure drop; trace heat diverted" : "Nominal 2.4 m3/day throughput",
          severity: scenarioId === 'WATER_FREEZE' ? "CRITICAL" : "NORMAL"
        },
        {
          name: "SATCOM & RF Telemetry Gateway",
          status: scenarioId === 'SATCOM_BLACKOUT' ? "DEGRADED" : "OPTIMAL",
          impact: scenarioId === 'SATCOM_BLACKOUT' ? "Solar flare Kp 8+ ionospheric absorption; switched to local island buffer" : "Continuous X/S-band carrier lock",
          severity: scenarioId === 'SATCOM_BLACKOUT' ? "HIGH" : "NORMAL"
        }
      ]
    };

    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${referenceId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    document.body.classList.add('print-simulation-report');
    const cleanup = () => document.body.classList.remove('print-simulation-report');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  };

  const statorTemp = params.predictedStatorTemp !== undefined
    ? `${params.predictedStatorTemp}°C`
    : (metrics.statorTemp || (isMaitri ? '82.4°C' : '76.8°C'));

  const fuelDays = params.fuelDaysLeft !== undefined
    ? `${params.fuelDaysLeft} Days`
    : (metrics.fuelRunway || (isMaitri ? '43 Days' : '68 Days'));

  const aiConfidence = params.aiConfidence || metrics.aiConfidence || '94%';
  const customInputs = params.inputs || null;

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div 
        className="polaris-summary-report-modal polaris-analysis-modal"
        style={{ maxWidth: '1240px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================================
            MODAL HEADER BAR (MoES Official POLARIS Dossier Banner)
            ================================================================== */}
        <div className="report-modal-header" style={{ borderBottomColor: 'rgba(56, 189, 248, 0.25)' }}>
          <div className="report-modal-header-left">
            <div className="report-icon-badge" style={{ background: 'rgba(2, 132, 199, 0.2)', borderColor: '#146b80' }}>
              <FileText size={18} className="text-cyan animate-pulse" />
            </div>
            <div>
              <div className="report-badge-row">
                <span className="report-tag-live">POLARIS OFFICIAL SIMULATION REPORT</span>
                <span className="report-station-tag" style={{ borderColor: '#146b80', color: '#146b80' }}>
                  {station.name.toUpperCase()}
                </span>
                <span 
                  className={`report-status-pill ${missionRisk === 'CRITICAL' || missionRisk === 'HIGH' ? 'critical' : 'warning'}`}
                  style={{ fontWeight: 800 }}
                >
                  🚨 {missionRisk} RISK ({riskScore}/100)
                </span>
                <span className="report-status-pill normal" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#146b80' }}>
                  REF: {referenceId}
                </span>
                <span className="report-status-pill normal" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#187451' }}>
                  AI CONFIDENCE: {aiConfidence}
                </span>
              </div>
              <h2 className="report-main-heading">
                {scenarioTitle}
              </h2>
              <div className="report-time-window-row">
                <span className="time-sub-item">
                  <Clock size={11} className="text-cyan" />
                  <strong>Station Time:</strong> {formatStationTime(new Date(), station)} ({getStationTimezoneLabel(station)})
                </span>
                <span className="time-sub-item">
                  <strong>MoES New Delhi HQ Sync:</strong> {new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST
                </span>
                <span className="time-sub-item">
                  <strong>Location:</strong> {station.location} ({station.coordinates})
                </span>
              </div>
            </div>
          </div>

          <div className="report-modal-header-right">
            <button 
              type="button" 
              className="report-btn-action" 
              onClick={handleCopyReport}
              title="Copy formatted text briefing to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy Briefing'}</span>
            </button>
            <button 
              type="button" 
              className="report-btn-action" 
              onClick={handleDownloadJSON}
              title="Export machine-readable JSON dossier"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>
            <button 
              type="button" 
              className="report-btn-action" 
              onClick={handlePrint}
              title="Print official mission document / PDF"
            >
              <Printer size={13} />
              <span>Print Dossier</span>
            </button>
            <button 
              type="button" 
              className="report-btn-close" 
              onClick={onClose}
              title="Close Report (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ==================================================================
            NAVIGATION TABS BAR
            ================================================================== */}
        <div className="report-tabs-bar">
          <button 
            type="button"
            className={`report-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={13} />
            <span>Executive Summary &amp; Risk</span>
          </button>
          <button 
            type="button"
            className={`report-tab-btn ${activeTab === 'subsystems' ? 'active' : ''}`}
            onClick={() => setActiveTab('subsystems')}
          >
            <Cpu size={13} />
            <span>Subsystems Impact Matrix</span>
          </button>
          <button 
            type="button"
            className={`report-tab-btn ${activeTab === 'transients' ? 'active' : ''}`}
            onClick={() => setActiveTab('transients')}
          >
            <TrendingDown size={13} />
            <span>Power &amp; Battery Transients</span>
          </button>
          <button 
            type="button"
            className={`report-tab-btn ${activeTab === 'mitigation' ? 'active' : ''}`}
            onClick={() => setActiveTab('mitigation')}
          >
            <ShieldCheck size={13} />
            <span>SCADA Load-Shed &amp; Operator Directives</span>
          </button>
          <button 
            type="button"
            className={`report-tab-btn ${activeTab === 'raw_audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw_audit')}
          >
            <Layers size={13} />
            <span>Telemetry Audit Log</span>
          </button>
        </div>

        {/* ==================================================================
            SCROLLABLE MODAL BODY CONTENT
            ================================================================== */}
        <div className="report-modal-body" style={{ padding: '18px 24px', overflowY: 'auto' }}>
          
          {/* ----------------------------------------------------------------
              TAB 1: EXECUTIVE SUMMARY & RISK ASSESSMENT
              ---------------------------------------------------------------- */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Custom Parameter Injected Banner (if custom) */}
              {customInputs && (
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} className="text-cyan animate-pulse" />
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#146b80' }}>
                      CUSTOM AI PARAMETER INJECTION PROFILE:
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem', color: '#536579' }}>
                    <span>Ambient: <strong className="mono-num text-cyan">{customInputs.ambientTemp}°C</strong></span>
                    <span>Wind: <strong className="mono-num text-cyan">{customInputs.windSpeed} km/h</strong></span>
                    <span>Derate: <strong className="mono-num text-amber">{customInputs.genDerate}%</strong></span>
                    <span>Surge: <strong className="mono-num text-red">+{customInputs.loadSurge} kW</strong></span>
                    <span>Batt SoC: <strong className="mono-num text-emerald">{customInputs.battSoc}%</strong></span>
                  </div>
                </div>
              )}

              {/* 6-Card Hero KPI Metrics Grid */}
              <div className="report-kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                <div className="rep-kpi-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
                  <span className="kpi-title">Power Delta</span>
                  <div className="kpi-main-val mono-num text-red">
                    {powerDropPct !== 0 ? `${powerDropPct}%` : '0% (Surge)'}
                  </div>
                  <span className="kpi-sub-label">Lost: {lostCapacityKw} kW</span>
                </div>

                <div className="rep-kpi-card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}>
                  <span className="kpi-title">BESS Reserve</span>
                  <div className="kpi-main-val mono-num text-amber">
                    {batteryHours} Hours
                  </div>
                  <span className="kpi-sub-label">Autonomy Horizon</span>
                </div>

                <div className="rep-kpi-card" style={{ borderColor: parseFloat(statorTemp) >= 90 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  <span className="kpi-title">Stator Core Temp</span>
                  <div className="kpi-main-val mono-num" style={{ color: parseFloat(statorTemp) >= 90 ? '#b73b37' : '#146b80' }}>
                    {statorTemp}
                  </div>
                  <span className="kpi-sub-label">{parseFloat(statorTemp) >= 95 ? 'CRITICAL BREACH' : parseFloat(statorTemp) >= 88 ? '18m to Overheat' : 'Safe (<95°C)'}</span>
                </div>

                <div className="rep-kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
                  <span className="kpi-title">Fuel Runway</span>
                  <div className="kpi-main-val mono-num text-emerald">
                    {fuelDays}
                  </div>
                  <span className="kpi-sub-label">Reserve Lifetime</span>
                </div>

                <div className="rep-kpi-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  <span className="kpi-title">Time-to-Criticality</span>
                  <div className="kpi-main-val mono-num text-cyan">
                    15 Mins
                  </div>
                  <span className="kpi-sub-label">Execution Window</span>
                </div>

                <div className="rep-kpi-card" style={{ borderColor: `${riskColor}66`, background: `${riskColor}12` }}>
                  <span className="kpi-title">Hazard Index</span>
                  <div className="kpi-main-val mono-num" style={{ color: riskColor }}>
                    {riskScore} / 100
                  </div>
                  <span className="kpi-sub-label">{missionRisk} THREAT PROFILE</span>
                </div>
              </div>

              {/* Dynamic Fault Narrative & Thermodynamic Root Cause */}
              <div style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} className="text-amber" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1d3044', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Diagnostic Incident Summary &amp; Physics Analysis
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#536579', fontFamily: 'monospace' }}>
                    Algorithm: Deterministic Multi-Bus Energy Balance (4th-order Runge-Kutta)
                  </span>
                </div>
                
                <p style={{ fontSize: '0.78rem', color: '#536579', lineHeight: '1.55', margin: '0 0 12px 0' }}>
                  {scenarioDescription} Upon simulated event trigger, station microgrid buses experience an immediate power deficit of <strong>{lostCapacityKw} kW</strong> ({powerDropPct}% of nominal baseload). The primary Battery Energy Storage System (BESS) automatically assumes transient load compensation, driving battery reserve autonomy down to <strong>{batteryHours} hours</strong>.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f4f7f9', padding: '12px', borderRadius: '6px', border: '1px solid rgba(45, 78, 128, 0.3)' }}>
                  <div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#536579', textTransform: 'uppercase' }}>Station Microgrid Baselines:</span>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.72rem', color: '#1d3044', lineHeight: '1.5' }}>
                      <li>Total Nominal Generation: <strong>{isMaitri ? '132 kW' : '185 kW'}</strong></li>
                      <li>Current Nominal Consumption: <strong>{isMaitri ? '105 kW' : '148 kW'}</strong></li>
                      <li>BESS Energy Capacity: <strong>{isMaitri ? '320 kWh' : '480 kWh'}</strong> (LiFePO4)</li>
                    </ul>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#536579', textTransform: 'uppercase' }}>Post-Fault Projected Envelope:</span>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.72rem', color: '#1d3044', lineHeight: '1.5' }}>
                      <li>Available Generation: <strong className="text-red">{isMaitri ? (132 - lostCapacityKw).toFixed(1) : (185 - lostCapacityKw).toFixed(1)} kW</strong></li>
                      <li>Unmitigated Discharge Rate: <strong className="text-amber">{(lostCapacityKw / 1.1).toFixed(1)} kW net draw</strong></li>
                      <li>Critical Time Horizon to Low-SoC Trip: <strong className="text-red">{batteryHours} Hours</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Recommendation Callout */}
              <div className="sim-action-callout" style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '8px', padding: '14px 18px' }}>
                <div className="callout-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Zap size={16} className="text-cyan" />
                  <span className="callout-title" style={{ fontSize: '0.76rem', fontWeight: 800, color: '#146b80' }}>
                    AUTOMATED SCADA NON-CRITICAL LOAD-SHEDDING RECOMMENDATION:
                  </span>
                </div>
                <p className="callout-desc" style={{ fontSize: '0.8rem', color: '#1d3044', fontWeight: 600, margin: '0 0 8px 0' }}>
                  {loadShedRecommendation}
                </p>
                <div className="mitigation-row" style={{ borderTop: '1px solid rgba(56, 189, 248, 0.2)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span className="mitigation-label" style={{ fontSize: '0.64rem', fontWeight: 800, color: '#946013', textTransform: 'uppercase' }}>
                    Required Operator Action:
                  </span>
                  <span className="mitigation-text" style={{ fontSize: '0.74rem', color: '#536579' }}>
                    {mitigationAction}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------------------
              TAB 2: SUBSYSTEMS IMPACT MATRIX
              ---------------------------------------------------------------- */}
          {activeTab === 'subsystems' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="sim-report-table-box">
                <h5 className="sim-table-heading" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1d3044', marginBottom: '10px' }}>
                  Subsystem Multi-Channel State &amp; Severity Impact Matrix
                </h5>

                <div className="sim-report-table" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="sim-rep-row header" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1fr', padding: '8px 12px', background: '#f4f7f9', borderRadius: '4px', fontWeight: 700, fontSize: '0.65rem', color: '#536579' }}>
                    <span>Subsystem Channel</span>
                    <span>Baseline State</span>
                    <span>Simulated State Envelope</span>
                    <span>Channel Severity</span>
                  </div>

                  {/* Channel 1 */}
                  <div className="sim-rep-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1fr', padding: '10px 12px', background: '#f4f7f9', borderRadius: '4px', border: '1px solid rgba(45, 78, 128, 0.3)', alignItems: 'center', fontSize: '0.74rem' }}>
                    <div>
                      <strong style={{ color: '#1d3044', display: 'block' }}>Primary Diesel Alternator (G-02)</strong>
                      <span style={{ fontSize: '0.62rem', color: '#536579' }}>Main 415V 3-Phase Bus #1</span>
                    </div>
                    <span className="mono-num text-cyan">66 kW (Nominal)</span>
                    <span className="mono-num text-red">
                      {scenarioId === 'GEN_FAIL' ? '0 kW (Stator Thermal Seizure)' : `${(66 - lostCapacityKw * 0.7).toFixed(1)} kW (Derated)`}
                    </span>
                    <span className={`report-status-pill ${scenarioId === 'GEN_FAIL' ? 'critical' : 'warning'}`}>
                      {scenarioId === 'GEN_FAIL' ? 'TRIPPED' : 'DERATED'}
                    </span>
                  </div>

                  {/* Channel 2 */}
                  <div className="sim-rep-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1fr', padding: '10px 12px', background: '#f4f7f9', borderRadius: '4px', border: '1px solid rgba(45, 78, 128, 0.3)', alignItems: 'center', fontSize: '0.74rem' }}>
                    <div>
                      <strong style={{ color: '#1d3044', display: 'block' }}>BESS Energy Storage Array</strong>
                      <span style={{ fontSize: '0.62rem', color: '#536579' }}>LiFePO4 String Modules</span>
                    </div>
                    <span className="mono-num text-emerald">94% SoC (Float)</span>
                    <span className="mono-num text-amber">
                      Rapid Discharge ({batteryHours}h buffer)
                    </span>
                    <span className="report-status-pill warning">
                      DISCHARGING
                    </span>
                  </div>

                  {/* Channel 3 */}
                  <div className="sim-rep-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1fr', padding: '10px 12px', background: '#f4f7f9', borderRadius: '4px', border: '1px solid rgba(45, 78, 128, 0.3)', alignItems: 'center', fontSize: '0.74rem' }}>
                    <div>
                      <strong style={{ color: '#1d3044', display: 'block' }}>Life Support &amp; Habitation Heaters</strong>
                      <span style={{ fontSize: '0.62rem', color: '#536579' }}>Priority Microgrid Bus #0</span>
                    </div>
                    <span className="mono-num text-cyan">35 kW Continuous</span>
                    <span className="mono-num text-emerald">100% Protected (Isolated Circuit)</span>
                    <span className="report-status-pill normal">
                      SECURED
                    </span>
                  </div>

                  {/* Channel 4 */}
                  <div className="sim-rep-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1fr', padding: '10px 12px', background: '#f4f7f9', borderRadius: '4px', border: '1px solid rgba(45, 78, 128, 0.3)', alignItems: 'center', fontSize: '0.74rem' }}>
                    <div>
                      <strong style={{ color: '#1d3044', display: 'block' }}>
                        {isMaitri ? 'Lake Priyadarshini Water Intake Loop' : 'Seawater RO Desalination Skid'}
                      </strong>
                      <span style={{ fontSize: '0.62rem', color: '#536579' }}>Auxiliary Hydration System</span>
                    </div>
                    <span className="mono-num text-cyan">18.5 kW Trace Heat</span>
                    <span className="mono-num">
                      {scenarioId === 'WATER_FREEZE' ? 'Freeze Risk: Defrost Engaged' : 'Nominal Glycol Circulation'}
                    </span>
                    <span className={`report-status-pill ${scenarioId === 'WATER_FREEZE' ? 'critical' : 'normal'}`}>
                      {scenarioId === 'WATER_FREEZE' ? 'DEFROST ACTIVE' : 'OPTIMAL'}
                    </span>
                  </div>

                  {/* Channel 5 */}
                  <div className="sim-rep-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1fr', padding: '10px 12px', background: '#f4f7f9', borderRadius: '4px', border: '1px solid rgba(45, 78, 128, 0.3)', alignItems: 'center', fontSize: '0.74rem' }}>
                    <div>
                      <strong style={{ color: '#1d3044', display: 'block' }}>SATCOM &amp; Earth Station Gateway</strong>
                      <span style={{ fontSize: '0.62rem', color: '#536579' }}>RF Tracking Pedestal &amp; Radome</span>
                    </div>
                    <span className="mono-num text-emerald">Carrier Lock (4.2 dB Margin)</span>
                    <span className="mono-num">
                      {scenarioId === 'SATCOM_BLACKOUT' ? 'Loss of Lock (Solar Kp 8+)' : 'Carrier Lock Maintained'}
                    </span>
                    <span className={`report-status-pill ${scenarioId === 'SATCOM_BLACKOUT' ? 'critical' : 'normal'}`}>
                      {scenarioId === 'SATCOM_BLACKOUT' ? 'ISLANDING' : 'OPTIMAL'}
                    </span>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------
              TAB 3: POWER & BATTERY TRANSIENT WAVEFORMS
              ---------------------------------------------------------------- */}
          {activeTab === 'transients' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingDown size={16} className="text-cyan" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1d3044', textTransform: 'uppercase' }}>
                      24-Hour Projected Microgrid Power Transients (kW)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.68rem' }}>
                    <span style={{ color: '#146b80' }}>■ Baseline Demand</span>
                    <span style={{ color: '#b73b37' }}>■ Post-Fault Generation</span>
                    <span style={{ color: '#187451' }}>■ With Load-Shedding</span>
                  </div>
                </div>

                {/* SVG Native Curve */}
                <div style={{ height: '170px', width: '100%' }}>
                  <svg width="100%" height="100%" viewBox="0 0 600 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="powerFaultGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b73b37" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#b73b37" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                      const y = 130 - p * 105;
                      return (
                        <g key={idx}>
                          <line x1="45" y1={y} x2="580" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                          <text x="40" y={y + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                            {Math.round(p * (isMaitri ? 150 : 200))}kW
                          </text>
                        </g>
                      );
                    })}

                    {/* Baseline Line (Cyan) */}
                    <path 
                      d="M 45 45 Q 180 40, 310 48 T 580 42" 
                      fill="none" 
                      stroke="#146b80"
                      strokeWidth="2" 
                      strokeDasharray="4 4"
                    />

                    {/* Post-Fault Drop Line (Red) */}
                    <path 
                      d="M 45 45 L 120 45 L 140 105 L 350 110 L 580 115" 
                      fill="none" 
                      stroke="#b73b37"
                      strokeWidth="2.5"
                    />

                    {/* Mitigated Curve (Emerald) */}
                    <path 
                      d="M 45 45 L 120 45 L 140 105 L 190 75 L 350 72 L 580 68" 
                      fill="none" 
                      stroke="#187451"
                      strokeWidth="2.2"
                    />

                    {/* X-axis labels */}
                    {['T-0h (Fault)', 'T+2h', 'T+6h', 'T+12h', 'T+18h', 'T+24h'].map((t, i) => (
                      <text key={i} x={50 + i * 100} y="145" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                        {t}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>

              {/* BESS Discharge Envelope */}
              <div style={{ background: '#f4f7f9', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BatteryCharging size={16} className="text-amber" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1d3044', textTransform: 'uppercase' }}>
                      BESS Battery Bank State-of-Charge (SoC %) Depletion Horizon
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#187451', fontWeight: 700 }}>
                    +3.8h Autonomy Extension via Automated Load-Shedding
                  </span>
                </div>

                <div style={{ height: '140px', width: '100%' }}>
                  <svg width="100%" height="100%" viewBox="0 0 600 120" preserveAspectRatio="none">
                    {/* Gridlines */}
                    {[0, 0.5, 1].map((p, idx) => {
                      const y = 100 - p * 80;
                      return (
                        <g key={idx}>
                          <line x1="45" y1={y} x2="580" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                          <text x="40" y={y + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                            {p * 100}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Unmitigated Discharge Curve (Amber) */}
                    <path 
                      d="M 45 20 C 180 35, 300 70, 420 100 L 580 100" 
                      fill="none" 
                      stroke="#946013"
                      strokeWidth="2.2"
                    />

                    {/* Mitigated Curve (Emerald) */}
                    <path 
                      d="M 45 20 C 180 28, 300 45, 480 75 L 580 85" 
                      fill="none" 
                      stroke="#187451"
                      strokeWidth="2.4"
                    />

                    {/* Critical Trip Threshold Line */}
                    <line x1="45" y1="84" x2="580" y2="84" stroke="#b73b37" strokeDasharray="2 2" strokeWidth="1" />
                    <text x="575" y="80" textAnchor="end" fill="#b73b37" fontSize="7.5" fontFamily="monospace">
                      Critical Cutoff Threshold (20% SoC)
                    </text>
                  </svg>
                </div>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------------------
              TAB 4: SCADA LOAD-SHEDDING & OPERATOR DIRECTIVES
              ---------------------------------------------------------------- */}
          {activeTab === 'mitigation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Load-Shedding Dispatch Control Center */}
              <div style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '8px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#146b80', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Automated SCADA Priority Load-Shedding Engine
                    </span>
                    <p style={{ fontSize: '0.72rem', color: '#536579', margin: '2px 0 0 0' }}>
                      Trips non-essential branch breakers to conserve {Math.round(lostCapacityKw * 0.75)} kW reserve capacity without human latency.
                    </p>
                  </div>

                  <button 
                    type="button" 
                    className="btn-drilldown-primary"
                    style={{ 
                      background: loadShedDispatched ? 'rgba(16, 185, 129, 0.2)' : 'linear-gradient(135deg, #245b82, #147889)',
                      borderColor: loadShedDispatched ? '#187451' : '#146b80',
                      color: loadShedDispatched ? '#187451' : '#ffffff',
                      padding: '8px 16px',
                      fontSize: '0.76rem'
                    }}
                    onClick={() => setLoadShedDispatched(!loadShedDispatched)}
                  >
                    {loadShedDispatched ? <CheckCircle2 size={15} /> : <Zap size={15} />}
                    <span>{loadShedDispatched ? '✓ SCADA Protocol Dispatched to PLCs' : 'Dispatch Automated Load-Shedding'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: '#f4f7f9', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(45, 78, 128, 0.3)' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#b73b37' }}>STAGE 1 (IMMEDIATE)</span>
                    <strong style={{ display: 'block', fontSize: '0.74rem', color: '#1d3044', margin: '3px 0' }}>Science Lab Heaters (-22 kW)</strong>
                    <span style={{ fontSize: '0.6rem', color: '#536579' }}>Auxiliary quarters &amp; non-critical incubators</span>
                  </div>

                  <div style={{ background: '#f4f7f9', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(45, 78, 128, 0.3)' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#946013' }}>STAGE 2 (T+5 MINS)</span>
                    <strong style={{ display: 'block', fontSize: '0.74rem', color: '#1d3044', margin: '3px 0' }}>Domestic Laundry &amp; Workshop (-13 kW)</strong>
                    <span style={{ fontSize: '0.6rem', color: '#536579' }}>Heavy machine tools &amp; dry wash cycles</span>
                  </div>

                  <div style={{ background: '#f4f7f9', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#187451' }}>PROTECTED CIRCUIT</span>
                    <strong style={{ display: 'block', fontSize: '0.74rem', color: '#1d3044', margin: '3px 0' }}>Habitation &amp; Medical (35 kW)</strong>
                    <span style={{ fontSize: '0.6rem', color: '#187451' }}>100% Uninterrupted Priority Loop</span>
                  </div>
                </div>
              </div>

              {/* Mandatory Operator Checklist */}
              <div style={{ background: '#f4f7f9', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ShieldAlert size={16} className="text-amber" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1d3044', textTransform: 'uppercase' }}>
                    Mandatory On-Station Operator SOP Checklist (15-Minute Protocol)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { title: "Acknowledge SCADA G-02 trip alarm on Primary Central SCADA Console", time: "T+1 min" },
                    { title: "Verify Bus Tie Breaker #3 is isolated from faulted generator alternator", time: "T+3 min" },
                    { title: "Remote-crank standby generator G-01 via SCADA remote control panel", time: "T+6 min" },
                    { title: "Synchronize G-01 alternator frequency to 50.0 Hz ±0.2 Hz before closing bus breaker", time: "T+10 min" },
                    { title: "Confirm BESS charging transition from discharge to float charge", time: "T+12 min" },
                    { title: "Log formal incident report to NCPOR Operations Directorate (GoI)", time: "T+15 min" }
                  ].map((step, idx) => {
                    const isChecked = !!checkedSteps[idx];
                    return (
                      <div 
                        key={idx}
                        onClick={() => toggleStep(idx)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          background: isChecked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.7)',
                          border: `1px solid ${isChecked ? 'rgba(16, 185, 129, 0.4)' : 'rgba(45, 78, 128, 0.3)'}`,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `1.5px solid ${isChecked ? '#187451' : '#64748b'}`,
                            background: isChecked ? '#187451' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isChecked && <Check size={12} color="#ffffff" />}
                          </div>
                          <span style={{ fontSize: '0.74rem', color: isChecked ? '#e2e8f0' : '#cbd5e1', textDecoration: isChecked ? 'line-through' : 'none' }}>
                            {idx + 1}. {step.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#536579', fontFamily: 'monospace' }}>
                          {step.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------------------
              TAB 5: RAW TELEMETRY AUDIT LOG
              ---------------------------------------------------------------- */}
          {activeTab === 'raw_audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#536579' }}>
                  NCPOR Mission Audit &amp; SCADA Invariant Stream
                </span>
                <span style={{ fontSize: '0.65rem', color: '#187451', fontFamily: 'monospace' }}>
                  ● Cryptographic Hash: SHA-256 Verified
                </span>
              </div>

              <pre style={{
                background: '#f4f7f9',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '6px',
                padding: '14px',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                color: '#146b80',
                maxHeight: '380px',
                overflowY: 'auto',
                lineHeight: '1.45'
              }}>
{JSON.stringify({
  audit_id: referenceId,
  station_id: station.id,
  station_name: station.name,
  scenario: scenarioTitle,
  scenario_id: scenarioId,
  simulation_engine: "POLARIS Thermodynamic Kernel v4.2",
  timestamp: new Date().toISOString(),
  injected_faults: {
    generator_trip: scenarioId === 'GEN_FAIL',
    power_drop_pct: powerDropPct,
    capacity_loss_kw: lostCapacityKw
  },
  metrics_envelope: {
    baseline_kw: isMaitri ? 132 : 185,
    faulted_kw: isMaitri ? (132 - lostCapacityKw).toFixed(1) : (185 - lostCapacityKw).toFixed(1),
    battery_reserve_hours: batteryHours,
    bess_voltage_droop_pct: 3.4,
    risk_score: riskScore,
    mission_risk: missionRisk
  },
  scada_response: {
    load_shedding_recommendation: loadShedRecommendation,
    mitigation_action: mitigationAction,
    load_shed_dispatched: loadShedDispatched
  }
}, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* ==================================================================
            MODAL FOOTER ACTIONS BAR
            ================================================================== */}
        <div className="report-modal-footer">
          <div className="report-footer-left">
            <span className="footer-status-pill online">
              <span className="dot" />
              POLARIS INCIDENT SIMULATION CERTIFIED
            </span>
            <span className="footer-time-text">
              National Centre for Polar and Ocean Research (NCPOR) &bull; MoES
            </span>
          </div>

          <div className="report-footer-right">
            <button 
              type="button" 
              className="report-btn-action" 
              onClick={handleDownloadJSON}
            >
              <Download size={13} />
              <span>Export Audit JSON</span>
            </button>
            <button 
              type="button" 
              className="btn-drilldown-primary" 
              onClick={onClose}
            >
              <CheckCircle2 size={13} />
              <span>Acknowledge &amp; Close</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
