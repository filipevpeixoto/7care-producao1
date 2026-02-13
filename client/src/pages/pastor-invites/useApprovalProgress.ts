import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type PastorInvite } from '@/types/pastor-invite';
import { fetchWithAuth } from '@/lib/api';

export interface ApprovalProgress {
  step: string;
  progress: number;
  details: string;
  isComplete: boolean;
  isError: boolean;
  result?: {
    districtId?: number;
    churchesCreated?: number;
    membersImported?: number;
    membersUpdated?: number;
    membersPending?: number;
    importDeferred?: boolean;
  };
}

export function useApprovalProgress(selectedInvite: PastorInvite | null) {
  const queryClient = useQueryClient();
  const [approvalProgress, setApprovalProgress] = useState<ApprovalProgress>({
    step: '',
    progress: 0,
    details: '',
    isComplete: false,
    isError: false,
  });

  const importRemainingMembers = async (inviteId: number, startFrom: number) => {
    let currentStart = startFrom;
    let totalImported = startFrom;
    let hasMore = true;

    while (hasMore) {
      try {
        setApprovalProgress(prev => ({
          ...prev,
          step: 'Importando membros restantes...',
          details: `Processando lote a partir do membro ${currentStart}...`,
        }));

        const response = await fetchWithAuth(`/api/invites/${inviteId}/import-remaining`, {
          method: 'POST',
          body: JSON.stringify({ startFrom: currentStart, limit: 50 }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          totalImported += result.membersImported;
          hasMore = result.hasMore;
          currentStart = result.nextStartFrom || currentStart + 50;

          setApprovalProgress(prev => ({
            ...prev,
            details: `${totalImported} membros importados de ${result.totalMembers}...`,
            result: {
              ...prev.result,
              membersImported: totalImported,
              membersPending: result.hasMore ? result.totalMembers - totalImported : 0,
            },
          }));

          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.error('Erro ao importar lote:', result);
          hasMore = false;
        }
      } catch (error) {
        console.error('Erro na importação em lote:', error);
        hasMore = false;
      }
    }

    setApprovalProgress(prev => ({
      ...prev,
      step: 'Importação concluída!',
      details: `Todos os ${totalImported} membros foram importados com sucesso.`,
      result: {
        ...prev.result,
        membersImported: totalImported,
        membersPending: 0,
        importDeferred: false,
      },
    }));

    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
  };

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      setApprovalProgress({
        step: 'Iniciando aprovação...',
        progress: 5,
        details: 'Conectando ao servidor...',
        isComplete: false,
        isError: false,
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      setApprovalProgress(prev => ({
        ...prev,
        step: 'Validando dados do convite...',
        progress: 15,
        details: 'Verificando informações do pastor...',
      }));

      await new Promise(resolve => setTimeout(resolve, 300));
      setApprovalProgress(prev => ({
        ...prev,
        step: 'Criando distrito...',
        progress: 25,
        details: selectedInvite?.onboardingData?.district?.name || 'Processando distrito...',
      }));

      await new Promise(resolve => setTimeout(resolve, 200));
      setApprovalProgress(prev => ({
        ...prev,
        step: 'Criando igrejas...',
        progress: 40,
        details: `${selectedInvite?.onboardingData?.churches?.length || 0} igreja(s) a serem cadastradas...`,
      }));

      await new Promise(resolve => setTimeout(resolve, 200));
      const membersCount = selectedInvite?.onboardingData?.excelData?.data?.length || 0;
      setApprovalProgress(prev => ({
        ...prev,
        step: 'Importando membros...',
        progress: 60,
        details:
          membersCount > 0
            ? `Processando ${membersCount} membros da planilha...`
            : 'Nenhum membro para importar',
      }));

      const response = await fetchWithAuth(`/api/invites/${id}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.details
          ? `${result.error}: ${result.details}`
          : result.error || 'Erro ao aprovar convite';
        throw new Error(errorMessage);
      }

      setApprovalProgress(prev => ({
        ...prev,
        step: 'Ativando pastor...',
        progress: 90,
        details: 'Finalizando cadastro...',
      }));

      await new Promise(resolve => setTimeout(resolve, 300));

      return result;
    },
    onSuccess: data => {
      setApprovalProgress({
        step: 'Aprovação concluída!',
        progress: 100,
        details: data.details?.importDeferred
          ? `${data.details.membersImported} membros importados. ${data.details.membersPending} serão importados em lotes.`
          : 'O pastor foi cadastrado com sucesso no sistema.',
        isComplete: true,
        isError: false,
        result: data.details,
      });

      if (data.details?.importDeferred && selectedInvite) {
        importRemainingMembers(selectedInvite.id, data.details.membersImported);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pastors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      setApprovalProgress(prev => ({
        ...prev,
        step: 'Erro na aprovação',
        progress: 0,
        details: error.message || 'Não foi possível aprovar o convite.',
        isComplete: false,
        isError: true,
      }));
    },
  });

  return {
    approvalProgress,
    setApprovalProgress,
    approveMutation,
  };
}
