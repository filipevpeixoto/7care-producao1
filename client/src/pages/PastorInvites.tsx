/**
 * Página de Gerenciamento de Convites de Pastores
 * Permite superadmin criar convites, visualizar pendentes e aprovar/rejeitar
 */

import { useState } from 'react';
import { Plus, Search, Mail, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isSuperAdmin } from '@/lib/permissions';
import { type PastorInvite } from '@/types/pastor-invite';
import { usePastorInvites } from './pastor-invites/usePastorInvites';
import { useApprovalProgress } from './pastor-invites/useApprovalProgress';
import { getInviteLink } from './pastor-invites/inviteUtils';
import { CreateInviteDialog } from './pastor-invites/CreateInviteDialog';
import { InviteDetailsDialog } from './pastor-invites/InviteDetailsDialog';
import { RejectInviteDialog } from './pastor-invites/RejectInviteDialog';
import { DeleteInviteDialog } from './pastor-invites/DeleteInviteDialog';
import { DeleteAllInvitesDialog } from './pastor-invites/DeleteAllInvitesDialog';
import { ApprovalProgressDialog } from './pastor-invites/ApprovalProgressDialog';
import { InviteCard } from './pastor-invites/InviteCard';
import { InviteSummaryCards } from './pastor-invites/InviteSummaryCards';

export default function PastorInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('submitted');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<PastorInvite | null>(null);

  const {
    invites,
    isLoading,
    createMutation,
    rejectMutation,
    deleteMutation,
    deleteAllMutation,
  } = usePastorInvites(user?.id, isSuperAdmin(user));

  const { approvalProgress, approveMutation } = useApprovalProgress(selectedInvite);

  const copyInviteLink = (token: string) => {
    const inviteLink = getInviteLink(token);
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Link copiado',
      description: 'O link de convite foi copiado para a área de transferência.',
    });
  };

  const handleCreateInvite = (email: string) => {
    createMutation.mutate(email, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleViewDetails = (invite: PastorInvite) => {
    setSelectedInvite(invite);
    setIsDetailsDialogOpen(true);
  };

  const handleApprove = (invite: PastorInvite) => {
    setSelectedInvite(invite);
    setIsProgressDialogOpen(true);
    approveMutation.mutate(invite.id);
  };

  const handleReject = (reason: string) => {
    if (!selectedInvite) return;
    rejectMutation.mutate(
      { id: selectedInvite.id, reason },
      {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          setIsDetailsDialogOpen(false);
          setSelectedInvite(null);
        },
      },
    );
  };

  const handleDelete = (invite: PastorInvite) => {
    setSelectedInvite(invite);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedInvite) return;
    deleteMutation.mutate(selectedInvite.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedInvite(null);
      },
    });
  };

  const handleProgressClose = () => {
    const hasPendingMembers = (approvalProgress.result?.membersPending ?? 0) > 0;
    if (hasPendingMembers) return;

    setIsProgressDialogOpen(false);
    if (approvalProgress.isComplete) {
      setIsDetailsDialogOpen(false);
      setSelectedInvite(null);
      toast({
        title: 'Aprovação concluída!',
        description: 'O pastor foi cadastrado com sucesso.',
      });
    }
  };

  const filteredInvites = invites.filter(invite => {
    const matchesSearch =
      invite.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.onboardingData?.personal?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.onboardingData?.district?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'all' || invite.status === activeTab;

    return matchesSearch && matchesTab;
  });

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

        <InviteSummaryCards
          pendingCount={pendingCount}
          submittedCount={submittedCount}
          approvedCount={approvedCount}
          rejectedCount={rejectedCount}
        />

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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="submitted">Enviados</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
          </TabsList>
        </Tabs>

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
              <InviteCard
                key={invite.id}
                invite={invite}
                onCopyLink={copyInviteLink}
                onViewDetails={handleViewDetails}
                onApprove={handleApprove}
                onReject={invite => {
                  setSelectedInvite(invite);
                  setIsRejectDialogOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <CreateInviteDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateInvite}
        isPending={createMutation.isPending}
      />

      <InviteDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        invite={selectedInvite}
        onApprove={() => handleApprove(selectedInvite!)}
        onReject={() => setIsRejectDialogOpen(true)}
        isApproving={approveMutation.isPending}
      />

      <RejectInviteDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        onSubmit={handleReject}
        isPending={rejectMutation.isPending}
      />

      <DeleteInviteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        invite={selectedInvite}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />

      <DeleteAllInvitesDialog
        open={isDeleteAllDialogOpen}
        onOpenChange={setIsDeleteAllDialogOpen}
        onConfirm={() => deleteAllMutation.mutate()}
        isPending={deleteAllMutation.isPending}
        totalCount={invites.length}
        counts={{
          pending: pendingCount,
          submitted: submittedCount,
          approved: approvedCount,
          rejected: rejectedCount,
        }}
      />

      <ApprovalProgressDialog
        open={isProgressDialogOpen}
        onOpenChange={setIsProgressDialogOpen}
        progress={approvalProgress}
        onClose={handleProgressClose}
      />
    </MobileLayout>
  );
}
