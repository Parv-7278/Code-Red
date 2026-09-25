import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Box, 
  Layers, 
  Zap, 
  Activity, 
  ShieldCheck, 
  ShieldAlert,
  AlertTriangle, 
  Search,
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Users, 
  Wind, 
  Lock, 
  Unlock, 
  Sliders, 
  CheckCircle2, 
  Thermometer, 
  Radio, 
  Cpu, 
  Power, 
  Flame, 
  Droplet, 
  Server, 
  Compass, 
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  ExternalLink,
  Info,
  Waves,
  BatteryCharging
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePredictive } from '../context/PredictiveContext';
import { getStationLayout } from '../data/stationLayouts';
import './StationDigitalTwinMap.css';

function splitRoomLabel(label) {
  if (!label || label.length <= 21) return [label];
  const words = label.split(' ');
  const lines = ['', ''];
  for (const word of words) {
    const firstCandidate = `${lines[0]} ${word}`.trim();
    if (!lines[1] && firstCandidate.length <= Math.ceil(label.length / 2) + 3) lines[0] = firstCandidate;
    else lines[1] = `${lines[1]} ${word}`.trim();
  }
  return lines.filter(Boolean).slice(0, 2);
}

export default function StationDigitalTwinMap({ selectedStation = 'station-maitri', onRoomSelect }) {
  const { role, isStationOperator, assignedStation } = useAuth();
  const predictiveContext = usePredictive ? usePredictive() : null;

  // Determine effective station ID (station operators are locked to their station)
  const effectiveStationId = useMemo(() => {
    if (isStationOperator && assignedStation) {
      return assignedStation;
    }
    if (selectedStation === 'all-stations' || selectedStation === 'all' || !selectedStation) {
      return 'station-maitri';
    }
    return selectedStation;
  }, [isStationOperator, assignedStation, selectedStation]);

  // Load station-specific layout configuration
  const stationLayout = useMemo(() => {
    return getStationLayout(effectiveStationId);
  }, [effectiveStationId]);

  // Dynamic state populated from layout data
  const [rooms, setRooms] = useState(() => stationLayout.rooms);
  const [doors, setDoors] = useState(() => stationLayout.doors);
  const [selectedRoomId, setSelectedRoomId] = useState(() => stationLayout.defaultSelectedRoomId);
  
  // Transition fade state during station switch
  const [isFading, setIsFading] = useState(false);

  // Tactical layer modes & filters
  const [activeLayer, setActiveLayer] = useState('ALL'); // ALL, POWER, HVAC, SECURITY, CREW
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, NORMAL, WARNING, CRITICAL
  const [searchQuery, setSearchQuery] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  
  // Pan & Zoom state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const viewportRef = useRef(null);

  // Sync rooms and doors when station changes with smooth transition
  useEffect(() => {
    setIsFading(true);
    const timeout = setTimeout(() => {
      setRooms(stationLayout.rooms);
      setDoors(stationLayout.doors);
      setSelectedRoomId(stationLayout.defaultSelectedRoomId);
      setIsFading(false);
    }, 120);
    return () => clearTimeout(timeout);
  }, [stationLayout]);

  // Play synthetic HUD audio beep on interaction if unmuted
  const playAudioBeep = (freq = 800, type = 'sine', duration = 0.08) => {
    if (isAudioMuted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio context errors if blocked by browser policy
    }
  };

  // Selected room object
  const selectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId) || rooms[0] || null;
  }, [rooms, selectedRoomId]);

  // Handle room selection
  const handleSelectRoom = (room) => {
    setSelectedRoomId(room.id);
    playAudioBeep(650, 'triangle', 0.06);
    if (onRoomSelect) {
      onRoomSelect(room);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale(prev => Math.min(Math.max(prev * zoomFactor, 0.45), 2.4));
  };

  // Drag to pan
  const handleMouseDown = (e) => {
    if (e.target.closest('.room-group') || e.target.closest('.door-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    playAudioBeep(520, 'sine', 0.05);
  };

  // Door click lock/unlock toggle
  const handleToggleDoor = (doorId, e) => {
    e.stopPropagation();
    setDoors(prev => prev.map(d => {
      if (d.id === doorId) {
        const nextState = !d.locked;
        playAudioBeep(nextState ? 350 : 880, 'square', 0.1);
        return { ...d, locked: nextState };
      }
      return d;
    }));
  };

  // Station-specific Quick Scenario Simulators
  const handleSimulateIncident = (scenarioType) => {
    const isBharati = stationLayout.stationId === 'station-bharati';

    if (scenarioType === 'MAITRI_GEN_OVERHEAT' || (scenarioType === 'PRIMARY_ALERT' && !isBharati)) {
      setRooms(prev => prev.map(r => {
        if (r.id === 'maitri-generator' || r.id === 'room-generator') {
          return { ...r, status: 'critical', temp: '+89.5°C', power: '198.0 kW', health: 48 };
        }
        if (r.id === 'maitri-power-house' || r.id === 'room-power-house') {
          return { ...r, status: 'warning', health: 74 };
        }
        return r;
      }));
      setSelectedRoomId('maitri-generator');
      playAudioBeep(220, 'sawtooth', 0.3);
    } else if (scenarioType === 'BHARATI_BATTERY_ALERT' || (scenarioType === 'PRIMARY_ALERT' && isBharati)) {
      setRooms(prev => prev.map(r => {
        if (r.id === 'bharati-bess') {
          return { ...r, status: 'critical', temp: '+38.2°C', health: 56 };
        }
        if (r.id === 'bharati-energy-block') {
          return { ...r, status: 'warning', health: 78 };
        }
        return r;
      }));
      setSelectedRoomId('bharati-bess');
      playAudioBeep(240, 'sawtooth', 0.3);
    } else if (scenarioType === 'WATER_PRESSURE_LOSS') {
      if (isBharati) {
        setRooms(prev => prev.map(r => {
          if (r.id === 'bharati-desal') return { ...r, status: 'warning', health: 71, pressure: '940 hPa' };
          return r;
        }));
        setSelectedRoomId('bharati-desal');
      } else {
        setRooms(prev => prev.map(r => {
          if (r.id === 'maitri-water' || r.id === 'room-water') return { ...r, status: 'critical', health: 52, temp: '-6.5°C' };
          return r;
        }));
        setSelectedRoomId('maitri-water');
      }
      playAudioBeep(320, 'sawtooth', 0.25);
    } else if (scenarioType === 'DATA_SERVER_ALERT') {
      const targetId = isBharati ? 'bharati-datacenter' : 'maitri-server';
      setRooms(prev => prev.map(r => {
        if (r.id === targetId || r.id === 'room-server') {
          return { ...r, status: 'warning', temp: '+31.4°C', health: 72 };
        }
        return r;
      }));
      setSelectedRoomId(targetId);
      playAudioBeep(440, 'triangle', 0.15);
    } else if (scenarioType === 'RESET_ALL') {
      setRooms(stationLayout.rooms);
      setDoors(stationLayout.doors);
      setSelectedRoomId(stationLayout.defaultSelectedRoomId);
      playAudioBeep(880, 'sine', 0.15);
    }
  };

  // Toggle single room status manually in inspector
  const handleSetRoomStatus = (roomId, newStatus) => {
    setRooms(prev => prev.map(r => {
      if (r.id === roomId) {
        return { 
          ...r, 
          status: newStatus,
          health: newStatus === 'normal' ? 98 : newStatus === 'warning' ? 82 : 45
        };
      }
      return r;
    }));
    playAudioBeep(newStatus === 'critical' ? 240 : newStatus === 'warning' ? 440 : 880, 'sine', 0.1);
  };

  // Toggle equipment item in inspector
  const handleToggleEquipment = (eqId) => {
    if (!selectedRoom) return;
    setRooms(prev => prev.map(r => {
      if (r.id === selectedRoom.id) {
        const updatedEq = r.equipment.map(eq => {
          if (eq.id === eqId) {
            return { ...eq, active: !eq.active };
          }
          return eq;
        });
        return { ...r, equipment: updatedEq };
      }
      return r;
    }));
    playAudioBeep(700, 'sine', 0.05);
  };

  // Filtered rooms for search & status filters
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchSearch = searchQuery === '' || 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.sector.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = filterStatus === 'ALL' || 
        room.status.toUpperCase() === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [rooms, searchQuery, filterStatus]);

  // Overall status tally
  const counts = useMemo(() => {
    return {
      all: rooms.length,
      normal: rooms.filter(r => r.status === 'normal').length,
      warning: rooms.filter(r => r.status === 'warning').length,
      critical: rooms.filter(r => r.status === 'critical').length,
    };
  }, [rooms]);

  // Check if active AI prediction matches a given room
  const getAiPredictionForRoom = (room) => {
    if (!predictiveContext?.predictiveData?.predictions) return null;
    const predictions = predictiveContext.predictiveData.predictions;
    
    // Look for predictions matching room subsystem or keywords
    const match = predictions.find(p => {
      const pSub = (p.subsystem || '').toLowerCase();
      const pTitle = (p.title || '').toLowerCase();
      const rName = (room.name || '').toLowerCase();
      const rId = (room.id || '').toLowerCase();

      if (rId.includes('generator') || rName.includes('generator')) {
        return pSub.includes('power') || pSub.includes('generator') || pTitle.includes('generator');
      }
      if (rId.includes('bess') || rId.includes('battery') || rName.includes('battery')) {
        return pSub.includes('battery') || pTitle.includes('battery') || pSub.includes('energy');
      }
      if (rId.includes('water') || rId.includes('desal') || rName.includes('water') || rName.includes('desal')) {
        return pSub.includes('water') || pSub.includes('environment') || pTitle.includes('water');
      }
      if (rId.includes('comms') || rId.includes('satcom') || rName.includes('satellite')) {
        return pSub.includes('telecom') || pSub.includes('comm') || pTitle.includes('satellite');
      }
      return false;
    });

    return match || null;
  };

  const isBharatiStation = stationLayout.stationId === 'station-bharati';

  return (
    <div className={`station-map-container ${isFading ? 'map-fade-transition' : ''}`}>
      {/* Top Header & Tactical Controls Toolbar */}
      <div className="station-map-toolbar">
        {/* Title & Station Architecture Badge */}
        <div className="map-title-cluster">
          <div className="map-badge-icon">
            <Box size={18} />
          </div>
          <div>
            <div className="map-title-text">
              <span className="station-title-bold">{stationLayout.stationName.toUpperCase()}</span>
              <span className="station-blueprint-tag">DIGITAL TWIN SCHEMATIC</span>
              <span className="map-live-tag">
                <span className="live-dot" /> LIVE SCADA BUS
              </span>
            </div>
            <div className="map-sub-row">
              <span className="map-sub-text">
                {stationLayout.region} // {stationLayout.architecture}
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Layer Mode Switcher */}
        <div className="map-layer-modes">
          <button 
            className={`layer-mode-btn ${activeLayer === 'ALL' ? 'active' : ''}`}
            onClick={() => { setActiveLayer('ALL'); playAudioBeep(600); }}
            title="Standard Architectural View"
          >
            <Layers size={13} /> Architecture
          </button>
          <button 
            className={`layer-mode-btn ${activeLayer === 'POWER' ? 'active' : ''}`}
            onClick={() => { setActiveLayer('POWER'); playAudioBeep(600); }}
            title="View High-Voltage Power Conduits & Feeder Grid"
          >
            <Zap size={13} /> Power Grid
          </button>
          <button 
            className={`layer-mode-btn ${activeLayer === 'HVAC' ? 'active' : ''}`}
            onClick={() => { setActiveLayer('HVAC'); playAudioBeep(600); }}
            title="View Airflow Circulation Loops & Thermal Pressure"
          >
            <Wind size={13} /> Life Support / HVAC
          </button>
          <button 
            className={`layer-mode-btn ${activeLayer === 'SECURITY' ? 'active' : ''}`}
            onClick={() => { setActiveLayer('SECURITY'); playAudioBeep(600); }}
            title="Security Doors & Airlock Seals"
          >
            <ShieldCheck size={13} /> Door Seals
          </button>
          <button 
            className={`layer-mode-btn ${activeLayer === 'CREW' ? 'active' : ''}`}
            onClick={() => { setActiveLayer('CREW'); playAudioBeep(600); }}
            title="Crew Tracking & Presence Radar"
          >
            <Users size={13} /> Crew Tracker
          </button>
        </div>

        {/* Quick Status Filter Pills */}
        <div className="map-quick-filters">
          <button 
            className={`filter-pill-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            All ({counts.all})
          </button>
          <button 
            className={`filter-pill-btn pill-norm ${filterStatus === 'NORMAL' ? 'active' : ''}`}
            onClick={() => setFilterStatus('NORMAL')}
          >
            <span className="live-dot" /> Online ({counts.normal})
          </button>
          {counts.warning > 0 && (
            <button 
              className={`filter-pill-btn pill-warn ${filterStatus === 'WARNING' ? 'active' : ''}`}
              onClick={() => setFilterStatus('WARNING')}
            >
              <span className="warn-dot" /> Warning ({counts.warning})
            </button>
          )}
          {counts.critical > 0 && (
            <button 
              className={`filter-pill-btn pill-crit ${filterStatus === 'CRITICAL' ? 'active' : ''}`}
              onClick={() => setFilterStatus('CRITICAL')}
            >
              <span className="danger-dot" /> Critical ({counts.critical})
            </button>
          )}
        </div>

        {/* Audio Feedback & Reset Actions */}
        <div className="map-toolbar-actions">
          <button 
            className={`map-action-icon-btn ${!isAudioMuted ? 'active' : ''}`}
            onClick={() => { setIsAudioMuted(!isAudioMuted); if (isAudioMuted) playAudioBeep(880); }}
            title={isAudioMuted ? 'Enable Tactical Audio Feedback' : 'Mute Tactical Audio'}
          >
            {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button 
            className="map-action-icon-btn"
            onClick={handleResetView}
            title="Recenter Map View"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Mandatory Schematic Disclaimer Ribbon */}
      <div className="schematic-disclaimer-bar">
        <Info size={13} className="text-cyan" />
        <span>{stationLayout.disclaimer}</span>
        <span className="disclaimer-station-badge">{stationLayout.shortName} DIGITAL TWIN v2.4</span>
      </div>

      {/* Main Floorplan Workspace Layout */}
      <div className="station-map-workspace">
        {/* Interactive SVG Floorplan Viewport */}
        <div 
          className={`station-map-viewport ${isDragging ? 'panning' : ''}`}
          ref={viewportRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Subtle Cyber Grid Texture */}
          <div className="map-cyber-grid" />

          {/* Polar HUD Corner Coordinates */}
          <div className="hud-corner-coords hud-top-left">
            POLARIS-{stationLayout.shortName} // {stationLayout.region}
          </div>
          <div className="hud-corner-coords hud-top-right">
            SCADA REFRESH: 100ms // DUAL FIBER BUS
          </div>
          <div className="hud-corner-coords hud-bottom-left">
            STATUS: NOMINAL // ENCRYPTED TELEMETRY MESH
          </div>
          <div className="hud-corner-coords hud-bottom-right">
            ZOOM: {(scale * 100).toFixed(0)}% // DRAG TO PAN
          </div>

          {/* SVG Floorplan Canvas Layer */}
          <svg 
            className="floorplan-svg" 
            viewBox={`0 0 ${stationLayout.viewBox?.width || 1650} ${stationLayout.viewBox?.height || 1000}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`
            }}
          >
            <defs>
              {/* Hatch Pattern for Grated Floors */}
              <pattern id="floor-grate" width="12" height="12" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="12" y2="12" stroke="#1e3a5f" strokeWidth="1" />
                <line x1="12" y1="0" x2="0" y2="12" stroke="#1e3a5f" strokeWidth="1" />
              </pattern>

              {/* Modern Dots Pattern for High-Tech Floors */}
              <pattern id="floor-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="8" cy="8" r="1.5" fill="#1e3a5f" opacity="0.8" />
              </pattern>

              {/* Power Grid Glow Filter */}
              <filter id="glow-power" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Cyan Hologram Glow Filter */}
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ========================================================= */}
            {/* 1. CORRIDORS & INTERCONNECTING TUNNELS (Station-Specific) */}
            {/* ========================================================= */}
            <g className="corridors-network-group">
              {stationLayout.corridors.map(corr => (
                <g key={corr.id} className="corridor-segment">
                  <rect 
                    x={corr.x} 
                    y={corr.y} 
                    width={corr.w} 
                    height={corr.h} 
                    rx="8" 
                    className="corridor-path" 
                  />
                  {corr.w > corr.h ? (
                    <line 
                      x1={corr.x + 10} 
                      y1={corr.y + corr.h / 2} 
                      x2={corr.x + corr.w - 10} 
                      y2={corr.y + corr.h / 2} 
                      className="corridor-inner-line" 
                    />
                  ) : (
                    <line 
                      x1={corr.x + corr.w / 2} 
                      y1={corr.y + 10} 
                      x2={corr.x + corr.w / 2} 
                      y2={corr.y + corr.h - 10} 
                      className="corridor-inner-line" 
                    />
                  )}
                  {corr.label && (
                    <text 
                      x={corr.x + corr.w / 2} 
                      y={corr.y + corr.h / 2 + 3} 
                      className="corridor-label-text"
                    >
                      {corr.label.toUpperCase()}
                    </text>
                  )}
                </g>
              ))}
            </g>

            {/* ========================================================= */}
            {/* 2. POWER GRID & HVAC OVERLAY LAYERS (When toggled) */}
            {/* ========================================================= */}
            {activeLayer === 'POWER' && (
              <g className="power-overlay-group" filter="url(#glow-power)">
                {isBharatiStation ? (
                  // Bharati Integrated Microgrid overlay
                  <>
                    <path d="M 330 330 L 600 330 L 600 500 L 1280 500" className="power-conduit-line" />
                    <path d="M 330 670 L 600 670 L 600 500" className="power-conduit-line" />
                    <path d="M 600 500 L 800 500 L 800 200 L 1050 200" className="power-conduit-line" />
                    <path d="M 800 500 L 800 780 L 1150 780" className="power-conduit-line" />
                    <circle cx="330" cy="330" r="8" fill="#946013" />
                    <circle cx="330" cy="670" r="8" fill="#187451" />
                    <circle cx="800" cy="500" r="6" fill="#946013" />
                  </>
                ) : (
                  // Maitri Diesel Substation grid overlay
                  <>
                    <path d="M 600 750 L 600 680 L 800 680 L 800 410 L 570 410 L 570 310" className="power-conduit-line" />
                    <path d="M 600 680 L 230 680 L 230 150 L 370 150" className="power-conduit-line" />
                    <path d="M 800 680 L 1200 680 L 1200 410 L 1340 410" className="power-conduit-line" />
                    <path d="M 800 410 L 800 230 L 670 230" className="power-conduit-line" />
                    <path d="M 800 230 L 990 230" className="power-conduit-line" />
                    <path d="M 600 750 L 320 750" className="power-conduit-line" />
                    <circle cx="600" cy="750" r="8" fill="#946013" />
                    <circle cx="320" cy="750" r="8" fill="#946013" />
                    <circle cx="800" cy="680" r="6" fill="#946013" />
                  </>
                )}
              </g>
            )}

            {activeLayer === 'HVAC' && (
              <g className="hvac-overlay-group">
                {isBharatiStation ? (
                  <>
                    <path d="M 270 500 L 1370 500" className="hvac-airflow-line" />
                    <path d="M 520 230 L 1230 230" className="hvac-airflow-line" />
                    <path d="M 520 770 L 1230 770" className="hvac-airflow-line" />
                  </>
                ) : (
                  <>
                    <path d="M 370 190 L 1230 190" className="hvac-airflow-line" />
                    <path d="M 270 410 L 1340 410" className="hvac-airflow-line" />
                    <path d="M 310 775 L 1050 775" className="hvac-airflow-line" />
                  </>
                )}
              </g>
            )}

            {/* ========================================================= */}
            {/* 3. INTERCONNECTED ROOMS WITH STATION-SPECIFIC INTERIORS */}
            {/* ========================================================= */}
            <g className="rooms-network-group">
              {rooms.map((room) => {
                const isSelected = room.id === selectedRoomId;
                const isFilteredOut = filteredRooms.find(r => r.id === room.id) === undefined;
                const aiPrediction = getAiPredictionForRoom(room);
                const roomLabelLines = splitRoomLabel(room.name);
                
                // Status styles
                const statusClass = `status-${room.status}`;
                const statusColor = room.status === 'critical' ? '#b73b37' : room.status === 'warning' ? '#946013' : '#187451';

                return (
                  <g 
                    key={room.id}
                    className={`room-group ${statusClass} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectRoom(room)}
                    opacity={isFilteredOut ? 0.3 : 1}
                  >
                    {/* Room Base Chamber */}
                    <rect 
                      x={room.x} 
                      y={room.y} 
                      width={room.w} 
                      height={room.h} 
                      rx="10" 
                      ry="10"
                      className="room-bg" 
                    />

                    {/* Room Floor Grating / Grid Texture */}
                    <rect 
                      x={room.x + 8} 
                      y={room.y + 8} 
                      width={room.w - 16} 
                      height={room.h - 16} 
                      rx="6"
                      fill={isBharatiStation ? "url(#floor-dots)" : "url(#floor-grate)"} 
                      className="room-inner-pattern" 
                    />

                    {/* ========================================================= */}
                    {/* STATION-SPECIFIC EQUIPMENT GLYPHS IN ROOMS */}
                    {/* ========================================================= */}

                    {/* 1. Maitri Diesel Generator Turbines */}
                    {room.id === 'maitri-generator' && (
                      <g opacity="0.8" pointerEvents="none">
                        <rect x={room.x + 25} y={room.y + 35} width="85" height="50" rx="6" fill="#1a2e4a" stroke="#946013" strokeWidth="1.5" />
                        <circle cx={room.x + 67} cy={room.y + 60} r="18" fill="none" stroke="#946013" strokeWidth="2" strokeDasharray="4 2" />
                        <rect x={room.x + 130} y={room.y + 35} width="85" height="50" rx="6" fill="#1a2e4a" stroke="#946013" strokeWidth="1.5" />
                        <circle cx={room.x + 172} cy={room.y + 60} r="18" fill="none" stroke="#946013" strokeWidth="2" strokeDasharray="4 2" />
                      </g>
                    )}

                    {/* 2. Maitri Lake Priyadarshini Water Pumps */}
                    {room.id === 'maitri-water' && (
                      <g opacity="0.8" pointerEvents="none">
                        <circle cx={room.x + 60} cy={room.y + 60} r="22" fill="#0f2b48" stroke="#00e5ff" strokeWidth="2" />
                        <circle cx={room.x + 140} cy={room.y + 60} r="22" fill="#0f2b48" stroke="#00e5ff" strokeWidth="2" />
                        <path d={`M ${room.x + 60} ${room.y + 60} L ${room.x + 140} ${room.y + 60}`} stroke="#00e5ff" strokeWidth="3" />
                      </g>
                    )}

                    {/* 3. Bharati Integrated Energy Block (CHP Turbines) */}
                    {room.id === 'bharati-energy-block' && (
                      <g opacity="0.85" pointerEvents="none">
                        <rect x={room.x + 20} y={room.y + 40} width="75" height="60" rx="5" fill="#1e2e4a" stroke="#946013" strokeWidth="1.5" />
                        <circle cx={room.x + 57} cy={room.y + 70} r="18" fill="none" stroke="#946013" strokeWidth="2" strokeDasharray="3 3" />
                        <rect x={room.x + 110} y={room.y + 40} width="75" height="60" rx="5" fill="#1e2e4a" stroke="#946013" strokeWidth="1.5" />
                        <circle cx={room.x + 147} cy={room.y + 70} r="18" fill="none" stroke="#946013" strokeWidth="2" strokeDasharray="3 3" />
                        <text x={room.x + 105} y={room.y + 120} fill="#946013" fontSize="8.5" fontWeight="700" textAnchor="middle">CHP CO-GEN UNIT</text>
                      </g>
                    )}

                    {/* 4. Bharati BESS Lithium Battery Storage Racks */}
                    {room.id === 'bharati-bess' && (
                      <g opacity="0.85" pointerEvents="none">
                        <rect x={room.x + 20} y={room.y + 40} width="40" height="70" rx="4" fill="#0c2d3a" stroke="#187451" strokeWidth="1.5" />
                        <rect x={room.x + 70} y={room.y + 40} width="40" height="70" rx="4" fill="#0c2d3a" stroke="#187451" strokeWidth="1.5" />
                        <rect x={room.x + 120} y={room.y + 40} width="40" height="70" rx="4" fill="#0c2d3a" stroke="#187451" strokeWidth="1.5" />
                        <rect x={room.x + 170} y={room.y + 40} width="35" height="70" rx="4" fill="#0c2d3a" stroke="#187451" strokeWidth="1.5" />
                        <text x={room.x + 115} y={room.y + 125} fill="#187451" fontSize="8.5" fontWeight="700" textAnchor="middle">1,200 kWh BESS RACKS</text>
                      </g>
                    )}

                    {/* 5. Bharati ISRO Satellite Ground Gateway (Tracking Radome Dish) */}
                    {room.id === 'bharati-satcom' && (
                      <g opacity="0.85" pointerEvents="none">
                        <circle cx={room.x + room.w / 2} cy={room.y + 60} r="28" fill="#0e2a47" stroke="#146b80" strokeWidth="2" />
                        <circle cx={room.x + room.w / 2} cy={room.y + 60} r="18" fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="4 2" />
                        <line x1={room.x + room.w / 2} y1={room.y + 32} x2={room.x + room.w / 2} y2={room.y + 88} stroke="#146b80" strokeWidth="1.5" />
                        <line x1={room.x + room.w / 2 - 28} y1={room.y + 60} x2={room.x + room.w / 2 + 28} y2={room.y + 60} stroke="#146b80" strokeWidth="1.5" />
                        <text x={room.x + room.w / 2} y={room.y + 108} fill="#146b80" fontSize="8.5" fontWeight="700" textAnchor="middle">ISRO TRACKING RADOME</text>
                      </g>
                    )}

                    {/* 6. Bharati RO Seawater Desalination Plant */}
                    {room.id === 'bharati-desal' && (
                      <g opacity="0.8" pointerEvents="none">
                        <rect x={room.x + 25} y={room.y + 40} width="55" height="60" rx="4" fill="#08283d" stroke="#00e5ff" strokeWidth="1.5" />
                        <rect x={room.x + 95} y={room.y + 40} width="55" height="60" rx="4" fill="#08283d" stroke="#00e5ff" strokeWidth="1.5" />
                        <text x={room.x + 90} y={room.y + 120} fill="#00e5ff" fontSize="8.5" fontWeight="700" textAnchor="middle">RO DESAL MEMBRANES</text>
                      </g>
                    )}

                    {/* 7. Operations / Control Bridge Consoles */}
                    {(room.id === 'maitri-control' || room.id === 'bharati-ops-center') && (
                      <g opacity="0.7" pointerEvents="none">
                        <rect x={room.x + 30} y={room.y + 35} width="60" height="20" rx="3" fill="#1e3a5f" stroke="#146b80" />
                        <rect x={room.x + 100} y={room.y + 35} width="60" height="20" rx="3" fill="#1e3a5f" stroke="#146b80" />
                        <rect x={room.x + 170} y={room.y + 35} width="60" height="20" rx="3" fill="#1e3a5f" stroke="#146b80" />
                        <path d={`M ${room.x + 40} ${room.y + 110} Q ${room.x + room.w / 2} ${room.y + 130} ${room.x + room.w - 40} ${room.y + 110}`} stroke="#146b80" strokeWidth="3" fill="none" />
                      </g>
                    )}

                    {/* 8. Server / Data Center Racks */}
                    {(room.id === 'maitri-server' || room.id === 'bharati-datacenter') && (
                      <g opacity="0.75" pointerEvents="none">
                        <rect x={room.x + 25} y={room.y + 35} width="50" height="60" rx="3" fill="#0b1b30" stroke="#146b80" />
                        <line x1={room.x + 30} y1={room.y + 45} x2={room.x + 70} y2={room.y + 45} stroke="#00e5ff" strokeWidth="2" />
                        <line x1={room.x + 30} y1={room.y + 55} x2={room.x + 70} y2={room.y + 55} stroke="#00e5ff" strokeWidth="2" />
                        <line x1={room.x + 30} y1={room.y + 65} x2={room.x + 70} y2={room.y + 65} stroke="#00e5ff" strokeWidth="2" />
                        <rect x={room.x + 95} y={room.y + 35} width="50" height="60" rx="3" fill="#0b1b30" stroke="#146b80" />
                        <line x1={room.x + 100} y1={room.y + 45} x2={room.x + 140} y2={room.y + 45} stroke="#00e5ff" strokeWidth="2" />
                        <line x1={room.x + 100} y1={room.y + 55} x2={room.x + 140} y2={room.y + 55} stroke="#00e5ff" strokeWidth="2" />
                        <line x1={room.x + 100} y1={room.y + 65} x2={room.x + 140} y2={room.y + 65} stroke="#00e5ff" strokeWidth="2" />
                      </g>
                    )}

                    {/* 9. Medical Trauma Cross */}
                    {(room.id === 'maitri-medical' || room.id === 'bharati-medical') && (
                      <g opacity="0.65" pointerEvents="none">
                        <rect x={room.x + room.w / 2 - 12} y={room.y + 35} width="24" height="48" rx="3" fill="#b73b37" opacity="0.4" />
                        <rect x={room.x + room.w / 2 - 24} y={room.y + 47} width="48" height="24" rx="3" fill="#b73b37" opacity="0.4" />
                      </g>
                    )}

                    {/* AI Prediction Highlight Outline & Pulse Ring */}
                    {aiPrediction && (
                      <g pointerEvents="none">
                        <rect 
                          x={room.x - 6} 
                          y={room.y - 6} 
                          width={room.w + 12} 
                          height={room.h + 12} 
                          rx="16" 
                          ry="16"
                          className="room-ai-highlight-outline"
                        />
                        <g transform={`translate(${room.x + room.w - 28}, ${room.y + 12})`}>
                          <circle cx="0" cy="0" r="10" fill="#705296" className="ai-badge-pulse" />
                          <circle cx="0" cy="0" r="7" fill="#6d28d9" />
                          <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">AI</text>
                        </g>
                      </g>
                    )}

                    {/* Selected Animated Dashed Hologram Ring */}
                    {isSelected && (
                      <rect 
                        x={room.x - 4} 
                        y={room.y - 4} 
                        width={room.w + 8} 
                        height={room.h + 8} 
                        rx="14" 
                        ry="14"
                        className="room-selection-outline"
                      />
                    )}

                    {/* Room Header Label Bar in SVG */}
                    <text 
                      x={room.x + room.w / 2} 
                      y={room.y + room.h - (roomLabelLines.length > 1 ? 58 : 45)}
                      className="room-label-text"
                    >
                      {roomLabelLines.map((line, index) => (
                        <tspan key={line} x={room.x + room.w / 2} dy={index === 0 ? 0 : 14}>{line}</tspan>
                      ))}
                    </text>

                    {/* Room Status Pill & Quick Subsystem Stats */}
                    <g transform={`translate(${room.x + room.w / 2 - 55}, ${room.y + room.h - 32})`}>
                      <rect 
                        x="0" 
                        y="0" 
                        width="110" 
                        height="18" 
                        rx="4" 
                        fill="#050a14" 
                        stroke={statusColor} 
                        strokeWidth="1.2"
                        className="room-status-pill-bg"
                      />
                      <circle cx="12" cy="9" r="3.5" fill={statusColor} />
                      <text 
                        x="62" 
                        y="12.5" 
                        fill="#f8fafc" 
                        fontSize="9.5" 
                        fontWeight="700" 
                        fontFamily="var(--font-mono, monospace)" 
                        textAnchor="middle"
                      >
                        {room.status.toUpperCase()} ({room.temp})
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* ========================================================= */}
            {/* 4. DOORS & AIRLOCK SECURITY SEALS */}
            {/* ========================================================= */}
            <g className="doors-network-group">
              {doors.map((door) => {
                const isHoriz = door.orientation === 'horizontal';
                const dw = isHoriz ? 40 : 12;
                const dh = isHoriz ? 12 : 40;
                const doorClass = door.locked ? 'locked' : (door.isAirlock ? 'airlock' : 'normal');

                return (
                  <g 
                    key={door.id}
                    className={`door-node ${doorClass}`}
                    onClick={(e) => handleToggleDoor(door.id, e)}
                    transform={`translate(${door.x - dw / 2}, ${door.y - dh / 2})`}
                  >
                    <rect 
                      x="0" 
                      y="0" 
                      width={dw} 
                      height={dh} 
                      rx="3" 
                      className="door-rect" 
                    />
                    <line 
                      x1={isHoriz ? dw / 2 : 0} 
                      y1={isHoriz ? 0 : dh / 2} 
                      x2={isHoriz ? dw / 2 : dw} 
                      y2={isHoriz ? dh : dh / 2} 
                      stroke="#050a14" 
                      strokeWidth="2" 
                    />
                  </g>
                );
              })}
            </g>

            {/* ========================================================= */}
            {/* 5. LIVE CREW MEMBERS PRESENCE RADAR (When toggled or all) */}
            {/* ========================================================= */}
            {(activeLayer === 'CREW' || activeLayer === 'ALL') && (
              <g className="crew-presence-layer">
                {rooms.map((r) => {
                  if (!r.crew || r.crew.length === 0) return null;
                  return r.crew.map((member, idx) => {
                    const cx = r.x + 35 + (idx * 28);
                    const cy = r.y + 35;
                    return (
                      <g key={member.id} className="crew-dot-marker" transform={`translate(${cx}, ${cy})`}>
                        <circle cx="0" cy="0" r="10" fill="none" stroke="#146b80" className="crew-beacon-pulse" />
                        <circle cx="0" cy="0" r="5" fill="#146b80" stroke="#ffffff" strokeWidth="1.5" />
                        {activeLayer === 'CREW' && (
                          <text x="0" y="16" fill="#146b80" fontSize="8" fontWeight="600" textAnchor="middle">
                            {member.name.split(' ')[0]}
                          </text>
                        )}
                      </g>
                    );
                  });
                })}
              </g>
            )}
          </svg>

          {/* Polar Compass & Sector Coordinates */}
          <div className="map-compass-box">
            <Compass size={24} className="text-cyan" />
            <div className="compass-meta">
              <span className="compass-heading">TRUE NORTH: 000°</span>
              <span className="compass-sub">{stationLayout.region.split('(')[0]}</span>
            </div>
          </div>

          {/* On-Screen Canvas Navigation & Zoom Controls */}
          <div className="map-canvas-controls">
            <button 
              className="canvas-ctrl-btn" 
              onClick={() => { setScale(prev => Math.min(prev * 1.15, 2.4)); playAudioBeep(650); }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button 
              className="canvas-ctrl-btn" 
              onClick={() => { setScale(prev => Math.max(prev * 0.85, 0.45)); playAudioBeep(550); }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button 
              className="canvas-ctrl-btn" 
              onClick={handleResetView}
              title="Reset View"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SIDE ROOM INSPECTOR & TELEMETRY PANEL (On Room Click) */}
        {/* ========================================================= */}
        {selectedRoom && (
          <aside className="room-inspector-panel">
            {/* Top Room Banner */}
            <div className="inspector-top-banner">
              <div className="ins-room-title-block">
                <span className="ins-sector-tag">{selectedRoom.sector}</span>
                <h3 className="ins-room-name">{selectedRoom.name}</h3>
              </div>
              <button 
                className="ins-close-btn" 
                onClick={() => setSelectedRoomId(null)}
                title="Deselect Room"
              >
                <X size={16} />
              </button>
            </div>

            {/* AI Predictive Intelligence Insight Banner if active */}
            {getAiPredictionForRoom(selectedRoom) && (
              <div className="ins-ai-prediction-banner">
                <div className="ins-ai-banner-header">
                  <span className="ins-ai-tag">
                    <Sparkles size={12} /> AI PREDICTIVE ALERT
                  </span>
                  <span className="ins-ai-horizon">
                    Horizon: {getAiPredictionForRoom(selectedRoom).time_horizon || '24h'}
                  </span>
                </div>
                <div className="ins-ai-title">
                  {getAiPredictionForRoom(selectedRoom).title}
                </div>
                <div className="ins-ai-desc">
                  {getAiPredictionForRoom(selectedRoom).predicted_event || getAiPredictionForRoom(selectedRoom).description}
                </div>
                <div className="ins-ai-recommendation">
                  <strong>Recommended Action:</strong> {getAiPredictionForRoom(selectedRoom).recommended_action}
                </div>
                {predictiveContext?.openPredictionCenter && (
                  <button 
                    className="ins-ai-open-btn"
                    onClick={() => predictiveContext.openPredictionCenter(getAiPredictionForRoom(selectedRoom))}
                  >
                    Open in AI Intelligence Center <ExternalLink size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Status Badge & Incident Simulator Buttons */}
            <div className="ins-status-badge-row">
              <div className={`ins-status-pill ${selectedRoom.status}`}>
                {selectedRoom.status === 'normal' ? (
                  <>
                    <span className="live-dot" /> NORMAL / ONLINE
                  </>
                ) : selectedRoom.status === 'warning' ? (
                  <>
                    <span className="warn-dot" /> WARNING DEGRADED
                  </>
                ) : (
                  <>
                    <span className="danger-dot" /> CRITICAL INCIDENT
                  </>
                )}
              </div>

              {/* Status Test Switcher */}
              <div className="ins-sim-btn-group">
                <button 
                  className="ins-sim-btn" 
                  onClick={() => handleSetRoomStatus(selectedRoom.id, 'normal')}
                  title="Force Status to Normal"
                >
                  Nominal
                </button>
                <button 
                  className="ins-sim-btn" 
                  onClick={() => handleSetRoomStatus(selectedRoom.id, 'warning')}
                  title="Force Status to Warning"
                >
                  Warn
                </button>
                <button 
                  className="ins-sim-btn" 
                  onClick={() => handleSetRoomStatus(selectedRoom.id, 'critical')}
                  title="Force Status to Critical"
                >
                  Crit
                </button>
              </div>
            </div>

            {/* Environmental & Subsystem Telemetry Grid */}
            <div className="ins-metrics-grid">
              <div className="ins-metric-card">
                <span className="ins-m-header">
                  <Thermometer size={12} className="text-cyan" /> Ambient Temp
                </span>
                <span className="ins-m-value">{selectedRoom.temp}</span>
              </div>
              <div className="ins-metric-card">
                <span className="ins-m-header">
                  <Zap size={12} className="text-amber" /> Active Power
                </span>
                <span className="ins-m-value">{selectedRoom.power}</span>
              </div>
              <div className="ins-metric-card">
                <span className="ins-m-header">
                  <Wind size={12} className="text-cyan" /> O2 Content
                </span>
                <span className="ins-m-value">{selectedRoom.o2}</span>
              </div>
              <div className="ins-metric-card">
                <span className="ins-m-header">
                  <Activity size={12} className="text-emerald" /> Room Pressure
                </span>
                <span className="ins-m-value">{selectedRoom.pressure}</span>
              </div>
            </div>

            {/* Room Description & Functional Role */}
            <div className="ins-section-block">
              <span className="ins-section-title">
                <Cpu size={12} /> Architectural Specification
              </span>
              <p style={{ fontSize: '0.75rem', color: '#536579', lineHeight: '1.45' }}>
                {selectedRoom.description}
              </p>
            </div>

            {/* Active Equipment & Field Actuators */}
            <div className="ins-section-block">
              <span className="ins-section-title">
                <Power size={12} /> SCADA Field Actuators ({selectedRoom.equipment?.length || 0})
              </span>
              <div className="ins-equipment-list">
                {selectedRoom.equipment?.map((eq) => (
                  <div key={eq.id} className="ins-equip-item">
                    <div className="ins-equip-left">
                      <span className="ins-equip-name">{eq.name}</span>
                      <span className="ins-equip-status">{eq.status}</span>
                    </div>
                    <button 
                      className={`ins-equip-toggle ${eq.active ? 'active' : ''}`}
                      onClick={() => handleToggleEquipment(eq.id)}
                    >
                      {eq.active ? 'ENGAGED' : 'STANDBY'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Station Personnel */}
            <div className="ins-section-block">
              <span className="ins-section-title">
                <Users size={12} /> Station Expedition Crew ({selectedRoom.crew?.length || 0})
              </span>
              {selectedRoom.crew?.length > 0 ? (
                <div className="ins-crew-list">
                  {selectedRoom.crew.map((member) => (
                    <div key={member.id} className="ins-crew-card">
                      <div className="ins-crew-profile">
                        <div className="ins-crew-avatar">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="ins-crew-name">{member.name}</div>
                          <div className="ins-crew-role">{member.role}</div>
                        </div>
                      </div>
                      <span className="ins-crew-vitals">{member.vitals}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>No personnel currently stationed in this sector.</span>
              )}
            </div>

            {/* SCADA Event Logs */}
            <div className="ins-section-block">
              <span className="ins-section-title">
                <Activity size={12} /> Recent SCADA Event Log
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedRoom.logs?.map((log, i) => (
                  <div key={i} style={{ fontSize: '0.68rem', color: '#536579', fontFamily: 'var(--font-mono, monospace)' }}>
                    • {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Emergency Actions Footer */}
            <div className="ins-actions-footer">
              <button 
                className="ins-override-btn"
                onClick={() => {
                  playAudioBeep(250, 'sawtooth', 0.2);
                  handleSetRoomStatus(selectedRoom.id, selectedRoom.status === 'critical' ? 'normal' : 'critical');
                }}
              >
                <ShieldAlert size={14} /> Toggle Sector Emergency Isolation
              </button>
              <button 
                className="ins-diag-btn"
                onClick={() => {
                  playAudioBeep(920, 'sine', 0.1);
                  alert(`Automated SCADA Diagnostics Initiated for ${selectedRoom.name}. All field sensors responding nominal.`);
                }}
              >
                <CheckCircle2 size={14} /> Run SCADA Diagnostic Loop
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Emergency Simulation Bar */}
      <div className="map-incident-simulator-strip">
        <div className="sim-strip-title">
          <Sliders size={13} className="text-cyan" /> {stationLayout.shortName} Quick Scenarios:
        </div>
        <div className="sim-scenarios-row">
          {isBharatiStation ? (
            <>
              <button 
                className="sim-trigger-btn btn-danger-sim" 
                onClick={() => handleSimulateIncident('BHARATI_BATTERY_ALERT')}
              >
                <BatteryCharging size={12} className="text-rose" /> Simulate BESS Storage Overheat
              </button>
              <button 
                className="sim-trigger-btn btn-danger-sim" 
                onClick={() => handleSimulateIncident('WATER_PRESSURE_LOSS')}
              >
                <Waves size={12} className="text-amber" /> Simulate RO Desalination Pressure Drop
              </button>
              <button 
                className="sim-trigger-btn" 
                onClick={() => handleSimulateIncident('DATA_SERVER_ALERT')}
              >
                <Server size={12} className="text-cyan" /> Simulate AI Core Thermal Load
              </button>
            </>
          ) : (
            <>
              <button 
                className="sim-trigger-btn btn-danger-sim" 
                onClick={() => handleSimulateIncident('MAITRI_GEN_OVERHEAT')}
              >
                <Flame size={12} className="text-rose" /> Simulate Genset #1 Overheat
              </button>
              <button 
                className="sim-trigger-btn btn-danger-sim" 
                onClick={() => handleSimulateIncident('WATER_PRESSURE_LOSS')}
              >
                <Droplet size={12} className="text-amber" /> Simulate Priyadarshini Pipe Freeze
              </button>
              <button 
                className="sim-trigger-btn" 
                onClick={() => handleSimulateIncident('DATA_SERVER_ALERT')}
              >
                <Server size={12} className="text-cyan" /> Simulate Server Core Warning
              </button>
            </>
          )}
          <button 
            className="sim-trigger-btn btn-reset-sim" 
            onClick={() => handleSimulateIncident('RESET_ALL')}
          >
            <CheckCircle2 size={12} className="text-emerald" /> Restore All Nominal
          </button>
        </div>
      </div>
    </div>
  );
}
