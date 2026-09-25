import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
export default function ResourceTrend({ trendData, selectedStation = 'station-maitri' }) {
  const [selectedResource, setSelectedResource] = useState('Fuel');

  const resourceOptions = ['Fuel', 'Food', 'Water', 'Medical Oxygen'];

  const isBharati = selectedStation === 'station-bharati';
  const stationName = isBharati ? 'Bharati Station' : 'Maitri Station';

  const defaultData = isBharati ? {
    yMax: '100k L',
    yMid: '75k L',
    yLow: '50k L',
    depletionDate: '28 Aug 2025',
    actualPath: 'M 50,38 L 95,44 L 140,50 L 185,58 L 230,64',
    actualPoints: [[50,38], [95,44], [140,50], [185,58], [230,64]],
    forecastPath: 'M 230,64 L 275,76 L 320,88',
    forecastPoints: [[275,76], [320,88]],
    boxY: 48,
  } : {
    yMax: '75k L',
    yMid: '50k L',
    yLow: '25k L',
    depletionDate: '15 Jul 2025',
    actualPath: 'M 50,48 L 95,58 L 140,68 L 185,78 L 230,88',
    actualPoints: [[50,48], [95,58], [140,68], [185,78], [230,88]],
    forecastPath: 'M 230,88 L 275,102 L 320,118',
    forecastPoints: [[275,102], [320,118]],
    boxY: 68,
  };

  const data = trendData || defaultData;
  const actualPoints = data.actualPoints || [[50,48], [95,58], [140,68], [185,78], [230,88]];
  const forecastPoints = data.forecastPoints || [[275,102], [320,118]];

  return (
    <div className="resource-trend-card polaris-card">
      {/* Header with Selector */}
      <div className="card-header-with-selector">
        <span className="card-title">RESOURCE TREND (30 DAYS)</span>
        <div className="custom-select-wrap" onClick={(e) => e.stopPropagation()}>
          <select 
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="resource-select"
          >
            {resourceOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={12} className="select-chevron-icon" />
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="trend-chart-container">
        <svg viewBox="0 0 340 135" className="trend-svg-chart">
          {/* Subtle Grid Lines */}
          <line x1="45" y1="20" x2="330" y2="20" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <line x1="45" y1="55" x2="330" y2="55" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <line x1="45" y1="90" x2="330" y2="90" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          
          {/* Y-Axis Labels */}
          <text x="38" y="23" fill="#64748b" fontSize="8.5" textAnchor="end" className="mono-num">{data.yMax}</text>
          <text x="38" y="58" fill="#64748b" fontSize="8.5" textAnchor="end" className="mono-num">{data.yMid}</text>
          <text x="38" y="93" fill="#64748b" fontSize="8.5" textAnchor="end" className="mono-num">{data.yLow}</text>

          {/* Red Critical Threshold Line */}
          <line x1="45" y1="90" x2="330" y2="90" stroke="#b73b37" strokeWidth="1.2" strokeDasharray="4 3" />
          
          {/* Projected Depletion Label Box */}
          <g transform={`translate(240, ${data.boxY || 68})`}>
            <rect x="0" y="0" width="85" height="19" rx="3" fill="#0d192e" stroke="#b73b37" strokeWidth="0.8" />
            <text x="42.5" y="8" fill="#94a3b8" fontSize="6" textAnchor="middle">Projected Depletion</text>
            <text x="42.5" y="15" fill="#b73b37" fontSize="7" fontWeight="bold" textAnchor="middle" className="mono-num">{data.depletionDate}</text>
          </g>

          {/* Actual Consumption Path (Solid Blue) */}
          <path
            d={data.actualPath}
            fill="none"
            stroke="#146b80"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Actual Data Points */}
          {actualPoints.map((pt, i) => (
            <circle 
              key={i} 
              cx={pt[0]} 
              cy={pt[1]} 
              r={i === actualPoints.length - 1 ? 3 : 2.5} 
              fill={i === actualPoints.length - 1 ? '#ffffff' : '#146b80'}
              stroke={i === actualPoints.length - 1 ? '#146b80' : 'none'}
              strokeWidth={i === actualPoints.length - 1 ? 2 : 0}
            />
          ))}

          {/* Forecast Trajectory Path (Dashed Blue) */}
          <path
            d={data.forecastPath}
            fill="none"
            stroke="#146b80"
            strokeWidth="2.2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          {forecastPoints.map((pt, i) => (
            <circle key={i} cx={pt[0]} cy={pt[1]} r="2.5" fill="none" stroke="#146b80" strokeWidth="1.5" />
          ))}

          {/* X-Axis Horizontal Base Line */}
          <line x1="45" y1="112" x2="330" y2="112" stroke="rgba(255, 255, 255, 0.1)" />

          {/* X-Axis Tick Labels */}
          <text x="50" y="124" fill="#64748b" fontSize="8" textAnchor="middle">25 Apr</text>
          <text x="95" y="124" fill="#64748b" fontSize="8" textAnchor="middle">2 May</text>
          <text x="140" y="124" fill="#64748b" fontSize="8" textAnchor="middle">9 May</text>
          <text x="185" y="124" fill="#64748b" fontSize="8" textAnchor="middle">16 May</text>
          <text x="230" y="124" fill="#64748b" fontSize="8" textAnchor="middle">23 May</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="chart-legend-row">
        <div className="legend-item">
          <span className="legend-line-solid" />
          <span className="legend-text">Actual</span>
        </div>
        <div className="legend-item">
          <span className="legend-line-dashed" />
          <span className="legend-text">Forecast</span>
        </div>
      </div>
    </div>
  );
}
