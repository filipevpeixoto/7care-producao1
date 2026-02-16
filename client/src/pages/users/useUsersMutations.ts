import { useMutation, type QueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import type { User as UserType } from '@shared/schema';

type UseUsersMutationsProps = {
  queryClient: QueryClient;
  toast: (args: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => void;
  setShowCreateModal: (value: boolean) => void;
  setShowDeleteDialog: (value: boolean) => void;
  setUserToDelete: (value: UserType | null) => void;
  setShowDiscipleDialog: (value: boolean) => void;
  setUserToDisciple: (value: UserType | null) => void;
  setDiscipleMessage: (value: string) => void;
};

export const useUsersMutations = ({
  queryClient,
  toast,
  setShowCreateModal,
  setShowDeleteDialog,
  setUserToDelete,
  setShowDiscipleDialog,
  setUserToDisciple,
  setDiscipleMessage,
}: UseUsersMutationsProps) => {
  const invalidateUserCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users/with-points'] });
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
    queryClient.invalidateQueries({ queryKey: ['church-interested'] });
  };

  const approveUserMutation = useMutation({
    mutationFn: (userId: number) =>
      fetchWithAuth(`/api/users/${userId}/approve`, { method: 'POST' }).then((res) => res.json()),
    onSuccess: () => {
      invalidateUserCaches();
      window.dispatchEvent(new CustomEvent('user-approved'));
      toast({ title: 'Usuário aprovado', description: 'O usuário foi aprovado com sucesso.' });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: (userId: number) =>
      fetchWithAuth(`/api/users/${userId}/reject`, { method: 'POST' }).then((res) => res.json()),
    onSuccess: () => {
      invalidateUserCaches();
      window.dispatchEvent(new CustomEvent('user-rejected'));
      toast({ title: 'Usuário rejeitado', description: 'O usuário foi rejeitado.', variant: 'destructive' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: Partial<UserType> }) =>
      fetchWithAuth(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    onSuccess: () => {
      invalidateUserCaches();
      window.dispatchEvent(new CustomEvent('user-updated'));
      toast({
        title: 'Usuário atualizado',
        description: 'As informações do usuário foram atualizadas com sucesso.',
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      role: string;
      phone?: string;
      church?: string;
      password?: string;
    }) => {
      const response = await fetchWithAuth('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Erro ao criar usuário');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateUserCaches();
      toast({ title: '✅ Usuário criado', description: 'O usuário foi criado com sucesso.' });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      toast({
        title: '❌ Erro ao criar usuário',
        description: error instanceof Error ? error.message : 'Não foi possível criar o usuário.',
        variant: 'destructive',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetchWithAuth(`/api/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      invalidateUserCaches();
      toast({ title: '✅ Usuário excluído', description: 'Usuário excluído com sucesso!' });
      setShowDeleteDialog(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao excluir usuário',
        description: error.message || 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      });
    },
  });

  const discipleUserMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: number; message: string }) => {
      const response = await fetchWithAuth(`/api/users/${userId}/disciple`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disciple user');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateUserCaches();
      toast({ title: '✅ Solicitação enviada', description: 'Solicitação de discipulado enviada com sucesso!' });
      setShowDiscipleDialog(false);
      setUserToDisciple(null);
      setDiscipleMessage('');
    },
    onError: (error: unknown) => {
      toast({
        title: '❌ Erro ao solicitar discipulado',
        description: error instanceof Error ? error.message : 'Não foi possível enviar a solicitação.',
        variant: 'destructive',
      });
    },
  });

  return {
    approveUserMutation,
    rejectUserMutation,
    updateUserMutation,
    createUserMutation,
    deleteUserMutation,
    discipleUserMutation,
  };
};
