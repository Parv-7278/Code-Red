import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Flame, 
  Zap, 
  Radio, 
  Snowflake, 
  Play, 
  RefreshCw,
  Search,
  Check,
  XCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { usePredictive } from '../context/PredictiveContext';
import { STATIONS_DATA } from '../data/stationsData';
import { triggerScenario, acknowledgeAlert } from '../services/api';
import { Sparkles, ArrowRight, Activity, ChevronRight } from 'lucide-react';

export default function AlertsView({ selectedStation }) {
  const { isIndiaOperator, assignedStation } = useAuth();
  const { alerts: liveAlerts, triggerAnomaly, refreshTelemetry } = useTelemetry();
  const { predictiveData, openPredictionCenter, isSimulating } = usePredictive();

  const [activeAlertTab, setActiveAlertTab] = useState('active'); // 'active' | 'predictive'
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [stationFilter, setStationFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  const [injectingScenario, setInjectingScenario] = useState(null);

  useEffect(() => {
    if (!isIndiaOperator && assignedStation) {
      setStationFilter(assignedStation);
    } else if (selectedStation && selectedStation !== 'all-stations') {
      setStationFilter(selectedStation);
    } else {
      setStationFilter('ALL');
    }
  }, [assignedStation, isIndiaOperator, selectedStation]);

  const maitriData = STATIONS_DATA['station-maitri'];
  const bharatiData = STATIONS_DATA['station-bharati'];

  // Master initial alerts pool with rich metadata
  const masterAlerts = [
    {
      id: 'alt-01',
      stationId: 'station-bharati',
      stationName: 'Bharati',
      title: 'Generator G-02 Stator Core Thermal Runaway Risk',
      severity: 'CRITICAL',
      priority: 'P1',
      category: 'POWER GRID',
      subsystem: 'Power House / Diesel Genset G-02',
      timestamp: '4 mins ago',
      details: 'Stator core winding temperature elevated to 95.0°C (threshold: 90.0°C). Risk of alternator winding breakdown.',
      recommendedAction: 'Engage Remote SCADA override to switch load to standby Genset G-01 immediately.',
      status: 'ACTIVE'
    },
    {
      id: 'alt-02',
      stationId: 'station-maitri',
      stationName: 'Maitri',
      title: 'Bulk Diesel Fuel Reserve Depletion Warning',
      severity: 'HIGH',
      priority: 'P2',
      category: 'LOGISTICS',
      subsystem: 'Fuel Farm / Tank T-01 & T-02',
      timestamp: '18 mins ago',
      details: 'Current bulk fuel stock at 50,200 L provides 43 days of operational endurance. 44th ISEA resupply vessel ETA in 38 days.',
      recommendedAction: 'Initiate non-essential heating circuit optimization to conserve 80 L/day.',
      status: 'ACTIVE'
    },
    {
      id: 'alt-03',
      stationId: 'station-bharati',
      stationName: 'Bharati',
      title: 'High Katabatic Wind Gale Exceeding 60 km/h',
      severity: 'WARNING',
      priority: 'P3',
      category: 'METEOROLOGY',
      subsystem: 'Promontory Weather Transducer Array',
      timestamp: '32 mins ago',
      details: 'Sustained coastal gale gusts reached 62 km/h from ESE. Ice drift rate elevated to 1.75 cm/hr.',
      recommendedAction: 'Recall all outdoor science parties and inspect satcom dish radome guy wires.',
      status: 'ACTIVE'
    },
    {
      id: 'alt-04',
      stationId: 'station-maitri',
      stationName: 'Maitri',
      title: 'Lake Priyadarshini Trace Heating Loop Current Nominal',
      severity: 'INFO',
      priority: 'P4',
      category: 'LIFE SUPPORT',
      subsystem: 'Potable Water Pipeline Conduit',
      timestamp: '1 hour ago',
      details: 'Scheduled diagnostic ping confirmed +4.5°C anti-freeze flow along 420m intake pipe.',
      recommendedAction: 'No operator action required. Routine SCADA log entry.',
      status: 'RESOLVED'
    },
    {
      id: 'alt-05',
      stationId: 'station-bharati',
      stationName: 'Bharati',
      title: 'Seawater Reverse Osmosis Membrane Backwash Completed',
      severity: 'INFO',
      priority: 'P4',
      category: 'WATER TREATMENT',
      subsystem: 'Desalination Membrane Bank #2',
      timestamp: '2 hours ago',
      details: 'Automated high-pressure permeate rinse cycle concluded. Flux rate restored to 950 L/day.',
      recommendedAction: 'No operator action required.',
      status: 'RESOLVED'
    }
  ];

  const handleAcknowledge = async (id) => {
    setAcknowledgedIds(prev => new Set([...prev, id]));
    try {
      await acknowledgeAlert(id);
    } catch (err) {
      console.warn('Backend ack note:', err);
    }
  };

  const handleTriggerScenario = async (scenarioType) => {
    setInjectingScenario(scenarioType);
    try {
      if (triggerAnomaly) {
        triggerAnomaly();
      }
      const targetStation = stationFilter !== 'ALL'
        ? stationFilter
        : selectedStation === 'station-bharati'
          ? 'station-bharati'
          : 'station-maitri';
      await triggerScenario(scenarioType, targetStation);
      if (refreshTelemetry) refreshTelemetry();
    } catch (err) {
      console.warn('Scenario triggered:', err);
    } finally {
      setTimeout(() => setInjectingScenario(null), 1500);
    }
  };

  // Filter alerts by Station, Severity, and Search Query
  const accessibleAlerts = masterAlerts.filter((a) => {
    if (!isIndiaOperator && assignedStation && a.stationId !== assignedStation) {
      return false;
    }
    return true;
  });

  const stationScopedAlerts = accessibleAlerts.filter((a) => {
    if (isIndiaOperator && stationFilter !== 'ALL' && a.stationId !== stationFilter) {
      return false;
    }
    return true;
  });

  const filteredAlerts = stationScopedAlerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.subsystem.toLowerCase().includes(q) || a.details.toLowerCase().includes(q);
    }
    return true;
  });

  const criticalCount = stationScopedAlerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = stationScopedAlerts.filter(a => a.severity === 'HIGH').length;
  const warningCount = stationScopedAlerts.filter(a => a.severity === 'WARNING').length;
  const infoCount = stationScopedAlerts.filter(a => a.severity === 'INFO').length;

  return (
    <div className="tab-page-container alerts-view-container">
      {/* Top Banner Header */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">Mission Incident Management & Emergency Operations Center</h2>
          <span className="tab-page-subtitle">
            {selectedStation === 'all-stations'
              ? 'Unified Maitri and Bharati alert telemetry, fault correlation and SCADA incident dispatch'
              : `${selectedStation === 'station-bharati' ? 'Bharati' : 'Maitri'} station alert telemetry, fault correlation and incident response`}
          </span>
        </div>
        <div className="header-status-badge">
          <ShieldAlert size={14} className="text-amber" />
          <span>INCIDENT ESCALATION PROTOCOL: LEVEL 2 ACTIVE</span>
        </div>
      </div>

      {/* Alert Mode Switcher: Active Incidents vs. AI Predictive Early Warnings */}
      <div className="alerts-subnav-switch">
        <button
          className={`alerts-tab-btn ${activeAlertTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveAlertTab('active')}
        >
          <Bell size={14} />
          <span>Active SCADA Incident Log ({stationScopedAlerts.length})</span>
        </button>

        <button
          className={`alerts-tab-btn ai-tab-btn ${activeAlertTab === 'predictive' ? 'active' : ''}`}
          onClick={() => setActiveAlertTab('predictive')}
        >
          <Sparkles size={14} className="text-cyan" />
          <span>AI Predicted Early Warnings ({predictiveData?.predictions?.length || 7})</span>
          {isSimulating && <span className="ai-sim-badge">SIMULATED</span>}
        </button>
      </div>

      {activeAlertTab === 'predictive' ? (
        /* ====================================================================
           AI PREDICTED EARLY WARNINGS VIEW (FORWARD-LOOKING)
           ==================================================================== */
        <div className="ai-predicted-alerts-view">
          <div className="ai-pred-banner-info polaris-card">
            <div className="ai-p-left">
              <Sparkles size={18} className="text-cyan" />
              <div>
                <h4 className="ai-p-title">Physics-Informed Multi-Horizon Machine Learning Forecasts</h4>
                <p className="ai-p-desc">
                  Forward-looking anomaly extrapolation across thermal, electrical, mechanical, and meteorological sensor streams before physical threshold trips occur.
                </p>
              </div>
            </div>
            <button 
              className="btn-open-ai-center"
              onClick={() => openPredictionCenter(null, 'all')}
            >
              <Sparkles size={13} />
              <span>Launch AI Prediction Center</span>
            </button>
          </div>

          <div className="ai-predicted-cards-list">
            {(predictiveData?.predictions || []).map((pred) => {
              const isCrit = pred.risk_level === 'CRITICAL';
              const isHigh = pred.risk_level === 'HIGH';
              const isMod = pred.risk_level === 'MODERATE';
              const riskTag = isCrit ? 'card-risk-crit' : isHigh ? 'card-risk-high' : isMod ? 'card-risk-mod' : 'card-risk-ok';

              return (
                <div 
                  key={pred.id} 
                  className={`incident-item-card polaris-card ai-pred-card ${riskTag}`}
                  onClick={() => openPredictionCenter(pred, pred.category)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="incident-card-top">
                    <div className="incident-badge-cluster">
                      <span className={`severity-badge ${riskTag}`}>
                        AI PREDICTION • {pred.risk_level} RISK
                      </span>
                      <span className="station-badge-pill">
                        {pred.station_name?.toUpperCase()}
                      </span>
                      <span className="subsystem-badge-pill">
                        {pred.category.toUpperCase()} DOMAIN
                      </span>
                    </div>

                    <div className="incident-time-cluster">
                      <Clock size={12} className="text-dim" />
                      <span className="time-txt text-rose font-bold">
                        Breach in: {pred.time_to_breach}
                      </span>
                      <span className="ai-conf-badge mono-num">
                        {pred.confidence}% Conf.
                      </span>
                    </div>
                  </div>

                  <h3 className="incident-title">{pred.title}</h3>
                  <p className="incident-details">{pred.explanation}</p>

                  <div className="ai-pred-metric-strip">
                    <div className="ai-p-metric">
                      <span className="ai-pm-lbl">Current Sensor:</span>
                      <span className="ai-pm-val mono-num">{pred.current_val}</span>
                    </div>
                    <div className="ai-p-metric">
                      <span className="ai-pm-lbl">Projected Target:</span>
                      <span className="ai-pm-val mono-num text-cyan font-bold">{pred.predicted_val}</span>
                    </div>
                    <div className="ai-p-metric">
                      <span className="ai-pm-lbl">Trip Threshold:</span>
                      <span className="ai-pm-val mono-num text-muted">{pred.threshold}</span>
                    </div>
                  </div>

                  <div className="incident-action-box">
                    <div className="action-txt-wrap">
                      <span className="action-label text-cyan">PRESCRIPTIVE AI MITIGATION DIRECTIVE:</span>
                      <span className="action-desc">{pred.recommendation}</span>
                    </div>

                    <div className="action-btn-cluster">
                      <button 
                        className="btn-inspect-model"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPredictionCenter(pred, pred.category);
                        }}
                      >
                        <Sparkles size={12} />
                        <span>Inspect Forecast Curve</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ====================================================================
           ACTIVE SCADA INCIDENTS LOG (HISTORICAL & REALTIME TRIPS)
           ==================================================================== */
        <>
          {/* KPI Severity Strip */}
          <div className="alerts-kpi-strip">
            <div 
              className={`alert-kpi-pill ${severityFilter === 'ALL' ? 'active-filter' : ''}`}
              onClick={() => setSeverityFilter('ALL')}
            >
              <span className="kpi-count">{stationScopedAlerts.length}</span>
              <span className="kpi-label">TOTAL INCIDENTS</span>
            </div>

            <div 
              className={`alert-kpi-pill pill-critical ${severityFilter === 'CRITICAL' ? 'active-filter' : ''}`}
              onClick={() => setSeverityFilter('CRITICAL')}
            >
              <span className="kpi-count text-critical">{criticalCount}</span>
              <span className="kpi-label">CRITICAL (P1)</span>
            </div>

            <div 
              className={`alert-kpi-pill pill-high ${severityFilter === 'HIGH' ? 'active-filter' : ''}`}
              onClick={() => setSeverityFilter('HIGH')}
            >
              <span className="kpi-count text-high">{highCount}</span>
              <span className="kpi-label">HIGH PRIORITY (P2)</span>
            </div>

            <div 
              className={`alert-kpi-pill pill-warning ${severityFilter === 'WARNING' ? 'active-filter' : ''}`}
              onClick={() => setSeverityFilter('WARNING')}
            >
              <span className="kpi-count text-warning">{warningCount}</span>
              <span className="kpi-label">WARNING (P3)</span>
            </div>

            <div 
              className={`alert-kpi-pill pill-info ${severityFilter === 'INFO' ? 'active-filter' : ''}`}
              onClick={() => setSeverityFilter('INFO')}
            >
              <span className="kpi-count text-info">{infoCount}</span>
              <span className="kpi-label">ROUTINE / INFO (P4)</span>
            </div>
          </div>

          {/* Controls & Search Bar */}
          <div className="alerts-filter-bar polaris-card">
            <div className="filter-left-group">
              {/* Station Selector (India Operator Only) */}
              {isIndiaOperator && (
                <div className="station-filter-pills">
                  <span className="filter-label">Station Scope:</span>
                  <button 
                    className={`st-filter-btn ${stationFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setStationFilter('ALL')}
                  >
                    All Stations
                  </button>
                  <button 
                    className={`st-filter-btn ${stationFilter === 'station-maitri' ? 'active' : ''}`}
                    onClick={() => setStationFilter('station-maitri')}
                  >
                    Maitri
                  </button>
                  <button 
                    className={`st-filter-btn ${stationFilter === 'station-bharati' ? 'active' : ''}`}
                    onClick={() => setStationFilter('station-bharati')}
                  >
                    Bharati
                  </button>
                </div>
              )}

              {/* Search Box */}
              <div className="alerts-search-box">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search incidents by keyword or subsystem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="alerts-search-input"
                />
              </div>
            </div>

            {/* Quick Fault Injection Buttons */}
            <div className="fault-injection-strip">
              <span className="inj-title">Inject Simulated Fault:</span>
              <button 
                className="btn-fault-inject btn-fault-danger"
                onClick={() => handleTriggerScenario('GENERATOR_OVERHEAT')}
                disabled={injectingScenario !== null}
              >
                <Flame size={12} />
                <span>Genset Overheat (95°C)</span>
              </button>
              <button 
                className="btn-fault-inject"
                onClick={() => handleTriggerScenario('BLIZZARD_ALERT')}
                disabled={injectingScenario !== null}
              >
                <Snowflake size={12} />
                <span>Severe Blizzard</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Incidents List Cards */}
      <div className="incidents-cards-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-incidents-box polaris-card">
            <CheckCircle2 size={32} className="text-emerald" />
            <h4>No active incidents matching selected criteria.</h4>
            <p>All Antarctic SCADA subsystems operating within nominal telemetry tolerances.</p>
          </div>
        ) : (
          filteredAlerts.map((incident) => {
            const isAcked = acknowledgedIds.has(incident.id);
            const isCrit = incident.severity === 'CRITICAL';
            const isHigh = incident.severity === 'HIGH';
            const isWarn = incident.severity === 'WARNING';

            return (
              <div 
                key={incident.id} 
                className={`incident-item-card polaris-card border-${incident.severity.toLowerCase()} ${isAcked ? 'incident-acknowledged' : ''}`}
              >
                <div className="incident-card-top">
                  <div className="incident-badge-cluster">
                    <span className={`severity-badge badge-${incident.severity.toLowerCase()}`}>
                      {incident.severity} • {incident.priority}
                    </span>
                    <span className="station-badge-pill">
                      {incident.stationName.toUpperCase()} STATION
                    </span>
                    <span className="subsystem-badge-pill">
                      {incident.subsystem}
                    </span>
                  </div>
                  <div className="incident-time-cluster">
                    <Clock size={12} className="text-dim" />
                    <span className="time-txt">{incident.timestamp}</span>
                  </div>
                </div>

                <h3 className="incident-title">{incident.title}</h3>
                <p className="incident-details">{incident.details}</p>

                <div className="incident-action-box">
                  <div className="action-txt-wrap">
                    <span className="action-label">RECOMMENDED SCADA ACTION:</span>
                    <span className="action-desc">{incident.recommendedAction}</span>
                  </div>

                  <div className="action-btn-cluster">
                    {isAcked ? (
                      <span className="status-ack-pill">
                        <Check size={12} />
                        <span>ACKNOWLEDGED BY HQ</span>
                      </span>
                    ) : (
                      <button 
                        className="btn-ack-incident"
                        onClick={() => handleAcknowledge(incident.id)}
                      >
                        <Check size={12} />
                        <span>Acknowledge Incident</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
