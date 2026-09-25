import React from 'react';
import { 
  CloudSnow, 
  Wind, 
  Compass, 
  Droplets, 
  Gauge,
  ArrowUpRight,
  Thermometer
} from 'lucide-react';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';

export default function WeatherOverview({ weather: weatherProp, onOpenForecast, selectedStation = 'Maitri Station' }) {
  const weather = weatherProp || {
    temp: '-18.7',
    unit: '°C',
    condition: 'Light Snow',
    windSpeed: '28 km/h',
    windDir: 'NW',
    humidity: '68%',
    pressure: '987 hPa'
  };

  return (
    <div className="weather-overview-section polaris-card">
      <div className="card-header-simple">
        <span className="card-title">WEATHER OVERVIEW</span>
      </div>

      {/* Main Big Weather Display */}
      <ExpandableTelemetryCard
        title="Ambient Polar Weather"
        category="METEOROLOGICAL OBS"
        value={`${weather.temp}${weather.unit}`}
        status="nominal"
        icon={CloudSnow}
        color="#146b80"
        subtext={`Current Condition: ${weather.condition}`}
        details={[
          { label: 'Surface Temperature', value: `${weather.temp}${weather.unit}`, color: '#146b80' },
          { label: 'Weather Condition', value: weather.condition, color: '#1d3044' },
          { label: 'Wind Chill Factor', value: '-31.5°C', color: '#60a5fa' },
          { label: 'Barometric Trend', value: `${weather.pressure} (Stable)`, color: '#187451' },
        ]}
        interpretation="Overwintering polar atmospheric station reading from the sonic anemometer and automated weather station (AWS)."
        recommendation="Outer expedition EVA permits valid with thermal protective gear Category 4."
        stationName={selectedStation}
        className="weather-main-hero-wrapper"
      >
        <div className="weather-main-hero">
          <div className="weather-hero-left">
            {/* Animated Snow Cloud Icon */}
            <div className="weather-cloud-wrap">
              <svg className="snow-cloud-svg" viewBox="0 0 54 44" fill="none">
                <path 
                  d="M38 18C37.5 10 30 6 23 9C17 6 9 12 11 19C5 21 4 29 10 32C12 33 40 33 42 32C47 30 48 22 42 19C40 18.5 39 18 38 18Z" 
                  fill="#146b80"
                  fillOpacity="0.2" 
                  stroke="#146b80"
                  strokeWidth="1.8" 
                  strokeLinejoin="round" 
                />
                {/* Falling Snowflakes */}
                <circle cx="16" cy="38" r="1.5" fill="#ffffff" className="flake-anim flake-1" />
                <circle cx="27" cy="40" r="1.8" fill="#ffffff" className="flake-anim flake-2" />
                <circle cx="37" cy="38" r="1.5" fill="#ffffff" className="flake-anim flake-3" />
              </svg>
            </div>
          </div>

          <div className="weather-hero-right">
            <div className="weather-temp-row">
              <span className="temp-number mono-num">{weather.temp}</span>
              <span className="temp-unit">{weather.unit}</span>
            </div>
            <div className="weather-condition-label">{weather.condition}</div>
          </div>
        </div>
      </ExpandableTelemetryCard>

      {/* Weather Parameters Table */}
      <div className="weather-params-list">
        {/* Param 1: Wind Speed */}
        <ExpandableTelemetryCard
          title="Surface Wind Velocity"
          category="ANEMOMETRY"
          value={weather.windSpeed}
          status="nominal"
          icon={Wind}
          color="#245b82"
          details={[
            { label: 'Sustained Wind', value: weather.windSpeed, color: '#245b82' },
            { label: '3-Second Gust', value: '42 km/h', color: '#946013' },
            { label: 'Beaufort Scale', value: 'Force 5 (Fresh Breeze)', color: '#146b80' },
          ]}
          interpretation="Wind velocity is sufficient for wind turbine generation while within safe structural aerodynamic tolerances."
          stationName={selectedStation}
          className="weather-param-row-wrapper"
        >
          <div className="weather-param-row">
            <div className="param-label-wrap">
              <Wind size={13} className="param-icon" />
              <span className="param-label">Wind Speed</span>
            </div>
            <span className="param-value mono-num">{weather.windSpeed}</span>
          </div>
        </ExpandableTelemetryCard>

        {/* Param 2: Wind Direction */}
        <ExpandableTelemetryCard
          title="Wind Direction Vector"
          category="METEOROLOGY"
          value={weather.windDir}
          status="nominal"
          icon={Compass}
          color="#146b80"
          details={[
            { label: 'Compass Cardinal', value: weather.windDir, color: '#146b80' },
            { label: 'Azimuth Angle', value: '315° (North-West)', color: '#1d3044' },
            { label: 'Katabatic Vector', value: 'Inland Continental Flow', color: '#187451' },
          ]}
          interpretation="North-westerly polar airflow channelled by the Schirmacher Oasis / Larsemann terrain ridge."
          stationName={selectedStation}
          className="weather-param-row-wrapper"
        >
          <div className="weather-param-row">
            <div className="param-label-wrap">
              <Compass size={13} className="param-icon" />
              <span className="param-label">Wind Direction</span>
            </div>
            <span className="param-value mono-num">{weather.windDir}</span>
          </div>
        </ExpandableTelemetryCard>

        {/* Param 3: Relative Humidity */}
        <ExpandableTelemetryCard
          title="Atmospheric Relative Humidity"
          category="HYGROMETRY"
          value={weather.humidity}
          status="nominal"
          icon={Droplets}
          color="#147889"
          details={[
            { label: 'Relative Humidity', value: weather.humidity, color: '#147889' },
            { label: 'Dew Point', value: '-23.5°C', color: '#146b80' },
            { label: 'Vapor Pressure', value: '0.84 hPa', color: '#536579' },
          ]}
          interpretation="Dry Antarctic atmosphere prevents excessive ice accretion on radomes and solar collectors."
          stationName={selectedStation}
          className="weather-param-row-wrapper"
        >
          <div className="weather-param-row">
            <div className="param-label-wrap">
              <Droplets size={13} className="param-icon" />
              <span className="param-label">Humidity</span>
            </div>
            <span className="param-value mono-num">{weather.humidity}</span>
          </div>
        </ExpandableTelemetryCard>

        {/* Param 4: Barometric Pressure */}
        <ExpandableTelemetryCard
          title="Station Barometric Pressure"
          category="BAROMETRY"
          value={weather.pressure}
          status="nominal"
          icon={Gauge}
          color="#187451"
          details={[
            { label: 'Station Pressure', value: weather.pressure, color: '#187451' },
            { label: 'Sea Level Adjusted (QNH)', value: '1004 hPa', color: '#146b80' },
            { label: '3-Hour Tendency', value: '+0.4 hPa (Rising Slowly)', color: '#187451' },
          ]}
          interpretation="Barometric pressure trend confirms steady anti-cyclonic polar ridge conditions without imminent storm formation."
          stationName={selectedStation}
          className="weather-param-row-wrapper"
        >
          <div className="weather-param-row">
            <div className="param-label-wrap">
              <Gauge size={13} className="param-icon" />
              <span className="param-label">Pressure</span>
            </div>
            <span className="param-value mono-num">{weather.pressure}</span>
          </div>
        </ExpandableTelemetryCard>
      </div>

      {/* Forecast Link */}
      <div className="weather-card-footer">
        <button 
          className="detailed-forecast-link"
          onClick={onOpenForecast}
        >
          <span>Detailed Forecast</span>
          <span className="forecast-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
