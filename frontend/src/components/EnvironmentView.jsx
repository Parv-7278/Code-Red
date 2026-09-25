import React, { useState } from 'react';
import {
  CloudSnow,
  Wind,
  Thermometer,
  Compass,
  Eye,
  Sun,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Layers,
  Radio,
  Zap,
  TrendingDown,
  TrendingUp,
  Snowflake,
  Maximize2
} from 'lucide-react';
import { STATIONS_DATA } from '../data/stationsData';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';
import AIPredictionIndicator from './AIPredictionIndicator';

export default function EnvironmentView({ selectedStation }) {
  const stationId = selectedStation === 'all-stations' ? 'station-maitri' : selectedStation;
  const station = STATIONS_DATA[stationId] || STATIONS_DATA['station-maitri'];
  const isMaitri = station.id === 'station-maitri';

  const [activeSubTab, setActiveSubTab] = useState('meteorology');

  // Weather data parameters
  const weather = station.weather || {};
  const isBharati = !isMaitri;

  // 24h Meteorological Trend Graph Data
  const hourlyData = [
    { time: '00:00', temp: isMaitri ? -19.4 : -15.1, wind: isMaitri ? 22 : 38, pressure: 984.2, solar: 0 },
    { time: '04:00', temp: isMaitri ? -20.2 : -15.8, wind: isMaitri ? 25 : 42, pressure: 983.8, solar: 10 },
    { time: '08:00', temp: isMaitri ? -18.9 : -14.6, wind: isMaitri ? 28 : 45, pressure: 983.1, solar: 180 },
    { time: '12:00', temp: isMaitri ? -17.8 : -13.5, wind: isMaitri ? 31 : 48, pressure: 982.5, solar: 340 },
    { time: '16:00', temp: isMaitri ? -18.7 : -14.2, wind: isMaitri ? 28 : 44, pressure: 982.9, solar: 210 },
    { time: '20:00', temp: isMaitri ? -19.6 : -14.9, wind: isMaitri ? 24 : 40, pressure: 983.5, solar: 25 },
    { time: 'Now', temp: isMaitri ? -18.7 : -14.2, wind: isMaitri ? 28 : 44, pressure: isMaitri ? 983.1 : 991.4, solar: 140 },
  ];

  // 7-Day Polar Meteorological Forecast
  const forecast7Day = [
    { day: 'Today', high: isMaitri ? -17.5 : -13.2, low: isMaitri ? -20.5 : -16.0, wind: isMaitri ? '28 km/h' : '44 km/h', cond: 'Scattered Cirrus', snow: '2.5 cm' },
    { day: 'Tomorrow', high: isMaitri ? -16.8 : -12.5, low: isMaitri ? -19.8 : -15.2, wind: isMaitri ? '35 km/h' : '52 km/h', cond: 'Polar Blizzard Warning', snow: '14.0 cm' },
    { day: 'Day +2', high: isMaitri ? -19.2 : -15.0, low: isMaitri ? -23.5 : -18.5, wind: isMaitri ? '45 km/h' : '65 km/h', cond: 'Gale Force Whiteout', snow: '22.0 cm' },
    { day: 'Day +3', high: isMaitri ? -21.0 : -16.8, low: isMaitri ? -24.8 : -20.1, wind: isMaitri ? '30 km/h' : '48 km/h', cond: 'Clearing Katabatic', snow: '4.0 cm' },
    { day: 'Day +4', high: isMaitri ? -18.4 : -14.0, low: isMaitri ? -21.2 : -16.9, wind: isMaitri ? '20 km/h' : '36 km/h', cond: 'Clear Polar Skies', snow: '0.5 cm' },
    { day: 'Day +5', high: isMaitri ? -17.9 : -13.5, low: isMaitri ? -20.6 : -16.4, wind: isMaitri ? '24 km/h' : '38 km/h', cond: 'High Cirrus', snow: '1.2 cm' },
    { day: 'Day +6', high: isMaitri ? -18.5 : -14.1, low: isMaitri ? -21.0 : -17.0, wind: isMaitri ? '26 km/h' : '42 km/h', cond: 'Overcast Stratus', snow: '3.0 cm' },
  ];

  // Subsurface & Permafrost Temperature Array
  const permafrostSensors = isMaitri ? [
    { depth: 'Surface Ground (0 m)', temp: -18.2, status: 'FROZEN SOLID' },
    { depth: 'Subsurface Firn (-5 m)', temp: -16.4, status: 'PERMAFROST' },
    { depth: 'Bedrock Borehole (-15 m)', temp: -14.1, status: 'STABLE GEOTHERMAL' },
    { depth: 'Deep Borehole (-30 m)', temp: -12.6, status: 'ISOTHERMAL' },
  ] : [
    { depth: 'Coastal Bedrock (0 m)', temp: -13.8, status: 'FROZEN SOLID' },
    { depth: 'Ice Shelf Core (-5 m)', temp: -12.8, status: 'MARINE INFLUENCED' },
    { depth: 'Promontory Subsurface (-15 m)', temp: -10.5, status: 'STABLE GEOTHERMAL' },
    { depth: 'Prydz Bay Sea Floor (-45 m)', temp: -1.8, status: 'SUBSEA CRYOSPHERIC' },
  ];

  // SVG dimensions for 24h Profile
  const chartW = 540;
  const chartH = 150;
  const padL = 45;
  const padR = 25;
  const padT = 20;
  const padB = 25;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const minTemp = isMaitri ? -22 : -18;
  const maxTemp = isMaitri ? -16 : -12;
  const getTempY = (t) => padT + innerH - ((t - minTemp) / (maxTemp - minTemp)) * innerH;
  const getTempX = (i) => padL + (i / (hourlyData.length - 1)) * innerW;

  const tempLinePoints = hourlyData.map((d, i) => `${getTempX(i)},${getTempY(d.temp)}`).join(' ');
  const tempAreaPoints = `${padL},${padT + innerH} ${tempLinePoints} ${padL + innerW},${padT + innerH}`;

  return (
    <div className="tab-page-container environment-view-container">
      {/* Top Banner */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">{station.name} Polar Meteorological & Space Weather Center</h2>
          <span className="tab-page-subtitle">
            Live Cryospheric Sensors, Blizzard Hazard Warning System, and Geomagnetic Aurora Observatory ({station.region})
          </span>
        </div>
        <div className="header-status-badge">
          <Snowflake size={14} className="text-cyan" />
          <span>STATION CLIMATE: {isMaitri ? 'INLAND CONTINENTAL MORAINE' : 'COASTAL MARITIME ANTARCTIC'}</span>
        </div>
      </div>

      {/* AI Predictive Intelligence Section Indicator */}
      <AIPredictionIndicator category="environment" />

      {/* Primary KPI Ribbon */}
      <div className="env-kpi-ribbon">
        <ExpandableTelemetryCard
          title="Surface Temperature"
          subtitle={`${station.name} Mast Ambient Sensor`}
          category="Environment Telemetry"
          status="ONLINE"
          metrics={{
            'Ambient Temp': `${weather.temp || '-18.7'}°C`,
            'Wind Chill': isMaitri ? '-28.4°C' : '-24.8°C',
            'Dew Point': isMaitri ? '-24.2°C' : '-19.6°C',
            'Sensor Location': isMaitri ? 'Met Mast 10m' : 'Coastal Tower 12m',
            'Thermal Drift': '-0.3°C/hr',
            'Condition': weather.condition || 'Polar Clear'
          }}
        >
          <div className="env-kpi-card">
            <div className="kpi-label-row">
              <Thermometer size={16} className="text-cyan" />
              <span className="kpi-lbl">SURFACE TEMP</span>
            </div>
            <div className="kpi-big-val mono-num">{weather.temp || '-18.7'}°C</div>
            <div className="kpi-sub-txt">
              RealFeel Wind Chill: <span className="text-cyan font-bold">{isMaitri ? '-28.4°C' : '-24.8°C'}</span>
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Wind Velocity & Katabatic Vector"
          subtitle="Sonic Anemometer & Vane Transducer"
          category="Environment Telemetry"
          status="ONLINE"
          metrics={{
            'Wind Speed': weather.windSpeed || '28 km/h',
            'Direction': `${weather.windDir || 'NW'} (${isMaitri ? '315°' : '290°'})`,
            'Peak Gusts': isMaitri ? '42 km/h' : '62 km/h',
            'Turbulence KE': '2.4 m²/s²',
            'Katabatic Flow': 'Active Inland Downslope',
            'Blizzard Trigger': 'Threshold > 55 km/h'
          }}
        >
          <div className="env-kpi-card">
            <div className="kpi-label-row">
              <Wind size={16} className="text-amber" />
              <span className="kpi-lbl">WIND VELOCITY</span>
            </div>
            <div className="kpi-big-val mono-num">{weather.windSpeed || '28 km/h'}</div>
            <div className="kpi-sub-txt">
              Direction: <span className="text-amber font-bold">{weather.windDir || 'NW'}</span> | Gusts: {isMaitri ? '42 km/h' : '62 km/h'}
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Snow Accumulation & Drift Rate"
          subtitle="Ultrasonic Snow Depth Gauge"
          category="Environment Telemetry"
          status="ONLINE"
          metrics={{
            'Snow Depth': weather.snowAccumulation || (isMaitri ? '12.4 cm' : '24.2 cm'),
            '24h Drift Rate': isMaitri ? '0.85 cm/hr' : '1.75 cm/hr',
            'Snow Density': '340 kg/m³',
            'Firn Hardness': 'R5 Hard Packed',
            'Drift Hazard': 'Moderate Sastrugi Formation',
            'Station Clearance': 'Scheduled for 06:00 UTC'
          }}
        >
          <div className="env-kpi-card">
            <div className="kpi-label-row">
              <CloudSnow size={16} className="text-blue" />
              <span className="kpi-lbl">SNOW ACCUMULATION</span>
            </div>
            <div className="kpi-big-val mono-num">{weather.snowAccumulation || (isMaitri ? '12.4 cm' : '24.2 cm')}</div>
            <div className="kpi-sub-txt">
              24h Drift Rate: <span className="text-blue font-bold">{isMaitri ? '0.85 cm/hr' : '1.75 cm/hr'}</span>
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Atmospheric Optical Visibility"
          subtitle="Forward Scatter Transmissometer"
          category="Environment Telemetry"
          status="ONLINE"
          metrics={{
            'Visibility Distance': weather.visibility || '4.8 km',
            'Condition': weather.condition || 'Polar Clear',
            'Optical Extinction': '0.042 /km',
            'Horizontal RVR': '4,800 m',
            'Whiteout Risk': 'Low (< 15%)',
            'Helo Landing Status': 'OPEN (VFR Conditions)'
          }}
        >
          <div className="env-kpi-card">
            <div className="kpi-label-row">
              <Eye size={16} className="text-emerald" />
              <span className="kpi-lbl">VISIBILITY</span>
            </div>
            <div className="kpi-big-val mono-num">{weather.visibility || '4.8 km'}</div>
            <div className="kpi-sub-txt">
              Condition: <span className="text-emerald font-bold">{weather.condition || 'Polar Clear'}</span>
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Geomagnetic Planetary Kp Index"
          subtitle="Polar Fluxgate Magnetometer Array"
          category="Space Weather Telemetry"
          status="ONLINE"
          metrics={{
            'Kp Index': `Kp ${isMaitri ? '2.3' : '2.8'}`,
            'Space Weather': 'G1 Minor Storm / Auroral Oval',
            'Aurora Intensity': '45 kR (Green 557.7 nm)',
            'Solar Wind Speed': '442.8 km/s',
            'IMF Bz': '-2.4 nT (Southward)',
            'HF Radio Absorption': '0.2 dB (Minimal Loss)'
          }}
        >
          <div className="env-kpi-card">
            <div className="kpi-label-row">
              <Activity size={16} className="text-purple" />
              <span className="kpi-lbl">GEOMAGNETIC KP</span>
            </div>
            <div className="kpi-big-val mono-num">Kp {isMaitri ? '2.3' : '2.8'}</div>
            <div className="kpi-sub-txt">
              Space Weather: <span className="text-purple font-bold">G1 Minor Storm / Aurora</span>
            </div>
          </div>
        </ExpandableTelemetryCard>
      </div>

      {/* Main Meteorological Grid */}
      <div className="env-main-grid">
        {/* Left Column: 24h Trend Chart & Space Weather Console */}
        <div className="env-charts-col">
          {/* 24h Temperature & Wind Profile (Native SVG) */}
          <div className="env-chart-card polaris-card">
            <div className="panel-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Thermometer size={16} className="text-cyan" />
                <h3 className="section-title">24-Hour Polar Thermal & Katabatic Wind Profile</h3>
              </div>
              <div className="stream-channel-legend" style={{ fontSize: '0.72rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: '#146b80' }}>● Temperature (°C)</span>
              </div>
            </div>
            <p className="section-subtitle">
              Micro-meteorological telemetry recorded by station mast weather transducers.
            </p>

            <div className="chart-container" style={{ height: 200, padding: '0.5rem 0' }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#146b80" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#146b80" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                  const y = padT + innerH - p * innerH;
                  const tempVal = (minTemp + p * (maxTemp - minTemp)).toFixed(1);
                  return (
                    <g key={idx}>
                      <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <text x={padL - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                        {tempVal}°C
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis labels */}
                {hourlyData.map((d, i) => (
                  <text key={i} x={getTempX(i)} y={chartH - 6} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    {d.time}
                  </text>
                ))}

                {/* Shaded Area */}
                <polygon points={tempAreaPoints} fill="url(#tempGradient)" />

                {/* Main Temperature Line */}
                <polyline fill="none" stroke="#146b80" strokeWidth="2.2" points={tempLinePoints} strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                {hourlyData.map((d, i) => (
                  <g key={i}>
                    <circle cx={getTempX(i)} cy={getTempY(d.temp)} r="3" fill="#146b80" stroke="#060b14" strokeWidth="1.5" />
                    <text x={getTempX(i)} y={getTempY(d.temp) - 8} textAnchor="middle" fill="#146b80" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      {d.temp}°
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Space Weather & Aurora Oval */}
          <div className="space-weather-card polaris-card">
            <div className="panel-title-row">
              <Zap size={16} className="text-purple" />
              <h3 className="section-title">Upper Atmosphere & Space Weather Telemetry</h3>
            </div>
            <div className="space-weather-grid">
              <ExpandableTelemetryCard
                title="Solar Wind Speed & Density"
                subtitle="ACE & DSCOVR Real-Time Space Weather"
                category="Space Weather Telemetry"
                status="ONLINE"
                metrics={{
                  'Solar Wind Velocity': '442.8 km/s',
                  'Proton Density': '6.4 p/cm³',
                  'Dynamic Pressure': '2.1 nPa',
                  'Status': 'Nominal Velocity (Sub-Alfvénic)'
                }}
              >
                <div className="sw-item">
                  <span className="sw-label">Solar Wind Speed</span>
                  <span className="sw-val mono-num">442.8 km/s</span>
                  <span className="sw-status text-emerald">Nominal Velocity</span>
                </div>
              </ExpandableTelemetryCard>

              <ExpandableTelemetryCard
                title="Interplanetary Magnetic Field (IMF)"
                subtitle="Triaxial Magnetometer Sensor"
                category="Space Weather Telemetry"
                status="ONLINE"
                metrics={{
                  'IMF Bz (North-South)': '-2.4 nT (Southward)',
                  'IMF By (East-West)': '+1.8 nT',
                  'Total Field (Bt)': '4.2 nT',
                  'Substorm Potential': 'Elevated Auroral Precipitation'
                }}
              >
                <div className="sw-item">
                  <span className="sw-label">Interplanetary Mag Field (IMF Bz)</span>
                  <span className="sw-val mono-num">-2.4 nT (Southward)</span>
                  <span className="sw-status text-amber">Minor Auroral Injection</span>
                </div>
              </ExpandableTelemetryCard>

              <ExpandableTelemetryCard
                title="Ionospheric Scintillation (S4 Index)"
                subtitle="Dual-Frequency GNSS Receiver"
                category="Space Weather Telemetry"
                status="ONLINE"
                metrics={{
                  'S4 Scintillation Index': '0.165',
                  'Total Electron Content (TEC)': '14.2 TECU',
                  'Satcom UHF Loss': '0.0 dB (Negligible)',
                  'Status': 'Satcom UHF & GPS Safe'
                }}
              >
                <div className="sw-item">
                  <span className="sw-label">Ionospheric Scintillation (S4)</span>
                  <span className="sw-val mono-num">0.165</span>
                  <span className="sw-status text-emerald">Satcom UHF Safe</span>
                </div>
              </ExpandableTelemetryCard>

              <ExpandableTelemetryCard
                title="Stratospheric Total Ozone Column"
                subtitle="Brewer / Dobson Spectrophotometer"
                category="Atmospheric Chemistry"
                status="ONLINE"
                metrics={{
                  'Ozone Column': '285 Dobson Units (DU)',
                  'Vortex Baseline': '220 DU Threshold',
                  'UV Index': '1.8 (Low)',
                  'Status': 'Polar Vortex Stable / Nominal'
                }}
              >
                <div className="sw-item">
                  <span className="sw-label">Total Ozone Column</span>
                  <span className="sw-val mono-num">285 Dobson Units</span>
                  <span className="sw-status text-cyan">Spring Ozone Layer Nominal</span>
                </div>
              </ExpandableTelemetryCard>
            </div>
          </div>

          {/* Subsurface Borehole & Permafrost Temperature Array */}
          <div className="permafrost-card polaris-card">
            <div className="panel-title-row">
              <Layers size={16} className="text-blue" />
              <h3 className="section-title">Cryospheric Permafrost Borehole Array</h3>
            </div>
            <div className="permafrost-table">
              {permafrostSensors.map((p, idx) => (
                <ExpandableTelemetryCard
                  key={idx}
                  title={`Cryospheric Borehole: ${p.depth}`}
                  subtitle={`${station.name} Deep Ground Thermistor String`}
                  category="Geophysical Cryosphere"
                  status={p.status}
                  metrics={{
                    'Borehole Depth': p.depth,
                    'Subsurface Temperature': `${p.temp}°C`,
                    'Active Layer State': p.status,
                    'Thermal Stability': '±0.04°C annual drift',
                    'Bedrock Coupling': 'Continuous Core Contact'
                  }}
                >
                  <div className="permafrost-row">
                    <span className="pf-depth">{p.depth}</span>
                    <span className="pf-temp mono-num">{p.temp}°C</span>
                    <span className="pf-status-pill">{p.status}</span>
                  </div>
                </ExpandableTelemetryCard>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 7-Day Forecast & Polar Wind Rose Radar */}
        <div className="env-side-col">
          {/* 7-Day Detailed Forecast List */}
          <div className="forecast-card polaris-card">
            <div className="panel-title-row">
              <Clock size={16} className="text-cyan" />
              <h3 className="section-title">7-Day Polar Meteorological Forecast</h3>
            </div>
            <div className="forecast-list">
              {forecast7Day.map((fc, i) => (
                <ExpandableTelemetryCard
                  key={i}
                  title={`Polar Forecast: ${fc.day}`}
                  subtitle={`${fc.cond} • ${station.name}`}
                  category="Meteorological Forecast"
                  status={fc.cond.includes('Blizzard') || fc.cond.includes('Gale') ? 'WARNING' : 'NOMINAL'}
                  metrics={{
                    'Forecast Period': fc.day,
                    'Atmospheric Condition': fc.cond,
                    'Expected Snowfall': fc.snow,
                    'Wind Velocity': fc.wind,
                    'Max Temp': `${fc.high}°C`,
                    'Min Temp': `${fc.low}°C`,
                    'Confidence Score': '94% (ECMWF + GFS Ensemble)'
                  }}
                >
                  <div className={`forecast-item-row ${i === 1 ? 'forecast-item-warning' : ''}`}>
                    <div className="fc-day-col">
                      <span className="fc-day-name">{fc.day}</span>
                      <span className="fc-cond-name">{fc.cond}</span>
                    </div>
                    <div className="fc-snow-col">
                      <CloudSnow size={12} className="text-cyan" />
                      <span>{fc.snow}</span>
                    </div>
                    <div className="fc-wind-col">
                      <Wind size={12} className="text-amber" />
                      <span>{fc.wind}</span>
                    </div>
                    <div className="fc-temp-col mono-num">
                      <span className="fc-high">{fc.high}°</span>
                      <span className="fc-low">{fc.low}°</span>
                    </div>
                  </div>
                </ExpandableTelemetryCard>
              ))}
            </div>
          </div>

          {/* Blizzard Emergency Readiness Checklist */}
          <div className="blizzard-readiness-card polaris-card">
            <div className="panel-title-row">
              <AlertTriangle size={16} className="text-amber" />
              <h3 className="section-title">Blizzard Safety & Readiness Status</h3>
            </div>
            <div className="readiness-list">
              <div className="readiness-item">
                <span className="check-dot text-emerald">✓</span>
                <span className="readiness-txt">Emergency Guideline Ropes Checked</span>
              </div>
              <div className="readiness-item">
                <span className="check-dot text-emerald">✓</span>
                <span className="readiness-txt">Diesel Tank Trace Heating Auto-Engaged</span>
              </div>
              <div className="readiness-item">
                <span className="check-dot text-emerald">✓</span>
                <span className="readiness-txt">Science Outdoor Field Parties Recalled to Station</span>
              </div>
              <div className="readiness-item">
                <span className="check-dot text-emerald">✓</span>
                <span className="readiness-txt">Emergency Survival Rations & Satcom Beacons Primed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
