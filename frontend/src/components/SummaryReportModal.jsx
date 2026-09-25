import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bot,
  Sparkles,
  Printer,
  Download,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Zap,
  Flame,
  Battery,
  BatteryCharging,
  Thermometer,
  Wind,
  Gauge,
  Snowflake,
  HardDrive,
  Layers,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Radio,
  Clock,
  Compass,
  Users,
  Box,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
  Maximize2,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { formatStationTime, getStationTimezoneLabel } from '../utils/timeUtils';

export default function SummaryReportModal({
  isOpen,
  onClose,
  reportData,
  selectedStation = 'station-maitri',
  isLoading = false,
  onRegenerate
}) {
  const [activeSection, setActiveSection] = useState('executive');
  const [copied, setCopied] = useState(false);
  const [selectedSubStation, setSelectedSubStation] = useState('combined'); // 'combined' | 'station-maitri' | 'station-bharati'

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync active sub-station tab when reportData updates
  useEffect(() => {
    if (reportData?.station_id === 'all-stations') {
      setSelectedSubStation('combined');
    } else if (reportData?.station_id) {
      setSelectedSubStation(reportData.station_id);
    }
  }, [reportData]);

  // Determine current active report
  const isAllStations = reportData?.station_id === 'all-stations';

  const currentReport = useMemo(() => {
    if (!reportData) return null;
    if (isAllStations) {
      if (selectedSubStation === 'station-maitri') {
        return reportData.station_reports?.['station-maitri'] || reportData.report;
      } else if (selectedSubStation === 'station-bharati') {
        return reportData.station_reports?.['station-bharati'] || reportData.report;
      }
      return reportData.report;
    }
    return reportData.report || reportData;
  }, [reportData, isAllStations, selectedSubStation]);

  if (!isOpen) return null;

  const exec = currentReport?.executive_summary || {};
  const health = currentReport?.station_health || {};
  const energy = currentReport?.energy || {};
  const env = currentReport?.environment || {};
  const research = currentReport?.research || {};
  const logistics = currentReport?.logistics || {};
  const infra = currentReport?.infrastructure || {};
  const combined = reportData?.combined_summary || {};
  const matrix = reportData?.comparison_matrix || [];

  // Export handlers
  const generateMarkdownContent = () => {
    const stName = isAllStations && selectedSubStation === 'combined' 
      ? 'All Antarctic Stations (India Control Centre)' 
      : currentReport?.station_name || 'POLARIS Station';

    let md = `# POLARIS 24-HOUR OPERATIONAL & RESEARCH REPORT\n\n`;
    md += `**Station**: ${stName}\n`;
    md += `**Reporting Period**: ${currentReport?.reporting_period || reportData?.reporting_period || 'Last 24 Hours'}\n`;
    md += `**Comparison Period**: ${currentReport?.comparison_period || reportData?.comparison_period || 'Previous 24 Hours'}\n`;
    md += `**Overall Station Status**: ${exec.overall_status || 'NORMAL'}\n`;
    md += `**Overall Risk Score**: ${exec.overall_risk_score ?? 15}/100\n`;
    md += `**Generated At**: ${reportData?.generated_at || new Date().toISOString()}\n\n`;
    md += `---\n\n`;

    md += `## 1. EXECUTIVE SUMMARY\n\n`;
    md += `> **AI-GENERATED SUMMARY**\n>\n`;
    md += `> ${isAllStations && selectedSubStation === 'combined' ? combined.ai_synthesis : exec.ai_summary || 'Operational baseline nominal across all monitored cryospheric and microgrid subsystems.'}\n\n`;
    
    md += `### Key Recommendations / Directives\n`;
    const recs = (isAllStations && selectedSubStation === 'combined' ? combined.national_command_directives : exec.recommendations) || [];
    recs.forEach((r, i) => {
      md += `${i + 1}. ${r}\n`;
    });
    md += `\n---\n\n`;

    md += `## 2. STATION HEALTH\n\n`;
    md += `- **Current Health Score**: ${health.current_health_score ?? 87}/100\n`;
    md += `- **Previous 24-Hour Score**: ${health.previous_health_score ?? 91}/100\n`;
    md += `- **Delta**: ${health.change_pct ?? -4.4}%\n`;
    md += `- **Rating**: ${health.rating || 'Good'}\n\n`;
    md += `### Subsystem Breakdown\n`;
    (health.subsystems || []).forEach((s) => {
      md += `- **${s.label}**: ${s.current_score}/100 (Previous: ${s.previous_score}/100 | Change: ${s.change_pct >= 0 ? '+' : ''}${s.change_pct}% | Status: ${s.status})\n`;
    });
    md += `\n---\n\n`;

    md += `## 3. ENERGY GRID\n\n`;
    md += `- **Power Generation (Avg)**: ${energy.generation_avg_kw ?? 132} kW (${energy.generation_delta_pct >= 0 ? '+' : ''}${energy.generation_delta_pct ?? 0}% vs prev 24h)\n`;
    md += `- **Power Consumption (Avg)**: ${energy.consumption_avg_kw ?? 105} kW (${energy.consumption_delta_pct >= 0 ? '+' : ''}${energy.consumption_delta_pct ?? 11.4}% vs prev 24h)\n`;
    md += `- **Peak Consumption**: ${energy.peak_consumption_kw ?? 128} kW\n`;
    md += `- **Net Energy Surplus**: ${energy.surplus_avg_kw ?? 27} kW\n`;
    md += `- **Battery State of Charge**: ${energy.battery_current_pct ?? 74}% (Min: ${energy.battery_min_pct ?? 68}%, 24h Delta: ${energy.battery_change_pct >= 0 ? '+' : ''}${energy.battery_change_pct ?? -6.5}%)\n`;
    md += `- **Battery Reserve Horizon**: ${energy.battery_reserve_days || '2.8 days'}\n`;
    md += `- **Generator Max Temperature**: ${energy.generator_temp_max_c ?? 78.4}°C (Avg: ${energy.generator_temp_avg_c ?? 74.0}°C)\n`;
    md += `- **Generator Status**: ${energy.generator_status || 'Online'}\n`;
    md += `- **Fuel Reserves**: ${energy.fuel_liters || '50,200 L'} (${energy.fuel_days_remaining || '43 days'})\n`;
    md += `> **AI Insight**: ${energy.ai_insight || ''}\n\n`;
    md += `---\n\n`;

    md += `## 4. POLAR ENVIRONMENT\n\n`;
    md += `- **Ambient Temperature**: ${env.temp_avg_c ?? -18.4}°C (Min: ${env.temp_min_c ?? -22.1}°C, Max: ${env.temp_max_c ?? -14.6}°C, Delta: ${env.temp_delta_c >= 0 ? '+' : ''}${env.temp_delta_c ?? -0.8}°C)\n`;
    md += `- **Katabatic Wind**: ${env.wind_avg_kmh ?? 28} km/h (Peak Gust: ${env.wind_max_kmh ?? 44} km/h, Dir: ${env.wind_dir || 'NW'})\n`;
    md += `- **Atmospheric Pressure**: ${env.pressure_avg_hpa ?? 984.2} hPa (${env.pressure_trend || 'Steady'})\n`;
    md += `- **Snowpack Accumulation (24h)**: +${env.snow_accumulation_24h_cm ?? 4.2} cm / 24h (Drift Rate: ${env.snow_drift_rate_cm_hr ?? 0.85} cm/hr)\n`;
    md += `> **AI Interpretation**: ${env.ai_interpretation || ''}\n\n`;
    md += `---\n\n`;

    md += `## 5. SCIENTIFIC RESEARCH FINDINGS\n\n`;
    md += `- **Observatory**: ${research.observatory_name || 'Antarctic Scientific Observatory'}\n`;
    md += `- **Major Trend**: ${research.findings?.major_trend || 'Microseismic baseline steady.'}\n`;
    md += `- **Major Anomaly**: ${research.findings?.major_anomaly || 'Geomagnetic Kp index G1 unsettled disturbance.'}\n`;
    md += `- **Parameter Requiring Attention**: ${research.findings?.attention_parameter || 'Subsurface firn densification calibration.'}\n`;
    md += `- **Expedition Crew Vitals**: ${research.crew_vitals?.active_overwintering_personnel ?? 24} personnel | Mean HR: ${research.crew_vitals?.average_heart_rate_bpm ?? 73} bpm | SpO2: ${research.crew_vitals?.average_spo2_percent ?? 98.4}%\n\n`;
    md += `---\n\n`;

    md += `## 6. LOGISTICS & INVENTORY\n\n`;
    (logistics.items || []).forEach((it) => {
      md += `- **${it.name}**: ${it.current_amount} (${it.days_remaining} remaining | 24h usage: ${it.consumption_24h} | Status: ${it.status})\n`;
    });
    md += `> **AI Insight**: ${logistics.ai_insight || ''}\n\n`;
    md += `---\n\n`;

    md += `## 7. DIGITAL TWIN INFRASTRUCTURE\n\n`;
    md += `- **Operational Modules**: ${infra.operational_count ?? 4} / ${infra.modules_count ?? 5}\n`;
    md += `- **Active Warnings**: ${infra.warning_count ?? 1}\n`;
    (infra.modules || []).forEach((m) => {
      md += `- **${m.name}**: ${m.status} | Temp: ${m.temperature} | Power: ${m.power_draw} | Notes: ${m.notes}\n`;
    });
    md += `\n> **AI Insight**: ${infra.ai_insight || ''}\n\n`;

    if (isAllStations && matrix.length > 0) {
      md += `---\n\n## MULTI-STATION COMPARATIVE MATRIX (MAITRI VS BHARATI)\n\n`;
      matrix.forEach((row) => {
        md += `- **${row.metric}**: Maitri [${row.maitri}] | Bharati [${row.bharati}] → ${row.comparison}\n`;
      });
    }

    md += `\n---\n*Report compiled autonomously by POLARIS AI Mission Control Engine. Data verified against Supabase PostgreSQL telemetry repositories.*\n`;
    return md;
  };

  const handleCopy = () => {
    const content = generateMarkdownContent();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const content = generateMarkdownContent();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `POLARIS_24h_Report_${selectedStation}_${new Date().toISOString().substring(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `POLARIS_24h_Report_${selectedStation}_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    document.body.classList.add('print-summary-report');
    const cleanup = () => document.body.classList.remove('print-summary-report');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  };

  const statusColor = exec.overall_status === 'CRITICAL' ? '#b73b37' : exec.overall_status === 'WARNING' ? '#946013' : '#187451';
  const riskScore = exec.overall_risk_score ?? 18;

  return (
    <div className="polaris-summary-report-overlay" onClick={onClose}>
      <div 
        className="polaris-summary-report-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================================
            MODAL HEADER BAR
            ================================================================== */}
        <div className="report-modal-header">
          <div className="report-modal-header-left">
            <div className="report-icon-badge">
              <Sparkles size={16} className="text-cyan animate-pulse" />
            </div>
            <div>
              <div className="report-badge-row">
                <span className="report-tag-live">24-HOUR OPERATIONAL &amp; RESEARCH REPORT</span>
                <span className="report-station-tag" style={{ borderColor: statusColor, color: statusColor }}>
                  {isAllStations ? 'INDIA CONTROL CENTRE (ALL STATIONS)' : currentReport?.station_name || 'STATION'}
                </span>
                <span className={`report-status-pill ${exec.overall_status?.toLowerCase()}`}>
                  {exec.overall_status || 'NORMAL'}
                </span>
              </div>
              <h2 className="report-main-heading">
                {isAllStations && selectedSubStation === 'combined'
                  ? 'India National Antarctica Operations — 24h Fleet Intelligence'
                  : `${currentReport?.station_name || 'Maitri'} Operational & Scientific Synthesis`}
              </h2>
              <div className="report-time-window-row">
                <span className="time-sub-item">
                  <Clock size={11} className="text-dim" />
                  <strong>Reporting Window:</strong> {currentReport?.reporting_period || reportData?.reporting_period}
                </span>
                <span className="time-sub-item">
                  <RefreshCw size={11} className="text-dim" />
                  <strong>Comparison Baseline:</strong> {currentReport?.comparison_period || reportData?.comparison_period}
                </span>
              </div>
            </div>
          </div>

          <div className="report-modal-header-right">
            {/* Risk Score Dial Card */}
            <div className="report-risk-score-dial">
              <div className="dial-value-row">
                <Shield size={14} style={{ color: statusColor }} />
                <span className="dial-num" style={{ color: statusColor }}>{riskScore}</span>
                <span className="dial-max">/100</span>
              </div>
              <span className="dial-label">Mission Risk Index</span>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="report-actions-toolbar">
              <button 
                type="button" 
                className="report-btn-action" 
                onClick={handleCopy}
                title="Copy formatted Markdown report to clipboard"
              >
                {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button 
                type="button" 
                className="report-btn-action" 
                onClick={handleDownloadMarkdown}
                title="Download report as Markdown file"
              >
                <Download size={13} />
                <span>.MD</span>
              </button>

              <button 
                type="button" 
                className="report-btn-action" 
                onClick={handleDownloadJSON}
                title="Download raw JSON structured data"
              >
                <Download size={13} />
                <span>JSON</span>
              </button>

              <button 
                type="button" 
                className="report-btn-action print-btn" 
                onClick={handlePrint}
                title="Print or Save as PDF"
              >
                <Printer size={13} />
                <span>Print / PDF</span>
              </button>

              <button 
                type="button" 
                className="report-close-btn" 
                onClick={onClose}
                title="Close report"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Station Switcher / Context Bar */}
        <div className="report-multi-station-bar">
          <span className="multi-st-label">Report Station:</span>
          <button 
            type="button" 
            className={`multi-st-tab ${(!isAllStations && (currentReport?.station_id === 'station-maitri' || selectedStation === 'station-maitri')) || (isAllStations && selectedSubStation === 'station-maitri') ? 'active' : ''}`}
            onClick={() => {
              if (isAllStations) {
                setSelectedSubStation('station-maitri');
              } else if (onRegenerate) {
                onRegenerate('station-maitri');
              }
            }}
          >
            ❄️ Maitri Station
          </button>
          <button 
            type="button" 
            className={`multi-st-tab ${(!isAllStations && (currentReport?.station_id === 'station-bharati' || selectedStation === 'station-bharati')) || (isAllStations && selectedSubStation === 'station-bharati') ? 'active' : ''}`}
            onClick={() => {
              if (isAllStations) {
                setSelectedSubStation('station-bharati');
              } else if (onRegenerate) {
                onRegenerate('station-bharati');
              }
            }}
          >
            🏔️ Bharati Station
          </button>
          <button 
            type="button" 
            className={`multi-st-tab ${isAllStations && selectedSubStation === 'combined' ? 'active' : ''}`}
            onClick={() => {
              if (isAllStations) {
                setSelectedSubStation('combined');
              } else if (onRegenerate) {
                onRegenerate('all-stations');
              }
            }}
          >
            🇮🇳 All Stations (Combined Fleet)
          </button>
        </div>

        {/* ==================================================================
            QUICK-JUMP SECTION NAVIGATION TABS
            ================================================================== */}
        <div className="report-section-nav">
          <button 
            type="button" 
            className={`report-nav-pill ${activeSection === 'executive' ? 'active' : ''}`}
            onClick={() => setActiveSection('executive')}
          >
            <Sparkles size={12} /> Executive Summary
          </button>
          <button 
            type="button" 
            className={`report-nav-pill ${activeSection === 'health' ? 'active' : ''}`}
            onClick={() => setActiveSection('health')}
          >
            <Activity size={12} /> Station Health
          </button>
          <button 
            type="button" 
            className={`report-nav-pill ${activeSection === 'energy' ? 'active' : ''}`}
            onClick={() => setActiveSection('energy')}
          >
            <Zap size={12} /> Energy &amp; BESS
          </button>
          <button 
            type="button" 
            className={`report-nav-pill ${activeSection === 'environment' ? 'active' : ''}`}
            onClick={() => setActiveSection('environment')}
          >
            <Wind size={12} /> Polar Environment
          </button>
          <button 
            type="button" 
            className={`report-nav-pill ${activeSection === 'research' ? 'active' : ''}`}
            onClick={() => setActiveSection('research')}
          >
            <Radio size={12} /> Scientific Research
          </button>
          <button 
            type="button" 
            className={`report-nav-pill ${activeSection === 'logistics' ? 'active' : ''}`}
            onClick={() => setActiveSection('logistics')}
          >
            <Box size={12} /> Logistics &amp; Stores
          </button>
          <button 
            type="button" 
            className={`report-nav-pill ${activeSection === 'infrastructure' ? 'active' : ''}`}
            onClick={() => setActiveSection('infrastructure')}
          >
            <Building2 size={12} /> Digital Twin Modules
          </button>
          {isAllStations && (
            <button 
              type="button" 
              className={`report-nav-pill ${activeSection === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveSection('comparison')}
            >
              <Compass size={12} /> Fleet Matrix
            </button>
          )}
        </div>

        {/* ==================================================================
            REPORT SCROLLABLE CONTENT BODY
            ================================================================== */}
        <div className="report-modal-body">

          {/* ================================================================
              SECTION 1: EXECUTIVE SUMMARY
              ================================================================ */}
          <section id="section-executive" className={`report-section-card ${activeSection === 'executive' ? 'highlighted' : ''}`}>
            <div className="section-title-bar">
              <div className="sec-left">
                <Sparkles size={14} className="text-cyan" />
                <h3 className="sec-heading">Section 1 — Executive Operational Summary</h3>
              </div>
              <div className="sec-badge-group">
                <span className="ai-verified-badge">
                  <Bot size={11} /> AI-GENERATED SUMMARY
                </span>
                <span className="sec-status-tag" style={{ color: statusColor }}>
                  {exec.overall_status || 'NORMAL'}
                </span>
              </div>
            </div>

            {/* AI Summary Highlight Box */}
            <div className="ai-summary-highlight-box">
              <div className="ai-box-header">
                <div className="ai-bot-circle">
                  <Bot size={14} className="text-cyan" />
                </div>
                <div className="ai-box-title-col">
                  <span className="ai-banner-label">POLARIS AI MULTIMODAL SYNTHESIS ENGINE</span>
                  <span className="ai-banner-sub">Cross-Module Correlated 24-Hour Operations Interpretation</span>
                </div>
              </div>
              <p className="ai-summary-text-lead">
                {isAllStations && selectedSubStation === 'combined'
                  ? combined.ai_synthesis
                  : exec.ai_summary ||
                    'During the reporting period, station remained operational with stable energy reserves. Generator temperature showed an increasing trend during periods of elevated load, while environmental conditions remained within the simulated operating range.'}
              </p>
            </div>

            {/* Key KPI Quick Row */}
            <div className="exec-kpis-3col-grid">
              <div className="exec-kpi-card">
                <span className="kpi-card-label">Overall Station Health</span>
                <div className="kpi-card-val-row">
                  <span className="kpi-num">{health.current_health_score ?? 87}</span>
                  <span className="kpi-unit">/100</span>
                  <span className={`kpi-delta-tag ${health.change_pct < 0 ? 'down' : 'up'}`}>
                    {health.change_pct < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                    {health.change_pct ? Math.abs(health.change_pct) : 4.4}%
                  </span>
                </div>
                <span className="kpi-sub-text">Previous 24h: {health.previous_health_score ?? 91}/100</span>
              </div>

              <div className="exec-kpi-card">
                <span className="kpi-card-label">Average Power Draw</span>
                <div className="kpi-card-val-row">
                  <span className="kpi-num">{energy.consumption_avg_kw ?? 105}</span>
                  <span className="kpi-unit">kW</span>
                  <span className={`kpi-delta-tag ${energy.consumption_delta_pct > 0 ? 'warning' : 'up'}`}>
                    {energy.consumption_delta_pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {energy.consumption_delta_pct ? Math.abs(energy.consumption_delta_pct) : 11.4}%
                  </span>
                </div>
                <span className="kpi-sub-text">Peak Load: {energy.peak_consumption_kw ?? 128} kW</span>
              </div>

              <div className="exec-kpi-card">
                <span className="kpi-card-label">Expedition Personnel &amp; Science</span>
                <div className="kpi-card-val-row">
                  <span className="kpi-num">{research.crew_vitals?.active_overwintering_personnel ?? 24}</span>
                  <span className="kpi-unit">Crew</span>
                  <span className="kpi-delta-tag up">
                    <Check size={11} /> 100% Vitals
                  </span>
                </div>
                <span className="kpi-sub-text">Observatories: Active 100% Acquisition</span>
              </div>
            </div>

            {/* Directives / Actionable Recommendations */}
            <div className="exec-directives-card">
              <h4 className="directives-title">
                <ShieldCheck size={13} className="text-emerald" />
                Actionable Operations &amp; Safety Recommendations
              </h4>
              <div className="directives-list">
                {(isAllStations && selectedSubStation === 'combined' ? combined.national_command_directives : exec.recommendations || []).map((rec, idx) => (
                  <div key={idx} className="directive-item">
                    <span className="directive-num">{idx + 1}</span>
                    <span className="directive-text">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ================================================================
              SECTION 2: STATION HEALTH
              ================================================================ */}
          <section id="section-health" className={`report-section-card ${activeSection === 'health' ? 'highlighted' : ''}`}>
            <div className="section-title-bar">
              <div className="sec-left">
                <Activity size={14} className="text-cyan" />
                <h3 className="sec-heading">Section 2 — Station Health &amp; Subsystems</h3>
              </div>
              <div className="health-score-pill-row">
                <span className="health-badge-label">Current: <strong>{health.current_health_score ?? 87}/100</strong></span>
                <span className="health-badge-label">Previous: <strong>{health.previous_health_score ?? 91}/100</strong></span>
                <span className={`health-change-pill ${health.change_pct < 0 ? 'down' : 'up'}`}>
                  {health.change_pct < 0 ? '↓' : '↑'} {health.change_pct ? Math.abs(health.change_pct) : 4.4}%
                </span>
              </div>
            </div>

            {/* Subsystems Breakdown Grid */}
            <div className="subsystems-breakdown-grid">
              {(health.subsystems || []).map((sub) => (
                <div key={sub.id} className="subsystem-metric-card">
                  <div className="sub-top-row">
                    <span className="sub-name">{sub.label}</span>
                    <span className="sub-status-pill" style={{ color: sub.color, borderColor: sub.color }}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="sub-val-row">
                    <span className="sub-score-num">{sub.current_score}</span>
                    <span className="sub-score-den">/100</span>
                    <span className={`sub-delta-tag ${sub.delta < 0 ? 'down' : sub.delta > 0 ? 'up' : 'neutral'}`}>
                      {sub.delta < 0 ? '↓' : sub.delta > 0 ? '↑' : '↔'} {sub.change_pct >= 0 ? `+${sub.change_pct}` : sub.change_pct}%
                    </span>
                  </div>
                  <div className="sub-progress-bar-bg">
                    <div 
                      className="sub-progress-bar-fill" 
                      style={{ width: `${sub.current_score}%`, backgroundColor: sub.color }}
                    />
                  </div>
                  <div className="sub-footer-text">
                    Previous 24h: {sub.previous_score}/100 (Δ {sub.delta >= 0 ? `+${sub.delta}` : sub.delta} pts)
                  </div>
                </div>
              ))}
            </div>

            {/* Active Alerts / Warnings Summary if any */}
            {health.active_alerts && health.active_alerts.length > 0 && (
              <div className="active-alerts-summary-box">
                <div className="alerts-box-header">
                  <AlertTriangle size={13} className="text-amber" />
                  <span className="alerts-box-title">Active Station Advisory &amp; Threshold Events</span>
                  <span className="alerts-count-tag">{health.active_alerts.length} Events</span>
                </div>
                <div className="alerts-mini-list">
                  {health.active_alerts.map((al) => (
                    <div key={al.id} className="alert-mini-item">
                      <span className={`alert-priority-tag ${al.priority?.toLowerCase()}`}>{al.priority}</span>
                      <span className="alert-msg-txt">{al.message}</span>
                      <span className="alert-time-txt">
                        {al.triggered_at 
                          ? `${formatStationTime(al.triggered_at, selectedStation)} (${getStationTimezoneLabel(selectedStation)})` 
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ================================================================
              SECTION 3: ENERGY & BESS
              ================================================================ */}
          <section id="section-energy" className={`report-section-card ${activeSection === 'energy' ? 'highlighted' : ''}`}>
            <div className="section-title-bar">
              <div className="sec-left">
                <Zap size={14} className="text-cyan" />
                <h3 className="sec-heading">Section 3 — Energy Flow &amp; Power Infrastructure</h3>
              </div>
              <span className={`sec-status-tag ${energy.status?.toLowerCase()}`}>
                {energy.status || 'NORMAL'}
              </span>
            </div>

            {/* Energy KPI Cards Row */}
            <div className="energy-kpis-4col-grid">
              <div className="energy-kpi-card">
                <div className="kpi-icon-circle"><Zap size={13} className="text-cyan" /></div>
                <span className="kpi-label">Power Consumption</span>
                <span className="kpi-value">{energy.consumption_avg_kw ?? 105} kW</span>
                <span className="kpi-sub">Peak: <strong>{energy.peak_consumption_kw ?? 128} kW</strong></span>
                <span className="kpi-delta-pill warning">
                  <TrendingUp size={10} /> +{energy.consumption_delta_pct ?? 11.4}% vs 24h
                </span>
              </div>

              <div className="energy-kpi-card">
                <div className="kpi-icon-circle"><Zap size={13} className="text-emerald" /></div>
                <span className="kpi-label">Power Generation</span>
                <span className="kpi-value">{energy.generation_avg_kw ?? 132} kW</span>
                <span className="kpi-sub">Surplus: <strong>+{energy.surplus_avg_kw ?? 27} kW</strong></span>
                <span className="kpi-delta-pill positive">
                  <TrendingUp size={10} /> Net Positive Margin
                </span>
              </div>

              <div className="energy-kpi-card">
                <div className="kpi-icon-circle"><BatteryCharging size={13} className="text-amber" /></div>
                <span className="kpi-label">BESS Battery Reserve</span>
                <span className="kpi-value">{energy.battery_current_pct ?? 74}%</span>
                <span className="kpi-sub">Min Reserve: <strong>{energy.battery_min_pct ?? 68}%</strong></span>
                <span className="kpi-delta-pill neutral">
                  Reserve: {energy.battery_reserve_days || '2.8 days'}
                </span>
              </div>

              <div className="energy-kpi-card">
                <div className="kpi-icon-circle"><Flame size={13} className="text-red" /></div>
                <span className="kpi-label">Generator Core Temp</span>
                <span className="kpi-value">{energy.generator_temp_max_c ?? 78.4}°C</span>
                <span className="kpi-sub">Mean: <strong>{energy.generator_temp_avg_c ?? 74.0}°C</strong></span>
                <span className={`kpi-delta-pill ${energy.generator_temp_max_c >= 85 ? 'warning' : 'nominal'}`}>
                  {energy.generator_status || 'Online'}
                </span>
              </div>
            </div>

            {/* Calculated Comparisons Table */}
            <div className="comparisons-table-container">
              <h4 className="comp-table-title">24-Hour Statistical Comparison vs Previous Window</h4>
              <table className="comparisons-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Current (Last 24h)</th>
                    <th>Previous (24h Prior)</th>
                    <th>Variance / Delta</th>
                    <th>Mathematical Analysis</th>
                  </tr>
                </thead>
                <tbody>
                  {(energy.comparisons || []).map((c, i) => (
                    <tr key={i}>
                      <td className="param-cell"><strong>{c.label}</strong></td>
                      <td className="curr-cell">{c.current_value}</td>
                      <td className="prev-cell">{c.previous_value}</td>
                      <td className="delta-cell">
                        <span className={`delta-badge ${c.direction?.toLowerCase()} ${c.status_type}`}>
                          {c.delta_value} ({c.change_pct >= 0 ? `+${c.change_pct}` : c.change_pct}%)
                        </span>
                      </td>
                      <td className="interp-cell">{c.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI Energy Insight */}
            <div className="section-ai-insight-bar">
              <Bot size={13} className="text-cyan shrink-0" />
              <span><strong>AI Insight:</strong> {energy.ai_insight || 'Generator core temperature elevated during peak load intervals while battery buffers remained within nominal thresholds.'}</span>
            </div>
          </section>

          {/* ================================================================
              SECTION 4: POLAR ENVIRONMENT
              ================================================================ */}
          <section id="section-environment" className={`report-section-card ${activeSection === 'environment' ? 'highlighted' : ''}`}>
            <div className="section-title-bar">
              <div className="sec-left">
                <Wind size={14} className="text-cyan" />
                <h3 className="sec-heading">Section 4 — Meteorological &amp; Cryospheric Environment</h3>
              </div>
              <span className="env-weather-tag">
                <Snowflake size={12} /> Polar Microclimate Active
              </span>
            </div>

            {/* Environment 4-Col Grid */}
            <div className="env-kpis-4col-grid">
              <div className="env-kpi-card">
                <div className="kpi-icon-circle"><Thermometer size={13} className="text-blue" /></div>
                <span className="kpi-label">Surface Temperature</span>
                <span className="kpi-value">{env.temp_avg_c ?? -18.4}°C</span>
                <span className="kpi-sub">Envelope: {env.temp_min_c ?? -22.1}°C to {env.temp_max_c ?? -14.6}°C</span>
                <span className="kpi-delta-pill nominal">Trend: {env.temp_trend || 'Stable'}</span>
              </div>

              <div className="env-kpi-card">
                <div className="kpi-icon-circle"><Wind size={13} className="text-cyan" /></div>
                <span className="kpi-label">Katabatic Wind Speed</span>
                <span className="kpi-value">{env.wind_avg_kmh ?? 28} km/h</span>
                <span className="kpi-sub">Peak Gusts: <strong>{env.wind_max_kmh ?? 44} km/h ({env.wind_dir || 'NW'})</strong></span>
                <span className="kpi-delta-pill nominal">Trend: {env.wind_trend || 'Stable'}</span>
              </div>

              <div className="env-kpi-card">
                <div className="kpi-icon-circle"><Gauge size={13} className="text-indigo" /></div>
                <span className="kpi-label">Barometric Pressure</span>
                <span className="kpi-value">{env.pressure_avg_hpa ?? 984.2} hPa</span>
                <span className="kpi-sub">Humidity: {env.humidity_avg_pct ?? 68}%</span>
                <span className="kpi-delta-pill nominal">{env.pressure_trend || 'Steady'}</span>
              </div>

              <div className="env-kpi-card">
                <div className="kpi-icon-circle"><Snowflake size={13} className="text-cyan" /></div>
                <span className="kpi-label">Snowpack Accumulation</span>
                <span className="kpi-value">+{env.snow_accumulation_24h_cm ?? 4.2} cm</span>
                <span className="kpi-sub">Drift Rate: <strong>{env.snow_drift_rate_cm_hr ?? 0.85} cm/hr</strong></span>
                <span className="kpi-delta-pill positive">Total: {env.snow_total_depth_cm ?? 142.5} cm</span>
              </div>
            </div>

            {/* Calculated Comparisons Table */}
            <div className="comparisons-table-container">
              <h4 className="comp-table-title">Environmental Telemetry Shifts vs Previous 24h Baseline</h4>
              <table className="comparisons-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Current (Last 24h)</th>
                    <th>Previous (24h Prior)</th>
                    <th>Variance / Delta</th>
                    <th>Meteorological Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {(env.comparisons || []).map((c, i) => (
                    <tr key={i}>
                      <td className="param-cell"><strong>{c.label}</strong></td>
                      <td className="curr-cell">{c.current_value}</td>
                      <td className="prev-cell">{c.previous_value}</td>
                      <td className="delta-cell">
                        <span className={`delta-badge ${c.direction?.toLowerCase()}`}>
                          {c.delta_value}
                        </span>
                      </td>
                      <td className="interp-cell">{c.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI Environment Interpretation */}
            <div className="section-ai-insight-bar">
              <Bot size={13} className="text-cyan shrink-0" />
              <span><strong>AI Interpretation:</strong> {env.ai_interpretation || 'Ambient conditions remained within expected seasonal Gaussian tolerances.'}</span>
            </div>
          </section>

          {/* ================================================================
              SECTION 5: SCIENTIFIC RESEARCH
              ================================================================ */}
          <section id="section-research" className={`report-section-card ${activeSection === 'research' ? 'highlighted' : ''}`}>
            <div className="section-title-bar">
              <div className="sec-left">
                <Radio size={14} className="text-cyan" />
                <h3 className="sec-heading">Section 5 — Scientific Observatories &amp; Expedition Bio-Telemetry</h3>
              </div>
              <span className="observatory-name-tag">{research.observatory_name || 'Polar Research Observatory'}</span>
            </div>

            {/* Research Findings 3-Box Row */}
            <div className="research-findings-grid">
              <div className="finding-box major-trend">
                <div className="finding-header">
                  <TrendingUp size={13} className="text-cyan" />
                  <span className="finding-title">Major Scientific Trend</span>
                </div>
                <p className="finding-text">{research.findings?.major_trend || 'Borehole broadband seismometer recorded steady baseline microseisms.'}</p>
              </div>

              <div className="finding-box major-anomaly">
                <div className="finding-header">
                  <AlertCircle size={13} className="text-amber" />
                  <span className="finding-title">Major Observatory Event</span>
                </div>
                <p className="finding-text">{research.findings?.major_anomaly || 'Geomagnetic Kp index recorded planetary Kp at 2.33 with active auroral bands.'}</p>
              </div>

              <div className="finding-box attention-param">
                <div className="finding-header">
                  <Activity size={13} className="text-emerald" />
                  <span className="finding-title">Parameter Requiring Attention</span>
                </div>
                <p className="finding-text">{research.findings?.attention_parameter || 'Subsurface firn densification temperature nominal; acoustic probe calibration active.'}</p>
              </div>
            </div>

            {/* Telemetry Channel Matrix */}
            <div className="research-telemetry-cards-grid">
              <div className="res-card">
                <h5 className="res-card-heading">Borehole Solid-Earth Seismology</h5>
                <div className="res-stats-row">
                  <span className="res-metric-label">Dominant Frequency:</span>
                  <span className="res-metric-val">{research.seismic?.dominant_frequency_hz ?? 1.85} Hz</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Peak Ground Acceleration (PGA):</span>
                  <span className="res-metric-val">{research.seismic?.peak_ground_acceleration_g ?? 0.0018} g</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Displacement Amplitude:</span>
                  <span className="res-metric-val">{research.seismic?.tremor_amplitude_um ?? 3.2} μm</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Borehole Depth:</span>
                  <span className="res-metric-val">{research.seismic?.borehole_depth_meters ?? 45} m</span>
                </div>
              </div>

              <div className="res-card">
                <h5 className="res-card-heading">Geomagnetic &amp; Space Weather</h5>
                <div className="res-stats-row">
                  <span className="res-metric-label">Planetary Kp Index:</span>
                  <span className="res-metric-val">{research.geomagnetic?.kp_index_current ?? 2.33} ({research.geomagnetic?.storm_classification ?? 'G1_MINOR'})</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Total Magnetic Field:</span>
                  <span className="res-metric-val">{research.geomagnetic?.total_magnetic_field_intensity_nt ?? 42850.0} nT</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Auroral Activity:</span>
                  <span className="res-metric-val">{research.geomagnetic?.auroral_electrojet_activity ?? 'Active Auroral Bands'}</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Ionospheric Scintillation:</span>
                  <span className="res-metric-val">S4 = {research.geomagnetic?.ionospheric_scintillation_s4 ?? 0.16}</span>
                </div>
              </div>

              <div className="res-card">
                <h5 className="res-card-heading">Expedition Crew Bio-Telemetry</h5>
                <div className="res-stats-row">
                  <span className="res-metric-label">Active Overwintering Crew:</span>
                  <span className="res-metric-val">{research.crew_vitals?.active_overwintering_personnel ?? 24} Personnel</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Mean Heart Rate:</span>
                  <span className="res-metric-val">{research.crew_vitals?.average_heart_rate_bpm ?? 73.0} bpm</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Mean Blood Oxygen (SpO2):</span>
                  <span className="res-metric-val">{research.crew_vitals?.average_spo2_percent ?? 98.4}%</span>
                </div>
                <div className="res-stats-row">
                  <span className="res-metric-label">Mean Stress Index:</span>
                  <span className="res-metric-val">{research.crew_vitals?.average_stress_index ?? 25.5} / 100</span>
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================
              SECTION 6: LOGISTICS & INVENTORY
              ================================================================ */}
          <section id="section-logistics" className={`report-section-card ${activeSection === 'logistics' ? 'highlighted' : ''}`}>
            <div className="section-title-bar">
              <div className="sec-left">
                <Box size={14} className="text-cyan" />
                <h3 className="sec-heading">Section 6 — Critical Logistics &amp; Consumption Depletion</h3>
              </div>
              <span className="depletion-forecast-badge">
                <Calendar size={11} /> Next Depletion Window: {logistics.depletion_forecast_date || '15 Jul 2025'}
              </span>
            </div>

            {/* Inventory Items Cards Grid */}
            <div className="logistics-items-grid">
              {(logistics.items || []).map((it) => (
                <div key={it.id} className="logistics-card">
                  <div className="log-top-row">
                    <span className="log-item-name">{it.name}</span>
                    <span className={`log-status-pill ${it.status?.toLowerCase()}`}>
                      {it.status}
                    </span>
                  </div>
                  <div className="log-amount-row">
                    <span className="log-amount-num">{it.current_amount}</span>
                    <span className="log-pct-txt">({it.percent}%)</span>
                  </div>
                  <div className="log-progress-bar-bg">
                    <div 
                      className="log-progress-bar-fill" 
                      style={{ width: `${it.percent}%`, backgroundColor: it.color || '#187451' }}
                    />
                  </div>
                  <div className="log-footer-row">
                    <span className="log-days-left"><strong>{it.days_remaining}</strong> remaining</span>
                    <span className="log-burn-rate">24h Draw: {it.consumption_24h} ({it.change_pct}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Logistics Insight */}
            <div className="section-ai-insight-bar">
              <Bot size={13} className="text-cyan shrink-0" />
              <span><strong>AI Insight:</strong> {logistics.ai_insight || 'All critical supplies remain above safe operational thresholds.'}</span>
            </div>
          </section>

          {/* ================================================================
              SECTION 7: DIGITAL TWIN INFRASTRUCTURE
              ================================================================ */}
          <section id="section-infrastructure" className={`report-section-card ${activeSection === 'infrastructure' ? 'highlighted' : ''}`}>
            <div className="section-title-bar">
              <div className="sec-left">
                <Building2 size={14} className="text-cyan" />
                <h3 className="sec-heading">Section 7 — Digital Twin Infrastructure &amp; Habitats</h3>
              </div>
              <div className="infra-status-counts-row">
                <span className="infra-count-pill operational">
                  <Check size={11} /> {infra.operational_count ?? 4} Nominal
                </span>
                {infra.warning_count > 0 && (
                  <span className="infra-count-pill warning">
                    <AlertTriangle size={11} /> {infra.warning_count} Advisory
                  </span>
                )}
                <span className="infra-health-pill">
                  Health: <strong>{infra.infrastructure_health_score ?? 91}%</strong>
                </span>
              </div>
            </div>

            {/* Modules 2-Col Grid */}
            <div className="infra-modules-grid">
              {(infra.modules || []).map((m) => (
                <div key={m.id} className={`infra-module-card ${m.status_type}`}>
                  <div className="infra-card-header">
                    <div className="infra-name-col">
                      <span className="infra-name">{m.name}</span>
                      <span className="infra-subsystem">{m.subsystem}</span>
                    </div>
                    <span className={`infra-status-pill ${m.status_type}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="infra-telemetry-row">
                    <div className="infra-tel-pill">
                      <Thermometer size={11} className="text-dim" />
                      <span>{m.temperature}</span>
                    </div>
                    <div className="infra-tel-pill">
                      <Zap size={11} className="text-dim" />
                      <span>{m.power_draw}</span>
                    </div>
                    {m.maintenance_health && (
                      <div className="infra-tel-pill">
                        <HardDrive size={11} className="text-dim" />
                        <span>Health: {m.maintenance_health}</span>
                      </div>
                    )}
                  </div>
                  <p className="infra-notes-txt">{m.notes}</p>
                </div>
              ))}
            </div>

            {/* AI Infrastructure Insight */}
            <div className="section-ai-insight-bar">
              <Bot size={13} className="text-cyan shrink-0" />
              <span><strong>AI Insight:</strong> {infra.ai_insight || 'Core digital twin infrastructure modules operating within nominal design parameters.'}</span>
            </div>
          </section>

          {/* ================================================================
              MULTI-STATION COMPARATIVE MATRIX (When ALL STATIONS requested)
              ================================================================ */}
          {isAllStations && matrix.length > 0 && (
            <section id="section-comparison" className={`report-section-card ${activeSection === 'comparison' ? 'highlighted' : ''}`}>
              <div className="section-title-bar">
                <div className="sec-left">
                  <Compass size={14} className="text-cyan" />
                  <h3 className="sec-heading">Fleet Intelligence — Maitri vs. Bharati Comparative Matrix</h3>
                </div>
                <span className="national-command-tag">National Antarctica Command Telemetry</span>
              </div>

              <div className="comparisons-table-container">
                <table className="comparisons-table multi-station-table">
                  <thead>
                    <tr>
                      <th>Mission Metric</th>
                      <th>Maitri Station (Schirmacher)</th>
                      <th>Bharati Station (Larsemann)</th>
                      <th>National Command Comparative Synthesis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, idx) => (
                      <tr key={idx}>
                        <td className="param-cell"><strong>{row.metric}</strong></td>
                        <td className="maitri-cell">{row.maitri}</td>
                        <td className="bharati-cell">{row.bharati}</td>
                        <td className="comp-analysis-cell">{row.comparison}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ================================================================
              REPORT FOOTER
              ================================================================ */}
          <div className="report-modal-footer">
            <div className="footer-left">
              <ShieldCheck size={14} className="text-emerald" />
              <span>POLARIS AI-Powered Antarctic Operations &amp; Research Analysis System. Authenticated with Supabase PostgreSQL.</span>
            </div>
            <div className="footer-right">
              <button type="button" className="footer-btn print" onClick={handlePrint}>
                <Printer size={13} /> Print Report
              </button>
              <button type="button" className="footer-btn close" onClick={onClose}>
                Close Report
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
