import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Users,
  Vote,
  Clock,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Trophy,
  Award,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useNavigate, useParams } from 'react-router-dom';

interface ElectionResult {
  positionId: string;
  positionName: string;
  totalVotes: number;
  totalNominations: number;
  results: {
    candidateId: number;
    candidateName: string;
    nominations: number;
    votes: number;
    percentage: number;
  }[];
  winner?: {
    candidateId: number;
    candidateName: string;
    nominations: number;
    votes: number;
    percentage: number;
  };
}

interface DashboardData {
  totalVoters: number;
  votedVoters: number;
  currentPosition: number;
  totalPositions: number;
  isActive: boolean;
  positions: ElectionResult[];
}

export default function ElectionResults() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { configId } = useParams();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    console.log('ElectionResults mounted, user:', user);
    console.log('configId from params:', configId);

    // Temporariamente removendo verificação de admin para debug
    // if (user?.role !== 'admin') {
    //   console.log('User is not admin, redirecting to dashboard');
    //   navigate('/dashboard');
    //   return;
    // }

    console.log('Loading dashboard...');
    loadDashboard();

    // Auto refresh a cada 5 segundos
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadDashboard, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, user]);

  const loadDashboard = async () => {
    try {
      console.log('Loading dashboard data for configId:', configId);
      const response = await fetch(`/api/elections/dashboard/${configId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      console.log('Dashboard response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard data:', data);
        setDashboardData(data);
      } else if (response.status === 404) {
        const errorData = await response.json();
        toast({
          title: 'Nenhuma eleição ativa',
          description: errorData.error || 'Não há eleição ativa para esta configuração.',
          variant: 'destructive',
        });
        navigate('/election-dashboard');
      } else {
        throw new Error('Erro ao carregar dashboard');
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar resultados da nomeação',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!dashboardData) return 0;
    return (dashboardData.currentPosition / dashboardData.totalPositions) * 100;
  };

  const getVoterTurnout = () => {
    if (!dashboardData) return 0;
    return (dashboardData.votedVoters / dashboardData.totalVoters) * 100;
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (!dashboardData) {
    return (
      <MobileLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/election-dashboard')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma nomeação ativa</h3>
              <p className="text-muted-foreground">Não há nomeação em andamento no momento.</p>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/election-dashboard')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Pausar' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Status da Nomeação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Dashboard de Nomeações
            </CardTitle>
            <CardDescription>Acompanhe as nomeações em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total de Votantes:</span>
                <Badge variant="secondary">{dashboardData.totalVoters}</Badge>
              </div>

              <div className="flex items-center space-x-2">
                <Vote className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Votaram:</span>
                <Badge variant="secondary">{dashboardData.votedVoters}</Badge>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Progresso:</span>
                <Badge variant="secondary">
                  {dashboardData.currentPosition}/{dashboardData.totalPositions}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Participação dos Votantes</span>
                <span>{getVoterTurnout().toFixed(1)}%</span>
              </div>
              <Progress value={getVoterTurnout()} className="h-2" />
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Progresso das Nomeações</span>
                <span>{getProgressPercentage().toFixed(1)}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Resultados por Posição */}
        <div className="space-y-6">
          {(dashboardData.positions || []).map((position, index) => (
            <Card
              key={position.positionId}
              className={
                index < dashboardData.currentPosition ? 'border-green-200 bg-green-50' : ''
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    {index < dashboardData.currentPosition ? (
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    ) : index === dashboardData.currentPosition ? (
                      <Clock className="h-5 w-5 mr-2 text-orange-600" />
                    ) : (
                      <Clock className="h-5 w-5 mr-2 text-gray-400" />
                    )}
                    {position.positionName}
                  </div>
                  <Badge variant={index < dashboardData.currentPosition ? 'default' : 'secondary'}>
                    {index < dashboardData.currentPosition
                      ? 'Concluído'
                      : index === dashboardData.currentPosition
                        ? 'Em Andamento'
                        : 'Pendente'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {position.totalNominations > 0 && `${position.totalNominations} indicações • `}
                  {position.totalVotes > 0
                    ? `${position.totalVotes} votos registrados`
                    : 'Nenhum voto registrado'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {position.results.length > 0 ? (
                  <div className="space-y-3">
                    {position.results
                      .sort((a, b) => b.votes - a.votes)
                      .map((result, resultIndex) => (
                        <div
                          key={result.candidateId}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center space-x-3">
                            {resultIndex === 0 && result.votes > 0 && (
                              <Trophy className="h-5 w-5 text-yellow-500" />
                            )}
                            <div>
                              <p className="font-medium">{result.candidateName}</p>
                              <div className="text-sm text-muted-foreground space-y-1">
                                {result.nominations > 0 && (
                                  <p>
                                    📝 {result.nominations} indicação
                                    {result.nominations !== 1 ? 'ões' : ''}
                                  </p>
                                )}
                                {result.votes > 0 && (
                                  <p>
                                    🗳️ {result.votes} voto{result.votes !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {result.percentage.toFixed(1)}%
                              </span>
                              {resultIndex === 0 && result.votes > 0 && (
                                <Award className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <Progress value={result.percentage} className="w-20 h-2 mt-1" />
                          </div>
                        </div>
                      ))}

                    {position.winner && (
                      <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-800">
                            Nomeado: {position.winner.candidateName}
                          </span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          {position.winner.votes} votos ({position.winner.percentage.toFixed(1)}%)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Vote className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhum voto registrado para esta posição</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
