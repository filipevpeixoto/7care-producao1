import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Vote,
  Settings,
  BarChart3,
  Users,
  Clock,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Plus,
  ArrowRight,
  Church,
  Calendar,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useNavigate } from 'react-router-dom';

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

  const [activeTab, setActiveTab] = useState('dashboard');
  const [configs, setConfigs] = useState<ElectionConfig[]>([]);
  const [activeElections, setActiveElections] = useState<ActiveElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, user?.id]);

  const loadData = async () => {
    try {
      await Promise.all([loadConfigs(), loadActiveElections()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/elections/configs', {
        headers: {
          'Cache-Control': 'no-cache',
          'x-user-id': user?.id?.toString() || '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadActiveElections = async () => {
    try {
      if (!user?.id) {
        setActiveElections([]);
        return;
      }

      const response = await fetch('/api/elections/active', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'x-user-id': user.id.toString(),
        },
      });

      if (response.ok) {
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
        setActiveElections(elections);
      } else {
        setActiveElections([]);
      }
    } catch (error) {
      console.error('Erro ao carregar eleições ativas:', error);
      setActiveElections([]);
    }
  };

  const handleStartElection = async (configId: number) => {
    try {
      const response = await fetch('/api/elections/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configId }),
      });

      if (response.ok) {
        toast({
          title: 'Nomeação iniciada',
          description: 'A nomeação foi iniciada com sucesso!',
        });
        loadData();
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error.includes('Já existe uma eleição ativa')) {
          toast({
            title: 'Nomeação já ativa',
            description: 'Esta configuração já possui uma eleição em andamento.',
            variant: 'destructive',
          });
        } else {
          throw new Error('Erro ao iniciar nomeação');
        }
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a nomeação.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfig = async (configId: number) => {
    if (
      !confirm('Tem certeza que deseja excluir esta configuração? Esta ação não pode ser desfeita.')
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/elections/config/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Configuração excluída',
          description: 'A configuração foi excluída com sucesso!',
        });
        loadData();
      } else {
        throw new Error('Erro ao excluir configuração');
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a configuração.',
        variant: 'destructive',
      });
    }
  };

  const handleAccessElection = (election: ActiveElection) => {
    window.location.href = `/election-vote/${election.config_id}`;
  };

  const getStatusBadge = (config: ElectionConfig) => {
    if (config.status === 'active') {
      return (
        <Badge variant="default" className="bg-green-500">
          <Play className="w-3 h-3 mr-1" />
          Ativa
        </Badge>
      );
    }

    if (config.status === 'paused') {
      return (
        <Badge variant="outline" className="border-orange-400 text-orange-600">
          <Pause className="w-3 h-3 mr-1" />
          Pausada
        </Badge>
      );
    } else if (config.status === 'draft') {
      return (
        <Badge variant="secondary">
          <Settings className="w-3 h-3 mr-1" />
          Rascunho
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <Pause className="w-3 h-3 mr-1" />
          Pausada
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
          <span className="ml-2">Carregando...</span>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vote className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Sistema de Nomeações</h1>
              <p className="text-muted-foreground">
                Gerencie e participe das eleições de liderança
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Pausar' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="voting" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Votação
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuração
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Configurações de Nomeação</h2>
              <Button
                onClick={() => navigate('/election-config')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Nomeação
              </Button>
            </div>

            {configs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Vote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma nomeação configurada</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure uma nova nomeação para começar o processo de eleição de liderança.
                  </p>
                  <Button onClick={() => navigate('/election-config')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Configurar Nomeação
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
                          <CardDescription>
                            {config.church_name} • {config.positions.length} cargos •{' '}
                            {config.voters.length} votantes
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
                            {config.voters.length} votantes
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Vote className="w-3 h-3 mr-1" />
                            {config.positions.length} cargos
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(config.created_at).toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {config.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  // Abrir página de gerenciamento em nova aba
                                  window.open(`/election-manage/${config.id}`, '_blank');
                                }}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Gerenciar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Abrir página de acompanhamento em nova aba
                                  window.open(`/election-dashboard/${config.id}`, '_blank');
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Acompanhar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/election-config?id=${config.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                            </>
                          )}

                          {config.status === 'paused' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  window.open(`/election-manage/${config.id}`, '_blank');
                                }}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Gerenciar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/election-config?id=${config.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
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
                                Iniciar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/election-config?id=${config.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteConfig(config.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Voting Tab */}
          <TabsContent value="voting" className="space-y-4">
            <h2 className="text-xl font-semibold">Nomeações Ativas</h2>

            {activeElections.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">Nenhuma Nomeação Disponível</h2>
                  <p className="text-muted-foreground mb-4">
                    {!user?.id
                      ? 'Você precisa estar logado para ver suas nomeações.'
                      : 'Você não está incluído em nenhuma nomeação ativa no momento.'}
                  </p>
                  {!user?.id && (
                    <Button
                      onClick={() => (window.location.href = '/login')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Fazer Login
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeElections.map(election => (
                  <Card key={election.election_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Church className="h-6 w-6 text-blue-600" />
                          <div>
                            <CardTitle className="text-lg">
                              {election.title || election.church_name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {election.church_name} • Iniciada em {formatDate(election.created_at)}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">Nomeação Ativa</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progresso */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Cargo Atual</span>
                          <span>
                            {election.current_position + 1} de {election.positions.length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${((election.current_position + 1) / election.positions.length) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {election.positions[election.current_position] || 'Aguardando início'}
                        </p>
                      </div>

                      {/* Estatísticas */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {election.voters.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Votantes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {election.positions.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Cargos</div>
                        </div>
                      </div>

                      {/* Botão de acesso */}
                      <Button
                        onClick={() => handleAccessElection(election)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        <ArrowRight className="h-5 w-5 mr-2" />
                        Acessar Nomeação
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Instruções */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Como Participar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-blue-700 space-y-2">
                  <p>
                    <strong>1.</strong> Clique em "Acessar Nomeação" na eleição da sua igreja
                  </p>
                  <p>
                    <strong>2.</strong> Siga as instruções na tela do seu celular
                  </p>
                  <p>
                    <strong>3.</strong> Indique ou vote conforme solicitado
                  </p>
                  <p>
                    <strong>4.</strong> Acompanhe os resultados em tempo real
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Configurações</h2>
              <Button
                onClick={() => navigate('/election-config')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Configuração
              </Button>
            </div>

            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <strong>Configuração de Nomeações:</strong> Acesse a página de configuração para
                criar e gerenciar os parâmetros das eleições de liderança da sua igreja.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Acesso Rápido
                </CardTitle>
                <CardDescription>Gerencie as configurações de nomeação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => navigate('/election-config')}
                  className="w-full"
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Nomeação
                </Button>

                <Button
                  onClick={() => navigate('/election-dashboard')}
                  className="w-full"
                  variant="outline"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard Completo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
