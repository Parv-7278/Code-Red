import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ShieldAlert, 
  ShieldCheck,
  CheckCircle, 
  AlertTriangle, 
  AlertOctagon,
  Thermometer, 
  Wind, 
  Zap, 
  Activity, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Layers,
  Cpu, 
  Radio, 
  FileText, 
  BarChart3, 
  Flame, 
  BatteryCharging, 
  Maximize2,
  Compass,
  Check,
  Download,
  Printer,
  Droplets,
  Database,
  Satellite
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { formatStationTime, getStationTimezoneLabel } from '../utils/timeUtils';
import { useModal } from '../context/ModalContext';
import ResearchAnalysisModal from './ResearchAnalysisModal';
import HistoricalComparisonModal from './HistoricalComparisonModal';
import SimulationReportModal from './SimulationReportModal';

export default function DetailModal(props) {
  const modalContext = useModal();
  const { currentTelemetry, isSimulatorOnline, selectedStation } = useTelemetry();
  const [mitigationDispatched, setMitigationDispatched] = useState(false);

  const isOpen = props.isOpen !== undefined ? props.isOpen : modalContext.modalState?.isOpen;
  const onClose = props.onClose || modalContext.closeModal;
  const state = props.modalState || modalContext.modalState || {};

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const {
    title = 'Detailed Diagnostics',
    type = 'DRILL_DOWN',
    category = 'TELEMETRY',
    metricKey,
    currentValue: initialValue,
    unit = '',
    status: initialStatus = 'NORMAL',
    historicalData = [],
    stats,
    thresholds,
    interpretation,
    recommendation,
    metadata,
    station: stationName = selectedStation === 'station-bharati' ? 'Bharati Station' : 'Maitri Station',
    data,
  } = state;

  if (type === 'SIMULATION_REPORT') {
    return (
      <SimulationReportModal
        isOpen={isOpen}
        onClose={onClose}
        scenarioData={data}
        selectedStation={stationName?.toLowerCase()?.includes('bharati') ? 'station-bharati' : 'station-maitri'}
      />
    );
  }

  if (type === 'RESEARCH_ANALYSIS') {
    return (
      <ResearchAnalysisModal
        isOpen={isOpen}
        onClose={onClose}
        selectedStation={stationName?.toLowerCase()?.includes('bharati') ? 'station-bharati' : 'station-maitri'}
      />
    );
  }

  if (type === 'HISTORICAL_COMPARISON') {
    return (
      <HistoricalComparisonModal
        isOpen={isOpen}
        onClose={onClose}
        selectedStation={stationName?.toLowerCase()?.includes('bharati') ? 'station-bharati' : 'station-maitri'}
      />
    );
  }

  // Real-time live value binding from WebSocket telemetry if metricKey matches
  let liveValue = initialValue;
  let liveStatus = initialStatus;

  if (metricKey && currentTelemetry) {
    if (metricKey === 'temperature' && currentTelemetry.temperature !== undefined) {
      liveValue = currentTelemetry.temperature;
    } else if (metricKey === 'generator_temperature' && currentTelemetry.generator_temperature !== undefined) {
      liveValue = currentTelemetry.generator_temperature;
      if (liveValue >= 95.0) liveStatus = 'CRITICAL';
      else if (liveValue >= 85.0) liveStatus = 'WARNING';
      else liveStatus = 'NORMAL';
    } else if (metricKey === 'battery_level' && (currentTelemetry.battery_level !== undefined || currentTelemetry.battery !== undefined)) {
      liveValue = currentTelemetry.battery_level ?? currentTelemetry.battery;
    } else if (metricKey === 'power_consumption' && currentTelemetry.power_consumption !== undefined) {
      liveValue = currentTelemetry.power_consumption;
    } else if (metricKey === 'power_generation' && currentTelemetry.power_generation !== undefined) {
      liveValue = currentTelemetry.power_generation;
    } else if (metricKey === 'wind_speed' && currentTelemetry.wind_speed !== undefined) {
      liveValue = currentTelemetry.wind_speed;
    } else if (metricKey === 'water_level' && currentTelemetry.water_level !== undefined) {
      liveValue = currentTelemetry.water_level;
    }
  }

  // Format historical graph SVG paths
  const chartPoints = useMemo(() => {
    if (historicalData && historicalData.length > 0) {
      return historicalData;
    }
    // Default fallback baseline series
    const baseVal = typeof liveValue === 'number' ? liveValue : 50;
    return [
      { time: '00:00', val: +(baseVal - 1.8).toFixed(1) },
      { time: '03:00', val: +(baseVal - 2.4).toFixed(1) },
      { time: '06:00', val: +(baseVal - 1.2).toFixed(1) },
      { time: '09:00', val: +(baseVal + 0.6).toFixed(1) },
      { time: '12:00', val: +(baseVal + 1.4).toFixed(1) },
      { time: '15:00', val: +(baseVal + 0.8).toFixed(1) },
      { time: '18:00', val: +(baseVal - 0.5).toFixed(1) },
      { time: 'Now', val: +(baseVal).toFixed(1) },
    ];
  }, [historicalData, liveValue]);

  // Compute SVG Area Path for Historical Graph
  const svgW = 540;
  const svgH = 140;
  const padX = 35;
  const padY = 20;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const vals = chartPoints.map((p) => p.val);
  const minVal = Math.min(...vals, (stats?.min ? parseFloat(stats.min) : Infinity));
  const maxVal = Math.max(...vals, (stats?.max ? parseFloat(stats.max) : -Infinity));
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const coords = chartPoints.map((pt, i) => {
    const x = padX + (i / (chartPoints.length - 1)) * plotW;
    const y = padY + (1 - (pt.val - minVal) / range) * plotH;
    return { x, y, pt };
  });

  const pathD = coords.reduce((acc, c, i) => {
    if (i === 0) return `M ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
    const prev = coords[i - 1];
    const mx = (prev.x + c.x) / 2;
    return `${acc} C ${mx.toFixed(1)},${prev.y.toFixed(1)} ${mx.toFixed(1)},${c.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
  }, '');

  const areaD = coords.length > 0 
    ? `${pathD} L ${coords[coords.length - 1].x.toFixed(1)},${svgH - padY} L ${coords[0].x.toFixed(1)},${svgH - padY} Z`
    : '';

  const statusColorClass = liveStatus === 'CRITICAL' || liveStatus === 'OVERHEAT'
    ? 'status-critical'
    : liveStatus === 'WARNING'
    ? 'status-warning'
    : 'status-optimal';

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div 
        className="modal-dialog-card polaris-card drilldown-modal-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="drilldown-header-bar">
          <div className="drilldown-header-left">
            <span className="drilldown-category-badge">{category.toUpperCase()}</span>
            <div className="drilldown-title-group">
              <h3 className="drilldown-main-title">{title}</h3>
              <span className="drilldown-station-name">{stationName}</span>
            </div>
          </div>

          <div className="drilldown-header-right">
            <div className={`drilldown-live-beacon ${isSimulatorOnline ? 'online' : 'offline'}`}>
              <span className="live-dot" />
              <span>{isSimulatorOnline ? 'LIVE TELEMETRY LINK' : 'REAL-TIME LINK DISCONNECTED'}</span>
            </div>
            <button className="drilldown-close-btn" onClick={onClose} title="Close (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="drilldown-body-content">
          
          {/* ================================================================
              MODE 1: GENERIC & DETAILED PARAMETER DRILL-DOWN VIEW
              ================================================================ */}
          {type === 'DRILL_DOWN' && (
            <div className="drilldown-parameter-view">
              
              {/* Top Hero Metric Row */}
              <div className="drilldown-hero-row">
                <div className="drilldown-hero-val-box">
                  <span className="drilldown-hero-number mono-num">
                    {liveValue !== null && liveValue !== undefined ? liveValue : '--'}
                  </span>
                  <span className="drilldown-hero-unit">{unit}</span>
                </div>

                <div className="drilldown-hero-status-box">
                  <span className={`drilldown-status-pill ${statusColorClass}`}>
                    {liveStatus}
                  </span>
                  <span className="drilldown-last-sync">
                    <Clock size={12} className="text-dim" />
                    <span>Last Updated: {formatStationTime(new Date(), station)} ({getStationTimezoneLabel(station)})</span>
                  </span>
                </div>
              </div>

              {/* Historical Trend Chart Box */}
              <div className="drilldown-chart-section">
                <div className="drilldown-chart-header">
                  <span className="drilldown-chart-title">24-Hour Telemetry Trend Waveform</span>
                  <div className="drilldown-chart-legend">
                    <span className="legend-dot" /> Sensor Stream
                  </div>
                </div>

                <div className="drilldown-svg-chart-wrap">
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="drilldown-waveform-svg">
                    <defs>
                      <linearGradient id="drilldownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#146b80" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#245b82" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0.2, 0.5, 0.8].map((ratio, idx) => (
                      <line
                        key={idx}
                        x1={padX}
                        y1={padY + ratio * plotH}
                        x2={svgW - padX}
                        y2={padY + ratio * plotH}
                        stroke="rgba(56, 189, 248, 0.15)"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Area fill */}
                    {areaD && <path d={areaD} fill="url(#drilldownGrad)" />}
                    {/* Spline line */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#146b80"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))' }}
                      />
                    )}

                    {/* Data Points */}
                    {coords.map((c, i) => (
                      <g key={i}>
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={i === coords.length - 1 ? 4.5 : 2.5}
                          fill={i === coords.length - 1 ? '#146b80' : '#ffffff'}
                          stroke={i === coords.length - 1 ? '#ffffff' : '#245b82'}
                          strokeWidth="1.5"
                        />
                        <text
                          x={c.x}
                          y={svgH - 4}
                          fill="#64748b"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {c.pt.time}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Statistical Boundaries & Thresholds Grid */}
              <div className="drilldown-stats-grid">
                <div className="stat-card-item">
                  <span className="stat-lbl">MIN RECORDED</span>
                  <span className="stat-num mono-num">{stats?.min || `${(minVal).toFixed(1)} ${unit}`}</span>
                </div>
                <div className="stat-card-item">
                  <span className="stat-lbl">24H AVERAGE</span>
                  <span className="stat-num mono-num">{stats?.avg || `${((minVal + maxVal) / 2).toFixed(1)} ${unit}`}</span>
                </div>
                <div className="stat-card-item">
                  <span className="stat-lbl">MAX PEAK</span>
                  <span className="stat-num mono-num">{stats?.max || `${(maxVal).toFixed(1)} ${unit}`}</span>
                </div>
                <div className="stat-card-item">
                  <span className="stat-lbl">WARNING THRESHOLD</span>
                  <span className="stat-num mono-num text-amber">{thresholds?.warning || 'Threshold Nominal'}</span>
                </div>
                <div className="stat-card-item">
                  <span className="stat-lbl">CRITICAL TRIP LIMIT</span>
                  <span className="stat-num mono-num text-red">{thresholds?.critical || 'Non-Critical'}</span>
                </div>
                <div className="stat-card-item">
                  <span className="stat-lbl">SAMPLING FREQUENCY</span>
                  <span className="stat-num mono-num text-cyan">1.5 Hz (Continuous)</span>
                </div>
              </div>

              {/* Engineering Analysis & Recommendation Callout */}
              <div className="drilldown-analysis-box">
                <div className="analysis-header-row">
                  <Sparkles size={14} className="text-cyan" />
                  <span className="analysis-title">Digital Twin System Interpretation</span>
                </div>
                <p className="analysis-text">
                  {interpretation || 
                    `Telemetry for ${title} on ${stationName} is performing within expected environmental boundaries. Digital Twin predictive models project stable performance over the next 48-hour mission cycle.`}
                </p>
                {recommendation && (
                  <div className="analysis-rec-sub">
                    <strong>Recommended Action:</strong> {recommendation}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="drilldown-actions-bar">
                <button type="button" className="btn-drilldown-primary" onClick={onClose}>
                  Acknowledge & Close
                </button>
                <button type="button" className="btn-drilldown-secondary" onClick={() => window.print()}>
                  Export Parameter Log (.PDF)
                </button>
              </div>

            </div>
          )}

          {/* ================================================================
              MODE 2: LEGACY / SPECIALIZED MODES (ALERTS, INSIGHTS, SIMULATIONS, FORECAST)
              ================================================================ */}
          {type === 'ALERT_VIEW_ALL' && (
            <div className="modal-alerts-list">
              <div className="modal-alert-item critical">
                <div className="m-alert-header">
                  <span className="m-tag critical">CRITICAL</span>
                  <span className="m-time mono-num">14:20 IST</span>
                </div>
                <h4 className="m-alert-title">🚨 Generator G-01 Overheat (Maitri Station)</h4>
                <p className="m-alert-desc">Core stator temperature reached 95°C. Critical threshold breached. Risk of emergency shutdown.</p>
                <div className="m-alert-actions">
                  <button className="btn-drilldown-primary" onClick={onClose}>Acknowledge & Dispatch Response</button>
                  <button className="btn-drilldown-secondary" onClick={onClose}>Switch to Generator 2</button>
                </div>
              </div>

              <div className="modal-alert-item warning">
                <div className="m-alert-header">
                  <span className="m-tag warning">WARNING</span>
                  <span className="m-time mono-num">13:45 IST</span>
                </div>
                <h4 className="m-alert-title">Katabatic Wind Warning - Schirmacher Oasis</h4>
                <p className="m-alert-desc">Sustained gusts reaching 78 km/h. Outer solar tracking array locked to horizontal storm profile.</p>
                <div className="m-alert-actions">
                  <button className="btn-drilldown-primary" onClick={onClose}>Acknowledge</button>
                </div>
              </div>
            </div>
          )}

          {type === 'INSIGHT_DETAIL' && data && (
            <div className="modal-insight-detail">
              <div className="sim-report-header-banner">
                <div className="sim-report-badge-row">
                  <span className="sim-report-tag">PREDICTIVE INTELLIGENCE ALERT</span>
                  <span className="sim-report-category">{data.subsystem || 'STATION SCADA TELEMETRY'}</span>
                  <span className={`sim-report-risk-badge ${(data.riskLevel?.includes('HIGH') || data.riskLevel?.includes('84%')) ? 'critical' : data.riskLevel?.includes('MEDIUM') ? 'warning' : 'optimal'}`} style={{ color: data.riskLevel?.includes('HARVEST') ? '#146b80' : undefined, background: data.riskLevel?.includes('HARVEST') ? 'rgba(56, 189, 248, 0.15)' : undefined, border: data.riskLevel?.includes('HARVEST') ? '1px solid rgba(56, 189, 248, 0.4)' : undefined }}>
                    {data.riskLevel || 'ANOMALY DETECTED'}
                  </span>
                </div>
                <h4 className="sim-report-title">{data.title || 'Predictive Subsystem Diagnostic'}</h4>
                <p className="sim-report-desc">{data.description || 'Neural SCADA anomaly detection identified predictive deviation across station physical sensors.'}</p>
              </div>

              {/* Dynamic Parameter Grid */}
              <div className="sim-report-kpis-grid">
                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Estimated Window</span>
                  <span className="rep-kpi-val text-amber mono-num">{data.window || '24 - 48 Hours'}</span>
                  <span className="rep-kpi-sub">Forecast Horizon</span>
                </div>

                {data.vibration && (
                  <div className="sim-rep-kpi-card">
                    <span className="rep-kpi-lbl">Vibration Amplitude</span>
                    <span className="rep-kpi-val text-red mono-num">{data.vibration}</span>
                    <span className="rep-kpi-sub">Sensor: Piezo-Triaxial</span>
                  </div>
                )}

                {data.temp && (
                  <div className="sim-rep-kpi-card">
                    <span className="rep-kpi-lbl">Thermal Core / Surface</span>
                    <span className="rep-kpi-val text-cyan mono-num">{data.temp}</span>
                    <span className="rep-kpi-sub">PT100 RTD Sensor</span>
                  </div>
                )}

                {(data.windGusts || data.windSpeed) && (
                  <div className="sim-rep-kpi-card">
                    <span className="rep-kpi-lbl">Wind Vector / Gusts</span>
                    <span className="rep-kpi-val text-cyan mono-num">{data.windGusts || data.windSpeed}</span>
                    <span className="rep-kpi-sub">Ultrasonic Anemometer</span>
                  </div>
                )}

                {data.powerDraw && (
                  <div className="sim-rep-kpi-card">
                    <span className="rep-kpi-lbl">Power Draw / Yield</span>
                    <span className="rep-kpi-val text-amber mono-num">{data.powerDraw}</span>
                    <span className="rep-kpi-sub">Heating / Microgrid Circuit</span>
                  </div>
                )}

                {data.iceThickness && (
                  <div className="sim-rep-kpi-card">
                    <span className="rep-kpi-lbl">Ice / Rime Layer</span>
                    <span className="rep-kpi-val text-cyan mono-num">{data.iceThickness}</span>
                    <span className="rep-kpi-sub">Optical / Laser Sensor</span>
                  </div>
                )}

                {data.cargoManifest && (
                  <div className="sim-rep-kpi-card" style={{ gridColumn: 'span 2' }}>
                    <span className="rep-kpi-lbl">Expedition Cargo Manifest</span>
                    <span className="rep-kpi-val text-emerald mono-num" style={{ fontSize: '0.82rem' }}>{data.cargoManifest}</span>
                    <span className="rep-kpi-sub">Polar Resupply Vessel</span>
                  </div>
                )}

                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">AI Model Confidence</span>
                  <span className="rep-kpi-val text-emerald mono-num">98.4%</span>
                  <span className="rep-kpi-sub">Random Forest Ensembles</span>
                </div>
              </div>

              {/* Actionable Recommendation */}
              <div className="sim-directives-box">
                <div className="directive-block">
                  <span className="dir-tag text-cyan">AI ENGINEERING DIRECTIVE &amp; MITIGATION:</span>
                  <p className="dir-text">{data.recommendation || 'Initiate load shedding to reduce thermal strain on primary inverter.'}</p>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="drilldown-actions-bar">
                <button 
                  type="button" 
                  className="btn-drilldown-primary" 
                  onClick={() => setMitigationDispatched(true)}
                >
                  <ShieldCheck size={14} className={mitigationDispatched ? 'text-emerald' : ''} />
                  <span>{mitigationDispatched ? '✓ Mitigation Dispatched to SCADA PLCs' : 'Apply SCADA Mitigation Protocol'}</span>
                </button>
                <button 
                  type="button" 
                  className="btn-drilldown-secondary" 
                  onClick={() => {
                    const jsonContent = JSON.stringify(data, null, 2);
                    const blob = new Blob([jsonContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `POLARIS_Insight_${(data.title || 'Diagnostic').replace(/\s+/g, '_')}.json`;
                    a.click();
                  }}
                >
                  <Download size={13} />
                  <span>Download JSON</span>
                </button>
                <button type="button" className="btn-drilldown-secondary" onClick={() => window.print()}>
                  <Printer size={13} />
                  <span>Print Dossier</span>
                </button>
              </div>
            </div>
          )}

          {type === 'FORECAST' && (
            <div className="modal-simulation-report">
              <div className="sim-report-header-banner">
                <div className="sim-report-badge-row">
                  <span className="sim-report-tag">POLAR METEOROLOGY &amp; ATMOSPHERE</span>
                  <span className="sim-report-category">IMD / ECMWF SYNOPTIC MODEL</span>
                  <span className="sim-report-risk-badge optimal">7-DAY FORECAST SYNC</span>
                </div>
                <h4 className="sim-report-title">Detailed Polar Meteorological Forecast ({stationName})</h4>
                <p className="sim-report-desc">Synoptic numerical weather prediction model output integrated with station AWS microclimate telemetry.</p>
              </div>

              <div className="sim-report-kpis-grid">
                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Current Temperature</span>
                  <span className="rep-kpi-val text-cyan mono-num">{data?.temp ?? '-24.2°C'}</span>
                  <span className="rep-kpi-sub">Wind Chill: -38.6°C</span>
                </div>
                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Katabatic Wind Speed</span>
                  <span className="rep-kpi-val text-amber mono-num">{data?.windSpeed ?? '38 km/h'}</span>
                  <span className="rep-kpi-sub">Max Gust: 64 km/h</span>
                </div>
                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Barometric Pressure</span>
                  <span className="rep-kpi-val text-emerald mono-num">{data?.pressure ?? '984 hPa'}</span>
                  <span className="rep-kpi-sub">Tendency: Steady (+0.4 hPa/3h)</span>
                </div>
                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Optical Visibility</span>
                  <span className="rep-kpi-val text-cyan mono-num">{data?.visibility ?? '15 km'}</span>
                  <span className="rep-kpi-sub">Horizon Clear</span>
                </div>
              </div>

              <div className="sim-report-table-box">
                <h5 className="sim-table-heading">7-Day Synoptic Polar Outlook</h5>
                <div className="sim-report-table">
                  <div className="sim-rep-row header">
                    <span>Forecast Day</span>
                    <span>Expected Temp</span>
                    <span>Wind &amp; Gusts</span>
                    <span>Weather Hazard</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>Day 1 (Today)</span>
                    <span className="mono-num text-cyan">-24°C / -18°C</span>
                    <span className="mono-num">35 km/h ESE</span>
                    <span className="text-green font-bold">NOMINAL</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>Day 2 (Tomorrow)</span>
                    <span className="mono-num text-cyan">-26°C / -20°C</span>
                    <span className="mono-num text-amber">52 km/h Gusts</span>
                    <span className="text-amber font-bold">MODERATE KATABATIC</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>Day 3</span>
                    <span className="mono-num text-cyan">-29°C / -22°C</span>
                    <span className="mono-num text-red">78 km/h Gale</span>
                    <span className="text-critical font-bold">BLIZZARD WATCH</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>Day 4</span>
                    <span className="mono-num text-cyan">-31°C / -24°C</span>
                    <span className="mono-num">44 km/h</span>
                    <span className="text-amber font-bold">ELEVATED COLD</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>Day 5 – 7</span>
                    <span className="mono-num text-cyan">-25°C / -19°C</span>
                    <span className="mono-num">28 km/h Calm</span>
                    <span className="text-green font-bold">FAVORABLE WINDOW</span>
                  </div>
                </div>
              </div>

              <div className="sim-directives-box">
                <div className="directive-block">
                  <span className="dir-tag text-cyan">EXPEDITION METEOROLOGICAL ADVISORY:</span>
                  <p className="dir-text">
                    A low-pressure synoptic trough entering Queen Maud Land will increase katabatic wind shear on Day 3. Outside scientific sorties and helicopter flight operations should be scheduled before 16:00 tomorrow.
                  </p>
                </div>
              </div>

              <div className="drilldown-actions-bar">
                <button type="button" className="btn-drilldown-primary" onClick={onClose}>
                  Acknowledge &amp; Close
                </button>
                <button type="button" className="btn-drilldown-secondary" onClick={() => window.print()}>
                  <Printer size={13} />
                  <span>Print Meteorological Log</span>
                </button>
              </div>
            </div>
          )}

          {type === 'SIMULATION_REPORT' && data && (
            <div className="modal-simulation-report">
              <div className="sim-report-header-banner">
                <div className="sim-report-badge-row">
                  <span className="sim-report-tag">POLARIS INCIDENT SIMULATION REPORT</span>
                  <span className="sim-report-category">{data.category || 'DYNAMIC SCADA FAULT'}</span>
                  <span className={`sim-report-risk-badge ${(data.params?.missionRisk === 'HIGH' || data.metrics?.risk === 'High') ? 'critical' : 'warning'}`}>
                    {data.params?.missionRisk || data.metrics?.risk || 'MEDIUM'} RISK (Index: {data.params?.riskScore || 72}/100)
                  </span>
                </div>
                <h4 className="sim-report-title">{data.name || data.label || 'Incident Simulation Analysis'}</h4>
                <p className="sim-report-desc">{data.description || 'Deterministic thermodynamic model execution projected against active Antarctic station telemetry baseline.'}</p>
              </div>

              {/* Simulation KPIs */}
              <div className="sim-report-kpis-grid">
                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Available Power Delta</span>
                  <span className="rep-kpi-val text-red mono-num">
                    {data.params?.powerDropPct !== undefined ? (data.params.powerDropPct !== 0 ? `${data.params.powerDropPct}%` : '0% (Demand Surge)') : (data.metrics?.powerDelta || '-28%')}
                  </span>
                  <span className="rep-kpi-sub">Lost Cap: {data.params?.lostCapacityKw !== undefined ? `${data.params.lostCapacityKw} kW` : '46.2 kW'}</span>
                </div>

                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Battery Reserve Horizon</span>
                  <span className="rep-kpi-val text-amber mono-num">
                    {data.params?.batteryHours ? `${data.params.batteryHours} Hours` : (data.metrics?.batteryReserve || '16.0 Hours')}
                  </span>
                  <span className="rep-kpi-sub">Autonomy Buffer</span>
                </div>

                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Load-Shed Protocol</span>
                  <span className="rep-kpi-val text-cyan mono-num">
                    {data.metrics?.loadAction || 'Auto-Shed'}
                  </span>
                  <span className="rep-kpi-sub">Priority Grid Shed</span>
                </div>

                <div className="sim-rep-kpi-card">
                  <span className="rep-kpi-lbl">Hazard Score</span>
                  <span className="rep-kpi-val text-critical mono-num">
                    {data.params?.riskScore ? `${data.params.riskScore}/100` : '78/100'}
                  </span>
                  <span className="rep-kpi-sub">Mission Vulnerability</span>
                </div>
              </div>

              {/* Subsystems Impact Table */}
              <div className="sim-report-table-box">
                <h5 className="sim-table-heading">Subsystem Impact Matrix</h5>
                <div className="sim-report-table">
                  <div className="sim-rep-row header">
                    <span>Subsystem Channel</span>
                    <span>Baseline State</span>
                    <span>Simulated State</span>
                    <span>Severity</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>Main Diesel Alternator (G-02)</span>
                    <span>66 kW (Nominal)</span>
                    <span>{data.id === 'GEN_FAIL' ? '0 kW (Thermal Seizure)' : '58 kW (Online)'}</span>
                    <span className={data.id === 'GEN_FAIL' ? 'text-critical font-bold' : 'text-green'}>{data.id === 'GEN_FAIL' ? 'TRIPPED' : 'NOMINAL'}</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>BESS Energy Storage</span>
                    <span>94% SoC</span>
                    <span>{data.params?.batteryHours ? `Depleting (${data.params.batteryHours}h buffer)` : '58% SoC in 6h'}</span>
                    <span className="text-amber font-bold">DISCHARGING</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>Life Support &amp; Habitation Heaters</span>
                    <span>35 kW Continuous</span>
                    <span>100% Protected (Isolated Bus)</span>
                    <span className="text-green font-bold">SECURED</span>
                  </div>
                  <div className="sim-rep-row">
                    <span>SATCOM &amp; RF Transceivers</span>
                    <span>Active Carrier Lock</span>
                    <span>{data.id === 'SATCOM_BLACKOUT' ? 'Loss of Lock (Kp 8+ Flare)' : 'Carrier Lock Maintained'}</span>
                    <span className={data.id === 'SATCOM_BLACKOUT' ? 'text-critical font-bold' : 'text-green'}>{data.id === 'SATCOM_BLACKOUT' ? 'DEGRADED' : 'OPTIMAL'}</span>
                  </div>
                </div>
              </div>

              {/* Directives & Mitigation */}
              <div className="sim-directives-box">
                <div className="directive-block">
                  <span className="dir-tag text-cyan">SCADA LOAD-SHED DIRECTIVE:</span>
                  <p className="dir-text">{data.params?.loadShedRecommendation || data.metrics?.loadNote || 'Auto-shed non-critical laboratory and auxiliary quarters trace heaters.'}</p>
                </div>
                <div className="directive-block">
                  <span className="dir-tag text-amber">MANDATORY OPERATOR MITIGATION:</span>
                  <p className="dir-text">{data.params?.mitigationAction || 'Engage secondary standby power bus and notify Expedition Leader.'}</p>
                </div>
              </div>

              {/* Export Toolbar */}
              <div className="drilldown-actions-bar">
                <button type="button" className="btn-drilldown-primary" onClick={onClose}>
                  Acknowledge &amp; Close
                </button>
                <button 
                  type="button" 
                  className="btn-drilldown-secondary" 
                  onClick={() => {
                    const jsonContent = JSON.stringify(data, null, 2);
                    const blob = new Blob([jsonContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `POLARIS_Report_${(data.name || data.label || 'Simulation').replace(/\s+/g, '_')}.json`;
                    a.click();
                  }}
                >
                  Download JSON
                </button>
                <button type="button" className="btn-drilldown-secondary" onClick={() => window.print()}>
                  Print / Save PDF
                </button>
              </div>
            </div>
          )}

          {type === 'FORECAST' && (
            <div className="modal-forecast-view">
              <div className="forecast-timeline-grid">
                {[
                  { time: '00:00', temp: '-19.4°C', wind: '22 km/h', cond: 'Light Snow' },
                  { time: '06:00', temp: '-21.8°C', wind: '34 km/h', cond: 'Blowing Snow' },
                  { time: '12:00', temp: '-18.7°C', wind: '28 km/h', cond: 'Light Snow' },
                  { time: '18:00', temp: '-23.5°C', wind: '48 km/h', cond: 'Katabatic Drift' },
                  { time: 'Tomorrow', temp: '-26.0°C', wind: '65 km/h', cond: 'Blizzard Warning' },
                ].map((f, i) => (
                  <div key={i} className="f-item-card">
                    <span className="f-time mono-num">{f.time}</span>
                    <span className="f-temp mono-num">{f.temp}</span>
                    <span className="f-wind">{f.wind}</span>
                    <span className="f-cond">{f.cond}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
