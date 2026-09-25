import React, { useState } from 'react';
import {
  Package,
  Fuel,
  Utensils,
  HeartPulse,
  Wrench,
  Droplets,
  Ship,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Thermometer,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import { STATIONS_DATA } from '../data/stationsData';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';
import AIPredictionIndicator from './AIPredictionIndicator';

export default function LogisticsView({ selectedStation }) {
  const stationId = selectedStation === 'all-stations' ? 'station-maitri' : selectedStation;
  const station = STATIONS_DATA[stationId] || STATIONS_DATA['station-maitri'];
  const isMaitri = station.id === 'station-maitri';

  const [selectedCategory, setSelectedCategory] = useState('all');

  // Detailed Fuel Storage Tanks Telemetry
  const fuelTanks = isMaitri ? [
    { id: 'T-01', name: 'Main Diesel Tank #1', capacity: 30000, current: 18200, percent: 61, temp: -4.2, heating: 'ACTIVE', status: 'NOMINAL' },
    { id: 'T-02', name: 'Auxiliary Diesel Tank #2', capacity: 25000, current: 14500, percent: 58, temp: -5.1, heating: 'ACTIVE', status: 'NOMINAL' },
    { id: 'T-03', name: 'Emergency Reserve Tank #3', capacity: 20000, current: 17500, percent: 87, temp: -3.8, heating: 'STANDBY', status: 'NOMINAL' },
    { id: 'T-04', name: 'Day-Service Header Tank', capacity: 2000, current: 1800, percent: 90, temp: 18.5, heating: 'ONLINE', status: 'OPTIMAL' },
  ] : [
    { id: 'T-01', name: 'Primary CHP Fuel Tank #1', capacity: 40000, current: 31200, percent: 78, temp: -2.8, heating: 'ACTIVE', status: 'OPTIMAL' },
    { id: 'T-02', name: 'Secondary CHP Fuel Tank #2', capacity: 35000, current: 27800, percent: 79, temp: -3.2, heating: 'ACTIVE', status: 'OPTIMAL' },
    { id: 'T-03', name: 'Strategic Reserve Tank #3', capacity: 25000, current: 19500, percent: 78, temp: -2.5, heating: 'STANDBY', status: 'OPTIMAL' },
    { id: 'T-04', name: 'Boiler Day Tank', capacity: 5000, current: 4200, percent: 84, temp: 21.0, heating: 'ONLINE', status: 'OPTIMAL' },
  ];

  // Logistics Inventory Categories Breakdown
  const inventoryCards = [
    {
      id: 'fuel',
      title: 'Arctic Grade Diesel (ATF-50)',
      icon: Fuel,
      category: 'ENERGY & HEATING',
      current: isMaitri ? '50,200 L' : '78,500 L',
      capacity: isMaitri ? '77,000 L' : '105,000 L',
      percent: isMaitri ? 65 : 75,
      daysLeft: isMaitri ? 43 : 71,
      burnRate: isMaitri ? '1,167 L / day' : '1,105 L / day',
      health: isMaitri ? 'WARNING' : 'OPTIMAL',
      healthDesc: isMaitri ? 'Depletion alert in 43 days; resupply ship scheduled' : 'Reserves adequate for overwintering cycle',
      color: isMaitri ? '#946013' : '#187451',
      details: [
        { label: 'Trace Heating Loops', value: '4 / 4 Active (Glycol +65°C)' },
        { label: 'Anti-Waxing Additive', value: 'Poured & Mixed (0.8%)' },
        { label: 'Viscosity Index', value: '4.2 cSt @ -20°C (Nominal)' },
      ]
    },
    {
      id: 'water',
      title: isMaitri ? 'Lake Priyadarshini Potable Water' : 'Prydz Bay Seawater RO Desalination',
      icon: Droplets,
      category: 'LIFE SUPPORT',
      current: isMaitri ? '14,800 L' : '28,400 L',
      capacity: isMaitri ? '20,000 L' : '35,000 L',
      percent: isMaitri ? 74 : 81,
      daysLeft: isMaitri ? 32 : 58,
      burnRate: isMaitri ? '460 L / day' : '490 L / day',
      health: 'OPTIMAL',
      healthDesc: isMaitri ? 'Heated conduit line from Lake Priyadarshini flowing at 8.2 L/min' : 'Seawater RO membrane bank producing 950 L/day potable water',
      color: '#147889',
      details: [
        { label: 'Potable Buffer Storage', value: isMaitri ? '14,800 L Buffer' : '28,400 L Reservoir' },
        { label: 'Daily Desal/Pumping Yield', value: isMaitri ? '520 L / day pump' : '950 L / day RO desal' },
        { label: 'Intake Trace Heat Temp', value: '+4.5°C anti-freeze' },
      ]
    },
    {
      id: 'food',
      title: 'Crew Rations & Fresh Hydroponics',
      icon: Utensils,
      category: 'NUTRITION & LIFE SUPPORT',
      current: isMaitri ? '3,250 kg' : '6,120 kg',
      capacity: isMaitri ? '4,500 kg' : '7,500 kg',
      percent: isMaitri ? 72 : 82,
      daysLeft: isMaitri ? 67 : 110,
      burnRate: isMaitri ? '48.5 kg / day' : '55.6 kg / day',
      health: 'OPTIMAL',
      healthDesc: 'Balanced caloric reserve (3,600 kcal/person/day) including fresh greens',
      color: '#187451',
      details: [
        { label: 'Cold Storage Freezer #1', value: '-22.4°C (Optimal)' },
        { label: 'Freeze-Dried MRE Packs', value: isMaitri ? '2,100 units' : '4,200 units' },
        { label: 'Hydroponic Green Harvest', value: '4.2 kg / week (Lettuce, Herbs)' },
      ]
    },
    {
      id: 'medical',
      title: 'Medical Stores & Telemedicine',
      icon: HeartPulse,
      category: 'MEDICAL DISPENSARY',
      current: isMaitri ? '620 kg' : '1,180 kg',
      capacity: isMaitri ? '700 kg' : '1,300 kg',
      percent: isMaitri ? 89 : 91,
      daysLeft: isMaitri ? 89 : 140,
      burnRate: 'Stable on demand',
      health: 'OPTIMAL',
      healthDesc: 'Full polar trauma kit, surgical suite, and AIIMS New Delhi satellite link ready',
      color: '#146b80',
      details: [
        { label: 'Medical Oxygen Cylinders', value: isMaitri ? '18 / 20 Cylinders' : '32 / 35 Cylinders' },
        { label: 'Telemedicine Satellite Link', value: 'ONLINE (AIIMS New Delhi)' },
        { label: 'Antibiotics & Antivirals', value: '100% Shelf-Life Valid' },
      ]
    },
    {
      id: 'spares',
      title: 'Critical Spares & Consumables',
      icon: Wrench,
      category: 'ENGINEERING & SCADA',
      current: isMaitri ? '1,120 kg' : '2,450 kg',
      capacity: isMaitri ? '1,500 kg' : '3,000 kg',
      percent: isMaitri ? 75 : 82,
      daysLeft: isMaitri ? 55 : 95,
      burnRate: 'Routine maintenance usage',
      health: 'OPTIMAL',
      healthDesc: 'Alternator coils, glycol pumps, gasket seals, and satcom spare parts stocked',
      color: '#705296',
      details: [
        { label: 'Diesel Alternator Spares', value: '2 Full Overhaul Kits' },
        { label: 'HVAC Heating Elements', value: '12 Replacement Units' },
        { label: 'Hydraulic Seals & Belts', value: '45 Assorted Spares' },
      ]
    }
  ];

  // Resupply Expedition Data
  const resupplyVoyage = {
    vesselName: 'MV Vasiliy Golovnin (44th ISEA Charter)',
    expeditionLead: 'NCPOR Ministry of Earth Sciences, Govt. of India',
    currentLocation: 'Southern Ocean (48°12′S, 65°45′E)',
    etaDestination: isMaitri ? '38 Days (Schirmacher Shelf Ice Edge)' : '26 Days (Prydz Bay Quayside)',
    cargoCapacityTotal: '1,450 Metric Tons',
    manifest: [
      { item: 'Arctic Diesel Fuel (Bulk Transfer)', qty: '650,000 L' },
      { item: 'New Genset Alternator Assemblies', qty: '2 Units' },
      { item: 'Food Rations & Overwintering Stores', qty: '18,500 kg' },
      { item: 'Scientific Ice-Core Drilling Rigs', qty: '4 Crates' },
      { item: 'Potable Water Filtration Membranes', qty: '12 Cartridges' },
    ]
  };

  // Historical Consumption Trend Data for Recharts
  const trendData = isMaitri ? [
    { week: 'Wk 1', fuel: 58000, water: 16200, food: 3600 },
    { week: 'Wk 2', fuel: 56200, water: 15900, food: 3520 },
    { week: 'Wk 3', weekLabel: 'Blizzard', fuel: 54100, water: 15400, food: 3430 },
    { week: 'Wk 4', fuel: 52400, water: 15100, food: 3340 },
    { week: 'Wk 5', fuel: 50200, water: 14800, food: 3250 },
    { week: 'Proj +1', fuel: 48100, water: 14400, food: 3160 },
    { week: 'Proj +2', fuel: 45900, water: 14000, food: 3070 },
  ] : [
    { week: 'Wk 1', fuel: 88000, water: 31000, food: 6600 },
    { week: 'Wk 2', fuel: 85500, water: 30400, food: 6480 },
    { week: 'Wk 3', weekLabel: 'Gale Surge', fuel: 82900, water: 29700, food: 6360 },
    { week: 'Wk 4', fuel: 80600, water: 29100, food: 6240 },
    { week: 'Wk 5', fuel: 78500, water: 28400, food: 6120 },
    { week: 'Proj +1', fuel: 76200, water: 27800, food: 6000 },
    { week: 'Proj +2', fuel: 73900, water: 27200, food: 5880 },
  ];

  return (
    <div className="tab-page-container logistics-view-container">
      {/* Top Header */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">{station.name} Logistics & Critical Supply Depot</h2>
          <span className="tab-page-subtitle">
            Polar Life-Support Inventory, Bulk Fuel Reserves, and 44th Indian Antarctic Expedition Supply Chain ({station.region})
          </span>
        </div>
        <div className="header-status-badge">
          <ShieldCheck size={14} className="text-emerald" />
          <span>STORES STATUS: {isMaitri ? 'MONITORED (FUEL WARNING)' : 'OPTIMAL RESERVES'}</span>
        </div>
      </div>

      {/* AI Predictive Intelligence Section Indicator */}
      <AIPredictionIndicator category="logistics" />

      {/* Top Summary Metric Strip */}
      <div className="logistics-kpi-strip">
        <ExpandableTelemetryCard
          title="Total Bulk Fuel Reserve"
          category="LOGISTICS INVENTORY"
          value={isMaitri ? '50,200 L' : '78,500 L'}
          status={isMaitri ? 'warning' : 'nominal'}
          icon={Fuel}
          color="#946013"
          subtext={`${isMaitri ? '43 Days' : '71 Days'} Autonomy Remaining`}
          details={[
            { label: 'Current Volume', value: isMaitri ? '50,200 L' : '78,500 L', color: '#946013' },
            { label: 'Max Capacity', value: isMaitri ? '77,000 L' : '105,000 L', color: '#1d3044' },
            { label: 'Burn Rate', value: isMaitri ? '1,167 L / day' : '1,105 L / day', color: '#146b80' },
            { label: 'Tank Heating', value: '4 / 4 Glycol Loops Active', color: '#187451' },
          ]}
          interpretation="Polar diesel fuel reserve is maintained in active trace-heated vacuum-insulated bulk tanks."
          stationName={station.name}
        >
          <div className="kpi-box">
            <div className="kpi-top">
              <Fuel size={16} className="text-amber" />
              <span className="kpi-label">TOTAL BULK FUEL</span>
            </div>
            <div className="kpi-val mono-num">{isMaitri ? '50,200 L' : '78,500 L'}</div>
            <div className="kpi-subtext">
              <span className="text-amber font-bold">{isMaitri ? '43 Days' : '71 Days'}</span> autonomy remaining
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Potable Water Buffer"
          category="LIFE SUPPORT BUFFER"
          value={isMaitri ? '14,800 L' : '28,400 L'}
          status="nominal"
          icon={Droplets}
          color="#147889"
          subtext={isMaitri ? 'Lake Priyadarshini heated intake active' : 'RO Desalination plant generating 950 L/d'}
          details={[
            { label: 'Potable Buffer', value: isMaitri ? '14,800 L' : '28,400 L', color: '#147889' },
            { label: 'Daily Yield', value: isMaitri ? '520 L / day pump' : '950 L / day RO', color: '#187451' },
            { label: 'Daily Usage', value: isMaitri ? '460 L / day' : '490 L / day', color: '#146b80' },
            { label: 'Purity Level', value: '0.18 NTU (Optimal)', color: '#187451' },
          ]}
          interpretation="Water buffer sustains drinking, galley, and fire-suppression reserve margins."
          stationName={station.name}
        >
          <div className="kpi-box">
            <div className="kpi-top">
              <Droplets size={16} className="text-cyan" />
              <span className="kpi-label">POTABLE WATER BUFFER</span>
            </div>
            <div className="kpi-val mono-num">{isMaitri ? '14,800 L' : '28,400 L'}</div>
            <div className="kpi-subtext">
              {isMaitri ? 'Lake Priyadarshini heated line active' : 'RO Desalination plant generating 950 L/d'}
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Rations & Provisions Cache"
          category="NUTRITION LOGISTICS"
          value={isMaitri ? '3,250 kg' : '6,120 kg'}
          status="nominal"
          icon={Utensils}
          color="#187451"
          subtext={`${isMaitri ? '67 Days' : '110 Days'} Caloric Reserve`}
          details={[
            { label: 'Current Inventory', value: isMaitri ? '3,250 kg' : '6,120 kg', color: '#187451' },
            { label: 'Caloric Ratio', value: '3,600 kcal/person/day', color: '#1d3044' },
            { label: 'Hydroponics Yield', value: '4.2 kg / week fresh', color: '#146b80' },
            { label: 'Freezer Temp', value: '-22.4°C Nominal', color: '#187451' },
          ]}
          interpretation="Balanced multi-month nutritional inventory including emergency survival ration packs."
          stationName={station.name}
        >
          <div className="kpi-box">
            <div className="kpi-top">
              <Utensils size={16} className="text-emerald" />
              <span className="kpi-label">RATIONS & PROVISIONS</span>
            </div>
            <div className="kpi-val mono-num">{isMaitri ? '3,250 kg' : '6,120 kg'}</div>
            <div className="kpi-subtext">
              <span className="text-emerald font-bold">{isMaitri ? '67 Days' : '110 Days'}</span> caloric reserve
            </div>
          </div>
        </ExpandableTelemetryCard>

        <ExpandableTelemetryCard
          title="Next Resupply Expedition"
          category="SUPPLY CHAIN TELEMETRY"
          value={isMaitri ? '38 Days' : '26 Days'}
          status="nominal"
          icon={Ship}
          color="#146b80"
          subtext="MV Vasiliy Golovnin in Southern Ocean Transit"
          details={[
            { label: 'Vessel Name', value: 'MV Vasiliy Golovnin', color: '#146b80' },
            { label: 'Coordinates', value: '58°12′S, 32°45′E', color: '#1d3044' },
            { label: 'Cargo Payload', value: '650,000 L Fuel + 24 Containers', color: '#187451' },
            { label: 'Helicopter Air-Lift', value: 'Kamov Ka-32 Ready', color: '#146b80' },
          ]}
          interpretation="Scheduled 44th Indian Antarctic Expedition annual relief voyage is progressing on course."
          stationName={station.name}
        >
          <div className="kpi-box">
            <div className="kpi-top">
              <Ship size={16} className="text-blue" />
              <span className="kpi-label">NEXT RESUPPLY SHIP</span>
            </div>
            <div className="kpi-val mono-num">{isMaitri ? '38 Days' : '26 Days'}</div>
            <div className="kpi-subtext">
              MV Vasiliy Golovnin in Southern Ocean
            </div>
          </div>
        </ExpandableTelemetryCard>
      </div>

      {/* Main Grid: Inventory Cards (Left) & Fuel Telemetry / Voyage Manifest (Right) */}
      <div className="logistics-main-grid">
        {/* Left: Detailed Inventory Cards List */}
        <div className="inventory-cards-col">
          <div className="panel-title-row">
            <Package size={16} className="text-cyan" />
            <h3 className="section-title">Critical Life-Support Stock Breakdown</h3>
          </div>

          <div className="inventory-cards-stack">
            {inventoryCards.map((card) => {
              const IconComp = card.icon;
              return (
                <ExpandableTelemetryCard
                  key={card.id}
                  title={card.title}
                  category={card.category}
                  value={card.current}
                  percent={card.percent}
                  status={card.health.toLowerCase() === 'optimal' ? 'nominal' : 'warning'}
                  icon={IconComp}
                  color={card.color}
                  subtext={`Remaining: ${card.daysLeft} Days • Capacity: ${card.current} / ${card.capacity}`}
                  details={[
                    { label: 'Stock Level', value: card.current, color: card.color },
                    { label: 'Max Capacity', value: card.capacity, color: '#1d3044' },
                    { label: 'Burn Rate', value: card.burnRate, color: '#146b80' },
                    ...(card.details || [])
                  ]}
                  interpretation={card.healthDesc}
                  stationName={station.name}
                >
                  <div className="inventory-detail-card polaris-card">
                    <div className="inv-card-header">
                      <div className="inv-title-wrap">
                        <div className="inv-icon-pill" style={{ borderColor: card.color }}>
                          <IconComp size={18} style={{ color: card.color }} />
                        </div>
                        <div>
                          <span className="inv-cat-label">{card.category}</span>
                          <h4 className="inv-title">{card.title}</h4>
                        </div>
                      </div>
                      <div className="inv-days-badge" style={{ borderColor: card.color }}>
                        <span className="inv-days-num mono-num">{card.daysLeft}</span>
                        <span className="inv-days-txt">DAYS LEFT</span>
                      </div>
                    </div>

                    <p className="inv-desc">{card.healthDesc}</p>

                    <div className="inv-progress-bar-wrap">
                      <div className="inv-bar-labels">
                        <span className="inv-curr-amt mono-num">Stock: {card.current} / {card.capacity}</span>
                        <span className="inv-percent-txt mono-num" style={{ color: card.color }}>{card.percent}% Capacity</span>
                      </div>
                      <div className="inv-progress-track">
                        <div
                          className="inv-progress-fill"
                          style={{ width: `${card.percent}%`, backgroundColor: card.color }}
                        />
                      </div>
                    </div>

                    <div className="inv-details-grid">
                      {card.details.map((d, i) => (
                        <div key={i} className="inv-detail-chip">
                          <span className="chip-label">{d.label}:</span>
                          <span className="chip-val">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ExpandableTelemetryCard>
              );
            })}
          </div>
        </div>

        {/* Right: Fuel Tanks SCADA Telemetry & Resupply Ship Manifest */}
        <div className="logistics-side-col">
          {/* Fuel Tanks SCADA Matrix */}
          <div className="fuel-tanks-card polaris-card">
            <div className="panel-title-row">
              <Fuel size={16} className="text-amber" />
              <h3 className="section-title">Bulk Fuel Storage Tanks (ATF-50 Diesel)</h3>
            </div>
            <p className="section-subtitle">
              Heated double-walled containment tanks with glycol trace jackets to prevent freeze waxing (-50°C rating).
            </p>

            <div className="tanks-grid">
              {fuelTanks.map((tank) => (
                <ExpandableTelemetryCard
                  key={tank.id}
                  title={`${tank.id} - ${tank.name}`}
                  category="CONTAINMENT TANK SCADA"
                  value={`${tank.current.toLocaleString()} L`}
                  percent={tank.percent}
                  status={tank.status.toLowerCase() === 'optimal' || tank.status.toLowerCase() === 'nominal' ? 'nominal' : 'warning'}
                  icon={Fuel}
                  color={tank.percent < 70 ? '#946013' : '#187451'}
                  subtext={`Tank Capacity: ${tank.capacity.toLocaleString()} L • Core Temp: ${tank.temp}°C`}
                  details={[
                    { label: 'Current Level', value: `${tank.current.toLocaleString()} L`, color: tank.percent < 70 ? '#946013' : '#187451' },
                    { label: 'Tank Capacity', value: `${tank.capacity.toLocaleString()} L`, color: '#1d3044' },
                    { label: 'Core Temp', value: `${tank.temp}°C`, color: '#146b80' },
                    { label: 'Glycol Trace Jacket', value: tank.heating, color: '#187451' },
                    { label: 'Containment Sensor', value: 'Zero Leakage (Optimal)', color: '#187451' },
                  ]}
                  interpretation="Double-walled Arctic containment tank equipped with differential pressure level sensors and temperature probes."
                  stationName={station.name}
                >
                  <div className="tank-card">
                    <div className="tank-top">
                      <span className="tank-code">{tank.id}</span>
                      <span className="tank-status-pill status-nominal">{tank.status}</span>
                    </div>
                    <h5 className="tank-name">{tank.name}</h5>
                    <div className="tank-level-wrap">
                      <div className="tank-level-val mono-num">
                        {tank.current.toLocaleString()} L
                        <span className="tank-cap"> / {tank.capacity.toLocaleString()} L</span>
                      </div>
                      <div className="tank-progress-track">
                        <div
                          className="tank-progress-fill"
                          style={{ width: `${tank.percent}%`, backgroundColor: tank.percent < 70 ? '#946013' : '#187451' }}
                        />
                      </div>
                    </div>
                    <div className="tank-meta-row">
                      <span className="tank-temp">
                        <Thermometer size={12} className="text-cyan" />
                        Core Temp: {tank.temp}°C
                      </span>
                      <span className="tank-heat">Jacket: {tank.heating}</span>
                    </div>
                  </div>
                </ExpandableTelemetryCard>
              ))}
            </div>
          </div>

          {/* Consumption History & Depletion Curve (Native SVG) */}
          <div className="trend-chart-card polaris-card">
            <div className="panel-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingDown size={16} className="text-cyan" />
                <h3 className="section-title">5-Week Depletion & Projection Trend</h3>
              </div>
              <div className="stream-channel-legend" style={{ fontSize: '0.72rem', display: 'flex', gap: '0.75rem' }}>
                <span style={{ color: '#946013' }}>● Diesel (L)</span>
                <span style={{ color: '#147889' }}>● Water (L)</span>
              </div>
            </div>
            <div className="chart-box" style={{ height: 180, padding: '0.5rem 0' }}>
              <svg width="100%" height="100%" viewBox="0 0 520 140" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#946013" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#946013" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#147889" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#147889" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                  const y = 15 + (1 - p) * 95;
                  const maxVal = isMaitri ? 60000 : 90000;
                  const label = `${Math.round((p * maxVal) / 1000)}kL`;
                  return (
                    <g key={idx}>
                      <line x1="45" y1={y} x2="500" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <text x="40" y={y + 3} textAnchor="end" fill="#64748b" fontSize="8.5" fontFamily="monospace">
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis labels */}
                {trendData.map((d, i) => {
                  const x = 55 + (i / (trendData.length - 1)) * 435;
                  return (
                    <text key={i} x={x} y={130} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      {d.week}
                    </text>
                  );
                })}

                {/* Fuel Line & Area */}
                {(() => {
                  const maxVal = isMaitri ? 60000 : 90000;
                  const pts = trendData.map((d, i) => {
                    const x = 55 + (i / (trendData.length - 1)) * 435;
                    const y = 15 + (1 - d.fuel / maxVal) * 95;
                    return `${x},${y}`;
                  }).join(' ');
                  const areaPts = `55,110 ${pts} 490,110`;
                  return (
                    <g>
                      <polygon points={areaPts} fill="url(#fuelGrad)" />
                      <polyline fill="none" stroke="#946013" strokeWidth="2" points={pts} strokeLinecap="round" strokeLinejoin="round" />
                      {trendData.map((d, i) => {
                        const x = 55 + (i / (trendData.length - 1)) * 435;
                        const y = 15 + (1 - d.fuel / maxVal) * 95;
                        return (
                          <circle key={i} cx={x} cy={y} r="2.5" fill="#946013" stroke="#060b14" strokeWidth="1" />
                        );
                      })}
                    </g>
                  );
                })()}

                {/* Water Line */}
                {(() => {
                  const maxVal = isMaitri ? 60000 : 90000;
                  const pts = trendData.map((d, i) => {
                    const x = 55 + (i / (trendData.length - 1)) * 435;
                    const y = 15 + (1 - (d.water * 2.5) / maxVal) * 95;
                    return `${x},${y}`;
                  }).join(' ');
                  return (
                    <g>
                      <polyline fill="none" stroke="#147889" strokeWidth="1.8" strokeDasharray={trendData.some(d => d.week.includes('Proj')) ? "3 3" : "none"} points={pts} strokeLinecap="round" strokeLinejoin="round" />
                      {trendData.map((d, i) => {
                        const x = 55 + (i / (trendData.length - 1)) * 435;
                        const y = 15 + (1 - (d.water * 2.5) / maxVal) * 95;
                        return (
                          <circle key={i} cx={x} cy={y} r="2.5" fill="#147889" stroke="#060b14" strokeWidth="1" />
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Resupply Ship & Manifest Card */}
          <div className="resupply-card polaris-card">
            <div className="panel-title-row">
              <Ship size={16} className="text-blue" />
              <h3 className="section-title">44th ISEA Resupply Expedition Manifest</h3>
            </div>
            <div className="ship-meta-box">
              <div className="ship-title-row">
                <span className="ship-name">{resupplyVoyage.vesselName}</span>
                <span className="ship-eta-pill">ETA: {resupplyVoyage.etaDestination}</span>
              </div>
              <span className="ship-loc">Current Position: {resupplyVoyage.currentLocation}</span>
            </div>

            <div className="manifest-list">
              <div className="manifest-hdr">Inbound Cargo Manifest:</div>
              {resupplyVoyage.manifest.map((m, idx) => (
                <div key={idx} className="manifest-item-row">
                  <span className="manifest-item-name">{m.item}</span>
                  <span className="manifest-item-qty mono-num">{m.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
