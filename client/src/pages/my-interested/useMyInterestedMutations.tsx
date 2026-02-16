import type { Dispatch, SetStateAction } from 'react';
import { useMutation, type QueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import type { DiscipleshipRequest, InterestedPerson } from './myInterestedTypes';
import type { useToast } from '@/hooks/use-toast';
import type { createLogger } from '@/lib/logger';

type Logger = ReturnType<typeof createLogger>;
type ToastFn = ReturnType<typeof useToast>['toast'];

type UseMyInterestedMutationsArgs = {
  userId?: number;
  isAdmin: boolean;
  queryClient: QueryClient;
  toast: ToastFn;
  logger: Logger;
  setShowDiscipleDialog: Dispatch<SetStateAction<boolean>>;
  setSelectedInterested: Dispatch<SetStateAction<InterestedPerson | null>>;
  setDiscipleMessage: Dispatch<SetStateAction<string>>;
  setShowAuthorizationModal: Dispatch<SetStateAction<boolean>>;
  setSelectedRequest: Dispatch<SetStateAction<DiscipleshipRequest | null>>;
  setAdminNotes: Dispatch<SetStateAction<string>>;
  setUpdatingSituation: Dispatch<SetStateAction<number | null>>;
  setShowInviteModal: Dispatch<SetStateAction<boolean>>;
  setInviteInterested: Dispatch<SetStateAction<InterestedPerson | null>>;
  setSelectedMissionaryId: Dispatch<SetStateAction<string>>;
};

export const useMyInterestedMutations = ({
  userId,
  isAdmin,
  queryClient,
  toast,
  logger,
  setShowDiscipleDialog,
  setSelectedInterested,
  setDiscipleMessage,
  setShowAuthorizationModal,
  setSelectedRequest,
  setAdminNotes,
  setUpdatingSituation,
  setShowInviteModal,
  setInviteInterested,
  setSelectedMissionaryId,
}: UseMyInterestedMutationsArgs) => {
  const createDiscipleRequestMutation = useMutation({
    mutationFn: async (data: {
      missionaryId: number;
      interestedId: number;
      status: string;
      notes: string;
      type?: string;
    }) => {
      const response = await fetchWithAuth('/api/discipleship-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao criar solicitação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
      toast({
        title: '✅ Solicitação enviada!',
        description: 'Aguarde a aprovação do administrador.',
      });
      setShowDiscipleDialog(false);
      setSelectedInterested(null);
      setDiscipleMessage('');
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao enviar solicitação',
        description: error.message || 'Não foi possível enviar a solicitação.',
        variant: 'destructive',
      });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
      adminNotes,
    }: {
      requestId: number;
      status: 'approved' | 'rejected';
      adminNotes: string;
    }) => {
      const response = await fetchWithAuth(`/api/discipleship-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          adminNotes,
          processedBy: userId || 1,
        }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar solicitação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      queryClient.invalidateQueries({ queryKey: ['my-interested'] });
      toast({
        title: '✅ Solicitação processada!',
        description: 'A solicitação foi processada com sucesso.',
      });
      setShowAuthorizationModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao processar',
        description: error.message || 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    },
  });

  const updateSituationMutation = useMutation({
    mutationFn: async ({ userId: targetUserId, situation }: { userId: number; situation: string }) => {
      const response = await fetchWithAuth(`/api/users/${targetUserId}`, {
        method: 'PUT',
        body: JSON.stringify({ interestedSituation: situation }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Erro PUT situação:', response.status, errorText);
        throw new Error(`Erro ao atualizar situação: ${response.status}`);
      }
      const data = await response.json();
      return {
        ...data,
        _confirmedSituation:
          data?.user?.interestedSituation || data?.user?.interested_situation || situation,
      };
    },
    onMutate: async ({ userId: targetUserId, situation }) => {
      await queryClient.cancelQueries({ queryKey: ['church-interested'] });
      await queryClient.cancelQueries({ queryKey: ['all-users'] });

      const previousChurch = queryClient.getQueryData(['church-interested', userId]);
      const previousAll = queryClient.getQueryData(['all-users', userId, isAdmin]);

      const updateFn = (old: InterestedPerson[] | undefined) => {
        if (!old) return old;
        return old.map((person) =>
          person.id === targetUserId
            ? { ...person, interestedSituation: situation, interested_situation: situation }
            : person
        );
      };

      queryClient.setQueryData(['church-interested', userId], updateFn);
      queryClient.setQueryData(['all-users', userId, isAdmin], updateFn);

      return { previousChurch, previousAll };
    },
    onSuccess: (data, variables) => {
      const confirmedSituation = data._confirmedSituation;
      const updateFn = (old: InterestedPerson[] | undefined) => {
        if (!old) return old;
        return old.map((person) =>
          person.id === variables.userId
            ? {
                ...person,
                interestedSituation: confirmedSituation,
                interested_situation: confirmedSituation,
              }
            : person
        );
      };

      queryClient.setQueryData(['church-interested', userId], updateFn);
      queryClient.setQueryData(['all-users', userId, isAdmin], updateFn);
      queryClient.invalidateQueries({ queryKey: ['/api/users'], refetchType: 'none' });

      setUpdatingSituation(null);
      toast({
        title: '✅ Situação atualizada!',
        description: 'A situação do amigo foi atualizada com sucesso.',
      });
    },
    onError: (error: Error, _variables, context) => {
      logger.error('Erro ao atualizar situação:', error);
      if (context?.previousChurch) {
        queryClient.setQueryData(['church-interested', userId], context.previousChurch);
      }
      if (context?.previousAll) {
        queryClient.setQueryData(['all-users', userId, isAdmin], context.previousAll);
      }
      setUpdatingSituation(null);
      toast({
        title: '❌ Erro ao atualizar situação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const directDiscipleMutation = useMutation({
    mutationFn: async ({
      interestedId,
      missionaryId,
    }: {
      interestedId: number;
      missionaryId: number;
    }) => {
      const response = await fetchWithAuth(`/api/users/${interestedId}/disciple`, {
        method: 'POST',
        body: JSON.stringify({ missionaryId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao vincular discipulador');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      toast({
        title: '✅ Discipulador vinculado!',
        description: 'O discipulador foi vinculado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao vincular',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pastorInviteMutation = useMutation({
    mutationFn: async ({
      interestedId,
      missionaryId,
    }: {
      interestedId: number;
      missionaryId: number;
    }) => {
      const response = await fetchWithAuth('/api/discipleship-requests', {
        method: 'POST',
        body: JSON.stringify({
          interestedId,
          missionaryId,
          type: 'pastor-invite',
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao enviar convite');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      setShowInviteModal(false);
      setInviteInterested(null);
      setSelectedMissionaryId('');
      toast({
        title: '✅ Convite enviado!',
        description: 'O membro receberá o convite para discipular.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao enviar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createDiscipleRequestMutation,
    updateRequestMutation,
    updateSituationMutation,
    directDiscipleMutation,
    pastorInviteMutation,
  };
};
