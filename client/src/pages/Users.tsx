import type { FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { hasAdminAccess } from '@/lib/permissions';
import {
  PrototypeAvatar,
  PrototypeHeaderIconButton,
  PrototypeStatusBar,
} from './v2/prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { UserDetailModal } from '@/components/users/UserDetailModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { ScheduleVisitModal } from '@/components/users/ScheduleVisitModal';
import type { UserMember } from '@/types/domain';
import { useUsersState } from './users/useUsersState';
import { UsersHeader } from './users/UsersHeader';
import {
  UsersLoadingState,
  UsersErrorState,
  UsersStats,
  UsersSituation,
  UsersFilters,
  UsersList,
  UsersEmptyState,
  CreateUserDialog,
  DeleteUserDialog,
  DiscipleDialog,
  AuthorizationModal,
  UsersMountainStats,
} from './users/UsersSections';

export default function Users() {
  const { t } = useTranslation();
  const { skin } = useTheme();
  const {
    user,
    isLoading,
    error,
    users,
    churches,
    safeRelationshipsData,
    usersWithDiscipleRequests,
    filteredAndSortedUsers,
    situationLevels,
    pendingCount,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    churchFilter,
    setChurchFilter,
    mountainFilter,
    interestedSituationFilter,
    missionaryProfileFilter,
    setMissionaryProfileFilter,
    selectedUser,
    showUserModal,
    setShowUserModal,
    showEditModal,
    setShowEditModal,
    showCreateModal,
    setShowCreateModal,
    showScheduleModal,
    setShowScheduleModal,
    showDeleteDialog,
    setShowDeleteDialog,
    userToDelete,
    showDiscipleDialog,
    setShowDiscipleDialog,
    userToDisciple,
    discipleMessage,
    setDiscipleMessage,
    showAuthorizationModal,
    setShowAuthorizationModal,
    selectedRequest,
    adminNotes,
    setAdminNotes,
    createFormData,
    isRecalculating,
    recalculationProgress,
    recalculationMessage,
    handleMountainClick,
    handleInterestedSituationClick,
    getMountainFilterName,
    getMountainCount,
    getInterestedSituationCount,
    getUsersCountByMountain,
    handleApproveUser,
    handleRejectUser,
    handleUpdateUser,
    openCreateModal,
    handleCreateFormChange,
    handleCreateUserSubmit,
    handleDeleteUser,
    confirmDeleteUser,
    handleEditUser,
    handleViewUser,
    handleScheduleVisit,
    handleDiscipleRequest,
    handleProcessDiscipleRequest,
    handleRemoveActiveDisciple,
    createUserMutation,
    discipleUserMutation,
    queryClient,
  } = useUsersState();

  if (isLoading) {
    return <UsersLoadingState message={t('users.loading')} />;
  }

  if (error) {
    return (
      <UsersErrorState
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['/api/users'] })}
      />
    );
  }

  const modals = (
    <>
      <UserDetailModal
        user={selectedUser as UserMember}
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onUpdate={handleUpdateUser}
      />
      <EditUserModal
        user={selectedUser as UserMember}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleUpdateUser}
      />
      <CreateUserDialog
        isOpen={showCreateModal}
        onOpenChange={(open) => !open && setShowCreateModal(false)}
        onSubmit={handleCreateUserSubmit as (event: FormEvent<HTMLFormElement>) => void}
        onCancel={() => setShowCreateModal(false)}
        createFormData={createFormData}
        handleCreateFormChange={handleCreateFormChange}
        userRole={user?.role}
        isSubmitting={createUserMutation.isPending}
      />
      <ScheduleVisitModal
        user={selectedUser as Pick<UserMember, 'id' | 'name' | 'address' | 'phone'>}
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />
      <DeleteUserDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userName={userToDelete?.name}
        onConfirm={confirmDeleteUser}
      />
      <DiscipleDialog
        isOpen={showDiscipleDialog}
        onOpenChange={setShowDiscipleDialog}
        userName={userToDisciple?.name}
        discipleMessage={discipleMessage}
        setDiscipleMessage={setDiscipleMessage}
        onSubmit={() => {
          if (userToDisciple && discipleMessage.trim()) {
            discipleUserMutation.mutate({
              userId: userToDisciple.id,
              message: discipleMessage.trim(),
            });
          }
        }}
        isSubmitting={discipleUserMutation.isPending}
      />
      {showAuthorizationModal && selectedRequest && (
        <AuthorizationModal
          isOpen={showAuthorizationModal}
          onOpenChange={setShowAuthorizationModal}
          selectedRequest={selectedRequest}
          usersWithDiscipleRequests={usersWithDiscipleRequests}
          adminNotes={adminNotes}
          setAdminNotes={setAdminNotes}
          onReject={() => handleProcessDiscipleRequest('rejected')}
          onApprove={() => handleProcessDiscipleRequest('approved')}
          onRemoveActive={(interestedId) => handleRemoveActiveDisciple(interestedId)}
        />
      )}
    </>
  );

  if (skin === 'v2') {
    const title = user?.role === 'missionary' ? t('users.friends') : t('users.title');
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">Gestão</div>
                  <div className="p7-header-title">{title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  {hasAdminAccess(user) ? (
                    <PrototypeHeaderIconButton
                      icon={UserPlus}
                      onClick={openCreateModal}
                      label="Criar usuário"
                    />
                  ) : null}
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>

            <div className="p7-scroll">
              <div className="p7-section">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div className="p7-stat-card">
                    <div className="p7-stat-num">{users.length}</div>
                    <div className="p7-stat-label">{t('users.title')}</div>
                  </div>
                  <div className="p7-stat-card">
                    <div className="p7-stat-num">{filteredAndSortedUsers.length}</div>
                    <div className="p7-stat-label">Visíveis</div>
                  </div>
                  <div className="p7-stat-card">
                    <div className="p7-stat-num">{pendingCount}</div>
                    <div className="p7-stat-label">Pendentes</div>
                  </div>
                  <div className="p7-stat-card">
                    <div className="p7-stat-num">{usersWithDiscipleRequests.length}</div>
                    <div className="p7-stat-label">Pedidos</div>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <UsersHeader
                    user={user}
                    pendingCount={pendingCount}
                    filteredAndSortedUsers={filteredAndSortedUsers}
                    isRecalculating={isRecalculating}
                    recalculationProgress={recalculationProgress}
                    recalculationMessage={recalculationMessage}
                    onCreateUser={openCreateModal}
                    compact
                  />
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p space-y-4">
                  <UsersStats
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    users={users as UserMember[]}
                    userRole={user?.role}
                  />
                  <UsersMountainStats
                    userRole={user?.role}
                    mountainFilter={mountainFilter}
                    handleMountainClick={handleMountainClick}
                    getUsersCountByMountain={getUsersCountByMountain}
                  />
                  <UsersSituation
                    situationLevels={situationLevels}
                    interestedSituationFilter={interestedSituationFilter}
                    getInterestedSituationCount={getInterestedSituationCount}
                    handleInterestedSituationClick={handleInterestedSituationClick}
                  />
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <UsersFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    churchFilter={churchFilter}
                    setChurchFilter={setChurchFilter}
                    missionaryProfileFilter={missionaryProfileFilter}
                    setMissionaryProfileFilter={setMissionaryProfileFilter}
                    mountainFilter={mountainFilter}
                    handleMountainClick={handleMountainClick}
                    interestedSituationFilter={interestedSituationFilter}
                    handleInterestedSituationClick={handleInterestedSituationClick}
                    churches={churches}
                    situationLevels={situationLevels}
                    getMountainCount={getMountainCount}
                    getInterestedSituationCount={getInterestedSituationCount}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                  />
                </div>
              </div>

              <div className="p7-section pb-4">
                <UsersList
                  userRole={user?.role}
                  mountainFilter={mountainFilter}
                  filteredAndSortedUsers={filteredAndSortedUsers}
                  safeRelationshipsData={safeRelationshipsData}
                  getMountainFilterName={getMountainFilterName}
                  handleMountainClick={handleMountainClick}
                  handleApproveUser={handleApproveUser}
                  handleRejectUser={handleRejectUser}
                  handleEditUser={handleEditUser}
                  handleDeleteUser={handleDeleteUser}
                  handleViewUser={handleViewUser}
                  handleScheduleVisit={handleScheduleVisit}
                  handleDiscipleRequest={handleDiscipleRequest}
                  showActions={hasAdminAccess(user)}
                />
                <UsersEmptyState isVisible={filteredAndSortedUsers.length === 0} />
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
      <div className="p-1 sm:p-4 space-y-2 sm:space-y-4">
        <>
          <UsersHeader
            user={user}
            pendingCount={pendingCount}
            filteredAndSortedUsers={filteredAndSortedUsers}
            isRecalculating={isRecalculating}
            recalculationProgress={recalculationProgress}
            recalculationMessage={recalculationMessage}
            onCreateUser={openCreateModal}
          />

          <UsersStats
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            users={users as UserMember[]}
            userRole={user?.role}
          />

          <UsersMountainStats
            userRole={user?.role}
            mountainFilter={mountainFilter}
            handleMountainClick={handleMountainClick}
            getUsersCountByMountain={getUsersCountByMountain}
          />

          <UsersSituation
            situationLevels={situationLevels}
            interestedSituationFilter={interestedSituationFilter}
            getInterestedSituationCount={getInterestedSituationCount}
            handleInterestedSituationClick={handleInterestedSituationClick}
          />

          <UsersFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            churchFilter={churchFilter}
            setChurchFilter={setChurchFilter}
            missionaryProfileFilter={missionaryProfileFilter}
            setMissionaryProfileFilter={setMissionaryProfileFilter}
            mountainFilter={mountainFilter}
            handleMountainClick={handleMountainClick}
            interestedSituationFilter={interestedSituationFilter}
            handleInterestedSituationClick={handleInterestedSituationClick}
            churches={churches}
            situationLevels={situationLevels}
            getMountainCount={getMountainCount}
            getInterestedSituationCount={getInterestedSituationCount}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />

          <UsersList
            userRole={user?.role}
            mountainFilter={mountainFilter}
            filteredAndSortedUsers={filteredAndSortedUsers}
            safeRelationshipsData={safeRelationshipsData}
            getMountainFilterName={getMountainFilterName}
            handleMountainClick={handleMountainClick}
            handleApproveUser={handleApproveUser}
            handleRejectUser={handleRejectUser}
            handleEditUser={handleEditUser}
            handleDeleteUser={handleDeleteUser}
            handleViewUser={handleViewUser}
            handleScheduleVisit={handleScheduleVisit}
            handleDiscipleRequest={handleDiscipleRequest}
            showActions={hasAdminAccess(user)}
          />

          <UsersEmptyState isVisible={filteredAndSortedUsers.length === 0} />
        </>
        {modals}
      </div>
    </MobileLayout>
  );
}
