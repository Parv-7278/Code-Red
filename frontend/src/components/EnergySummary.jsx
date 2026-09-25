import React from 'react';
import { SunMedium, BatteryCharging, Power, ArrowRight, Zap, Activity } from 'lucide-react';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';

export default function EnergySummary({ energy: energyProp, selectedStation = 'Maitri Station' }) {
  const energy = energyProp || {
    generation: 132,
    batteryPercent: 82,
    consumption: 105,
    surplus: 27,
  };

  return (
    <div className="energy-summary-card polaris-card">
      <div className="card-header-simple">
        <span className="card-title">ENERGY SUMMARY</span>
      </div>

      <div className="energy-flow-container">
        {/* Node 1: Generation */}
        <ExpandableTelemetryCard
          title="Total Power Generation"
          category="ENERGY MICROGRID"
          value={energy.generation}
          unit="kW"
          status="nominal"
          icon={Zap}
          color="#eab308"
          subtext="Combined Genset, Solar & Wind Power Output"
          details={[
            { label: 'Baseline Generation', value: `${energy.generation} kW`, color: '#eab308' },
            { label: 'Primary Genset G-01', value: `${Math.round(energy.generation * 0.55)} kW`, color: '#146b80' },
            { label: 'Secondary Genset G-02', value: `${Math.round(energy.generation * 0.25)} kW`, color: '#146b80' },
            { label: 'Renewable (Solar/Wind)', value: `${Math.round(energy.generation * 0.2)} kW`, color: '#187451' },
          ]}
          interpretation="Polar microgrid generation capacity exceeds active station consumption demands with comfortable reserve headroom."
          recommendation="Maintain automated load-dispatch balancing between diesel generators and renewable battery charging."
          stationName={selectedStation}
          className="energy-flow-node-wrapper"
        >
          <div className="energy-flow-node">
            <span className="node-category-label">Generation</span>
            <div className="node-icon-circle generation-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M4.93 4.93l1.41 1.41" />
                <path d="M17.66 17.66l1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M6.34 17.66l-1.41 1.41" />
                <path d="M19.07 4.93l-1.41 1.41" />
              </svg>
            </div>
            <div className="node-value-box">
              <span className="node-val mono-num">{energy.generation} <span className="val-unit">kW</span></span>
              <span className="node-sub">Total Generation</span>
            </div>
          </div>
        </ExpandableTelemetryCard>

        {/* Animated Connector 1 */}
        <div className="flow-connector-wrap">
          <svg width="34" height="20" className="connector-svg">
            <line 
              x1="2" 
              y1="10" 
              x2="28" 
              y2="10" 
              stroke="#187451"
              strokeWidth="2" 
              strokeDasharray="4 3" 
              className="flowing-wire-anim" 
            />
            <polygon points="26,6 32,10 26,14" fill="#187451" />
          </svg>
        </div>

        {/* Node 2: Storage */}
        <ExpandableTelemetryCard
          title="Station Battery Storage (BESS)"
          category="ENERGY STORAGE"
          value={energy.batteryPercent}
          unit="%"
          percent={energy.batteryPercent}
          status="nominal"
          icon={BatteryCharging}
          color="#187451"
          subtext="500 kWh Lithium-Titanate Uninterruptible Battery Bank"
          details={[
            { label: 'State of Charge (SoC)', value: `${energy.batteryPercent}%`, color: '#187451' },
            { label: 'Reserve Energy', value: `${Math.round(500 * (energy.batteryPercent / 100))} kWh`, color: '#146b80' },
            { label: 'Bank Temperature', value: '+18.2°C', color: '#187451' },
            { label: 'Estimated Autonomy', value: '14.5 Hours', color: '#146b80' },
          ]}
          interpretation="Battery Energy Storage System (BESS) is in float charge equilibrium, buffering rapid load shifts."
          recommendation="All 16 battery cell strings report voltage deviation < 8 mV. No cell balancing required."
          stationName={selectedStation}
          className="energy-flow-node-wrapper"
        >
          <div className="energy-flow-node">
            <span className="node-category-label">Storage</span>
            <div className="node-icon-circle storage-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#187451" strokeWidth="2">
                <rect x="2" y="7" width="16" height="12" rx="2" />
                <line x1="22" y1="11" x2="22" y2="15" />
                <rect x="5" y="10" width="10" height="6" fill="#187451" fillOpacity="0.7" rx="1" />
              </svg>
            </div>
            <div className="node-value-box">
              <span className="node-val mono-num green-highlight">{energy.batteryPercent}%</span>
              <span className="node-sub">Battery Charge</span>
            </div>
          </div>
        </ExpandableTelemetryCard>

        {/* Animated Connector 2 */}
        <div className="flow-connector-wrap">
          <svg width="34" height="20" className="connector-svg">
            <line 
              x1="2" 
              y1="10" 
              x2="28" 
              y2="10" 
              stroke="#147889"
              strokeWidth="2" 
              strokeDasharray="4 3" 
              className="flowing-wire-anim" 
            />
            <polygon points="26,6 32,10 26,14" fill="#147889" />
          </svg>
        </div>

        {/* Node 3: Consumption */}
        <ExpandableTelemetryCard
          title="Total Energy Consumption"
          category="ENERGY DEMAND"
          value={energy.consumption}
          unit="kW"
          status="nominal"
          icon={Activity}
          color="#146b80"
          subtext="Total Living Habitat, Lab & Utility Power Draw"
          details={[
            { label: 'Active Station Load', value: `${energy.consumption} kW`, color: '#146b80' },
            { label: 'Heating & HVAC', value: `${Math.round(energy.consumption * 0.42)} kW (42%)`, color: '#946013' },
            { label: 'Science Instruments', value: `${Math.round(energy.consumption * 0.28)} kW (28%)`, color: '#147889' },
            { label: 'Galley & Habitat', value: `${Math.round(energy.consumption * 0.30)} kW (30%)`, color: '#187451' },
          ]}
          interpretation="Energy consumption profiles reflect standard daytime scientific instrumentation and life support operations."
          recommendation="Peak load threshold is configured at 175 kW with automatic shedding priority for non-essential water heating."
          stationName={selectedStation}
          className="energy-flow-node-wrapper"
        >
          <div className="energy-flow-node">
            <span className="node-category-label">Consumption</span>
            <div className="node-icon-circle consumption-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#146b80" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v3" />
                <path d="M12 18v3" />
                <path d="M3 12h3" />
                <path d="M18 12h3" />
              </svg>
            </div>
            <div className="node-value-box">
              <span className="node-val mono-num">{energy.consumption} <span className="val-unit">kW</span></span>
              <span className="node-sub">Total Consumption</span>
            </div>
          </div>
        </ExpandableTelemetryCard>
      </div>

      {/* Surplus Footer Status */}
      <ExpandableTelemetryCard
        title="Net Energy Surplus"
        category="GRID BALANCE"
        value={`+${energy.surplus}`}
        unit="kW"
        status="nominal"
        icon={Zap}
        color="#187451"
        subtext="Available Headroom for Battery Buffer Charging"
        details={[
          { label: 'Surplus Headroom', value: `+${energy.surplus} kW`, color: '#187451' },
          { label: 'Total Generation', value: `${energy.generation} kW`, color: '#eab308' },
          { label: 'Total Draw', value: `${energy.consumption} kW`, color: '#146b80' },
        ]}
        interpretation="Net positive surplus indicates robust grid stability. Excess energy is automatically directed to the BESS storage bank."
        stationName={selectedStation}
        className="energy-surplus-wrapper"
      >
        <div className="energy-card-footer">
          <span className="surplus-badge">
            Surplus: <strong className="mono-num">+{energy.surplus} kW</strong>
          </span>
        </div>
      </ExpandableTelemetryCard>
    </div>
  );
}
