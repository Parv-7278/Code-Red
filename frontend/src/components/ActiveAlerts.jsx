import React from 'react';
import { AlertTriangle, Flame, Wind, BellRing } from 'lucide-react';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';

export default function ActiveAlerts({ alerts: alertsProp, unreadCount, onOpenViewAll, selectedStation = 'Maitri Station' }) {
  const defaultAlerts = [
    {
      id: 'alert-1',
      severity: 'critical',
      title: 'High Vibration Detected',
      source: 'Generator G-02 (Maitri)',
      time: '12:40 PM',
      type: 'critical',
      details: 'Shaft harmonic vibration frequency reached 4.8 mm/s exceeding nominal threshold of 2.5 mm/s. Bearing casing inspection advised.',
    },
    {
      id: 'alert-2',
      severity: 'warning',
      title: 'Fuel Reserve Critical Trend',
      source: 'Maitri Fuel Farm',
      time: '12:35 PM',
      type: 'warning',
      details: 'Daily consumption rate increased by 14% over baseline due to auxiliary laboratory heating load.',
    },
    {
      id: 'alert-3',
      severity: 'warning',
      title: 'Katabatic High Wind Warning',
      source: 'Schirmacher Oasis',
      time: '12:30 PM',
      type: 'warning',
      details: 'Wind speeds gusting at 58.4 km/h with sudden pressure drops. Outdoor scientific traverses suspended.',
    },
  ];

  const rawAlerts = alertsProp || defaultAlerts;

  const alertsList = rawAlerts.map(item => {
    let Icon = AlertTriangle;
    let iconBg = 'rgba(245, 158, 11, 0.18)';
    let iconColor = '#946013';

    if (item.severity === 'critical') {
      Icon = Flame;
      iconBg = 'rgba(239, 68, 68, 0.18)';
      iconColor = '#b73b37';
    } else if (item.severity === 'info') {
      Icon = BellRing;
      iconBg = 'rgba(56, 189, 248, 0.18)';
      iconColor = '#146b80';
    } else if (item.title?.toLowerCase().includes('wind')) {
      Icon = Wind;
      iconBg = 'rgba(234, 179, 8, 0.18)';
      iconColor = '#946013';
    }

    return {
      ...item,
      icon: Icon,
      iconBg,
      iconColor
    };
  });

  return (
    <div className="active-alerts-section polaris-card">
      <div className="card-header-with-action">
        <span className="card-title">ACTIVE ALERTS</span>
        <button 
          className="card-action-link"
          onClick={onOpenViewAll}
        >
          View All
        </button>
      </div>

      <div className="alerts-card-list">
        {alertsList.map((item) => {
          const Icon = item.icon;
          return (
            <ExpandableTelemetryCard
              key={item.id}
              title={item.title}
              subtitle={`${item.source} • Logged at ${item.time}`}
              category="Mission Alert Telemetry"
              status={item.severity.toUpperCase()}
              metrics={{
                'Alert Source': item.source,
                'Severity Level': item.severity.toUpperCase(),
                'Timestamp': item.time,
                'Diagnostic Details': item.details || 'Automated sensor threshold trip detected.',
                'Recommended Action': item.severity === 'critical' ? 'Immediate engineering intervention required' : 'Monitor trend closely',
                'Station ID': selectedStation
              }}
            >
              <div 
                className={`alert-list-item ${item.severity}`}
              >
                <div 
                  className="alert-icon-wrap"
                  style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                >
                  <Icon size={15} />
                </div>
                
                <div className="alert-content-wrap">
                  <div className="alert-title-row">
                    <span className="alert-item-title">{item.title}</span>
                    <span className="alert-item-time mono-num">{item.time}</span>
                  </div>
                  <div className="alert-item-source">{item.source}</div>
                </div>
              </div>
            </ExpandableTelemetryCard>
          );
        })}
      </div>

      <div className="alerts-card-footer">
        <span className="total-unread-label">Total Unread Alerts</span>
        <span className="unread-badge-count">{unreadCount !== undefined ? unreadCount : alertsList.length}</span>
      </div>
    </div>
  );
}
