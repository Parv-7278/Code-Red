import React from 'react';
import { Sparkles, AlertTriangle, AlertOctagon, ArrowRight, Zap, Cpu, CloudSnow, Package, Radio, CheckCircle2, ChevronRight } from 'lucide-react';
import { usePredictive } from '../context/PredictiveContext';
import './AIPredictionIndicator.css';

const categoryIcons = {
  energy: Zap,
  infrastructure: Cpu,
  environment: CloudSnow,
  logistics: Package,
  communication: Radio,
  alerts: AlertTriangle,
  all: Sparkles,
};

export default function AIPredictionIndicator({
  category = 'all',
  title = null,
  compact = false,
  customText = null,
  showViewAll = true,
  className = '',
}) {
  const { predictiveData, openPredictionCenter, isSimulating } = usePredictive();

  if (!predictiveData) return null;

  const preds = category === 'all'
    ? predictiveData.predictions
    : (predictiveData.category_summary?.[category] || []);

  if (!preds || preds.length === 0) return null;

  // Find most critical item in this category
  const riskPriority = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1, OPTIMAL: 0 };
  const sorted = [...preds].sort((a, b) => (riskPriority[b.risk_level] || 0) - (riskPriority[a.risk_level] || 0));
  const primary = sorted[0];

  const IconComponent = categoryIcons[category] || Sparkles;
  const isHighRisk = primary.risk_level === 'CRITICAL' || primary.risk_level === 'HIGH';
  const isModerate = primary.risk_level === 'MODERATE';

  const riskClass = isHighRisk ? 'risk-high' : isModerate ? 'risk-moderate' : 'risk-optimal';

  if (compact) {
    return (
      <div
        className={`ai-compact-pill ${riskClass} ${className}`}
        onClick={() => openPredictionCenter(primary, category)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openPredictionCenter(primary, category); }}
        role="button"
        tabIndex={0}
        title={`Forecast: ${primary.title} (${primary.risk_level}) — open details`}
      >
        <span className="ai-pill-dot" />
        <Sparkles size={12} className="ai-pill-sparkle" />
        <span className="ai-pill-txt">
          {customText || `Forecast: ${primary.title.split(' ')[0]} ${primary.time_to_breach !== 'No Breach Expected' ? `in ${primary.time_to_breach}` : 'Nominal'} (${primary.confidence}%)`}
        </span>
        <ChevronRight size={12} className="ai-pill-arrow" />
      </div>
    );
  }

  return (
    <div
      className={`ai-section-indicator-card ${riskClass} ${className}`}
      onClick={() => openPredictionCenter(primary, category)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openPredictionCenter(primary, category); }}
      role="button"
      tabIndex={0}
    >
      <div className="ai-card-glow-edge" />
      <div className="ai-ind-header">
        <div className="ai-ind-title-left">
          <div className="ai-sparkle-badge">
            <Sparkles size={13} />
            <span>FORWARD FORECAST</span>
          </div>
          {isSimulating && <span className="ai-sim-tag">SIMULATION MODE</span>}
          <span className="ai-ind-category">{category.toUpperCase()} FORECAST</span>
        </div>
        <div className={`ai-risk-status-pill ${riskClass}`}>
          <span className="ai-pulse-dot" />
          <span>{primary.risk_level} RISK</span>
        </div>
      </div>

      <div className="ai-ind-body">
        <div className="ai-ind-main-row">
          <div className="ai-ind-item-title">
            <IconComponent size={15} className="ai-cat-icon" />
            <span>{title || primary.title}</span>
          </div>
          <div className="ai-ind-confidence mono-num">
            {primary.confidence}% Conf.
          </div>
        </div>

        <div className="ai-ind-details-row">
          <div className="ai-detail-col">
            <span className="ai-d-lbl">Time to Breach:</span>
            <span className={`ai-d-val mono-num ${isHighRisk ? 'text-rose font-bold' : isModerate ? 'text-amber' : 'text-emerald'}`}>
              {primary.time_to_breach}
            </span>
          </div>
          <div className="ai-detail-col">
            <span className="ai-d-lbl">Projected Value:</span>
            <span className="ai-d-val mono-num text-cyan font-bold">{primary.predicted_val}</span>
          </div>
          <div className="ai-detail-col">
            <span className="ai-d-lbl">Threshold:</span>
            <span className="ai-d-val mono-num text-muted">{primary.threshold}</span>
          </div>
        </div>

        <p className="ai-ind-explanation">{primary.explanation}</p>
      </div>

      {showViewAll && (
        <div className="ai-ind-footer">
          <span className="ai-ind-cta">
            Review forecast curve and evidence
          </span>
          <ArrowRight size={13} className="ai-cta-arrow" />
        </div>
      )}
    </div>
  );
}
