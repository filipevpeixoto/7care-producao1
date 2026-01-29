import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  UserCheck,
  Loader2,
} from 'lucide-react';

interface DiscipleshipRequest {
  id: number;
  missionaryId: number;
  interestedId: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  adminNotes?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  church: string;
}

export function DiscipleshipAdmin() {
  const [selectedRequest, setSelectedRequest] = useState<DiscipleshipRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as solicitações de discipulado
  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['discipleship-requests'],
    queryFn: async () => {
      const response = await fetch('/api/discipleship-requests');
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      return response.json();
    },
  });

  // Buscar usuários para mostrar nomes
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      return response.json();
    },
  });

  // Mutation para aprovar/rejeitar solicitação
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
      const response = await fetch(`/api/discipleship-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNotes,
          processedBy: 1, // ID do administrador atual
        }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar solicitação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      toast({
        title: '✅ Solicitação atualizada',
        description: 'A solicitação foi processada com sucesso.',
      });
      setShowDetailsDialog(false);
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast({
        title: '❌ Erro ao processar',
        description: error.message || 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    },
  });

  const handleProcessRequest = (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    updateRequestMutation.mutate({
      requestId: selectedRequest.id,
      status,
      adminNotes: adminNotes.trim(),
    });
  };

  const openDetailsDialog = (request: DiscipleshipRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || '');
    setShowDetailsDialog(true);
  };

  const getUserName = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? user.name : `Usuário ${userId}`;
  };

  const getUserChurch = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? user.church : 'N/A';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'approved':
        return { label: 'Aprovada', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'rejected':
        return { label: 'Rejeitada', color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
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

  const pendingRequests = requests.filter((r: DiscipleshipRequest) => r.status === 'pending');
  const processedRequests = requests.filter((r: DiscipleshipRequest) => r.status !== 'pending');

  if (loadingRequests) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando solicitações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Administração de Discipulado
          </CardTitle>
          <CardDescription>Gerencie solicitações de discipulado dos missionários</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">Pendentes</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900">{pendingRequests.length}</div>
              <div className="text-sm text-yellow-700">Aguardando aprovação</div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Aprovadas</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {requests.filter((r: DiscipleshipRequest) => r.status === 'approved').length}
              </div>
              <div className="text-sm text-green-700">Solicitações aprovadas</div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">Rejeitadas</span>
              </div>
              <div className="text-2xl font-bold text-red-900">
                {requests.filter((r: DiscipleshipRequest) => r.status === 'rejected').length}
              </div>
              <div className="text-sm text-red-700">Solicitações rejeitadas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Solicitações Pendentes */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Solicitações Pendentes ({pendingRequests.length})
            </CardTitle>
            <CardDescription>Solicitações que aguardam sua aprovação ou rejeição</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request: DiscipleshipRequest) => {
                const StatusIcon = getStatusInfo(request.status).icon;
                const statusColor = getStatusInfo(request.status).color;

                return (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <Badge className={statusColor}>
                            {getStatusInfo(request.status).label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Missionário:</span>
                            <div className="font-medium">{getUserName(request.missionaryId)}</div>
                            <div className="text-xs text-muted-foreground">
                              {getUserChurch(request.missionaryId)}
                            </div>
                          </div>

                          <div>
                            <span className="font-medium text-muted-foreground">Amigo:</span>
                            <div className="font-medium">{getUserName(request.interestedId)}</div>
                            <div className="text-xs text-muted-foreground">
                              {getUserChurch(request.interestedId)}
                            </div>
                          </div>
                        </div>

                        {request.notes && (
                          <div>
                            <span className="font-medium text-muted-foreground">Observações:</span>
                            <div className="text-sm bg-muted/50 p-2 rounded mt-1">
                              {request.notes}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Solicitado em: {formatDate(request.requestedAt)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => openDetailsDialog(request)}
                          className="flex items-center gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Processar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Solicitações Processadas */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Solicitações Processadas ({processedRequests.length})
            </CardTitle>
            <CardDescription>Histórico de solicitações já processadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.map((request: DiscipleshipRequest) => {
                const StatusIcon = getStatusInfo(request.status).icon;
                const statusColor = getStatusInfo(request.status).color;

                return (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <Badge className={statusColor}>
                            {getStatusInfo(request.status).label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Missionário:</span>
                            <div className="font-medium">{getUserName(request.missionaryId)}</div>
                          </div>

                          <div>
                            <span className="font-medium text-muted-foreground">Amigo:</span>
                            <div className="font-medium">{getUserName(request.interestedId)}</div>
                          </div>
                        </div>

                        {request.adminNotes && (
                          <div>
                            <span className="font-medium text-muted-foreground">
                              Notas do Admin:
                            </span>
                            <div className="text-sm bg-muted/50 p-2 rounded mt-1">
                              {request.adminNotes}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Processado em:{' '}
                          {request.processedAt ? formatDate(request.processedAt) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma solicitação encontrada</p>
            <p className="text-sm text-muted-foreground">
              Quando missionários solicitarem discipulado, as solicitações aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Processamento */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Processar Solicitação</DialogTitle>
            <DialogDescription>Aprove ou rejeite a solicitação de discipulado</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRequest && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Missionário:</span>
                    <div className="font-medium">{getUserName(selectedRequest.missionaryId)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Amigo:</span>
                    <div className="font-medium">{getUserName(selectedRequest.interestedId)}</div>
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Observações do Missionário:
                    </span>
                    <div className="text-sm bg-muted/50 p-2 rounded mt-1">
                      {selectedRequest.notes}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Notas do Administrador:</label>
                  <Textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Adicione observações sobre sua decisão..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Cancelar
              </Button>

              <Button
                variant="destructive"
                onClick={() => handleProcessRequest('rejected')}
                disabled={updateRequestMutation.isPending}
              >
                {updateRequestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Rejeitar
              </Button>

              <Button
                onClick={() => handleProcessRequest('approved')}
                disabled={updateRequestMutation.isPending}
              >
                {updateRequestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Aprovar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
