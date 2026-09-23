import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchPredictiveIntelligence, simulatePredictiveIntelligence } from '../services/predictiveService';

const PredictiveContext = createContext();

export function PredictiveProvider({ children, selectedStation = 'station-maitri' }) {
  const [predictiveData, setPredictiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationOverrides, setSimulationOverrides] = useState({});
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const predictionRequestSequence = useRef(0);

  const effectiveStation = selectedStation === 'all-stations' || selectedStation === 'all'
    ? 'station-maitri'
    : selectedStation;

  const loadPredictions = useCallback(async (stationId, overrides = null) => {
    const requestId = ++predictionRequestSequence.current;
    setLoading(true);
    try {
      if (overrides && Object.keys(overrides).length > 0) {
        const simData = await simulatePredictiveIntelligence(stationId, overrides);
        if (requestId === predictionRequestSequence.current) setPredictiveData(simData);
      } else {
        const realData = await fetchPredictiveIntelligence(stationId);
        if (requestId === predictionRequestSequence.current) setPredictiveData(realData);
      }
    } catch (e) {
      console.error('[PredictiveContext] Failed to load predictions:', e);
    } finally {
      if (requestId === predictionRequestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSimulating) {
      loadPredictions(effectiveStation, simulationOverrides);
    } else {
      loadPredictions(effectiveStation, null);
    }
  }, [effectiveStation, isSimulating, simulationOverrides, loadPredictions]);

  // Simulation inputs and selected cards belong to one station. Clear them
  // whenever India HQ switches between Maitri and Bharati so data cannot leak
  // across operational contexts.
  useEffect(() => {
    setSimulationOverrides({});
    setIsSimulating(false);
    setSelectedPrediction(null);
    setActiveCategoryFilter('all');
  }, [effectiveStation]);

  const openPredictionCenter = (predictionItem = null, category = 'all') => {
    if (predictionItem) setSelectedPrediction(predictionItem);
    if (category) setActiveCategoryFilter(category);
    setIsPredictionModalOpen(true);
  };

  const closePredictionCenter = () => {
    setIsPredictionModalOpen(false);
    setSelectedPrediction(null);
  };

  const triggerSimulation = (overrides) => {
    setSimulationOverrides(overrides);
    setIsSimulating(true);
  };

  const resetSimulation = () => {
    setSimulationOverrides({});
    setIsSimulating(false);
  };

  return (
    <PredictiveContext.Provider
      value={{
        predictiveData,
        loading,
        effectiveStation,
        isSimulating,
        simulationOverrides,
        isPredictionModalOpen,
        selectedPrediction,
        activeCategoryFilter,
        setActiveCategoryFilter,
        setSelectedPrediction,
        openPredictionCenter,
        closePredictionCenter,
        triggerSimulation,
        resetSimulation,
        refreshPredictions: () => loadPredictions(effectiveStation, isSimulating ? simulationOverrides : null),
      }}
    >
      {children}
    </PredictiveContext.Provider>
  );
}

export function usePredictive() {
  const context = useContext(PredictiveContext);
  if (!context) {
    throw new Error('usePredictive must be used within a PredictiveProvider');
  }
  return context;
}
