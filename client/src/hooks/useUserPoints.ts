import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { type UserData } from '@/lib/pointsCalculator';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

const pointsLogger = createLogger('Points');

interface UserPointsData {
  points: number;
  userData: UserData;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  breakdown: Record<string, number>;
  total: number;
}

export const useUserPoints = () => {
  const { user } = useAuth();
  const userId = Number(user?.id);
  const hasValidUserId = Boolean(user?.id) && !Number.isNaN(userId) && userId > 0;

  const { data: pointsConfig } = useQuery({
    queryKey: queryKeys.system.pointsConfig(),
    queryFn: async () => {
      try {
        const response = await fetchWithAuth('/api/system/points-config');
        if (!response.ok) {
          return null;
        }
        return response.json();
      } catch (err) {
        pointsLogger.warn('Não foi possível carregar configuração de pontuação:', err);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.users.points(userId || 0),
    queryFn: async () => {
      if (!hasValidUserId) {
        return null;
      }

      const response = await fetchWithAuth(`/api/users/${userId}/points-details`);

      if (!response.ok) {
        if (response.status === 404) {
          pointsLogger.debug(`Usuário ${userId} não encontrado no banco de dados`);
          return null;
        }
        throw new Error(`Erro ao carregar dados de pontuação: ${response.status}`);
      }

      return response.json();
    },
    enabled: hasValidUserId,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 300000,
    refetchOnWindowFocus: true,
  });

  const data = useMemo<UserPointsData | null>(() => {
    if (!rawData) {
      return null;
    }

    const baseUserData: UserData = {
      engajamento: 'Baixo',
      classificacao: 'A resgatar',
      dizimista: 'Não dizimista',
      ofertante: 'Não ofertante',
      tempoBatismo: 0,
      cargos: [],
      nomeUnidade: undefined,
      temLicao: false,
      comunhao: 0,
      missao: 0,
      estudoBiblico: 0,
      totalPresenca: 0,
      batizouAlguem: false,
      discipuladoPosBatismo: 0,
      cpfValido: false,
      camposVaziosACMS: false,
    };

    const rawUserData = rawData.userData || baseUserData;
    const extraData = rawUserData?.extraData;
    const normalizedUserData: UserData = extraData
      ? {
          ...rawUserData,
          engajamento: extraData.engajamento || 'Baixo',
          classificacao: extraData.classificacao || 'A resgatar',
          dizimista: extraData.dizimistaType || extraData.dizimista || 'Não dizimista',
          ofertante: extraData.ofertanteType || extraData.ofertante || 'Não ofertante',
          tempoBatismo: extraData.tempoBatismoAnos || extraData.tempoBatismo || 0,
          cargos: extraData.departamentosCargos
            ? extraData.departamentosCargos.split(';').filter((c: string) => c.trim())
            : [],
          nomeUnidade: extraData.nomeUnidade ?? undefined,
          temLicao:
            extraData.temLicao === true ||
            extraData.temLicao === 'true' ||
            extraData.temLicao === 'Sim',
          comunhao: extraData.comunhao || 0,
          missao: extraData.missao || 0,
          estudoBiblico: extraData.estudoBiblico || 0,
          totalPresenca: extraData.totalPresenca || 0,
          batizouAlguem: extraData.batizouAlguem === 'Sim' || extraData.quantidadeBatizados > 0,
          discipuladoPosBatismo: extraData.discipuladoPosBatismo || 0,
          cpfValido:
            extraData.cpfValido === 'Sim' || (extraData.cpf && extraData.cpf.length === 11),
          camposVaziosACMS:
            extraData.camposVaziosACMS === 'true' || extraData.camposVaziosACMS === true,
        }
      : rawUserData;

    const apiPoints = rawData.calculatedPoints || rawData.currentPoints || 0;
    const totalPoints = apiPoints;
    const finalBreakdown = rawData.breakdown || {};

    const finalUserData = {
      ...baseUserData,
      ...normalizedUserData,
      actualPoints: totalPoints,
    };

    if (pointsConfig && typeof pointsConfig === 'object') {
      return {
        ...rawData,
        userData: finalUserData,
        points: apiPoints,
        breakdown: finalBreakdown,
        total: totalPoints,
      };
    }

    return {
      ...rawData,
      userData: finalUserData,
      points: apiPoints,
      breakdown: finalBreakdown,
      total: totalPoints,
    };
  }, [pointsConfig, rawData]);

  return {
    data,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
};
