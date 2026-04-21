import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/lib/api';
import type { ElectionData, ElectionPhase } from './electionManageTypes';
import { electionLogger } from '@/lib/logger';

const normalizeElectionData = (raw: unknown): ElectionData | null => {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Partial<ElectionData> & {
    election?: Partial<ElectionData['election']>;
    positions?: unknown;
  };

  const positions = Array.isArray(data.positions) ? data.positions : [];
  const safeCurrentPosition =
    typeof data.currentPosition === 'number' && Number.isFinite(data.currentPosition)
      ? data.currentPosition
      : 0;
  const safeTotalPositions =
    typeof data.totalPositions === 'number' && Number.isFinite(data.totalPositions)
      ? data.totalPositions
      : positions.length;

  return {
    election: {
      id: typeof data.election?.id === 'number' ? data.election.id : 0,
      config_id: typeof data.election?.config_id === 'number' ? data.election.config_id : 0,
      church_name: data.election?.church_name,
      status: data.election?.status || 'draft',
      current_position:
        typeof data.election?.current_position === 'number' ? data.election.current_position : 0,
      positions: Array.isArray(data.election?.positions) ? data.election.positions : [],
      voters: Array.isArray(data.election?.voters) ? data.election.voters : [],
      created_at: data.election?.created_at,
    },
    totalVoters: typeof data.totalVoters === 'number' ? data.totalVoters : 0,
    votedVoters: typeof data.votedVoters === 'number' ? data.votedVoters : 0,
    currentPosition: safeCurrentPosition,
    totalPositions: safeTotalPositions,
    positions: positions.map((position) => {
      const item = (position && typeof position === 'object' ? position : {}) as Record<
        string,
        unknown
      >;
      return {
        position: typeof item.position === 'string' ? item.position : 'Cargo',
        totalNominations: typeof item.totalNominations === 'number' ? item.totalNominations : 0,
        winner:
          item.winner && typeof item.winner === 'object'
            ? (item.winner as ElectionData['positions'][number]['winner'])
            : null,
        results: Array.isArray(item.results)
          ? (item.results as ElectionData['positions'][number]['results'])
          : [],
      };
    }),
  };
};

export const useElectionManageState = (configId?: string) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ElectionPhase>('nomination');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [, setLastUpdate] = useState<number>(0);
  const [cache, setCache] = useState<{ data: ElectionData; timestamp: number } | null>(null);
  const [maxNominations, setMaxNominations] = useState<number>(1);
  const [editingMaxNominations, setEditingMaxNominations] = useState(false);
  const [tempMaxNominations, setTempMaxNominations] = useState<string>('1');
  const [chartView, setChartView] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const loadElectionData = useCallback(
    async (forceRefresh = false) => {
      try {
        const now = Date.now();

        if (!forceRefresh && cache && now - cache.timestamp < 1500) {
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
          const rawData = await response.json();
          const data = normalizeElectionData(rawData);
          if (!data) {
            throw new Error('Invalid election data');
          }
          setElectionData(data);
          setCache({ data, timestamp: now });
          setLastUpdate(now);

          const electionPhase = (
            data.election as typeof data.election & {
              current_phase?: ElectionPhase;
            }
          ).current_phase;

          if (data.currentPosition >= data.totalPositions) {
            setCurrentPhase('completed');
          } else {
            if (electionPhase) {
              setCurrentPhase(electionPhase);
            } else {
              const currentPosData = data.positions[data.currentPosition];
              if (
                currentPosData &&
                currentPosData.results.some((r: { votes?: number }) => (r?.votes || 0) > 0)
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
        electionLogger.error('Erro ao carregar dados da eleição:', error);
      } finally {
        setLoading(false);
      }
    },
    [cache, configId, navigate, toast]
  );

  useEffect(() => {
    if (!configId) {
      return;
    }

    loadElectionData();

    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(loadElectionData, 2000);
    return () => clearInterval(interval);
  }, [configId, autoRefresh, loadElectionData]);

  const handleAdvanceToVoting = async () => {
    try {
      const response = await fetchWithAuth('/api/elections/advance-phase', {
        method: 'POST',
        body: JSON.stringify({
          configId: parseInt(configId || '0'),
          phase: 'voting',
        }),
      });

      if (response.ok) {
        setCurrentPhase('voting');
        toast({
          title: 'Votação iniciada',
          description: 'A fase de votação foi iniciada para este cargo.',
        });
        loadElectionData(true);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Não foi possível avançar para a votação.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível avançar para a votação.',
        variant: 'destructive',
      });
    }
  };

  const handleAdvancePosition = async () => {
    try {
      const response = await fetchWithAuth('/api/elections/advance-position', {
        method: 'POST',
        body: JSON.stringify({
          configId: parseInt(configId || '0'),
          position: (electionData?.currentPosition || 0) + 1,
        }),
      });

      if (response.ok) {
        setCurrentPhase('nomination');
        toast({
          title: 'Posição avançada',
          description: 'A eleição avançou para o próximo cargo.',
        });
        loadElectionData(true);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Não foi possível avançar para o próximo cargo.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível avançar para o próximo cargo.',
        variant: 'destructive',
      });
    }
  };

  const handleSkipPosition = async () => {
    try {
      const response = await fetchWithAuth('/api/elections/advance-position', {
        method: 'POST',
        body: JSON.stringify({
          configId: parseInt(configId || '0'),
          position: (electionData?.currentPosition || 0) + 1,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Cargo pulado',
          description: 'A eleição avançou para o próximo cargo.',
        });
        loadElectionData(true);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Não foi possível pular o cargo.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      electionLogger.error('Erro ao pular cargo:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível pular o cargo.',
        variant: 'destructive',
      });
    }
  };

  const handleResetVoting = async () => {
    try {
      const response = await fetchWithAuth('/api/elections/reset-voting', {
        method: 'POST',
        body: JSON.stringify({
          configId: parseInt(configId || '0'),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Votação repetida',
          description: 'A votação foi resetada. Os votantes podem votar novamente.',
        });
        loadElectionData(true);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Não foi possível repetir a votação.',
          variant: 'destructive',
        });
      }
    } catch {
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
      const response = await fetchWithAuth('/api/elections/set-max-nominations', {
        method: 'POST',
        body: JSON.stringify({
          configId: parseInt(configId || '0'),
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
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    }
  };

  const getCurrentPositionData = () => {
    if (!electionData || !Array.isArray(electionData.positions)) {
      return null;
    }
    if (electionData.currentPosition >= electionData.positions.length) {
      return null;
    }
    return electionData.positions[electionData.currentPosition];
  };

  const getPhaseProgress = () => {
    if (!electionData) return 0;
    if (!electionData.totalPositions) return 0;
    return ((electionData.currentPosition + 1) / electionData.totalPositions) * 100;
  };

  const getVoterTurnout = () => {
    if (!electionData) return 0;
    if (!electionData.totalVoters) return 0;
    return (electionData.votedVoters / electionData.totalVoters) * 100;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
      setZoomLevel(100);
    }
  };

  const increaseZoom = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 150));
  };

  const decreaseZoom = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 70));
  };

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
        setZoomLevel(100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return {
    electionData,
    currentPhase,
    loading,
    autoRefresh,
    maxNominations,
    editingMaxNominations,
    tempMaxNominations,
    chartView,
    isFullscreen,
    zoomLevel,
    setAutoRefresh,
    setEditingMaxNominations,
    setTempMaxNominations,
    setChartView,
    loadElectionData,
    handleAdvanceToVoting,
    handleAdvancePosition,
    handleSkipPosition,
    handleResetVoting,
    handleSaveMaxNominations,
    getCurrentPositionData,
    getPhaseProgress,
    getVoterTurnout,
    toggleFullscreen,
    increaseZoom,
    decreaseZoom,
    getZoomedSize,
  };
};
