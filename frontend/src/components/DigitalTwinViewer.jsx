import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Target, 
  Eye, 
  Sun, 
  Moon, 
  Compass, 
  Layers, 
  Info,
  Maximize2,
  X,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Thermometer,
  ShieldCheck
} from 'lucide-react';

import { STATIONS_DATA } from '../data/stationsData';

export default function DigitalTwinViewer({ selectedStation = 'station-maitri', stationData: stationDataProp, onSelectPin }) {
  const [viewMode, setViewMode] = useState('3D'); // '3D' or '2D'
  const [isNightMode, setIsNightMode] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [activeModule, setActiveModule] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const canvasRef = useRef(null);

  const currentStation = stationDataProp || STATIONS_DATA[selectedStation] || STATIONS_DATA['station-maitri'];
  const stationName = currentStation.name;
  const stationImage = currentStation.heroImage;
  const currentPins = currentStation.pins || [];

  // Snow Particle Canvas Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.8 + 0.5,
      speedX: Math.random() * 1.5 - 2, // blowing leftwards
      speedY: Math.random() * 1.2 + 0.8,
      opacity: Math.random() * 0.6 + 0.2
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 245, 255, ${p.opacity})`;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) {
          p.y = 0;
          p.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handlePinClick = (pin, e) => {
    e.stopPropagation();
    setActiveModule(pin);
    if (onSelectPin) onSelectPin(pin);
  };

  const handleRecenter = () => {
    setZoomLevel(1);
    setActiveModule(null);
  };

  return (
    <div className="digital-twin-card polaris-card">
      {/* Top Header Bar inside 3D Viewer */}
      <div className="twin-header-bar">
        <div className="twin-title-wrap">
          <span className="twin-title-text">{stationName} STATION – 3D DIGITAL TWIN</span>
          <span className="twin-live-pill">
            <span className="live-dot" /> LIVE
          </span>
        </div>

        {/* Viewport Control Toolbar */}
        <div className="twin-controls-toolbar">
          <button 
            className="control-icon-btn" 
            title="Reset View / Camera"
            onClick={handleRecenter}
          >
            <Camera size={14} />
          </button>
          <button 
            className="control-icon-btn" 
            title="Recenter & Focus"
            onClick={handleRecenter}
          >
            <Target size={14} />
          </button>
          <button 
            className={`control-icon-btn ${showLayers ? 'active' : ''}`} 
            title="Toggle Pins / Telemetry Layers"
            onClick={() => setShowLayers(!showLayers)}
          >
            <Eye size={14} />
          </button>
          <button 
            className={`control-icon-btn ${isNightMode ? 'active' : ''}`} 
            title="Toggle Polar Night / Daylight Lighting"
            onClick={() => setIsNightMode(!isNightMode)}
          >
            {isNightMode ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          
          {/* 2D / 3D Toggle Pill */}
          <button 
            className="mode-toggle-btn"
            onClick={() => setViewMode(viewMode === '3D' ? '2D' : '3D')}
          >
            {viewMode}
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div 
        className={`twin-viewport ${isNightMode ? 'night-filter' : ''} ${viewMode === '2D' ? 'mode-2d' : ''}`}
        onClick={() => setActiveModule(null)}
      >
        {/* Background Visual Scene */}
        <div 
          className="twin-visual-canvas" 
          style={{ 
            backgroundImage: `url(${stationImage})`,
            transform: `scale(${zoomLevel})`
          }}
        >
          {/* 3D Grid Overlay in 2D/3D Mode */}
          <div className="twin-grid-overlay" />
          
          {/* Drifting Snow Particles */}
          <canvas ref={canvasRef} className="snow-particle-canvas" />

          {/* Visual Building Pins */}
          {showLayers && currentPins.map((pin) => {
            const isWarning = pin.type === 'warning';

            return (
              <div
                key={pin.id}
                className={`twin-pin-marker ${isWarning ? 'pin-warning' : 'pin-normal'}`}
                style={{ top: pin.top, left: pin.left }}
              >
                <div className="pin-pill-box">
                  <span className="pin-title-name">{pin.name}</span>
                  <div className="pin-status-tag">
                    {isWarning ? (
                      <>
                        <span className="warn-dot" />
                        <span className="tag-text warning-text">Warning</span>
                      </>
                    ) : (
                      <>
                        <span className="live-dot" />
                        <span className="tag-text normal-text">Normal</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Pointer Stem */}
                <div className="pin-stem" />
                <div className="pin-anchor-dot" />
              </div>
            );
          })}
        </div>

        {/* Compass Rose Widget (Bottom-Left) */}
        <div className="twin-compass-widget">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1.2" strokeDasharray="3 3" />
            <circle cx="22" cy="22" r="16" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" />
            {/* North Red Needle */}
            <polygon points="22,6 25.5,22 18.5,22" fill="#b73b37" />
            {/* South Silver Needle */}
            <polygon points="22,38 25.5,22 18.5,22" fill="#94a3b8" />
            {/* Center Hub */}
            <circle cx="22" cy="22" r="2.5" fill="#ffffff" />
            <text x="22" y="5" fill="#b73b37" fontSize="6.5" fontWeight="bold" textAnchor="middle">N</text>
            <text x="40" y="24" fill="#64748b" fontSize="6.5" fontWeight="bold" textAnchor="middle">E</text>
            <text x="22" y="43" fill="#64748b" fontSize="6.5" fontWeight="bold" textAnchor="middle">S</text>
            <text x="4" y="24" fill="#64748b" fontSize="6.5" fontWeight="bold" textAnchor="middle">W</text>
          </svg>
        </div>

        {/* Selected Module Detail Popover */}
        {activeModule && (
          <div className="module-detail-popover" onClick={(e) => e.stopPropagation()}>
            <div className="popover-header">
              <div className="popover-title-row">
                <span className="popover-module-name">{activeModule.name}</span>
                <span className={`popover-status-badge ${activeModule.type}`}>
                  {activeModule.status}
                </span>
              </div>
              <button 
                className="popover-close-btn"
                onClick={() => setActiveModule(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="popover-subsystem">{activeModule.subsystem}</div>

            <div className="popover-stats-grid">
              <div className="popover-stat-box">
                <span className="p-stat-label">
                  <Thermometer size={11} /> Temp
                </span>
                <span className="p-stat-val mono-num">{activeModule.temp}</span>
              </div>
              <div className="popover-stat-box">
                <span className="p-stat-label">
                  <Zap size={11} /> Power
                </span>
                <span className="p-stat-val mono-num">{activeModule.power}</span>
              </div>
              <div className="popover-stat-box">
                <span className="p-stat-label">
                  <ShieldCheck size={11} /> Pressure
                </span>
                <span className="p-stat-val mono-num">{activeModule.pressure}</span>
              </div>
            </div>

            <p className="popover-notes">{activeModule.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
