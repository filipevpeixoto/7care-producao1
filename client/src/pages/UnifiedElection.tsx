import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Loader2, Play, Pause, BarChart3, Vote } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ElectionHeader,
  DashboardTab,
  VotingTab,
  ConfigTab,
} from './unified-election/UnifiedElectionSections';
import { useTranslation } from 'react-i18next';

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
  criteria: Record<string, unknown>;
}

interface ActiveElection {
  election_id: number;
  config_id: number;
  church_name: string;
  title?: string;
  status: string;
  current_position: number;
  positions: string[];
  voters: number[];
  created_at: string;
}

export default function UnifiedElection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: configs = [], isLoading: configsLoading } = useQuery<ElectionConfig[]>({
    queryKey: ['election-configs'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/elections/configs', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data;
    },
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 3000,
  });

  const { data: activeElections = [], isLoading: electionsLoading } = useQuery<ActiveElection[]>({
    queryKey: ['elections-active', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/elections/active', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!response.ok) return [];
      const data = await response.json();
      const elections = Array.isArray(data.elections)
        ? data.elections
        : data.election
          ? [
              {
                election_id: data.election.id,
                config_id: data.election.config_id,
                church_name: data.election.church_name,
                title: data.election.title,
                status: 'active',
                current_position: data.election.current_position,
                positions: data.election.positions,
                voters: data.election.voters || [],
                created_at: data.election.created_at || new Date().toISOString(),
              },
            ]
          : [];
      return elections;
    },
    enabled: !!user?.id,
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 3000,
  });

  const loading = configsLoading || electionsLoading;

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
      toast({
        title: t('unifiedElection.nominationStarted'),
        description: t('unifiedElection.nominationStartedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['election-configs'] });
      queryClient.invalidateQueries({ queryKey: ['elections-active'] });
    },
    onError: (error: Error) => {
      if (error.message === 'ALREADY_ACTIVE') {
        toast({
          title: t('unifiedElection.nominationAlreadyActive'),
          description: t('unifiedElection.nominationAlreadyActiveDesc'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('unifiedElection.error'),
          description: t('unifiedElection.couldNotStartNomination'),
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
      toast({
        title: t('unifiedElection.configDeleted'),
        description: t('unifiedElection.configDeletedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['election-configs'] });
    },
    onError: () => {
      toast({
        title: t('unifiedElection.error'),
        description: t('unifiedElection.couldNotDeleteConfig'),
        variant: 'destructive',
      });
    },
  });

  const handleStartElection = (configId: number) => {
    startElectionMutation.mutate(configId);
  };

  const handleDeleteConfig = (configId: number) => {
    if (!confirm(t('unifiedElection.confirmDeleteConfig'))) return;
    deleteConfigMutation.mutate(configId);
  };

  const handleAccessElection = (election: ActiveElection) => {
    window.location.href = `/election-vote/${election.config_id}`;
  };

  const getStatusBadge = (config: ElectionConfig) => {
    if (config.status === 'active') {
      return (
        <Badge variant="default" className="bg-green-500">
          <Play className="w-3 h-3 mr-1" />
          {t('unifiedElection.statusActive')}
        </Badge>
      );
    }

    if (config.status === 'paused') {
      return (
        <Badge variant="outline" className="border-orange-400 text-orange-600">
          <Pause className="w-3 h-3 mr-1" />
          {t('unifiedElection.statusPaused')}
        </Badge>
      );
    } else if (config.status === 'draft') {
      return (
        <Badge variant="secondary">
          <Settings className="w-3 h-3 mr-1" />
          {t('unifiedElection.statusDraft')}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <Pause className="w-3 h-3 mr-1" />
          {t('unifiedElection.statusPaused')}
        </Badge>
      );
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

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-4 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t('unifiedElection.loading')}</span>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <ElectionHeader
          autoRefresh={autoRefresh}
          onToggleRefresh={() => setAutoRefresh(!autoRefresh)}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('unifiedElection.tabDashboard')}
            </TabsTrigger>
            <TabsTrigger value="voting" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              {t('unifiedElection.tabVoting')}
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('unifiedElection.tabConfig')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <DashboardTab
              configs={configs}
              navigate={navigate}
              getStatusBadge={getStatusBadge}
              handleStartElection={handleStartElection}
              handleDeleteConfig={handleDeleteConfig}
            />
          </TabsContent>

          <TabsContent value="voting" className="space-y-4">
            <VotingTab
              activeElections={activeElections}
              user={user}
              formatDate={formatDate}
              handleAccessElection={handleAccessElection}
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <ConfigTab navigate={navigate} />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
