import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import type { QueryClient } from '@tanstack/react-query';
import type { User as UserType, DiscipleshipRequest } from '@shared/schema';
import type { DiscipleshipRequestWithAdminNotes } from './usersTypes';
import type { AuthUser } from '@/../../shared/types/user';

const usersLogger = createLogger('Users');

type CreateFormData = {
  name: string;
  email: string;
  phone: string;
  church: string;
  role: string;
  password: string;
};

type CreateUserPayload = {
  name: string;
  email: string;
  role: string;
  phone?: string;
  church?: string;
  password?: string;
};

type MutationHandler<T> = {
  mutate: (variables: T) => void;
};

type UseUsersHandlersProps = {
  user: AuthUser | null | undefined;
  createFormData: CreateFormData;
  setCreateFormData: Dispatch<SetStateAction<CreateFormData>>;
  setShowCreateModal: Dispatch<SetStateAction<boolean>>;
  setShowDeleteDialog: Dispatch<SetStateAction<boolean>>;
  setUserToDelete: Dispatch<SetStateAction<UserType | null>>;
  setShowDiscipleDialog: Dispatch<SetStateAction<boolean>>;
  setUserToDisciple: Dispatch<SetStateAction<UserType | null>>;
  setDiscipleMessage: Dispatch<SetStateAction<string>>;
  userToDelete: UserType | null;
  userToDisciple: UserType | null;
  discipleMessage: string;
  setSelectedUser: Dispatch<SetStateAction<UserType | null>>;
  setShowEditModal: Dispatch<SetStateAction<boolean>>;
  setShowUserModal: Dispatch<SetStateAction<boolean>>;
  setShowScheduleModal: Dispatch<SetStateAction<boolean>>;
  setShowAuthorizationModal: Dispatch<SetStateAction<boolean>>;
  setSelectedRequest: Dispatch<SetStateAction<DiscipleshipRequest | null>>;
  setAdminNotes: Dispatch<SetStateAction<string>>;
  selectedRequest: DiscipleshipRequest | null;
  adminNotes: string;
  discipleshipRequests: DiscipleshipRequestWithAdminNotes[];
  queryClient: QueryClient;
  toast: (args: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => void;
  approveUserMutation: MutationHandler<number>;
  rejectUserMutation: MutationHandler<number>;
  updateUserMutation: MutationHandler<{ userId: number; data: Partial<UserType> }>;
  createUserMutation: MutationHandler<CreateUserPayload>;
  deleteUserMutation: MutationHandler<number>;
  discipleUserMutation: MutationHandler<{ userId: number; message: string }>;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  setRoleFilter: Dispatch<SetStateAction<string>>;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  setChurchFilter: Dispatch<SetStateAction<string>>;
  setMountainFilter: Dispatch<SetStateAction<string>>;
  setInterestedSituationFilter: Dispatch<SetStateAction<string>>;
  setMissionaryProfileFilter: Dispatch<SetStateAction<string>>;
};

export const useUsersHandlers = ({
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
}: UseUsersHandlersProps) => {
  const handleMountainClick = (mountainKey: string) => {
    setMountainFilter(mountainKey);
    if (mountainKey !== 'all') {
      setSearchTerm('');
      setRoleFilter('all');
      setStatusFilter('all');
      setChurchFilter('all');
      setMissionaryProfileFilter('all');
      setInterestedSituationFilter('all');
    }
  };

  const handleInterestedSituationClick = (situationKey: string) => {
    setInterestedSituationFilter(situationKey);
    if (situationKey !== 'all') {
      setSearchTerm('');
      setRoleFilter('all');
      setStatusFilter('all');
      setChurchFilter('all');
      setMissionaryProfileFilter('all');
      setMountainFilter('all');
    }
  };

  const handleApproveUser = (userId: number) => approveUserMutation.mutate(userId);
  const handleRejectUser = (userId: number) => rejectUserMutation.mutate(userId);

  const handleUpdateUser = (userId: number, data: Partial<UserType>) => {
    updateUserMutation.mutate({ userId, data });
    setSelectedUser((prev: UserType | null) => (prev ? { ...prev, ...data } : null));
  };

  const openCreateModal = () => {
    const defaultRole = 'member';
    setCreateFormData({
      name: '',
      email: '',
      phone: '',
      church: user?.church || '',
      role: defaultRole,
      password: '',
    });
    setShowCreateModal(true);
  };

  const handleCreateFormChange = (field: string, value: string) => {
    setCreateFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateUserSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: CreateUserPayload = {
      name: createFormData.name.trim(),
      email: createFormData.email.trim(),
      role: createFormData.role,
    };
    const phone = createFormData.phone.trim();
    const church = createFormData.church.trim();
    const password = createFormData.password.trim();
    if (phone) payload.phone = phone;
    if (church) payload.church = church;
    if (password) payload.password = password;
    createUserMutation.mutate(payload);
  };

  const handleDeleteUser = (u: UserType) => {
    setUserToDelete(u);
    setShowDeleteDialog(true);
  };

  const handleDiscipleRequest = (u: UserType) => {
    const request = discipleshipRequests.find(
      (req: DiscipleshipRequest) => req.interestedId === u.id && req.status === 'pending'
    );
    if (request) {
      setSelectedRequest(request);
      setAdminNotes(request.notes || '');
      setShowAuthorizationModal(true);
    }
  };

  const handleProcessDiscipleRequest = async (
    status: 'approved' | 'rejected',
    event?: FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();
    if (!selectedRequest) return;

    try {
      const response = await fetchWithAuth(`/api/discipleship-requests/${selectedRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes: adminNotes.trim() }),
      });
      if (!response.ok) throw new Error('Erro ao processar solicitação');

      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      queryClient.invalidateQueries({ queryKey: ['my-interested'] });

      setShowAuthorizationModal(false);
      setSelectedRequest(null);
      setAdminNotes('');

      toast({
        title: '✅ Solicitação processada!',
        description: `A solicitação foi ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });
    } catch (error: unknown) {
      toast({
        title: '❌ Erro ao processar',
        description: error instanceof Error ? error.message : 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveActiveDisciple = async (interestedId: number) => {
    try {
      const allApprovedRequests = discipleshipRequests.filter(
        (req: DiscipleshipRequest) => req.interestedId === interestedId && req.status === 'approved'
      );

      for (const request of allApprovedRequests) {
        const rejectResponse = await fetchWithAuth(`/api/discipleship-requests/${request.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'rejected',
            notes: 'Discipulado desvinculado pelo administrador - solicitação rejeitada automaticamente',
          }),
        });
        if (!rejectResponse.ok) {
          usersLogger.error(`Erro ao rejeitar solicitação ${request.id}:`, await rejectResponse.text());
        }
      }

      const response = await fetchWithAuth(`/api/relationships/active/${interestedId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao remover discipulado');

      const cacheKeys = [
        'discipleship-requests',
        'all-discipleship-requests',
        'relationships',
        'all-relationships',
        'users',
        'my-interested',
        'user-relationships',
      ];
      cacheKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

      const criticalKeys = [
        'discipleship-requests',
        'all-discipleship-requests',
        'relationships',
        'all-relationships',
      ];
      criticalKeys.forEach((key) => queryClient.refetchQueries({ queryKey: [key] }));

      await new Promise((resolve) => setTimeout(resolve, 500));
      cacheKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

      toast({
        title: '✅ Discipulado removido!',
        description: `O relacionamento foi removido e ${allApprovedRequests.length} solicitações foram rejeitadas automaticamente.`,
      });
    } catch (error: unknown) {
      usersLogger.error('Erro ao remover discipulado:', error);
      toast({
        title: '❌ Erro ao remover',
        description: error instanceof Error ? error.message : 'Não foi possível remover o discipulado.',
        variant: 'destructive',
      });
    }
  };

  const confirmDeleteUser = () => {
    if (userToDelete) deleteUserMutation.mutate(userToDelete.id);
  };

  const handleEditUser = (u: UserType) => {
    setSelectedUser(u);
    setShowEditModal(true);
  };

  const handleViewUser = (u: UserType) => {
    setSelectedUser(u);
    setShowUserModal(true);
  };

  const handleScheduleVisit = (u: UserType) => {
    setSelectedUser(u);
    setShowScheduleModal(true);
  };

  const handleDiscipleUser = (u: UserType) => {
    setUserToDisciple(u);
    setShowDiscipleDialog(true);
  };

  const handleDiscipleMessageChange = (value: string) => {
    setDiscipleMessage(value);
  };

  const handleSubmitDiscipleRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userToDisciple) return;
    if (!discipleMessage.trim()) {
      toast({
        title: 'Mensagem obrigatória',
        description: 'Digite uma mensagem para o pedido de discipulado.',
        variant: 'destructive',
      });
      return;
    }
    discipleUserMutation.mutate({ userId: userToDisciple.id, message: discipleMessage });
  };

  return {
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
    handleDiscipleUser,
    handleDiscipleMessageChange,
    handleSubmitDiscipleRequest,
  };
};
