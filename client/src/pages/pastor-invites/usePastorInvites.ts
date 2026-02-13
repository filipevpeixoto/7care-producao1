import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type PastorInvite } from '@/types/pastor-invite';
import { fetchWithAuth } from '@/lib/api';

export function usePastorInvites(userId: number | undefined, isSuperAdmin: boolean) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invites = [], isLoading } = useQuery<PastorInvite[]>({
    queryKey: ['/api/invites', userId],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/invites');
      if (!response.ok) throw new Error('Erro ao buscar convites');
      return response.json();
    },
    enabled: !!userId && isSuperAdmin,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const createMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetchWithAuth('/api/invites', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar convite');
      }
      return response.json();
    },
    onSuccess: (data, email) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });

      const emailMessage = data.emailSent
        ? `📧 Email de convite enviado automaticamente para ${email}!`
        : `⚠️ Email não enviado (copie o link e envie manualmente para ${email}).`;

      toast({
        title: data.emailSent ? '✅ Convite criado e enviado!' : 'Convite criado',
        description: emailMessage,
        duration: 5000,
      });

      navigator.clipboard.writeText(data.link);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o convite.',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetchWithAuth(`/api/invites/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao rejeitar convite');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });
      toast({
        title: 'Convite rejeitado',
        description: 'O convite foi rejeitado e o pastor foi notificado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível rejeitar o convite.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetchWithAuth(`/api/invites/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar convite');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });
      toast({
        title: 'Convite excluído',
        description: 'O convite foi excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o convite.',
        variant: 'destructive',
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithAuth('/api/invites/all', {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar convites');
      }
      return response.json();
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });
      toast({
        title: 'Convites excluídos',
        description: `${data.deletedCount} convites foram excluídos com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir os convites.',
        variant: 'destructive',
      });
    },
  });

  return {
    invites,
    isLoading,
    createMutation,
    rejectMutation,
    deleteMutation,
    deleteAllMutation,
  };
}
