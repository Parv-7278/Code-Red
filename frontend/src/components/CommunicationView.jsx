import React, { useState, useEffect } from 'react';
import {
  Radio,
  Satellite,
  ArrowDownUp,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Clock,
  Send,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Server,
  Signal,
  Wifi,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Filter,
  Info,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  FileText
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { STATIONS_DATA } from '../data/stationsData';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';
import AIPredictionIndicator from './AIPredictionIndicator';

export default function CommunicationView({ selectedStation }) {
  const stationId = selectedStation === 'all-stations' ? 'station-bharati' : selectedStation;
  const station = STATIONS_DATA[stationId] || STATIONS_DATA['station-bharati'];
  const isMaitri = station.id === 'station-maitri';

  const { queueMetrics, benchmarkData, runLiveBenchmark, isConnected } = useTelemetry();

  // Navigation tab within Comms
  const [commTab, setCommTab] = useState('overview'); // 'overview' | 'stream' | 'benchmark' | 'satellites'

  // Packet Injection Sandbox State
  const [messagePriority, setMessagePriority] = useState('CRITICAL');
  const [messageType, setMessageType] = useState('EMERGENCY_LIFE_SUPPORT');
  const [isInjecting, setIsInjecting] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [isBenchmarkRunning, setIsBenchmarkRunning] = useState(false);
  const [isStreamLive, setIsStreamLive] = useState(true);

  // Injected Messages Table Data
  const [injectedMessages, setInjectedMessages] = useState([
    { 
      id: 'MSG-ISRO-9841', 
      type: 'EMERGENCY_ALARM', 
      priority: 'CRITICAL (P1)', 
      priorityLevel: 1, 
      size: '256 B', 
      queueDelay: 0, 
      satTransit: 240, 
      totalLatency: 240, 
      status: 'DELIVERED', 
      time: '1 min ago',
      notes: 'Preempted 4 queued normal packets'
    },
    { 
      id: 'MSG-ISRO-9840', 
      type: 'GENERATOR_STATOR_TEMP', 
      priority: 'HIGH (P2)', 
      priorityLevel: 2, 
      size: '1.2 KB', 
      queueDelay: 45, 
      satTransit: 245, 
      totalLatency: 290, 
      status: 'DELIVERED', 
      time: '3 mins ago',
      notes: 'Dispatched ahead of routine SCADA'
    },
    { 
      id: 'MSG-ISRO-9839', 
      type: 'SCADA_ROUTINE_POLL', 
      priority: 'NORMAL (P3)', 
      priorityLevel: 3, 
      size: '4.8 KB', 
      queueDelay: 180, 
      satTransit: 250, 
      totalLatency: 430, 
      status: 'DELIVERED', 
      time: '6 mins ago',
      notes: 'Rate-limited routine poll'
    },
    { 
      id: 'MSG-ISRO-9838', 
      type: 'SEISMIC_RAW_WAVEFORM', 
      priority: 'LOW (P4)', 
      priorityLevel: 4, 
      size: '64 KB', 
      queueDelay: 580, 
      satTransit: 280, 
      totalLatency: 860, 
      status: 'DELIVERED', 
      time: '8 mins ago',
      notes: 'Bulk buffered during high traffic'
    },
  ]);

  // Satellite Constellation Link Status tailored to Antarctic Operations
  const satelliteLinks = [
    {
      id: 'INSAT-4CR',
      name: 'INSAT-4CR (Geostationary 74°E)',
      role: 'Primary Tactical SCADA Telemetry & Telephony',
      frequency: 'Ku-Band (14.2 GHz Uplink / 11.5 GHz Downlink)',
      snr: '14.8 dB',
      snrStatus: 'Optimal',
      ber: '1.2 × 10⁻⁸ (Zero Loss)',
      elevation: isMaitri ? '24.5°' : '28.1°',
      azimuth: isMaitri ? '348.2°' : '332.6°',
      status: 'LOCKED & ONLINE',
      latency: '240 ms',
      coverage: 'Antarctic Maitri & Bharati Primary Footprint',
      dishSize: isMaitri ? '7.3m Earth Station Cassegrain' : '9.0m High-Latitude Radome',
    },
    {
      id: 'GSAT-30',
      name: 'GSAT-30 (Geostationary 83°E)',
      role: 'High-Bandwidth Science Payload & Earth Obs Data',
      frequency: 'C-Band (6.2 GHz Uplink / 4.0 GHz Downlink)',
      snr: '16.2 dB',
      snrStatus: 'Optimal',
      ber: '8.4 × 10⁻⁹ (Zero Loss)',
      elevation: isMaitri ? '21.8°' : '25.4°',
      azimuth: isMaitri ? '354.1°' : '341.8°',
      status: 'LOCKED & ONLINE',
      latency: '245 ms',
      coverage: 'Trans-Oceanic Indian Antarctic Corridor',
      dishSize: 'Dual High-Power C-Band Polar Antenna Array',
    },
    {
      id: 'CARTOSAT-2S',
      name: 'Cartosat-2 / Oceansat-3 (LEO Polar Orbit)',
      role: 'Direct X-Band Earth Station Downlink (Bharati Ground Station)',
      frequency: 'X-Band (8.1 GHz Downlink)',
      snr: '22.4 dB',
      snrStatus: 'Pass Active',
      ber: '2.1 × 10⁻¹⁰ (Zero Loss)',
      elevation: '48.2° (Ascending)',
      azimuth: '182.4°',
      status: 'ACTIVE PASS (11 min window)',
      latency: '15 ms',
      coverage: 'High-Speed LEO Polar Remote Sensing Telemetry',
      dishSize: 'Bharati Polar Tracking Radome Terminal',
    }
  ];

  // Latency Benchmark Data for Native SVG Visualization
  const latencyBenchmark = [
    { 
      priority: 'P1: Critical Emergency', 
      shortLabel: 'P1: Critical',
      withoutPriority: 850, 
      withPriority: 240, 
      fifoQueueDelay: 610,
      priorityQueueDelay: 0,
      transitMs: 240,
      saved: '71.8% Faster',
      desc: 'Life-support, fire alarms, and generator trip signals instantly jump ahead of all buffer traffic.'
    },
    { 
      priority: 'P2: High Operational', 
      shortLabel: 'P2: High',
      withoutPriority: 620, 
      withPriority: 290, 
      fifoQueueDelay: 375,
      priorityQueueDelay: 45,
      transitMs: 245,
      saved: '53.2% Faster',
      desc: 'Power bus voltage deviations, fuel heating alerts, and urgent SCADA overrides.'
    },
    { 
      priority: 'P3: Normal Telemetry', 
      shortLabel: 'P3: Normal',
      withoutPriority: 480, 
      withPriority: 450, 
      fifoQueueDelay: 230,
      priorityQueueDelay: 200,
      transitMs: 250,
      saved: 'Rate-Limited',
      desc: 'Routine 1 Hz sensor metrics, meteorological telemetry, and environmental logs.'
    },
    { 
      priority: 'P4: Low Bulk Research', 
      shortLabel: 'P4: Low',
      withoutPriority: 380, 
      withPriority: 720, 
      fifoQueueDelay: 100,
      priorityQueueDelay: 440,
      transitMs: 280,
      saved: 'Buffered',
      desc: 'High-volume seismic waveforms, aurora raw spectra, and non-urgent system diagnostic dumps.'
    },
  ];

  // Benchmark Execution Handler
  const handleRunBenchmark = async () => {
    setIsBenchmarkRunning(true);
    try {
      await runLiveBenchmark();
    } catch (err) {
      console.warn('[Comms] Benchmark run completed in client mode');
    } finally {
      setTimeout(() => setIsBenchmarkRunning(false), 700);
    }
  };

  // Packet Injection Handler
  const handleInjectMessage = () => {
    setIsInjecting(true);

    const priorityInfo = {
      CRITICAL: { name: 'CRITICAL (P1)', level: 1, delay: 0, transit: 240, size: '256 B', note: 'Preempted buffer • 0ms queue delay' },
      HIGH: { name: 'HIGH (P2)', level: 2, delay: 35 + Math.floor(Math.random() * 15), transit: 245, size: '1.4 KB', note: 'Dispatched before standard queue' },
      NORMAL: { name: 'NORMAL (P3)', level: 3, delay: 180 + Math.floor(Math.random() * 40), transit: 250, size: '4.2 KB', note: 'Buffered behind higher priority' },
      LOW: { name: 'LOW (P4)', level: 4, delay: 540 + Math.floor(Math.random() * 80), transit: 280, size: '48.0 KB', note: 'Bulk buffered in background' }
    }[messagePriority] || { name: 'NORMAL (P3)', level: 3, delay: 180, transit: 250, size: '4.0 KB', note: 'Standard packet' };

    const newMsg = {
      id: `MSG-ISRO-${Math.floor(1000 + Math.random() * 9000)}`,
      type: messageType,
      priority: priorityInfo.name,
      priorityLevel: priorityInfo.level,
      size: priorityInfo.size,
      queueDelay: priorityInfo.delay,
      satTransit: priorityInfo.transit,
      totalLatency: priorityInfo.delay + priorityInfo.transit,
      status: 'DELIVERED',
      time: 'Just now',
      notes: priorityInfo.note
    };

    setTimeout(() => {
      setInjectedMessages(prev => [newMsg, ...prev.slice(0, 19)]);
      setIsInjecting(false);
    }, 350);
  };

  const handleClearInjected = () => {
    setInjectedMessages([]);
  };

  // Live telemetry metrics fallback
  const queueSummary = queueMetrics?.summary || {
    totalProcessed: 148,
    critical: { count: 12, avgQueueDelayMs: 0, avgTotalLatencyMs: 240 },
    high: { count: 34, avgQueueDelayMs: 42, avgTotalLatencyMs: 287 },
    normal: { count: 86, avgQueueDelayMs: 195, avgTotalLatencyMs: 445 },
    low: { count: 16, avgQueueDelayMs: 610, avgTotalLatencyMs: 890 }
  };

  const activeBenchmark = benchmarkData?.summary || {
    fifoCriticalQueueDelayMs: 850,
    priorityCriticalQueueDelayMs: 240,
    reductionPercent: 71.8,
    delayReductionMs: 610
  };

  const fifoLog = benchmarkData?.fifo || [
    { message_id: 'MSG-FIFO-101', message_type: 'SCADA_ROUTINE', priority: 'NORMAL', priority_level: 3, queue_delay_ms: 0 },
    { message_id: 'MSG-FIFO-102', message_type: 'METEOROLOGICAL', priority: 'NORMAL', priority_level: 3, queue_delay_ms: 170 },
    { message_id: 'MSG-FIFO-103', message_type: 'POWER_BUS_LOG', priority: 'NORMAL', priority_level: 3, queue_delay_ms: 340 },
    { message_id: 'MSG-FIFO-104', message_type: 'SEISMIC_WAVE', priority: 'LOW', priority_level: 4, queue_delay_ms: 510 },
    { message_id: 'MSG-FIFO-105', message_type: 'HABITAT_AIR', priority: 'NORMAL', priority_level: 3, queue_delay_ms: 680 },
    { message_id: 'MSG-FIFO-106', message_type: 'EMERGENCY_ALARM', priority: 'CRITICAL', priority_level: 1, queue_delay_ms: 850 },
  ];

  const priorityLog = benchmarkData?.priority || [
    { message_id: 'MSG-PRIO-106', message_type: 'EMERGENCY_ALARM', priority: 'CRITICAL', priority_level: 1, queue_delay_ms: 0 },
    { message_id: 'MSG-PRIO-101', message_type: 'SCADA_ROUTINE', priority: 'NORMAL', priority_level: 3, queue_delay_ms: 170 },
    { message_id: 'MSG-PRIO-102', message_type: 'METEOROLOGICAL', priority: 'NORMAL', priority_level: 3, queue_delay_ms: 340 },
    { message_id: 'MSG-PRIO-103', message_type: 'POWER_BUS_LOG', priority: 'NORMAL', priority_level: 3, queue_delay_ms: 510 },
    { message_id: 'MSG-PRIO-105', message_type: 'HABITAT_AIR', priority: 'NORMAL', priority_level: 3, queue_delay_ms: 680 },
    { message_id: 'MSG-PRIO-104', message_type: 'SEISMIC_WAVE', priority: 'LOW', priority_level: 4, queue_delay_ms: 850 },
  ];

  return (
    <div className="tab-page-container comm-view-container">
      {/* Header Banner */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">Satellite Communication & Space-Ground Link Architecture</h2>
          <span className="tab-page-subtitle">
            Bandwidth-Constrained Polar SCADA Telemetry, 4-Level Priority Preemption & ISRO Satellite Gateway Network • Target: {station.name} ({station.region})
          </span>
        </div>
        <div className="header-status-badge">
          <Wifi size={14} className="text-emerald" />
          <span>ISRO SPACE-GROUND LINK: ACTIVE (INSAT-4CR + GSAT-30 LOCKED)</span>
        </div>
      </div>

      {/* AI Predictive Intelligence Section Indicator */}
      <AIPredictionIndicator category="communication" />

      {/* Primary KPI Strip */}
      <div className="comm-kpi-bar">
        <ExpandableTelemetryCard
          title="Critical (P1) Priority Latency"
          subtitle="Instant Preemption Emergency Channel"
          category="Communication Telemetry"
          status="ONLINE"
          metrics={{
            'Total Uplink Latency': '240 ms',
            'Queue Delay': '0 ms (Instant Preemption)',
            'Priority Level': 'P1 (Critical Alarm)',
            'ISRO Sat Link': 'INSAT-4CR Ku-Band',
            'Dispatch Policy': 'Interrupts Normal SCADA',
            'Payload Type': 'Emergency Life Support / Generator'
          }}
        >
          <div className="comm-kpi-card">
            <div className="kpi-label-row">
              <Zap size={16} className="text-rose" />
              <span className="kpi-lbl">CRITICAL (P1) LATENCY</span>
            </div>
            <div className="kpi-big-val mono-num text-cyan">240 ms</div>
            <div className="kpi-sub-txt">
              Queue Delay: <span className="text-emerald font-bold">0 ms (Instant Preemption)</span>
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Normal (P3) Routine SCADA Latency"
          subtitle="Buffered Telemetry Transmission"
          category="Communication Telemetry"
          status="ONLINE"
          metrics={{
            'Total Uplink Latency': '485 ms',
            'Queue Delay': '~245 ms (Buffered)',
            'Priority Level': 'P3 (Normal Routine)',
            'Bandwidth Throttling': 'Dynamic Rate Limiter Active',
            'Batch Interval': 'Every 5 seconds',
            'Buffer Utilization': '42%'
          }}
        >
          <div className="comm-kpi-card">
            <div className="kpi-label-row">
              <Clock size={16} className="text-muted" />
              <span className="kpi-lbl">NORMAL (P3) LATENCY</span>
            </div>
            <div className="kpi-big-val mono-num">485 ms</div>
            <div className="kpi-sub-txt">
              Queue Delay: <span className="text-amber font-bold">~245 ms</span> (Buffered)
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Space-Ground Carrier SNR & Bit Error Rate"
          subtitle="RF Demodulator & Link Margin"
          category="RF Telemetry"
          status="ONLINE"
          metrics={{
            'Carrier SNR': '14.8 dB',
            'Bit Error Rate (BER)': '1.2 × 10⁻⁸ (Zero Loss)',
            'Link Margin': '+4.2 dB above fade margin',
            'Rain/Snow Fade': '0.3 dB (Minimal)',
            'Modulation': 'QPSK DVB-S2X',
            'FEC Coding': 'LDPC 3/4'
          }}
        >
          <div className="comm-kpi-card">
            <div className="kpi-label-row">
              <Signal size={16} className="text-emerald" />
              <span className="kpi-lbl">CARRIER SNR & BER</span>
            </div>
            <div className="kpi-big-val mono-num text-emerald">14.8 dB</div>
            <div className="kpi-sub-txt">
              BER: <span className="text-emerald font-bold">1.2 × 10⁻⁸ (Zero Loss)</span>
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Ground Telemetry Gateways & Fiber Backbone"
          subtitle="ISRO / NCPOR Mission Operations Centers"
          category="Ground Stations"
          status="ONLINE"
          metrics={{
            'Primary Gateway': 'NCPOR Mission Control, Goa',
            'Secondary Gateway': 'NRSC Shadnagar / Hyderabad',
            'Redundancy': 'Dual Geo-diverse Redundant Fibers',
            'Uptime SLA': '99.98% Annual',
            'Encrypted Tunnel': 'IPSec AES-256 GCM',
            'Station Link': `${station.name} SCADA Terminal`
          }}
        >
          <div className="comm-kpi-card">
            <div className="kpi-label-row">
              <Server size={16} className="text-purple" />
              <span className="kpi-lbl">GROUND GATEWAYS</span>
            </div>
            <div className="kpi-big-val mono-num">NCPOR Goa & NRSC</div>
            <div className="kpi-sub-txt">
              Dual Redundant Fiber Backbone
            </div>
          </div>
        </ExpandableTelemetryCard>
      </div>

      {/* Inner Sub-Navigation Pills */}
      <div className="comm-subnav-bar">
        <div className="comm-subnav-group">
          <button 
            className={`comm-subnav-btn ${commTab === 'overview' ? 'active' : ''}`}
            onClick={() => setCommTab('overview')}
          >
            <Zap size={13} />
            <span>Architecture & Priority Sandbox</span>
          </button>
          <button 
            className={`comm-subnav-btn ${commTab === 'stream' ? 'active' : ''}`}
            onClick={() => setCommTab('stream')}
          >
            <Activity size={13} />
            <span>Live Queue & Packet Stream</span>
          </button>
          <button 
            className={`comm-subnav-btn ${commTab === 'benchmark' ? 'active' : ''}`}
            onClick={() => setCommTab('benchmark')}
          >
            <TrendingDown size={13} />
            <span>FIFO vs Priority Benchmark</span>
          </button>
          <button 
            className={`comm-subnav-btn ${commTab === 'satellites' ? 'active' : ''}`}
            onClick={() => setCommTab('satellites')}
          >
            <Satellite size={13} />
            <span>ISRO Constellation & Gateways</span>
          </button>
        </div>
        <div className="comm-subnav-right">
          <span className="comm-station-badge">
            <Radio size={12} className="text-cyan" />
            Terminal: <strong>{station.name}</strong> ({isMaitri ? '7.3m Cassegrain' : 'Coastal Radome'})
          </span>
        </div>
      </div>

      {/* TAB 1: ARCHITECTURE & PACKET INJECTION SANDBOX */}
      {commTab === 'overview' && (
        <div className="comm-main-grid">
          {/* Left Column: Priority Queue Architecture Visualizer & Native SVG Benchmark */}
          <div className="comm-left-col">
            {/* Priority Queue Comparison Visualizer */}
            <div className="priority-visualizer-card polaris-card">
              <div className="panel-title-row">
                <Zap size={16} className="text-cyan" />
                <h3 className="section-title">4-Level Priority Satellite Queue Architecture</h3>
              </div>
              <p className="section-subtitle">
                Demonstrates how critical emergency alerts bypass standard FIFO queue buffering to prevent delay during life-support and generator faults over constrained Antarctic satellite channels. Clearly labeled: <strong>SIMULATED LATENCY</strong>.
              </p>

              {/* Visual Queue Graphic Comparison */}
              <div className="queue-comparison-graphic">
                {/* Without Priority Box */}
                <div className="graphic-box without-priority">
                  <div className="g-box-header text-amber">
                    <span>WITHOUT PRIORITY (Standard FIFO)</span>
                  </div>
                  <div className="packet-pipe">
                    <span className="pkt-item pkt-normal">Normal #1 (SCADA Poll)</span>
                    <span className="pkt-item pkt-normal">Normal #2 (Weather Sensor)</span>
                    <span className="pkt-item pkt-normal">Normal #3 (Power Grid Log)</span>
                    <span className="pkt-item pkt-critical animate-pulse">CRITICAL #4 (Blocked Behind Queue!)</span>
                  </div>
                  <div className="g-box-result text-amber font-bold">
                    Critical Message Total Latency: ~850 ms (610ms Buffer Lag!)
                  </div>
                </div>

                {/* With Priority Box */}
                <div className="graphic-box with-priority">
                  <div className="g-box-header text-emerald">
                    <span>WITH POLARIS PRIORITY QUEUE (Preemptive)</span>
                  </div>
                  <div className="packet-pipe">
                    <span className="pkt-item pkt-critical animate-bounce">⚡ CRITICAL #4 (Preempts to Head of Buffer)</span>
                    <span className="pkt-item pkt-normal">Normal #1 (SCADA Poll)</span>
                    <span className="pkt-item pkt-normal">Normal #2 (Weather Sensor)</span>
                    <span className="pkt-item pkt-normal">Normal #3 (Power Grid Log)</span>
                  </div>
                  <div className="g-box-result text-emerald font-bold">
                    Critical Message Total Latency: 240 ms (Zero Queue Delay!)
                  </div>
                </div>
              </div>

              {/* Native High-Performance SVG Latency Benchmark Chart */}
              <div className="benchmark-chart-card-inner">
                <div className="benchmark-chart-header">
                  <div className="b-chart-title">
                    <Clock size={14} className="text-cyan" />
                    <span>Total Latency Comparison: FIFO vs Polaris 4-Level Priority (ms)</span>
                  </div>
                  <div className="b-chart-legend">
                    <span className="leg-item"><span className="leg-dot bg-amber" /> Without Priority (FIFO)</span>
                    <span className="leg-item"><span className="leg-dot bg-emerald" /> With Polaris Priority</span>
                  </div>
                </div>

                {/* Native Responsive SVG Bar Chart */}
                <div className="svg-chart-container" style={{ width: '100%', height: 210, position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 540 180" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="fifoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#946013" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="priorityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#187451" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Reference Lines */}
                    {[0, 250, 500, 750, 1000].map((val, idx) => {
                      const y = 145 - (val / 1000) * 125;
                      return (
                        <g key={idx}>
                          <line x1="45" y1={y} x2="525" y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
                          <text x="38" y={y + 3} textAnchor="end" fill="#64748b" fontSize="8.5" fontFamily="monospace">
                            {val}ms
                          </text>
                        </g>
                      );
                    })}

                    {/* Chart Bars */}
                    {latencyBenchmark.map((item, idx) => {
                      const groupX = 65 + idx * 118;
                      const hWithout = (item.withoutPriority / 1000) * 125;
                      const yWithout = 145 - hWithout;

                      const hWith = (item.withPriority / 1000) * 125;
                      const yWith = 145 - hWith;

                      const isHovered = hoveredBarIndex === idx;

                      return (
                        <g 
                          key={idx} 
                          className="chart-bar-group"
                          onMouseEnter={() => setHoveredBarIndex(idx)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                          style={{ cursor: 'default' }}
                        >
                          {/* Background highlight pill on hover */}
                          {isHovered && (
                            <rect 
                              x={groupX - 10} 
                              y={15} 
                              width="100" 
                              height="135" 
                              rx="4" 
                              fill="rgba(56, 189, 248, 0.06)" 
                              stroke="rgba(56, 189, 248, 0.2)"
                            />
                          )}

                          {/* Bar 1: Without Priority (FIFO) */}
                          <rect
                            x={groupX}
                            y={yWithout}
                            width="34"
                            height={hWithout}
                            rx="3"
                            fill="url(#fifoGrad)"
                            stroke={isHovered ? '#946013' : 'none'}
                            strokeWidth="1"
                          />
                          <text 
                            x={groupX + 17} 
                            y={yWithout - 4} 
                            textAnchor="middle" 
                            fill="#946013"
                            fontSize="8" 
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {item.withoutPriority}
                          </text>

                          {/* Bar 2: With Priority */}
                          <rect
                            x={groupX + 42}
                            y={yWith}
                            width="34"
                            height={hWith}
                            rx="3"
                            fill="url(#priorityGrad)"
                            stroke={isHovered ? '#187451' : 'none'}
                            strokeWidth="1"
                          />
                          <text 
                            x={groupX + 59} 
                            y={yWith - 4} 
                            textAnchor="middle" 
                            fill="#187451"
                            fontSize="8" 
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {item.withPriority}
                          </text>

                          {/* X-Axis Priority Label */}
                          <text
                            x={groupX + 38}
                            y="162"
                            textAnchor="middle"
                            fill={isHovered ? '#146b80' : '#94a3b8'}
                            fontSize="8.5"
                            fontWeight={isHovered ? 'bold' : 'normal'}
                          >
                            {item.shortLabel}
                          </text>

                          {/* Saved percentage pill */}
                          <text
                            x={groupX + 38}
                            y="174"
                            textAnchor="middle"
                            fill={idx === 0 ? '#187451' : idx === 1 ? '#146b80' : '#64748b'}
                            fontSize="7.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {item.saved}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Hover detail tooltip bar */}
                <div className="benchmark-hover-info">
                  {hoveredBarIndex !== null ? (
                    <div className="hover-info-content">
                      <span className="h-title text-cyan">{latencyBenchmark[hoveredBarIndex].priority}:</span>
                      <span className="h-desc">{latencyBenchmark[hoveredBarIndex].desc}</span>
                      <span className="h-stat text-emerald font-bold">
                        (FIFO Delay: {latencyBenchmark[hoveredBarIndex].fifoQueueDelay}ms → Polaris Delay: {latencyBenchmark[hoveredBarIndex].priorityQueueDelay}ms)
                      </span>
                    </div>
                  ) : (
                    <span className="hover-placeholder text-muted">
                      💡 Hover over any priority level in the chart above to inspect queue delay reduction details.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Packet Injection Sandbox */}
            <div className="packet-injector-card polaris-card">
              <div className="panel-title-row">
                <Send size={16} className="text-cyan" />
                <h3 className="section-title">Telemetry Packet Priority Injection Sandbox</h3>
              </div>
              <p className="section-subtitle">
                Inject test SCADA and alarm packets into the live simulated satellite transmission buffer to verify real-time preemption dispatch behavior.
              </p>

              <div className="injector-controls-grid">
                {/* Priority Selection */}
                <div className="inj-control-group">
                  <span className="inj-lbl">1. Select Priority Level:</span>
                  <div className="priority-pill-group">
                    {['CRITICAL', 'HIGH', 'NORMAL', 'LOW'].map((p) => (
                      <button
                        key={p}
                        className={`p-pill-btn ${messagePriority === p ? `active-${p.toLowerCase()}` : ''}`}
                        onClick={() => setMessagePriority(p)}
                      >
                        {p} ({p === 'CRITICAL' ? 'P1' : p === 'HIGH' ? 'P2' : p === 'NORMAL' ? 'P3' : 'P4'})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payload Type Selection */}
                <div className="inj-control-group">
                  <span className="inj-lbl">2. Select Message Type:</span>
                  <select 
                    className="inj-select"
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value)}
                  >
                    <option value="EMERGENCY_LIFE_SUPPORT">EMERGENCY_LIFE_SUPPORT (Life Support Trip)</option>
                    <option value="GENERATOR_STATOR_TEMP">GENERATOR_STATOR_TEMP (Thermal Overheat)</option>
                    <option value="SCADA_ROUTINE_POLL">SCADA_ROUTINE_POLL (Grid 1 Hz Telemetry)</option>
                    <option value="SEISMIC_RAW_WAVEFORM">SEISMIC_RAW_WAVEFORM (Cryosphere Burst)</option>
                    <option value="METEOROLOGICAL_SOUNDING">METEOROLOGICAL_SOUNDING (Sonic Anemometer)</option>
                    <option value="HABITAT_AIR_QUALITY">HABITAT_AIR_QUALITY (CO2 & HVAC Loop)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="injector-actions-row">
                <button 
                  className="inject-btn" 
                  onClick={handleInjectMessage}
                  disabled={isInjecting}
                >
                  <Send size={13} className={isInjecting ? 'animate-spin' : ''} />
                  <span>{isInjecting ? 'Transmitting via INSAT-4CR...' : 'Inject Packet into Satellite Queue'}</span>
                </button>
                {injectedMessages.length > 0 && (
                  <button className="clear-btn" onClick={handleClearInjected}>
                    <RotateCcw size={12} />
                    <span>Clear Injected Stream</span>
                  </button>
                )}
              </div>

              {/* Injected Queue Feed */}
              <div className="injected-table-wrap">
                <table className="injected-table">
                  <thead>
                    <tr>
                      <th>Message ID</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Size</th>
                      <th>Queue Delay</th>
                      <th>Sat Transit</th>
                      <th>Total Latency</th>
                      <th>Status & Dispatch Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {injectedMessages.map((msg) => (
                      <tr key={msg.id} className={msg.priorityLevel === 1 ? 'row-critical-highlight' : ''}>
                        <td className="mono-num text-cyan font-bold">{msg.id}</td>
                        <td className="font-bold">{msg.type}</td>
                        <td>
                          <span className={`p-badge p-${msg.priority.slice(0, 4).toLowerCase()}`}>
                            {msg.priority}
                          </span>
                        </td>
                        <td className="mono-num">{msg.size}</td>
                        <td className={`mono-num font-bold ${msg.queueDelay === 0 ? 'text-emerald' : msg.queueDelay < 100 ? 'text-cyan' : 'text-amber'}`}>
                          {msg.queueDelay} ms
                        </td>
                        <td className="mono-num">{msg.satTransit} ms</td>
                        <td className="mono-num text-cyan font-bold">{msg.totalLatency} ms</td>
                        <td>
                          <div className="dispatch-notes-cell">
                            <span className="status-pill-ok">
                              <CheckCircle2 size={11} /> {msg.status}
                            </span>
                            <span className="note-subtext">{msg.notes}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: ISRO Polar Satellite Constellation & Ground Links */}
          <div className="comm-right-col">
            <div className="sat-constellation-card polaris-card">
              <div className="panel-title-row">
                <Satellite size={16} className="text-cyan" />
                <h3 className="section-title">ISRO Polar Satellite Constellation & Ground Links</h3>
              </div>

              <div className="sat-cards-list">
                {satelliteLinks.map((sat) => (
                  <div key={sat.id} className="sat-link-item">
                    <div className="sat-top-row">
                      <div className="sat-title-cluster">
                        <Satellite size={18} className="text-cyan" />
                        <div>
                          <h4 className="sat-name">{sat.name}</h4>
                          <span className="sat-role">{sat.role}</span>
                        </div>
                      </div>
                      <span className="sat-status-pill">{sat.status}</span>
                    </div>

                    <div className="sat-specs-grid">
                      <div className="sat-spec">
                        <span className="spec-lbl">Frequency Band:</span>
                        <span className="spec-val">{sat.frequency}</span>
                      </div>
                      <div className="sat-spec">
                        <span className="spec-lbl">Carrier SNR:</span>
                        <span className="spec-val text-emerald font-bold">{sat.snr} ({sat.snrStatus})</span>
                      </div>
                      <div className="sat-spec">
                        <span className="spec-lbl">Azimuth / Elevation:</span>
                        <span className="spec-val mono-num">{sat.azimuth} / {sat.elevation}</span>
                      </div>
                      <div className="sat-spec">
                        <span className="spec-lbl">Simulated Transit:</span>
                        <span className="spec-val mono-num text-cyan">{sat.latency}</span>
                      </div>
                      <div className="sat-spec" style={{ gridColumn: 'span 2' }}>
                        <span className="spec-lbl">Ground Terminal Dish:</span>
                        <span className="spec-val">{sat.dishSize}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Master Ground Stations Card */}
            <div className="ground-station-card polaris-card">
              <div className="panel-title-row">
                <Server size={16} className="text-emerald" />
                <h3 className="section-title">Indian Ground Station Telemetry Gateways</h3>
              </div>
              <div className="gw-item">
                <div className="gw-header-line">
                  <span className="gw-name">NCPOR Master Ground Terminal (Goa)</span>
                  <span className="gw-status text-emerald font-bold">OPERATIONAL • 100% Uptime</span>
                </div>
                <span className="gw-desc">Direct satellite uplink terminal with 7.3m Cassegrain dish antenna and dual fiber backbone to MoES Delhi HQ.</span>
              </div>
              <div className="gw-item">
                <div className="gw-header-line">
                  <span className="gw-name">NRSC Earth Station (Shadnagar, Hyderabad)</span>
                  <span className="gw-status text-emerald font-bold">OPERATIONAL • Polar Tracking</span>
                </div>
                <span className="gw-desc">Dedicated remote sensing and LEO Polar payload reception for Bharati coastal tracking radome.</span>
              </div>
              <div className="gw-item">
                <div className="gw-header-line">
                  <span className="gw-name">ISTRAC Polar Ground Station (Bengaluru)</span>
                  <span className="gw-status text-emerald font-bold">TELEMETRY SYNC • 14.2 GHz</span>
                </div>
                <span className="gw-desc">Telemetry, Tracking & Command (TTC) relay for real-time SCADA preemption verification.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE QUEUE & DISPATCHED STREAM */}
      {commTab === 'stream' && (
        <div className="comm-stream-tab-layout">
          {/* Top 4 Priority Metrics Breakdown */}
          <div className="latency-4col-grid">
            <div className="latency-level-card border-critical-lvl">
              <div className="level-card-header">
                <span className="badge badge-critical">Level 1: CRITICAL</span>
                <Zap size={14} className="text-rose" />
              </div>
              <div className="level-stat-row">
                <div>
                  <div className="level-label">Avg Queue Delay</div>
                  <div className="level-val mono-num text-emerald">{queueSummary.critical.avgQueueDelayMs} ms</div>
                </div>
                <div>
                  <div className="level-label">Total Latency</div>
                  <div className="level-val mono-num text-rose">{queueSummary.critical.avgTotalLatencyMs} ms</div>
                </div>
              </div>
              <div className="level-tagline">⚡ Instant preemption to buffer head</div>
            </div>

            <div className="latency-level-card border-high-lvl">
              <div className="level-card-header">
                <span className="badge badge-high">Level 2: HIGH</span>
                <ShieldAlert size={14} className="text-amber" />
              </div>
              <div className="level-stat-row">
                <div>
                  <div className="level-label">Avg Queue Delay</div>
                  <div className="level-val mono-num text-amber">{queueSummary.high.avgQueueDelayMs} ms</div>
                </div>
                <div>
                  <div className="level-label">Total Latency</div>
                  <div className="level-val mono-num text-amber">{queueSummary.high.avgTotalLatencyMs} ms</div>
                </div>
              </div>
              <div className="level-tagline">⚠️ Dispatched before normal packets</div>
            </div>

            <div className="latency-level-card border-normal-lvl">
              <div className="level-card-header">
                <span className="badge badge-normal">Level 3: NORMAL</span>
                <Clock size={14} className="text-blue" />
              </div>
              <div className="level-stat-row">
                <div>
                  <div className="level-label">Avg Queue Delay</div>
                  <div className="level-val mono-num text-blue">{queueSummary.normal.avgQueueDelayMs} ms</div>
                </div>
                <div>
                  <div className="level-label">Total Latency</div>
                  <div className="level-val mono-num text-blue">{queueSummary.normal.avgTotalLatencyMs} ms</div>
                </div>
              </div>
              <div className="level-tagline">📦 Rate-limited routine telemetry</div>
            </div>

            <div className="latency-level-card border-low-lvl">
              <div className="level-card-header">
                <span className="badge badge-category">Level 4: LOW</span>
                <FileText size={14} className="text-muted" />
              </div>
              <div className="level-stat-row">
                <div>
                  <div className="level-label">Avg Queue Delay</div>
                  <div className="level-val mono-num text-muted">{queueSummary.low.avgQueueDelayMs} ms</div>
                </div>
                <div>
                  <div className="level-label">Total Latency</div>
                  <div className="level-val mono-num text-muted">{queueSummary.low.avgTotalLatencyMs} ms</div>
                </div>
              </div>
              <div className="level-tagline">📄 Diagnostic & maintenance logs</div>
            </div>
          </div>

          {/* Live Dispatched Satellite Packets Table */}
          <div className="stream-table-panel polaris-card">
            <div className="panel-title-row" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} className="text-cyan" />
                <h3 className="section-title">Live Dispatched Satellite Packet Stream (ISRO Uplink)</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className={`btn-stream-toggle ${isStreamLive ? 'active-live' : ''}`}
                  onClick={() => setIsStreamLive(!isStreamLive)}
                >
                  {isStreamLive ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isStreamLive ? 'Live Stream Active' : 'Stream Paused'}</span>
                </button>
                <div className="queue-buffer-badge mono-num">
                  Buffer: <span className="text-cyan">{queueMetrics?.queueSnapshot?.count || 0} pkts</span>
                </div>
              </div>
            </div>

            <div className="packet-table-wrapper">
              <table className="packet-table mono-num">
                <thead>
                  <tr>
                    <th>Message ID</th>
                    <th>Station</th>
                    <th>Packet Type</th>
                    <th>Priority Level</th>
                    <th>Queue Delay</th>
                    <th>Sat Propagation</th>
                    <th>Total Latency</th>
                    <th>Transmission Status</th>
                  </tr>
                </thead>
                <tbody>
                  {injectedMessages.map((pkt) => {
                    const isCrit = pkt.priorityLevel === 1;
                    const isHigh = pkt.priorityLevel === 2;
                    return (
                      <tr key={pkt.id} className={isCrit ? 'row-critical-highlight' : isHigh ? 'row-high' : ''}>
                        <td className="text-cyan font-bold">{pkt.id}</td>
                        <td>{station.name.replace(' Research Station', '')}</td>
                        <td className="font-bold">{pkt.type}</td>
                        <td>
                          <span className={`badge ${isCrit ? 'badge-critical' : isHigh ? 'badge-high' : 'badge-normal'}`}>
                            {pkt.priority}
                          </span>
                        </td>
                        <td className={pkt.queueDelay === 0 ? 'text-emerald font-bold' : pkt.queueDelay < 100 ? 'text-cyan' : 'text-amber'}>
                          {pkt.queueDelay} ms
                        </td>
                        <td>{pkt.satTransit} ms</td>
                        <td className="text-cyan font-bold">{pkt.totalLatency} ms</td>
                        <td>
                          <span className="status-pill-ok">
                            <CheckCircle2 size={11} /> DELIVERED (ISRO Uplink)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="latency-disclaimer" style={{ marginTop: 12 }}>
              <Info size={14} className="text-cyan" />
              <span>
                Simulated satellite transit delay (240ms Geostationary Uplink) accounts for speed-of-light propagation from Antarctica (70°S) to INSAT-4CR (74°E) and downlink to NCPOR Goa.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE BENCHMARK RUNNER */}
      {commTab === 'benchmark' && (
        <div className="comm-benchmark-tab-layout">
          <div className="benchmark-card polaris-card">
            <div className="panel-title-row" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap className="text-cyan" size={18} />
                <h3 className="section-title">Live Satellite Communication Benchmark: FIFO vs 4-Level Priority Queue</h3>
              </div>
              <button 
                onClick={handleRunBenchmark} 
                disabled={isBenchmarkRunning}
                className="btn-benchmark-run mono-num"
              >
                <Play size={14} className={isBenchmarkRunning ? 'animate-spin' : ''} />
                {isBenchmarkRunning ? 'Simulating Uplink...' : 'Run Live Benchmark'}
              </button>
            </div>

            <p className="section-subtitle" style={{ marginTop: 4 }}>
              Executes a head-to-head comparison demonstrating how high-priority life support and generator alarms preempt lower-priority messages over a bandwidth-constrained space-ground satellite link.
            </p>

            {/* Top comparison summary cards */}
            <div className="benchmark-comparison-grid" style={{ marginTop: 14 }}>
              <div className="benchmark-stat-card border-fifo">
                <div className="benchmark-card-badge text-amber">1. Standard FIFO (No Priority)</div>
                <div className="benchmark-stat-val text-amber mono-num">
                  {activeBenchmark.fifoCriticalQueueDelayMs} ms
                </div>
                <div className="benchmark-stat-sub">Emergency Message Queue Delay</div>
                <div className="benchmark-position-tag text-rose mono-num">
                  Dispatch Order: #6 (Last behind normal packets)
                </div>
              </div>

              <div className="benchmark-stat-card border-priority">
                <div className="benchmark-card-badge text-cyan">2. Polaris 4-Level Priority Queue</div>
                <div className="benchmark-stat-val text-emerald mono-num">
                  {activeBenchmark.priorityCriticalQueueDelayMs} ms
                </div>
                <div className="benchmark-stat-sub">Emergency Message Queue Delay</div>
                <div className="benchmark-position-tag text-emerald mono-num">
                  Dispatch Order: #1 (Instant Preemption!)
                </div>
              </div>

              <div className="benchmark-stat-card border-highlight">
                <div className="benchmark-card-badge text-emerald">Efficiency Gain</div>
                <div className="benchmark-stat-val text-cyan mono-num">
                  -{activeBenchmark.reductionPercent}%
                </div>
                <div className="benchmark-stat-sub">Queue Delay Reduction</div>
                <div className="benchmark-position-tag text-cyan mono-num">
                  Saved: {activeBenchmark.delayReductionMs} ms of emergency lag
                </div>
              </div>
            </div>

            {/* Side-by-side Tables */}
            <div className="tables-comparison-split" style={{ marginTop: 16 }}>
              <div className="split-table-col">
                <h4 className="table-subheading text-muted mono-num">FIFO Queue Transmission Log (Unprioritized)</h4>
                <div className="packet-table-wrapper">
                  <table className="packet-table mono-num">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Message ID</th>
                        <th>Type</th>
                        <th>Priority</th>
                        <th>Queue Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fifoLog.map((m, idx) => (
                        <tr key={m.message_id} className={m.priority_level === 1 ? 'row-critical-highlight' : ''}>
                          <td>#{idx + 1}</td>
                          <td>{m.message_id}</td>
                          <td>{m.message_type}</td>
                          <td>
                            <span className={`badge ${m.priority_level === 1 ? 'badge-critical' : m.priority_level === 2 ? 'badge-high' : 'badge-normal'}`}>
                              {m.priority} ({m.priority_level})
                            </span>
                          </td>
                          <td className={m.priority_level === 1 ? 'text-rose font-bold' : ''}>
                            {m.queue_delay_ms} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="split-table-col">
                <h4 className="table-subheading text-cyan mono-num">Polaris Priority Queue Transmission Log (Preemptive)</h4>
                <div className="packet-table-wrapper">
                  <table className="packet-table mono-num">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Message ID</th>
                        <th>Type</th>
                        <th>Priority</th>
                        <th>Queue Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorityLog.map((m, idx) => (
                        <tr key={m.message_id} className={m.priority_level === 1 ? 'row-critical-highlight' : ''}>
                          <td>#{idx + 1}</td>
                          <td>{m.message_id}</td>
                          <td>{m.message_type}</td>
                          <td>
                            <span className={`badge ${m.priority_level === 1 ? 'badge-critical' : m.priority_level === 2 ? 'badge-high' : 'badge-normal'}`}>
                              {m.priority} ({m.priority_level})
                            </span>
                          </td>
                          <td className={m.priority_level === 1 ? 'text-emerald font-bold' : ''}>
                            {m.queue_delay_ms} ms (Instant)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SATELLITE CONSTELLATION & GATEWAYS */}
      {commTab === 'satellites' && (
        <div className="comm-satellites-tab-layout">
          <div className="sat-detailed-grid">
            {satelliteLinks.map((sat) => (
              <ExpandableTelemetryCard
                key={sat.id}
                title={sat.name}
                subtitle={sat.role}
                category="ISRO Satellite Link"
                status={sat.status}
                metrics={{
                  'RF Frequency Band': sat.frequency,
                  'Carrier SNR Quality': `${sat.snr} (${sat.snrStatus})`,
                  'Bit Error Rate': sat.ber,
                  'Antenna Pointing': `${sat.azimuth} / ${sat.elevation}`,
                  'Space-Ground Transit': sat.latency,
                  'Ground Dish Diameter': sat.dishSize,
                  'Target Coverage Area': sat.coverage,
                  'Transponder Payload': 'Redundant Ku-Band Matrix'
                }}
              >
                <div className="sat-detail-card polaris-card">
                  <div className="sat-detail-header">
                    <div className="sat-head-left">
                      <div className="sat-icon-circle">
                        <Satellite size={22} className="text-cyan" />
                      </div>
                      <div>
                        <h3 className="sat-title-big">{sat.name}</h3>
                        <span className="sat-role-big">{sat.role}</span>
                      </div>
                    </div>
                    <div className="sat-status-badge">
                      <span className="live-dot" />
                      <span>{sat.status}</span>
                    </div>
                  </div>

                  <div className="sat-params-list">
                    <div className="sat-param-row">
                      <span className="p-lbl">RF Frequency Band:</span>
                      <span className="p-val text-cyan">{sat.frequency}</span>
                    </div>
                    <div className="sat-param-row">
                      <span className="p-lbl">Carrier SNR Quality:</span>
                      <span className="p-val text-emerald font-bold">{sat.snr} ({sat.snrStatus})</span>
                    </div>
                    <div className="sat-param-row">
                      <span className="p-lbl">Bit Error Rate (BER):</span>
                      <span className="p-val mono-num text-emerald">{sat.ber}</span>
                    </div>
                    <div className="sat-param-row">
                      <span className="p-lbl">Pointing Azimuth / Elevation:</span>
                      <span className="p-val mono-num">{sat.azimuth} / {sat.elevation}</span>
                    </div>
                    <div className="sat-param-row">
                      <span className="p-lbl">Simulated Space-Ground Transit:</span>
                      <span className="p-val mono-num text-cyan font-bold">{sat.latency}</span>
                    </div>
                    <div className="sat-param-row">
                      <span className="p-lbl">Antarctic Station Terminal:</span>
                      <span className="p-val">{sat.dishSize}</span>
                    </div>
                    <div className="sat-param-row">
                      <span className="p-lbl">Operational Mission Footprint:</span>
                      <span className="p-val text-muted">{sat.coverage}</span>
                    </div>
                  </div>
                </div>
              </ExpandableTelemetryCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
