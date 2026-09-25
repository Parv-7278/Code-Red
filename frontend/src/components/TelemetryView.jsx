import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Zap, 
  Thermometer, 
  Droplets, 
  Radio, 
  Play, 
  Pause, 
  Download, 
  Battery,
  Wind,
  Clock3,
  Gauge,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { STATIONS_DATA } from '../data/stationsData';
import { formatStationTime } from '../utils/timeUtils';
import './TelemetryView.css';

const SAMPLE_INTERVALS = { '1 Hz': 1000, '2 Hz': 500, '5 Hz': 200 };
const asNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const seedLiveWindow = (packet, isMaitri) => {
  const reading = {
    genTemp: asNumber(packet?.generator_temperature, isMaitri ? 78.4 : 74.1),
    powerCons: asNumber(packet?.power_consumption, isMaitri ? 105 : 148),
    battPct: asNumber(packet?.battery_level ?? packet?.battery, isMaitri ? 74 : 91),
    extTemp: asNumber(packet?.temperature, isMaitri ? -18.7 : -14.2),
  };
  return ['T-12s', 'T-10s', 'T-8s', 'T-6s', 'T-4s', 'T-2s', 'Live'].map((time) => ({ time, ...reading }));
};

export default function TelemetryView({ selectedStation }) {
  const stationId = selectedStation === 'all-stations' ? 'station-maitri' : selectedStation;
  const station = STATIONS_DATA[stationId] || STATIONS_DATA['station-maitri'];
  const isMaitri = station.id === 'station-maitri';

  const { liveTelemetry, isSimulatorOnline, lastSyncedAt, dataSource } = useTelemetry();
  const [isStreaming, setIsStreaming] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [sampleRate, setSampleRate] = useState('1 Hz');

  // Real-time telemetry stream series
  const [streamData, setStreamData] = useState(() => seedLiveWindow(liveTelemetry, isMaitri));

  useEffect(() => {
    setStreamData(seedLiveWindow(liveTelemetry, isMaitri));
  }, [stationId]);

  useEffect(() => {
    if (!isStreaming) return;
    const sampleInterval = SAMPLE_INTERVALS[sampleRate] || 1000;
    const interval = setInterval(() => {
      const now = new Date();
      const timeTag = formatStationTime(now, station.timezone);
      const currentGenTemp = Number(liveTelemetry?.generator_temperature ?? 70.0);
      const currentPower = Number(liveTelemetry?.power_consumption ?? (isMaitri ? 105 : 148));
      const currentBattery = Number(liveTelemetry?.battery_level ?? liveTelemetry?.battery ?? (isMaitri ? 74 : 91));
      const currentExternalTemp = Number(liveTelemetry?.temperature ?? (isMaitri ? -18.7 : -14.2));
      
      setStreamData(prev => {
        const next = [...prev.slice(1), {
          time: timeTag,
          genTemp: +currentGenTemp.toFixed(1),
          powerCons: +currentPower.toFixed(1),
          battPct: +currentBattery.toFixed(1),
          extTemp: +currentExternalTemp.toFixed(1)
        }];
        return next;
      });
    }, sampleInterval);

    return () => clearInterval(interval);
  }, [isStreaming, liveTelemetry, isMaitri, sampleRate, station.timezone]);

  // Grouped Sensor Telemetry Matrices
  const sensorGroups = [
    {
      groupId: 'POWER_GRID',
      groupName: 'Power & Electrical Grid (415V SCADA)',
      icon: Zap,
      color: '#146b80',
      sensors: [
        { id: 'SEN-PWR-01', name: isMaitri ? 'Diesel Genset G-01 Active Load' : 'CHP Genset C-01 Active Load', val: isMaitri ? '65.2 kW' : '92.4 kW', range: '0 - 100 kW', status: 'NOMINAL', color: '#187451' },
        { id: 'SEN-PWR-02', name: isMaitri ? 'Diesel Genset G-02 Stator Temp' : 'CHP Genset C-02 Stator Temp', val: `${Number(liveTelemetry?.generator_temperature ?? 70.0).toFixed(1)}°C`, range: '40 - 85°C', status: 'MONITORING', color: '#946013' },
        { id: 'SEN-PWR-03', name: 'Main Busbar Voltage (L1-L2-L3)', val: '415.4 V ± 0.8%', range: '400 - 425 V', status: 'NOMINAL', color: '#187451' },
        { id: 'SEN-PWR-04', name: 'Grid Frequency Stability', val: '50.02 Hz', range: '49.8 - 50.2 Hz', status: 'NOMINAL', color: '#187451' },
        { id: 'SEN-PWR-05', name: 'BESS Battery Bank State of Charge', val: `${Number(liveTelemetry?.battery_level ?? liveTelemetry?.battery ?? (isMaitri ? 74 : 91)).toFixed(1)}% (${isMaitri ? '320' : '480'} kWh)`, range: '20 - 100%', status: 'OPTIMAL', color: '#187451' },
      ]
    },
    {
      groupId: 'THERMAL_HVAC',
      groupName: 'Thermal Loops & Trace Heating Systems',
      icon: Thermometer,
      color: '#946013',
      sensors: [
        { id: 'SEN-TH-01', name: isMaitri ? 'Priyadarshini Lake Conduit Glycol Trace' : 'RO Desalination Intake Thermal Trace', val: isMaitri ? '+4.8°C' : '+3.9°C', range: '+2.0 - +8.0°C', status: 'ACTIVE', color: '#187451' },
        { id: 'SEN-TH-02', name: 'Habitat Main Core HVAC Return Temp', val: '+21.4°C', range: '+18.0 - +23.0°C', status: 'NOMINAL', color: '#187451' },
        { id: 'SEN-TH-03', name: 'Exhaust Heat Recovery Boiler #1', val: '+164.2°C', range: '140 - 190°C', status: 'NOMINAL', color: '#187451' },
        { id: 'SEN-TH-04', name: 'Bulk Diesel Storage Tank T-01 Core Temp', val: isMaitri ? '-4.2°C (Heated)' : '-2.8°C (Heated)', range: '>-15.0°C', status: 'NOMINAL', color: '#187451' },
      ]
    },
    {
      groupId: 'CRYOSPHERE_WEATHER',
      groupName: 'Cryosphere & Micro-Meteorology Array',
      icon: Droplets,
      color: '#147889',
      sensors: [
        { id: 'SEN-MET-01', name: 'External Ambient Sonic Temperature', val: `${Number(liveTelemetry?.temperature ?? (isMaitri ? -18.7 : -14.2)).toFixed(1)}°C`, range: '-50 - +5°C', status: 'NOMINAL', color: '#146b80' },
        { id: 'SEN-MET-02', name: '3-Axis Ultrasonic Anemometer Wind Speed', val: `${Number(liveTelemetry?.wind_speed ?? (isMaitri ? 42 : 38)).toFixed(1)} km/h`, range: '0 - 180 km/h', status: 'STEADY', color: '#187451' },
        { id: 'SEN-MET-03', name: 'Laser Snow Depth Gauge (Accumulation 24h)', val: isMaitri ? '12.4 cm' : '24.2 cm', range: '0 - 100 cm', status: 'MONITORING', color: '#946013' },
        { id: 'SEN-MET-04', name: 'Barometric Pressure Transducer', val: isMaitri ? '982.4 hPa' : '994.1 hPa', range: '940 - 1040 hPa', status: 'NOMINAL', color: '#187451' },
      ]
    },
    {
      groupId: 'SATCOM_RF',
      groupName: 'Space-Ground Satcom & RF Tracking',
      icon: Radio,
      color: '#705296',
      sensors: [
        { id: 'SEN-RF-01', name: 'INSAT-4CR Ku-band Carrier-to-Noise (C/N)', val: '14.8 dB', range: '> 10.0 dB', status: 'LOCKED', color: '#187451' },
        { id: 'SEN-RF-02', name: 'GSAT-30 Uplink Power Amplifier (SSPA)', val: '45.2 W', range: '20 - 80 W', status: 'NOMINAL', color: '#187451' },
        { id: 'SEN-RF-03', name: 'Radome Internal De-Icing Blower Air Temp', val: '+12.4°C', range: '+5 - +25°C', status: 'ACTIVE', color: '#187451' },
        { id: 'SEN-RF-04', name: 'Space Weather Ionospheric Scintillation (S4)', val: isMaitri ? '0.161' : '0.185', range: '< 0.300', status: 'QUIET', color: '#187451' },
      ]
    }
  ];

  const filteredGroups = selectedGroup === 'ALL' 
    ? sensorGroups 
    : sensorGroups.filter(g => g.groupId === selectedGroup);

  const handleExportCSV = () => {
    const csvRows = [
      'Timestamp,Sensor_ID,Sensor_Name,Telemetry_Value,SCADA_Status'
    ];
    sensorGroups.forEach(group => {
      group.sensors.forEach(s => {
        csvRows.push(`"${new Date().toISOString()}","${s.id}","${s.name}","${s.val}","${s.status}"`);
      });
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POLARIS_SCADA_Telemetry_${station.name}_${Date.now()}.csv`;
    a.click();
  };

  // SVG dimensions & calculations for streaming chart
  const svgWidth = 600;
  const svgHeight = 150;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;
  const graphWidth = svgWidth - paddingLeft - paddingRight;
  const graphHeight = svgHeight - paddingTop - paddingBottom;

  // Scales
  const getX = (idx) => paddingLeft + (idx / (streamData.length - 1)) * graphWidth;
  const getYPercent = (percent) => paddingTop + graphHeight - (percent / 100) * graphHeight;
  const firstSample = streamData[0];
  const lanePercent = (value, baseline, center, visibleRange) => (
    center + Math.max(-12, Math.min(12, ((value - baseline) / visibleRange) * 12))
  );
  const getYTemp = (val) => getYPercent(lanePercent(val, firstSample.genTemp, 78, 0.8));
  const getYPower = (val) => getYPercent(lanePercent(val, firstSample.powerCons, 50, 4));
  const getYBatt = (val) => getYPercent(lanePercent(val, firstSample.battPct, 22, 0.4));

  const tempPoints = streamData.map((d, i) => `${getX(i)},${getYTemp(d.genTemp)}`).join(' ');
  const powerPoints = streamData.map((d, i) => `${getX(i)},${getYPower(d.powerCons)}`).join(' ');
  const battPoints = streamData.map((d, i) => `${getX(i)},${getYBatt(d.battPct)}`).join(' ');
  const currentGenTemp = asNumber(liveTelemetry?.generator_temperature, isMaitri ? 78.4 : 74.1);
  const currentPower = asNumber(liveTelemetry?.power_consumption, isMaitri ? 105 : 148);
  const currentBattery = asNumber(liveTelemetry?.battery_level ?? liveTelemetry?.battery, isMaitri ? 74 : 91);
  const currentExternalTemp = asNumber(liveTelemetry?.temperature, isMaitri ? -18.7 : -14.2);
  const currentWind = asNumber(liveTelemetry?.wind_speed, isMaitri ? 28 : 44);
  const packetTime = liveTelemetry?.recorded_at || liveTelemetry?.timestamp || lastSyncedAt;
  const sourceLabel = dataSource === 'simulated-telemetry' ? 'Live simulation feed' : dataSource === 'last-received' ? 'Last received packet' : 'Demonstration baseline';
  const liveMetrics = [
    { label: 'Generator core', value: currentGenTemp.toFixed(1), unit: '°C', detail: 'Safe limit 85°C', icon: Gauge, tone: currentGenTemp >= 85 ? 'warning' : 'teal' },
    { label: 'Station demand', value: currentPower.toFixed(1), unit: 'kW', detail: isMaitri ? '180 kW reference capacity' : '240 kW reference capacity', icon: Zap, tone: 'blue' },
    { label: 'Battery reserve', value: currentBattery.toFixed(1), unit: '%', detail: 'State of charge', icon: Battery, tone: currentBattery < 30 ? 'warning' : 'green' },
    { label: 'Outside conditions', value: currentExternalTemp.toFixed(1), unit: '°C', detail: `${currentWind.toFixed(1)} km/h wind`, icon: Wind, tone: 'slate' },
  ];

  return (
    <div className="tab-page-container telemetry-view-container">
      <div className="tab-page-header telemetry-page-header">
        <div>
          <span className="telemetry-eyebrow">Station telemetry / {station.name}</span>
          <h2 className="tab-page-title">Live systems telemetry</h2>
          <span className="tab-page-subtitle">Operational sensor readings from {station.fullName}, {station.region}.</span>
        </div>
        <div className={`telemetry-connection ${isSimulatorOnline ? 'is-live' : ''}`}>
          <span className="telemetry-connection-dot" />
          <div><strong>{isSimulatorOnline ? 'Receiving telemetry' : 'Feed awaiting packets'}</strong><small>{sourceLabel}</small></div>
        </div>
      </div>

      <section className="telemetry-live-summary" aria-label="Latest station readings">
        {liveMetrics.map(({ label, value, unit, detail, icon: Icon, tone }) => (
          <article className={`telemetry-live-metric is-${tone}`} key={label}>
            <span className="telemetry-live-icon"><Icon size={18} aria-hidden="true" /></span>
            <div><span>{label}</span><strong>{value}<small>{unit}</small></strong><p>{detail}</p></div>
          </article>
        ))}
      </section>

      <div className="telemetry-toolbar polaris-card">
        <div className="toolbar-left">
          <button 
            className={`btn-stream-toggle ${isStreaming ? 'streaming' : 'paused'}`}
            onClick={() => setIsStreaming(!isStreaming)}
            aria-pressed={isStreaming}
          >
            {isStreaming ? <Pause size={14} /> : <Play size={14} />}
            <span>{isStreaming ? 'Pause stream' : 'Resume stream'}</span>
          </button>

          <div className="sample-rate-selector">
            <span className="toolbar-lbl">Chart sample rate</span>
            {['1 Hz', '2 Hz', '5 Hz'].map((rate) => (
              <button
                key={rate}
                className={`rate-btn ${sampleRate === rate ? 'active' : ''}`}
                onClick={() => setSampleRate(rate)}
                aria-pressed={sampleRate === rate}
              >
                {rate}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-right">
          <span className="telemetry-last-packet"><Clock3 size={14} />Last packet {formatStationTime(packetTime, station.timezone)}</span>
          <button className="btn-export-csv" onClick={handleExportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="telemetry-stream-graph-card polaris-card">
        <div className="stream-graph-header">
          <div className="stream-title-wrap">
            <span className="telemetry-chart-icon"><Activity size={18} /></span>
            <div><span className="telemetry-eyebrow">Normalized signal view</span><h3 className="section-title">Seven-sample live window</h3></div>
          </div>
          <div className="stream-channel-legend">
            <span className="ch-pill is-temperature"><i />Generator <strong>{currentGenTemp.toFixed(1)}°C</strong></span>
            <span className="ch-pill is-power"><i />Demand <strong>{currentPower.toFixed(1)} kW</strong></span>
            <span className="ch-pill is-battery"><i />Battery <strong>{currentBattery.toFixed(1)}%</strong></span>
          </div>
        </div>

        <div className="stream-chart-shell">
          <div className="telemetry-y-axis" aria-hidden="true"><span>GEN</span><span>LOAD</span><span>BATT</span></div>
          <div className="stream-chart-container">
          <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" aria-label="Normalized telemetry trend chart">
            {[0.22, 0.5, 0.78].map((p, idx) => {
              const y = paddingTop + graphHeight - p * graphHeight;
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="#dce5ea" strokeDasharray="4 6" />
                </g>
              );
            })}
            <polyline fill="none" stroke="#946013" strokeWidth="2" points={tempPoints} strokeLinecap="round" strokeLinejoin="round" />
            <polyline fill="none" stroke="#146b80" strokeWidth="1.8" points={powerPoints} strokeLinecap="round" strokeLinejoin="round" />
            <polyline fill="none" stroke="#187451" strokeWidth="1.8" points={battPoints} strokeLinecap="round" strokeLinejoin="round" />
            {streamData.map((d, i) => (
              <g key={i}>
                <circle cx={getX(i)} cy={getYTemp(d.genTemp)} r="3" fill="#fff" stroke="#946013" strokeWidth="1.8" />
                <circle cx={getX(i)} cy={getYPower(d.powerCons)} r="3" fill="#fff" stroke="#146b80" strokeWidth="1.8" />
                <circle cx={getX(i)} cy={getYBatt(d.battPct)} r="3" fill="#fff" stroke="#187451" strokeWidth="1.8" />
              </g>
            ))}
          </svg>
          <div className="telemetry-x-axis" aria-hidden="true">{streamData.map((d, i) => <span key={`${d.time}-${i}`}>{d.time}</span>)}</div>
          </div>
        </div>
        <p className="telemetry-chart-note">Each trace is centered in its own deviation lane so small live changes remain visible. Exact engineering units remain available above and in the sensor register.</p>
      </div>

      {/* Subsystem Group Filter Bar */}
      <div className="telemetry-filter-bar polaris-card">
        <span className="filter-lbl">Sensor groups</span>
        <div className="filter-pill-row">
          <button 
            className={`domain-pill ${selectedGroup === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedGroup('ALL')}
          >
            All sensors <span>{sensorGroups.reduce((acc, g) => acc + g.sensors.length, 0)}</span>
          </button>
          {sensorGroups.map((g) => (
            <button 
              key={g.groupId}
              className={`domain-pill ${selectedGroup === g.groupId ? 'active' : ''}`}
              onClick={() => setSelectedGroup(g.groupId)}
            >
              {g.groupName.replace(/\s*\([^)]*\)/, '')}
            </button>
          ))}
        </div>
      </div>

      {/* Sensor Matrices Grid */}
      <div className="sensor-matrices-grid">
        {filteredGroups.map((group) => {
          const IconComp = group.icon;
          return (
            <div key={group.groupId} className="sensor-group-card polaris-card">
              <div className="group-card-header">
                <div className="group-title-wrap">
                  <IconComp size={16} style={{ color: group.color }} />
                  <h4 className="group-name">{group.groupName}</h4>
                </div>
                <span className="sensor-count-badge">{group.sensors.length} sensors</span>
              </div>

              <div className="sensors-table-wrap">
                <table className="sensors-table">
                  <thead>
                    <tr>
                      <th>Sensor ID</th>
                      <th>Parameter Description</th>
                      <th>Telemetry Value</th>
                      <th>Nominal Range</th>
                      <th>SCADA Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.sensors.map((s) => (
                      <tr key={s.id}>
                        <td className="mono-num text-cyan">{s.id}</td>
                        <td className="sensor-name-cell">{s.name}</td>
                        <td className="mono-num font-bold" style={{ color: s.color }}>{s.val}</td>
                        <td className="mono-num text-dim">{s.range}</td>
                        <td>
                          <span className="sensor-status-tag" style={{ borderColor: s.color, color: s.color }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
