import React, { useState } from 'react';
import { Sparkles, Radio, ArrowLeft, ArrowRight, Building2, Globe2, Shield } from 'lucide-react';
import Header from './components/Header';
import StationSelector from './components/StationSelector';
import StationHealthGauge from './components/StationHealthGauge';
import ActiveAlerts from './components/ActiveAlerts';
import DigitalTwinViewer from './components/DigitalTwinViewer';
import WeatherOverview from './components/WeatherOverview';
import EnvironmentalConditions from './components/EnvironmentalConditions';
import EnergySummary from './components/EnergySummary';
import LogisticsOverview from './components/LogisticsOverview';
import ResourceTrend from './components/ResourceTrend';
import PredictiveAlerts from './components/PredictiveAlerts';
import WhatIfSimulator from './components/WhatIfSimulator';
import DetailModal from './components/DetailModal';
import InfrastructureView from './components/InfrastructureView';
import EnergyView from './components/EnergyView';
import DigitalTwinView from './components/DigitalTwinView';
import LogisticsView from './components/LogisticsView';
import EnvironmentView from './components/EnvironmentView';
import CommunicationView from './components/CommunicationView';
import AlertsView from './components/AlertsView';
import OperatorAccessView from './components/OperatorAccessView';
import TelemetryView from './components/TelemetryView';
import SimulationsView from './components/SimulationsView';
import ResearchView from './components/ResearchView';
import RemoteOperationsView from './components/RemoteOperationsView';
import AllStationsOverview from './components/AllStationsOverview';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { ModalProvider, useModal } from './context/ModalContext';
import { PredictiveProvider, usePredictive } from './context/PredictiveContext';
import AIPredictionCenter from './components/AIPredictionCenter';
import AIPredictionModal from './components/AIPredictionModal';
import PolarisFlowDiagram from './components/PolarisFlowDiagram';
import { STATIONS_DATA } from './data/stationsData';
import './App.css';

function MainDashboard() {
  const { profile, isIndiaOperator, isStationOperator, assignedStation, loginWithDemoRole, logout } = useAuth();
  const { selectedStation, setSelectedStation } = useTelemetry();
  const { modalState, openDrillDown, closeModal } = useModal();
  const [activeTab, setActiveTab] = useState('research');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);

  const effectiveStationId = selectedStation === 'all-stations' ? 'station-maitri' : selectedStation;
  const stationData = STATIONS_DATA[effectiveStationId] || STATIONS_DATA['station-maitri'];

  const handleReturnToIndia = () => {
    loginWithDemoRole('india_operator');
    setSelectedStation('all-stations');
  };

  const handleOpenAlerts = () => {
    openDrillDown({
      title: `Active Mission Alerts & Incident Log (${stationData.name})`,
      type: 'ALERT_VIEW_ALL',
      data: stationData.alerts || null,
      station: stationData.name,
    });
  };

  const handleOpenInsight = (detailData) => {
    openDrillDown({
      title: detailData?.title || 'Predictive Alert Detail',
      type: 'INSIGHT_DETAIL',
      data: detailData,
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

  const handleOpenForecast = () => {
    openDrillDown({
      title: `Detailed Polar Meteorological Forecast – ${stationData.name} (7-Day)`,
      type: 'FORECAST',
      data: stationData.weather,
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

      {/* Main View Switching controlled exclusively by Top Navbar */}
      {selectedStation === 'all-stations' && activeTab === 'overview' ? (
        <AllStationsOverview onSelectStation={setSelectedStation} />
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
        /* Overview Dashboard View */
        <main className="polaris-main-grid">
          {/* Left Column */}
          <aside className="polaris-col-left">
            <StationSelector 
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
            />
            <StationHealthGauge 
              health={stationData.health}
            />
            <ActiveAlerts 
              alerts={stationData.alerts}
              unreadCount={stationData.unreadAlertsCount}
              onOpenViewAll={handleOpenAlerts}
            />
          </aside>

          {/* Center Main Content Area */}
          <section className="polaris-col-center">
            {/* Primary AI Predictive Intelligence Center */}
            <AIPredictionCenter />

            <DigitalTwinViewer 
              selectedStation={effectiveStationId}
              stationData={stationData}
            />

            <div className="center-middle-grid">
              <EnergySummary 
                energy={stationData.energy}
              />
              <LogisticsOverview 
                inventory={stationData.logistics}
              />
              <ResourceTrend 
                trendData={stationData.resourceTrend}
                selectedStation={effectiveStationId}
              />
            </div>

            <div className="center-bottom-grid">
              <PredictiveAlerts 
                insights={stationData.predictiveInsights}
                onOpenInsight={handleOpenInsight}
              />
              <WhatIfSimulator 
                scenarios={stationData.scenarios}
                onOpenReport={handleOpenReport}
              />
            </div>
          </section>

          {/* Right Column */}
          <aside className="polaris-col-right">
            <WeatherOverview 
              weather={stationData.weather}
              onOpenForecast={handleOpenForecast}
            />
            <EnvironmentalConditions 
              weather={stationData.weather}
              sparklines={stationData.sparklines}
            />
          </aside>
        </main>
      )}

      {/* Main Bottom Footer matching screenshot */}
      <footer className="polaris-main-footer">
        <div className="footer-left">
          <span>POLARIS &nbsp;|&nbsp; Ministry of Earth Sciences &nbsp;|&nbsp; Government of India</span>
        </div>
        <div className="footer-right">
          <span>For a Safer, Smarter and More Resilient Antarctic Future</span>
          <div className="footer-tricolor-badge">
            <span className="ft-saffron" />
            <span className="ft-white" />
            <span className="ft-green" />
          </div>
        </div>
      </footer>

      {/* Interactive Detail Modal Dialog */}
      <DetailModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        type={modalState.type}
        data={modalState.data}
      />

      {/* Authentication & Role Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isBarrier={false}
      />

      {/* Operational Architecture & Routing Flow Modal */}
      {showFlowModal && (
        <div className="portal-modal-backdrop" onClick={() => setShowFlowModal(false)}>
          <div className="flow-modal-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="flow-modal-header">
              <div className="flow-modal-header-left">
                <Sparkles size={20} className="text-cyan" />
                <h4 className="flow-modal-title">POLARIS Operational Command & Routing Hierarchy</h4>
              </div>
              <button 
                type="button" 
                className="support-modal-close" 
                onClick={() => setShowFlowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="flow-modal-body">
              <PolarisFlowDiagram 
                onNavigateNode={(target) => {
                  setShowFlowModal(false);
                  if (target === 'india') {
                    loginWithDemoRole('india_operator');
                    setSelectedStation('all-stations');
                  } else if (target === 'maitri') {
                    loginWithDemoRole('station-maitri');
                    setSelectedStation('station-maitri');
                  } else if (target === 'bharati') {
                    loginWithDemoRole('station-bharati');
                    setSelectedStation('station-bharati');
                  }
                }}
                activeNode="auto"
              />
            </div>

            <div className="flow-modal-footer">
              <span className="flow-modal-footer-note">💡 Click any station node above to switch operational context instantaneously.</span>
              <button 
                type="button" 
                className="support-close-action-btn"
                onClick={() => setShowFlowModal(false)}
              >
                Close Architecture View
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Global AI Predictive Intelligence Modal */}
      <AIPredictionModal />
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
