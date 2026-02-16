/**
 * useUsersState — Custom hook for Users page
 *
 * Extracted from Users.tsx (2086 lines) to separate:
 * - State management (24 useState)
 * - Data fetching (5 useQuery, 6 useMutation)
 * - Business logic (filtering, sorting, mountain calculation)
 * - Handlers (21 functions)
 *
 * The Users component keeps only imports + hook call + JSX rendering.
 */
import { useState, useDeferredValue } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useToast } from '@/hooks/use-toast';
import { useSituationLevels } from '@/hooks/useSituationLevels';
import type { User as UserType, DiscipleshipRequest } from '@shared/schema';
import { useUsersQueries } from './useUsersQueries';
import { useUsersMutations } from './useUsersMutations';
import { useUsersDerived } from './useUsersDerived';
import { useUsersHandlers } from './useUsersHandlers';
import { useUsersEffects } from './useUsersEffects';

// ── Hook ────────────────────────────────────────────────────────

export function useUsersState() {
  const { user, isLoading: authLoading } = useAuth();
  useUserPoints();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { levels: situationLevels } = useSituationLevels();

  // Flag para verificar se auth está pronto
  const isAuthReady = !authLoading && !!user?.id;

  // ── State ───────────────────────────────────────────────────

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [churchFilter, setChurchFilter] = useState('all');
  const [mountainFilter, setMountainFilter] = useState('all');
  const [interestedSituationFilter, setInterestedSituationFilter] = useState('all');
  const [missionaryProfileFilter, setMissionaryProfileFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [showDiscipleDialog, setShowDiscipleDialog] = useState(false);
  const [userToDisciple, setUserToDisciple] = useState<UserType | null>(null);
  const [discipleMessage, setDiscipleMessage] = useState('');

  // Estados para autorização de discipulado
  const [showAuthorizationModal, setShowAuthorizationModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscipleshipRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    phone: '',
    church: '',
    role: 'member',
    password: '',
  });

  // Estados para progresso de recálculo
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculationProgress, setRecalculationProgress] = useState(0);
  const [recalculationMessage, setRecalculationMessage] = useState('');

  // ── Queries ─────────────────────────────────────────────────

  const {
    users,
    isLoading,
    error,
    churches,
    safeRelationshipsData,
    discipleshipRequests,
  } = useUsersQueries(user, isAuthReady);

  const {
    approveUserMutation,
    rejectUserMutation,
    updateUserMutation,
    createUserMutation,
    deleteUserMutation,
    discipleUserMutation,
  } = useUsersMutations({
    queryClient,
    toast,
    setShowCreateModal,
    setShowDeleteDialog,
    setUserToDelete,
    setShowDiscipleDialog,
    setUserToDisciple,
    setDiscipleMessage,
  });

  const {
    usersWithDiscipleRequests,
    filteredAndSortedUsers,
    getMountainFilterName,
    getMountainCount,
    getInterestedSituationCount,
    getUsersCountByMountain,
    pendingCount,
  } = useUsersDerived({
    users,
    discipleshipRequests,
    safeRelationshipsData,
    user,
    searchTerm: deferredSearchTerm,
    roleFilter,
    statusFilter,
    churchFilter,
    mountainFilter,
    interestedSituationFilter,
    missionaryProfileFilter,
    sortBy,
    sortOrder,
  });

  const {
    handleMountainClick,
    handleInterestedSituationClick,
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
  } = useUsersHandlers({
    user,
    createFormData,
    setCreateFormData,
    setShowCreateModal,
    setShowDeleteDialog,
    setUserToDelete,
    setShowDiscipleDialog,
    setUserToDisciple,
    setDiscipleMessage,
    userToDelete,
    userToDisciple,
    discipleMessage,
    setSelectedUser,
    setShowEditModal,
    setShowUserModal,
    setShowScheduleModal,
    setShowAuthorizationModal,
    setSelectedRequest,
    setAdminNotes,
    selectedRequest,
    adminNotes,
    discipleshipRequests,
    queryClient,
    toast,
    approveUserMutation,
    rejectUserMutation,
    updateUserMutation,
    createUserMutation,
    deleteUserMutation,
    discipleUserMutation,
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,
    setChurchFilter,
    setMountainFilter,
    setInterestedSituationFilter,
    setMissionaryProfileFilter,
  });

  useUsersEffects({
    isRecalculating,
    setIsRecalculating,
    setRecalculationProgress,
    setRecalculationMessage,
    queryClient,
    toast,
  });

  // ── Return ──────────────────────────────────────────────────

  return {
    // Auth
    user,
    isAuthReady,

    // Loading / Error
    isLoading,
    error,

    // Data
    users,
    churches,
    discipleshipRequests,
    safeRelationshipsData,
    usersWithDiscipleRequests,
    filteredAndSortedUsers,
    situationLevels,
    pendingCount,

    // Filter state
    searchTerm, setSearchTerm,
    roleFilter, setRoleFilter,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    churchFilter, setChurchFilter,
    mountainFilter, setMountainFilter,
    interestedSituationFilter, setInterestedSituationFilter,
    missionaryProfileFilter, setMissionaryProfileFilter,

    // UI state
    selectedUser, setSelectedUser,
    showUserModal, setShowUserModal,
    showEditModal, setShowEditModal,
    showCreateModal, setShowCreateModal,
    showScheduleModal, setShowScheduleModal,
    showDeleteDialog, setShowDeleteDialog,
    userToDelete, setUserToDelete,
    showDiscipleDialog, setShowDiscipleDialog,
    userToDisciple, setUserToDisciple,
    discipleMessage, setDiscipleMessage,
    showAuthorizationModal, setShowAuthorizationModal,
    selectedRequest, setSelectedRequest,
    adminNotes, setAdminNotes,
    createFormData, setCreateFormData,

    // Recalculation state
    isRecalculating,
    recalculationProgress,
    recalculationMessage,

    // Mountain helpers
    handleMountainClick,
    handleInterestedSituationClick,
    getMountainFilterName,
    getMountainCount,
    getInterestedSituationCount,
    getUsersCountByMountain,

    // Handlers
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

    // Mutations (for loading states)
    approveUserMutation,
    rejectUserMutation,
    updateUserMutation,
    createUserMutation,
    deleteUserMutation,
    discipleUserMutation,

    // Query client
    queryClient,
    toast,
  };
}
