import React from 'react';
import { Bell, User, Compass, LayoutDashboard, Box, Cpu, Zap, Package, CloudSnow, FlaskConical, Layers, SlidersHorizontal, Radio, Settings2, ChartNoAxesCombined } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { usePredictive } from '../context/PredictiveContext';
import './PortalNavigation.css';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'digital-twin', label: 'Digital twin', icon: Box },
  { id: 'telemetry', label: 'Telemetry', icon: Layers },
  { id: 'infrastructure', label: 'Infrastructure', icon: Cpu },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'logistics', label: 'Logistics', icon: Package },
  { id: 'environment', label: 'Environment', icon: CloudSnow },
  { id: 'communication', label: 'Communication', icon: Radio },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'simulations', label: 'Scenarios', icon: SlidersHorizontal },
  { id: 'remote-operations', label: 'Remote operations', icon: Settings2 },
];

export default function Header({ activeTab, setActiveTab, selectedStation, onSelectStation, unreadCount = 0, onOpenAlerts, onOpenAuth }) {
  const { profile, isIndiaOperator } = useAuth();
  const { isSimulatorOnline, lastSyncedAt, dataSource } = useTelemetry();
  const { openPredictionCenter, isPredictionModalOpen } = usePredictive();
  const stationName = selectedStation === 'all-stations' ? 'India Control Centre' : selectedStation === 'station-bharati' ? 'Bharati Station' : 'Maitri Station';
  const updatedLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Awaiting update';
  const sourceLabel = dataSource === 'simulated-telemetry' ? 'Simulation feed' : dataSource === 'last-received' ? 'Cached telemetry' : 'Demonstration data';

  return (
    <header className="pl-header">
      <a className="pl-header-skip" href="#main-workspace">Skip to workspace</a>
      <div className="pl-header-top">
        <button type="button" className="pl-header-brand" onClick={() => { setActiveTab('overview'); if (isIndiaOperator) onSelectStation?.('all-stations'); }} aria-label="POLARIS overview">
          <span className="pl-header-brand-icon"><Compass size={25} aria-hidden="true" /></span>
          <span><strong>POLARIS</strong><small>Polar operations</small></span>
          <span className="pl-header-environment">DEMO</span>
        </button>

        <div className="pl-header-station">
          <label htmlFor="polaris-active-station">WORKSPACE</label>
          {isIndiaOperator ? <select id="polaris-active-station" aria-label="Active workspace" value={selectedStation} onChange={(event) => onSelectStation?.(event.target.value)}>
            <option value="all-stations">India · All stations</option>
            <option value="station-maitri">Maitri Station</option>
            <option value="station-bharati">Bharati Station</option>
          </select> : <span id="polaris-active-station" className="pl-header-assigned">{stationName}</span>}
        </div>

        <div className="pl-header-status" role="status"><span className={`pl-header-status-dot${isSimulatorOnline ? ' is-connected' : ''}`} /><span>{isSimulatorOnline ? 'Telemetry connected' : 'Offline-safe mode'}<small>{sourceLabel} · {updatedLabel}</small></span></div>

        <div className="pl-header-actions">
          <button type="button" className={`pl-header-predictions${isPredictionModalOpen ? ' is-active' : ''}`} onClick={() => openPredictionCenter()} aria-haspopup="dialog" aria-label="Forecast review"><ChartNoAxesCombined size={17} aria-hidden="true" /><span>Forecasts</span></button>
          <button type="button" className={`pl-header-alerts${activeTab === 'alerts' ? ' is-active' : ''}`} onClick={onOpenAlerts} aria-label={`Alerts${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} title="Alerts"><Bell size={19} aria-hidden="true" />{unreadCount > 0 && <span className="pl-header-alert-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>
          <button type="button" className={`pl-header-account${activeTab === 'account' ? ' is-active' : ''}`} onClick={onOpenAuth} aria-label={`Operator account: ${profile?.full_name || 'Operator'}`} title="Operator account"><User size={18} aria-hidden="true" /><span><strong>{profile?.full_name || 'Operator'}</strong><small>{isIndiaOperator ? 'Cross-station access' : 'Station access'}</small></span></button>
        </div>
      </div>

      <nav className="pl-header-nav" aria-label="Main navigation">
        {tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`pl-header-nav-item${activeTab === id ? 'is-active' : ''}`}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>)}
      </nav>
    </header>
  );
}
