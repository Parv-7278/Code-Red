import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchPredictiveIntelligence, simulatePredictiveIntelligence } from '../services/predictiveService';
import { useAuth } from './AuthContext';

const PredictiveContext = createContext();

export function PredictiveProvider({ children, selectedStation = 'station-maitri' }) {
  const { role, assignedStation, isStationOperator } = useAuth();
  const [predictiveData, setPredictiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationOverrides, setSimulationOverrides] = useState({});
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const predictionRequestSequence = useRef(0);
  const previousStation = useRef(null);

  const effectiveStation = isStationOperator && assignedStation ? assignedStation : selectedStation === 'all-stations' || selectedStation === 'all'
    ? 'station-maitri'
    : selectedStation;

  const loadPredictions = useCallback(async (stationId, overrides = null) => {
    const requestId = ++predictionRequestSequence.current;
    setLoading(true);
    setError(null);
    try {
      if (overrides && Object.keys(overrides).length > 0) {
        const simData = await simulatePredictiveIntelligence(stationId, overrides, role, assignedStation);
        if (requestId === predictionRequestSequence.current) setPredictiveData(simData);
      } else {
        const realData = await fetchPredictiveIntelligence(stationId, 24, role, assignedStation);
        if (requestId === predictionRequestSequence.current) setPredictiveData(realData);
      }
    } catch (e) {
      if (requestId === predictionRequestSequence.current) setError(e.message || 'Forecast unavailable. Please try again.');
    } finally {
      if (requestId === predictionRequestSequence.current) setLoading(false);
    }
  }, [role, assignedStation]);

  useEffect(() => {
    if (previousStation.current !== effectiveStation) {
      previousStation.current = effectiveStation;
      setPredictiveData(null);
      setSimulationOverrides({});
      setIsSimulating(false);
      setSelectedPrediction(null);
      setActiveCategoryFilter('all');
      loadPredictions(effectiveStation, null);
    } else if (isSimulating) {
      loadPredictions(effectiveStation, simulationOverrides);
    } else {
      loadPredictions(effectiveStation, null);
    }
  }, [effectiveStation, isSimulating, simulationOverrides, loadPredictions]);

  useEffect(() => () => { predictionRequestSequence.current += 1; }, []);

  const openPredictionCenter = (predictionItem = null, category = 'all') => {
    if (predictionItem) setSelectedPrediction(predictionItem);
    if (category) setActiveCategoryFilter(category);
    setIsPredictionModalOpen(true);
  };

  const closePredictionCenter = useCallback(() => {
    setIsPredictionModalOpen(false);
    setSelectedPrediction(null);
  }, []);

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
        error,
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
