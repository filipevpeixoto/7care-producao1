import React from 'react';
import { useParams } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useElectionManageState } from './election-manage/useElectionManageState';
import {
  CurrentPositionCard,
  ElectionManageHeader,
  ErrorState,
  LoadingState,
  NominationConfig,
  ProgressOverview,
  RealtimeUpdates,
  VoterInstructions,
} from './election-manage/ElectionManageSections';

export default function ElectionManage() {
  const { configId } = useParams<{ configId: string }>();
  const {
    electionData,
    currentPhase,
    loading,
    autoRefresh,
    maxNominations,
    editingMaxNominations,
    tempMaxNominations,
    chartView,
    isFullscreen,
    zoomLevel,
    setAutoRefresh,
    setEditingMaxNominations,
    setTempMaxNominations,
    setChartView,
    handleAdvanceToVoting,
    handleAdvancePosition,
    handleSkipPosition,
    handleResetVoting,
    handleSaveMaxNominations,
    getCurrentPositionData,
    getPhaseProgress,
    getVoterTurnout,
    toggleFullscreen,
    increaseZoom,
    decreaseZoom,
    getZoomedSize,
  } = useElectionManageState(configId ?? '');

  if (loading) {
    return <LoadingState isFullscreen={isFullscreen} />;
  }

  if (!electionData) {
    return <ErrorState isFullscreen={isFullscreen} />;
  }

  const currentPosData = getCurrentPositionData();
  const isLastPosition = electionData.currentPosition >= electionData.totalPositions - 1;

  return (
    <MobileLayout fullscreen={isFullscreen}>
      <div
        className={`${isFullscreen ? 'h-screen overflow-hidden' : ''} transition-all duration-300`}
        style={isFullscreen ? { fontSize: `${zoomLevel}%` } : {}}
      >
        <div className={`${isFullscreen ? 'p-2 space-y-2 h-full' : 'p-4 space-y-6'}`}>
          <ElectionManageHeader
            churchName={electionData.election.church_name ?? ''}
            autoRefresh={autoRefresh}
            isFullscreen={isFullscreen}
            zoomLevel={zoomLevel}
            setAutoRefresh={setAutoRefresh}
            toggleFullscreen={toggleFullscreen}
            increaseZoom={increaseZoom}
            decreaseZoom={decreaseZoom}
            getZoomedSize={getZoomedSize}
          />

          <ProgressOverview
            electionData={electionData}
            isFullscreen={isFullscreen}
            getPhaseProgress={getPhaseProgress}
            getVoterTurnout={getVoterTurnout}
            getZoomedSize={getZoomedSize}
          />

          <NominationConfig
            currentPhase={currentPhase}
            isFullscreen={isFullscreen}
            maxNominations={maxNominations}
            editingMaxNominations={editingMaxNominations}
            tempMaxNominations={tempMaxNominations}
            setEditingMaxNominations={setEditingMaxNominations}
            setTempMaxNominations={setTempMaxNominations}
            handleSaveMaxNominations={handleSaveMaxNominations}
            getZoomedSize={getZoomedSize}
          />

          <CurrentPositionCard
            currentPosData={currentPosData}
            currentPhase={currentPhase}
            chartView={chartView}
            electionData={electionData}
            isFullscreen={isFullscreen}
            isLastPosition={isLastPosition}
            setChartView={setChartView}
            handleAdvanceToVoting={handleAdvanceToVoting}
            handleAdvancePosition={handleAdvancePosition}
            handleSkipPosition={handleSkipPosition}
            handleResetVoting={handleResetVoting}
            getZoomedSize={getZoomedSize}
          />

          {!isFullscreen && (
            <>
              <VoterInstructions currentPhase={currentPhase} currentPosData={currentPosData} />
              <RealtimeUpdates />
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
