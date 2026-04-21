import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, CheckCircle, AlertCircle, Save, Play, Plus, Edit } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { V2PageStack, V2SectionCard } from '@/components/v2/V2Scaffold';
import { PrototypeShell } from './v2/PrototypeShell';
import { useElectionConfigState } from './election-config/useElectionConfigState';
import { StepChurchSelection } from './election-config/StepChurchSelection';
import { StepVoterSelection } from './election-config/StepVoterSelection';
import { StepCriteria } from './election-config/StepCriteria';
import { StepPositions } from './election-config/StepPositions';
import { StepCandidates } from './election-config/StepCandidates';
import { useTranslation } from 'react-i18next';

export default function ElectionConfig() {
  const { skin } = useTheme();
  const {
    user,
    config,
    setConfig,
    currentStep,
    setCurrentStep,
    isEditing,
    editingConfigId,
    configExists,
    churches,
    members,
    loading,
    saving,
    searchTerm,
    setSearchTerm,
    eligibleSearchTerm,
    setEligibleSearchTerm,
    eligibleCandidates,
    ineligibleCandidates,
    removedCandidates,
    loadingCandidates,
    customPositions,
    positionDescriptions,
    currentLeaders,
    setCurrentLeaders,
    showAddPosition,
    setShowAddPosition,
    newPositionName,
    setNewPositionName,
    editingPosition,
    editingPositionName,
    setEditingPositionName,
    editingDescription,
    editingDescriptionText,
    setEditingDescriptionText,
    filteredMembers,
    selectedVoters,
    filteredEligibleCandidates,
    canAccessElectionConfig,
    handleNewNomination,
    handleChurchChange,
    handleVoterToggle,
    handleCriteriaChange,
    handlePositionToggle,
    handleAddCustomPosition,
    handleEditCustomPosition,
    handleSaveEditPosition,
    handleDeleteCustomPosition,
    handleMovePositionUp,
    handleMovePositionDown,
    handleCancelEdit,
    handleCancelAdd,
    handleEditDescription,
    handleSaveDescription,
    handleCancelDescriptionEdit,
    handleSelectAllPositions,
    handleDeselectAllPositions,
    handleAddIneligibleCandidate,
    handleRemoveCandidate,
    handleAddCandidate,
    loadEligibleCandidates,
    canProceedToNextStep,
    saveConfig,
    startElection,
  } = useElectionConfigState();

  const { t } = useTranslation();

  if (loading) {
    if (skin === 'v2') {
      return (
        <PrototypeShell
          label={t('electionConfig.title')}
          title={t('electionConfig.loading')}
          userName={user?.name}
        >
          <div className="p7-section">
            <div className="p7-card p7-card-p py-8 text-center">
              <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-primary" />
              <p className="text-sm text-[var(--p7-muted)]">
                {t('electionConfig.preparingConfig')}
              </p>
            </div>
          </div>
        </PrototypeShell>
      );
    }
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">{t('electionConfig.loading')}</h2>
          <p className="text-muted-foreground">{t('electionConfig.preparingConfig')}</p>
        </div>
      </MobileLayout>
    );
  }

  if (!canAccessElectionConfig) {
    if (skin === 'v2') {
      return (
        <PrototypeShell
          label={t('electionConfig.title')}
          title={t('electionConfig.accessRestricted')}
          userName={user?.name}
        >
          <div className="p7-section">
            <div className="p7-card p7-card-p">
              <p className="text-sm text-[var(--p7-muted)]">{t('electionConfig.adminOnly')}</p>
              <div className="mt-3 rounded-lg bg-[var(--p7-surface-2)] p-4 text-left text-sm text-[var(--p7-muted)]">
                <p>
                  <strong>{t('electionConfig.currentUser')}</strong>
                  <br />
                  {t('electionConfig.nameLabel')}: {user?.name || 'N/A'}
                  <br />
                  Email: {user?.email || 'N/A'}
                  <br />
                  Role: {user?.role || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </PrototypeShell>
      );
    }
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">{t('electionConfig.accessRestricted')}</h2>
          <p className="text-muted-foreground">{t('electionConfig.adminOnly')}</p>
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>{t('electionConfig.currentUser')}</strong>
              <br />
              {t('electionConfig.nameLabel')}: {user?.name || 'N/A'}
              <br />
              Email: {user?.email || 'N/A'}
              <br />
              Role: {user?.role || 'N/A'}
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (skin === 'v2') {
    return (
      <PrototypeShell
        label={t('electionConfig.title')}
        title={t('electionConfig.subtitle')}
        userName={user?.name}
      >
        <div className="p7-section">
          <V2PageStack>
            <V2SectionCard
              title={t('electionConfig.title')}
              subtitle={t('electionConfig.subtitle')}
              action={
                <Button variant="default" size="sm" onClick={handleNewNomination}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('electionConfig.newNomination')}
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-1 overflow-x-auto pb-2 sm:space-x-4">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div key={step} className="flex shrink-0 items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium sm:h-8 sm:w-8 sm:text-sm ${
                          currentStep >= step
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step}
                      </div>
                      <span
                        className={`ml-2 hidden text-sm font-medium sm:block ${
                          currentStep >= step ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {step === 1 && t('electionConfig.stepChurch')}
                        {step === 2 && t('electionConfig.stepVoters')}
                        {step === 3 && t('electionConfig.stepCriteria')}
                        {step === 4 && t('electionConfig.stepPositions')}
                        {step === 5 && t('electionConfig.stepCandidates')}
                      </span>
                      {step < 5 && (
                        <div
                          className={`mx-1 h-0.5 w-4 sm:mx-2 sm:w-8 ${
                            currentStep > step ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {isEditing ? (
                  <Alert className="border-primary/30 bg-primary/5">
                    <Edit className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <strong>{t('electionConfig.editMode')}</strong> -{' '}
                      {t('electionConfig.editModeDescription', { id: editingConfigId })}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-green-500/30 bg-green-500/5">
                    <Plus className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong>{t('electionConfig.createMode')}</strong> -{' '}
                      {t('electionConfig.createModeDescription')}
                    </AlertDescription>
                  </Alert>
                )}

                {configExists && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{t('electionConfig.configExists')}</strong>{' '}
                      {t('electionConfig.configExistsDescription')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </V2SectionCard>

            <V2SectionCard title={t('electionConfig.stepCandidates')}>
              <div className="space-y-4">
                {currentStep === 1 && (
                  <StepChurchSelection
                    config={config}
                    setConfig={setConfig}
                    churches={churches}
                    handleChurchChange={handleChurchChange}
                  />
                )}

                {currentStep === 2 && (
                  <StepVoterSelection
                    config={config}
                    setConfig={setConfig}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filteredMembers={filteredMembers}
                    selectedVoters={selectedVoters}
                    handleVoterToggle={handleVoterToggle}
                  />
                )}

                {currentStep === 3 && (
                  <StepCriteria config={config} handleCriteriaChange={handleCriteriaChange} />
                )}

                {currentStep === 4 && (
                  <StepPositions
                    config={config}
                    members={members}
                    customPositions={customPositions}
                    positionDescriptions={positionDescriptions}
                    currentLeaders={currentLeaders}
                    setCurrentLeaders={setCurrentLeaders}
                    showAddPosition={showAddPosition}
                    setShowAddPosition={setShowAddPosition}
                    newPositionName={newPositionName}
                    setNewPositionName={setNewPositionName}
                    editingPosition={editingPosition}
                    editingPositionName={editingPositionName}
                    setEditingPositionName={setEditingPositionName}
                    editingDescription={editingDescription}
                    editingDescriptionText={editingDescriptionText}
                    setEditingDescriptionText={setEditingDescriptionText}
                    handlePositionToggle={handlePositionToggle}
                    handleAddCustomPosition={handleAddCustomPosition}
                    handleEditCustomPosition={handleEditCustomPosition}
                    handleSaveEditPosition={handleSaveEditPosition}
                    handleDeleteCustomPosition={handleDeleteCustomPosition}
                    handleMovePositionUp={handleMovePositionUp}
                    handleMovePositionDown={handleMovePositionDown}
                    handleCancelEdit={handleCancelEdit}
                    handleCancelAdd={handleCancelAdd}
                    handleEditDescription={handleEditDescription}
                    handleSaveDescription={handleSaveDescription}
                    handleCancelDescriptionEdit={handleCancelDescriptionEdit}
                    handleSelectAllPositions={handleSelectAllPositions}
                    handleDeselectAllPositions={handleDeselectAllPositions}
                  />
                )}

                {currentStep === 5 && (
                  <StepCandidates
                    config={config}
                    eligibleCandidates={
                      eligibleCandidates as import('./election-config/StepCandidates').CandidateMember[]
                    }
                    ineligibleCandidates={
                      ineligibleCandidates as import('./election-config/StepCandidates').CandidateMember[]
                    }
                    removedCandidates={removedCandidates}
                    loadingCandidates={loadingCandidates}
                    eligibleSearchTerm={eligibleSearchTerm}
                    setEligibleSearchTerm={setEligibleSearchTerm}
                    filteredEligibleCandidates={
                      filteredEligibleCandidates as import('./election-config/StepCandidates').CandidateMember[]
                    }
                    loadEligibleCandidates={loadEligibleCandidates}
                    handleRemoveCandidate={handleRemoveCandidate}
                    handleAddIneligibleCandidate={
                      handleAddIneligibleCandidate as (
                        candidate: import('./election-config/StepCandidates').CandidateMember
                      ) => void
                    }
                    handleAddCandidate={handleAddCandidate}
                  />
                )}
              </div>
            </V2SectionCard>

            <V2SectionCard title={t('electionConfig.next')}>
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                >
                  {t('electionConfig.previous')}
                </Button>

                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  {currentStep < 5 ? (
                    <Button
                      onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                      disabled={!canProceedToNextStep()}
                    >
                      {t('electionConfig.next')}
                    </Button>
                  ) : (
                    <>
                      <Button onClick={saveConfig} disabled={saving} variant="outline">
                        <Save className="mr-2 h-4 w-4" />
                        <span className="truncate">
                          {saving
                            ? t('electionConfig.saving')
                            : isEditing
                              ? t('electionConfig.saveChanges')
                              : t('electionConfig.saveConfig')}
                        </span>
                      </Button>

                      <Button onClick={startElection} disabled={loading} variant="default">
                        <Play className="mr-2 h-4 w-4" />
                        {loading
                          ? t('electionConfig.starting')
                          : t('electionConfig.startNomination')}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {config.status === 'active' && (
                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('electionConfig.nominationActive')}</strong>{' '}
                    {t('electionConfig.votersCanAccess')}
                  </AlertDescription>
                </Alert>
              )}
            </V2SectionCard>
          </V2PageStack>
        </div>
      </PrototypeShell>
    );
  }

  return (
    <MobileLayout>
      <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold">{t('electionConfig.title')}</h1>
                {config.title && config.title.trim().length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {config.title}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{t('electionConfig.subtitle')}</p>
            </div>
          </div>

          {/* Botão Nova Nomeação */}
          <Button
            variant="default"
            size="sm"
            onClick={handleNewNomination}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('electionConfig.newNomination')}
          </Button>
        </div>

        {/* Indicador de Passos */}
        <div className="flex items-center justify-center space-x-1 sm:space-x-4 mb-4 sm:mb-6 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center flex-shrink-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {step}
              </div>
              <span
                className={`hidden sm:block ml-2 text-sm font-medium ${
                  currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {step === 1 && t('electionConfig.stepChurch')}
                {step === 2 && t('electionConfig.stepVoters')}
                {step === 3 && t('electionConfig.stepCriteria')}
                {step === 4 && t('electionConfig.stepPositions')}
                {step === 5 && t('electionConfig.stepCandidates')}
              </span>
              {step < 5 && (
                <div
                  className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Indicador de Modo (Edição ou Criação) */}
        {isEditing ? (
          <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-400">
            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription>
              <strong>{t('electionConfig.editMode')}</strong> -{' '}
              {t('electionConfig.editModeDescription', { id: editingConfigId })}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950/50 dark:border-green-400">
            <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>
              <strong>{t('electionConfig.createMode')}</strong> -{' '}
              {t('electionConfig.createModeDescription')}
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de Configuração Existente */}
        {configExists && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('electionConfig.configExists')}</strong>{' '}
              {t('electionConfig.configExistsDescription')}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {currentStep === 1 && (
            <StepChurchSelection
              config={config}
              setConfig={setConfig}
              churches={churches}
              handleChurchChange={handleChurchChange}
            />
          )}

          {currentStep === 2 && (
            <StepVoterSelection
              config={config}
              setConfig={setConfig}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredMembers={filteredMembers}
              selectedVoters={selectedVoters}
              handleVoterToggle={handleVoterToggle}
            />
          )}

          {currentStep === 3 && (
            <StepCriteria config={config} handleCriteriaChange={handleCriteriaChange} />
          )}

          {currentStep === 4 && (
            <StepPositions
              config={config}
              members={members}
              customPositions={customPositions}
              positionDescriptions={positionDescriptions}
              currentLeaders={currentLeaders}
              setCurrentLeaders={setCurrentLeaders}
              showAddPosition={showAddPosition}
              setShowAddPosition={setShowAddPosition}
              newPositionName={newPositionName}
              setNewPositionName={setNewPositionName}
              editingPosition={editingPosition}
              editingPositionName={editingPositionName}
              setEditingPositionName={setEditingPositionName}
              editingDescription={editingDescription}
              editingDescriptionText={editingDescriptionText}
              setEditingDescriptionText={setEditingDescriptionText}
              handlePositionToggle={handlePositionToggle}
              handleAddCustomPosition={handleAddCustomPosition}
              handleEditCustomPosition={handleEditCustomPosition}
              handleSaveEditPosition={handleSaveEditPosition}
              handleDeleteCustomPosition={handleDeleteCustomPosition}
              handleMovePositionUp={handleMovePositionUp}
              handleMovePositionDown={handleMovePositionDown}
              handleCancelEdit={handleCancelEdit}
              handleCancelAdd={handleCancelAdd}
              handleEditDescription={handleEditDescription}
              handleSaveDescription={handleSaveDescription}
              handleCancelDescriptionEdit={handleCancelDescriptionEdit}
              handleSelectAllPositions={handleSelectAllPositions}
              handleDeselectAllPositions={handleDeselectAllPositions}
            />
          )}

          {/* Passo 5: Preview de Candidatos Elegíveis */}
          {currentStep === 5 && (
            <StepCandidates
              config={config}
              eligibleCandidates={
                eligibleCandidates as import('./election-config/StepCandidates').CandidateMember[]
              }
              ineligibleCandidates={
                ineligibleCandidates as import('./election-config/StepCandidates').CandidateMember[]
              }
              removedCandidates={removedCandidates}
              loadingCandidates={loadingCandidates}
              eligibleSearchTerm={eligibleSearchTerm}
              setEligibleSearchTerm={setEligibleSearchTerm}
              filteredEligibleCandidates={
                filteredEligibleCandidates as import('./election-config/StepCandidates').CandidateMember[]
              }
              loadEligibleCandidates={loadEligibleCandidates}
              handleRemoveCandidate={handleRemoveCandidate}
              handleAddIneligibleCandidate={
                handleAddIneligibleCandidate as (
                  candidate: import('./election-config/StepCandidates').CandidateMember
                ) => void
              }
              handleAddCandidate={handleAddCandidate}
            />
          )}
        </div>

        {/* Navegação entre Passos */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 sm:pt-6 border-t gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="order-2 sm:order-1"
          >
            {t('electionConfig.previous')}
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
            {currentStep < 5 ? (
              <Button
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                disabled={!canProceedToNextStep()}
                className="w-full sm:w-auto"
              >
                {t('electionConfig.next')}
              </Button>
            ) : (
              <>
                <Button
                  onClick={saveConfig}
                  disabled={saving}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  <span className="truncate">
                    {saving
                      ? t('electionConfig.saving')
                      : isEditing
                        ? t('electionConfig.saveChanges')
                        : t('electionConfig.saveConfig')}
                  </span>
                </Button>

                <Button
                  onClick={startElection}
                  disabled={loading}
                  variant="default"
                  className="w-full sm:w-auto"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? t('electionConfig.starting') : t('electionConfig.startNomination')}
                </Button>
              </>
            )}
          </div>
        </div>

        {config.status === 'active' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('electionConfig.nominationActive')}</strong>{' '}
              {t('electionConfig.votersCanAccess')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MobileLayout>
  );
}
