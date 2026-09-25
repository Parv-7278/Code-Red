import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Package, 
  CloudSnow, 
  Activity, 
  Radio, 
  AlertTriangle, 
  ArrowRight,
  Compass,
  Thermometer,
  Wind,
  Clock
} from 'lucide-react';
import { STATIONS_DATA } from '../data/stationsData';
import { useStationClock } from '../utils/timeUtils';

export default function AllStationsOverview({ onSelectStation }) {
  const maitri = STATIONS_DATA['station-maitri'];
  const bharati = STATIONS_DATA['station-bharati'];

  const maitriClock = useStationClock(maitri.timezone || 'UTC');
  const bharatiClock = useStationClock(bharati.timezone || 'Antarctica/Mawson');

  return (
    <div className="tab-page-container all-stations-container">
      {/* Title / Banner */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">National Antarctic Mission Control – Unified Multi-Station Telemetry</h2>
          <span className="tab-page-subtitle">
            Synchronized Real-Time Satellite Monitoring of India's Maitri and Bharati Polar Research Stations
          </span>
        </div>
      </div>

      {/* Dual Station Comparative Grid */}
      <div className="dual-station-grid">
        {/* MAITRI CARD */}
        <div className="station-overview-card">
          <div className="station-card-top-bar">
            <div className="station-title-cluster">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="station-card-code">STATION #1</span>
                <span style={{ fontSize: '11px', padding: '2px 7px', background: 'rgba(56, 189, 248, 0.12)', color: '#146b80', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} /> Local: <strong className="mono-num">{maitriClock.timeStrWithSeconds}</strong> ({maitri.timezone_label || 'UTC+0'})
                </span>
              </div>
              <h3 className="station-card-name">Maitri Research Station</h3>
              <span className="station-card-region">{maitri.region} • Est. {maitri.commissioned_year || maitri.established}</span>
            </div>
            <div className="station-health-badge health-nominal">
              <span className="health-score-big">{maitri.health.score}</span>
              <span className="health-label">HEALTH INDEX</span>
            </div>
          </div>

          <div className="station-card-image-wrap">
            <img src={maitri.image} alt="Maitri Station" className="station-preview-img" />
            <div className="station-image-overlay">
              <span>{maitri.coords}</span>
              <span>{maitri.altitude}</span>
            </div>
          </div>

          <div className="station-telemetry-metrics">
            <div className="telemetry-metric-box">
              <div className="metric-box-header">
                <Zap size={14} className="text-cyan" />
                <span>POWER GRID</span>
              </div>
              <div className="metric-box-val">{maitri.energy.totalGeneration} kW</div>
              <div className="metric-box-sub">Cons: {maitri.energy.totalConsumption} kW | Batt: {maitri.energy.batteryLevel}%</div>
            </div>

            <div className="telemetry-metric-box">
              <div className="metric-box-header">
                <Package size={14} className="text-cyan" />
                <span>LOGISTICS</span>
              </div>
              <div className="metric-box-val">{maitri.logistics.fuel.daysRemaining} Days</div>
              <div className="metric-box-sub">Rations: {maitri.logistics.food.daysRemaining}d | Water: {maitri.logistics.water.current} L</div>
            </div>

            <div className="telemetry-metric-box">
              <div className="metric-box-header">
                <Thermometer size={14} className="text-cyan" />
                <span>ENVIRONMENT</span>
              </div>
              <div className="metric-box-val">{maitri.weather.temperature}°C</div>
              <div className="metric-box-sub">Wind: {maitri.weather.windSpeed} km/h {maitri.weather.windDirection}</div>
            </div>

            <div className="telemetry-metric-box">
              <div className="metric-box-header">
                <Activity size={14} className="text-cyan" />
                <span>RESEARCH</span>
              </div>
              <div className="metric-box-val">Kp {maitri.research?.geomagnetic_kp?.kp_index_current || '2.3'}</div>
              <div className="metric-box-sub">Seismic: {maitri.research?.seismic?.dominant_frequency_hz || '1.85'} Hz | Crew: 24</div>
            </div>
          </div>

          <div className="station-card-footer">
            <div className="station-alert-summary">
              <AlertTriangle size={14} className="text-warning" />
              <span>{maitri.alerts.length} Active Monitored Incident(s)</span>
            </div>
            <button 
              className="drilldown-station-btn"
              onClick={() => onSelectStation('station-maitri')}
            >
              <span>Switch to Maitri Dashboard</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* BHARATI CARD */}
        <div className="station-overview-card">
          <div className="station-card-top-bar">
            <div className="station-title-cluster">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="station-card-code">STATION #2</span>
                <span style={{ fontSize: '11px', padding: '2px 7px', background: 'rgba(56, 189, 248, 0.12)', color: '#146b80', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} /> Local: <strong className="mono-num">{bharatiClock.timeStrWithSeconds}</strong> ({bharati.timezone_label || 'UTC+5'})
                </span>
              </div>
              <h3 className="station-card-name">Bharati Research Station</h3>
              <span className="station-card-region">{bharati.region} • Est. {bharati.commissioned_year || bharati.established}</span>
            </div>
            <div className="station-health-badge health-optimal">
              <span className="health-score-big">{bharati.health.score}</span>
              <span className="health-label">HEALTH INDEX</span>
            </div>
          </div>

          <div className="station-card-image-wrap">
            <img src={bharati.image} alt="Bharati Station" className="station-preview-img" />
            <div className="station-image-overlay">
              <span>{bharati.coords}</span>
              <span>{bharati.altitude}</span>
            </div>
          </div>

          <div className="station-telemetry-metrics">
            <div className="telemetry-metric-box">
              <div className="metric-box-header">
                <Zap size={14} className="text-cyan" />
                <span>POWER GRID</span>
              </div>
              <div className="metric-box-val">{bharati.energy.totalGeneration} kW</div>
              <div className="metric-box-sub">Cons: {bharati.energy.totalConsumption} kW | Batt: {bharati.energy.batteryLevel}%</div>
            </div>

            <div className="telemetry-metric-box">
              <div className="metric-box-header">
                <Package size={14} className="text-cyan" />
                <span>LOGISTICS</span>
              </div>
              <div className="metric-box-val">{bharati.logistics.fuel.daysRemaining} Days</div>
              <div className="metric-box-sub">Rations: {bharati.logistics.food.daysRemaining}d | Water: {bharati.logistics.water.current} L</div>
            </div>

            <div className="telemetry-metric-box">
              <div className="metric-box-header">
                <Thermometer size={14} className="text-cyan" />
                <span>ENVIRONMENT</span>
              </div>
              <div className="metric-box-val">{bharati.weather.temperature}°C</div>
              <div className="metric-box-sub">Wind: {bharati.weather.windSpeed} km/h {bharati.weather.windDirection}</div>
            </div>

            <div className="telemetry-metric-box">
              <div className="metric-box-header">
                <Activity size={14} className="text-cyan" />
                <span>RESEARCH</span>
              </div>
              <div className="metric-box-val">Kp {bharati.research?.geomagnetic_kp?.kp_index_current || '2.8'}</div>
              <div className="metric-box-sub">Seismic: {bharati.research?.seismic?.dominant_frequency_hz || '3.65'} Hz | Crew: 42</div>
            </div>
          </div>

          <div className="station-card-footer">
            <div className="station-alert-summary">
              <AlertTriangle size={14} className="text-warning" />
              <span>{bharati.alerts.length} Active Monitored Incident(s)</span>
            </div>
            <button 
              className="drilldown-station-btn"
              onClick={() => onSelectStation('station-bharati')}
            >
              <span>Switch to Bharati Dashboard</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
