import React from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  KeyRound,
  LockKeyhole,
  LogOut,
  Radio,
  ServerCog,
  ShieldCheck,
  UserCog,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const contextDetails = {
  'all-stations': {
    label: 'India Control Centre',
    code: 'INDIA HQ',
    location: 'NCPOR National Polar Mission Command',
    description: 'Unified supervisory access to Maitri and Bharati station operations.',
  },
  'station-maitri': {
    label: 'Maitri Station',
    code: 'MAITRI',
    location: 'Schirmacher Oasis · 70°45′S, 11°44′E',
    description: 'Local operational authority for Maitri infrastructure and mission systems.',
  },
  'station-bharati': {
    label: 'Bharati Station',
    code: 'BHARATI',
    location: 'Larsemann Hills · 69°24′S, 76°11′E',
    description: 'Local operational authority for Bharati coastal and station systems.',
  },
};

const stationPermissions = {
  'all-stations': [
    ['Cross-station telemetry', 'Read / Analyse', Activity],
    ['Remote command approval', 'Level 5 authority', ServerCog],
    ['Emergency escalation', 'National command', Radio],
    ['Operator administration', 'Manage access', Users],
  ],
  'station-maitri': [
    ['Maitri telemetry', 'Read / Analyse', Activity],
    ['Diesel microgrid control', 'Operate', Zap],
    ['Life-support systems', 'Operate', ServerCog],
    ['Incident response', 'Acknowledge / Escalate', Radio],
  ],
  'station-bharati': [
    ['Bharati telemetry', 'Read / Analyse', Activity],
    ['CHP microgrid control', 'Operate', Zap],
    ['RO and coastal systems', 'Operate', ServerCog],
    ['ISRO link operations', 'Acknowledge / Escalate', Radio],
  ],
};

export default function OperatorAccessView({ selectedStation, onSelectStation, onOpenSwitcher }) {
  const { profile, isIndiaOperator, logout } = useAuth();
  const contextKey = selectedStation || profile?.station_id || 'station-maitri';
  const details = contextDetails[contextKey] || contextDetails['station-maitri'];
  const permissions = stationPermissions[contextKey] || stationPermissions['station-maitri'];
  const initials = profile?.avatar || profile?.full_name?.split(' ').map((part) => part[0]).slice(-2).join('') || 'OP';

  return (
    <div className="tab-page-container operator-access-view">
      <div className="tab-page-header operator-access-header">
        <div>
          <h2 className="tab-page-title">Operator Identity & Access Workspace</h2>
          <span className="tab-page-subtitle">
            Authenticated session, station authority and operational permissions for {details.label}
          </span>
        </div>
        <div className="header-status-badge access-session-badge">
          <ShieldCheck size={14} />
          <span>SECURE SESSION · VERIFIED</span>
        </div>
      </div>

      <div className="operator-access-grid">
        <section className="polaris-card operator-identity-card">
          <div className="operator-profile-hero">
            <div className="operator-large-avatar">{initials}</div>
            <div>
              <span className="operator-eyebrow">AUTHENTICATED MISSION OPERATOR</span>
              <h3>{profile?.full_name || 'POLARIS Operator'}</h3>
              <p>{profile?.title || 'Station Operations Controller'}</p>
            </div>
          </div>

          <div className="operator-detail-list">
            <div><span>Clearance</span><strong>{profile?.clearance || 'Verified operator'}</strong></div>
            <div><span>Department</span><strong>{profile?.department || 'NCPOR Mission Operations'}</strong></div>
            <div><span>Identity</span><strong>{profile?.email || 'Authenticated session'}</strong></div>
            <div><span>Role</span><strong>{(profile?.role || 'operator').replaceAll('_', ' ').toUpperCase()}</strong></div>
          </div>

          <div className="operator-actions-row">
            <button type="button" className="operator-primary-action" onClick={onOpenSwitcher}>
              <UserCog size={15} /> Switch Operator
            </button>
            <button type="button" className="operator-danger-action" onClick={logout}>
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </section>

        <section className="polaris-card operator-context-card">
          <div className="operator-section-title">
            <Building2 size={17} className="text-cyan" />
            <div><span>ACTIVE OPERATIONAL CONTEXT</span><h3>{details.label}</h3></div>
          </div>
          <div className="operator-context-code">{details.code}</div>
          <p className="operator-context-location">{details.location}</p>
          <p className="operator-context-description">{details.description}</p>

          {isIndiaOperator && (
            <div className="operator-context-switcher">
              {Object.entries(contextDetails).map(([id, item]) => (
                <button
                  type="button"
                  key={id}
                  className={contextKey === id ? 'active' : ''}
                  onClick={() => onSelectStation?.(id)}
                >
                  {item.code}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="polaris-card operator-permissions-card">
          <div className="operator-section-title">
            <KeyRound size={17} className="text-purple" />
            <div><span>AUTHORIZATION MATRIX</span><h3>Granted Capabilities</h3></div>
          </div>
          <div className="operator-permission-grid">
            {permissions.map(([name, level, Icon]) => (
              <div className="operator-permission-item" key={name}>
                <div className="operator-permission-icon"><Icon size={16} /></div>
                <div><strong>{name}</strong><span>{level}</span></div>
                <CheckCircle2 size={15} className="text-emerald" />
              </div>
            ))}
          </div>
        </section>

        <section className="polaris-card operator-security-card">
          <div className="operator-section-title">
            <LockKeyhole size={17} className="text-emerald" />
            <div><span>SESSION SECURITY</span><h3>Access Verification</h3></div>
          </div>
          <div className="operator-security-status">
            <div><ShieldCheck size={16} /><span>Identity token</span><strong>VALID</strong></div>
            <div><Radio size={16} /><span>Station uplink</span><strong>ENCRYPTED</strong></div>
            <div><Clock3 size={16} /><span>Session status</span><strong>ACTIVE</strong></div>
          </div>
          <div className="operator-audit-note">
            All command, acknowledgement and simulation activity is attributed to the authenticated operator and active station context.
          </div>
        </section>
      </div>
    </div>
  );
}
