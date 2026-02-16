/**
 * Página de Gerenciamento de Convites de Pastores
 * Permite superadmin criar convites, visualizar pendentes e aprovar/rejeitar
 */

import { useState, useDeferredValue, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
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
      title: t('pastorInvites.linkCopiedTitle'),
      description: t('pastorInvites.linkCopiedDescription'),
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
        title: t('pastorInvites.approvalCompleteTitle'),
        description: t('pastorInvites.approvalCompleteDescription'),
      });
    }
  };

  const filteredInvites = invites.filter(invite => {
    const matchesSearch =
      invite.email.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      invite.onboardingData?.personal?.name?.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      invite.onboardingData?.district?.name?.toLowerCase().includes(deferredSearchTerm.toLowerCase());

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
          <h2 className="text-xl font-semibold mb-2">{t('pastorInvites.accessRestricted')}</h2>
          <p className="text-muted-foreground">
            {t('pastorInvites.accessRestrictedMessage')}
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
            <h1 className="text-2xl font-bold">{t('pastorInvites.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('pastorInvites.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {invites.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsDeleteAllDialogOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('pastorInvites.clearAll')}
              </Button>
            )}
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('pastorInvites.newInvite')}
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
              placeholder={t('pastorInvites.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => startTransition(() => setActiveTab(val))}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">{t('pastorInvites.tabAll')}</TabsTrigger>
            <TabsTrigger value="pending">{t('pastorInvites.tabPending')}</TabsTrigger>
            <TabsTrigger value="submitted">{t('pastorInvites.tabSubmitted')}</TabsTrigger>
            <TabsTrigger value="approved">{t('pastorInvites.tabApproved')}</TabsTrigger>
            <TabsTrigger value="rejected">{t('pastorInvites.tabRejected')}</TabsTrigger>
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
              <h3 className="font-semibold mb-2">{t('pastorInvites.noInviteFound')}</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm
                  ? t('pastorInvites.adjustSearch')
                  : t('pastorInvites.createInviteHint')}
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
