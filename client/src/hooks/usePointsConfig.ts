import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { hasAdminAccess } from '@/lib/permissions';

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
  };
  temLicao: {
    comLicao: number;
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
  };
  camposVaziosACMS: {
    semCamposVazios: number;
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Carregar configurações do localStorage ou backend
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Tentar carregar do backend primeiro
        const response = await fetch('/api/system/points-config');
        if (response.ok) {
          const backendConfig = await response.json();
          setConfig(backendConfig);
          // Salvar no localStorage como backup
          localStorage.setItem('pointsConfig', JSON.stringify(backendConfig));
        } else {
          // Fallback para localStorage
          const savedConfig = localStorage.getItem('pointsConfig');
          if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        // Fallback para localStorage
        const savedConfig = localStorage.getItem('pointsConfig');
        if (savedConfig) {
          setConfig(JSON.parse(savedConfig));
        }
      }
    };

    loadConfig();
  }, []);

  const saveConfig = async (newConfig: PointsConfig) => {
    setIsLoading(true);
    try {
      // Salvar no backend (agora com recálculo automático)
      const response = await fetch('/api/system/points-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar no servidor');
      }

      const result = await response.json();

      // Salvar no localStorage como backup
      localStorage.setItem('pointsConfig', JSON.stringify(newConfig));

      setConfig(newConfig);

      // Mostrar mensagem de sucesso com informações do recálculo
      if (result.updatedUsers > 0) {
        console.log(
          `✅ Configuração salva e ${result.updatedUsers} usuários atualizados automaticamente!`
        );
        toast({
          title: 'Configurações salvas!',
          description: `${result.updatedUsers} usuários tiveram seus pontos recalculados automaticamente.`,
        });
      } else {
        console.log('✅ Configuração salva com sucesso!');
        toast({
          title: 'Configurações salvas!',
          description: 'As configurações foram salvas com sucesso.',
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);

      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsLoading(false);
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
    const basicPoints = (config as any).basicPoints || 0;
    const attendancePoints = (config as any).attendancePoints || 0;
    const eventPoints = (config as any).eventPoints || 0;
    const donationPoints = (config as any).donationPoints || 0;

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
      const response = await fetch('/api/system/parameter-average');
      if (!response.ok) {
        throw new Error('Erro ao obter média atual');
      }
      const result = await response.json();
      return result.success ? parseFloat(result.currentAverage) : 0;
    } catch (error) {
      console.error('Erro ao obter média atual:', error);
      return 0;
    }
  };

  const getCurrentUserAverage = async () => {
    try {
      // WORKAROUND: Usar /api/users até resolver problema do /api/users/with-points
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Erro ao obter usuários');
      }
      const users = await response.json();

      // Filtrar apenas usuários regulares (não admin)
      const regularUsers = users.filter((user: any) => user.email !== 'admin@7care.com');

      if (regularUsers.length === 0) {
        return 0;
      }

      // Calcular média dos pontos dos usuários (usando campo points ou calculando mock)
      const totalPoints = regularUsers.reduce((sum: number, user: any) => {
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
      console.error('Erro ao calcular média dos usuários:', error);
      return 0;
    }
  };

  return {
    config,
    isLoading,
    saveConfig,
    resetConfig,
    updateConfig,
    getTotalMaxPoints,
    getConfigSummary,
    getCurrentParameterAverage,
    getCurrentUserAverage,
  };
};
