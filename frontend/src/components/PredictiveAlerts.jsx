import React from 'react';
import { AlertOctagon, AlertTriangle, Radio, Activity, Eye, ArrowRight } from 'lucide-react';

export default function PredictiveAlerts({ insights: insightsProp, onOpenInsight }) {
  const defaultInsights = [
    {
      id: 'insight-1',
      severity: 'high',
      title: 'Generator G-02 (Maitri) – Bearing Vibration Risk',
      description: 'Vibration and temperature trend elevated. Estimated failure window: 24 - 48 hrs.',
      actionLabel: 'View Details',
      detailData: {
        title: 'Generator G-02 Diagnostic Report (Maitri)',
        subsystem: 'STATION PRIMARY POWER & GENERATION',
        riskLevel: 'HIGH (84% Probability)',
        window: '24 - 48 Hours',
        vibration: '4.8 mm/s RMS (Threshold: 2.5 mm/s)',
        temp: '78.4°C (Operating Max: 75°C)',
        powerDraw: '64 kW baseline load',
        recommendation: 'Transfer 25 kW load to Generator G-01. Schedule oil sample extraction and bearing inspection before next katabatic wind storm.'
      }
    },
    {
      id: 'insight-2',
      severity: 'medium',
      title: 'Lake Priyadarshini Intake Trace Heating',
      description: 'Water intake temperature dipping near freezing point (+0.4°C). Trace heater load adjustment advised.',
      actionLabel: 'View Details',
      detailData: {
        title: 'Lake Intake Thermal Integrity Diagnostic',
        subsystem: 'WATER SUPPLY & LIFE SUPPORT INFRASTRUCTURE',
        riskLevel: 'MEDIUM (Freeze Risk)',
        window: '6 - 12 Hours',
        temp: '+0.4°C (Safe Margin: > +2.0°C)',
        powerDraw: '12 kW trace heating circuit',
        iceThickness: '1.8 m lake surface ice',
        recommendation: 'Increase intake pipeline heat tracing from 35% to 65% power before midnight ambient temperature trough.'
      }
    },
    {
      id: 'insight-3',
      severity: 'info',
      title: 'Katabatic Wind Energy Surge Window',
      description: 'Forecasted 35 km/h gusts tonight will increase wind turbine yield by +28%.',
      actionLabel: 'View Details',
      detailData: {
        title: 'Renewable Power Capture Opportunity',
        subsystem: 'HYBRID MICROGRID RENEWABLES',
        riskLevel: 'POSITIVE HARVEST (+28%)',
        window: 'Tonight (22:00 - 06:00)',
        windGusts: 'Gusts up to 48 km/h NW',
        powerDraw: '+28 kW projected surplus generation',
        recommendation: 'Pre-condition battery storage banks to absorb excess wind turbine generation and idle auxiliary diesel.'
      }
    },
  ];

  const rawInsights = insightsProp && insightsProp.length > 0 ? insightsProp : defaultInsights;

  const insights = rawInsights.map(item => {
    let Icon = AlertTriangle;
    let iconColor = '#946013';
    let iconBg = 'rgba(245, 158, 11, 0.15)';

    if (item.severity === 'high') {
      Icon = AlertOctagon;
      iconColor = '#b73b37';
      iconBg = 'rgba(239, 68, 68, 0.15)';
    } else if (item.severity === 'info') {
      Icon = Radio;
      iconColor = '#146b80';
      iconBg = 'rgba(56, 189, 248, 0.15)';
    }

    return {
      ...item,
      icon: Icon,
      iconColor,
      iconBg,
      actionLabel: item.actionLabel || 'View Details',
    };
  });

  const handleOpenDetail = (item) => {
    const detailPayload = {
      title: item.detailData?.title || item.title || 'Predictive Subsystem Diagnostic',
      subsystem: item.detailData?.subsystem || item.subsystem || 'STATION SCADA TELEMETRY',
      riskLevel: item.detailData?.riskLevel || (item.severity === 'high' ? 'HIGH RISK (84% Probability)' : item.severity === 'medium' ? 'MEDIUM (Caution)' : 'POSITIVE HARVEST'),
      window: item.detailData?.window || 'Next 24 - 48 Hours',
      vibration: item.detailData?.vibration || (item.title?.toLowerCase()?.includes('vibration') ? '4.8 mm/s RMS (Threshold: 2.5 mm/s)' : null),
      temp: item.detailData?.temp || (item.title?.toLowerCase()?.includes('generator') ? '78.4°C (Operating Max: 75°C)' : item.title?.toLowerCase()?.includes('lake') ? '+0.4°C (Safe Margin: > +2.0°C)' : null),
      windGusts: item.detailData?.windGusts || item.detailData?.windSpeed || (item.title?.toLowerCase()?.includes('wind') ? 'Gusts up to 48 km/h NW' : null),
      powerDraw: item.detailData?.powerDraw || (item.detailData?.powerDraw || item.title?.toLowerCase()?.includes('de-icing') ? '48 kW dedicated heating load' : null),
      iceThickness: item.detailData?.iceThickness || (item.title?.toLowerCase()?.includes('radome') ? '3.4 mm riming accumulation' : null),
      cargoManifest: item.detailData?.cargoManifest || null,
      recommendation: item.detailData?.recommendation || item.description || 'Initiate predictive preventive maintenance protocol and notify station engineer.',
      description: item.description,
      severity: item.severity,
      ...item.detailData
    };

    if (onOpenInsight) {
      onOpenInsight(detailPayload);
    }
  };

  return (
    <div className="predictive-alerts-card polaris-card">
      <div className="card-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} className="text-amber" />
          <span className="card-title">PREDICTIVE ALERTS &amp; INSIGHTS</span>
        </div>
        <span style={{ fontSize: '0.62rem', color: '#536579' }}>
          {insights.length} Active Signals
        </span>
      </div>

      <div className="predictive-list-wrap">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.id} 
              className={`predictive-item-row ${item.severity}`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleOpenDetail(item)}
            >
              {/* Icon */}
              <div 
                className="predictive-icon-box"
                style={{ backgroundColor: item.iconBg, color: item.iconColor }}
              >
                <Icon size={16} />
              </div>

              {/* Text Description */}
              <div className="predictive-text-wrap">
                <div className="predictive-title-row">{item.title}</div>
                <div className="predictive-desc-row">{item.description}</div>
              </div>

              {/* Action Button */}
              <button 
                type="button"
                className="predictive-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetail(item);
                }}
                title="View full telemetry diagnostics and SCADA mitigation directives"
              >
                <span>{item.actionLabel}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
