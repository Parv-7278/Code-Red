import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Zap, 
  RotateCcw, 
  Flame, 
  ShieldAlert, 
  Send, 
  CheckCircle2, 
  Clock, 
  Terminal, 
  AlertTriangle, 
  Activity,
  Layers,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { fetchRemoteOperations, executeRemoteCommand } from '../services/api';
import { STATIONS_DATA } from '../data/stationsData';
import { formatStationTime, getStationTimezoneLabel } from '../utils/timeUtils';

export default function RemoteOperationsView({ selectedStation }) {
  const { profile, isIndiaOperator, assignedStation } = useAuth();
  const { liveTelemetry, refreshTelemetry } = useTelemetry();

  const stationId = selectedStation === 'all-stations' ? 'station-bharati' : selectedStation;
  const currentStationData = STATIONS_DATA[stationId] || STATIONS_DATA['station-maitri'];

  const [commands, setCommands] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const loadOperations = async () => {
    try {
      setLoading(true);
      const data = await fetchRemoteOperations(
        stationId, 
        profile?.role || 'india_operator', 
        assignedStation
      );
      if (data && data.available_commands) {
        setCommands(data.available_commands);
        setAuditLog(data.execution_history || []);
      }
    } catch (err) {
      console.warn('Could not fetch remote operations from API, using fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
  }, [stationId]);

  const handleSendCommand = async (cmd) => {
    const confirmed = window.confirm(
      `Run the simulated command "${cmd.label}" for ${currentStationData.name}? This does not control physical equipment.`
    );
    if (!confirmed) return;

    setDispatchingId(cmd.id);
    setFeedbackMessage({
      type: 'transmitting',
      text: `Sending simulated command "${cmd.label}" to the ${currentStationData.name} digital twin...`
    });

    try {
      const operatorName = profile?.full_name || (isIndiaOperator ? 'Dr. Rajesh Sharma (India HQ)' : 'Station Lead');
      const payload = {
        command: cmd.label,
        commandCode: cmd.id,
        category: cmd.category,
        priority: cmd.priority
      };

      // Simulate step 1: Uplink transit delay (400ms)
      await new Promise(r => setTimeout(r, 450));

      const res = await executeRemoteCommand(
        stationId,
        payload,
        operatorName,
        profile?.role || 'india_operator',
        assignedStation
      );

      if (res && res.command) {
        setAuditLog(prev => [res, ...prev.filter(x => x.id !== res.id)]);
      } else {
        // Fallback local append if backend returns custom structure
        const localRecord = {
          id: `cmd-local-${Date.now()}`,
          command: cmd.label,
          stationId: stationId,
          operator: operatorName,
          timestamp: new Date().toISOString(),
          mode: 'SIMULATION',
          status: 'COMPLETED_SIMULATION',
          result: `Command acknowledged by the ${currentStationData.name} digital-twin simulator.`
        };
        setAuditLog(prev => [localRecord, ...prev]);
      }

      // If switching generator, trigger a live telemetry refresh
      if (cmd.id === 'SWITCH_BACKUP_GEN' && refreshTelemetry) {
        refreshTelemetry();
      }

      setFeedbackMessage({
        type: 'success',
        text: `✓ SIMULATION COMPLETED: "${cmd.label}" was applied to the ${currentStationData.name} digital twin.`
      });

      // Clear feedback after 4 seconds
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: `Command dispatch failed: ${err.message || 'Satellite link timeout'}`
      });
    } finally {
      setDispatchingId(null);
    }
  };

  const commandPresets = [
    {
      id: 'SWITCH_BACKUP_GEN',
      label: 'Switch to Backup Generator (G-02 → G-01)',
      description: 'Engages standby diesel alternator unit. Overheats on primary generator G-02 are safely bypassed.',
      icon: Zap,
      category: 'POWER GRID',
      priority: 'CRITICAL PRIORITY',
      badgeClass: 'badge-critical'
    },
    {
      id: 'EMERGENCY_LOAD_SHED',
      label: 'Initiate Non-Critical Load Shedding',
      description: 'Disconnects auxiliary laboratory heating and high-draw non-essential loads to safeguard life support.',
      icon: RotateCcw,
      category: 'POWER DEMAND',
      priority: 'HIGH PRIORITY',
      badgeClass: 'badge-high'
    },
    {
      id: 'BOOST_TRACE_HEATING',
      label: 'Boost Pipeline Anti-Freeze Trace Heating',
      description: 'Ramps electrical trace heating elements along potable water and waste discharge conduits by +25%.',
      icon: Flame,
      category: 'THERMAL LIFE-SUPPORT',
      priority: 'MEDIUM PRIORITY',
      badgeClass: 'badge-medium'
    },
    {
      id: 'RESET_COMMS_MAST',
      label: 'Recalibrate X-Band Satcom Uplink Dish',
      description: 'Re-aligns antenna azimuth and elevation gimbal tracking towards INSAT-4CR geostationary orbital slot.',
      icon: Radio,
      category: 'SATCOM UPLINK',
      priority: 'NORMAL PRIORITY',
      badgeClass: 'badge-normal'
    }
  ];

  return (
    <div className="tab-page-container remote-ops-container">
      {/* Top Banner Header */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">Remote SCADA Operations & Subsystem Overrides</h2>
          <span className="tab-page-subtitle">
            Secure Space-Ground Uplink Controller • Target: {currentStationData.name} ({currentStationData.region})
          </span>
        </div>
        <button 
          className="refresh-btn"
          onClick={loadOperations}
          disabled={loading}
          title="Refresh Remote Command Audit Log"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh SCADA State</span>
        </button>
      </div>

      {/* Real-time Status Feedback Bar */}
      {feedbackMessage && (
        <div className={`remote-feedback-banner ${feedbackMessage.type}`}>
          {feedbackMessage.type === 'transmitting' ? (
            <Activity className="animate-pulse" size={16} />
          ) : feedbackMessage.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Action Panel (Left) & Command Telemetry / Audit Log (Right) */}
      <div className="remote-ops-grid">
        {/* Left: Available Remote Commands */}
        <div className="remote-controls-card">
          <div className="card-header-cluster">
            <Terminal size={18} className="text-cyan" />
            <h3 className="panel-title">Mission Command Uplink Console</h3>
          </div>
          <p className="panel-description">
            Subsystem commands dispatched here are packaged into priority-tagged telemetry packets and transmitted over the simulated ISRO satellite link.
          </p>

          <div className="command-cards-list">
            {commandPresets.map((cmd) => {
              const IconComp = cmd.icon;
              const isDispatching = dispatchingId === cmd.id;

              return (
                <div key={cmd.id} className="command-preset-card">
                  <div className="command-card-top">
                    <div className="command-icon-box">
                      <IconComp size={20} />
                    </div>
                    <div className="command-title-wrap">
                      <div className="command-meta-row">
                        <span className="command-category">{cmd.category}</span>
                        <span className={`command-priority-badge ${cmd.badgeClass}`}>
                          {cmd.priority}
                        </span>
                      </div>
                      <h4 className="command-label">{cmd.label}</h4>
                    </div>
                  </div>

                  <p className="command-desc">{cmd.description}</p>

                  <div className="command-card-footer">
                    <button
                      className={`execute-cmd-btn ${cmd.id === 'SWITCH_BACKUP_GEN' ? 'btn-danger-highlight' : ''}`}
                      onClick={() => handleSendCommand(cmd)}
                      disabled={isDispatching}
                    >
                      {isDispatching ? (
                        <>
                          <Activity size={14} className="animate-spin" />
                          <span>Transmitting Uplink...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Dispatch Command</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Subsystem Telemetry & Audit Log */}
        <div className="remote-log-column">
          {/* Subsystem Readiness Matrix */}
          <div className="readiness-matrix-card">
            <div className="card-header-cluster">
              <Cpu size={18} className="text-cyan" />
              <h3 className="panel-title">Subsystem SCADA Actuator States</h3>
            </div>
            <div className="actuator-grid">
              <div className="actuator-item">
                <span className="actuator-label">Diesel Genset G-01</span>
                <span className="actuator-value status-online">STANDBY / READY</span>
              </div>
              <div className="actuator-item">
                <span className="actuator-label">Diesel Genset G-02</span>
                <span className={`actuator-value ${liveTelemetry?.generator_temperature > 90 ? 'status-critical' : liveTelemetry?.generator_temperature >= 85 ? 'status-warning' : 'status-online'}`}>
                  {liveTelemetry?.generator_temperature ? `${liveTelemetry.generator_temperature}°C` : 'ONLINE / 70.0°C'}
                </span>
              </div>
              <div className="actuator-item">
                <span className="actuator-label">Trace Heating Loop</span>
                <span className="actuator-value status-online">ACTIVE (100%)</span>
              </div>
              <div className="actuator-item">
                <span className="actuator-label">Satcom Dish Azimuth</span>
                <span className="actuator-value status-online">LOCKED 45.2°E</span>
              </div>
            </div>
          </div>

          {/* Audit Trail Table */}
          <div className="audit-log-card">
            <div className="card-header-cluster">
              <Clock size={18} className="text-cyan" />
              <h3 className="panel-title">Command Execution History & Audit Trail</h3>
            </div>
            <div className="audit-table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Command</th>
                    <th>Station</th>
                    <th>Operator</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">
                        No remote commands executed in this session.
                      </td>
                    </tr>
                  ) : (
                    auditLog.map((entry, idx) => (
                      <tr key={entry.id || idx}>
                        <td className="cmd-cell">
                          <span className="cmd-name">{entry.command}</span>
                          {entry.result && <span className="cmd-subresult">{entry.result}</span>}
                        </td>
                        <td>
                          <span className="station-code-pill">
                            {entry.stationId === 'station-maitri' ? 'MAITRI' : 'BHARATI'}
                          </span>
                        </td>
                        <td className="operator-cell">{entry.operator || 'Mission Controller'}</td>
                        <td className="time-cell">
                          {entry.timestamp 
                            ? `${formatStationTime(entry.timestamp, entry.stationId)} (${getStationTimezoneLabel(entry.stationId)})`
                            : 'Just now'}
                        </td>
                        <td>
                          <span className="status-executed-badge">
                            <CheckCircle2 size={12} />
                            <span>{entry.status || 'EXECUTED'}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
