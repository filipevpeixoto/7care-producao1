import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { type UserData } from '@/lib/pointsCalculator';

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
  breakdown: any;
  total: number;
}

export const useUserPoints = () => {
  const { user } = useAuth();
  const [data, setData] = useState<UserPointsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pointsConfig, setPointsConfig] = useState<any>(null);

  // Buscar configuração de pontuação
  useEffect(() => {
    const fetchPointsConfig = async () => {
      try {
        const response = await fetchWithAuth('/api/system/points-config');
        if (response.ok) {
          const config = await response.json();
          setPointsConfig(config);
        }
      } catch (err) {
        console.warn('Não foi possível carregar configuração de pontuação:', err);
      }
    };

    fetchPointsConfig();
  }, []);

  const fetchUserPoints = async () => {
    // Validação robusta do user.id
    const userId = Number(user?.id);
    if (!user?.id || isNaN(userId) || userId <= 0) {
      console.log('🔍 useUserPoints: No valid user ID, skipping fetch');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/users/${user.id}/points-details`);

      if (!response.ok) {
        // 404 significa usuário não encontrado - não é um erro crítico
        if (response.status === 404) {
          console.log(`🔍 useUserPoints: Usuário ${user.id} não encontrado no banco de dados`);
          setData(null);
          return;
        }
        throw new Error(`Erro ao carregar dados de pontuação: ${response.status}`);
      }

      const result = await response.json();

      // Verificar se userData existe e extrair dados de extraData
      if (!result.userData) {
        result.userData = {
          engajamento: 'Baixo',
          classificacao: 'A resgatar',
          dizimista: 'Não dizimista',
          ofertante: 'Não ofertante',
          tempoBatismo: 0,
          cargos: [],
          nomeUnidade: null,
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
      } else if (result.userData.extraData) {
        // Extrair dados de extraData para o nível raiz para compatibilidade com PointsBreakdown
        const extraData = result.userData.extraData;
        result.userData = {
          ...result.userData,
          engajamento: extraData.engajamento || 'Baixo',
          classificacao: extraData.classificacao || 'A resgatar',
          dizimista: extraData.dizimistaType || extraData.dizimista || 'Não dizimista',
          ofertante: extraData.ofertanteType || extraData.ofertante || 'Não ofertante',
          tempoBatismo: extraData.tempoBatismoAnos || extraData.tempoBatismo || 0,
          cargos: extraData.departamentosCargos
            ? extraData.departamentosCargos.split(';').filter((c: string) => c.trim())
            : [],
          nomeUnidade: extraData.nomeUnidade || null,
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
        };
      }

      // CORREÇÃO: Usar calculatedPoints ou currentPoints da API
      const apiPoints = result.calculatedPoints || result.currentPoints || 0;
      result.points = apiPoints;

      // Adicionar os pontos reais do usuário aos dados
      result.userData.actualPoints = apiPoints;

      // Se temos configuração do banco, usar ela para cálculo correto
      if (pointsConfig && typeof pointsConfig === 'object') {
        // USAR DIRETAMENTE OS PONTOS E BREAKDOWN DA API
        const totalPoints = apiPoints;

        // Usar o breakdown da API se disponível, senão calcular
        const apiBreakdown = result.breakdown;

        setData({
          ...result,
          breakdown: apiBreakdown || {},
          total: totalPoints,
        });

        // Definir actualPoints como o valor da API
        result.userData.actualPoints = totalPoints;
      } else {
        // Fallback para usar dados da API diretamente
        setData({
          ...result,
          breakdown: result.breakdown || {},
          total: apiPoints,
        });

        // Definir actualPoints como o valor da API
        result.userData.actualPoints = apiPoints;
      }
    } catch (err) {
      console.error('Erro ao buscar dados de pontuação:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPoints();
  }, [user?.id, pointsConfig]);

  // Refetch quando o usuário voltar para a aba (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        console.log('🔄 useUserPoints: Refetching on visibility change');
        fetchUserPoints();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  // Refetch automático a cada 5 minutos (reduzido de 60 segundos para evitar sobrecarga)
  useEffect(() => {
    const userId = Number(user?.id);
    if (!user?.id || isNaN(userId) || userId <= 0) return;

    const interval = setInterval(() => {
      console.log('🔄 useUserPoints: Auto-refetch interval (5 min)');
      fetchUserPoints();
    }, 300000); // 5 minutos

    return () => clearInterval(interval);
  }, [user?.id]);

  const refetch = () => {
    fetchUserPoints();
  };

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};
