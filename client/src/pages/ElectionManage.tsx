import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Users,
  Vote,
  Play,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2,
  BarChart3,
  Edit,
  Save,
  BarChart4,
  AlignLeft,
  RefreshCw,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MobileLayout } from '@/components/layout/MobileLayout';

interface Candidate {
  id: number;
  name: string;
  email: string;
  nominations: number;
  votes: number;
  percentage: number;
}

interface Position {
  position: string;
  totalNominations: number;
  winner: Candidate | null;
  results: Candidate[];
}

interface ElectionData {
  election: any;
  totalVoters: number;
  votedVoters: number;
  currentPosition: number;
  totalPositions: number;
  positions: Position[];
}

type ElectionPhase = 'nomination' | 'oral_observations' | 'voting' | 'completed';

export default function ElectionManage() {
  const { configId } = useParams<{ configId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ElectionPhase>('nomination');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [oralObservationsActive, setOralObservationsActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [cache, setCache] = useState<{ data: ElectionData; timestamp: number } | null>(null);
  const [maxNominations, setMaxNominations] = useState<number>(1);
  const [editingMaxNominations, setEditingMaxNominations] = useState(false);
  const [tempMaxNominations, setTempMaxNominations] = useState<string>('1');
  const [chartView, setChartView] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    if (!configId) {
      return () => {};
    }

    loadElectionData();

    if (!autoRefresh) {
      return () => {};
    }

    const interval = setInterval(loadElectionData, 2000); // Atualiza a cada 2 segundos para votação rápida
    return () => clearInterval(interval);
  }, [configId, autoRefresh]);

  const loadElectionData = async (forceRefresh = false) => {
    try {
      const now = Date.now();

      // Usar cache se disponível e não forçar refresh
      if (!forceRefresh && cache && now - cache.timestamp < 1500) {
        // Cache de 1.5 segundos para votação rápida
        setElectionData(cache.data);
        setLastUpdate(cache.timestamp);
        return;
      }

      const response = await fetch(`/api/elections/dashboard/${configId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setElectionData(data);
        setCache({ data, timestamp: now });
        setLastUpdate(now);

        // Usar a fase que vem do banco de dados (mais confiável)
        // A fase é controlada pelo admin através do botão "Iniciar Votação"
        if (data.currentPosition >= data.totalPositions) {
          setCurrentPhase('completed');
        } else {
          // Usar a fase do banco se disponível
          if (data.election?.current_phase) {
            setCurrentPhase(data.election.current_phase);
          } else {
            // Fallback: determinar fase baseada nos dados
            const currentPosData = data.positions[data.currentPosition];
            if (
              currentPosData &&
              currentPosData.results.some((r: { votes: number }) => r.votes > 0)
            ) {
              setCurrentPhase('voting');
            } else if (currentPosData && currentPosData.totalNominations > 0) {
              setCurrentPhase('nomination');
            } else {
              setCurrentPhase('nomination');
            }
          }
        }
      } else if (response.status === 404) {
        toast({
          title: 'Nenhuma eleição ativa',
          description: 'Não há eleição ativa para esta configuração.',
          variant: 'destructive',
        });
        navigate('/election-dashboard');
      }
    } catch (error) {
      console.error('Erro ao carregar dados da eleição:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceToVoting = async () => {
    try {
      const response = await fetch('/api/elections/advance-phase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          configId: parseInt(configId!),
          phase: 'voting',
        }),
      });

      if (response.ok) {
        setCurrentPhase('voting');
        toast({
          title: 'Votação iniciada',
          description: 'A fase de votação foi iniciada para este cargo.',
        });
        loadElectionData(true); // Forçar atualização dos dados
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Não foi possível avançar para a votação.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível avançar para a votação.',
        variant: 'destructive',
      });
    }
  };

  const handleAdvancePosition = async () => {
    try {
      const response = await fetch('/api/elections/advance-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          configId: parseInt(configId!),
          position: electionData!.currentPosition + 1,
        }),
      });

      if (response.ok) {
        setCurrentPhase('nomination');
        toast({
          title: 'Posição avançada',
          description: 'A eleição avançou para o próximo cargo.',
        });
        loadElectionData(true); // Forçar refresh após mudança de fase
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Não foi possível avançar para o próximo cargo.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível avançar para o próximo cargo.',
        variant: 'destructive',
      });
    }
  };

  const handleSkipPosition = async () => {
    try {
      const response = await fetch('/api/elections/advance-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          configId: parseInt(configId!),
          position: electionData!.currentPosition + 1,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Cargo pulado',
          description: 'A eleição avançou para o próximo cargo.',
        });
        loadElectionData(true); // Forçar refresh após mudança
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Não foi possível pular o cargo.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Erro ao pular cargo:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível pular o cargo.',
        variant: 'destructive',
      });
    }
  };

  const handleResetVoting = async () => {
    try {
      const response = await fetch('/api/elections/reset-voting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          configId: parseInt(configId!),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Votação repetida',
          description: 'A votação foi resetada. Os votantes podem votar novamente.',
        });
        loadElectionData(true); // Forçar refresh após reset
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Não foi possível repetir a votação.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível repetir a votação.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveMaxNominations = async () => {
    const newMax = parseInt(tempMaxNominations);
    if (isNaN(newMax) || newMax < 1) {
      toast({
        title: 'Valor inválido',
        description: 'O número deve ser maior que 0.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/elections/set-max-nominations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          configId: parseInt(configId!),
          maxNominations: newMax,
        }),
      });

      if (response.ok) {
        setMaxNominations(newMax);
        setEditingMaxNominations(false);
        toast({
          title: 'Configuração atualizada',
          description: `Cada votante pode fazer até ${newMax} indicação(ões).`,
        });
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    }
  };

  const toggleOralObservations = () => {
    setOralObservationsActive(!oralObservationsActive);
    toast({
      title: oralObservationsActive ? 'Observações encerradas' : 'Observações iniciadas',
      description: oralObservationsActive
        ? 'As observações orais foram encerradas.'
        : 'As observações orais foram iniciadas.',
    });
  };

  const getCurrentPositionData = () => {
    if (!electionData || electionData.currentPosition >= electionData.positions.length) {
      return null;
    }
    return electionData.positions[electionData.currentPosition];
  };

  const getPhaseProgress = () => {
    if (!electionData) return 0;
    return ((electionData.currentPosition + 1) / electionData.totalPositions) * 100;
  };

  const getVoterTurnout = () => {
    if (!electionData) return 0;
    return (electionData.votedVoters / electionData.totalVoters) * 100;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
      setZoomLevel(100); // Reset zoom when exiting fullscreen
    }
  };

  const increaseZoom = () => {
    setZoomLevel(prev => Math.min(prev + 10, 150));
  };

  const decreaseZoom = () => {
    setZoomLevel(prev => Math.max(prev - 10, 70));
  };

  // Função para calcular tamanho de fonte baseado no zoom
  const getZoomedSize = (baseSize: string) => {
    if (!isFullscreen) return baseSize;

    const sizeMap: { [key: string]: number } = {
      'text-xs': 12,
      'text-sm': 14,
      'text-base': 16,
      'text-lg': 18,
      'text-xl': 20,
      'text-2xl': 24,
      'text-3xl': 30,
      'text-4xl': 36,
    };

    const basePx = sizeMap[baseSize] || 16;
    const zoomedPx = (basePx * zoomLevel) / 100;
    return `${zoomedPx}px`;
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setZoomLevel(100); // Reset zoom when exiting fullscreen
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loading) {
    return (
      <MobileLayout fullscreen={isFullscreen}>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando eleição...</span>
        </div>
      </MobileLayout>
    );
  }

  if (!electionData) {
    return (
      <MobileLayout fullscreen={isFullscreen}>
        <div className="p-4 text-center">
          <Alert>
            <AlertDescription>Não foi possível carregar os dados da eleição.</AlertDescription>
          </Alert>
        </div>
      </MobileLayout>
    );
  }

  const currentPosData = getCurrentPositionData();
  const isLastPosition = electionData.currentPosition >= electionData.totalPositions - 1;

  return (
    <MobileLayout fullscreen={isFullscreen}>
      <div
        className={`${isFullscreen ? 'h-screen overflow-hidden' : ''} transition-all duration-300`}
        style={isFullscreen ? { fontSize: `${zoomLevel}%` } : {}}
      >
        <div className={`${isFullscreen ? 'p-2 space-y-2 h-full' : 'p-4 space-y-6'}`}>
          {/* Header */}
          <div className={`flex items-center justify-between ${isFullscreen ? 'mb-2' : ''}`}>
            <div className="flex items-center gap-3">
              <Settings className={`${isFullscreen ? 'h-6 w-6' : 'h-8 w-8'} text-purple-600`} />
              <div>
                <h1
                  className="font-bold"
                  style={{ fontSize: isFullscreen ? getZoomedSize('text-xl') : undefined }}
                >
                  Gerenciar Eleição
                </h1>
                <p
                  className="text-muted-foreground"
                  style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                >
                  {electionData.election.church_name}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {isFullscreen && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={decreaseZoom}
                    className="h-8 px-2"
                    disabled={zoomLevel <= 70}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={increaseZoom}
                    className="h-8 px-2"
                    disabled={zoomLevel >= 150}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center px-2 text-sm text-muted-foreground">
                    {zoomLevel}%
                  </div>
                </>
              )}
              <Button
                variant="outline"
                size={isFullscreen ? 'sm' : 'sm'}
                onClick={toggleFullscreen}
                className={isFullscreen ? 'h-8 px-2' : ''}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                <span className={isFullscreen ? 'hidden' : 'ml-2'}>
                  {isFullscreen ? 'Sair' : 'Tela Cheia'}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={isFullscreen ? 'h-8 px-2' : ''}
              >
                <Loader2
                  className={`h-4 w-4 ${isFullscreen ? '' : 'mr-2'} ${autoRefresh ? 'animate-spin' : ''}`}
                />
                <span className={isFullscreen ? 'hidden' : ''}>
                  {autoRefresh ? 'Pausar' : 'Atualizar'}
                </span>
              </Button>
            </div>
          </div>

          {/* Progress Overview */}
          <Card className={isFullscreen ? 'mb-2' : ''}>
            <CardHeader className={isFullscreen ? 'pb-2' : ''}>
              <CardTitle
                className="flex items-center gap-2"
                style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
              >
                <BarChart3 className={`${isFullscreen ? 'h-5 w-5' : 'h-5 w-5'}`} />
                Progresso da Eleição
              </CardTitle>
            </CardHeader>
            <CardContent className={`${isFullscreen ? 'space-y-2' : 'space-y-4'}`}>
              <div className={`grid ${isFullscreen ? 'grid-cols-4 gap-2' : 'grid-cols-2 gap-4'}`}>
                <div className="text-center">
                  <div
                    className="font-bold text-blue-600"
                    style={{ fontSize: isFullscreen ? getZoomedSize('text-xl') : undefined }}
                  >
                    {electionData.currentPosition + 1} / {electionData.totalPositions}
                  </div>
                  <div
                    className="text-muted-foreground"
                    style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                  >
                    Cargos
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="font-bold text-green-600"
                    style={{ fontSize: isFullscreen ? getZoomedSize('text-xl') : undefined }}
                  >
                    {electionData.votedVoters} / {electionData.totalVoters}
                  </div>
                  <div
                    className="text-muted-foreground"
                    style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                  >
                    Votantes
                  </div>
                </div>
                {isFullscreen && (
                  <>
                    <div className="text-center">
                      <div
                        className="font-bold text-purple-600"
                        style={{ fontSize: getZoomedSize('text-xl') }}
                      >
                        {Math.round(getPhaseProgress())}%
                      </div>
                      <div
                        className="text-muted-foreground"
                        style={{ fontSize: getZoomedSize('text-sm') }}
                      >
                        Progresso
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className="font-bold text-orange-600"
                        style={{ fontSize: getZoomedSize('text-xl') }}
                      >
                        {Math.round(getVoterTurnout())}%
                      </div>
                      <div
                        className="text-muted-foreground"
                        style={{ fontSize: getZoomedSize('text-sm') }}
                      >
                        Participação
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!isFullscreen && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso Geral</span>
                      <span>{Math.round(getPhaseProgress())}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${getPhaseProgress()}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Participação</span>
                      <span>{Math.round(getVoterTurnout())}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-green-600 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${getVoterTurnout()}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Configuração de Indicações */}
          {currentPhase === 'nomination' && (
            <Card className={`border-purple-200 bg-purple-50 ${isFullscreen ? 'mb-2' : ''}`}>
              <CardContent className={isFullscreen ? 'p-2' : 'p-4'}>
                <div
                  className={`flex items-center justify-between gap-4 ${isFullscreen ? 'flex-col gap-2' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Settings
                      className={`${isFullscreen ? 'h-4 w-4' : 'h-4 w-4'} text-purple-600`}
                    />
                    <span
                      className="font-medium text-purple-900"
                      style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                    >
                      {isFullscreen ? 'Máx. indicações:' : 'Máximo de indicações por votante:'}
                    </span>
                  </div>

                  {editingMaxNominations ? (
                    <div
                      className={`flex items-center gap-2 ${isFullscreen ? 'w-full justify-center' : ''}`}
                    >
                      <Input
                        type="number"
                        min="1"
                        value={tempMaxNominations}
                        onChange={e => setTempMaxNominations(e.target.value)}
                        className={`${isFullscreen ? 'w-16 h-6 text-xs' : 'w-20 h-8'} text-center`}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveMaxNominations}
                        className={`${isFullscreen ? 'h-8 px-3 text-sm' : 'h-8'} bg-purple-600 hover:bg-purple-700`}
                      >
                        <Save className={`${isFullscreen ? 'h-3 w-3' : 'h-3 w-3'} mr-1`} />
                        {isFullscreen ? '' : 'Salvar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMaxNominations(false);
                          setTempMaxNominations(maxNominations.toString());
                        }}
                        className={isFullscreen ? 'h-8 px-3 text-sm' : 'h-8'}
                      >
                        {isFullscreen ? '' : 'Cancelar'}
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-2 ${isFullscreen ? 'w-full justify-center' : ''}`}
                    >
                      <Badge
                        variant="secondary"
                        className="px-2 py-1 font-bold"
                        style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                      >
                        {maxNominations}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMaxNominations(true);
                          setTempMaxNominations(maxNominations.toString());
                        }}
                        className={isFullscreen ? 'h-8 px-3 text-sm' : 'h-8'}
                      >
                        <Edit className={`${isFullscreen ? 'h-3 w-3' : 'h-3 w-3'} mr-1`} />
                        {isFullscreen ? '' : 'Editar'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Position */}
          {currentPosData && (
            <Card className={`${isFullscreen ? 'flex-1 flex flex-col' : ''}`}>
              <CardHeader className={isFullscreen ? 'pb-2' : ''}>
                <CardTitle
                  className="flex items-center gap-2"
                  style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
                >
                  <Vote className={`${isFullscreen ? 'h-5 w-5' : 'h-5 w-5'}`} />
                  {currentPosData.position}
                  <Badge
                    variant={currentPhase === 'completed' ? 'default' : 'secondary'}
                    style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                  >
                    {currentPhase === 'nomination' && 'Indicação'}
                    {currentPhase === 'voting' && 'Votação'}
                    {currentPhase === 'completed' && 'Concluído'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent
                className={`${isFullscreen ? 'space-y-2 flex-1 overflow-auto' : 'space-y-4'}`}
              >
                {/* Nomination Results */}
                <div className="space-y-3">
                  <div
                    className={`flex items-center justify-between ${isFullscreen ? 'mb-2' : 'mb-4'}`}
                  >
                    <h4
                      className="font-semibold"
                      style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
                    >
                      Candidatos Indicados
                    </h4>

                    {/* Botões de Visualização */}
                    {currentPhase === 'voting' && currentPosData.results.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={chartView === 'horizontal' ? 'default' : 'outline'}
                          onClick={() => setChartView('horizontal')}
                          className="h-8"
                        >
                          <AlignLeft className={`h-4 w-4 ${isFullscreen ? '' : 'mr-1'}`} />
                          <span className={isFullscreen ? 'hidden' : ''}>Barras horizontal</span>
                        </Button>
                        <Button
                          size="sm"
                          variant={chartView === 'vertical' ? 'default' : 'outline'}
                          onClick={() => setChartView('vertical')}
                          className="h-8"
                        >
                          <BarChart4 className={`h-4 w-4 ${isFullscreen ? '' : 'mr-1'}`} />
                          <span className={isFullscreen ? 'hidden' : ''}>Barra Vertical</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {currentPosData.results.length === 0 ? (
                    <p
                      className="text-muted-foreground text-center py-2"
                      style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
                    >
                      Aguardando indicações...
                    </p>
                  ) : currentPhase === 'voting' && chartView === 'vertical' ? (
                    // GRÁFICO DE BARRAS VERTICAL (Barra Vertical) - CSS PURO
                    <div className="space-y-4">
                      {(() => {
                        // Calcular altura dinâmica baseada na barra mais alta
                        const maxVotes = Math.max(...currentPosData.results.map(c => c.votes), 1);
                        const maxBarHeight = maxVotes > 0 ? (maxVotes / maxVotes) * 300 + 20 : 20;
                        const containerHeight = Math.max(400, maxBarHeight + 160); // 160px para números + nomes + padding

                        return (
                          <div
                            className="chart-container"
                            style={{
                              display: 'flex',
                              alignItems: 'end',
                              justifyContent: 'space-around',
                              gap: '16px',
                              height: `${containerHeight}px`,
                              padding: '20px',
                              backgroundColor: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              minHeight: '400px',
                            }}
                          >
                            {currentPosData.results
                              .sort((a, b) => b.votes - a.votes)
                              .map((candidate, index) => {
                                const barHeight =
                                  candidate.votes === 0
                                    ? 20
                                    : (candidate.votes / maxVotes) * 300 + 20;
                                const colors = [
                                  '#3b82f6',
                                  '#10b981',
                                  '#8b5cf6',
                                  '#f59e0b',
                                  '#ec4899',
                                ];
                                const color = colors[index % colors.length];

                                return (
                                  <div
                                    key={candidate.id}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      flex: 1,
                                      maxWidth: '120px',
                                    }}
                                  >
                                    {/* Números no topo */}
                                    <div
                                      style={{
                                        textAlign: 'center',
                                        marginBottom: '8px',
                                        minHeight: '80px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'end',
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: '24px',
                                          fontWeight: 'bold',
                                          color: '#1f2937',
                                          marginBottom: '4px',
                                        }}
                                      >
                                        {candidate.votes}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '12px',
                                          color: '#6b7280',
                                        }}
                                      >
                                        {candidate.percentage.toFixed(1)}%
                                      </div>
                                    </div>

                                    {/* Container da barra */}
                                    <div
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'end',
                                        flex: 1,
                                      }}
                                    >
                                      {/* Barra vertical */}
                                      <div
                                        style={{
                                          width: '100%',
                                          backgroundColor: color,
                                          borderRadius: '4px 4px 0 0',
                                          transition: 'all 0.5s ease',
                                          display: 'flex',
                                          alignItems: 'end',
                                          justifyContent: 'center',
                                          paddingBottom: '8px',
                                          minHeight: candidate.votes === 0 ? '20px' : 'auto',
                                          height: `${barHeight}px`,
                                        }}
                                      ></div>
                                    </div>

                                    {/* Nome do candidato */}
                                    <div
                                      style={{
                                        marginTop: '8px',
                                        textAlign: 'center',
                                        width: '100%',
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: '16px',
                                          fontWeight: '600',
                                          color: '#1f2937',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                        title={candidate.name}
                                      >
                                        {candidate.name.split(' ')[0]}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '14px',
                                          fontWeight: '500',
                                          color: '#6b7280',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                        title={candidate.name}
                                      >
                                        {candidate.name.split(' ').slice(1).join(' ')}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        );
                      })()}
                      <div
                        className="text-center text-muted-foreground"
                        style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                      >
                        <strong>{electionData.votedVoters}</strong> de{' '}
                        <strong>{electionData.totalVoters}</strong> votantes já votaram
                        {electionData.totalVoters - electionData.votedVoters > 0 &&
                          ` • Faltam ${electionData.totalVoters - electionData.votedVoters} votos`}
                      </div>
                    </div>
                  ) : (
                    // VISUALIZAÇÃO HORIZONTAL (Barras Laterais) - Padrão
                    <div className={`${isFullscreen ? 'space-y-2' : 'space-y-3'}`}>
                      {currentPosData.results
                        .sort((a, b) => {
                          // Durante a votação, ordenar por número de votos (maior primeiro)
                          if (currentPhase === 'voting') {
                            return b.votes - a.votes;
                          }
                          // Durante nomeação, ordenar alfabeticamente
                          return a.name.localeCompare(b.name);
                        })
                        .map(candidate => (
                          <div
                            key={candidate.id}
                            className={`${isFullscreen ? 'p-2' : 'p-4'} bg-gray-50 rounded-lg`}
                          >
                            <div
                              className={`flex items-center justify-between ${isFullscreen ? 'mb-1' : 'mb-2'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`${isFullscreen ? 'w-7 h-7' : 'w-8 h-8'} bg-blue-100 rounded-full flex items-center justify-center`}
                                >
                                  <span
                                    className={`text-blue-600 font-semibold ${isFullscreen ? 'text-sm' : 'text-sm'}`}
                                  >
                                    {candidate.nominations}
                                  </span>
                                </div>
                                <span
                                  className="font-medium"
                                  style={{
                                    fontSize: isFullscreen ? getZoomedSize('text-base') : undefined,
                                  }}
                                >
                                  {candidate.name}
                                </span>
                              </div>
                              {currentPhase === 'voting' && (
                                <div className="text-right">
                                  <div
                                    className="font-bold text-green-600"
                                    style={{
                                      fontSize: isFullscreen ? getZoomedSize('text-xl') : undefined,
                                    }}
                                  >
                                    {candidate.votes}
                                  </div>
                                  <div
                                    className="text-muted-foreground"
                                    style={{
                                      fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined,
                                    }}
                                  >
                                    {candidate.percentage.toFixed(1)}%
                                  </div>
                                </div>
                              )}
                            </div>

                            {currentPhase === 'voting' && (
                              <div className={`${isFullscreen ? 'space-y-1' : 'space-y-2'}`}>
                                <div
                                  className="flex justify-between"
                                  style={{
                                    fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined,
                                  }}
                                >
                                  <span>Votos</span>
                                  <span>
                                    {candidate.votes} / {electionData.totalVoters}
                                  </span>
                                </div>
                                <div
                                  className={`w-full bg-gray-200 rounded-full ${isFullscreen ? 'h-2' : 'h-4'}`}
                                >
                                  <div
                                    className={`bg-green-500 ${isFullscreen ? 'h-2' : 'h-4'} rounded-full transition-all duration-500`}
                                    style={{ width: `${candidate.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      {currentPhase === 'voting' &&
                        electionData.totalVoters - electionData.votedVoters > 0 && (
                          <div
                            className="text-muted-foreground text-center bg-amber-50 rounded-lg border border-amber-200 py-1"
                            style={{
                              fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined,
                            }}
                          >
                            {electionData.totalVoters - electionData.votedVoters} votantes ainda não
                            votaram
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Phase Controls */}
                <div className={`flex flex-wrap gap-2 ${isFullscreen ? 'pt-2' : 'pt-4'} border-t`}>
                  {currentPhase === 'nomination' && (
                    <div className="flex gap-2">
                      {currentPosData.totalNominations > 0 && (
                        <Button
                          onClick={handleAdvanceToVoting}
                          className={`bg-green-600 hover:bg-green-700 ${isFullscreen ? 'h-9 px-4 text-base' : ''}`}
                        >
                          <Play className={`${isFullscreen ? 'h-4 w-4 mr-1' : 'h-4 w-4 mr-2'}`} />
                          {isFullscreen ? 'Iniciar' : 'Iniciar Votação'}
                        </Button>
                      )}
                      <Button
                        onClick={handleSkipPosition}
                        variant="outline"
                        className={`border-blue-300 text-blue-700 hover:bg-blue-50 ${isFullscreen ? 'h-9 px-4 text-base' : ''}`}
                      >
                        <ArrowRight
                          className={`${isFullscreen ? 'h-4 w-4 mr-1' : 'h-4 w-4 mr-2'}`}
                        />
                        {isFullscreen
                          ? isLastPosition
                            ? 'Finalizar'
                            : 'Próximo'
                          : isLastPosition
                            ? 'Finalizar Eleição'
                            : 'Próximo Cargo'}
                      </Button>
                    </div>
                  )}

                  {currentPhase === 'voting' && (
                    <>
                      {electionData.votedVoters >= electionData.totalVoters && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={handleAdvancePosition}
                            className={`bg-blue-600 hover:bg-blue-700 ${isFullscreen ? 'h-9 px-4 text-base' : ''}`}
                          >
                            <ArrowRight
                              className={`${isFullscreen ? 'h-4 w-4 mr-1' : 'h-4 w-4 mr-2'}`}
                            />
                            {isFullscreen
                              ? isLastPosition
                                ? 'Finalizar'
                                : 'Próximo'
                              : isLastPosition
                                ? 'Finalizar Eleição'
                                : 'Próximo Cargo'}
                          </Button>

                          <Button
                            onClick={handleResetVoting}
                            variant="outline"
                            className={`border-orange-300 text-orange-700 hover:bg-orange-50 ${isFullscreen ? 'h-9 px-4 text-base' : ''}`}
                          >
                            <RefreshCw
                              className={`${isFullscreen ? 'h-4 w-4 mr-1' : 'h-4 w-4 mr-2'}`}
                            />
                            {isFullscreen ? 'Repetir' : 'Repetir Votação'}
                          </Button>
                        </div>
                      )}

                      {electionData.votedVoters < electionData.totalVoters && (
                        <div
                          className="text-amber-600 bg-amber-50 rounded-lg border border-amber-200 p-2"
                          style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                        >
                          <strong>Aguardando votos:</strong> {electionData.votedVoters} de{' '}
                          {electionData.totalVoters} votantes já votaram.
                          {!isFullscreen && (
                            <>
                              <br />
                              <span className="text-xs">
                                Todos os votantes devem votar antes de avançar.
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Voting Status */}
                {currentPhase === 'voting' && !isFullscreen && (
                  <Alert
                    className={
                      electionData.votedVoters >= electionData.totalVoters
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                    }
                  >
                    <Clock className="h-4 w-4" />
                    <AlertDescription
                      className={
                        electionData.votedVoters >= electionData.totalVoters
                          ? 'text-green-800'
                          : 'text-amber-800'
                      }
                    >
                      <strong>Status da Votação:</strong> {electionData.votedVoters} de{' '}
                      {electionData.totalVoters} votantes votaram
                      {electionData.votedVoters >= electionData.totalVoters
                        ? ' - Todos os votos foram computados!'
                        : ` - Faltam ${electionData.totalVoters - electionData.votedVoters} votos`}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Winner Display */}
                {currentPosData.winner && !isFullscreen && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Eleito:</strong> {currentPosData.winner.name} com{' '}
                      {currentPosData.winner.votes} votos (
                      {Math.round(currentPosData.winner.percentage)}%)
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions for Voters */}
          {!isFullscreen && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Instruções para Votantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-blue-700 space-y-2">
                  {currentPhase === 'nomination' && (
                    <>
                      <p>
                        <strong>1.</strong> Acesse o link da eleição em seu celular
                      </p>
                      <p>
                        <strong>2.</strong> Selecione quem você indica para{' '}
                        <strong>{currentPosData?.position}</strong>
                      </p>
                      <p>
                        <strong>3.</strong> Clique em "Indicar"
                      </p>
                      <p>
                        <strong>4.</strong> Após as indicações, clique em "Iniciar Votação"
                      </p>
                    </>
                  )}

                  {currentPhase === 'voting' && (
                    <>
                      <p>
                        <strong>1.</strong> Acesse o link da eleição em seu celular
                      </p>
                      <p>
                        <strong>2.</strong> Selecione quem você escolhe para{' '}
                        <strong>{currentPosData?.position}</strong>
                      </p>
                      <p>
                        <strong>3.</strong> Clique em "Votar"
                      </p>
                      <p>
                        <strong>4.</strong> Acompanhe os resultados em tempo real
                      </p>
                    </>
                  )}

                  {currentPhase === 'completed' && (
                    <p>
                      <strong>Eleição finalizada!</strong> Todos os cargos foram eleitos com
                      sucesso.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Real-time Updates */}
          {!isFullscreen && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Esta tela é atualizada automaticamente a cada 2 segundos para mostrar os resultados
                em tempo real.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
