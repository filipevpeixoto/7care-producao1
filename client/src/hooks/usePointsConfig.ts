import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { hasAdminAccess } from '@/lib/permissions';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

const pointsLogger = createLogger('Points');

export interface PointsConfig {
  engajamento: {
    baixo: number;
    medio: number;
    alto: number;
  };
  classificacao: {
    frequente: number;
    naoFrequente: number;
  };
  dizimista: {
    naoDizimista: number;
    pontual: number;
    sazonal: number;
    recorrente: number;
  };
  ofertante: {
    naoOfertante: number;
    pontual: number;
    sazonal: number;
    recorrente: number;
  };
  tempoBatismo: {
    doisAnos: number;
    cincoAnos: number;
    dezAnos: number;
    vinteAnos: number;
    maisVinte: number;
  };
  cargos: {
    umCargo: number;
    doisCargos: number;
    tresOuMais: number;
  };
  nomeUnidade: {
    comUnidade: number;
    semUnidade?: number;
  };
  temLicao: {
    comLicao: number;
    semLicao?: number;
  };
  pontuacaoDinamica: {
    multiplicador: number;
  };
  totalPresenca: {
    zeroATres: number;
    quatroASete: number;
    oitoATreze: number;
  };
  escolaSabatina: {
    comunhao: number;
    missao: number;
    estudoBiblico: number;
    batizouAlguem: number;
    discipuladoPosBatismo: number;
  };
  cpfValido: {
    valido: number;
    invalido?: number;
  };
  camposVaziosACMS: {
    semCamposVazios: number;
    incompletos?: number;
  };
}

const defaultConfig: PointsConfig = {
  engajamento: {
    baixo: 10,
    medio: 25,
    alto: 50,
  },
  classificacao: {
    frequente: 75,
    naoFrequente: 25,
  },
  dizimista: {
    naoDizimista: 0,
    pontual: 25,
    sazonal: 50,
    recorrente: 100,
  },
  ofertante: {
    naoOfertante: 0,
    pontual: 25,
    sazonal: 50,
    recorrente: 100,
  },
  tempoBatismo: {
    doisAnos: 25,
    cincoAnos: 50,
    dezAnos: 100,
    vinteAnos: 150,
    maisVinte: 200,
  },
  cargos: {
    umCargo: 50,
    doisCargos: 100,
    tresOuMais: 150,
  },
  nomeUnidade: {
    comUnidade: 25,
  },
  temLicao: {
    comLicao: 50,
  },
  pontuacaoDinamica: {
    multiplicador: 5,
  },
  totalPresenca: {
    zeroATres: 25,
    quatroASete: 50,
    oitoATreze: 100,
  },
  escolaSabatina: {
    comunhao: 50,
    missao: 75,
    estudoBiblico: 100,
    batizouAlguem: 200,
    discipuladoPosBatismo: 25,
  },
  cpfValido: {
    valido: 50,
  },
  camposVaziosACMS: {
    semCamposVazios: 100,
  },
};

export const usePointsConfig = () => {
  const [config, setConfig] = useState<PointsConfig>(defaultConfig);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useAuth();

  const { data: loadedConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: queryKeys.system.pointsConfig(),
    queryFn: async () => {
      try {
        const response = await fetchWithAuth('/api/system/points-config');
        if (response.ok) {
          const backendConfig = await response.json();
          localStorage.setItem('pointsConfig', JSON.stringify(backendConfig));
          return backendConfig as PointsConfig;
        }
      } catch (error) {
        pointsLogger.error('Erro ao carregar configurações:', error);
      }

      const savedConfig = localStorage.getItem('pointsConfig');
      if (savedConfig) {
        return JSON.parse(savedConfig) as PointsConfig;
      }

      return defaultConfig;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (loadedConfig) {
      setConfig(loadedConfig);
    }
  }, [loadedConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: PointsConfig) => {
      const response = await fetchWithAuth('/api/system/points-config', {
        method: 'POST',
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar no servidor');
      }

      return response.json();
    },
  });

  const saveConfig = async (newConfig: PointsConfig) => {
    try {
      const result = await saveConfigMutation.mutateAsync(newConfig);

      localStorage.setItem('pointsConfig', JSON.stringify(newConfig));
      setConfig(newConfig);
      queryClient.setQueryData(queryKeys.system.pointsConfig(), newConfig);

      if (result.updatedUsers > 0) {
        pointsLogger.debug(
          `Configuração salva e ${result.updatedUsers} usuários atualizados automaticamente!`
        );
        toast({
          title: 'Configurações salvas!',
          description: `${result.updatedUsers} usuários tiveram seus pontos recalculados automaticamente.`,
        });
      } else {
        pointsLogger.debug('Configuração salva com sucesso!');
        toast({
          title: 'Configurações salvas!',
          description: 'As configurações foram salvas com sucesso.',
        });
      }

      return true;
    } catch (error) {
      pointsLogger.error('Erro ao salvar configurações:', error);

      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });

      return false;
    }
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('pointsConfig');

    toast({
      title: 'Configurações resetadas',
      description: 'As pontuações foram restauradas para os valores padrão.',
    });
  };

  const updateConfig = (section: keyof PointsConfig, field: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const getTotalMaxPoints = () => {
    // Pontos base (nível raiz)
    const basicPoints = 0;
    const attendancePoints = 0;
    const eventPoints = 0;
    const donationPoints = 0;

    // Pontos por categoria (apenas valores máximos)
    const categoryPoints =
      (config.engajamento?.alto || 0) +
      (config.classificacao?.frequente || 0) +
      (config.dizimista?.recorrente || 0) +
      (config.ofertante?.recorrente || 0) +
      (config.tempoBatismo?.maisVinte || 0) +
      (config.cargos?.tresOuMais || 0) +
      (config.nomeUnidade?.comUnidade || 0) +
      (config.temLicao?.comLicao || 0) +
      (config.totalPresenca?.oitoATreze || 0) +
      (config.cpfValido?.valido || 0) +
      (config.camposVaziosACMS?.semCamposVazios || 0);

    // Escola Sabatina (máximos)
    const escolaSabatinaPoints =
      (config.escolaSabatina?.comunhao || 0) +
      (config.escolaSabatina?.missao || 0) +
      (config.escolaSabatina?.estudoBiblico || 0) +
      (config.escolaSabatina?.batizouAlguem || 0) +
      (config.escolaSabatina?.discipuladoPosBatismo || 0);

    return (
      basicPoints +
      attendancePoints +
      eventPoints +
      donationPoints +
      categoryPoints +
      escolaSabatinaPoints
    );
  };

  const getConfigSummary = () => {
    return {
      totalMaxPoints: getTotalMaxPoints(),
      categoriesCount: Object.keys(config).length,
      criteriaCount: Object.values(config).reduce((total, section) => {
        return total + Object.keys(section).length;
      }, 0),
    };
  };

  const getCurrentParameterAverage = async () => {
    try {
      const response = await fetchWithAuth('/api/system/parameter-average');
      if (!response.ok) {
        throw new Error('Erro ao obter média atual');
      }
      const result = await response.json();
      return result.success ? parseFloat(result.currentAverage) : 0;
    } catch (error) {
      pointsLogger.error('Erro ao obter média atual:', error);
      return 0;
    }
  };

  const getCurrentUserAverage = async () => {
    try {
      // WORKAROUND: Usar /api/users até resolver problema do /api/users/with-points
      const response = await fetchWithAuth('/api/users');
      if (!response.ok) {
        throw new Error('Erro ao obter usuários');
      }
      const users = await response.json();

      // Filtrar apenas usuários regulares (não admin)
      const regularUsers = users.filter((user: { email: string; points?: number; role?: string }) => user.email !== 'admin@7care.com');

      if (regularUsers.length === 0) {
        return 0;
      }

      // Calcular média dos pontos dos usuários (usando campo points ou calculando mock)
      const totalPoints = regularUsers.reduce((sum: number, user: { email: string; points?: number; role?: string }) => {
        // Se o usuário tem pontos, usar; senão calcular mock baseado no role
        const points =
          user.points ||
          (hasAdminAccess(user)
            ? 1000
            : user.role === 'member'
              ? 500
              : user.role === 'missionary'
                ? 750
                : 250);
        return sum + points;
      }, 0);
      return totalPoints / regularUsers.length;
    } catch (error) {
      pointsLogger.error('Erro ao calcular média dos usuários:', error);
      return 0;
    }
  };

  return {
    config,
    isLoading: isLoadingConfig || saveConfigMutation.isPending,
    saveConfig,
    resetConfig,
    updateConfig,
    getTotalMaxPoints,
    getConfigSummary,
    getCurrentParameterAverage,
    getCurrentUserAverage,
  };
};
