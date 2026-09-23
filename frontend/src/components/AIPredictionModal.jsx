import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  Flame, 
  Battery, 
  Zap, 
  Radio, 
  Cpu, 
  CloudSnow, 
  Package, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Sliders, 
  RotateCcw, 
  CheckCircle2, 
  Info,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { usePredictive } from '../context/PredictiveContext';
import './AIPredictionModal.css';

const categoryIcons = {
  energy: Zap,
  infrastructure: Cpu,
  environment: CloudSnow,
  logistics: Package,
  communication: Radio,
};

const simulationBaselines = {
  'station-maitri': {
    generator_temperature_c: 82.4,
    battery_level_pct: 74.0,
    power_consumption_kw: 118.4,
    wind_speed_kmh: 28.0,
    generator_vibration_rms: 3.4,
  },
  'station-bharati': {
    generator_temperature_c: 76.8,
    battery_level_pct: 82.5,
    power_consumption_kw: 146.2,
    wind_speed_kmh: 44.0,
    generator_vibration_rms: 1.9,
  },
};

export default function AIPredictionModal() {
  const {
    predictiveData,
    effectiveStation,
    isPredictionModalOpen,
    closePredictionCenter,
    selectedPrediction,
    setSelectedPrediction,
    activeCategoryFilter,
    setActiveCategoryFilter,
    isSimulating,
    loading,
    triggerSimulation,
    resetSimulation
  } = usePredictive();

  const [showSimSandbox, setShowSimSandbox] = useState(false);

  // Simulation Sliders State
  const [simTemp, setSimTemp] = useState(82.4);
  const [simBatt, setSimBatt] = useState(74.0);
  const [simLoad, setSimLoad] = useState(118.4);
  const [simWind, setSimWind] = useState(28.0);
  const [simVib, setSimVib] = useState(3.4);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPredictionModalOpen) {
        closePredictionCenter();
      }
    };
    if (isPredictionModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPredictionModalOpen, closePredictionCenter]);

  useEffect(() => {
    const baseline = simulationBaselines[effectiveStation] || simulationBaselines['station-maitri'];
    setSimTemp(baseline.generator_temperature_c);
    setSimBatt(baseline.battery_level_pct);
    setSimLoad(baseline.power_consumption_kw);
    setSimWind(baseline.wind_speed_kmh);
    setSimVib(baseline.generator_vibration_rms);
  }, [effectiveStation]);

  if (!isPredictionModalOpen || !predictiveData) return null;

  const {
    station_name,
    station_id,
    station_region,
    station_risk_score,
    station_risk_level,
    current_health_score,
    projected_health_24h,
    predictions = [],
    category_summary = {},
    mode
  } = predictiveData;

  const filteredPredictions = activeCategoryFilter === 'all'
    ? predictions
    : (category_summary[activeCategoryFilter] || []);

  // A simulation replaces every prediction object. Resolve the selection by ID
  // so the detail pane and graph always use the newly calculated result rather
  // than retaining the object from the previous simulation run.
  const refreshedSelection = selectedPrediction
    ? predictions.find((prediction) => prediction.id === selectedPrediction.id)
    : null;
  const selectionMatchesFilter = refreshedSelection && (
    activeCategoryFilter === 'all' || refreshedSelection.category === activeCategoryFilter
  );
  const currentItem = (selectionMatchesFilter ? refreshedSelection : null)
    || filteredPredictions[0]
    || predictions[0];

  const handleSimulate = (e) => {
    e.preventDefault();
    triggerSimulation({
      generator_temperature_c: simTemp,
      battery_level_pct: simBatt,
      power_consumption_kw: simLoad,
      wind_speed_kmh: simWind,
      generator_vibration_rms: simVib
    });
  };

  const handleResetSim = () => {
    const baseline = simulationBaselines[effectiveStation] || simulationBaselines['station-maitri'];
    resetSimulation();
    setSimTemp(baseline.generator_temperature_c);
    setSimBatt(baseline.battery_level_pct);
    setSimLoad(baseline.power_consumption_kw);
    setSimWind(baseline.wind_speed_kmh);
    setSimVib(baseline.generator_vibration_rms);
  };

  // SVG Chart Calculations for Selected Item
  const series = currentItem?.forecast_series || [];
  const chartW = 560;
  const chartH = 180;
  const padL = 50;
  const padR = 30;
  const padT = 25;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const values = series.map(s => s.predicted_value);
  const upperBounds = series.map(s => s.upper_bound || s.predicted_value);
  const lowerBounds = series.map(s => s.lower_bound || s.predicted_value);
  const allVals = [...values, ...upperBounds, ...lowerBounds, series[0]?.threshold || 0].filter(v => typeof v === 'number');

  const minV = Math.min(...allVals) * 0.92;
  const maxV = Math.max(...allVals) * 1.08;
  const valRange = Math.max(1, maxV - minV);

  const getX = (i) => padL + (i / Math.max(1, series.length - 1)) * innerW;
  const getY = (v) => padT + innerH - ((v - minV) / valRange) * innerH;

  const linePoints = series.map((s, i) => `${getX(i)},${getY(s.predicted_value)}`).join(' ');
  const upperPoints = series.map((s, i) => `${getX(i)},${getY(s.upper_bound)}`).join(' ');
  const lowerPointsRev = series.slice().reverse().map((s, i) => `${getX(series.length - 1 - i)},${getY(s.lower_bound)}`).join(' ');
  const confidenceBandPolygon = `${upperPoints} ${lowerPointsRev}`;

  const thresholdY = series[0]?.threshold !== undefined ? getY(series[0].threshold) : null;

  return (
    <div className="ai-modal-backdrop" onClick={closePredictionCenter}>
      <div className="ai-modal-dialog polaris-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="ai-modal-header">
          <div className="ai-modal-head-left">
            <div className="ai-modal-sparkle-box">
              <Sparkles size={20} className="text-cyan" />
            </div>
            <div>
              <div className="ai-modal-title-row">
                <h2 className="ai-modal-title">POLARIS AI Predictive Intelligence Center</h2>
                {isSimulating ? (
                  <span className="ai-modal-sim-pill">⚡ SIMULATION MODE</span>
                ) : (
                  <span className="ai-modal-live-pill">● REAL-TIME TELEMETRY</span>
                )}
              </div>
              <span className="ai-modal-subtitle">
                Target Station: <strong className="text-cyan">{station_name}</strong> • Region: {station_region}
              </span>
            </div>
          </div>

          <div className="ai-modal-head-right">
            <button 
              className={`btn-sim-toggle ${showSimSandbox ? 'active' : ''}`}
              onClick={() => setShowSimSandbox(!showSimSandbox)}
              title="Toggle What-If Telemetry Simulation Sandbox"
            >
              <Sliders size={14} />
              <span>{showSimSandbox ? 'Hide Sandbox' : 'What-If Simulation'}</span>
            </button>

            <button 
              className="ai-modal-close-btn"
              onClick={closePredictionCenter}
              title="Close AI Center (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* What-If Telemetry Sandbox (Collapsible) */}
        {showSimSandbox && (
          <div className="ai-sim-sandbox-panel">
            <div className="sandbox-head">
              <div className="sandbox-head-title">
                <Sliders size={15} className="text-amber" />
                <span>What-If Telemetry Injection Sandbox (Test Forward Predictions)</span>
              </div>
              <button className="btn-reset-sim" onClick={handleResetSim}>
                <RotateCcw size={12} />
                <span>Reset to Live Sensors</span>
              </button>
            </div>

            <form className="sandbox-sliders-grid" onSubmit={handleSimulate}>
              <div className="slider-group">
                <label>
                  <span>Generator Temp:</span>
                  <strong className="mono-num text-rose">{simTemp}°C</strong>
                </label>
                <input 
                  type="range" 
                  min="60" 
                  max="115" 
                  step="0.5" 
                  value={simTemp}
                  onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <label>
                  <span>Battery Reserve:</span>
                  <strong className="mono-num text-amber">{simBatt}%</strong>
                </label>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  step="1" 
                  value={simBatt}
                  onChange={(e) => setSimBatt(parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <label>
                  <span>Station Load:</span>
                  <strong className="mono-num text-cyan">{simLoad} kW</strong>
                </label>
                <input 
                  type="range" 
                  min="80" 
                  max="220" 
                  step="2" 
                  value={simLoad}
                  onChange={(e) => setSimLoad(parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <label>
                  <span>Wind Velocity:</span>
                  <strong className="mono-num text-blue">{simWind} km/h</strong>
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="95" 
                  step="1" 
                  value={simWind}
                  onChange={(e) => setSimWind(parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <label>
                  <span>Bearing Vibration:</span>
                  <strong className="mono-num text-purple">{simVib.toFixed(1)} mm/s</strong>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="7"
                  step="0.1"
                  value={simVib}
                  onChange={(e) => setSimVib(parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-submit-wrap">
                <button type="submit" className="btn-run-sim" disabled={loading}>
                  <Sparkles size={14} />
                  <span>{loading ? 'Recalculating…' : 'Run AI Prediction'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Global KPIs Ribbon */}
        <div className="ai-modal-kpi-ribbon">
          <div className="ai-kpi-box">
            <span className="ai-kpi-lbl">STATION RISK INDEX</span>
            <div className="ai-kpi-val-row">
              <span className={`ai-kpi-score mono-num ${station_risk_score >= 35 ? 'text-rose' : 'text-emerald'}`}>
                {station_risk_score} / 100
              </span>
              <span className={`ai-kpi-badge risk-${station_risk_level.toLowerCase()}`}>
                {station_risk_level}
              </span>
            </div>
          </div>

          <div className="ai-kpi-box">
            <span className="ai-kpi-lbl">24H HEALTH TRAJECTORY</span>
            <div className="ai-kpi-val-row">
              <span className="ai-kpi-score mono-num text-cyan">{current_health_score}</span>
              <span className="text-muted">➔</span>
              <span className="ai-kpi-score mono-num text-amber">{projected_health_24h}</span>
            </div>
          </div>

          <div className="ai-kpi-box">
            <span className="ai-kpi-lbl">ACTIVE FORECAST ENGINE</span>
            <div className="ai-kpi-val-row">
              <span className="ai-kpi-model text-purple">Physics + Neural ML Regressor</span>
            </div>
          </div>

          <div className="ai-kpi-box">
            <span className="ai-kpi-lbl">SELECTED MODEL HORIZON</span>
            <div className="ai-kpi-val-row">
              <span className="ai-kpi-model text-cyan">{currentItem?.forecast_window || '—'}</span>
            </div>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="ai-modal-subnav">
          <button 
            className={`ai-cat-pill ${activeCategoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('all')}
          >
            <Sparkles size={13} />
            <span>All Predictions ({predictions.length})</span>
          </button>
          <button 
            className={`ai-cat-pill ${activeCategoryFilter === 'energy' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('energy')}
          >
            <Zap size={13} />
            <span>Energy & Grid ({category_summary.energy?.length || 0})</span>
          </button>
          <button 
            className={`ai-cat-pill ${activeCategoryFilter === 'infrastructure' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('infrastructure')}
          >
            <Cpu size={13} />
            <span>Infrastructure & Bearings ({category_summary.infrastructure?.length || 0})</span>
          </button>
          <button 
            className={`ai-cat-pill ${activeCategoryFilter === 'environment' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('environment')}
          >
            <CloudSnow size={13} />
            <span>Environment & Blizzard ({category_summary.environment?.length || 0})</span>
          </button>
          <button 
            className={`ai-cat-pill ${activeCategoryFilter === 'logistics' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('logistics')}
          >
            <Package size={13} />
            <span>Logistics & Fuel ({category_summary.logistics?.length || 0})</span>
          </button>
          <button 
            className={`ai-cat-pill ${activeCategoryFilter === 'communication' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('communication')}
          >
            <Radio size={13} />
            <span>Satcom & Space Link ({category_summary.communication?.length || 0})</span>
          </button>
        </div>

        {/* Main Content Split: Left List & Right Detailed Chart View */}
        <div className="ai-modal-main-split">
          {/* Left Column: Predictions List */}
          <div className="ai-modal-list-col">
            {filteredPredictions.map((pred) => {
              const Icon = categoryIcons[pred.category] || Sparkles;
              const isSelected = currentItem?.id === pred.id;
              const isCrit = pred.risk_level === 'CRITICAL';
              const isHigh = pred.risk_level === 'HIGH';
              const isMod = pred.risk_level === 'MODERATE';
              const riskTag = isCrit ? 'card-risk-crit' : isHigh ? 'card-risk-high' : isMod ? 'card-risk-mod' : 'card-risk-ok';

              return (
                <div
                  key={pred.id}
                  className={`ai-list-card ${riskTag} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedPrediction(pred)}
                >
                  <div className="ai-list-card-head">
                    <div className="ai-list-icon-box">
                      <Icon size={15} />
                    </div>
                    <span className="ai-list-card-title">{pred.title}</span>
                    <span className={`ai-list-badge ${riskTag}`}>{pred.risk_level}</span>
                  </div>

                  <div className="ai-list-metrics-row">
                    <span className="ai-list-val mono-num">
                      Current: <strong>{pred.current_val}</strong> ➔ Target: <strong className="text-cyan">{pred.predicted_val}</strong>
                    </span>
                  </div>

                  <div className="ai-list-footer-row">
                    <span className="ai-list-countdown mono-num">
                      Breach: {pred.time_to_breach}
                    </span>
                    <span className="ai-list-conf mono-num">{pred.confidence}% Confidence</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Detailed Forecast Chart & Prescriptive Recommendation */}
          <div className="ai-modal-detail-col">
            {currentItem && (
              <div className="ai-detail-inspection-pane">
                {/* Detail Header */}
                <div className="detail-pane-head">
                  <div>
                    <span className="detail-category-tag">{currentItem.category?.toUpperCase()} PREDICTION MODEL</span>
                    <h3 className="detail-pane-title">{currentItem.title}</h3>
                  </div>
                  <div className="detail-confidence-pill mono-num">
                    Confidence: <strong>{currentItem.confidence}%</strong>
                  </div>
                </div>

                {/* SVG Forecast Graph with Confidence Interval & Threshold */}
                <div className="forecast-chart-card">
                  <div className="chart-legend-row">
                    <span className="legend-item text-cyan">● Predicted Trajectory ({series[0]?.unit})</span>
                    <span className="legend-item text-purple">░ 95% Confidence Band</span>
                    <span className="legend-item text-rose">--- Critical Threshold ({currentItem.threshold})</span>
                  </div>

                  <div className="svg-wrapper" style={{ height: 200, width: '100%', position: 'relative' }}>
                    <svg key={`${currentItem.id}-${predictiveData.timestamp}`} width="100%" height="100%" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="aiConfidenceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>

                      {/* Gridlines */}
                      {[0, 0.33, 0.66, 1].map((p, idx) => {
                        const y = padT + innerH - p * innerH;
                        const v = (minV + p * valRange).toFixed(1);
                        return (
                          <g key={idx}>
                            <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                            <text x={padL - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                              {v}
                            </text>
                          </g>
                        );
                      })}

                      {/* Time X-Axis */}
                      {series.map((s, i) => (
                        <text key={i} x={getX(i)} y={chartH - 8} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                          {s.time}
                        </text>
                      ))}

                      {/* Confidence Band Polygon */}
                      {confidenceBandPolygon && (
                        <polygon points={confidenceBandPolygon} fill="url(#aiConfidenceGradient)" />
                      )}

                      {/* Threshold Line */}
                      {thresholdY !== null && (
                        <g>
                          <line x1={padL} y1={thresholdY} x2={chartW - padR} y2={thresholdY} stroke="#f87171" strokeWidth="1.8" strokeDasharray="4 4" />
                          <text x={chartW - padR} y={thresholdY - 5} textAnchor="end" fill="#f87171" fontSize="9" fontWeight="bold" fontFamily="monospace">
                            THRESHOLD: {series[0]?.threshold} {series[0]?.unit}
                          </text>
                        </g>
                      )}

                      {/* Predicted Trajectory Line */}
                      <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" points={linePoints} strokeLinecap="round" strokeLinejoin="round" />

                      {/* Data Dots & Callouts */}
                      {series.map((s, i) => (
                        <g key={i}>
                          <circle cx={getX(i)} cy={getY(s.predicted_value)} r="3.5" fill="#38bdf8" stroke="#060b14" strokeWidth="1.5" />
                          <text x={getX(i)} y={getY(s.predicted_value) - 8} textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                            {s.predicted_value}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Physics Explanation & Actionable Recommendation */}
                <div className="detail-explanation-card">
                  <div className="expl-row">
                    <div className="expl-icon-wrap text-cyan">
                      <Activity size={16} />
                    </div>
                    <div>
                      <h4 className="expl-title">Physics & Sensor Telemetry Explanation</h4>
                      <p className="expl-body">{currentItem.explanation}</p>
                    </div>
                  </div>

                  <div className="expl-row" style={{ marginTop: 12 }}>
                    <div className="expl-icon-wrap text-emerald">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <h4 className="expl-title text-emerald">Prescriptive AI Action & Mitigation Directive</h4>
                      <p className="expl-body">{currentItem.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
