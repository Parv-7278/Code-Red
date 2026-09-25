import React, { useState, lazy, Suspense } from 'react';
import OperationsOverview from './components/OperationsOverview';
import ViewBoundary from './components/ViewBoundary';
import Header from './components/Header';
const DetailModal = lazy(() => import('./components/DetailModal'));
const InfrastructureView = lazy(() => import('./components/InfrastructureView'));
const EnergyView = lazy(() => import('./components/EnergyView'));
const DigitalTwinView = lazy(() => import('./components/DigitalTwinView'));
const LogisticsView = lazy(() => import('./components/LogisticsView'));
const EnvironmentView = lazy(() => import('./components/EnvironmentView'));
const CommunicationView = lazy(() => import('./components/CommunicationView'));
const AlertsView = lazy(() => import('./components/AlertsView'));
const OperatorAccessView = lazy(() => import('./components/OperatorAccessView'));
const TelemetryView = lazy(() => import('./components/TelemetryView'));
const SimulationsView = lazy(() => import('./components/SimulationsView'));
const ResearchView = lazy(() => import('./components/ResearchWorkspace'));
const RemoteOperationsView = lazy(() => import('./components/RemoteOperationsView'));
const AuthModal = lazy(() => import('./components/AuthModal'));
import LandingPage from './components/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { ModalProvider, useModal } from './context/ModalContext';
import { PredictiveProvider, usePredictive } from './context/PredictiveContext';
const AIPredictionModal = lazy(() => import('./components/AIPredictionModal'));
import { STATIONS_DATA } from './data/stationsData';
import './App.css';

function MainDashboard() {
  const { selectedStation, setSelectedStation } = useTelemetry();
  const { modalState, openDrillDown, closeModal } = useModal();
  const { isPredictionModalOpen } = usePredictive();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const effectiveStationId = selectedStation === 'all-stations' ? 'station-maitri' : selectedStation;
  const stationData = STATIONS_DATA[effectiveStationId] || STATIONS_DATA['station-maitri'];

  const handleOpenAlerts = () => {
    openDrillDown({
      title: `Active Mission Alerts & Incident Log (${stationData.name})`,
      type: 'ALERT_VIEW_ALL',
      data: stationData.alerts || null,
      station: stationData.name,
    });
  };

  const handleOpenReport = (scenarioObj) => {
    openDrillDown({
      title: `Simulation Report: ${scenarioObj?.name || scenarioObj?.label || 'Energy Diagnostic Analysis'}`,
      type: 'SIMULATION_REPORT',
      data: scenarioObj,
      station: stationData.name,
    });
  };

  return (
    <div className="polaris-dashboard-root">
      {/* Single Global Header / Navbar showing dynamic operational context */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
        unreadCount={stationData.unreadAlertsCount}
        onOpenAlerts={() => setActiveTab('alerts')}
        onOpenAuth={() => setActiveTab('account')}
      />

      <div id="main-workspace" tabIndex={-1}>
      {selectedStation === 'all-stations' && !['overview', 'account', 'alerts'].includes(activeTab) && <div className="ops-context-notice">Station workspace: Maitri. Use the station selector above to switch to Bharati or return to the India overview.</div>}
      <ViewBoundary key={`${activeTab}-${selectedStation}`} onReturn={() => setActiveTab('overview')}>
      <Suspense fallback={<div className="ops-loading" role="status">Loading workspace…</div>}>
      {activeTab === 'overview' ? (
        <OperationsOverview selectedStation={selectedStation} onSelectStation={setSelectedStation} onNavigate={setActiveTab} />
      ) : activeTab === 'energy' ? (
        <EnergyView 
          selectedStation={effectiveStationId}
          onOpenAlerts={handleOpenAlerts}
          onOpenReport={handleOpenReport}
        />
      ) : activeTab === 'infrastructure' ? (
        <InfrastructureView 
          selectedStation={effectiveStationId}
        />
      ) : activeTab === 'digital-twin' ? (
        <DigitalTwinView 
          selectedStation={effectiveStationId}
        />
      ) : activeTab === 'logistics' ? (
        <LogisticsView 
          selectedStation={effectiveStationId}
        />
      ) : activeTab === 'environment' ? (
        <EnvironmentView 
          selectedStation={effectiveStationId}
        />
      ) : activeTab === 'research' ? (
        <ResearchView 
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
        />
      ) : activeTab === 'communication' ? (
        <CommunicationView 
          selectedStation={effectiveStationId}
        />
      ) : activeTab === 'alerts' ? (
        <AlertsView 
          selectedStation={selectedStation}
        />
      ) : activeTab === 'account' ? (
        <OperatorAccessView
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
          onOpenSwitcher={() => setIsAuthModalOpen(true)}
        />
      ) : activeTab === 'telemetry' ? (
        <TelemetryView 
          selectedStation={effectiveStationId}
        />
      ) : activeTab === 'simulations' ? (
        <SimulationsView 
          selectedStation={effectiveStationId}
          onOpenReport={handleOpenReport}
        />
      ) : activeTab === 'remote-operations' ? (
        <RemoteOperationsView 
          selectedStation={effectiveStationId}
        />
      ) : (
        <OperationsOverview selectedStation={selectedStation} onSelectStation={setSelectedStation} onNavigate={setActiveTab} />
      )}
      </Suspense>
      </ViewBoundary>
      </div>

      {/* Main Bottom Footer matching screenshot */}
      <footer className="polaris-main-footer">
        <div className="footer-left">
          <span>POLARIS · Antarctic station operations · Demonstration prototype</span>
        </div>
        <div className="footer-right">
          <span>Maitri / Bharati · Decision support</span>
          <div className="footer-tricolor-badge">
            <span className="ft-saffron" />
            <span className="ft-white" />
            <span className="ft-green" />
          </div>
        </div>
      </footer>

      {/* Interactive Detail Modal Dialog */}
      {modalState.isOpen && <Suspense fallback={null}><DetailModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        type={modalState.type}
        data={modalState.data}
      /></Suspense>}

      {/* Authentication & Role Switcher Modal */}
      {isAuthModalOpen && <Suspense fallback={null}><AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isBarrier={false}
      /></Suspense>}

      {/* Global prediction review modal */}
      {isPredictionModalOpen && <Suspense fallback={null}><AIPredictionModal /></Suspense>}
    </div>
  );
}

function AppContent() {
  const { profile } = useAuth();

  // If unauthenticated or profile is null, show Government of India POLARIS Landing Page
  if (!profile) {
    return <LandingPage />;
  }

  return <MainDashboard />;
}

function StationAwarePredictiveProvider({ children }) {
  const { selectedStation } = useTelemetry();
  return (
    <PredictiveProvider selectedStation={selectedStation}>
      {children}
    </PredictiveProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TelemetryProvider>
        <ModalProvider>
          <StationAwarePredictiveProvider>
            <AppContent />
          </StationAwarePredictiveProvider>
        </ModalProvider>
      </TelemetryProvider>
    </AuthProvider>
  );
}
