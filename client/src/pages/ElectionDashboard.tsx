import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart3,
  Users,
  Vote,
  Clock,
  CheckCircle,
  Play,
  Pause,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Loader2,
  Plus,
  Settings,
  FileText
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
  criteria: any;
}

export default function ElectionDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [configs, setConfigs] = useState<ElectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showVoteLog, setShowVoteLog] = useState(false);
  const [voteLog, setVoteLog] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  useEffect(() => {
    loadConfigs();

    if (!autoRefresh) {
      return () => {};
    }

    const interval = setInterval(loadConfigs, 5000); // Atualiza a cada 5 segundos
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/elections/configs');
      if (response.ok) {
        const data = await response.json();
        
        // Remover duplicatas baseado no ID (caso o backend ainda retorne duplicatas)
        const uniqueConfigs = data.filter((config: ElectionConfig, index: number, self: ElectionConfig[]) => 
          index === self.findIndex((c: ElectionConfig) => c.id === config.id)
        );
        
        console.log(`📋 Carregadas ${data.length} configurações, ${uniqueConfigs.length} únicas`);
        
        setConfigs(uniqueConfigs);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de nomeação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVoteLog = async (electionId: number) => {
    try {
      const response = await fetch(`/api/elections/vote-log/${electionId}`);
      if (response.ok) {
        const data = await response.json();
        setVoteLog(data);
        setSelectedElectionId(electionId);
        setShowVoteLog(true);
        
        toast({
          title: "Log de Votos Carregado",
          description: `${data.length} voto(s) registrado(s)`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar o log de votos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o log de votos.",
        variant: "destructive",
      });
    }
  };

  const handleStartElection = async (configId: number) => {
    try {
      const response = await fetch('/api/elections/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configId })
      });

      if (response.ok) {
        toast({
          title: "Nomeação iniciada",
          description: "A nomeação foi iniciada com sucesso!",
        });
        loadConfigs();
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error.includes('Já existe uma eleição ativa')) {
          toast({
            title: "Nomeação já ativa",
            description: "Esta configuração já possui uma eleição em andamento.",
            variant: "destructive",
          });
        } else {
          throw new Error('Erro ao iniciar nomeação');
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a nomeação.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfig = async (configId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/elections/config/${configId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Configuração excluída",
          description: "A configuração foi excluída com sucesso!",
        });
        loadConfigs();
      } else {
        throw new Error('Erro ao excluir configuração');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a configuração.",
        variant: "destructive",
      });
    }
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
        <Badge variant="outline" className="border-gray-300 text-gray-600">
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
          <span>Nomeação em Andamento</span>
          <span>Ativa</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '100%' }}></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando configurações...</span>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Dashboard de Nomeações</h1>
                {configs.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="default" className="bg-green-600">
                      {configs.filter(c => c.status === 'active').length} Ativa(s)
                    </Badge>
                    <Badge variant="outline" className="border-orange-400 text-orange-600">
                      {configs.filter(c => c.status === 'paused').length} Pausada(s)
                    </Badge>
                    <Badge variant="secondary">
                      {configs.filter(c => c.status === 'draft').length} Rascunho(s)
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">Gerencie todas as nomeações da igreja</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Pausar' : 'Atualizar'}
            </Button>
            
            <Button
              onClick={() => navigate('/election-config')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Nomeação
            </Button>
          </div>
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
            {configs.map((config) => (
              <Card key={config.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{config.title || config.church_name}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {config.church_name} • {config.positions.length} cargos • {config.voters.length} votantes
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
                            Gerenciar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              // Buscar o electionId da configuração
                              try {
                                const response = await fetch(`/api/elections/dashboard/${config.id}`);
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.election?.id) {
                                    loadVoteLog(data.election.id);
                                  } else {
                                    toast({
                                      title: "Erro",
                                      description: "Eleição não encontrada.",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              } catch (error) {
                                toast({
                                  title: "Erro",
                                  description: "Não foi possível carregar o log.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Log de Votos
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/election-dashboard/${config.id}`)}
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
                            onClick={() => navigate(`/election-manage/${config.id}`)}
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

        {configs.length > 0 && (
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              <strong>Múltiplas Nomeações Simultâneas:</strong> Ative, pause e retome nomeações de forma independente. 
              Ao pausar, a nomeação some para os votantes mas os dados permanecem intactos. Use os botões "Pausar" e "Continuar" conforme necessário.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Modal de Log de Votos */}
      <Dialog open={showVoteLog} onOpenChange={setShowVoteLog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log de Votos - Eleição #{selectedElectionId}</DialogTitle>
            <DialogDescription>
              Histórico completo de todos os votos e indicações registrados nesta eleição.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {voteLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Vote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum voto registrado ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total: <strong>{voteLog.length}</strong> registro(s)
                  </p>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Votante</TableHead>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voteLog.map((vote) => (
                      <TableRow key={vote.id}>
                        <TableCell className="font-mono text-xs">#{vote.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vote.voter_name || 'Desconhecido'}</div>
                            <div className="text-xs text-muted-foreground">ID: {vote.voter_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vote.candidate_name || 'Desconhecido'}</div>
                            <div className="text-xs text-muted-foreground">ID: {vote.candidate_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vote.position_id}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={vote.vote_type === 'nomination' ? 'secondary' : 'default'}
                            className={vote.vote_type === 'nomination' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                          >
                            {vote.vote_type === 'nomination' ? 'Indicação' : 'Voto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {vote.created_at ? new Date(vote.created_at).toLocaleString('pt-BR') : '-'}
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