import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import {
  PrototypeAvatar,
  PrototypeHeaderIconButton,
  PrototypeStatusBar,
} from './v2/prototypeShared';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getMountName } from '@/lib/gamification';
import { useMyInterestedState } from './my-interested/useMyInterestedState';
import {
  AuthorizationModal,
  ChurchFilter,
  DiscipleDialog,
  EmptyState,
  InterestedList,
  InviteModal,
  LoadingState,
  LoggedOutState,
  PageHeader,
  PaginationControls,
  PendingInvites,
  SearchBar,
  StatsCards,
  StatusFilters,
  Tabs,
} from './my-interested/MyInterestedSections';

export default function MyInterested() {
  const { t } = useTranslation();
  const { skin } = useTheme();
  const {
    user,
    isPastorUser,
    isAdmin,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    selectedTab,
    setSelectedTab,
    showDiscipleDialog,
    setShowDiscipleDialog,
    selectedInterested,
    discipleMessage,
    setDiscipleMessage,
    selectedChurch,
    setSelectedChurch,
    currentPage,
    setCurrentPage,
    showAuthorizationModal,
    setShowAuthorizationModal,
    selectedRequest,
    adminNotes,
    setAdminNotes,
    showInviteModal,
    setShowInviteModal,
    inviteInterested,
    selectedMissionaryId,
    setSelectedMissionaryId,
    updatingSituation,
    loadingChurch,
    loadingRelationships,
    loadingRequests,
    loadingPoints,
    availableChurches,
    sortedMyInterested,
    sortedFilteredChurchInterested,
    availableMissionaries,
    myPendingInvites,
    allRequests,
    interestedPoints,
    statsData,
    totalPages,
    currentList,
    situationLevels,
    queryClient,
    pendingRequestsSet,
    itemsPerPage,
    createDiscipleRequestMutation,
    updateRequestMutation,
    directDiscipleMutation,
    pastorInviteMutation,
    getSituationOption,
    handleSituationChange,
    handleOpenInvite,
    handleConfirmInvite,
    handleRespondInvite,
    hasPendingRequestForAdmin,
    handleDiscipleRequest,
    openAuthorizationModal,
    handleProcessRequest,
    getUserInfo,
    getMissionaryFirstNames,
    handleUnlinkDisciple,
    confirmDiscipleRequest,
    handleWhatsApp,
    handleOpenChat,
    getStatusColor,
    getStatusLabel,
    getDiscipleStatus,
    hasAnyActiveRelationship,
    hasAnyApprovedRequest,
    formatDate,
    getLevelIcon,
  } = useMyInterestedState();

  const stats = statsData;
  const totalCount =
    selectedTab === 'my' ? sortedMyInterested.length : sortedFilteredChurchInterested.length;
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
    queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
    queryClient.invalidateQueries({ queryKey: ['relationships'] });
    queryClient.invalidateQueries({ queryKey: ['all-relationships'] });
    queryClient.invalidateQueries({ queryKey: ['my-interested'] });
    queryClient.invalidateQueries({ queryKey: ['church-interested'] });
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
  };
  if (!user) {
    return <LoggedOutState message={t('myInterested.loginRequired')} />;
  }

  const modals = (
    <>
      <DiscipleDialog
        isOpen={showDiscipleDialog}
        selectedInterested={selectedInterested}
        discipleMessage={discipleMessage}
        setDiscipleMessage={setDiscipleMessage}
        onCancel={() => setShowDiscipleDialog(false)}
        onConfirm={confirmDiscipleRequest}
        isSubmitting={createDiscipleRequestMutation.isPending}
      />
      <AuthorizationModal
        isOpen={showAuthorizationModal}
        selectedRequest={selectedRequest}
        adminNotes={adminNotes}
        setAdminNotes={setAdminNotes}
        getUserInfo={getUserInfo}
        onCancel={() => setShowAuthorizationModal(false)}
        onProcess={handleProcessRequest}
        isProcessing={updateRequestMutation.isPending}
      />
      <InviteModal
        isOpen={showInviteModal}
        inviteInterested={inviteInterested}
        selectedMissionaryId={selectedMissionaryId}
        setSelectedMissionaryId={setSelectedMissionaryId}
        availableMissionaries={availableMissionaries}
        onCancel={() => setShowInviteModal(false)}
        onConfirm={handleConfirmInvite}
        isSubmitting={pastorInviteMutation.isPending}
      />
    </>
  );

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">
                    {t('myInterested.title', { defaultValue: 'Meus interessados' })}
                  </div>
                  <div className="p7-header-title">
                    {t('myInterested.subtitle', { defaultValue: 'Acompanhamento' })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <PrototypeHeaderIconButton
                    icon={RefreshCw}
                    onClick={handleRefresh}
                    label="Atualizar meus interessados"
                  />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>
            <div className="p7-scroll">
              <div className="p7-section">
                <StatsCards stats={stats} />
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <Tabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} stats={stats} />
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p space-y-4">
                  <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                  <StatusFilters
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                  />
                  <ChurchFilter
                    isAdmin={isAdmin}
                    selectedChurch={selectedChurch}
                    setSelectedChurch={setSelectedChurch}
                    availableChurches={availableChurches}
                  />
                </div>
              </div>

              <div className="p7-section">
                <PendingInvites
                  invites={myPendingInvites}
                  isPastorUser={isPastorUser}
                  formatDate={formatDate}
                  getUserInfo={getUserInfo}
                  handleRespondInvite={handleRespondInvite}
                  isUpdating={updateRequestMutation.isPending}
                />
              </div>

              <div className="p7-section pb-4 space-y-4">
                {(loadingChurch || loadingRelationships || loadingRequests) && <LoadingState />}
                {!loadingChurch && !loadingRelationships && !loadingRequests && (
                  <>
                    <InterestedList
                      currentList={currentList}
                      selectedTab={selectedTab}
                      user={user}
                      pendingRequestsSet={pendingRequestsSet}
                      situationLevels={situationLevels}
                      updatingSituation={updatingSituation}
                      loadingPoints={loadingPoints}
                      interestedPoints={interestedPoints}
                      getStatusColor={getStatusColor}
                      getStatusLabel={getStatusLabel}
                      getDiscipleStatus={getDiscipleStatus}
                      getSituationOption={getSituationOption}
                      handleSituationChange={handleSituationChange}
                      handleOpenInvite={handleOpenInvite}
                      directDiscipleMutation={directDiscipleMutation}
                      availableMissionaries={availableMissionaries}
                      handleDiscipleRequest={handleDiscipleRequest}
                      handleWhatsApp={handleWhatsApp}
                      handleOpenChat={handleOpenChat}
                      handleUnlinkDisciple={handleUnlinkDisciple}
                      hasAnyActiveRelationship={hasAnyActiveRelationship}
                      hasAnyApprovedRequest={hasAnyApprovedRequest}
                      hasPendingRequestForAdmin={hasPendingRequestForAdmin}
                      allRequests={allRequests}
                      openAuthorizationModal={openAuthorizationModal}
                      getMissionaryFirstNames={getMissionaryFirstNames}
                      formatDate={formatDate}
                      getLevelIcon={getLevelIcon}
                      getMountName={getMountName}
                      isPastorUser={isPastorUser}
                    />
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      itemsPerPage={itemsPerPage}
                      totalCount={totalCount}
                      setCurrentPage={setCurrentPage}
                    />
                    <EmptyState
                      isVisible={
                        !loadingChurch &&
                        !loadingRelationships &&
                        !loadingRequests &&
                        !loadingPoints &&
                        totalCount === 0
                      }
                      selectedTab={selectedTab}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {modals}
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        <>
          <PageHeader onRefresh={handleRefresh} />
          <StatsCards stats={stats} />
          <Tabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} stats={stats} />
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <StatusFilters selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} />
          <ChurchFilter
            isAdmin={isAdmin}
            selectedChurch={selectedChurch}
            setSelectedChurch={setSelectedChurch}
            availableChurches={availableChurches}
          />
          <PendingInvites
            invites={myPendingInvites}
            isPastorUser={isPastorUser}
            formatDate={formatDate}
            getUserInfo={getUserInfo}
            handleRespondInvite={handleRespondInvite}
            isUpdating={updateRequestMutation.isPending}
          />
          {(loadingChurch || loadingRelationships || loadingRequests) && <LoadingState />}
          {!loadingChurch && !loadingRelationships && !loadingRequests && (
            <InterestedList
              currentList={currentList}
              selectedTab={selectedTab}
              user={user}
              pendingRequestsSet={pendingRequestsSet}
              situationLevels={situationLevels}
              updatingSituation={updatingSituation}
              loadingPoints={loadingPoints}
              interestedPoints={interestedPoints}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getDiscipleStatus={getDiscipleStatus}
              getSituationOption={getSituationOption}
              handleSituationChange={handleSituationChange}
              handleOpenInvite={handleOpenInvite}
              directDiscipleMutation={directDiscipleMutation}
              availableMissionaries={availableMissionaries}
              handleDiscipleRequest={handleDiscipleRequest}
              handleWhatsApp={handleWhatsApp}
              handleOpenChat={handleOpenChat}
              handleUnlinkDisciple={handleUnlinkDisciple}
              hasAnyActiveRelationship={hasAnyActiveRelationship}
              hasAnyApprovedRequest={hasAnyApprovedRequest}
              hasPendingRequestForAdmin={hasPendingRequestForAdmin}
              allRequests={allRequests}
              openAuthorizationModal={openAuthorizationModal}
              getMissionaryFirstNames={getMissionaryFirstNames}
              formatDate={formatDate}
              getLevelIcon={getLevelIcon}
              getMountName={getMountName}
              isPastorUser={isPastorUser}
            />
          )}
          {!loadingChurch && !loadingRelationships && !loadingRequests && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalCount={totalCount}
              setCurrentPage={setCurrentPage}
            />
          )}
          <EmptyState
            isVisible={
              !loadingChurch &&
              !loadingRelationships &&
              !loadingRequests &&
              !loadingPoints &&
              totalCount === 0
            }
            selectedTab={selectedTab}
          />
        </>
      </div>
      {modals}
    </MobileLayout>
  );
}
