import React from 'react';
import { ArrowRight, Activity, Battery, CloudSnow, Package, Zap, AlertTriangle, Radio, MapPin, Clock3, CheckCircle2, Database, ShieldCheck } from 'lucide-react';
import { STATIONS_DATA } from '../data/stationsData';
import { useTelemetry } from '../context/TelemetryContext';
import { usePredictive } from '../context/PredictiveContext';

const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const formattedTime = (iso) => {
  if (!iso) return 'Awaiting update';
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? 'Awaiting update' : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function StationSummary({ station, packet, onOpen }) {
  const generation = number(packet?.power_generation, station.energy.generation);
  const demand = number(packet?.power_consumption, station.energy.consumption);
  return (
    <article className="ops-station-summary">
      <div className="ops-station-image">
        <img src={station.heroImage} alt={`${station.fullName} landscape`} />
        <span className={`ops-reporting-badge${packet ? ' is-live' : ''}`}><span />{packet ? 'Reporting' : 'Sample record'}</span>
      </div>
      <div className="ops-station-content">
        <div className="ops-station-title-row"><div><div className="ops-section-label">{station.id === 'station-maitri' ? 'INLAND STATION' : 'COASTAL STATION'}</div><h3>{station.fullName}</h3></div><span className="ops-station-code">{station.id === 'station-maitri' ? 'MTR' : 'BHR'}</span></div>
        <p className="ops-station-location"><MapPin size={14} aria-hidden="true" />{station.region}</p>
        <dl className="ops-station-values">
          <div><dt>Health · sample</dt><dd>{station.health.total}<small>/100</small></dd></div>
          <div><dt>Battery</dt><dd>{number(packet?.battery_level ?? packet?.battery, station.energy.batteryPercent).toFixed(1)}<small>%</small></dd></div>
          <div><dt>Power balance</dt><dd>{generation - demand >= 0 ? '+' : ''}{(generation - demand).toFixed(1)}<small>kW</small></dd></div>
        </dl>
        <div className="ops-station-footer"><span><Clock3 size={13} aria-hidden="true" />{packet?.timestamp || packet?.recorded_at ? `Packet ${formattedTime(packet.timestamp || packet.recorded_at)}` : 'Demonstration baseline'}</span><button className="ops-primary" onClick={onOpen}>Open station <ArrowRight size={16} /></button></div>
      </div>
    </article>
  );
}

export default function OperationsOverview({ selectedStation, onSelectStation, onNavigate }) {
  const { telemetry, isSimulatorOnline, alerts, lastSyncedAt, dataSource, connectionError } = useTelemetry();
  const { predictiveData, openPredictionCenter, loading } = usePredictive();
  const isAll = selectedStation === 'all-stations';
  const station = STATIONS_DATA[selectedStation] || STATIONS_DATA['station-maitri'];
  const packet = telemetry[station.id];
  const generation = number(packet?.power_generation, station.energy.generation);
  const demand = number(packet?.power_consumption, station.energy.consumption);
  const battery = number(packet?.battery_level ?? packet?.battery, station.energy.batteryPercent);
  const temperature = number(packet?.temperature, Number(station.weather.temp));
  const stationAlerts = alerts.filter(alert => isAll || alert.station_id === station.id);
  const forecasts = predictiveData?.station_id === station.id ? (predictiveData.predictions || []).slice(0, 3) : [];
  const activeIncidentCount = alerts.filter((alert) => alert.status !== 'ACKNOWLEDGED' && alert.status !== 'RESOLVED').length;
  const stationsReporting = Object.keys(telemetry).filter((id) => id === 'station-maitri' || id === 'station-bharati').length;
  const sourceLabel = dataSource === 'simulated-telemetry' ? 'Simulation feed' : dataSource === 'last-received' ? 'Cached telemetry' : 'Demonstration data';
  const metrics = [
    { label: 'Station health', value: station.health.total, unit: '/100', note: 'Sample subsystem assessment', icon: Activity, target: 'infrastructure' },
    { label: 'Power balance', value: `${generation - demand >= 0 ? '+' : ''}${(generation - demand).toFixed(1)}`, unit: 'kW', note: `${generation.toFixed(1)} generated · ${demand.toFixed(1)} demand`, icon: Zap, target: 'energy' },
    { label: 'Battery reserve', value: battery.toFixed(1), unit: '%', note: 'Available state of charge', icon: Battery, target: 'energy' },
    { label: 'Outside temperature', value: temperature.toFixed(1), unit: '°C', note: station.weather.condition, icon: CloudSnow, target: 'environment' },
    { label: 'Fuel runway', value: station.energy.fuelDays, unit: '', note: 'Sample inventory estimate', icon: Package, target: 'logistics' },
    { label: 'Open incidents', value: stationAlerts.filter(a => a.status !== 'ACKNOWLEDGED' && a.status !== 'RESOLVED').length, unit: '', note: 'Received from the alert service', icon: AlertTriangle, target: 'alerts' },
  ];
  return (
    <main className="ops-overview" aria-labelledby="overview-title">
      <div className="ops-page-heading">
        <div><div className="ops-section-label">{isAll ? 'NATIONAL OPERATIONS / OVERVIEW' : 'STATION OPERATIONS / OVERVIEW'}</div><h2 id="overview-title">{isAll ? 'India Control Centre' : `${station.fullName}`}</h2><p>{isAll ? 'Readiness, telemetry and decision support across India’s Antarctic station network.' : `${station.region} · ${station.coords}`}</p></div>
        <div className="ops-heading-actions"><span className={`ops-source${isSimulatorOnline ? ' is-live' : ''}`}><Radio size={14} />{sourceLabel}</span>{!isAll && <><button className="ops-secondary" onClick={() => openPredictionCenter()}>Review forecasts</button><button className="ops-primary" onClick={() => onNavigate('simulations')}>Run scenario <ArrowRight size={15} /></button></>}</div>
      </div>
      {isAll ? <>
        <section className="ops-command-strip" aria-label="Network status summary">
          <div><span className="ops-command-icon"><CheckCircle2 size={17} /></span><span><small>Stations reporting</small><strong>{Math.min(2, stationsReporting)}/2</strong></span></div>
          <div><span className="ops-command-icon"><AlertTriangle size={17} /></span><span><small>Open incidents</small><strong>{activeIncidentCount}</strong></span></div>
          <div><span className="ops-command-icon"><Database size={17} /></span><span><small>Data source</small><strong>{sourceLabel}</strong></span></div>
          <div><span className="ops-command-icon"><Clock3 size={17} /></span><span><small>Last update</small><strong>{formattedTime(lastSyncedAt)}</strong></span></div>
        </section>
        {connectionError && <p className="ui-feedback" role="status">Live telemetry is temporarily unavailable. The latest received or demonstration values remain visible.</p>}
        <div className="ops-national-note"><strong>Two stations. One operational view.</strong><span>Select a station to inspect its telemetry, run a forecast, or compare an intervention.</span></div>
        <div className="ops-station-grid">{Object.values(STATIONS_DATA).map(st => <StationSummary key={st.id} station={st} packet={telemetry[st.id]} onOpen={() => onSelectStation(st.id)} />)}</div>
        <section className="ops-panel ops-network-note"><div className="ops-network-note-icon"><ShieldCheck size={21} /></div><div><h3>Decision-support environment</h3><p>Station summaries combine demonstration inventory and the latest available telemetry. Forecasts and scenario results are evaluated separately for Maitri and Bharati and must be validated before operational use.</p><div className="ops-text-actions"><button onClick={() => { onSelectStation('station-maitri'); onNavigate('simulations'); }}>Test Maitri scenario <ArrowRight size={15} /></button><button onClick={() => { onSelectStation('station-bharati'); onNavigate('simulations'); }}>Test Bharati scenario <ArrowRight size={15} /></button></div></div></section>
      </> : <>
        <div className="ops-metrics">{metrics.map(({ label, value, unit, note, icon: Icon, target }) => <button className="ops-metric" key={label} onClick={() => onNavigate(target)}><div className="ops-metric-label"><Icon size={17} /><span>{label}</span><ArrowRight size={14} /></div><div className="ops-metric-value">{value}<small>{unit}</small></div><p>{note}</p></button>)}</div>
        <div className="ops-detail-grid">
          <section className="ops-panel"><div className="ops-panel-heading"><div><span className="ops-section-label">DECISION SUPPORT</span><h3>Forecasts to review</h3></div><button className="ops-link" onClick={() => openPredictionCenter()}>View analysis <ArrowRight size={15} /></button></div>
            <p className="ops-caption">{predictiveData?.is_fallback ? 'Browser estimate · prediction service unavailable' : 'Model and rule-based projections · demonstration inputs'}</p>
            {forecasts.length ? <div className="ops-forecast-list">{forecasts.map(f => <button key={f.id} onClick={() => openPredictionCenter(f, f.category)}><span className={`ops-risk ${String(f.risk_level).toLowerCase()}`}>{f.risk_level}</span><span><strong>{f.title}</strong><small>{f.current_val} → {f.predicted_val}</small></span><span className="ops-forecast-meta"><strong>{f.confidence}%</strong><small>{f.time_to_breach}</small></span><ArrowRight size={16} /></button>)}</div> : <p className="ops-empty">{loading ? 'Loading station forecasts…' : 'No forecast available. Open analysis to review the service status.'}</p>}
          </section>
          <section className="ops-panel"><span className="ops-section-label">SCENARIO PLANNING</span><h3>Test a decision before acting</h3><p className="ops-planning-copy">Adjust weather, generator capacity and reserve requirements. Review the expected impact, then compare a preventive action against the original forecast.</p><ol className="ops-steps"><li>Set station conditions</li><li>Run the forecast</li><li>Apply and compare an intervention</li></ol><button className="ops-primary" onClick={() => onNavigate('simulations')}>Open simulation workspace <ArrowRight size={16} /></button></section>
        </div>
        <section className="ops-panel"><div className="ops-panel-heading"><div><span className="ops-section-label">STATION ACTIVITY</span><h3>Recent incidents</h3></div><button className="ops-link" onClick={() => onNavigate('alerts')}>Incident log <ArrowRight size={15} /></button></div>{stationAlerts.length ? <ul className="ops-incident-list">{stationAlerts.slice(0, 4).map((alert, index) => <li key={alert.id || index}><AlertTriangle size={16} /><span>{alert.message || alert.title || 'Station alert'}</span><small>{alert.status || 'ACTIVE'}</small></li>)}</ul> : <div className="ops-empty-state"><CheckCircle2 size={20} /><div><strong>No active incidents received</strong><p>Sample fault scenarios remain available in the incident workspace.</p></div></div>}</section>
      </>}
    </main>
  );
}
