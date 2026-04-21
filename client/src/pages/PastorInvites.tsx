/**
 * Página de Gerenciamento de Convites de Pastores
 * Permite superadmin criar convites, visualizar pendentes e aprovar/rejeitar
 */

import React, { useState, useDeferredValue, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Mail, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import {
  PrototypeAvatar,
  PrototypeHeaderIconButton,
  PrototypeStatusBar,
} from './v2/prototypeShared';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isSuperAdmin } from '@/lib/permissions';
import { type PastorInvite } from '@/types/pastor-invite';
import { usePastorInvites } from './pastor-invites/usePastorInvites';
import { useApprovalProgress } from './pastor-invites/useApprovalProgress';
import { formatDate, getInviteLink } from './pastor-invites/inviteUtils';
import { CreateInviteDialog } from './pastor-invites/CreateInviteDialog';
import { InviteDetailsDialog } from './pastor-invites/InviteDetailsDialog';
import { RejectInviteDialog } from './pastor-invites/RejectInviteDialog';
import { DeleteInviteDialog } from './pastor-invites/DeleteInviteDialog';
import { DeleteAllInvitesDialog } from './pastor-invites/DeleteAllInvitesDialog';
import { ApprovalProgressDialog } from './pastor-invites/ApprovalProgressDialog';
import { InviteCard } from './pastor-invites/InviteCard';
import { InviteSummaryCards } from './pastor-invites/InviteSummaryCards';

const PIPELINE_STAGES = ['Convite', 'Cadastro', 'Revisão', 'Resultado'] as const;

const getInviteStageState = (invite: PastorInvite, stageIndex: number) => {
  if (invite.status === 'pending') {
    return stageIndex === 0 ? 'current' : 'upcoming';
  }

  if (invite.status === 'submitted') {
    if (stageIndex <= 1) return 'done';
    if (stageIndex === 2) return 'current';
    return 'upcoming';
  }

  if (invite.status === 'approved') {
    return 'done';
  }

  if (invite.status === 'rejected') {
    if (stageIndex <= 2) return 'done';
    if (stageIndex === 3) return 'rejected';
  }

  return 'upcoming';
};

const getInviteTone = (status: PastorInvite['status']) => {
  switch (status) {
    case 'pending':
      return 'warn';
    case 'submitted':
      return 'soft';
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    default:
      return 'soft';
  }
};

const getInviteStatusLabel = (status: PastorInvite['status']) => {
  switch (status) {
    case 'pending':
      return 'Aguardando acesso';
    case 'submitted':
      return 'Em revisão';
    case 'approved':
      return 'Aprovado';
    case 'rejected':
      return 'Rejeitado';
    default:
      return status;
  }
};

export default function PastorInvites() {
  const { user } = useAuth();
  const { skin } = useTheme();
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

  const { invites, isLoading, createMutation, rejectMutation, deleteMutation, deleteAllMutation } =
    usePastorInvites(user?.id, isSuperAdmin(user));

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
      }
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

  const filteredInvites = invites.filter((invite) => {
    const matchesSearch =
      invite.email.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      invite.onboardingData?.personal?.name
        ?.toLowerCase()
        .includes(deferredSearchTerm.toLowerCase()) ||
      invite.onboardingData?.district?.name
        ?.toLowerCase()
        .includes(deferredSearchTerm.toLowerCase());

    const matchesTab = activeTab === 'all' || invite.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const pendingCount = invites.filter((i) => i.status === 'pending').length;
  const submittedCount = invites.filter((i) => i.status === 'submitted').length;
  const approvedCount = invites.filter((i) => i.status === 'approved').length;
  const rejectedCount = invites.filter((i) => i.status === 'rejected').length;

  const dialogs = (
    <>
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
    </>
  );

  if (!isSuperAdmin(user)) {
    if (skin === 'v2') {
      return (
        <MobileLayout variant="prototype">
          <div className="p7-shell">
            <div className="p7-screen">
              <PrototypeStatusBar />
              <div className="p7-grad-header">
                <div className="p7-header-row">
                  <div>
                    <div className="p7-header-label">{t('pastorInvites.title')}</div>
                    <div className="p7-header-title">{t('pastorInvites.accessRestricted')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                  </div>
                </div>
              </div>
              <div className="p7-scroll">
                <div className="p7-section">
                  <div className="p7-card p7-card-p">
                    <p className="text-sm text-[var(--p7-muted)]">
                      {t('pastorInvites.accessRestrictedMessage')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MobileLayout>
      );
    }
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('pastorInvites.accessRestricted')}</h2>
          <p className="text-muted-foreground">{t('pastorInvites.accessRestrictedMessage')}</p>
        </div>
      </MobileLayout>
    );
  }

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">{t('pastorInvites.title')}</div>
                  <div className="p7-header-title">{t('pastorInvites.subtitle')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  {invites.length > 0 && (
                    <PrototypeHeaderIconButton
                      icon={Trash2}
                      onClick={() => setIsDeleteAllDialogOpen(true)}
                      label="Excluir todos os convites"
                    />
                  )}
                  <PrototypeHeaderIconButton
                    icon={Plus}
                    onClick={() => setIsCreateDialogOpen(true)}
                    label="Criar convite pastoral"
                  />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>
            <div className="p7-scroll">
              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    Pipeline de onboarding
                  </div>
                  <p className="prose-narrow text-[0.86rem] leading-[1.6] text-[var(--p7-text-2)]">
                    Acompanhe quem ainda precisa abrir o convite, quem já concluiu o cadastro e o
                    que já está pronto para aprovação final.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-[18px] border border-[var(--p7-border)] bg-[color-mix(in_oklab,var(--v2-gold)_10%,white)] px-4 py-3">
                      <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--p7-text-3)]">
                        Convites
                      </div>
                      <div className="mt-1 text-xl font-bold text-[var(--p7-text)]">
                        {pendingCount}
                      </div>
                      <div className="mt-1 text-xs text-[var(--p7-text-2)]">
                        Ainda não acessados
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-[var(--p7-border)] bg-[color-mix(in_oklab,var(--v2-blue)_8%,white)] px-4 py-3">
                      <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--p7-text-3)]">
                        Revisão
                      </div>
                      <div className="mt-1 text-xl font-bold text-[var(--p7-text)]">
                        {submittedCount}
                      </div>
                      <div className="mt-1 text-xs text-[var(--p7-text-2)]">Cadastros enviados</div>
                    </div>
                    <div className="rounded-[18px] border border-[var(--p7-border)] bg-[color-mix(in_oklab,var(--v2-success)_10%,white)] px-4 py-3">
                      <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--p7-text-3)]">
                        Aprovados
                      </div>
                      <div className="mt-1 text-xl font-bold text-[var(--p7-text)]">
                        {approvedCount}
                      </div>
                      <div className="mt-1 text-xs text-[var(--p7-text-2)]">
                        Ambientes liberados
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-[var(--p7-border)] bg-[color-mix(in_oklab,var(--v2-danger)_10%,white)] px-4 py-3">
                      <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--p7-text-3)]">
                        Ajustes
                      </div>
                      <div className="mt-1 text-xl font-bold text-[var(--p7-text)]">
                        {rejectedCount}
                      </div>
                      <div className="mt-1 text-xs text-[var(--p7-text-2)]">Precisam correção</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p space-y-4">
                  <div>
                    <div className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[var(--p7-text-3)]">
                      Filtros
                    </div>
                    <div className="mt-1 text-sm text-[var(--p7-text-2)]">
                      Filtre por etapa, localize um pastor e avance nas aprovações sem perder o
                      contexto.
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--p7-muted)]" />
                    <Input
                      placeholder={t('pastorInvites.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Tabs
                    value={activeTab}
                    onValueChange={(val) => startTransition(() => setActiveTab(val))}
                  >
                    <TabsList className="grid w-full grid-cols-5 bg-[var(--p7-surface-2)]">
                      <TabsTrigger value="all">{t('pastorInvites.tabAll')}</TabsTrigger>
                      <TabsTrigger value="pending">{t('pastorInvites.tabPending')}</TabsTrigger>
                      <TabsTrigger value="submitted">{t('pastorInvites.tabSubmitted')}</TabsTrigger>
                      <TabsTrigger value="approved">{t('pastorInvites.tabApproved')}</TabsTrigger>
                      <TabsTrigger value="rejected">{t('pastorInvites.tabRejected')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="p7-section pb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--p7-accent)]" />
                  </div>
                ) : filteredInvites.length === 0 ? (
                  <div className="p7-card p7-card-p text-center">
                    <Mail className="mx-auto mb-4 h-12 w-12 text-[var(--p7-muted)]" />
                    <h3 className="mb-2 font-semibold text-[var(--p7-text)]">
                      {t('pastorInvites.noInviteFound')}
                    </h3>
                    <p className="text-sm text-[var(--p7-muted)]">
                      {searchTerm
                        ? t('pastorInvites.adjustSearch')
                        : t('pastorInvites.createInviteHint')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInvites.map((invite) => {
                      const isExpired =
                        invite.status === 'pending' && new Date(invite.expiresAt) < new Date();

                      return (
                        <div
                          key={invite.id}
                          className="rounded-[22px] border border-[var(--p7-border)] bg-[var(--p7-card)] p-4 shadow-[var(--shadow-card)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`p7-pill ${getInviteTone(invite.status)}`}>
                                  {getInviteStatusLabel(invite.status)}
                                </span>
                                {isExpired ? <span className="p7-pill red">Expirado</span> : null}
                                <span className="text-[0.72rem] text-[var(--p7-text-3)]">
                                  {formatDate(invite.createdAt)}
                                </span>
                              </div>

                              <div className="mt-3 space-y-1">
                                <div className="text-sm font-semibold text-[var(--p7-text)]">
                                  {invite.email}
                                </div>
                                {invite.onboardingData?.personal?.name ? (
                                  <div className="text-[0.8rem] text-[var(--p7-text-2)]">
                                    {invite.onboardingData.personal.name}
                                  </div>
                                ) : null}
                                {invite.onboardingData?.district?.name ? (
                                  <div className="text-[0.76rem] text-[var(--p7-text-3)]">
                                    {invite.onboardingData.district.name}
                                    {invite.onboardingData.churches?.length
                                      ? ` • ${invite.onboardingData.churches.length} igreja(s)`
                                      : ''}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                              {invite.status === 'pending' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyInviteLink(invite.token)}
                                  >
                                    Copiar link
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[var(--v2-danger)] hover:bg-[color-mix(in_oklab,var(--v2-danger)_10%,transparent)] hover:text-[var(--v2-danger)]"
                                    onClick={() => handleDelete(invite)}
                                  >
                                    Excluir
                                  </Button>
                                </>
                              ) : null}

                              {invite.status === 'submitted' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(invite)}
                                  >
                                    Revisar
                                  </Button>
                                  <Button size="sm" onClick={() => handleApprove(invite)}>
                                    Aprovar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvite(invite);
                                      setIsRejectDialogOpen(true);
                                    }}
                                  >
                                    Rejeitar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[var(--v2-danger)] hover:bg-[color-mix(in_oklab,var(--v2-danger)_10%,transparent)] hover:text-[var(--v2-danger)]"
                                    onClick={() => handleDelete(invite)}
                                  >
                                    Excluir
                                  </Button>
                                </>
                              ) : null}

                              {invite.status === 'approved' || invite.status === 'rejected' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(invite)}
                                  >
                                    Ver detalhes
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[var(--v2-danger)] hover:bg-[color-mix(in_oklab,var(--v2-danger)_10%,transparent)] hover:text-[var(--v2-danger)]"
                                    onClick={() => handleDelete(invite)}
                                  >
                                    Excluir
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
                            {PIPELINE_STAGES.map((stage, index) => {
                              const state = getInviteStageState(invite, index);

                              return (
                                <React.Fragment key={`${invite.id}-${stage}`}>
                                  <div className="flex min-w-[84px] flex-col items-center gap-2">
                                    <div
                                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-[0.72rem] font-bold ${
                                        state === 'done'
                                          ? 'border-transparent bg-[var(--grad-gold)] text-[var(--v2-navy-strong)]'
                                          : state === 'current'
                                            ? 'border-[color-mix(in_oklab,var(--v2-blue)_28%,transparent)] bg-[color-mix(in_oklab,var(--v2-blue)_10%,white)] text-[var(--v2-blue)]'
                                            : state === 'rejected'
                                              ? 'border-transparent bg-[color-mix(in_oklab,var(--v2-danger)_16%,white)] text-[var(--v2-danger)]'
                                              : 'border-[var(--p7-border)] bg-[var(--p7-surface-2)] text-[var(--p7-text-3)]'
                                      }`}
                                    >
                                      {index + 1}
                                    </div>
                                    <span className="text-center text-[0.7rem] leading-[1.35] text-[var(--p7-text-3)]">
                                      {stage}
                                    </span>
                                  </div>
                                  {index < PIPELINE_STAGES.length - 1 ? (
                                    <div className="h-[2px] min-w-[18px] flex-1 rounded-full bg-[color-mix(in_oklab,var(--v2-blue)_10%,transparent)]">
                                      <div
                                        className={`h-full rounded-full ${
                                          state === 'done' ||
                                          state === 'current' ||
                                          state === 'rejected'
                                            ? 'bg-[var(--grad-gold)]'
                                            : ''
                                        }`}
                                      />
                                    </div>
                                  ) : null}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {dialogs}
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
                {searchTerm ? t('pastorInvites.adjustSearch') : t('pastorInvites.createInviteHint')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvites.map((invite) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                onCopyLink={copyInviteLink}
                onViewDetails={handleViewDetails}
                onApprove={handleApprove}
                onReject={(invite) => {
                  setSelectedInvite(invite);
                  setIsRejectDialogOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
      {dialogs}
    </MobileLayout>
  );
}
