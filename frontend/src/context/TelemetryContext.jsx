import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchLatestTelemetry, fetchQueueMetrics, fetchAlerts } from '../services/api';
import { useAuth } from './AuthContext';

const TelemetryContext = createContext(null);

export const STATIONS = [
  { id: 'station-maitri', name: 'Maitri Research Station', region: 'Schirmacher Oasis, Queen Maud Land', coords: '70°45′57″S, 11°44′09″E' },
  { id: 'station-bharati', name: 'Bharati Research Station', region: 'Larsemann Hills, East Antarctica', coords: '69°24′28″S, 76°11′14″E' },
];

export function TelemetryProvider({ children }) {
  const { role, isIndiaOperator, isStationOperator, assignedStation } = useAuth();
  
  // Single Source of Truth for Station Selection
  const [selectedStation, setSelectedStationState] = useState(() => {
    if (isStationOperator && assignedStation) {
      return assignedStation;
    }
    return 'station-maitri';
  });

  const [isLoadingStationData, setIsLoadingStationData] = useState(false);
  const [isSimulatorOnline, setIsSimulatorOnline] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [hasFetchedAlerts, setHasFetchedAlerts] = useState(false);
  const [telemetry, setTelemetry] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [queueMetrics, setQueueMetrics] = useState({
    label: 'ISRO GSAT-30 Ku-Band Polar Link',
    queueSnapshot: { count: 0, criticalCount: 0, highCount: 0, normalCount: 0, lowCount: 0, items: [] },
    recentLogs: [],
    summary: {
      totalProcessed: 0,
      critical: { count: 0, avgQueueDelayMs: 0, avgTotalLatencyMs: 0 },
      high: { count: 0, avgQueueDelayMs: 0, avgTotalLatencyMs: 0 },
      normal: { count: 0, avgQueueDelayMs: 0, avgTotalLatencyMs: 0 },
      low: { count: 0, avgQueueDelayMs: 0, avgTotalLatencyMs: 0 },
    },
  });

  const socketRef = useRef(null);
  const requestSequence = useRef(0);
  const latestPacketAt = useRef(0);

  // Synchronize when auth changes (e.g. logging in as Maitri or Bharati operator)
  useEffect(() => {
    if (isStationOperator && assignedStation) {
      setSelectedStationState(assignedStation);
    } else if (isIndiaOperator) {
      setSelectedStationState('all-stations');
    }
    setAlerts([]);
    setHasFetchedAlerts(false);
    setTelemetry({});
    setIsSimulatorOnline(false);
    latestPacketAt.current = 0;
  }, [isStationOperator, isIndiaOperator, assignedStation, role]);

  // Centralized Station Switcher with immediate stale-data clearing & WS re-subscription
  const setSelectedStation = useCallback((stationId) => {
    if (isIndiaOperator) {
      setIsLoadingStationData(true);
      requestSequence.current += 1;
      latestPacketAt.current = 0;
      setIsSimulatorOnline(false);
      setSelectedStationState(stationId);

    } else if (isStationOperator && assignedStation) {
      setSelectedStationState(assignedStation);
    }
  }, [isIndiaOperator, isStationOperator, assignedStation]);

  // Fetch Latest Station Telemetry & Alerts
  const refreshData = useCallback(async () => {
    const requestId = ++requestSequence.current;
    try {
      const stationFilter = isStationOperator ? assignedStation : (selectedStation === 'all-stations' ? undefined : selectedStation);
      const [telRes, metricRes, alertRes] = await Promise.all([
        fetchLatestTelemetry(stationFilter, role, assignedStation),
        fetchQueueMetrics().catch(() => null),
        fetchAlerts(stationFilter, role, assignedStation).catch(() => null),
      ]);
      if (requestId !== requestSequence.current) return;

      if (telRes && telRes.success && telRes.data) {
        // The collection endpoint returns { stationId: packet }, while a
        // station-filtered request returns the packet directly. Normalize both
        // shapes before merging so Maitri/Bharati views keep receiving updates.
        const telemetryByStation = telRes.data.station_id
          ? { [telRes.data.station_id]: telRes.data }
          : telRes.data;
        setTelemetry((prev) => ({ ...prev, ...telemetryByStation }));
        const readings = Object.values(telemetryByStation);
        const newest = Math.max(0, ...readings.map((reading) => Date.parse(reading.timestamp || reading.recorded_at) || 0));
        latestPacketAt.current = Math.max(latestPacketAt.current, newest);
        setIsSimulatorOnline(Date.now() - latestPacketAt.current < 30000);
        setLastSyncedAt(new Date().toISOString());
        setConnectionError(null);
      }
      if (metricRes && metricRes.success && metricRes.data) {
        setQueueMetrics(metricRes.data);
      }
      if (alertRes && alertRes.success && alertRes.data) {
        setAlerts(alertRes.data);
        setHasFetchedAlerts(true);
      }
    } catch (err) {
      if (requestId !== requestSequence.current) return;
      setConnectionError('Telemetry service unavailable. Showing the last received readings or demonstration data.');
      setIsSimulatorOnline(Date.now() - latestPacketAt.current < 30000);
    } finally {
      if (requestId === requestSequence.current) setIsLoadingStationData(false);
    }
  }, [isStationOperator, assignedStation, selectedStation, role]);

  // Connect to the Node telemetry bus. Socket.IO is used here because the
  // backend publishes processed satellite-link packets through Socket.IO;
  // a native WebSocket connection cannot consume that protocol reliably.
  useEffect(() => {
    refreshData();

    const socketUrl = import.meta.env.VITE_SOCKET_URL
      || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');
    const socketPath = import.meta.env.VITE_SOCKET_PATH
      || (import.meta.env.PROD ? '/backend/socket.io' : '/socket.io');
    let socket = null;
    let disposed = false;

    const receiveTelemetry = (message) => {
      const packet = message?.data?.station_id ? message.data : message;
      const stationId = packet?.station_id || message?.station_id;
      if (!stationId || (isStationOperator && stationId !== assignedStation)) return;

      const receivedAt = packet.recorded_at || packet.timestamp || message?.received_at || new Date().toISOString();
      setTelemetry((prev) => ({
        ...prev,
        [stationId]: {
          ...prev[stationId],
          ...packet,
          station_id: stationId,
          temperature: packet.temperature ?? packet.ambient_temperature_c,
          wind_speed: packet.wind_speed ?? packet.wind_speed_kmh,
          battery: packet.battery ?? packet.battery_level ?? packet.battery_level_percent,
          battery_level: packet.battery_level ?? packet.battery ?? packet.battery_level_percent,
          power_consumption: packet.power_consumption ?? packet.power_consumption_kw,
          power_generation: packet.power_generation ?? packet.power_generation_kw ?? prev[stationId]?.power_generation,
          generator_temperature: packet.generator_temperature ?? packet.generator_core_temp_c,
          generator_status: packet.generator_status ?? packet.system_status ?? 'RUNNING',
          timestamp: receivedAt,
          recorded_at: receivedAt,
        },
      }));
      latestPacketAt.current = Date.parse(receivedAt) || Date.now();
      setLastSyncedAt(new Date().toISOString());
      setIsSimulatorOnline(true);
      setConnectionError(null);
    };

    const receiveEmergency = (message) => {
      const alert = message?.data || message;
      if (!alert?.station_id || (isStationOperator && alert.station_id !== assignedStation)) return;
      setAlerts((prev) => [alert, ...prev.filter((item) => item.id !== alert.id)].slice(0, 50));
    };

    import('socket.io-client').then(({ io }) => {
      if (disposed) return;
      socket = io(socketUrl, {
        path: socketPath,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        timeout: 5000,
      });
      socketRef.current = socket;
      socket.on('telemetry_update', receiveTelemetry);
      socket.on('emergency_alert', receiveEmergency);
      socket.on('queue_metrics', setQueueMetrics);
      socket.on('connect_error', () => {
        setIsSimulatorOnline(Date.now() - latestPacketAt.current < 30000);
      });
      socket.on('disconnect', () => {
        setIsSimulatorOnline(Date.now() - latestPacketAt.current < 30000);
      });
    }).catch(() => {
      setIsSimulatorOnline(Date.now() - latestPacketAt.current < 30000);
    });

    // Polling remains a slower recovery path if a restrictive network blocks
    // the real-time transport.
    const interval = setInterval(refreshData, 5000);

    return () => {
      requestSequence.current += 1;
      disposed = true;
      clearInterval(interval);
      socket?.off('telemetry_update', receiveTelemetry);
      socket?.off('emergency_alert', receiveEmergency);
      socket?.off('queue_metrics', setQueueMetrics);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [refreshData, isStationOperator, assignedStation]);

  const activeStationId = isStationOperator ? (assignedStation || 'station-maitri') : selectedStation;
  const effectiveId = activeStationId === 'all-stations' ? 'station-maitri' : activeStationId;

  // Station-specific live telemetry without stale cross-contamination
  const currentTelemetry = telemetry[effectiveId] || {
    station_id: effectiveId,
    station_name: effectiveId === 'station-maitri' ? 'MAITRI' : 'BHARATI',
    temperature: effectiveId === 'station-maitri' ? -18.7 : -14.2,
    battery: effectiveId === 'station-maitri' ? 74.0 : 91.0,
    battery_level: effectiveId === 'station-maitri' ? 74.0 : 91.0,
    power_consumption: effectiveId === 'station-maitri' ? 105.0 : 148.0,
    power_generation: effectiveId === 'station-maitri' ? 132.0 : 185.0,
    generator_status: 'RUNNING',
    generator_temperature: effectiveId === 'station-maitri' ? 78.4 : 74.1,
    wind_speed: effectiveId === 'station-maitri' ? 28.0 : 44.0,
    water_level: effectiveId === 'station-maitri' ? 88.0 : 94.0,
    comms_status: 'SAT_LINK_NOMINAL',
  };

  const filteredAlerts = isStationOperator 
    ? alerts.filter(a => a.station_id === assignedStation)
    : alerts;

  const stationAlerts = activeStationId === 'all-stations' 
    ? filteredAlerts 
    : filteredAlerts.filter(a => a.station_id === activeStationId);

  return (
    <TelemetryContext.Provider
      value={{
        selectedStation: activeStationId,
        setSelectedStation,
        stations: isStationOperator 
          ? STATIONS.filter(s => s.id === assignedStation)
          : STATIONS,
        telemetry,
        currentTelemetry,
        alerts: filteredAlerts,
        stationAlerts,
        queueMetrics,
        isSimulatorOnline,
        connectionError,
        lastSyncedAt,
        hasFetchedAlerts,
        dataSource: telemetry[effectiveId] ? (isSimulatorOnline ? 'simulated-telemetry' : 'last-received') : 'demonstration',
        isLoadingStationData,
        refreshData,
        refreshTelemetry: refreshData,
        liveTelemetry: currentTelemetry,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}
