import React, { useState } from 'react';
import { RefreshCw, Thermometer, Wind, CloudSnow, Eye, ExternalLink } from 'lucide-react';
import { formatStationTime } from '../utils/timeUtils';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';

export default function EnvironmentalConditions({ weather, sparklines, selectedStation = 'station-maitri' }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => formatStationTime(new Date(), selectedStation, { hour: '2-digit', minute: '2-digit' }));

  const handleRefresh = (e) => {
    e.stopPropagation();
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setLastUpdated(formatStationTime(now, selectedStation, { hour: '2-digit', minute: '2-digit' }));
      setIsRefreshing(false);
    }, 600);
  };

  const currentTemp = weather?.temp ? `${weather.temp}${weather.unit || '°C'}` : '-18.7°C';
  const currentWind = weather?.windSpeed || '28 km/h';
  const currentSnow = weather?.snowAccumulation || '12 cm';
  const currentVis = weather?.visibility || '4.8 km';

  const defaultSparklines = {
    temp: 'M0,14 C15,8 25,20 40,12 C55,4 65,18 80,10 C95,2 105,16 120,8 C130,4 140,12 150,9',
    wind: 'M0,18 C20,12 35,2 50,15 C65,22 80,6 95,14 C110,18 125,5 138,10 C145,12 148,8 150,11',
    snow: 'M0,20 C18,19 32,18 50,15 C70,12 90,14 110,9 C125,7 135,11 150,6',
    visibility: 'M0,8 C15,9 30,12 45,18 C60,22 75,19 90,14 C105,10 120,16 135,13 C142,12 148,15 150,14',
  };

  const activeSparklines = sparklines || defaultSparklines;

  const sparklineData = [
    {
      id: 'temp',
      label: 'Temperature',
      value: currentTemp,
      icon: Thermometer,
      color: '#146b80',
      path: activeSparklines.temp || defaultSparklines.temp,
      details: [
        { label: 'Current Temp', value: currentTemp, color: '#146b80' },
        { label: 'Wind Chill Index', value: '-32.4°C', color: '#60a5fa' },
        { label: '24h High / Low', value: '-14.2°C / -24.8°C', color: '#536579' },
        { label: 'Inversion Layer', value: '+120m AGL', color: '#187451' },
      ],
      interpretation: 'Polar surface thermal telemetry remains within seasonal winter operational ranges with slight evening radiative cooling.',
    },
    {
      id: 'wind',
      label: 'Wind Speed',
      value: currentWind,
      icon: Wind,
      color: '#245b82',
      path: activeSparklines.wind || defaultSparklines.wind,
      details: [
        { label: 'Sustained Velocity', value: currentWind, color: '#245b82' },
        { label: 'Peak Gust (1h)', value: '44 km/h', color: '#946013' },
        { label: 'Vector Direction', value: 'South-Southwest (210°)', color: '#146b80' },
        { label: 'Katabatic Index', value: 'Moderate Slope Flow', color: '#187451' },
      ],
      interpretation: 'Katabatic airflow from the polar ice cap is steady with moderate turbulence on wind turbine nacelles.',
    },
    {
      id: 'snow',
      label: 'Snow Accumulation',
      value: currentSnow,
      icon: CloudSnow,
      color: '#60a5fa',
      path: activeSparklines.snow || defaultSparklines.snow,
      details: [
        { label: 'Drift Depth', value: currentSnow, color: '#60a5fa' },
        { label: '24h Accumulation', value: '+3.5 cm', color: '#146b80' },
        { label: 'Snowpack Density', value: '380 kg/m³', color: '#536579' },
        { label: 'Airlock Ingress Clearance', value: 'Clear / De-Iced', color: '#187451' },
      ],
      interpretation: 'Slight drifting noted along the western utility corridor; snow clearance teams on standard standby.',
    },
    {
      id: 'visibility',
      label: 'Atmospheric Visibility',
      value: currentVis,
      icon: Eye,
      color: '#4f7132',
      path: activeSparklines.visibility || defaultSparklines.visibility,
      details: [
        { label: 'Optical Range', value: currentVis, color: '#4f7132' },
        { label: 'Cloud Ceiling', value: '850m Overcast', color: '#536579' },
        { label: 'LIDAR Backscatter', value: '0.04 km⁻¹', color: '#146b80' },
        { label: 'Aviation Status', value: 'VFR Caution', color: '#946013' },
      ],
      interpretation: 'Atmospheric optical sensors indicate clear polar boundary layer with slight ice-crystal haze.',
    },
  ];

  return (
    <div className="environmental-conditions-section polaris-card">
      <div className="card-header-simple">
        <span className="card-title">ENVIRONMENTAL CONDITIONS</span>
      </div>

      <div className="environmental-sparklines-list">
        {sparklineData.map((item) => {
          const Icon = item.icon;
          return (
            <ExpandableTelemetryCard
              key={item.id}
              title={`${item.label} (${selectedStation === 'station-bharati' ? 'Bharati' : 'Maitri'})`}
              category="METEOROLOGICAL SENSOR"
              value={item.value}
              status="nominal"
              icon={Icon}
              color={item.color}
              subtext="Real-time automated Antarctic meteorological telemetry"
              details={item.details}
              sparkline={
                <svg viewBox="0 0 380 60" style={{ width: '100%', height: '60px' }}>
                  <path
                    d="M 0,35 Q 60,10 120,40 T 240,20 T 380,30"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="2.5"
                  />
                  <circle cx="380" cy="30" r="4" fill={item.color} />
                </svg>
              }
              interpretation={item.interpretation}
              recommendation="All external weather sensor telemetry is synchronized with the India HQ Central Database."
              stationName={selectedStation}
              className="env-sparkline-row-wrapper"
            >
              <div className="env-sparkline-row">
                <div className="env-meta-wrap">
                  <div className="env-label-row">
                    <Icon size={12} className="env-row-icon" />
                    <span className="env-row-label">{item.label}</span>
                  </div>
                  {item.value && (
                    <span className="env-row-value mono-num">{item.value}</span>
                  )}
                </div>

                {/* Sparkline Waveform SVG */}
                <div className="sparkline-chart-wrap">
                  <svg viewBox="0 0 150 24" className="sparkline-svg" preserveAspectRatio="none">
                    <path
                      d={item.path}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Glowing end point dot */}
                    <circle cx="150" cy="9" r="2.5" fill={item.color} />
                  </svg>
                </div>
              </div>
            </ExpandableTelemetryCard>
          );
        })}
      </div>

      <div className="environmental-footer">
        <span className="last-updated-text">
          Last Updated: <span className="mono-num">{lastUpdated}</span>
        </span>
        <button 
          className={`refresh-icon-btn ${isRefreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh Conditions"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  );
}
