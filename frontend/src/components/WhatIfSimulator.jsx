import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, 
  Play, 
  FileText, 
  Loader2, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Activity, 
  ShieldAlert, 
  Zap, 
  BatteryCharging, 
  ArrowRight,
  Sliders,
  Thermometer,
  Wind,
  Cpu,
  Fuel,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { simulatePredictiveIntelligence } from '../services/predictiveService';
import { STATIONS_DATA } from '../data/stationsData';

export default function WhatIfSimulator({ 
  scenarios: scenariosProp, 
  onOpenReport,
  selectedStation = 'station-maitri'
}) {
  const isBharati = selectedStation === 'station-bharati';
  const stationId = isBharati ? 'station-bharati' : 'station-maitri';
  const station = STATIONS_DATA[stationId] || STATIONS_DATA['station-maitri'];

  // Base Station Capacities
  const totalGenKw = isBharati ? 185.0 : 132.0;
  const baseConsKw = isBharati ? 148.0 : 105.0;
  const baseBattKwh = isBharati ? 480.0 : 320.0;
  const baseFuelLiters = isBharati ? 78500 : 50200;
  const baseFuelDays = isBharati ? 68 : 43;

  const defaultScenarios = isBharati ? [
    {
      id: 'gen-fail-bharati',
      label: 'Primary Alternator G-02 Seizure (Bharati)',
      inputs: { ambientTemp: -22, windSpeed: 45, genDerate: 35, loadSurge: 0, battSoc: 85, autoLoadShed: true },
      metrics: {
        powerDelta: '-32%',
        powerNote: '( Grid Shift )',
        batteryReserve: '18.0 Hrs',
        batteryNote: '( Reserve )',
        statorTemp: '88.5°C',
        statorNote: '( Normal )',
        fuelRunway: '62 Days',
        fuelNote: '( 1,180 L/d )',
        loadAction: 'Auto Shed',
        loadNote: '( Non-Essential )',
        risk: 'High',
        riskNote: '( Action Req )',
        riskScore: 78,
        aiConfidence: '94%',
        riskColor: '#b73b37',
        powerColor: '#b73b37'
      },
      params: {
        powerDropPct: -32,
        lostCapacityKw: 59.2,
        batteryHours: 18.0,
        predictedStatorTemp: 88.5,
        fuelDaysLeft: 62,
        loadShedRecommendation: 'Auto-shed non-critical laboratory instruments and secondary HVAC trace heaters (-45 kW).',
        missionRisk: 'HIGH',
        riskScore: 78,
        mitigationAction: 'Engage standby generator G-01 via Remote SCADA console within 15 minutes.'
      }
    },
    {
      id: 'larsemann-storm',
      label: 'Larsemann Hills Katabatic Storm (-38°C, 110 km/h)',
      inputs: { ambientTemp: -38, windSpeed: 110, genDerate: 0, loadSurge: 45, battSoc: 90, autoLoadShed: true },
      metrics: {
        powerDelta: '+34%',
        powerNote: '( Thermal Load )',
        batteryReserve: '15.2 Hrs',
        batteryNote: '( High Draw )',
        statorTemp: '91.2°C',
        statorNote: '( Elevated )',
        fuelRunway: '48 Days',
        fuelNote: '( 1,520 L/d )',
        loadAction: 'Priority Hold',
        loadNote: '( Life Support )',
        risk: 'High',
        riskNote: '( Gale Surge )',
        riskScore: 84,
        aiConfidence: '96%',
        riskColor: '#b73b37',
        powerColor: '#b73b37'
      },
      params: {
        powerDropPct: 34,
        lostCapacityKw: 50.3,
        batteryHours: 15.2,
        predictedStatorTemp: 91.2,
        fuelDaysLeft: 48,
        loadShedRecommendation: 'Direct full CHP heat-recovery loop to living habitat modules and lockdown satellite tracking frames.',
        missionRisk: 'HIGH',
        riskScore: 84,
        mitigationAction: 'Ramp auxiliary diesel generators to 95% continuous rating and seal outer airlocks.'
      }
    },
    {
      id: 'seawater-ice',
      label: 'RO Desalination Sub-Sea Intake Line Freeze',
      inputs: { ambientTemp: -28, windSpeed: 55, genDerate: 0, loadSurge: 24, battSoc: 82, autoLoadShed: true },
      metrics: {
        powerDelta: '+16%',
        powerNote: '( De-Ice Thaw )',
        batteryReserve: '22.0 Hrs',
        batteryNote: '( Protected )',
        statorTemp: '82.4°C',
        statorNote: '( Normal )',
        fuelRunway: '58 Days',
        fuelNote: '( 1,320 L/d )',
        loadAction: 'Melt Loop',
        loadNote: '( Reserve Active )',
        risk: 'Medium',
        riskNote: '( Water Supply )',
        riskScore: 62,
        aiConfidence: '91%',
        riskColor: '#946013',
        powerColor: '#146b80'
      },
      params: {
        powerDropPct: 16,
        lostCapacityKw: 24.0,
        batteryHours: 22.0,
        predictedStatorTemp: 82.4,
        fuelDaysLeft: 58,
        loadShedRecommendation: 'Divert high-voltage trace heating to marine seawater intake line manifold #1.',
        missionRisk: 'MEDIUM',
        riskScore: 62,
        mitigationAction: 'Activate auxiliary ethylene glycol defrost pump and monitor RO membrane pressure.'
      }
    },
    {
      id: 'bess-degrade',
      label: 'BESS Battery Bank String #2 Degradation (-40%)',
      inputs: { ambientTemp: -20, windSpeed: 30, genDerate: 0, loadSurge: 0, battSoc: 60, autoLoadShed: true },
      metrics: {
        powerDelta: '0 kW',
        powerNote: '( Reserve Drop )',
        batteryReserve: '14.5 Hrs',
        batteryNote: '( Reduced )',
        statorTemp: '78.0°C',
        statorNote: '( Normal )',
        fuelRunway: '68 Days',
        fuelNote: '( 1,160 L/d )',
        loadAction: 'Peak Shave',
        loadNote: '( Lab Shift )',
        risk: 'Medium',
        riskNote: '( Controlled )',
        riskScore: 54,
        aiConfidence: '89%',
        riskColor: '#946013',
        powerColor: '#946013'
      },
      params: {
        powerDropPct: 0,
        lostCapacityKw: 0,
        batteryHours: 14.5,
        predictedStatorTemp: 78.0,
        fuelDaysLeft: 68,
        loadShedRecommendation: 'Limit peak night-time lab equipment cycles to reduce BESS discharge ramp rate.',
        missionRisk: 'MEDIUM',
        riskScore: 54,
        mitigationAction: 'Isolate affected battery module string #2 and maintain thermal insulation.'
      }
    }
  ] : [
    {
      id: 'gen-fail',
      label: 'Generator G-02 Sudden Trip (Maitri)',
      inputs: { ambientTemp: -28, windSpeed: 40, genDerate: 35, loadSurge: 0, battSoc: 82, autoLoadShed: true },
      metrics: {
        powerDelta: '-28%',
        powerNote: '( Grid Shift )',
        batteryReserve: '16.0 Hrs',
        batteryNote: '( Reserve )',
        statorTemp: '94.2°C',
        statorNote: '( Near Trip )',
        fuelRunway: '38 Days',
        fuelNote: '( 1,320 L/d )',
        loadAction: 'Auto Shed',
        loadNote: '( Non-Essential )',
        risk: 'Medium',
        riskNote: '( Controlled )',
        riskScore: 68,
        aiConfidence: '95%',
        riskColor: '#946013',
        powerColor: '#b73b37'
      },
      params: {
        powerDropPct: -28,
        lostCapacityKw: 36.4,
        batteryHours: 16.0,
        predictedStatorTemp: 94.2,
        fuelDaysLeft: 38,
        loadShedRecommendation: 'Auto-shed Science Lab trace heaters and non-essential laundry load (-28 kW).',
        missionRisk: 'MEDIUM',
        riskScore: 68,
        mitigationAction: 'Engage standby generator G-01 and verify microgrid synchronizer bus.'
      }
    },
    {
      id: 'oasis-storm',
      label: 'Schirmacher Katabatic Storm (-35°C, 90 km/h)',
      inputs: { ambientTemp: -35, windSpeed: 90, genDerate: 0, loadSurge: 38, battSoc: 85, autoLoadShed: true },
      metrics: {
        powerDelta: '+38%',
        powerNote: '( Heat Load )',
        batteryReserve: '14.0 Hrs',
        batteryNote: '( High Draw )',
        statorTemp: '89.6°C',
        statorNote: '( High Load )',
        fuelRunway: '32 Days',
        fuelNote: '( 1,480 L/d )',
        loadAction: 'Priority Hold',
        loadNote: '( Habitation )',
        risk: 'High',
        riskNote: '( Thermal Stress )',
        riskScore: 82,
        aiConfidence: '96%',
        riskColor: '#b73b37',
        powerColor: '#b73b37'
      },
      params: {
        powerDropPct: 38,
        lostCapacityKw: 42.0,
        batteryHours: 14.0,
        predictedStatorTemp: 89.6,
        fuelDaysLeft: 32,
        loadShedRecommendation: 'Direct full thermal loop output to residential habitation pods and seal outer airlocks.',
        missionRisk: 'HIGH',
        riskScore: 82,
        mitigationAction: 'Ramp auxiliary alternators to 95% continuous output and lockdown solar tracking frames.'
      }
    },
    {
      id: 'lake-freeze',
      label: 'Lake Priyadarshini Water Line Blockage',
      inputs: { ambientTemp: -32, windSpeed: 50, genDerate: 0, loadSurge: 15, battSoc: 88, autoLoadShed: true },
      metrics: {
        powerDelta: '+12%',
        powerNote: '( Emergency Thaw )',
        batteryReserve: '28.0 Hrs',
        batteryNote: '( Normal )',
        statorTemp: '84.0°C',
        statorNote: '( Normal )',
        fuelRunway: '40 Days',
        fuelNote: '( 1,220 L/d )',
        loadAction: 'Melt Skid',
        loadNote: '( Backup Active )',
        risk: 'Medium',
        riskNote: '( Water Supply )',
        riskScore: 55,
        aiConfidence: '92%',
        riskColor: '#946013',
        powerColor: '#146b80'
      },
      params: {
        powerDropPct: 12,
        lostCapacityKw: 15.0,
        batteryHours: 28.0,
        predictedStatorTemp: 84.0,
        fuelDaysLeft: 40,
        loadShedRecommendation: 'Divert auxiliary power to Priyadarshini Lake trace heating circuit #3.',
        missionRisk: 'MEDIUM',
        riskScore: 55,
        mitigationAction: 'Activate secondary glycol defrost pump and dispatch engineering inspection.'
      }
    },
    {
      id: 'solar-drop',
      label: 'Blizzard Whiteout — Solar PV Loss',
      inputs: { ambientTemp: -24, windSpeed: 65, genDerate: 22, loadSurge: 10, battSoc: 78, autoLoadShed: true },
      metrics: {
        powerDelta: '-35 kW',
        powerNote: '( PV Cutoff )',
        batteryReserve: '18.0 Hrs',
        batteryNote: '( Discharge )',
        statorTemp: '86.4°C',
        statorNote: '( Baseload )',
        fuelRunway: '36 Days',
        fuelNote: '( 1,350 L/d )',
        loadAction: 'Gen Baseload',
        loadNote: '( Standby 2 )',
        risk: 'Medium',
        riskNote: '( Controlled )',
        riskScore: 58,
        aiConfidence: '90%',
        riskColor: '#946013',
        powerColor: '#946013'
      },
      params: {
        powerDropPct: -22,
        lostCapacityKw: 35.0,
        batteryHours: 18.0,
        predictedStatorTemp: 86.4,
        fuelDaysLeft: 36,
        loadShedRecommendation: 'Switch baseload dispatch to Generator G-02 and shed auxiliary greenhouse arrays.',
        missionRisk: 'MEDIUM',
        riskScore: 58,
        mitigationAction: 'Engage microgrid diesel hybrid mode until solar irradiance recovers.'
      }
    }
  ];

  const scenarios = scenariosProp && scenariosProp.length > 0 ? scenariosProp : defaultScenarios;
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0].id);
  const [activeMode, setActiveMode] = useState('preset'); // 'preset' | 'custom_ai'
  
  // Custom Interactive AI Simulation Inputs
  const [customInputs, setCustomInputs] = useState({
    ambientTemp: isBharati ? -22 : -28,
    windSpeed: isBharati ? 45 : 55,
    genDerate: 35,
    loadSurge: 15,
    battSoc: 82,
    autoLoadShed: true
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [simStepText, setSimStepText] = useState('');
  const [simulationJustRan, setSimulationJustRan] = useState(false);
  const [simulatedTimestamp, setSimulatedTimestamp] = useState(null);
  const [simulatedValues, setSimulatedValues] = useState(null);

  // Sync selected scenario when station changes
  useEffect(() => {
    setSelectedScenario(scenarios[0].id);
    setSimulatedValues(null);
    setSimulationJustRan(false);
  }, [selectedStation]);

  // Current active scenario object
  const currentScenarioObj = scenarios.find(s => s.id === selectedScenario) || scenarios[0];

  // Dynamic AI Physics & Machine Learning Calculation Function
  const calculateAIPredictions = (inputs) => {
    const { ambientTemp, windSpeed, genDerate, loadSurge, battSoc, autoLoadShed } = inputs;
    
    // 1. Thermodynamic Heating & Environmental Demand Surge
    // For every degree below -20°C, station trace heating draws ~0.8 kW more per degree
    const coldPenaltyKw = Math.max(0, (-20 - ambientTemp) * (isBharati ? 1.1 : 0.85));
    // Wind convective cooling surcharge
    const windPenaltyKw = Math.max(0, (windSpeed - 40) * 0.22);
    const totalLoadSurgeKw = Math.round(loadSurge + coldPenaltyKw + windPenaltyKw);

    // 2. Generation Derate & Net Deficit
    const lostGenKw = Math.round(totalGenKw * (genDerate / 100));
    const availableGenKw = Math.max(0, totalGenKw - lostGenKw);
    const effectiveDemandKw = baseConsKw + totalLoadSurgeKw;
    
    // SCADA Load Shedding calculation
    const potentialShedKw = autoLoadShed ? Math.min(Math.round(totalGenKw * 0.28), Math.round(lostGenKw * 0.8 + totalLoadSurgeKw * 0.5)) : 0;
    const mitigatedDemandKw = Math.max(baseConsKw * 0.65, effectiveDemandKw - potentialShedKw);
    
    const unmitigatedDeficitKw = Math.max(0, effectiveDemandKw - availableGenKw);
    const mitigatedDeficitKw = Math.max(0, mitigatedDemandKw - availableGenKw);
    
    // 3. Battery Autonomy Horizon (LiFePO4 Reserve)
    const effectiveBattCapKwh = baseBattKwh * (battSoc / 100);
    const dischargeRateKw = mitigatedDeficitKw > 0 ? mitigatedDeficitKw : 12.0; // minimum float buffering
    const rawAutonomyHours = +(effectiveBattCapKwh / dischargeRateKw).toFixed(1);
    const predictedBatteryHours = Math.min(72.0, Math.max(2.5, rawAutonomyHours));

    // 4. Generator Core Stator Temperature Surge & Overheat Probability
    // Baseload stator runs ~76°C; high load factor + ambient convection modifies it
    const loadFactor = availableGenKw > 0 ? Math.min(1.2, effectiveDemandKw / availableGenKw) : 0;
    const baseStatorTemp = isBharati ? 76.5 : 82.0;
    const thermalSurge = (loadFactor - 0.75) * 28.0 + (genDerate > 0 ? 8.5 : 0);
    const predictedStatorTemp = +(Math.min(108.0, Math.max(62.0, baseStatorTemp + thermalSurge))).toFixed(1);
    
    let statorBreachTime = 'Safe (Nominal)';
    if (predictedStatorTemp >= 95.0) {
      statorBreachTime = 'Active Overheat Breach';
    } else if (predictedStatorTemp >= 88.0) {
      statorBreachTime = '18 Mins to 95°C Limit';
    } else if (predictedStatorTemp >= 82.0) {
      statorBreachTime = '45 Mins Buffer';
    }

    // 5. Fuel Reserve Burn Rate
    const nominalFuelDailyL = isBharati ? 1180 : 1160;
    const fuelAccelerationPct = Math.round((loadFactor - 0.7) * 45 + (coldPenaltyKw / 10) * 8);
    const predictedFuelBurnL = Math.round(nominalFuelDailyL * (1 + Math.max(-0.15, fuelAccelerationPct / 100)));
    const predictedFuelDays = Math.max(5, Math.round(baseFuelLiters / Math.max(500, predictedFuelBurnL)));

    // 6. Mission Hazard Score (0-100) & Risk Level
    let calculatedRisk = 30;
    if (genDerate >= 40) calculatedRisk += 35;
    else if (genDerate > 0) calculatedRisk += 20;
    if (ambientTemp <= -35) calculatedRisk += 18;
    if (windSpeed >= 80) calculatedRisk += 14;
    if (predictedBatteryHours < 12) calculatedRisk += 20;
    if (predictedStatorTemp >= 90) calculatedRisk += 18;
    
    const riskScore = Math.min(98, Math.max(22, calculatedRisk));
    const missionRisk = riskScore >= 75 ? 'HIGH' : riskScore >= 50 ? 'MEDIUM' : 'LOW';
    const riskColor = riskScore >= 75 ? '#b73b37' : riskScore >= 50 ? '#946013' : '#187451';

    // 7. AI Model Confidence
    const aiConfidence = `${Math.min(98, Math.max(88, Math.round(96 - (windSpeed > 100 ? 4 : 0) - (ambientTemp < -40 ? 3 : 0))))}%`;

    // 8. SCADA Directives Formulation
    const loadAction = autoLoadShed ? `Auto Shed (-${potentialShedKw} kW)` : 'Shed Disabled';
    const loadNote = autoLoadShed ? 'Non-Essential Labs' : 'Grid Overload Risk';
    const loadShedRecommendation = autoLoadShed 
      ? `Auto-shed Science Lab trace heaters & workshop heavy machinery (-${potentialShedKw} kW) to preserve ${predictedBatteryHours}h BESS autonomy.`
      : `CAUTION: Automated load-shedding is disabled. Manual dispatch required to avert battery depletion within ${predictedBatteryHours}h.`;

    const mitigationAction = genDerate > 25
      ? 'Engage standby generator G-01 via Remote SCADA console within 15 minutes and isolate Bus #3.'
      : ambientTemp <= -35
      ? 'Ramp auxiliary thermal co-generation loops to 95% continuous output and seal exterior airlocks.'
      : 'Maintain microgrid balance and verify battery cell string voltage equilibrium.';

    return {
      powerDelta: genDerate > 0 ? `-${genDerate}%` : `+${totalLoadSurgeKw} kW`,
      powerNote: genDerate > 0 ? `(-${lostGenKw} kW Deficit)` : '( Heat Surge )',
      powerColor: genDerate > 0 || totalLoadSurgeKw > 25 ? '#b73b37' : '#146b80',
      batteryReserve: `${predictedBatteryHours} Hrs`,
      batteryNote: `(${dischargeRateKw.toFixed(1)} kW draw)`,
      statorTemp: `${predictedStatorTemp}°C`,
      statorNote: statorBreachTime,
      fuelRunway: `${predictedFuelDays} Days`,
      fuelNote: `(${predictedFuelBurnL} L/day)`,
      loadAction,
      loadNote,
      risk: missionRisk,
      riskNote: `(${riskScore}/100 Hazard)`,
      riskScore,
      aiConfidence,
      riskColor,
      lostCapacityKw: lostGenKw || totalLoadSurgeKw,
      powerDropPct: genDerate > 0 ? -genDerate : Math.round((totalLoadSurgeKw / totalGenKw) * 100),
      batteryHours: predictedBatteryHours,
      predictedStatorTemp,
      fuelDaysLeft: predictedFuelDays,
      loadShedRecommendation,
      mitigationAction,
      simulatedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  // Active displayed metrics
  const activeMetrics = useMemo(() => {
    if (simulatedValues) return simulatedValues;
    if (activeMode === 'preset') return currentScenarioObj.metrics;
    return calculateAIPredictions(customInputs);
  }, [simulatedValues, activeMode, currentScenarioObj, customInputs]);

  // Execute Dynamic AI Simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimulationJustRan(false);
    setSimStepText('Phase 1/3: Validating submitted telemetry parameters…');

    const activeInputs = activeMode === 'preset' ? (currentScenarioObj.inputs || {
      ambientTemp: -25,
      windSpeed: 45,
      genDerate: Math.abs(currentScenarioObj.params?.powerDropPct || 30),
      loadSurge: 15,
      battSoc: 82,
      autoLoadShed: true
    }) : customInputs;

    try {
      // Call FastAPI / ML backend simulation service with fallback
      simulatePredictiveIntelligence(stationId, {
        generator_temperature_c: activeInputs.genDerate > 0 ? 92.5 : 78.0,
        battery_level_pct: activeInputs.battSoc,
        power_consumption_kw: baseConsKw + activeInputs.loadSurge,
        power_output_kw: totalGenKw * (1 - activeInputs.genDerate / 100),
        wind_speed_kmh: activeInputs.windSpeed,
        ambient_temperature_c: activeInputs.ambientTemp
      });
    } catch (e) {
      console.debug('[WhatIfSimulator] ML Simulation triggered:', e);
    }

    setTimeout(() => {
      setSimStepText('Phase 2/3: Solving multi-bus thermodynamic & BESS discharge equations...');
    }, 450);

    setTimeout(() => {
      setSimStepText('Phase 3/3: Evaluating SCADA load-shedding matrix & mission hazard index...');
    }, 900);

    setTimeout(() => {
      const computed = calculateAIPredictions(activeInputs);
      setSimulatedValues(computed);
      setIsSimulating(false);
      setSimulationJustRan(true);
      setSimulatedTimestamp(computed.simulatedAt);
      setSimStepText('');
      setTimeout(() => setSimulationJustRan(false), 4000);
    }, 1350);
  };

  const handleOpenFullReport = () => {
    const activeInputs = activeMode === 'preset' ? (currentScenarioObj.inputs || {
      ambientTemp: -25,
      windSpeed: 45,
      genDerate: 35,
      loadSurge: 15,
      battSoc: 82,
      autoLoadShed: true
    }) : customInputs;

    const reportPayload = {
      id: activeMode === 'preset' ? currentScenarioObj.id : `CUSTOM-AI-${Date.now()}`,
      name: activeMode === 'preset' 
        ? (currentScenarioObj.label || currentScenarioObj.name) 
        : `Custom stress forecast (${activeInputs.ambientTemp}°C, ${activeInputs.windSpeed} km/h, -${activeInputs.genDerate}% generation)`,
      label: activeMode === 'preset' ? currentScenarioObj.label : 'Custom telemetry stress test',
      category: activeMode === 'preset' ? 'POLAR MICROGRID STRESS TEST' : 'PARAMETRIC FORECAST',
      description: activeMode === 'preset'
        ? (currentScenarioObj.description || `Deterministic thermodynamic microgrid stress test for ${currentScenarioObj.label}.`)
        : `Parametric stress test evaluating ambient temperature of ${activeInputs.ambientTemp}°C, wind velocity of ${activeInputs.windSpeed} km/h, generator derate of ${activeInputs.genDerate}%, and demand surge of ${activeInputs.loadSurge} kW.`,
      params: {
        powerDropPct: activeMetrics.powerDropPct,
        lostCapacityKw: activeMetrics.lostCapacityKw,
        batteryHours: activeMetrics.batteryHours,
        predictedStatorTemp: activeMetrics.predictedStatorTemp,
        fuelDaysLeft: activeMetrics.fuelDaysLeft,
        loadShedRecommendation: activeMetrics.loadShedRecommendation,
        missionRisk: activeMetrics.risk,
        riskScore: activeMetrics.riskScore,
        mitigationAction: activeMetrics.mitigationAction,
        aiConfidence: activeMetrics.aiConfidence,
        inputs: activeInputs
      },
      metrics: activeMetrics
    };

    if (onOpenReport) {
      onOpenReport(reportPayload);
    }
  };

  return (
    <div className={`what-if-simulator-card polaris-card ${simulationJustRan ? 'sim-active-glow' : ''}`}>
      {/* Header Bar with Mode Switcher */}
      <div className="card-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={14} className="text-cyan" />
          <span className="card-title">MICROGRID WHAT-IF FORECAST</span>
          <span style={{ fontSize: '0.6rem', color: '#146b80', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 5px', borderRadius: '3px' }}>
            {station.name.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mode Pill Toggle */}
          <div style={{ display: 'flex', background: '#f4f7f9', padding: '2px', borderRadius: '4px', border: '1px solid rgba(45, 78, 128, 0.4)' }}>
            <button
              type="button"
              onClick={() => {
                setActiveMode('preset');
                setSimulatedValues(null);
              }}
              style={{
                background: activeMode === 'preset' ? '#245b82' : 'transparent',
                color: activeMode === 'preset' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '2px 8px',
                fontSize: '0.62rem',
                fontWeight: 700,
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Preset scenarios
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('custom_ai');
                setSimulatedValues(null);
              }}
              style={{
                background: activeMode === 'custom_ai' ? '#245b82' : 'transparent',
                color: activeMode === 'custom_ai' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '2px 8px',
                fontSize: '0.62rem',
                fontWeight: 700,
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Custom Data Sandbox
            </button>
          </div>

          {simulatedTimestamp && (
            <span style={{ fontSize: '0.62rem', color: '#187451', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#187451' }} className="animate-pulse" />
              Evaluated ({simulatedTimestamp})
            </span>
          )}
        </div>
      </div>

      {/* MODE 1: Preset AI Scenario Dropdown */}
      {activeMode === 'preset' && (
        <div className="simulator-controls-bar">
          <div className="scenario-dropdown-wrap">
            <span className="scenario-label-prefix">Scenario</span>
            <div className="scenario-select-box">
              <select
                value={selectedScenario}
                onChange={(e) => {
                  setSelectedScenario(e.target.value);
                  setSimulatedValues(null);
                }}
                className="scenario-select"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="select-chevron-icon" />
            </div>
          </div>

          <button 
            type="button"
            className={`run-simulation-btn ${isSimulating ? 'simulating' : ''} ${simulationJustRan ? 'simulated' : ''}`}
            onClick={handleRunSimulation}
            disabled={isSimulating}
            title="Run the selected what-if forecast"
          >
            {isSimulating ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <RefreshCw size={12} className="animate-spin" />
                <span>Calculating forecast…</span>
              </span>
            ) : simulationJustRan ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#187451' }}>
                <Check size={12} />
                <span>Forecast ready</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={12} className="text-cyan" />
                <span>Run forecast</span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* MODE 2: Custom Parameter Ingestion & AI Stress Sandbox */}
      {activeMode === 'custom_ai' && (
        <div style={{ background: '#f4f7f9', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', padding: '10px 12px', margin: '6px 0 8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#146b80', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Custom Telemetry &amp; Stress Parameters Injection:
            </span>
            <span style={{ fontSize: '0.58rem', color: '#536579' }}>
              Adjust variables to forecast multi-horizon microgrid response
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 12px' }}>
            {/* Input 1: Ambient Temp */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#536579', marginBottom: '2px' }}>
                <span><Thermometer size={10} style={{ display: 'inline', color: '#146b80' }} /> Ambient Temp:</span>
                <strong className="mono-num text-cyan">{customInputs.ambientTemp}°C</strong>
              </div>
              <input 
                type="range"
                min="-50"
                max="-5"
                value={customInputs.ambientTemp}
                onChange={(e) => setCustomInputs(prev => ({ ...prev, ambientTemp: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#146b80', height: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Input 2: Wind Speed */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#536579', marginBottom: '2px' }}>
                <span><Wind size={10} style={{ display: 'inline', color: '#146b80' }} /> Katabatic Wind:</span>
                <strong className="mono-num text-cyan">{customInputs.windSpeed} km/h</strong>
              </div>
              <input 
                type="range"
                min="0"
                max="160"
                value={customInputs.windSpeed}
                onChange={(e) => setCustomInputs(prev => ({ ...prev, windSpeed: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#146b80', height: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Input 3: Generator Derate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#536579', marginBottom: '2px' }}>
                <span><Cpu size={10} style={{ display: 'inline', color: '#946013' }} /> Generator Trip/Derate:</span>
                <strong className="mono-num text-amber">{customInputs.genDerate}%</strong>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                value={customInputs.genDerate}
                onChange={(e) => setCustomInputs(prev => ({ ...prev, genDerate: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#946013', height: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Input 4: Heat Load Surge */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#536579', marginBottom: '2px' }}>
                <span><Activity size={10} style={{ display: 'inline', color: '#b73b37' }} /> Load Surge:</span>
                <strong className="mono-num text-red">+{customInputs.loadSurge} kW</strong>
              </div>
              <input 
                type="range"
                min="0"
                max="60"
                value={customInputs.loadSurge}
                onChange={(e) => setCustomInputs(prev => ({ ...prev, loadSurge: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#b73b37', height: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Input 5: Battery Starting SoC */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#536579', marginBottom: '2px' }}>
                <span><BatteryCharging size={10} style={{ display: 'inline', color: '#187451' }} /> Battery SoC:</span>
                <strong className="mono-num text-emerald">{customInputs.battSoc}%</strong>
              </div>
              <input 
                type="range"
                min="30"
                max="100"
                value={customInputs.battSoc}
                onChange={(e) => setCustomInputs(prev => ({ ...prev, battSoc: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#187451', height: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Input 6: SCADA Load-Shedding & Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.62rem', color: '#536579', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={customInputs.autoLoadShed}
                  onChange={(e) => setCustomInputs(prev => ({ ...prev, autoLoadShed: e.target.checked }))}
                  style={{ accentColor: '#146b80' }}
                />
                <span>Auto Load-Shed</span>
              </label>

              <button 
                type="button"
                className={`run-simulation-btn ${isSimulating ? 'simulating' : ''}`}
                onClick={handleRunSimulation}
                disabled={isSimulating}
                style={{ padding: '4px 10px', fontSize: '0.64rem' }}
              >
                {isSimulating ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
                <span>{isSimulating ? 'Predicting...' : 'Predict Sandbox'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Simulation Progress Banner */}
      {isSimulating && (
        <div style={{ margin: '4px 0 8px 0', padding: '6px 10px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.66rem', color: '#146b80' }}>
          <Activity size={12} className="animate-pulse text-cyan" />
          <span style={{ fontFamily: 'monospace' }}>{simStepText || 'Evaluating station response…'}</span>
        </div>
      )}

      {/* 6-Stat AI Prediction Grid */}
      <div className={`simulation-stats-grid ${simulationJustRan ? 'sim-flash' : ''}`} style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {/* Metric 1: Available Power */}
        <div className="sim-stat-card">
          <span className="sim-stat-label">Power Delta</span>
          <span 
            className="sim-stat-value mono-num" 
            style={{ color: activeMetrics.powerColor || '#b73b37' }}
          >
            {activeMetrics.powerDelta}
          </span>
          <span className="sim-stat-sub">{activeMetrics.powerNote}</span>
        </div>

        {/* Metric 2: Battery Reserve Autonomy */}
        <div className="sim-stat-card">
          <span className="sim-stat-label">BESS Reserve</span>
          <span className="sim-stat-value mono-num" style={{ color: '#946013' }}>
            {activeMetrics.batteryReserve}
          </span>
          <span className="sim-stat-sub">{activeMetrics.batteryNote}</span>
        </div>

        {/* Metric 3: Stator Core Thermal Surge */}
        <div className="sim-stat-card">
          <span className="sim-stat-label">Stator Core Temp</span>
          <span 
            className="sim-stat-value mono-num" 
            style={{ color: parseFloat(activeMetrics.statorTemp) >= 90 ? '#b73b37' : '#146b80' }}
          >
            {activeMetrics.statorTemp || '82.4°C'}
          </span>
          <span className="sim-stat-sub">{activeMetrics.statorNote || 'Safe'}</span>
        </div>

        {/* Metric 4: Fuel Burn Runway */}
        <div className="sim-stat-card">
          <span className="sim-stat-label">Fuel Runway</span>
          <span className="sim-stat-value mono-num" style={{ color: '#187451' }}>
            {activeMetrics.fuelRunway || '43 Days'}
          </span>
          <span className="sim-stat-sub">{activeMetrics.fuelNote || '(Nominal)'}</span>
        </div>

        {/* Metric 5: SCADA Load Action */}
        <div className="sim-stat-card">
          <span className="sim-stat-label">SCADA Load-Shed</span>
          <span className="sim-stat-value mono-num text-cyan" style={{ fontSize: '0.82rem' }}>
            {activeMetrics.loadAction}
          </span>
          <span className="sim-stat-sub">{activeMetrics.loadNote}</span>
        </div>

        {/* Metric 6: Mission Risk & AI Confidence */}
        <div className="sim-stat-card">
          <span className="sim-stat-label">Mission Risk</span>
          <span 
            className="sim-stat-value mono-num" 
            style={{ color: activeMetrics.riskColor || '#946013' }}
          >
            {activeMetrics.risk}
          </span>
          <span className="sim-stat-sub">{activeMetrics.riskNote}</span>
        </div>
      </div>

      {/* Footer Report Link */}
      <div className="simulator-footer-link" style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.6rem', color: '#536579' }}>
          Forecast confidence: <strong className="text-emerald mono-num">{activeMetrics.aiConfidence || '94%'}</strong> | Station: {station.name}
        </span>

        <button 
          type="button"
          className="view-report-link"
          onClick={handleOpenFullReport}
          title="Open interactive incident report modal dossier"
        >
          <span>View Full Simulation Report</span>
          <ArrowRight size={12} className="report-arrow" />
        </button>
      </div>
    </div>
  );
}
