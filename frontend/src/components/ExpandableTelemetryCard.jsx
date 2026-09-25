import React, { useState, useEffect } from 'react';
import { 
  X, 
  Maximize2, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Download, 
  RefreshCw,
  TrendingUp,
  Cpu,
  BarChart3
} from 'lucide-react';
import './ExpandableTelemetryCard.css';

export default function ExpandableTelemetryCard({
  title = 'Telemetry Metric',
  category = 'TELEMETRY SUBSYSTEM',
  value,
  unit = '',
  status = 'nominal',
  icon: Icon = Activity,
  color = '#146b80',
  percent,
  subtext,
  details = [],
  chart,
  sparkline,
  interpretation,
  recommendation,
  logs = [],
  stationName = 'Polaris Station',
  expandedContent,
  children,
  className = '',
  style = {},
  onClick,
  showHoverHint = true,
  disabled = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  const handleCardClick = (e) => {
    if (disabled) return;
    // Don't expand if clicking on interactive buttons or links inside
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
      return;
    }
    setIsExpanded(true);
    if (onClick) onClick(e);
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setIsExpanded(false);
  };

  const normalizedStatus = (status || 'nominal').toLowerCase();

  return (
    <>
      {/* Normal In-Place Card (Click to expand) */}
      <div 
        className={`expandable-card-wrapper ${className}`}
        style={style}
        onClick={handleCardClick}
      >
        {children}

        {/* Subtle expand hint icon on hover */}
        {showHoverHint && !disabled && (
          <div className="expand-hover-hint" title="Click to Expand Telemetry">
            <Maximize2 size={11} />
          </div>
        )}
      </div>

      {/* Expanded Modal Dialog Overlay */}
      {isExpanded && (
        <div 
          className="expandable-overlay-backdrop" 
          onClick={handleClose}
        >
          <div 
            className="expanded-card-dialog" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title & X Close Button */}
            <div className="expanded-dialog-header">
              <div className="exp-header-left">
                <div className="exp-icon-box" style={{ color: color }}>
                  {Icon && <Icon size={20} />}
                </div>
                <div className="exp-title-meta">
                  <span className="exp-category-tag">
                    <Sparkles size={11} className="text-cyan" />
                    {stationName ? `${stationName} • ` : ''}{category}
                  </span>
                  <h3 className="exp-dialog-title">{title}</h3>
                </div>
              </div>

              <div className="exp-header-right">
                <div className={`exp-status-badge ${normalizedStatus}`}>
                  {normalizedStatus === 'critical' ? (
                    <>
                      <span className="danger-dot" /> CRITICAL
                    </>
                  ) : normalizedStatus === 'warning' ? (
                    <>
                      <span className="warn-dot" /> WARNING
                    </>
                  ) : (
                    <>
                      <span className="live-dot" /> ONLINE / NOMINAL
                    </>
                  )}
                </div>

                {/* Prominent X Close Button */}
                <button 
                  type="button" 
                  className="exp-close-btn" 
                  onClick={handleClose}
                  title="Close Expanded View (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="expanded-dialog-body">
              {/* Custom Expanded Content if provided */}
              {expandedContent ? (
                typeof expandedContent === 'function' 
                  ? expandedContent({ isExpanded, onClose: handleClose }) 
                  : expandedContent
              ) : (
                <>
                  {/* Hero Metric Value Display */}
                  {value !== undefined && value !== null && (
                    <div className="exp-hero-metric-box">
                      <div>
                        <div className="exp-hero-val-group">
                          <span className="exp-hero-val mono-num">{value}</span>
                          {unit && <span className="exp-hero-unit">{unit}</span>}
                        </div>
                        {subtext && <div className="exp-hero-subtext">{subtext}</div>}
                      </div>

                      <div className="exp-live-pill">
                        <span className="live-dot" /> LIVE SCADA STREAM
                      </div>
                    </div>
                  )}

                  {/* Progress Range Bar if percent provided */}
                  {percent !== undefined && (
                    <div className="exp-range-box">
                      <div className="exp-range-track">
                        <div 
                          className="exp-range-fill" 
                          style={{ 
                            width: `${Math.min(Math.max(percent, 0), 100)}%`,
                            backgroundColor: color || '#187451'
                          }} 
                        />
                      </div>
                      <div className="exp-range-labels">
                        <span>0% Baseline</span>
                        <span className="mono-num" style={{ color: color, fontWeight: 700 }}>{percent}% Utilization</span>
                        <span>100% Max Capacity</span>
                      </div>
                    </div>
                  )}

                  {/* High-Resolution Expanded Chart or Sparkline */}
                  {(chart || sparkline) && (
                    <div className="exp-chart-container">
                      <div className="exp-chart-header">
                        <span className="exp-chart-title">
                          <BarChart3 size={13} /> High-Resolution Telemetry Waveform
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          Sampling Rate: 100ms
                        </span>
                      </div>
                      <div style={{ width: '100%', minHeight: '120px' }}>
                        {chart || sparkline}
                      </div>
                    </div>
                  )}

                  {/* Detailed Sub-Metrics Grid */}
                  {details && details.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#536579', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                        Subsystem Parameters & Sensor Array
                      </div>
                      <div className="exp-details-grid">
                        {details.map((item, idx) => (
                          <div key={idx} className="exp-detail-card">
                            <span className="exp-detail-lbl">{item.label}</span>
                            <span className="exp-detail-val mono-num" style={{ color: item.color || '#f8fafc' }}>
                              {item.value}
                            </span>
                            {item.sub && <span className="exp-detail-sub">{item.sub}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interpretation / Operational Advisory */}
                  {(interpretation || recommendation) && (
                    <div className="exp-callout-box">
                      <span className="exp-callout-title">
                        <ShieldCheck size={13} /> Operational Diagnostic & Guidance
                      </span>
                      {interpretation && (
                        <p className="exp-callout-text">{interpretation}</p>
                      )}
                      {recommendation && (
                        <p className="exp-callout-text" style={{ color: '#146b80', fontWeight: 600 }}>
                          💡 Recommendation: {recommendation}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Event Log / History */}
                  {logs && logs.length > 0 && (
                    <div style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.12)', borderRadius: '8px', padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#146b80', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                        <Clock size={12} /> Recent SCADA Event History
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {logs.map((log, i) => (
                          <div key={i} style={{ fontSize: '0.7rem', color: '#536579', fontFamily: 'var(--font-mono, monospace)' }}>
                            • {typeof log === 'string' ? log : `${log.time || ''} - ${log.message || log.text}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer with Timestamp and Action Buttons */}
            <div className="expanded-dialog-footer">
              <span className="exp-footer-meta">
                POLARIS SCADA TELEMETRY BUS // SECURE GATEWAY
              </span>
              <div className="exp-footer-actions">
                <button 
                  type="button" 
                  className="exp-action-btn"
                  onClick={() => alert(`Diagnostics refresh requested for ${title}. All field channels responding nominal.`)}
                >
                  <RefreshCw size={12} /> Run Sensor Diagnostics
                </button>
                <button 
                  type="button" 
                  className="exp-action-btn btn-close-main"
                  onClick={handleClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
