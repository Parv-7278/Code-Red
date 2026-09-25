import React from 'react';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';

export default function MetricCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  status = 'nominal', 
  subtext, 
  statusColor,
  details = [],
  chart,
  interpretation,
  recommendation,
  stationName
}) {
  const getStatusClass = () => {
    switch (status) {
      case 'critical':
        return 'border-critical glow-critical text-critical';
      case 'warning':
        return 'border-warning text-warning';
      case 'nominal':
      default:
        return 'border-nominal text-cyan';
    }
  };

  const defaultDetails = details.length > 0 ? details : [
    { label: 'Current State', value: status.toUpperCase(), color: status === 'critical' ? '#b73b37' : status === 'warning' ? '#946013' : '#187451' },
    { label: 'Telemetry Sensor', value: 'SCADA Bus Node-01', color: '#146b80' },
    { label: 'Update Interval', value: '100ms Live', color: '#536579' },
  ];

  return (
    <ExpandableTelemetryCard
      title={title}
      category="TELEMETRY TELEMETRY"
      value={value}
      unit={unit}
      status={status}
      icon={Icon}
      subtext={subtext}
      color={status === 'critical' ? '#b73b37' : status === 'warning' ? '#946013' : '#146b80'}
      details={defaultDetails}
      chart={chart}
      interpretation={interpretation || `Continuous polar sensor reading for ${title}. Operating within expected Antarctic operational envelope.`}
      recommendation={recommendation}
      stationName={stationName}
      className={`metric-card glass-panel ${getStatusClass()}`}
    >
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && <Icon size={20} className="metric-icon" />}
      </div>
      <div className="metric-body">
        <span className="metric-value mono-text">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtext && <div className="metric-subtext">{subtext}</div>}
    </ExpandableTelemetryCard>
  );
}
