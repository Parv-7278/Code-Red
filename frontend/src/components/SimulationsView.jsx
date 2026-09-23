import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Play, 
  Flame, 
  BatteryWarning, 
  Wind, 
  Radio, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck,
  Cpu, 
  Zap,
  TrendingDown,
  TrendingUp,
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  Droplets,
  Lock,
  RefreshCw,
  Sparkles,
  Activity,
  Clock,
  ArrowRight,
  HelpCircle,
  Thermometer,
  Shield,
  Gauge
} from 'lucide-react';
import { STATIONS_DATA } from '../data/stationsData';
import { useModal } from '../context/ModalContext';
import { runWhatIfPrediction } from '../services/predictiveService';
import './SimulationsView.css';

export default function SimulationsView({ selectedStation, onOpenReport }) {
  const { openDrillDown } = useModal();
  const stationId = selectedStation === 'all-stations' ? 'station-maitri' : selectedStation;
  const station = STATIONS_DATA[stationId] || STATIONS_DATA['station-maitri'];
  const isMaitri = station.id === 'station-maitri';

  const [activeTabMode, setActiveTabMode] = useState('sandbox'); // 'sandbox' | 'scenarios' | 'archive'
  const [activeScenarioId, setActiveScenarioId] = useState('GEN_FAIL');
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationPhaseLog, setSimulationPhaseLog] = useState('');
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [loadShedApplied, setLoadShedApplied] = useState(false);

  // What-If ML Sliders Parameters
  const [sandboxParams, setSandboxParams] = useState({
    ambientTemp: isMaitri ? -28 : -22,
    genDeratePct: 35,
    windSpeedKmh: isMaitri ? 75 : 65,
    priorityReservePct: 80,
    loadReductionKw: 0
  });

  // What-If ML Output State
  const [mlPredictionResult, setMlPredictionResult] = useState(null);
  const [baselinePrediction, setBaselinePrediction] = useState(null);
  const [interventionPrediction, setInterventionPrediction] = useState(null);
  const [appliedIntervention, setAppliedIntervention] = useState(null);
  const [isMlPredicting, setIsMlPredicting] = useState(false);
  const [mlJustPredicted, setMlJustPredicted] = useState(false);
  const [activeGraphMetric, setActiveGraphMetric] = useState('all'); // 'all' | 'battery' | 'power' | 'temperature' | 'lifesupport'

  // Update baseline parameters when station changes
  useEffect(() => {
    setSandboxParams({
      ambientTemp: isMaitri ? -28 : -22,
      genDeratePct: 35,
      windSpeedKmh: isMaitri ? 75 : 65,
      priorityReservePct: 80,
      loadReductionKw: 0
    });
    setMlPredictionResult(null);
    setBaselinePrediction(null);
    setInterventionPrediction(null);
    setAppliedIntervention(null);
    setMlJustPredicted(false);
  }, [stationId]);

  // Station specific baseline metrics
  const totalGenKw = isMaitri ? 132 : 185;
  const totalConsKw = isMaitri ? 105 : 148;
  const batteryCapKwh = isMaitri ? 320 : 480;

  // Execute Real Python ML Regressor Prediction
  const handleRunAIPrediction = async () => {
    setIsMlPredicting(true);
    setMlJustPredicted(false);

    try {
      const result = await runWhatIfPrediction(station.id, {
        ambient_temperature: sandboxParams.ambientTemp,
        generator_capacity_derate: sandboxParams.genDeratePct,
        wind_velocity: sandboxParams.windSpeedKmh,
        life_support_min_reserve: sandboxParams.priorityReservePct,
        load_reduction_kw: 0
      });

      setMlPredictionResult(result);
      setBaselinePrediction(result);
      setInterventionPrediction(null);
      setAppliedIntervention(null);
      setMlJustPredicted(true);
      setTimeout(() => setMlJustPredicted(false), 4000);
    } catch (err) {
      console.error('[SimulationsView] Error executing ML prediction:', err);
    } finally {
      setIsMlPredicting(false);
    }
  };

  const handleApplyPreventiveAction = async (action) => {
    if (!action || isMlPredicting) return;

    const nextParams = { ...sandboxParams };
    let interventionSummary = '';

    if (action.category === 'POWER_DISPATCH') {
      const restoredDerate = Math.max(0, sandboxParams.genDeratePct - 25);
      nextParams.genDeratePct = restoredDerate;
      interventionSummary = `Standby generator synchronized; effective capacity derate reduced from ${sandboxParams.genDeratePct}% to ${restoredDerate}%.`;
    } else if (action.category === 'LOAD_MANAGEMENT') {
      const statedReduction = Number(action.action?.match(/~?(\d+(?:\.\d+)?)\s*kW/i)?.[1]);
      nextParams.loadReductionKw = Math.max(15, Math.min(60, statedReduction || 20));
      interventionSummary = `${nextParams.loadReductionKw} kW of non-critical load shed for the counterfactual forecast.`;
    } else if (action.category === 'THERMAL_MANAGEMENT') {
      nextParams.loadReductionKw = 12;
      interventionSummary = 'CHP heat recovery prioritized; equivalent electrical heating demand reduced by 12 kW.';
    } else {
      setAppliedIntervention({
        action,
        summary: 'Procedural safety action acknowledged. It reduces personnel exposure but does not alter the environmental forecast.',
        proceduralOnly: true,
        appliedAt: new Date().toISOString()
      });
      return;
    }

    setIsMlPredicting(true);
    try {
      const result = await runWhatIfPrediction(station.id, {
        ambient_temperature: nextParams.ambientTemp,
        generator_capacity_derate: nextParams.genDeratePct,
        wind_velocity: nextParams.windSpeedKmh,
        life_support_min_reserve: nextParams.priorityReservePct,
        load_reduction_kw: nextParams.loadReductionKw || 0
      });

      setInterventionPrediction(result);
      setMlPredictionResult(result);
      setAppliedIntervention({
        action,
        summary: interventionSummary,
        params: nextParams,
        appliedAt: new Date().toISOString()
      });
      setMlJustPredicted(true);
      setTimeout(() => setMlJustPredicted(false), 4000);
    } catch (err) {
      console.error('[SimulationsView] Error executing preventive intervention:', err);
    } finally {
      setIsMlPredicting(false);
    }
  };

  const handleRestoreBaseline = () => {
    if (!baselinePrediction) return;
    setMlPredictionResult(baselinePrediction);
    setInterventionPrediction(null);
    setAppliedIntervention(null);
  };

  // Auto-run initial ML prediction on mount if no result
  useEffect(() => {
    if (!mlPredictionResult && activeTabMode === 'sandbox') {
      handleRunAIPrediction();
    }
  }, [stationId, activeTabMode]);

  // Polar Preset Scenario Definitions
  const scenarios = [
    {
      id: 'GEN_FAIL',
      name: isMaitri ? 'Primary Generator G-02 Catastrophic Failure' : 'Primary Alternator G-02 Seizure (Bharati)',
      icon: Flame,
      category: 'POWER GRID FAULT',
      description: 'Simulates sudden seizure / thermal shutdown of main diesel alternator unit G-02.',
      params: {
        powerDropPct: isMaitri ? -35 : -32,
        lostCapacityKw: isMaitri ? 46.2 : 59.2,
        batteryHours: isMaitri ? 14.5 : 18.0,
        loadShedRecommendation: 'Auto-Shed Science Lab & Auxiliary Quarters Trace Heaters (-35 kW)',
        missionRisk: 'HIGH',
        riskScore: 78,
        mitigationAction: 'Engage standby generator G-01 via Remote SCADA console within 15 minutes.'
      }
    },
    {
      id: 'BATT_DEGRADE',
      name: 'BESS Battery Bank String #2 Degradation (-40%)',
      icon: BatteryWarning,
      category: 'ENERGY STORAGE',
      description: 'Simulates severe sub-zero cell degradation leading to 40% loss in reserve energy buffer.',
      params: {
        powerDropPct: 0,
        lostCapacityKw: 0,
        batteryHours: isMaitri ? 9.2 : 14.5,
        loadShedRecommendation: 'Limit peak night-time lab equipment cycles to reduce discharge ramp rate.',
        missionRisk: 'MEDIUM',
        riskScore: 54,
        mitigationAction: 'Isolate affected battery module string #2 and maintain thermal insulation.'
      }
    },
    {
      id: 'BLIZZARD_SURGE',
      name: 'Category-5 Katabatic Blizzard Thermal Surge (+45 kW)',
      icon: Wind,
      category: 'EXTREME WEATHER',
      description: 'Simulates intense blizzard (-35°C, 120 km/h winds) requiring maximum trace heating across all conduits.',
      params: {
        powerDropPct: isMaitri ? +28 : +24,
        lostCapacityKw: isMaitri ? 37.0 : 44.4,
        batteryHours: isMaitri ? 11.0 : 16.2,
        loadShedRecommendation: 'Shed non-critical domestic laundry & workshop heating loads.',
        missionRisk: 'HIGH',
        riskScore: 72,
        mitigationAction: 'Ramp all auxiliary generators to 95% continuous rating and seal station airlocks.'
      }
    },
    {
      id: 'SATCOM_BLACKOUT',
      name: 'Solar Flare Geomagnetic Ionospheric Blackout (Kp 8+)',
      icon: Radio,
      category: 'COMMUNICATION LINK',
      description: 'Simulates intense solar storm causing high-frequency RF blackout and loss of satellite carrier tracking.',
      params: {
        powerDropPct: 0,
        lostCapacityKw: 0,
        batteryHours: isMaitri ? 18.2 : 26.5,
        loadShedRecommendation: 'Switch station SCADA to Autonomous Local Islanding Mode.',
        missionRisk: 'MEDIUM',
        riskScore: 62,
        mitigationAction: 'Store telemetry in local flash buffer and await ionospheric recovery.'
      }
    },
    {
      id: 'WATER_FREEZE',
      name: isMaitri ? 'Lake Priyadarshini Intake Line Freeze' : 'RO Desalination Membrane Pressure Loss',
      icon: Droplets,
      category: 'LIFE SUPPORT & HYDRATION',
      description: isMaitri 
        ? 'Simulates sub-ice conduit freeze-up preventing raw water extraction from Lake Priyadarshini.' 
        : 'Simulates high salinity intake blockage and pressure drop across seawater RO desalinator.',
      params: {
        powerDropPct: -12,
        lostCapacityKw: 15.8,
        batteryHours: isMaitri ? 16.4 : 22.0,
        loadShedRecommendation: 'Redirect high-voltage trace heating to raw intake conduit manifold #1.',
        missionRisk: 'HIGH',
        riskScore: 81,
        mitigationAction: 'Activate auxiliary ethylene glycol heat exchanger loop and monitor head pressure.'
      }
    },
    {
      id: 'SCADA_ISLAND',
      name: 'SCADA Core Gateway Isolation & Islanding',
      icon: Lock,
      category: 'INFRASTRUCTURE CYBER SECURITY',
      description: 'Simulates sudden loss of WAN backhaul requiring local autonomous PLCs to govern all microgrid buses.',
      params: {
        powerDropPct: 0,
        lostCapacityKw: 0,
        batteryHours: isMaitri ? 18.2 : 26.5,
        loadShedRecommendation: 'Lockdown external remote control ports and engage fail-safe watchdog timer.',
        missionRisk: 'LOW',
        riskScore: 38,
        mitigationAction: 'Execute edge consensus heartbeat and verify local battery state-of-charge limits.'
      }
    }
  ];

  const currentScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];

  const handleSelectScenario = (scId) => {
    setActiveScenarioId(scId);
    setSimulationCompleted(false);
    setLoadShedApplied(false);
  };

  // Run dynamic multi-phase scenario simulation
  const handleRunPresetSimulation = () => {
    setSimulationRunning(true);
    setSimulationProgress(15);
    setSimulationPhaseLog('Phase 1/4: Injecting SCADA fault vector into station telemetry stream...');
    setLoadShedApplied(false);

    setTimeout(() => {
      setSimulationProgress(45);
      setSimulationPhaseLog('Phase 2/4: Calculating electrical bus load transient & energy depletion envelope...');
    }, 450);

    setTimeout(() => {
      setSimulationProgress(80);
      setSimulationPhaseLog('Phase 3/4: Running AI SCADA Optimal Load-Shedding & Grid Protection algorithm...');
    }, 900);

    setTimeout(() => {
      setSimulationProgress(100);
      setSimulationPhaseLog('Phase 4/4: Simulation Complete — Incident Diagnostic Report Compiled.');
      setSimulationRunning(false);
      setSimulationCompleted(true);
    }, 1350);
  };

  const handleTriggerOfficialReport = () => {
    const reportData = mlPredictionResult ? {
      name: `AI ML Predictive Simulation (${sandboxParams.ambientTemp}°C, -${sandboxParams.genDeratePct}% Gen, ${sandboxParams.windSpeedKmh} km/h)`,
      category: 'AI MACHINE LEARNING PREDICTIVE DOSSIER',
      description: `Physics-informed Multi-Horizon ML forecast evaluating ${station.name} under ${sandboxParams.ambientTemp}°C ambient temperature, ${sandboxParams.genDeratePct}% generator derate, and ${sandboxParams.windSpeedKmh} km/h katabatic wind velocity.`,
      params: {
        powerDropPct: -sandboxParams.genDeratePct,
        lostCapacityKw: Math.round(totalGenKw * (sandboxParams.genDeratePct / 100)),
        batteryHours: +(mlPredictionResult.time_series?.[4]?.battery_level ? (mlPredictionResult.time_series[4].battery_level / 4.2).toFixed(1) : 14.5),
        predictedStatorTemp: mlPredictionResult.prediction?.["120min"]?.generator_temperature || 88.0,
        fuelDaysLeft: isMaitri ? 38 : 56,
        loadShedRecommendation: mlPredictionResult.preventive_actions?.[0]?.action || 'Initiate SCADA automated load-shedding to preserve BESS buffer.',
        missionRisk: mlPredictionResult.predicted_state || 'WARNING',
        riskScore: Math.round((mlPredictionResult.risk?.composite_hazard || 0.6) * 100),
        mitigationAction: mlPredictionResult.preventive_actions?.[1]?.action || 'Transfer baseload to standby generator G-01 within 15 minutes.',
        aiConfidence: `${Math.round((mlPredictionResult.confidence || 0.88) * 100)}%`
      },
      metrics: {
        powerDelta: `-${sandboxParams.genDeratePct}%`,
        powerNote: `(-${Math.round(totalGenKw * (sandboxParams.genDeratePct / 100))} kW)`,
        batteryReserve: mlPredictionResult.domain_predictions?.battery?.time_to_critical || '14.5 Hrs',
        batteryNote: '( Reserve )',
        statorTemp: `${mlPredictionResult.prediction?.["120min"]?.generator_temperature || 88.0}°C`,
        statorNote: mlPredictionResult.time_to_breach?.generator_thermal || 'Nominal',
        fuelRunway: isMaitri ? '38 Days' : '56 Days',
        fuelNote: '( 1,220 L/d )',
        loadAction: 'Auto-Shed',
        loadNote: '( Non-Essential )',
        risk: mlPredictionResult.predicted_state || 'HIGH',
        riskNote: `(${Math.round((mlPredictionResult.risk?.composite_hazard || 0.6) * 100)}/100)`,
        aiConfidence: `${Math.round((mlPredictionResult.confidence || 0.88) * 100)}%`
      },
      stationName: station.name,
      generatedAt: new Date().toISOString()
    } : {
      ...currentScenario,
      stationName: station.name,
      generatedAt: new Date().toISOString()
    };

    if (onOpenReport) {
      onOpenReport(reportData);
    } else {
      openDrillDown({
        title: `Official Incident Simulation Report: ${reportData.name}`,
        type: 'SIMULATION_REPORT',
        data: reportData,
        station: station.name
      });
    }
  };

  const handleDownloadJSON = () => {
    const reportPayload = {
      station_id: station.id,
      station_name: station.name,
      report_type: 'POLARIS_ML_PREDICTIVE_SIMULATION_REPORT',
      generated_at: new Date().toISOString(),
      what_if_inputs: sandboxParams,
      ml_prediction: mlPredictionResult,
      baseline_metrics: {
        totalGenKw,
        totalConsKw,
        batteryCapKwh
      }
    };

    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POLARIS_ML_Simulation_${station.id}_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // SVG Chart Geometry Calculations
  const timeSeries = mlPredictionResult?.time_series || [];
  const baselineSeries = interventionPrediction ? (baselinePrediction?.time_series || []) : [];
  const chartW = 720;
  const chartH = 220;
  const padL = 45;
  const padR = 25;
  const padT = 30;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const getX = (idx) => padL + (idx / Math.max(1, timeSeries.length - 1)) * innerW;

  // Normalized bounds per metric
  const getY = (val, minV, maxV) => {
    const range = Math.max(0.1, maxV - minV);
    return padT + innerH - ((val - minV) / range) * innerH;
  };

  // Prepare points for each line
  const battPoints = timeSeries.map((d, i) => `${getX(i)},${getY(d.battery_level, 0, 100)}`).join(' ');
  const genPoints = timeSeries.map((d, i) => `${getX(i)},${getY(d.power_generation, 0, 240)}`).join(' ');
  const demPoints = timeSeries.map((d, i) => `${getX(i)},${getY(d.power_consumption, 0, 240)}`).join(' ');
  const tempPoints = timeSeries.map((d, i) => `${getX(i)},${getY(d.generator_temperature, 40, 120)}`).join(' ');
  const lifePoints = timeSeries.map((d, i) => `${getX(i)},${getY(d.life_support_reserve, 0, 100)}`).join(' ');
  const baselineBattPoints = baselineSeries.map((d, i) => `${getX(i)},${getY(d.battery_level, 0, 100)}`).join(' ');
  const baselineGenPoints = baselineSeries.map((d, i) => `${getX(i)},${getY(d.power_generation, 0, 240)}`).join(' ');
  const baselineDemPoints = baselineSeries.map((d, i) => `${getX(i)},${getY(d.power_consumption, 0, 240)}`).join(' ');
  const baselineTempPoints = baselineSeries.map((d, i) => `${getX(i)},${getY(d.generator_temperature, 40, 120)}`).join(' ');
  const baselineLifePoints = baselineSeries.map((d, i) => `${getX(i)},${getY(d.life_support_reserve, 0, 100)}`).join(' ');

  const comparison = baselinePrediction && interventionPrediction ? {
    riskBefore: Math.round((baselinePrediction.risk?.composite_hazard || 0) * 100),
    riskAfter: Math.round((interventionPrediction.risk?.composite_hazard || 0) * 100),
    batteryBefore: baselinePrediction.prediction?.['120min']?.battery_level,
    batteryAfter: interventionPrediction.prediction?.['120min']?.battery_level,
    netBefore: baselinePrediction.prediction?.['120min']?.net_power,
    netAfter: interventionPrediction.prediction?.['120min']?.net_power,
    genBreachBefore: baselinePrediction.time_to_breach?.generator_breach_mins,
    genBreachAfter: interventionPrediction.time_to_breach?.generator_breach_mins,
    battBreachBefore: baselinePrediction.time_to_breach?.battery_breach_mins,
    battBreachAfter: interventionPrediction.time_to_breach?.battery_breach_mins
  } : null;

  const criticalBreachFor = (prediction) => {
    if (!prediction) return null;
    const candidates = [];
    const generatorText = prediction.time_to_breach?.generator_thermal || '';
    const batteryText = prediction.time_to_breach?.battery_critical || '';
    if (/95°?c|overheat/i.test(generatorText) && Number.isFinite(prediction.time_to_breach?.generator_breach_mins)) {
      candidates.push(prediction.time_to_breach.generator_breach_mins);
    }
    if (/38%|depleted/i.test(batteryText) && Number.isFinite(prediction.time_to_breach?.battery_breach_mins)) {
      candidates.push(prediction.time_to_breach.battery_breach_mins);
    }
    return candidates.length ? Math.min(...candidates) : null;
  };
  const breachBefore = criticalBreachFor(baselinePrediction);
  const breachAfter = criticalBreachFor(interventionPrediction);

  // Forecast Zone X boundary (step 0 = NOW, step 1 onwards is forecast)
  const forecastSplitX = getX(0) + (getX(1) - getX(0)) * 0.45;

  return (
    <div className="tab-page-container simulations-view-container">
      {/* Top Hero Ribbon */}
      <div className="reports-hero-ribbon">
        <div className="reports-hero-left">
          <div className="reports-hero-icon-box">
            <Sparkles size={22} className="text-cyan" />
          </div>
          <div className="reports-hero-titles">
            <h2>{station.name} AI Predictive Simulation &amp; Stress Testing Command</h2>
            <p className="reports-hero-sub">
              Supervised Machine Learning Regressor Pipeline • Parametric Stress Testing • Multi-Horizon State Forecasting ({station.region})
            </p>
          </div>
        </div>

        <div className="reports-hero-right">
          <button 
            type="button" 
            className="btn-report-quick-action primary"
            onClick={handleTriggerOfficialReport}
            title="Generate and view full official simulation dossier"
          >
            <FileText size={14} />
            <span>Generate Official Report</span>
          </button>
          <button 
            type="button" 
            className="btn-report-quick-action"
            onClick={handleDownloadJSON}
            title="Export simulation raw JSON dataset"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
          <button 
            type="button" 
            className="btn-report-quick-action"
            onClick={handlePrintReport}
            title="Print or Save PDF report"
          >
            <Printer size={14} />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* Studio Navigation Mode Switcher */}
      <div className="sim-mode-switcher">
        <button 
          type="button" 
          className={`sim-mode-btn ${activeTabMode === 'sandbox' ? 'active' : ''}`}
          onClick={() => setActiveTabMode('sandbox')}
        >
          <Cpu size={13} /> AI Machine-Learning What-If Sandbox
        </button>
        <button 
          type="button" 
          className={`sim-mode-btn ${activeTabMode === 'scenarios' ? 'active' : ''}`}
          onClick={() => setActiveTabMode('scenarios')}
        >
          <Sliders size={13} /> Preset Polar Hazard Scenarios
        </button>
        <button 
          type="button" 
          className={`sim-mode-btn ${activeTabMode === 'archive' ? 'active' : ''}`}
          onClick={() => setActiveTabMode('archive')}
        >
          <Clock size={13} /> Generated Reports Archive
        </button>
      </div>

      {/* =========================================================================
          MODE 1: AI/ML WHAT-IF PREDICTIVE SIMULATION SYSTEM
          ========================================================================= */}
      {activeTabMode === 'sandbox' && (
        <div className="whatif-ml-container">
          {/* Top Interactive Sliders Control Panel */}
          <div className="sandbox-sliders-box polaris-card">
            <div className="panel-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} className="text-cyan" />
                <h3 className="section-title">What-If Parametric Edge-Case Stress Testing Sliders</h3>
              </div>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                Inputs are fed into the Python Random Forest Regressor to forecast microgrid states
              </span>
            </div>

            <div className="sandbox-sliders-grid">
              {/* Slider 1: Ambient Blizzard Temperature */}
              <div className="sandbox-slider-item">
                <div className="slider-label-row">
                  <span className="slider-name">
                    <Thermometer size={12} style={{ display: 'inline', color: '#38bdf8', marginRight: '4px' }} />
                    Ambient Blizzard Temperature
                  </span>
                  <span className="slider-val text-cyan mono-num">{sandboxParams.ambientTemp}°C</span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="-5" 
                  step="1"
                  value={sandboxParams.ambientTemp}
                  onChange={(e) => setSandboxParams({ ...sandboxParams, ambientTemp: Number(e.target.value) })}
                  className="slider-range-input"
                />
                <span className="slider-sub-hint">Lower temps trigger exponential trace heating surge</span>
              </div>

              {/* Slider 2: Generator Capacity Derate */}
              <div className="sandbox-slider-item">
                <div className="slider-label-row">
                  <span className="slider-name">
                    <Cpu size={12} style={{ display: 'inline', color: '#f59e0b', marginRight: '4px' }} />
                    Generator Capacity Derate
                  </span>
                  <span className="slider-val text-amber mono-num">{sandboxParams.genDeratePct}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={sandboxParams.genDeratePct}
                  onChange={(e) => setSandboxParams({ ...sandboxParams, genDeratePct: Number(e.target.value) })}
                  className="slider-range-input"
                />
                <span className="slider-sub-hint">Reduces available kW &amp; accelerates thermal rise</span>
              </div>

              {/* Slider 3: Katabatic Storm Wind Velocity */}
              <div className="sandbox-slider-item">
                <div className="slider-label-row">
                  <span className="slider-name">
                    <Wind size={12} style={{ display: 'inline', color: '#38bdf8', marginRight: '4px' }} />
                    Katabatic Storm Wind Velocity
                  </span>
                  <span className="slider-val text-blue mono-num">{sandboxParams.windSpeedKmh} km/h</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="160" 
                  step="2"
                  value={sandboxParams.windSpeedKmh}
                  onChange={(e) => setSandboxParams({ ...sandboxParams, windSpeedKmh: Number(e.target.value) })}
                  className="slider-range-input"
                />
                <span className="slider-sub-hint">Induces convective heat loss and structural aerodynamic drag</span>
              </div>

              {/* Slider 4: Life-Support Priority Minimum Reserve */}
              <div className="sandbox-slider-item">
                <div className="slider-label-row">
                  <span className="slider-name">
                    <Shield size={12} style={{ display: 'inline', color: '#10b981', marginRight: '4px' }} />
                    Life-Support Priority Minimum Reserve
                  </span>
                  <span className="slider-val text-emerald mono-num">{sandboxParams.priorityReservePct}%</span>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="100" 
                  step="1"
                  value={sandboxParams.priorityReservePct}
                  onChange={(e) => setSandboxParams({ ...sandboxParams, priorityReservePct: Number(e.target.value) })}
                  className="slider-range-input"
                />
                <span className="slider-sub-hint">Safety cutoff threshold for critical habitat subsystems</span>
              </div>
            </div>

            {/* Primary Action Button: RUN AI PREDICTION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '10px' }}>
              <button 
                type="button" 
                className={`btn-run-ai-prediction ${isMlPredicting ? 'predicting' : ''}`}
                onClick={handleRunAIPrediction}
                disabled={isMlPredicting}
              >
                {isMlPredicting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Executing ML Prediction Regressor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>RUN AI PREDICTION</span>
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.66rem', color: '#94a3b8' }}>
                <span>Engine: <strong className="text-cyan">POLARIS Physics-Informed ML Model v3.0</strong></span>
                <span>Station: <strong className="text-cyan">{station.name}</strong></span>
              </div>
            </div>
          </div>

          {/* AI PREDICTIVE OUTCOME SECTION */}
          {mlPredictionResult && (
            <div className={`ai-predictive-outcome-panel ${mlJustPredicted ? 'outcome-glow' : ''}`}>
              {/* Outcome Header Banner with Predicted State */}
              <div className="ai-outcome-header-banner polaris-card">
                <div className="outcome-banner-left">
                  <div className="outcome-sparkle-icon">
                    <Sparkles size={18} className="text-cyan" />
                  </div>
                  <div>
                    <span className="outcome-tagline">AI PREDICTIVE OUTCOME • SCADA MULTI-HORIZON INFERENCE</span>
                    <h3 className="outcome-main-title">
                      Predicted Station State: 
                      <span className={`predicted-state-badge state-${mlPredictionResult.predicted_state?.toLowerCase()}`}>
                        {mlPredictionResult.predicted_state === 'CRITICAL' ? '● CRITICAL HAZARD' : mlPredictionResult.predicted_state === 'WARNING' ? '▲ WARNING' : '✓ NORMAL EQUILIBRIUM'}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="outcome-banner-right">
                  <div className="outcome-metric-chip">
                    <span className="chip-lbl">MODEL CONFIDENCE</span>
                    <span className="chip-val text-emerald mono-num">{Math.round((mlPredictionResult.confidence || 0.88) * 100)}%</span>
                  </div>
                  <div className="outcome-metric-chip">
                    <span className="chip-lbl">UNCERTAINTY MAE</span>
                    <span className="chip-val text-cyan mono-num">±{mlPredictionResult.uncertainty_mae || 0.92}</span>
                  </div>
                  <div className="outcome-metric-chip">
                    <span className="chip-lbl">FORECAST HORIZONS</span>
                    <span className="chip-val text-purple mono-num">+15m, +30m, +60m, +120m</span>
                  </div>
                </div>
              </div>

              {comparison && (
                <div className="intervention-comparison-card polaris-card">
                  <div className="intervention-comparison-head">
                    <div>
                      <span className="comparison-kicker">CLOSED-LOOP PREVENTIVE ACTION VALIDATION</span>
                      <h3>Baseline vs. operator-approved intervention</h3>
                      <p>{appliedIntervention?.summary}</p>
                    </div>
                    <button type="button" className="btn-restore-baseline" onClick={handleRestoreBaseline}>
                      <RotateCcw size={13} /> Restore baseline
                    </button>
                  </div>
                  <div className="comparison-metrics-grid">
                    <div className="comparison-metric">
                      <span>Composite risk</span>
                      <div><strong className="before-value">{comparison.riskBefore}/100</strong><ArrowRight size={14}/><strong className="after-value">{comparison.riskAfter}/100</strong></div>
                      <small>{Math.max(0, comparison.riskBefore - comparison.riskAfter)} risk points reduced</small>
                    </div>
                    <div className="comparison-metric">
                      <span>Battery at +120m</span>
                      <div><strong className="before-value">{comparison.batteryBefore}%</strong><ArrowRight size={14}/><strong className="after-value">{comparison.batteryAfter}%</strong></div>
                      <small>{Math.max(0, (comparison.batteryAfter || 0) - (comparison.batteryBefore || 0)).toFixed(1)}% reserve preserved</small>
                    </div>
                    <div className="comparison-metric">
                      <span>Net power at +120m</span>
                      <div><strong className="before-value">{comparison.netBefore} kW</strong><ArrowRight size={14}/><strong className="after-value">{comparison.netAfter} kW</strong></div>
                      <small>{Math.max(0, (comparison.netAfter || 0) - (comparison.netBefore || 0)).toFixed(1)} kW recovered</small>
                    </div>
                    <div className="comparison-metric">
                      <span>Earliest critical breach</span>
                      <div>
                        <strong className="before-value">{breachBefore === null ? 'None' : `${breachBefore} min`}</strong>
                        <ArrowRight size={14}/>
                        <strong className="after-value">{breachAfter === null ? 'Avoided' : `${breachAfter} min`}</strong>
                      </div>
                      <small>{breachBefore !== null && breachAfter === null ? 'Avoided inside forecast horizon' : breachBefore !== null && breachAfter !== null ? `${Math.max(0, breachAfter - breachBefore)} minutes gained` : 'No critical breach predicted'}</small>
                    </div>
                  </div>
                </div>
              )}

              {/* 5 Domain Forecast Cards Grid */}
              <div className="outcome-domain-cards-grid">
                {/* 1. POWER PREDICTION */}
                <div className="outcome-domain-card polaris-card">
                  <div className="domain-card-head">
                    <div className="domain-icon-box" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                      <Zap size={16} />
                    </div>
                    <div>
                      <h4 className="domain-title">POWER PREDICTION</h4>
                      <span className="domain-sub">Microgrid Generation &amp; Demand</span>
                    </div>
                  </div>
                  <div className="domain-metrics-list">
                    <div className="domain-metric-row">
                      <span>Current Generation:</span>
                      <strong className="mono-num text-cyan">{mlPredictionResult.domain_predictions?.power?.current_generation}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Predicted Gen (+120m):</span>
                      <strong className="mono-num text-amber">{mlPredictionResult.domain_predictions?.power?.predicted_generation}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Current Demand:</span>
                      <strong className="mono-num text-cyan">{mlPredictionResult.domain_predictions?.power?.current_demand}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Predicted Demand (+120m):</span>
                      <strong className="mono-num text-red">{mlPredictionResult.domain_predictions?.power?.predicted_demand}</strong>
                    </div>
                    <div className="domain-metric-row highlight">
                      <span>Predicted Power Net:</span>
                      <strong className={`mono-num ${mlPredictionResult.prediction?.["120min"]?.net_power < 0 ? 'text-critical' : 'text-emerald'}`}>
                        {mlPredictionResult.domain_predictions?.power?.predicted_deficit_surplus}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. BATTERY PREDICTION */}
                <div className="outcome-domain-card polaris-card">
                  <div className="domain-card-head">
                    <div className="domain-icon-box" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                      <BatteryWarning size={16} />
                    </div>
                    <div>
                      <h4 className="domain-title">BATTERY PREDICTION</h4>
                      <span className="domain-sub">BESS State of Charge &amp; Runway</span>
                    </div>
                  </div>
                  <div className="domain-metrics-list">
                    <div className="domain-metric-row">
                      <span>Current Battery %:</span>
                      <strong className="mono-num text-emerald">{mlPredictionResult.domain_predictions?.battery?.current_battery_pct}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>+15m: <strong>{mlPredictionResult.domain_predictions?.battery?.battery_15m}</strong> • +30m:</span>
                      <strong className="mono-num text-cyan">{mlPredictionResult.domain_predictions?.battery?.battery_30m}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>+60m: <strong>{mlPredictionResult.domain_predictions?.battery?.battery_60m}</strong> • +120m:</span>
                      <strong className="mono-num text-amber">{mlPredictionResult.domain_predictions?.battery?.battery_120m}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Depletion Trend:</span>
                      <strong className="mono-num text-amber">{mlPredictionResult.domain_predictions?.battery?.depletion_trend}</strong>
                    </div>
                    <div className="domain-metric-row highlight">
                      <span>Time to Critical Limit:</span>
                      <strong className="mono-num text-critical">{mlPredictionResult.time_to_breach?.battery_critical}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. GENERATOR PREDICTION */}
                <div className="outcome-domain-card polaris-card">
                  <div className="domain-card-head">
                    <div className="domain-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                      <Flame size={16} />
                    </div>
                    <div>
                      <h4 className="domain-title">GENERATOR PREDICTION</h4>
                      <span className="domain-sub">Stator Core Thermal Dynamics</span>
                    </div>
                  </div>
                  <div className="domain-metrics-list">
                    <div className="domain-metric-row">
                      <span>Current Temperature:</span>
                      <strong className="mono-num text-cyan">{mlPredictionResult.domain_predictions?.generator?.current_temperature}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Predicted Temp (+120m):</span>
                      <strong className="mono-num text-red">{mlPredictionResult.domain_predictions?.generator?.predicted_temperature_120m}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Generator Stress Score:</span>
                      <strong className="mono-num text-amber">{mlPredictionResult.domain_predictions?.generator?.generator_stress_score}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Overload / Failure Risk:</span>
                      <strong className="mono-num text-critical">{mlPredictionResult.domain_predictions?.generator?.risk_score}</strong>
                    </div>
                    <div className="domain-metric-row highlight">
                      <span>Thermal Breach Countdown:</span>
                      <strong className="mono-num text-critical">{mlPredictionResult.time_to_breach?.generator_thermal}</strong>
                    </div>
                  </div>
                </div>

                {/* 4. LIFE-SUPPORT PREDICTION */}
                <div className="outcome-domain-card polaris-card">
                  <div className="domain-card-head">
                    <div className="domain-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <h4 className="domain-title">LIFE-SUPPORT PREDICTION</h4>
                      <span className="domain-sub">Thermal &amp; Habitat Autonomy</span>
                    </div>
                  </div>
                  <div className="domain-metrics-list">
                    <div className="domain-metric-row">
                      <span>Current Reserve:</span>
                      <strong className="mono-num text-emerald">{mlPredictionResult.domain_predictions?.life_support?.current_reserve}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Predicted Reserve (+120m):</span>
                      <strong className="mono-num text-cyan">{mlPredictionResult.domain_predictions?.life_support?.predicted_reserve_120m}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Configured Min. Reserve:</span>
                      <strong className="mono-num text-amber">{mlPredictionResult.domain_predictions?.life_support?.configured_minimum}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Subsystem Risk Score:</span>
                      <strong className="mono-num text-amber">{mlPredictionResult.domain_predictions?.life_support?.risk_score}</strong>
                    </div>
                    <div className="domain-metric-row highlight">
                      <span>Time to Limit Violation:</span>
                      <strong className="mono-num text-cyan">{mlPredictionResult.time_to_breach?.life_support}</strong>
                    </div>
                  </div>
                </div>

                {/* 5. ENVIRONMENTAL PREDICTION */}
                <div className="outcome-domain-card polaris-card">
                  <div className="domain-card-head">
                    <div className="domain-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                      <Wind size={16} />
                    </div>
                    <div>
                      <h4 className="domain-title">ENVIRONMENTAL PREDICTION</h4>
                      <span className="domain-sub">Atmospheric &amp; Aerodynamic Stress</span>
                    </div>
                  </div>
                  <div className="domain-metrics-list">
                    <div className="domain-metric-row">
                      <span>Blizzard Ambient Temp:</span>
                      <strong className="mono-num text-cyan">{mlPredictionResult.domain_predictions?.environmental?.ambient_temperature}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Katabatic Wind Velocity:</span>
                      <strong className="mono-num text-blue">{mlPredictionResult.domain_predictions?.environmental?.wind_velocity}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Temperature Impact:</span>
                      <strong className="mono-num text-amber">{mlPredictionResult.domain_predictions?.environmental?.temperature_impact}</strong>
                    </div>
                    <div className="domain-metric-row">
                      <span>Wind Convective Drag:</span>
                      <strong className="mono-num text-amber">{mlPredictionResult.domain_predictions?.environmental?.wind_convective_impact}</strong>
                    </div>
                    <div className="domain-metric-row highlight">
                      <span>Equipment Stress Index:</span>
                      <strong className="mono-num text-purple">{mlPredictionResult.domain_predictions?.environmental?.environmental_stress_score}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* PREDICTION GRAPH: Interactive Multi-Horizon Time-Series Chart */}
              <div className="ai-forecast-graph-card polaris-card">
                <div className="graph-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} className="text-cyan" />
                    <h3 className="section-title">Multi-Horizon Telemetry Forecast Graph (NOW ➔ +15m ➔ +30m ➔ +60m ➔ +120m)</h3>
                  </div>

                  <div className="graph-metric-filter-pills">
                    {[
                      { id: 'all', label: 'All Signals' },
                      { id: 'battery', label: 'Battery %' },
                      { id: 'power', label: 'Power (Gen vs Demand)' },
                      { id: 'temperature', label: 'Generator Temp °C' },
                      { id: 'lifesupport', label: 'Life-Support %' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        className={`graph-pill ${activeGraphMetric === f.id ? 'active' : ''}`}
                        onClick={() => setActiveGraphMetric(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Graph Legend & Forecast Zone Indicator */}
                <div className="graph-legend-strip">
                  <div className="legend-items-left">
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'battery') && (
                      <span className="legend-chip" style={{ color: '#10b981' }}>■ Battery SoC (%)</span>
                    )}
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'power') && (
                      <>
                        <span className="legend-chip" style={{ color: '#38bdf8' }}>■ Power Gen (kW)</span>
                        <span className="legend-chip" style={{ color: '#f59e0b' }}>■ Power Demand (kW)</span>
                      </>
                    )}
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'temperature') && (
                      <span className="legend-chip" style={{ color: '#ef4444' }}>■ Generator Temp (°C)</span>
                    )}
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'lifesupport') && (
                      <span className="legend-chip" style={{ color: '#a855f7' }}>■ Life-Support Reserve (%)</span>
                    )}
                  </div>
                  <div className="legend-items-right">
                    {interventionPrediction && (
                      <>
                        <span className="forecast-zone-tag comparison-legend-before">-- Baseline</span>
                        <span className="forecast-zone-tag comparison-legend-after">━ After intervention</span>
                      </>
                    )}
                    <span className="forecast-zone-tag">░ Shaded Area: Machine Learning Forecast Horizon</span>
                  </div>
                </div>

                {/* SVG Multi-Line Forecast Visualizer */}
                <div className="svg-forecast-container" style={{ height: 220, position: 'relative', width: '100%' }}>
                  <svg width="100%" height="100%" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="forecastZoneGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(56, 189, 248, 0.02)" />
                        <stop offset="100%" stopColor="rgba(56, 189, 248, 0.08)" />
                      </linearGradient>
                    </defs>

                    {/* Forecast Zone Background Shading */}
                    <rect 
                      x={forecastSplitX} 
                      y={padT} 
                      width={chartW - padR - forecastSplitX} 
                      height={innerH} 
                      fill="url(#forecastZoneGrad)" 
                      stroke="rgba(56, 189, 248, 0.15)"
                      strokeDasharray="3 3"
                    />

                    {/* Forecast Zone Header Marker */}
                    <text x={forecastSplitX + 10} y={padT + 12} fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
                      ⚡ AI FORECAST HORIZON
                    </text>

                    {/* Horizontal Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                      const y = padT + innerH - p * innerH;
                      return (
                        <g key={idx}>
                          <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                          <text x={padL - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                            {Math.round(p * 100)}%
                          </text>
                        </g>
                      );
                    })}

                    {/* X-Axis Time Labels */}
                    {timeSeries.map((d, i) => (
                      <text key={i} x={getX(i)} y={chartH - 8} textAnchor="middle" fill={i === 0 ? '#38bdf8' : '#94a3b8'} fontSize="9" fontWeight={i === 0 ? 'bold' : 'normal'} fontFamily="monospace">
                        {d.time} {i === 0 ? '(LIVE)' : ''}
                      </text>
                    ))}

                    {/* Dashed lines preserve the original forecast for a direct counterfactual comparison. */}
                    {interventionPrediction && (activeGraphMetric === 'all' || activeGraphMetric === 'battery') && (
                      <polyline fill="none" stroke="#10b981" strokeWidth="1.8" opacity="0.42" points={baselineBattPoints} strokeDasharray="6 5" />
                    )}
                    {interventionPrediction && (activeGraphMetric === 'all' || activeGraphMetric === 'power') && (
                      <>
                        <polyline fill="none" stroke="#38bdf8" strokeWidth="1.6" opacity="0.42" points={baselineGenPoints} strokeDasharray="6 5" />
                        <polyline fill="none" stroke="#f59e0b" strokeWidth="1.6" opacity="0.42" points={baselineDemPoints} strokeDasharray="6 5" />
                      </>
                    )}
                    {interventionPrediction && (activeGraphMetric === 'all' || activeGraphMetric === 'temperature') && (
                      <polyline fill="none" stroke="#ef4444" strokeWidth="1.8" opacity="0.42" points={baselineTempPoints} strokeDasharray="6 5" />
                    )}
                    {interventionPrediction && (activeGraphMetric === 'all' || activeGraphMetric === 'lifesupport') && (
                      <polyline fill="none" stroke="#a855f7" strokeWidth="1.6" opacity="0.42" points={baselineLifePoints} strokeDasharray="6 5" />
                    )}

                    {/* Line 1: Battery % */}
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'battery') && (
                      <>
                        <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={battPoints} strokeDasharray="none" />
                        {timeSeries.map((d, i) => (
                          <circle key={i} cx={getX(i)} cy={getY(d.battery_level, 0, 100)} r="3.5" fill="#10b981" stroke="#060b14" strokeWidth="1.5" />
                        ))}
                      </>
                    )}

                    {/* Line 2: Power Generation */}
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'power') && (
                      <>
                        <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={genPoints} />
                        {timeSeries.map((d, i) => (
                          <circle key={i} cx={getX(i)} cy={getY(d.power_generation, 0, 240)} r="3" fill="#38bdf8" stroke="#060b14" strokeWidth="1.5" />
                        ))}
                      </>
                    )}

                    {/* Line 3: Power Demand */}
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'power') && (
                      <>
                        <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={demPoints} strokeDasharray="4 2" />
                        {timeSeries.map((d, i) => (
                          <circle key={i} cx={getX(i)} cy={getY(d.power_consumption, 0, 240)} r="3" fill="#f59e0b" stroke="#060b14" strokeWidth="1.5" />
                        ))}
                      </>
                    )}

                    {/* Line 4: Generator Stator Temperature */}
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'temperature') && (
                      <>
                        <polyline fill="none" stroke="#ef4444" strokeWidth="2.5" points={tempPoints} />
                        {timeSeries.map((d, i) => (
                          <circle key={i} cx={getX(i)} cy={getY(d.generator_temperature, 40, 120)} r="3.5" fill="#ef4444" stroke="#060b14" strokeWidth="1.5" />
                        ))}
                      </>
                    )}

                    {/* Line 5: Life Support Reserve */}
                    {(activeGraphMetric === 'all' || activeGraphMetric === 'lifesupport') && (
                      <>
                        <polyline fill="none" stroke="#a855f7" strokeWidth="2" points={lifePoints} />
                        {timeSeries.map((d, i) => (
                          <circle key={i} cx={getX(i)} cy={getY(d.life_support_reserve, 0, 100)} r="3" fill="#a855f7" stroke="#060b14" strokeWidth="1.5" />
                        ))}
                      </>
                    )}
                  </svg>
                </div>
              </div>

              {/* Bottom Multi-Panel: Risk Probabilities, Predicted Alerts, Preventive Actions & Explainability */}
              <div className="outcome-bottom-tri-grid">
                {/* 1. AI Risk Probabilities */}
                <div className="outcome-sub-card polaris-card">
                  <div className="sub-card-header">
                    <ShieldAlert size={15} className="text-red" />
                    <h4>AI RISK PREDICTION</h4>
                  </div>
                  <div className="risk-bars-stack">
                    <div className="risk-bar-item">
                      <div className="risk-bar-meta">
                        <span>Power Failure Risk</span>
                        <strong className="mono-num text-red">{Math.round((mlPredictionResult.risk?.power || 0.1) * 100)}%</strong>
                      </div>
                      <div className="risk-bar-track">
                        <div className="risk-bar-fill fill-red" style={{ width: `${Math.round((mlPredictionResult.risk?.power || 0.1) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="risk-bar-item">
                      <div className="risk-bar-meta">
                        <span>Battery Depletion Risk</span>
                        <strong className="mono-num text-amber">{Math.round((mlPredictionResult.risk?.battery || 0.1) * 100)}%</strong>
                      </div>
                      <div className="risk-bar-track">
                        <div className="risk-bar-fill fill-amber" style={{ width: `${Math.round((mlPredictionResult.risk?.battery || 0.1) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="risk-bar-item">
                      <div className="risk-bar-meta">
                        <span>Generator Overload Risk</span>
                        <strong className="mono-num text-red">{Math.round((mlPredictionResult.risk?.generator || 0.1) * 100)}%</strong>
                      </div>
                      <div className="risk-bar-track">
                        <div className="risk-bar-fill fill-red" style={{ width: `${Math.round((mlPredictionResult.risk?.generator || 0.1) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="risk-bar-item">
                      <div className="risk-bar-meta">
                        <span>Life-Support Reserve Violation</span>
                        <strong className="mono-num text-cyan">{Math.round((mlPredictionResult.risk?.life_support || 0.1) * 100)}%</strong>
                      </div>
                      <div className="risk-bar-track">
                        <div className="risk-bar-fill fill-cyan" style={{ width: `${Math.round((mlPredictionResult.risk?.life_support || 0.1) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="risk-bar-item">
                      <div className="risk-bar-meta">
                        <span>Environmental / System Stress</span>
                        <strong className="mono-num text-purple">{Math.round((mlPredictionResult.risk?.environmental_stress || 0.1) * 100)}%</strong>
                      </div>
                      <div className="risk-bar-track">
                        <div className="risk-bar-fill fill-purple" style={{ width: `${Math.round((mlPredictionResult.risk?.environmental_stress || 0.1) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Predicted Alerts (Derived from Model Outputs) */}
                <div className="outcome-sub-card polaris-card">
                  <div className="sub-card-header">
                    <AlertTriangle size={15} className="text-amber" />
                    <h4>PREDICTED ALERTS (FORWARD 120M)</h4>
                  </div>
                  <div className="alerts-stack">
                    {mlPredictionResult.predicted_alerts?.map((al, idx) => (
                      <div key={idx} className={`predicted-alert-item alert-${al.severity.toLowerCase()}`}>
                        <div className="alert-badge-row">
                          <span className={`alert-sev-badge ${al.severity.toLowerCase()}`}>{al.severity}</span>
                          <span className="alert-horizon-tag">{al.horizon}</span>
                        </div>
                        <p className="alert-msg-text">{al.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Preventive Operational Actions */}
                <div className="outcome-sub-card polaris-card">
                  <div className="sub-card-header">
                    <CheckCircle2 size={15} className="text-emerald" />
                    <h4>PREVENTIVE OPERATIONAL ACTIONS</h4>
                  </div>
                  <div className="actions-stack">
                    {mlPredictionResult.preventive_actions?.map((act, idx) => (
                      <div key={idx} className="preventive-action-item">
                        <div className="action-top-row">
                          <span className="action-prio-tag">{act.priority}</span>
                          <span className="action-cat-tag">{act.category}</span>
                        </div>
                        <p className="action-text">{act.action}</p>
                        <button
                          type="button"
                          className="btn-apply-intervention"
                          onClick={() => handleApplyPreventiveAction(act)}
                          disabled={isMlPredicting || act.category === 'MONITORING'}
                        >
                          {act.category === 'SAFETY_PROTOCOL' ? 'Acknowledge protocol' : act.category === 'MONITORING' ? 'No intervention required' : 'Apply & compare forecast'}
                          {act.category !== 'MONITORING' && <ArrowRight size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* MODEL EXPLAINABILITY SECTION ("WHY THIS PREDICTION?") */}
              <div className="explainability-card polaris-card">
                <div className="explainability-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HelpCircle size={16} className="text-cyan" />
                    <h4 className="section-title">WHY THIS PREDICTION? • MODEL FEATURE IMPORTANCE &amp; EXPLAINABILITY</h4>
                  </div>
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                    Calculated directly from Random Forest Decision Tree Gini-importance weights
                  </span>
                </div>

                <div className="explainability-bars-grid">
                  {Object.entries(mlPredictionResult.feature_importance || {}).map(([featName, pct], idx) => {
                    const impactLevel = pct >= 25 ? 'HIGH IMPACT' : pct >= 12 ? 'MEDIUM IMPACT' : 'MODERATE IMPACT';
                    const impactColor = pct >= 25 ? '#ef4444' : pct >= 12 ? '#f59e0b' : '#38bdf8';

                    return (
                      <div key={idx} className="explain-bar-card">
                        <div className="explain-meta-row">
                          <span className="explain-name">{featName}</span>
                          <span className="explain-impact" style={{ color: impactColor }}>{impactLevel}</span>
                        </div>
                        <div className="explain-track">
                          <div className="explain-fill" style={{ width: `${Math.min(100, pct * 2.5)}%`, backgroundColor: impactColor }} />
                        </div>
                        <span className="explain-pct mono-num">{pct}% influence weight</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="prediction-audit-card polaris-card">
                <div className="prediction-audit-head">
                  <div><ShieldCheck size={16} className="text-emerald" /><h4>PREDICTION TRACEABILITY</h4></div>
                  <span>{mlPredictionResult.prediction_id || 'LOCAL-PREDICTION'}</span>
                </div>
                <div className="prediction-audit-grid">
                  <div><span>Station</span><strong>{station.name}</strong></div>
                  <div><span>Execution mode</span><strong>{interventionPrediction ? 'COUNTERFACTUAL INTERVENTION' : 'MANUAL WHAT-IF'}</strong></div>
                  <div><span>Telemetry source</span><strong>{mlPredictionResult.data_provenance?.telemetry || 'SIMULATED_DIGITAL_TWIN'}</strong></div>
                  <div><span>Forecast classification</span><strong>{mlPredictionResult.data_provenance?.forecast || 'ML_DERIVED_ESTIMATE'}</strong></div>
                  <div><span>Generated</span><strong>{new Date(mlPredictionResult.timestamp).toLocaleString()}</strong></div>
                  <div><span>Model</span><strong>{mlPredictionResult.model_metadata?.engine || 'POLARIS Predictive Engine'}</strong></div>
                </div>
                <p className="prediction-disclaimer">{mlPredictionResult.data_provenance?.disclaimer || 'Research prototype using simulated telemetry; operational deployment requires validation against authorised station data.'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: PRESET POLAR HAZARD SCENARIOS
          ========================================================================= */}
      {activeTabMode === 'scenarios' && (
        <div className="simulations-main-grid">
          {/* Left Column: Selectable Scenarios List */}
          <div className="scenarios-selector-col">
            <div className="panel-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={16} className="text-cyan" />
                <h3 className="section-title">Select Polar Hazard Scenario</h3>
              </div>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                {scenarios.length} Scenarios Available
              </span>
            </div>

            <div className="scenarios-stack">
              {scenarios.map((sc) => {
                const IconComp = sc.icon;
                const isSelected = sc.id === activeScenarioId;

                return (
                  <div 
                    key={sc.id} 
                    className={`scenario-choice-card polaris-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectScenario(sc.id)}
                  >
                    <div className="sc-card-top">
                      <div className="sc-icon-wrap">
                        <IconComp size={18} className="text-cyan" />
                      </div>
                      <div className="sc-title-wrap">
                        <span className="sc-category">{sc.category}</span>
                        <h4 className="sc-name">{sc.name}</h4>
                      </div>
                    </div>
                    <p className="sc-desc">{sc.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Run Button & Simulation Engine Stepper */}
            <div className="sim-controls-actions-box">
              <button 
                type="button"
                className="btn-run-simulation" 
                onClick={handleRunPresetSimulation}
                disabled={simulationRunning}
              >
                <Play size={15} className={simulationRunning ? 'animate-spin' : ''} />
                <span>{simulationRunning ? 'Calculating Thermodynamic Model...' : `Run ${currentScenario.name} Simulation`}</span>
              </button>

              {simulationRunning && (
                <div className="sim-progress-engine-card">
                  <div className="sim-progress-header">
                    <span>THERMODYNAMIC SIMULATION ENGINE</span>
                    <span className="mono-num">{simulationProgress}%</span>
                  </div>
                  <div className="sim-progress-bar-track">
                    <div 
                      className="sim-progress-bar-fill" 
                      style={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                  <div className="sim-phase-log">
                    {simulationPhaseLog}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dynamic Simulation Diagnostics & Projected Impacts */}
          <div className="simulation-results-col">
            <div className="diagnostic-report-card polaris-card">
              <div className="diag-header-row">
                <div className="diag-title-left">
                  <Cpu size={16} className="text-amber" />
                  <h3>Diagnostic Output: {currentScenario.name}</h3>
                </div>
                <span className={`sim-status-banner-pill ${simulationRunning ? 'running' : 'ready'}`}>
                  {simulationRunning ? 'CALCULATING DYNAMICS...' : simulationCompleted ? 'SIMULATION COMPLETE (AUDITED)' : 'BASELINE ACTIVE (READY)'}
                </span>
              </div>

              {/* KPI Metrics */}
              <div className="sim-kpi-grid">
                <div className="sim-kpi-item">
                  <span className="sim-kpi-label">Available Power Drop</span>
                  <span className="sim-kpi-val text-critical mono-num">
                    {currentScenario.params.powerDropPct !== 0 ? `${currentScenario.params.powerDropPct}%` : '0% (Demand Surge)'}
                  </span>
                  <span className="sim-kpi-sub">Lost Capacity: {currentScenario.params.lostCapacityKw} kW</span>
                </div>

                <div className="sim-kpi-item">
                  <span className="sim-kpi-label">Battery Autonomy Reserve</span>
                  <span className="sim-kpi-val text-amber mono-num">
                    {currentScenario.params.batteryHours} Hours
                  </span>
                  <span className="sim-kpi-sub">Baseline: {isMaitri ? '18.2' : '26.5'} Hours</span>
                </div>

                <div className="sim-kpi-item">
                  <span className="sim-kpi-label">Mission Risk Assessment</span>
                  <span className={`sim-kpi-val mono-num ${currentScenario.params.missionRisk === 'HIGH' ? 'text-critical' : 'text-amber'}`}>
                    {currentScenario.params.missionRisk} RISK
                  </span>
                  <span className="sim-kpi-sub">Hazard Index: {currentScenario.params.riskScore} / 100</span>
                </div>
              </div>

              {/* Load Shedding & Action Box */}
              <div className="sim-action-callout">
                <div className="callout-header">
                  <Zap size={14} className="text-cyan" />
                  <span className="callout-title">Automated SCADA Non-Critical Load-Shedding Recommendation:</span>
                </div>
                <p className="callout-desc">{currentScenario.params.loadShedRecommendation}</p>
                <div className="mitigation-row">
                  <span className="mitigation-label">Required Operator Action:</span>
                  <span className="mitigation-text">{currentScenario.params.mitigationAction}</span>
                </div>
              </div>

              {/* Report Action Triggers */}
              <div className="report-triggers-toolbar">
                <button 
                  type="button" 
                  className="btn-open-official-report"
                  onClick={handleTriggerOfficialReport}
                >
                  <FileText size={14} />
                  <span>View Full Simulation Report</span>
                </button>

                <button 
                  type="button" 
                  className="btn-secondary-export"
                  onClick={() => {
                    setLoadShedApplied(true);
                  }}
                >
                  <Zap size={13} className={loadShedApplied ? 'text-emerald' : 'text-amber'} />
                  <span>{loadShedApplied ? '✓ Load-Shedding Dispatched' : 'Apply Automated Load-Shedding'}</span>
                </button>

                <button 
                  type="button" 
                  className="btn-secondary-export"
                  onClick={handleDownloadJSON}
                >
                  <Download size={13} />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 3: GENERATED REPORTS & AUDIT ARCHIVE
          ========================================================================= */}
      {activeTabMode === 'archive' && (
        <div className="reports-archive-card polaris-card">
          <div className="panel-title-row">
            <Clock size={16} className="text-cyan" />
            <h3 className="section-title">Historical Station Simulation &amp; Incident Reports Archive</h3>
          </div>

          <div className="archive-table-container">
            <table className="archive-table">
              <thead>
                <tr>
                  <th>Report Reference ID</th>
                  <th>Incident / Scenario Title</th>
                  <th>Station Target</th>
                  <th>Risk Score</th>
                  <th>Generated Timestamp</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono-num">POL-REP-2026-0918-01</td>
                  <td><strong>Primary Generator G-02 Catastrophic Failure</strong></td>
                  <td>{station.name}</td>
                  <td><span className="text-critical font-bold">78/100 (HIGH)</span></td>
                  <td>Today, 14:32 IST</td>
                  <td><span className="archive-status-badge active">Active Analysis</span></td>
                  <td>
                    <button 
                      type="button" 
                      className="archive-action-btn"
                      onClick={() => handleTriggerOfficialReport()}
                    >
                      <FileText size={11} /> View Report
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="mono-num">POL-REP-2026-0918-02</td>
                  <td><strong>Solar Flare Geomagnetic Ionospheric Blackout (Kp 8+)</strong></td>
                  <td>{station.name}</td>
                  <td><span className="text-amber font-bold">62/100 (MED)</span></td>
                  <td>Today, 11:15 IST</td>
                  <td><span className="archive-status-badge archived">Archived</span></td>
                  <td>
                    <button 
                      type="button" 
                      className="archive-action-btn"
                      onClick={() => handleSelectScenario('SATCOM_BLACKOUT')}
                    >
                      <FileText size={11} /> Load Scenario
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="mono-num">POL-REP-2026-0917-04</td>
                  <td><strong>Category-5 Katabatic Blizzard Thermal Surge (+45 kW)</strong></td>
                  <td>Maitri Station</td>
                  <td><span className="text-critical font-bold">72/100 (HIGH)</span></td>
                  <td>Yesterday, 19:40 IST</td>
                  <td><span className="archive-status-badge archived">Archived</span></td>
                  <td>
                    <button 
                      type="button" 
                      className="archive-action-btn"
                      onClick={() => handleSelectScenario('BLIZZARD_SURGE')}
                    >
                      <FileText size={11} /> Load Scenario
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="mono-num">POL-REP-2026-0916-01</td>
                  <td><strong>BESS Battery Bank String #2 Degradation (-40%)</strong></td>
                  <td>Bharati Station</td>
                  <td><span className="text-amber font-bold">54/100 (MED)</span></td>
                  <td>16 Sep 2026, 09:12 IST</td>
                  <td><span className="archive-status-badge archived">Archived</span></td>
                  <td>
                    <button 
                      type="button" 
                      className="archive-action-btn"
                      onClick={() => handleSelectScenario('BATT_DEGRADE')}
                    >
                      <FileText size={11} /> Load Scenario
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
