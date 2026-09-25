import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Flame, 
  Battery, 
  Zap, 
  Radio, 
  ArrowRight, 
  Activity, 
  ShieldAlert, 
  Layers, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { usePredictive } from '../context/PredictiveContext';
import './AIPredictionCenter.css';

export default function AIPredictionCenter({ onOpenFullModal }) {
  const { predictiveData, loading, openPredictionCenter, isSimulating } = usePredictive();
  const [hoveredCard, setHoveredCard] = useState(null);

  if (loading && !predictiveData) {
    return (
      <div className="ai-pred-center-container polaris-card loading-state">
        <div className="ai-center-header">
          <div className="ai-center-title-row">
            <Sparkles className="ai-sparkle-spin text-cyan" size={18} />
            <h3 className="section-title">AI PREDICTIVE INTELLIGENCE</h3>
          </div>
          <span className="live-status-pill text-cyan">ANALYZING SCADA TELEMETRY...</span>
        </div>
      </div>
    );
  }

  if (!predictiveData) return null;

  const {
    station_name,
    station_id,
    station_risk_score,
    station_risk_level,
    next_predicted_issue,
    predictions = [],
    category_summary = {}
  } = predictiveData;

  // Selected core 4 predictions matching prompt specifications:
  // 1. Generator Overheating
  // 2. Battery Depletion
  // 3. Power Demand
  // 4. Communication
  const genPred = category_summary?.energy?.find(p => p.prediction_type === 'GENERATOR_OVERHEATING') || predictions[0];
  const battPred = category_summary?.energy?.find(p => p.prediction_type === 'BATTERY_DEPLETION') || predictions[1];
  const pwrPred = category_summary?.energy?.find(p => p.prediction_type === 'POWER_DEMAND') || predictions[2];
  const commPred = category_summary?.communication?.[0] || predictions[3];

  const featuredCards = [
    {
      pred: genPred,
      icon: Flame,
      iconColor: '#b73b37',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      label: 'GENERATOR OVERHEATING RISK',
      primaryStat: `Predicted breach: ${genPred?.time_to_breach || '18 min'}`,
      confidence: genPred?.confidence || 91,
      risk: genPred?.risk_level || 'HIGH',
      subtext: `Target: ${genPred?.predicted_val || '96.2°C'} (Limit: 95°C)`
    },
    {
      pred: battPred,
      icon: Battery,
      iconColor: '#946013',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      label: 'BATTERY DEPLETION',
      primaryStat: `Est. critical level: ${battPred?.time_to_breach || '4h 32m'}`,
      confidence: battPred?.confidence || 87,
      risk: battPred?.risk_level || 'HIGH',
      subtext: `Target: ${battPred?.predicted_val || '38.0%'} in 6h`
    },
    {
      pred: pwrPred,
      icon: Zap,
      iconColor: '#146b80',
      iconBg: 'rgba(56, 189, 248, 0.15)',
      label: 'POWER DEMAND',
      primaryStat: 'Expected increase: +12%',
      confidence: pwrPred?.confidence || 94,
      risk: pwrPred?.risk_level || 'MODERATE',
      subtext: `Forecast window: ${pwrPred?.forecast_window || '60 min'}`
    },
    {
      pred: commPred,
      icon: Radio,
      iconColor: '#705296',
      iconBg: 'rgba(168, 85, 247, 0.15)',
      label: 'COMMUNICATION',
      primaryStat: `Latency degradation: ${commPred?.risk_level || 'LOW'}`,
      confidence: commPred?.confidence || 84,
      risk: commPred?.risk_level || 'LOW',
      subtext: `Transit Latency: ${commPred?.predicted_val?.split(' ')[3] || '240 ms'}`
    },
  ];

  const handleCardClick = (item) => {
    if (item?.pred) {
      openPredictionCenter(item.pred, item.pred.category);
    } else {
      openPredictionCenter(null, 'all');
    }
  };

  const handleViewAll = () => {
    if (onOpenFullModal) {
      onOpenFullModal();
    } else {
      openPredictionCenter(null, 'all');
    }
  };

  return (
    <div className="ai-pred-center-container polaris-card">
      {/* Top Header Bar */}
      <div className="ai-center-header">
        <div className="ai-center-title-row">
          <div className="ai-pulse-icon-box">
            <Sparkles className="ai-sparkle-glow" size={16} />
          </div>
          <div>
            <h3 className="section-title ai-gradient-title">AI PREDICTIVE INTELLIGENCE</h3>
            <span className="ai-station-tag">
              STATION: <strong className="text-cyan">{station_name?.toUpperCase() || 'MAITRI'}</strong>
            </span>
          </div>
        </div>

        <div className="ai-header-right-badges">
          {isSimulating && (
            <span className="sim-mode-badge">
              ⚡ SIMULATION INJECTED
            </span>
          )}
          <div className="ai-live-indicator">
            <span className="ai-live-pulse-dot" />
            <span className="mono-num">LIVE ML ENGINE</span>
          </div>
        </div>
      </div>

      {/* Immediate Next Risk Early-Warning Strip */}
      {next_predicted_issue && (
        <div 
          className={`ai-urgent-risk-strip risk-${next_predicted_issue.risk_level.toLowerCase()}`}
          onClick={() => openPredictionCenter(null, next_predicted_issue.category)}
        >
          <div className="risk-strip-left">
            <AlertTriangle size={15} className="risk-triangle-icon" />
            <span className="risk-strip-label">NEXT PREDICTED THRESHOLD:</span>
            <span className="risk-strip-title">{next_predicted_issue.title}</span>
          </div>
          <div className="risk-strip-right">
            <span className="risk-countdown-badge mono-num">
              Breach in {next_predicted_issue.time_to_breach}
            </span>
            <span className="risk-conf-tag mono-num">{next_predicted_issue.confidence}% Conf.</span>
            <ChevronRight size={14} className="risk-strip-arrow" />
          </div>
        </div>
      )}

      {/* 4-Item Featured Cards Grid */}
      <div className="ai-featured-cards-grid">
        {featuredCards.map((item, idx) => {
          const Icon = item.icon;
          const isRiskHigh = item.risk === 'CRITICAL' || item.risk === 'HIGH';
          const isRiskMod = item.risk === 'MODERATE';
          const riskClass = isRiskHigh ? 'card-risk-high' : isRiskMod ? 'card-risk-mod' : 'card-risk-ok';

          return (
            <div
              key={idx}
              className={`ai-pred-mini-card ${riskClass} ${hoveredCard === idx ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredCard(idx)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick(item)}
            >
              <div className="ai-mini-card-head">
                <div 
                  className="ai-mini-icon-wrap"
                  style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                >
                  <Icon size={16} />
                </div>
                <span className="ai-mini-card-lbl">{item.label}</span>
                <span className={`ai-mini-risk-tag ${riskClass}`}>
                  {item.risk}
                </span>
              </div>

              <div className="ai-mini-primary-stat mono-num">
                {item.primaryStat}
              </div>

              <div className="ai-mini-footer-row">
                <span className="ai-mini-subtext">{item.subtext}</span>
                <span className="ai-mini-conf mono-num">
                  Conf: <strong>{item.confidence}%</strong>
                </span>
              </div>

              {/* Sparkline Visual Cue */}
              <div className="ai-mini-spark-bar">
                <div 
                  className={`ai-mini-spark-fill ${riskClass}`} 
                  style={{ width: `${item.confidence}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer: [ VIEW ALL PREDICTIONS ] */}
      <div className="ai-center-footer">
        <div className="ai-engine-meta-note">
          <Activity size={13} className="text-cyan" />
          <span>Multi-horizon neural regression & physics-informed envelope • 24h risk horizon</span>
        </div>
        
        <button 
          className="btn-view-all-predictions"
          onClick={handleViewAll}
        >
          <Sparkles size={14} />
          <span>VIEW ALL PREDICTIONS</span>
          <ArrowRight size={14} className="btn-cta-arrow" />
        </button>
      </div>
    </div>
  );
}
