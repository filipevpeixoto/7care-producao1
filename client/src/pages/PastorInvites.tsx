/**
 * Página de Gerenciamento de Convites de Pastores
 * Permite superadmin criar convites, visualizar pendentes e aprovar/rejeitar
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Plus,
  Check,
  X,
  Clock,
  Search,
  Eye,
  Copy,
  Send,
  UserPlus,
  Building2,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { isSuperAdmin } from '@/lib/permissions';
import { PastorInvite, InviteStatus } from '@/types/pastor-invite';
import { fetchWithAuth } from '@/lib/api';

export default function PastorInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('submitted');

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<PastorInvite | null>(null);

  // Form data
  const [newEmail, setNewEmail] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Progress dialog for approval
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [approvalProgress, setApprovalProgress] = useState<{
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
  }>({
    step: '',
    progress: 0,
    details: '',
    isComplete: false,
    isError: false,
  });

  // Função para importar membros restantes em lotes
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

          // Pequena pausa entre lotes
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

    // Atualizar para conclusão final
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

  // Buscar convites
  const { data: invites = [], isLoading } = useQuery<PastorInvite[]>({
    queryKey: ['/api/invites'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/invites');
      if (!response.ok) throw new Error('Erro ao buscar convites');
      return response.json();
    },
    enabled: isSuperAdmin(user),
  });

  // Criar convite
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
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });

      // Mensagem baseada no status do email
      const emailMessage = data.emailSent
        ? `📧 Email de convite enviado automaticamente para ${newEmail}!`
        : `⚠️ Email não enviado (copie o link e envie manualmente para ${newEmail}).`;

      toast({
        title: data.emailSent ? '✅ Convite criado e enviado!' : 'Convite criado',
        description: emailMessage,
        duration: 5000,
      });

      // Copiar link para clipboard
      navigator.clipboard.writeText(data.link);

      setIsCreateDialogOpen(false);
      setNewEmail('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o convite.',
        variant: 'destructive',
      });
    },
  });

  // Aprovar convite com progresso visual
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      // Abrir modal de progresso
      setIsProgressDialogOpen(true);
      setApprovalProgress({
        step: 'Iniciando aprovação...',
        progress: 5,
        details: 'Conectando ao servidor...',
        isComplete: false,
        isError: false,
      });

      // Simular passos iniciais para feedback visual
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

      // Fazer a requisição real
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

      // Atualizar para conclusão
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
      // Mostrar resultado final
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

      // Se há membros pendentes, iniciar importação automática em lotes
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

  // Rejeitar convite
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
      setIsRejectDialogOpen(false);
      setIsDetailsDialogOpen(false);
      setSelectedInvite(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível rejeitar o convite.',
        variant: 'destructive',
      });
    },
  });

  // Deletar convite individual
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
      setIsDeleteDialogOpen(false);
      setSelectedInvite(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o convite.',
        variant: 'destructive',
      });
    },
  });

  // Deletar todos os convites
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
      setIsDeleteAllDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir os convites.',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!newEmail.trim()) return;
    createMutation.mutate(newEmail.trim());
  };

  const handleViewDetails = (invite: PastorInvite) => {
    setSelectedInvite(invite);
    setIsDetailsDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedInvite) {
      approveMutation.mutate(selectedInvite.id);
    }
  };

  const handleReject = () => {
    if (selectedInvite && rejectionReason.trim()) {
      rejectMutation.mutate({ id: selectedInvite.id, reason: rejectionReason.trim() });
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteLink = `${window.location.origin}/convite-pastor.html?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Link copiado',
      description: 'O link de convite foi copiado para a área de transferência.',
    });
  };

  const getStatusBadge = (status: InviteStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'submitted':
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
          >
            <Send className="w-3 h-3 mr-1" />
            Enviado
          </Badge>
        );
      case 'approved':
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtrar convites
  const filteredInvites = invites.filter(invite => {
    const matchesSearch =
      invite.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.onboardingData?.personal?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.onboardingData?.district?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'all' || invite.status === activeTab;

    return matchesSearch && matchesTab;
  });

  // Contadores
  const pendingCount = invites.filter(i => i.status === 'pending').length;
  const submittedCount = invites.filter(i => i.status === 'submitted').length;
  const approvedCount = invites.filter(i => i.status === 'approved').length;
  const rejectedCount = invites.filter(i => i.status === 'rejected').length;

  if (!isSuperAdmin(user)) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas superadmin pode gerenciar convites de pastores.
          </p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Convites de Pastores</h1>
            <p className="text-muted-foreground text-sm">Gerencie convites e aprove cadastros</p>
          </div>
          <div className="flex gap-2">
            {invites.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsDeleteAllDialogOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Todos
              </Button>
            )}
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Convite
            </Button>
          </div>
        </div>

        {/* Resumo em Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3 text-center">
              <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-yellow-900">{pendingCount}</p>
              <p className="text-xs text-yellow-700">Aguardando</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 text-center">
              <Send className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-blue-900">{submittedCount}</p>
              <p className="text-xs text-blue-700">Para Revisar</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-900">{approvedCount}</p>
              <p className="text-xs text-green-700">Aprovados</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3 text-center">
              <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-900">{rejectedCount}</p>
              <p className="text-xs text-red-700">Rejeitados</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca e Filtros */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, nome ou distrito..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs de Status */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="submitted">Enviados</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Lista de Convites */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredInvites.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum convite encontrado</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm
                  ? 'Tente ajustar sua busca'
                  : 'Crie um novo convite para convidar pastores'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvites.map(invite => (
              <Card key={invite.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(invite.status)}
                        {invite.status === 'pending' && new Date(invite.expiresAt) < new Date() && (
                          <Badge variant="destructive" className="text-xs">
                            Expirado
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{invite.email}</span>
                      </div>

                      {invite.onboardingData?.personal?.name && (
                        <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                          <UserPlus className="w-4 h-4" />
                          <span>{invite.onboardingData.personal.name}</span>
                        </div>
                      )}

                      {invite.onboardingData?.district?.name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>{invite.onboardingData.district.name}</span>
                          {invite.onboardingData.churches && (
                            <span className="text-xs">
                              ({invite.onboardingData.churches.length} igrejas)
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Criado em {formatDate(invite.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {invite.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(invite.token)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedInvite(invite);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {invite.status === 'submitted' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(invite)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedInvite(invite);
                              approveMutation.mutate(invite.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedInvite(invite);
                              setIsRejectDialogOpen(true);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedInvite(invite);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {(invite.status === 'approved' || invite.status === 'rejected') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(invite)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedInvite(invite);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Criar Convite */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Convite de Pastor</DialogTitle>
            <DialogDescription>
              Insira o email do pastor que deseja convidar. Um link único será gerado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email do Pastor</Label>
              <Input
                id="email"
                type="email"
                placeholder="pastor@exemplo.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newEmail.trim() || createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Criar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Convite */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do Cadastro</DialogTitle>
            <DialogDescription>Revise as informações enviadas pelo pastor</DialogDescription>
          </DialogHeader>

          {selectedInvite && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedInvite.status)}
                  <span className="text-sm text-muted-foreground">
                    Enviado em {formatDate(selectedInvite.submittedAt || selectedInvite.createdAt)}
                  </span>
                </div>

                <Separator />

                {/* Dados Pessoais */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">
                        {selectedInvite.onboardingData?.personal?.name || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedInvite.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telefone</p>
                      <p className="font-medium">
                        {selectedInvite.onboardingData?.personal?.phone || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Distrito */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Distrito
                  </h3>
                  <div className="text-sm">
                    <div className="mb-2">
                      <p className="text-muted-foreground">Nome do Distrito</p>
                      <p className="font-medium">
                        {selectedInvite.onboardingData?.district?.name || '-'}
                      </p>
                    </div>
                    {selectedInvite.onboardingData?.district?.description && (
                      <div>
                        <p className="text-muted-foreground">Descrição</p>
                        <p>{selectedInvite.onboardingData.district.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Igrejas */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Igrejas ({selectedInvite.onboardingData?.churches?.length || 0})
                  </h3>
                  {selectedInvite.onboardingData?.churches &&
                  selectedInvite.onboardingData.churches.length > 0 ? (
                    <div className="space-y-2">
                      {selectedInvite.onboardingData.churches.map((church, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <p className="font-medium">{church.name}</p>
                          {church.address && (
                            <p className="text-sm text-muted-foreground">{church.address}</p>
                          )}
                          {church.isNew && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Nova igreja
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma igreja cadastrada</p>
                  )}
                </div>

                {/* Membros Importados */}
                {selectedInvite.onboardingData?.excelData && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Membros Importados
                      </h3>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">
                          {selectedInvite.onboardingData.excelData.fileName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedInvite.onboardingData.excelData.totalRows} membros
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Motivo da Rejeição (se rejeitado) */}
                {selectedInvite.status === 'rejected' && selectedInvite.rejectionReason && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        Motivo da Rejeição
                      </h3>
                      <p className="text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                        {selectedInvite.rejectionReason}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="mt-4">
            {selectedInvite?.status === 'submitted' && (
              <>
                <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)}>
                  <X className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Aprovar
                </Button>
              </>
            )}
            {(selectedInvite?.status === 'approved' || selectedInvite?.status === 'rejected') && (
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rejeitar Convite */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Cadastro</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O pastor será notificado por email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Motivo da Rejeição</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Dados incompletos, distrito já existe, etc."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão Individual */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Convite</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este convite? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {selectedInvite && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedInvite.email}</p>
              <p className="text-sm text-muted-foreground">
                Status: {selectedInvite.status} • Criado em {formatDate(selectedInvite.createdAt)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedInvite && deleteMutation.mutate(selectedInvite.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Progresso da Aprovação */}
      <Dialog
        open={isProgressDialogOpen}
        onOpenChange={open => {
          // Só permitir fechar se completou (sem membros pendentes) ou teve erro
          const hasPendingMembers = (approvalProgress.result?.membersPending ?? 0) > 0;
          if (
            !open &&
            ((approvalProgress.isComplete && !hasPendingMembers) || approvalProgress.isError)
          ) {
            setIsProgressDialogOpen(false);
            if (approvalProgress.isComplete) {
              setIsDetailsDialogOpen(false);
              setSelectedInvite(null);
              toast({
                title: 'Aprovação concluída!',
                description: 'O pastor foi cadastrado com sucesso.',
              });
            }
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={e => {
            // Prevenir fechar clicando fora durante processamento ou importação de membros
            const hasPendingMembers = (approvalProgress.result?.membersPending ?? 0) > 0;
            if ((!approvalProgress.isComplete && !approvalProgress.isError) || hasPendingMembers) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalProgress.isComplete ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Aprovação Concluída
                </>
              ) : approvalProgress.isError ? (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Erro na Aprovação
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  Processando Aprovação
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{approvalProgress.step}</span>
                <span className="text-muted-foreground">{approvalProgress.progress}%</span>
              </div>
              <Progress
                value={approvalProgress.progress}
                className={`h-2 ${
                  approvalProgress.isError
                    ? '[&>div]:bg-red-500'
                    : approvalProgress.isComplete
                      ? '[&>div]:bg-green-500'
                      : ''
                }`}
              />
              <p className="text-sm text-muted-foreground">{approvalProgress.details}</p>
            </div>

            {/* Resultado final */}
            {approvalProgress.isComplete && approvalProgress.result && (
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Resumo da Importação
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {approvalProgress.result.districtId && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-green-600" />
                      <span>Distrito criado</span>
                    </div>
                  )}
                  {(approvalProgress.result.churchesCreated ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-green-600" />
                      <span>{approvalProgress.result.churchesCreated} igreja(s)</span>
                    </div>
                  )}
                  {(approvalProgress.result.membersImported ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <span>{approvalProgress.result.membersImported} novos membros</span>
                    </div>
                  )}
                  {(approvalProgress.result.membersUpdated ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>{approvalProgress.result.membersUpdated} atualizados</span>
                    </div>
                  )}
                  {(approvalProgress.result.membersPending ?? 0) > 0 && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                      <span className="text-amber-700 dark:text-amber-400">
                        {approvalProgress.result.membersPending} membros sendo importados...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Erro */}
            {approvalProgress.isError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">{approvalProgress.details}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {(approvalProgress.isComplete || approvalProgress.isError) &&
              (() => {
                const hasPendingMembers = (approvalProgress.result?.membersPending ?? 0) > 0;
                return (
                  <Button
                    onClick={() => {
                      if (hasPendingMembers) return; // Não fechar enquanto importa
                      setIsProgressDialogOpen(false);
                      if (approvalProgress.isComplete) {
                        setIsDetailsDialogOpen(false);
                        setSelectedInvite(null);
                      }
                    }}
                    disabled={hasPendingMembers}
                    className={
                      approvalProgress.isComplete && !hasPendingMembers
                        ? 'bg-green-600 hover:bg-green-700'
                        : ''
                    }
                  >
                    {hasPendingMembers
                      ? 'Importando...'
                      : approvalProgress.isComplete
                        ? 'Concluir'
                        : 'Fechar'}
                  </Button>
                );
              })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão de Todos */}
      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar Todos os Convites</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir TODOS os {invites.length} convites? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">Atenção!</p>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Serão excluídos: {pendingCount} pendentes, {submittedCount} enviados, {approvedCount}{' '}
              aprovados e {rejectedCount} rejeitados.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAllDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir Todos ({invites.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
