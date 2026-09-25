import React, { useState, useEffect, useMemo } from 'react';
import {
  Satellite,
  Activity,
  Layers,
  Sparkles,
  Download,
  Printer,
  X,
  Clock,
  RefreshCw,
  Compass,
  Check,
  Radio,
  FileText,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Droplets,
  Shield,
  Gauge,
  Thermometer,
  Wind,
  Cpu,
  MapPin,
  Eye,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { formatStationTime, getStationTimezoneLabel } from '../utils/timeUtils';

export default function ResearchAnalysisModal({
  isOpen,
  onClose,
  selectedStation = 'station-maitri',
  onSelectStation
}) {
  const [activeTab, setActiveTab] = useState('satellite'); // 'satellite' | 'glaciology' | 'gnss' | 'directives'
  const [stationId, setStationId] = useState(selectedStation || 'station-maitri');
  const [copied, setCopied] = useState(false);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(11); // Latest month (Sep / Now)

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

  // Sync stationId when prop changes
  useEffect(() => {
    if (selectedStation) {
      setStationId(selectedStation === 'all-stations' ? 'station-maitri' : selectedStation);
    }
  }, [selectedStation]);

  if (!isOpen) return null;

  const isBharati = stationId === 'station-bharati';
  const stationDisplayName = isBharati ? 'Bharati' : 'Maitri';
  const stationLocation = isBharati ? 'Larsemann Hills, Ingrid Christensen Coast' : 'Schirmacher Oasis, Queen Maud Land';
  const stationCoords = isBharati ? "69° 24′ S, 76° 17′ E" : "70° 45′ S, 11° 44′ E";

  // 12-Month Ice Velocity Waveform Data
  const monthlyData = isBharati ? [
    { month: 'Oct 24', vel: 19.8, baseline: 20.0, temp: -21.4, note: 'Early spring baseline' },
    { month: 'Nov 24', vel: 20.1, baseline: 20.0, temp: -17.2, note: 'Normal coastal flow' },
    { month: 'Dec 24', vel: 20.9, baseline: 20.4, temp: -11.5, note: 'Summer melt onset' },
    { month: 'Jan 25', vel: 21.6, baseline: 20.8, temp: -6.8, note: 'Peak summer velocity' },
    { month: 'Feb 25', vel: 21.2, baseline: 20.5, temp: -9.4, note: 'Early freeze-up' },
    { month: 'Mar 25', vel: 20.4, baseline: 20.1, temp: -16.2, note: 'Autumn slowdown' },
    { month: 'Apr 25', vel: 20.1, baseline: 20.0, temp: -22.5, note: 'Polar night onset' },
    { month: 'May 25', vel: 20.3, baseline: 20.0, temp: -25.8, note: 'Mid-winter baseline' },
    { month: 'Jun 25', vel: 20.6, baseline: 20.0, temp: -28.1, note: 'Stable flow' },
    { month: 'Jul 25', vel: 20.8, baseline: 20.0, temp: -29.4, note: 'Winter baseline' },
    { month: 'Aug 25', vel: 20.9, baseline: 20.1, temp: -27.6, note: 'Pre-spring shift' },
    { month: 'Sep 25', vel: 22.8, baseline: 20.2, temp: -23.1, note: '🚨 +12.0% Melting / Velocity Surge', isSurge: true }
  ] : [
    { month: 'Oct 24', vel: 14.2, baseline: 14.8, temp: -22.5, note: 'Early spring baseline' },
    { month: 'Nov 24', vel: 14.4, baseline: 14.8, temp: -18.1, note: 'Normal oasis flow' },
    { month: 'Dec 24', vel: 14.7, baseline: 15.0, temp: -12.4, note: 'Summer melt onset' },
    { month: 'Jan 25', vel: 15.2, baseline: 15.2, temp: -7.2, note: 'Peak summer flow' },
    { month: 'Feb 25', vel: 15.0, baseline: 15.0, temp: -10.5, note: 'Early freeze-up' },
    { month: 'Mar 25', vel: 14.8, baseline: 14.9, temp: -17.8, note: 'Autumn stabilization' },
    { month: 'Apr 25', vel: 14.6, baseline: 14.8, temp: -23.4, note: 'Polar night onset' },
    { month: 'May 25', vel: 14.7, baseline: 14.8, temp: -26.9, note: 'Mid-winter baseline' },
    { month: 'Jun 25', vel: 14.9, baseline: 14.8, temp: -29.2, note: 'Stable flow' },
    { month: 'Jul 25', vel: 15.1, baseline: 14.8, temp: -30.5, note: 'Deep winter' },
    { month: 'Aug 25', vel: 15.0, baseline: 14.9, temp: -28.4, note: 'Pre-spring shift' },
    { month: 'Sep 25', vel: 16.8, baseline: 14.9, temp: -24.2, note: '🚨 +12.4% Ice Velocity Surge', isSurge: true }
  ];

  const currentMonthData = monthlyData[selectedMonthIdx] || monthlyData[monthlyData.length - 1];

  // SVG Chart Geometry
  const svgW = 620;
  const svgH = 170;
  const padX = 40;
  const padY = 25;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const velValues = monthlyData.map(d => d.vel);
  const baseValues = monthlyData.map(d => d.baseline);
  const minVal = Math.min(...velValues, ...baseValues) - 0.5;
  const maxVal = Math.max(...velValues, ...baseValues) + 0.8;
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const velCoords = monthlyData.map((d, i) => {
    const x = padX + (i / (monthlyData.length - 1)) * plotW;
    const y = padY + (1 - (d.vel - minVal) / range) * plotH;
    return { x, y, d, i };
  });

  const baseCoords = monthlyData.map((d, i) => {
    const x = padX + (i / (monthlyData.length - 1)) * plotW;
    const y = padY + (1 - (d.baseline - minVal) / range) * plotH;
    return { x, y, d, i };
  });

  const velPathD = velCoords.reduce((acc, c, i) => {
    if (i === 0) return `M ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
    const prev = velCoords[i - 1];
    const mx = (prev.x + c.x) / 2;
    return `${acc} C ${mx.toFixed(1)},${prev.y.toFixed(1)} ${mx.toFixed(1)},${c.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
  }, '');

  const basePathD = baseCoords.reduce((acc, c, i) => {
    if (i === 0) return `M ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
    const prev = baseCoords[i - 1];
    const mx = (prev.x + c.x) / 2;
    return `${acc} C ${mx.toFixed(1)},${prev.y.toFixed(1)} ${mx.toFixed(1)},${c.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
  }, '');

  const velAreaD = velCoords.length > 0
    ? `${velPathD} L ${velCoords[velCoords.length - 1].x.toFixed(1)},${svgH - padY} L ${velCoords[0].x.toFixed(1)},${svgH - padY} Z`
    : '';

  // Export handlers
  const handleCopy = () => {
    const text = `POLARIS SCIENTIFIC SATELLITE ANALYSIS DOSSIER
Station: ${stationDisplayName} (${stationCoords} - ${stationLocation})
Date: ${new Date().toLocaleDateString('en-GB')}
Satellite Pass: ISRO NISAR / CryoSat-2 / Cartosat-3
Ice Velocity: ${isBharati ? '22.8 m/yr (+12.0%)' : '16.8 m/yr (+12.4%)'} (Surge Detected)
Surface Mass Balance: ${isBharati ? '-0.56 m w.e.' : '-0.42 m w.e.'}
Grounding Line Stability: ${isBharati ? '88.4%' : '91.2%'}
Radar Backscatter: ${isBharati ? '-15.1 dB' : '-14.2 dB'}

Scientific Findings:
Multi-temporal differential SAR interferometry indicates a localized surface ice velocity surge (+12%) along the northern perimeter ice tongue. This acceleration correlates with sustained katabatic wind shear and mild subsurface firn densification. Grounding line bedrock anchoring remains secure.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      metadata: {
        title: `POLARIS Satellite Cryosphere Analysis - ${stationDisplayName}`,
        generated_at: new Date().toISOString(),
        satellite_sources: ['ISRO Cartosat-3', 'ISRO NISAR L/S-Band', 'ESA CryoSat-2 SIRAL', 'NASA Landsat-9'],
        station: stationDisplayName,
        coordinates: stationCoords,
        region: stationLocation
      },
      features: [
        {
          type: 'Feature',
          properties: {
            name: `${stationDisplayName} Northern Ice Tongue Velocity Surge`,
            velocity_current_m_yr: isBharati ? 22.8 : 16.8,
            velocity_baseline_m_yr: isBharati ? 20.2 : 14.9,
            surge_percentage: isBharati ? '+12.0%' : '+12.4%',
            radar_backscatter_db: isBharati ? -15.1 : -14.2,
            grounding_line_stability_pct: isBharati ? 88.4 : 91.2,
            surface_mass_balance_m_we: isBharati ? -0.56 : -0.42,
            status: 'SURGE_ANOMALY'
          },
          geometry: {
            type: 'Point',
            coordinates: isBharati ? [76.2833, -69.4000] : [11.7333, -70.7500]
          }
        },
        ...monthlyData.map((m, idx) => ({
          type: 'Feature',
          properties: {
            month: m.month,
            observed_velocity_m_yr: m.vel,
            baseline_velocity_m_yr: m.baseline,
            skin_temp_c: m.temp,
            note: m.note
          },
          geometry: {
            type: 'Point',
            coordinates: isBharati ? [76.28 + idx * 0.005, -69.40 - idx * 0.003] : [11.73 + idx * 0.005, -70.75 - idx * 0.003]
          }
        }))
      ]
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POLARIS_Satellite_Analysis_${stationDisplayName}_${Date.now()}.geojson`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div 
        className="polaris-summary-report-modal polaris-analysis-modal"
        style={{ maxWidth: '1150px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================================
            MODAL HEADER BAR
            ================================================================== */}
        <div className="report-modal-header">
          <div className="report-modal-header-left">
            <div className="report-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.5)' }}>
              <Satellite size={18} className="text-cyan animate-pulse" />
            </div>
            <div>
              <div className="report-badge-row">
                <span className="report-tag-live">AI SATELLITE &amp; CRYOSPHERE ANALYSIS</span>
                <span className="report-station-tag" style={{ borderColor: '#146b80', color: '#146b80' }}>
                  {stationDisplayName.toUpperCase()} STATION
                </span>
                <span className="report-status-pill warning">
                  🚨 +12% VELOCITY SURGE
                </span>
              </div>
              <h2 className="report-main-heading">
                High-Resolution Satellite Cryosphere &amp; Ice Dynamics Analysis ({stationDisplayName})
              </h2>
              <div className="report-time-window-row">
                <span className="time-sub-item">
                  <MapPin size={11} className="text-dim" />
                  <strong>Region:</strong> {stationLocation} ({stationCoords})
                </span>
                <span className="time-sub-item">
                  <Radio size={11} className="text-cyan" />
                  <strong>Satellite Sensor Suite:</strong> ISRO Cartosat-3 • ISRO NISAR (L&amp;S SAR) • CryoSat-2 SIRAL • Landsat-9
                </span>
              </div>
            </div>
          </div>

          <div className="report-modal-header-right">
            {/* Quick Stats Widget */}
            <div className="report-risk-score-dial" style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
              <div className="dial-value-row">
                <TrendingUp size={14} className="text-amber" />
                <span className="dial-num text-amber">{isBharati ? '+12.0%' : '+12.4%'}</span>
              </div>
              <span className="dial-label">Velocity Surge</span>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="report-actions-toolbar">
              <button 
                type="button" 
                className="report-btn-action" 
                onClick={handleCopy}
                title="Copy formatted brief to clipboard"
              >
                {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button 
                type="button" 
                className="report-btn-action" 
                onClick={handleDownloadGeoJSON}
                title="Download full scientific GeoJSON dataset"
              >
                <Download size={13} />
                <span>GeoJSON</span>
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
                title="Close modal (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Station Switcher Context Bar */}
        <div className="report-multi-station-bar">
          <span className="multi-st-label">Select Station Context:</span>
          <button 
            type="button" 
            className={`multi-st-tab ${stationId === 'station-maitri' ? 'active' : ''}`}
            onClick={() => {
              setStationId('station-maitri');
              if (onSelectStation) onSelectStation('station-maitri');
            }}
          >
            <span className="tab-radio-dot" />
            <span>Maitri Station (Schirmacher Oasis)</span>
          </button>
          <button 
            type="button" 
            className={`multi-st-tab ${stationId === 'station-bharati' ? 'active' : ''}`}
            onClick={() => {
              setStationId('station-bharati');
              if (onSelectStation) onSelectStation('station-bharati');
            }}
          >
            <span className="tab-radio-dot" />
            <span>Bharati Station (Larsemann Hills)</span>
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="report-nav-tabs-bar">
          <button 
            type="button" 
            className={`report-nav-tab-btn ${activeTab === 'satellite' ? 'active' : ''}`}
            onClick={() => setActiveTab('satellite')}
          >
            <Satellite size={13} />
            <span>Satellite SAR &amp; Waveforms</span>
          </button>
          <button 
            type="button" 
            className={`report-nav-tab-btn ${activeTab === 'glaciology' ? 'active' : ''}`}
            onClick={() => setActiveTab('glaciology')}
          >
            <Layers size={13} />
            <span>Glaciology &amp; Subsurface Firn</span>
          </button>
          <button 
            type="button" 
            className={`report-nav-tab-btn ${activeTab === 'gnss' ? 'active' : ''}`}
            onClick={() => setActiveTab('gnss')}
          >
            <Compass size={13} />
            <span>Ground Kinematic GNSS Array</span>
          </button>
          <button 
            type="button" 
            className={`report-nav-tab-btn ${activeTab === 'directives' ? 'active' : ''}`}
            onClick={() => setActiveTab('directives')}
          >
            <Sparkles size={13} />
            <span>AI Multimodal Findings &amp; Directives</span>
          </button>
        </div>

        {/* ==================================================================
            MODAL BODY CONTENT
            ================================================================== */}
        <div className="report-modal-body" style={{ padding: '18px 22px' }}>
          
          {/* Top Quick Anomaly Highlight */}
          <div className="ai-multimodal-banner" style={{ background: 'linear-gradient(135deg, #f4f7f9 0%, rgba(245, 158, 11, 0.08) 100%)', borderColor: 'rgba(245, 158, 11, 0.35)', marginBottom: '16px' }}>
            <div className="ai-banner-header">
              <div className="ai-banner-title-group">
                <Sparkles size={14} className="text-amber" />
                <span className="ai-banner-label text-amber">POLARIS CRYOSPHERE TELEMETRY INTELLIGENCE</span>
              </div>
              <span className="ai-provider-badge">ISRO NISAR SAR Differential Engine v3.2</span>
            </div>
            <p className="ai-banner-summary" style={{ fontSize: '0.78rem', lineHeight: '1.45', color: '#1d3044' }}>
              <strong>Satellite Advisory:</strong> Synthetic Aperture Radar (SAR) interferometry and multispectral altimetry confirm a localized surface ice velocity acceleration ({isBharati ? '+12.0%' : '+12.4%'}) along the {stationDisplayName} northern ice sector compared to the 30-day baseline. Grounding line bedrock anchoring remains secure at {isBharati ? '88.4%' : '91.2%'}.
            </p>
          </div>

          {/* ================================================================
              TAB 1: SATELLITE SAR & WAVEFORMS
              ================================================================ */}
          {activeTab === 'satellite' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 4 KPI Cards */}
              <div className="report-kpi-grid">
                <div className="rep-kpi-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
                  <div className="kpi-top-row">
                    <span className="kpi-title">Ice Flow Velocity</span>
                    <TrendingUp size={13} className="text-red" />
                  </div>
                  <div className="kpi-main-val text-red mono-num">
                    {isBharati ? '22.8 m/yr' : '16.8 m/yr'}
                  </div>
                  <div className="kpi-sub-label">
                    <span className="text-red font-bold">{isBharati ? '+12.0%' : '+12.4%'}</span> vs 30d Baseline ({isBharati ? '20.2 m/yr' : '14.9 m/yr'})
                  </div>
                </div>

                <div className="rep-kpi-card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}>
                  <div className="kpi-top-row">
                    <span className="kpi-title">Surface Mass Balance</span>
                    <Droplets size={13} className="text-amber" />
                  </div>
                  <div className="kpi-main-val text-amber mono-num">
                    {isBharati ? '-0.56 m w.e.' : '-0.42 m w.e.'}
                  </div>
                  <div className="kpi-sub-label">
                    Ablation Gradient (CryoSat-2 SIRAL)
                  </div>
                </div>

                <div className="rep-kpi-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  <div className="kpi-top-row">
                    <span className="kpi-title">Grounding Line Stability</span>
                    <Shield size={13} className="text-cyan" />
                  </div>
                  <div className="kpi-main-val text-cyan mono-num">
                    {isBharati ? '88.4%' : '91.2%'}
                  </div>
                  <div className="kpi-sub-label">
                    Bedrock Pinning Intact &amp; Stable
                  </div>
                </div>

                <div className="rep-kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
                  <div className="kpi-top-row">
                    <span className="kpi-title">Radar Backscatter (SAR)</span>
                    <Activity size={13} className="text-emerald" />
                  </div>
                  <div className="kpi-main-val text-emerald mono-num">
                    {isBharati ? '-15.1 dB' : '-14.2 dB'}
                  </div>
                  <div className="kpi-sub-label">
                    Compacted Firn Stratum Coherence
                  </div>
                </div>
              </div>

              {/* Interactive 12-Month Waveform Graph */}
              <div style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#146b80', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      12-Month Longitudinal Ice Velocity Progression (m/yr)
                    </span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.66rem', color: '#536579' }}>
                      Click on any monthly point to view detailed satellite telemetry observations.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.66rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#146b80' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#146b80' }} /> Observed (SAR)
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                      <span style={{ width: '12px', height: '2px', background: '#64748b', borderStyle: 'dashed' }} /> 10-Yr Baseline
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b73b37' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b73b37' }} /> Velocity Surge
                    </span>
                  </div>
                </div>

                {/* SVG Graph */}
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                    <defs>
                      <linearGradient id="satVelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#146b80" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#245b82" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    {[0.2, 0.5, 0.8].map((ratio, idx) => (
                      <line
                        key={idx}
                        x1={padX}
                        y1={padY + ratio * plotH}
                        x2={svgW - padX}
                        y2={padY + ratio * plotH}
                        stroke="rgba(56, 189, 248, 0.12)"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Baseline dashed path */}
                    {basePathD && (
                      <path
                        d={basePathD}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Area fill */}
                    {velAreaD && <path d={velAreaD} fill="url(#satVelGrad)" />}

                    {/* Main velocity spline line */}
                    {velPathD && (
                      <path
                        d={velPathD}
                        fill="none"
                        stroke="#146b80"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))' }}
                      />
                    )}

                    {/* Data Points */}
                    {velCoords.map((c, i) => {
                      const isSelected = i === selectedMonthIdx;
                      const isSurge = c.d.isSurge;
                      const ptColor = isSurge ? '#b73b37' : isSelected ? '#146b80' : '#ffffff';
                      const strokeColor = isSurge ? '#ffffff' : '#245b82';

                      return (
                        <g 
                          key={i} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedMonthIdx(i)}
                        >
                          {isSelected && (
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r="8"
                              fill="none"
                              stroke={isSurge ? '#b73b37' : '#146b80'}
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                              className="animate-pulse"
                            />
                          )}
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={isSelected || isSurge ? 5 : 3.2}
                            fill={ptColor}
                            stroke={strokeColor}
                            strokeWidth="1.8"
                          />
                          <text
                            x={c.x}
                            y={svgH - 6}
                            fill={isSelected ? '#146b80' : '#64748b'}
                            fontSize="8.5"
                            fontWeight={isSelected ? 'bold' : 'normal'}
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {c.d.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Selected Point Inspector */}
                <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f4f7f9', borderRadius: '6px', border: '1px solid rgba(45, 78, 128, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#146b80' }}>
                      📅 Month: {currentMonthData.month}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#1d3044' }}>
                      Observed Velocity: <strong className={currentMonthData.isSurge ? 'text-red' : 'text-cyan'}>{currentMonthData.vel} m/yr</strong>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#536579' }}>
                      Baseline: {currentMonthData.baseline} m/yr
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#536579' }}>
                      Thermal Skin Temp: {currentMonthData.temp}°C
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: currentMonthData.isSurge ? '#b73b37' : '#187451', fontWeight: 700 }}>
                    {currentMonthData.note}
                  </span>
                </div>
              </div>

              {/* Satellite Sensor Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#f4f7f9', border: '1px solid rgba(45, 78, 128, 0.35)', borderRadius: '6px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#536579', textTransform: 'uppercase' }}>ISRO NISAR SAR Phase</span>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#146b80', marginTop: '2px' }} className="mono-num">
                    0.78 rad / pass
                  </div>
                  <span style={{ fontSize: '0.58rem', color: '#64748b' }}>Interferometric fringe displacement rate</span>
                </div>

                <div style={{ background: '#f4f7f9', border: '1px solid rgba(45, 78, 128, 0.35)', borderRadius: '6px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#536579', textTransform: 'uppercase' }}>TIR Skin Temperature</span>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#146b80', marginTop: '2px' }} className="mono-num">
                    -18.2°C (MODIS / Landsat-9)
                  </div>
                  <span style={{ fontSize: '0.58rem', color: '#64748b' }}>+1.3°C above 10-year seasonal median</span>
                </div>

                <div style={{ background: '#f4f7f9', border: '1px solid rgba(45, 78, 128, 0.35)', borderRadius: '6px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#536579', textTransform: 'uppercase' }}>Microwave Penetration</span>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#187451', marginTop: '2px' }} className="mono-num">
                    4.8 Meters (L-Band SAR)
                  </div>
                  <span style={{ fontSize: '0.58rem', color: '#64748b' }}>Detects subsurface firn liquid pockets</span>
                </div>

                <div style={{ background: '#f4f7f9', border: '1px solid rgba(45, 78, 128, 0.35)', borderRadius: '6px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#536579', textTransform: 'uppercase' }}>Surface Optical Albedo</span>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#146b80', marginTop: '2px' }} className="mono-num">
                    0.84 (Cartosat-3 Multispectral)
                  </div>
                  <span style={{ fontSize: '0.58rem', color: '#64748b' }}>Stable cryospheric solar reflectance</span>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================
              TAB 2: GLACIOLOGY & SUBSURFACE FIRN
              ================================================================ */}
          {activeTab === 'glaciology' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '14px 16px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#146b80', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Subsurface Firn Stratigraphy &amp; Core Density Strata
                </span>
                <p style={{ margin: '2px 0 12px 0', fontSize: '0.66rem', color: '#536579' }}>
                  Borehole telemetry &amp; Shallow Seismic Firn Inversion ({stationDisplayName} Glaciological Sector).
                </p>

                <div className="sim-report-table">
                  <div className="sim-rep-row header" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr' }}>
                    <span>Stratum Layer</span>
                    <span>Depth Range</span>
                    <span>Density (kg/m³)</span>
                    <span>Core Temp (°C)</span>
                    <span>Status</span>
                  </div>
                  <div className="sim-rep-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr' }}>
                    <span style={{ fontWeight: 600, color: '#1d3044' }}>Fresh Snow &amp; Wind Crust</span>
                    <span>0 – 15 Meters</span>
                    <span className="mono-num">350 kg/m³</span>
                    <span className="mono-num text-cyan">-22.4°C</span>
                    <span className="text-emerald font-bold">STABLE</span>
                  </div>
                  <div className="sim-rep-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr' }}>
                    <span style={{ fontWeight: 600, color: '#1d3044' }}>Densified Firn Layer</span>
                    <span>15 – 40 Meters</span>
                    <span className="mono-num">580 kg/m³</span>
                    <span className="mono-num text-cyan">-19.6°C</span>
                    <span className="text-amber font-bold">COMPACTING</span>
                  </div>
                  <div className="sim-rep-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr' }}>
                    <span style={{ fontWeight: 600, color: '#1d3044' }}>Pore Close-Off Transition</span>
                    <span>40 – 80 Meters</span>
                    <span className="mono-num">820 kg/m³</span>
                    <span className="mono-num text-cyan">-17.8°C</span>
                    <span className="text-emerald font-bold">NOMINAL</span>
                  </div>
                  <div className="sim-rep-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr' }}>
                    <span style={{ fontWeight: 600, color: '#1d3044' }}>Solid Glacial Basal Ice</span>
                    <span>80 – 120+ Meters</span>
                    <span className="mono-num">910 kg/m³</span>
                    <span className="mono-num text-cyan">-14.2°C</span>
                    <span className="text-emerald font-bold">SECURED</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f4f7f9', border: '1px solid rgba(45, 78, 128, 0.35)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Activity size={14} className="text-cyan" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d3044' }}>Crevasse &amp; Strain Rate Tensor</span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#536579', margin: 0, lineHeight: '1.4' }}>
                    Surface principal strain rate: <strong className="text-amber mono-num">1.4 × 10⁻⁴ yr⁻¹</strong>. Micro-fissuring detected along lateral shear margins, but no transverse crevasse expansion observed near station transit trails.
                  </p>
                </div>

                <div style={{ background: '#f4f7f9', border: '1px solid rgba(45, 78, 128, 0.35)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Gauge size={14} className="text-emerald" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d3044' }}>Subglacial Hydraulic Pressure</span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#536579', margin: 0, lineHeight: '1.4' }}>
                    Piezometer reading at Bedrock Interface: <strong className="text-emerald mono-num">12.8 bar</strong>. Basal hydrological drainage network in stable winter equilibrium without pressurized lake discharge.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 3: GROUND KINEMATIC GNSS ARRAY
              ================================================================ */}
          {activeTab === 'gnss' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '14px 16px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#146b80', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Continuous Geodetic &amp; Kinematic GNSS Ground Stations
                </span>
                <p style={{ margin: '2px 0 12px 0', fontSize: '0.66rem', color: '#536579' }}>
                  ISRO NavIC + GPS dual-frequency carrier phase differential positioning stations.
                </p>

                <div className="sim-report-table">
                  <div className="sim-rep-row header" style={{ gridTemplateColumns: '1.4fr 1.1fr 1fr 1fr 1fr' }}>
                    <span>Station Identifier</span>
                    <span>Location Context</span>
                    <span>Displacement Rate</span>
                    <span>Carrier Lock</span>
                    <span>Status</span>
                  </div>
                  <div className="sim-rep-row" style={{ gridTemplateColumns: '1.4fr 1.1fr 1fr 1fr 1fr' }}>
                    <span style={{ fontWeight: 600, color: '#1d3044' }}>GNSS-01 (Oasis Moraine)</span>
                    <span>Southern Oasis Rim</span>
                    <span className="mono-num text-cyan">3.8 cm / month</span>
                    <span className="mono-num text-emerald">100% (NavIC/GPS)</span>
                    <span className="text-emerald font-bold">NOMINAL</span>
                  </div>
                  <div className="sim-rep-row" style={{ gridTemplateColumns: '1.4fr 1.1fr 1fr 1fr 1fr' }}>
                    <span style={{ fontWeight: 600, color: '#1d3044' }}>GNSS-02 (Ice Tongue B-4)</span>
                    <span>Northern Shear Margin</span>
                    <span className="mono-num text-red font-bold">14.1 cm / month (+12%)</span>
                    <span className="mono-num text-emerald">100% (Dual-Freq)</span>
                    <span className="text-red font-bold">SURGE DETECTED</span>
                  </div>
                  <div className="sim-rep-row" style={{ gridTemplateColumns: '1.4fr 1.1fr 1fr 1fr 1fr' }}>
                    <span style={{ fontWeight: 600, color: '#1d3044' }}>GNSS-03 (Nunatak Bedrock)</span>
                    <span>Nunatak Pinning Ridge</span>
                    <span className="mono-num text-emerald">0.2 cm / month (Rebound)</span>
                    <span className="mono-num text-emerald">100% (Geodetic)</span>
                    <span className="text-emerald font-bold">LOCKED REF</span>
                  </div>
                  <div className="sim-rep-row" style={{ gridTemplateColumns: '1.4fr 1.1fr 1fr 1fr 1fr' }}>
                    <span style={{ fontWeight: 600, color: '#1d3044' }}>GNSS-04 (Priyadarshini / Coastal)</span>
                    <span>Basin Discharge Margin</span>
                    <span className="mono-num text-cyan">4.1 cm / month</span>
                    <span className="mono-num text-emerald">99.8%</span>
                    <span className="text-emerald font-bold">NOMINAL</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: '#f4f7f9', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={14} className="text-cyan animate-pulse" />
                  <span style={{ fontSize: '0.72rem', color: '#1d3044' }}>
                    Kinematic Positioning Accuracy: <strong>Horizontal ±1.8 mm | Vertical ±3.2 mm (Epoch Rate: 1 Hz)</strong>
                  </span>
                </div>
                <span style={{ fontSize: '0.66rem', color: '#146b80', fontWeight: 700 }}>
                  ISRO Space Applications Centre (SAC) Real-Time Correction Feed
                </span>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 4: AI MULTIMODAL FINDINGS & DIRECTIVES
              ================================================================ */}
          {activeTab === 'directives' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="sim-directives-box" style={{ background: '#f4f7f9', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                <div className="directive-block">
                  <span className="dir-tag text-cyan">PHYSICAL MECHANISM CAUSALITY &amp; SYNTHESIS:</span>
                  <p className="dir-text" style={{ fontSize: '0.74rem', lineHeight: '1.45' }}>
                    Multi-sensor fusion (SAR backscatter, TIR skin temperature, and Kinematic GNSS) demonstrates that localized atmospheric thermal inversion (+1.3°C anomaly) coupled with sustained katabatic wind shear (peak 76 km/h) reduced basal firn shear resistance by 6.2%. This triggered a transient seaward acceleration of 16.8 m/yr along the northern ice tongue. Bedrock pinning at Nunatak N-2 remains uncompromised, precluding structural ice shelf breakup.
                  </p>
                </div>
              </div>

              <div style={{ background: '#f4f7f9', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '12px 14px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#946013', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Mandatory Expedition Directives &amp; Field Actions:
                </span>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem', color: '#1d3044' }}>
                  <li>
                    <strong>Directive GL-01:</strong> Task resident glaciology field team to increase GNSS stake survey frequency from bi-weekly to 48-hour continuous kinematic logging.
                  </li>
                  <li>
                    <strong>Directive GL-02:</strong> Deploy ground-penetrating radar (GPR) across transverse line B-4 prior to dispatching heavy PistenBully vehicle convoys.
                  </li>
                  <li>
                    <strong>Directive GL-03:</strong> Sync real-time strain telemetry with National Centre for Polar and Ocean Research (NCPOR / MoES, Goa).
                  </li>
                  <li>
                    <strong>Directive GL-04:</strong> Maintain automated optical albedo logging on Weather Station AWS-01 to detect early melt pond formation.
                  </li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* ==================================================================
            MODAL FOOTER ACTIONS BAR
            ================================================================== */}
        <div className="report-modal-footer">
          <div className="report-footer-left">
            <span className="footer-status-pill online">
              <span className="dot" />
              SATELLITE TELEMETRY SYNCHRONIZED
            </span>
            <span className="footer-time-text">
              Last Pass: {formatStationTime(new Date(), stationId)} ({getStationTimezoneLabel(stationId)})
            </span>
          </div>

          <div className="report-footer-right">
            <button 
              type="button" 
              className="report-btn-action" 
              onClick={handleDownloadGeoJSON}
            >
              <Download size={13} />
              <span>Export Scientific GeoJSON</span>
            </button>
            <button 
              type="button" 
              className="btn-drilldown-primary" 
              onClick={onClose}
            >
              <CheckCircle2 size={13} />
              <span>Acknowledge &amp; Close</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
