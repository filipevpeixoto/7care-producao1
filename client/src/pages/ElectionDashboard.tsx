import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Users,
  Vote,
  Clock,
  Play,
  Pause,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Loader2,
  Plus,
  Settings,
  FileText,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { fetchWithAuth } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { electionLogger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';

interface ElectionCriteria {
  minAge?: number;
  maxAge?: number;
  minMembershipYears?: number;
  requireBaptism?: boolean;
  customRules?: string[];
}

interface ElectionConfig {
  id: number;
  church_name: string;
  title?: string;
  status: string;
  election_status?: string;
  created_at: string;
  election_created_at?: string;
  voters: number[];
  positions: string[];
  criteria: ElectionCriteria;
}

interface VoteLogEntry {
  id: number;
  voter_id: number;
  voter_name?: string;
  candidate_id: number;
  candidate_name?: string;
  position_id: string;
  vote_type: string;
  created_at?: string;
}

export default function ElectionDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showVoteLog, setShowVoteLog] = useState(false);
  const [voteLog, setVoteLog] = useState<VoteLogEntry[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);

  const { data: configs = [], isLoading: loading } = useQuery<ElectionConfig[]>({
    queryKey: ['election-configs'],
    queryFn: async () => {
      const response = await fetch('/api/elections/configs');
      if (!response.ok) return [];
      const rawData = await response.json();
      const data = Array.isArray(rawData) ? rawData : rawData?.data || [];
      // Remove duplicates based on ID
      const uniqueConfigs = data.filter(
        (config: ElectionConfig, index: number, self: ElectionConfig[]) =>
          index === self.findIndex((c: ElectionConfig) => c.id === config.id)
      );
      electionLogger.debug(`Carregadas ${data.length} configurações, ${uniqueConfigs.length} únicas`);
      return uniqueConfigs;
    },
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 3000,
  });

  const loadVoteLog = async (electionId: number) => {
    try {
      const response = await fetchWithAuth(`/api/elections/vote-log/${electionId}`);
      if (response.ok) {
        const data = await response.json();
        setVoteLog(data);
        setSelectedElectionId(electionId);
        setShowVoteLog(true);

        toast({
          title: t('electionDashboard.voteLogLoaded'),
          description: t('electionDashboard.votesRegistered', { count: data.length }),
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: t('electionDashboard.error'),
          description: errorData.error || t('electionDashboard.voteLogLoadError'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('electionDashboard.error'),
        description: t('electionDashboard.voteLogLoadError'),
        variant: 'destructive',
        });
    }
  };

  const startElectionMutation = useMutation({
    mutationFn: async (configId: number) => {
      const response = await fetch('/api/elections/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error?.includes('Já existe uma eleição ativa')) {
          throw new Error('ALREADY_ACTIVE');
        }
        throw new Error('Erro ao iniciar nomeação');
      }
    },
    onSuccess: () => {
      toast({ title: t('electionDashboard.nominationStarted'), description: t('electionDashboard.nominationStartedSuccess') });
      queryClient.invalidateQueries({ queryKey: ['election-configs'] });
    },
    onError: (error: Error) => {
      if (error.message === 'ALREADY_ACTIVE') {
        toast({
          title: t('electionDashboard.nominationAlreadyActive'),
          description: t('electionDashboard.electionAlreadyInProgress'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('electionDashboard.error'),
          description: t('electionDashboard.startNominationError'),
          variant: 'destructive',
        });
      }
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: number) => {
      const response = await fetch(`/api/elections/config/${configId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir configuração');
    },
    onSuccess: () => {
      toast({ title: t('electionDashboard.configDeleted'), description: t('electionDashboard.configDeletedSuccess') });
      queryClient.invalidateQueries({ queryKey: ['election-configs'] });
    },
    onError: () => {
      toast({
        title: t('electionDashboard.error'),
        description: t('electionDashboard.deleteConfigError'),
        variant: 'destructive',
      });
    },
  });

  const handleStartElection = (configId: number) => {
    startElectionMutation.mutate(configId);
  };

  const handleDeleteConfig = (configId: number) => {
    if (!confirm(t('electionDashboard.deleteConfirm'))) {
      return;
    }
    deleteConfigMutation.mutate(configId);
  };

  const getStatusBadge = (config: ElectionConfig) => {
    if (config.status === 'active') {
      return (
        <Badge variant="default" className="bg-green-500">
          <Play className="w-3 h-3 mr-1" />
          {t('electionDashboard.active')}
        </Badge>
      );
    }

    if (config.status === 'paused') {
      return (
        <Badge variant="outline" className="border-orange-400 text-orange-600">
          <Pause className="w-3 h-3 mr-1" />
          {t('electionDashboard.paused')}
        </Badge>
      );
    } else if (config.status === 'draft') {
      return (
        <Badge variant="secondary">
          <Settings className="w-3 h-3 mr-1" />
          {t('electionDashboard.draft')}
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
        >
          <Clock className="w-3 h-3 mr-1" />
          {config.status}
        </Badge>
      );
    }
  };

  const getPhaseProgress = (config: ElectionConfig) => {
    if (config.status !== 'active') {
      return null;
    }

    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{t('electionDashboard.nominationInProgress')}</span>
          <span>{t('electionDashboard.activeStatus')}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: '100%' }}
          ></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t('electionDashboard.loadingConfigs')}</span>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0 mt-1 sm:mt-0" />
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold">{t('electionDashboard.title')}</h1>
                {configs.length > 0 && (
                  <div className="flex gap-1 sm:gap-2 flex-wrap">
                    <Badge variant="default" className="bg-green-600 text-xs sm:text-sm">
                      {configs.filter(c => c.status === 'active').length} {t('electionDashboard.activeCount')}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-orange-400 text-orange-600 text-xs sm:text-sm"
                    >
                      {configs.filter(c => c.status === 'paused').length} {t('electionDashboard.pausedCount')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      {configs.filter(c => c.status === 'draft').length} {t('electionDashboard.draftCount')}
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t('electionDashboard.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">{autoRefresh ? t('electionDashboard.pause') : t('electionDashboard.refresh')}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/election-config')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t('electionDashboard.newNomination')}</span>
              <span className="sm:hidden ml-1">{t('electionDashboard.new')}</span>
            </Button>
          </div>
        </div>

        {configs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Vote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('electionDashboard.noConfigured')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('electionDashboard.noConfiguredDescription')}
              </p>
              <Button onClick={() => navigate('/election-config')}>
                <Plus className="h-4 w-4 mr-2" />
                {t('electionDashboard.configureNomination')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {configs.map(config => (
              <Card key={config.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {config.title || config.church_name}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {config.church_name} • {config.positions.length} {t('electionDashboard.positions')} •{' '}
                        {config.voters.length} {t('electionDashboard.voters')}
                      </CardDescription>
                    </div>
                    {getStatusBadge(config)}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {config.voters.length} {t('electionDashboard.voters')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Vote className="w-3 h-3 mr-1" />
                        {config.positions.length} {t('electionDashboard.positions')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(config.created_at).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>

                    {config.status === 'active' && getPhaseProgress(config)}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {config.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/election-manage/${config.id}`)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            {t('electionDashboard.manage')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              // Buscar o electionId da configuração
                              try {
                                const response = await fetch(
                                  `/api/elections/dashboard/${config.id}`
                                );
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.election?.id) {
                                    loadVoteLog(data.election.id);
                                  } else {
                                    toast({
                                      title: t('electionDashboard.error'),
                                      description: t('electionDashboard.electionNotFound'),
                                      variant: 'destructive',
                                    });
                                  }
                                }
                              } catch (error) {
                                toast({
                                  title: t('electionDashboard.error'),
                                  description: t('electionDashboard.loadLogError'),
                                  variant: 'destructive',
                                });
                              }
                            }}
                            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {t('electionDashboard.viewVoteLog')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/election-dashboard/${config.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('electionDashboard.follow')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/election-config?id=${config.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('electionDashboard.edit')}
                          </Button>
                        </>
                      )}

                      {config.status === 'paused' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/election-manage/${config.id}`)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            {t('electionDashboard.manage')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/election-config?id=${config.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('electionDashboard.edit')}
                          </Button>
                        </>
                      )}

                      {config.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStartElection(config.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {t('electionDashboard.start')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/election-config?id=${config.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('electionDashboard.edit')}
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteConfig(config.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('electionDashboard.delete')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {configs.length > 0 && (
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('electionDashboard.multipleNominations')}</strong> {t('electionDashboard.multipleNominationsDescription')}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Modal de Log de Votos */}
      <Dialog open={showVoteLog} onOpenChange={setShowVoteLog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('electionDashboard.voteLogTitle', { id: selectedElectionId })}</DialogTitle>
            <DialogDescription>
              {t('electionDashboard.voteLogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {voteLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Vote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('electionDashboard.noVotesYet')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total: <strong>{voteLog.length}</strong> {t('electionDashboard.records')}
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{t('electionDashboard.voterColumn')}</TableHead>
                      <TableHead>{t('electionDashboard.candidateColumn')}</TableHead>
                      <TableHead>{t('electionDashboard.positionColumn')}</TableHead>
                      <TableHead>{t('electionDashboard.typeColumn')}</TableHead>
                      <TableHead>{t('electionDashboard.dateTimeColumn')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voteLog.map(vote => (
                      <TableRow key={vote.id}>
                        <TableCell className="font-mono text-xs">#{vote.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vote.voter_name || t('electionDashboard.unknown')}</div>
                            <div className="text-xs text-muted-foreground">ID: {vote.voter_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {vote.candidate_name || t('electionDashboard.unknown')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {vote.candidate_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vote.position_id}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={vote.vote_type === 'nomination' ? 'secondary' : 'default'}
                            className={
                              vote.vote_type === 'nomination'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }
                          >
                            {vote.vote_type === 'nomination' ? t('electionDashboard.nomination') : t('electionDashboard.vote')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {vote.created_at
                            ? new Date(vote.created_at).toLocaleString('pt-BR')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
