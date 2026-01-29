import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  TrendingUp,
  Users,
  Gift,
  Heart,
  Calendar,
  Award,
  CheckCircle,
  Book,
  Crown,
  Star,
  Mountain,
  Save,
  RefreshCw,
  AlertTriangle,
  Calculator,
  Loader2,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface PointsConfig {
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
    baixo: 200,
    medio: 400,
    alto: 600,
  },
  classificacao: {
    frequente: 300,
    naoFrequente: 150,
  },
  dizimista: {
    naoDizimista: 0,
    pontual: 100,
    sazonal: 200,
    recorrente: 300,
  },
  ofertante: {
    naoOfertante: 0,
    pontual: 60,
    sazonal: 120,
    recorrente: 180,
  },
  tempoBatismo: {
    doisAnos: 100,
    cincoAnos: 200,
    dezAnos: 400,
    vinteAnos: 600,
    maisVinte: 800,
  },
  cargos: {
    umCargo: 200,
    doisCargos: 400,
    tresOuMais: 600,
  },
  nomeUnidade: {
    comUnidade: 100,
  },
  temLicao: {
    comLicao: 120,
  },
  pontuacaoDinamica: {
    multiplicador: 25,
  },
  totalPresenca: {
    zeroATres: 0,
    quatroASete: 200,
    oitoATreze: 400,
  },
  escolaSabatina: {
    comunhao: 40,
    missao: 60,
    estudoBiblico: 20,
    batizouAlguem: 400,
    discipuladoPosBatismo: 80,
  },
  cpfValido: {
    valido: 100,
  },
  camposVaziosACMS: {
    semCamposVazios: 200,
  },
};

export const PointsConfiguration = () => {
  const [config, setConfig] = useState<PointsConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [targetAverage, setTargetAverage] = useState<string>('595');
  const [isCalculatingPreset, setIsCalculatingPreset] = useState(false);
  const [currentAverage, setCurrentAverage] = useState<number | null>(null);

  // Carregar configurações do backend
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsInitialLoading(true);
        const response = await fetch('/api/system/points-config');
        if (response.ok) {
          const backendConfig = await response.json();

          // CORREÇÃO: Sempre mesclar com valores padrão para garantir que não há campos vazios
          const configCompleta: PointsConfig = {
            engajamento: {
              baixo: backendConfig.engajamento?.baixo ?? 50,
              medio: backendConfig.engajamento?.medio ?? 100,
              alto: backendConfig.engajamento?.alto ?? 200,
            },
            classificacao: {
              frequente: backendConfig.classificacao?.frequente ?? 100,
              naoFrequente: backendConfig.classificacao?.naoFrequente ?? 50,
            },
            dizimista: {
              naoDizimista: backendConfig.dizimista?.naoDizimista ?? 0,
              pontual: backendConfig.dizimista?.pontual ?? 25,
              sazonal: backendConfig.dizimista?.sazonal ?? 50,
              recorrente: backendConfig.dizimista?.recorrente ?? 100,
            },
            ofertante: {
              naoOfertante: backendConfig.ofertante?.naoOfertante ?? 0,
              pontual: backendConfig.ofertante?.pontual ?? 15,
              sazonal: backendConfig.ofertante?.sazonal ?? 30,
              recorrente: backendConfig.ofertante?.recorrente ?? 60,
            },
            tempoBatismo: {
              doisAnos:
                backendConfig.tempoBatismo?.doisAnos ?? backendConfig.tempobatismo?.doisAnos ?? 25,
              cincoAnos:
                backendConfig.tempoBatismo?.cincoAnos ??
                backendConfig.tempobatismo?.cincoAnos ??
                50,
              dezAnos:
                backendConfig.tempoBatismo?.dezAnos ?? backendConfig.tempobatismo?.dezAnos ?? 100,
              vinteAnos:
                backendConfig.tempoBatismo?.vinteAnos ??
                backendConfig.tempobatismo?.vinteAnos ??
                150,
              maisVinte:
                backendConfig.tempoBatismo?.maisVinte ??
                backendConfig.tempobatismo?.maisVinte ??
                200,
            },
            cargos: {
              umCargo: backendConfig.cargos?.umCargo ?? 50,
              doisCargos: backendConfig.cargos?.doisCargos ?? 100,
              tresOuMais: backendConfig.cargos?.tresOuMais ?? 150,
            },
            nomeUnidade: {
              comUnidade:
                backendConfig.nomeUnidade?.comUnidade ??
                backendConfig.nomeunidade?.comUnidade ??
                25,
            },
            temLicao: {
              comLicao: backendConfig.temLicao?.comLicao ?? backendConfig.temlicao?.comLicao ?? 30,
            },
            pontuacaoDinamica: {
              multiplicador: backendConfig.pontuacaoDinamica?.multiplicador ?? 5,
            },
            totalPresenca: {
              zeroATres:
                backendConfig.totalPresenca?.zeroATres ??
                backendConfig.totalpresenca?.zeroATres ??
                25,
              quatroASete:
                backendConfig.totalPresenca?.quatroASete ??
                backendConfig.totalpresenca?.quatroASete ??
                50,
              oitoATreze:
                backendConfig.totalPresenca?.oitoATreze ??
                backendConfig.totalpresenca?.oitoATreze ??
                100,
            },
            escolaSabatina: {
              comunhao:
                backendConfig.escolaSabatina?.comunhao ??
                backendConfig.escolasabatina?.comunhao ??
                10,
              missao:
                backendConfig.escolaSabatina?.missao ?? backendConfig.escolasabatina?.missao ?? 15,
              estudoBiblico:
                backendConfig.escolaSabatina?.estudoBiblico ??
                backendConfig.escolasabatina?.estudoBiblico ??
                20,
              batizouAlguem:
                backendConfig.escolaSabatina?.batizouAlguem ??
                backendConfig.escolasabatina?.batizouAlguem ??
                100,
              discipuladoPosBatismo:
                backendConfig.escolaSabatina?.discipuladoPosBatismo ??
                backendConfig.escolasabatina?.discipuladoPosBatismo ??
                25,
            },
            cpfValido: {
              valido: backendConfig.cpfValido?.valido ?? backendConfig.cpfvalido?.valido ?? 25,
            },
            camposVaziosACMS: {
              semCamposVazios:
                backendConfig.camposVaziosACMS?.semCamposVazios ??
                backendConfig.camposvaziosacms?.completos ??
                50,
            },
          };

          setConfig(configCompleta);
          // Configuração carregada e mesclada com valores padrão
        } else {
          console.log('Usando configuração padrão');
          setConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setConfig(defaultConfig);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Função para calcular preset automaticamente baseado na média desejada
  const handleCalculateAutomaticPreset = async () => {
    const targetValue = parseFloat(targetAverage);

    if (isNaN(targetValue) || targetValue <= 0) {
      toast({
        title: '❌ Valor inválido',
        description: 'Por favor, insira uma média válida maior que 0.',
        variant: 'destructive',
      });
      return;
    }

    setIsCalculatingPreset(true);

    try {
      // Buscar média atual dos usuários
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) {
        throw new Error('Erro ao buscar usuários');
      }

      const users = await usersResponse.json();
      const nonAdminUsers = users.filter(
        (u: any) => u.role !== 'superadmin' && u.role !== 'pastor'
      );
      const totalPoints = nonAdminUsers.reduce((sum: number, u: any) => sum + (u.points || 0), 0);
      const currentAvg = totalPoints / nonAdminUsers.length;

      setCurrentAverage(Math.round(currentAvg));

      // Calcular fator de ajuste
      const adjustmentFactor = targetValue / currentAvg;

      console.log(`📊 Cálculo de Preset Automático:`);
      console.log(`   Média atual: ${Math.round(currentAvg)}`);
      console.log(`   Média desejada: ${targetValue}`);
      console.log(`   Fator de ajuste: ${adjustmentFactor.toFixed(2)}x`);

      // Preset base (configuração atual ajustada)
      const newConfig: PointsConfig = {
        engajamento: {
          baixo: Math.round((config.engajamento?.baixo || 40) * adjustmentFactor),
          medio: Math.round((config.engajamento?.medio || 80) * adjustmentFactor),
          alto: Math.round((config.engajamento?.alto || 120) * adjustmentFactor),
        },
        classificacao: {
          frequente: Math.round((config.classificacao?.frequente || 180) * adjustmentFactor),
          naoFrequente: Math.round((config.classificacao?.naoFrequente || 40) * adjustmentFactor),
        },
        dizimista: {
          naoDizimista: 0, // Sempre 0
          pontual: Math.round((config.dizimista?.pontual || 100) * adjustmentFactor),
          sazonal: Math.round((config.dizimista?.sazonal || 200) * adjustmentFactor),
          recorrente: Math.round((config.dizimista?.recorrente || 290) * adjustmentFactor),
        },
        ofertante: {
          naoOfertante: 0, // Sempre 0
          pontual: Math.round((config.ofertante?.pontual || 50) * adjustmentFactor),
          sazonal: Math.round((config.ofertante?.sazonal || 80) * adjustmentFactor),
          recorrente: Math.round((config.ofertante?.recorrente || 120) * adjustmentFactor),
        },
        tempoBatismo: {
          doisAnos: Math.round((config.tempoBatismo?.doisAnos || 25) * adjustmentFactor),
          cincoAnos: Math.round((config.tempoBatismo?.cincoAnos || 50) * adjustmentFactor),
          dezAnos: Math.round((config.tempoBatismo?.dezAnos || 80) * adjustmentFactor),
          vinteAnos: Math.round((config.tempoBatismo?.vinteAnos || 105) * adjustmentFactor),
          maisVinte: Math.round((config.tempoBatismo?.maisVinte || 130) * adjustmentFactor),
        },
        cargos: {
          umCargo: Math.round((config.cargos?.umCargo || 20) * adjustmentFactor),
          doisCargos: Math.round((config.cargos?.doisCargos || 40) * adjustmentFactor),
          tresOuMais: Math.round((config.cargos?.tresOuMais || 60) * adjustmentFactor),
        },
        nomeUnidade: {
          comUnidade: Math.round((config.nomeUnidade?.comUnidade || 25) * adjustmentFactor),
        },
        temLicao: {
          comLicao: Math.round((config.temLicao?.comLicao || 35) * adjustmentFactor),
        },
        pontuacaoDinamica: {
          multiplicador: config.pontuacaoDinamica?.multiplicador || 5,
        },
        totalPresenca: {
          zeroATres: 0, // Sempre 0
          quatroASete: Math.round((config.totalPresenca?.quatroASete || 40) * adjustmentFactor),
          oitoATreze: Math.round((config.totalPresenca?.oitoATreze || 80) * adjustmentFactor),
        },
        escolaSabatina: {
          comunhao: Math.round((config.escolaSabatina?.comunhao || 4) * adjustmentFactor),
          missao: Math.round((config.escolaSabatina?.missao || 4) * adjustmentFactor),
          estudoBiblico: Math.round((config.escolaSabatina?.estudoBiblico || 4) * adjustmentFactor),
          batizouAlguem: Math.round(
            (config.escolaSabatina?.batizouAlguem || 130) * adjustmentFactor
          ),
          discipuladoPosBatismo: Math.round(
            (config.escolaSabatina?.discipuladoPosBatismo || 7) * adjustmentFactor
          ),
        },
        cpfValido: {
          valido: Math.round((config.cpfValido?.valido || 25) * adjustmentFactor),
        },
        camposVaziosACMS: {
          semCamposVazios: Math.round(
            (config.camposVaziosACMS?.semCamposVazios || 50) * adjustmentFactor
          ),
        },
      };

      setConfig(newConfig);

      toast({
        title: '🎯 Preset Calculado!',
        description: `Configuração ajustada automaticamente para média de ${targetValue} pontos (fator ${adjustmentFactor.toFixed(2)}x). Revise os valores e clique em "Salvar" para aplicar.`,
        duration: 6000,
      });
    } catch (error) {
      console.error('Erro ao calcular preset:', error);
      toast({
        title: '❌ Erro',
        description: 'Não foi possível calcular o preset automaticamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculatingPreset(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // GARANTIR que a configuração está completa antes de salvar
      // Mesclar com valores padrão para não enviar campos vazios
      const configCompleta = {
        engajamento: {
          baixo: config.engajamento?.baixo ?? 50,
          medio: config.engajamento?.medio ?? 100,
          alto: config.engajamento?.alto ?? 200,
        },
        classificacao: {
          frequente: config.classificacao?.frequente ?? 100,
          naoFrequente: config.classificacao?.naoFrequente ?? 50,
        },
        dizimista: {
          naoDizimista: config.dizimista?.naoDizimista ?? 0,
          pontual: config.dizimista?.pontual ?? 25,
          sazonal: config.dizimista?.sazonal ?? 50,
          recorrente: config.dizimista?.recorrente ?? 100,
        },
        ofertante: {
          naoOfertante: config.ofertante?.naoOfertante ?? 0,
          pontual: config.ofertante?.pontual ?? 15,
          sazonal: config.ofertante?.sazonal ?? 30,
          recorrente: config.ofertante?.recorrente ?? 60,
        },
        tempoBatismo: {
          doisAnos: config.tempoBatismo?.doisAnos ?? 25,
          cincoAnos: config.tempoBatismo?.cincoAnos ?? 50,
          dezAnos: config.tempoBatismo?.dezAnos ?? 100,
          vinteAnos: config.tempoBatismo?.vinteAnos ?? 150,
          maisVinte: config.tempoBatismo?.maisVinte ?? 200,
        },
        cargos: {
          umCargo: config.cargos?.umCargo ?? 50,
          doisCargos: config.cargos?.doisCargos ?? 100,
          tresOuMais: config.cargos?.tresOuMais ?? 150,
        },
        nomeUnidade: {
          comUnidade: config.nomeUnidade?.comUnidade ?? 25,
          semUnidade: (config.nomeUnidade as any)?.semUnidade ?? 0,
        },
        temLicao: {
          comLicao: config.temLicao?.comLicao ?? 30,
          semLicao: (config.temLicao as any)?.semLicao ?? 0,
        },
        pontuacaoDinamica: {
          multiplicador: config.pontuacaoDinamica?.multiplicador ?? 1,
        },
        totalPresenca: {
          zeroATres: config.totalPresenca?.zeroATres ?? 25,
          quatroASete: config.totalPresenca?.quatroASete ?? 50,
          oitoATreze: config.totalPresenca?.oitoATreze ?? 100,
        },
        escolaSabatina: {
          comunhao: config.escolaSabatina?.comunhao ?? 10,
          missao: config.escolaSabatina?.missao ?? 15,
          estudoBiblico: config.escolaSabatina?.estudoBiblico ?? 20,
          batizouAlguem: config.escolaSabatina?.batizouAlguem ?? 100,
          discipuladoPosBatismo: config.escolaSabatina?.discipuladoPosBatismo ?? 25,
        },
        cpfValido: {
          valido: config.cpfValido?.valido ?? 25,
          invalido: (config.cpfValido as any)?.invalido ?? 0,
        },
        camposVaziosACMS: {
          semCamposVazios: config.camposVaziosACMS?.semCamposVazios ?? 50,
          incompletos: (config.camposVaziosACMS as any)?.incompletos ?? 0,
        },
      };

      console.log('💾 Salvando configuração completa:', configCompleta);

      const response = await fetch('/api/system/points-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configCompleta),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar no servidor');
      }

      // Response parsed successfully

      // ATUALIZAR estado local com a configuração completa que foi salva
      setConfig(configCompleta);
      console.log('✅ Estado local atualizado com configuração salva');

      toast({
        title: '✅ Configurações salvas!',
        description: 'Iniciando recálculo dos pontos...',
      });

      // DISPARAR RECÁLCULO EM ROTA SEPARADA (evita timeout)
      console.log('🔄 Disparando recálculo de pontos...');
      try {
        const recalcResponse = await fetch('/api/users/recalculate-all-points', {
          method: 'POST',
        });

        if (recalcResponse.ok) {
          const recalcResult = await recalcResponse.json();
          console.log('✅ Recálculo concluído:', recalcResult);

          toast({
            title: '✅ Recálculo concluído!',
            description: `${recalcResult.updatedUsers || 0} usuários atualizados.`,
          });
        } else {
          console.warn('⚠️ Recálculo falhou, mas config foi salva');
          toast({
            title: '⚠️ Atenção',
            description: 'Configuração salva, mas houve erro ao recalcular pontos.',
            variant: 'destructive',
          });
        }
      } catch (recalcError) {
        console.error('❌ Erro ao disparar recálculo:', recalcError);
        toast({
          title: '⚠️ Atenção',
          description: 'Configuração salva. Recalcule manualmente se necessário.',
          variant: 'destructive',
        });
      }

      // Invalidar cache das queries relacionadas aos usuários
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: '❌ Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculatePoints = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/recalculate-all-points', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao recalcular pontos');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: '✅ Pontos recalculados!',
          description: `${result.updatedCount || 0} usuários tiveram seus pontos atualizados.`,
        });
      } else {
        throw new Error(result.message || 'Erro ao recalcular pontos');
      }

      // Invalidar cache das queries relacionadas aos usuários
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error('Erro ao recalcular pontos:', error);
      toast({
        title: '❌ Erro ao recalcular',
        description: 'Não foi possível recalcular os pontos dos usuários.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/system/points-config/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao resetar no servidor');
      }

      const result = await response.json();

      // Recarregar configurações do backend e mesclar com padrões
      const configResponse = await fetch('/api/system/points-config');
      if (configResponse.ok) {
        const backendConfig = await configResponse.json();

        // Mesclar com valores padrão (mesma lógica do loadConfig)
        const configCompleta: PointsConfig = {
          engajamento: {
            baixo: backendConfig.engajamento?.baixo ?? 50,
            medio: backendConfig.engajamento?.medio ?? 100,
            alto: backendConfig.engajamento?.alto ?? 200,
          },
          classificacao: {
            frequente: backendConfig.classificacao?.frequente ?? 100,
            naoFrequente: backendConfig.classificacao?.naoFrequente ?? 50,
          },
          dizimista: {
            naoDizimista: backendConfig.dizimista?.naoDizimista ?? 0,
            pontual: backendConfig.dizimista?.pontual ?? 25,
            sazonal: backendConfig.dizimista?.sazonal ?? 50,
            recorrente: backendConfig.dizimista?.recorrente ?? 100,
          },
          ofertante: {
            naoOfertante: backendConfig.ofertante?.naoOfertante ?? 0,
            pontual: backendConfig.ofertante?.pontual ?? 15,
            sazonal: backendConfig.ofertante?.sazonal ?? 30,
            recorrente: backendConfig.ofertante?.recorrente ?? 60,
          },
          tempoBatismo: {
            doisAnos:
              backendConfig.tempoBatismo?.doisAnos ?? backendConfig.tempobatismo?.doisAnos ?? 25,
            cincoAnos:
              backendConfig.tempoBatismo?.cincoAnos ?? backendConfig.tempobatismo?.cincoAnos ?? 50,
            dezAnos:
              backendConfig.tempoBatismo?.dezAnos ?? backendConfig.tempobatismo?.dezAnos ?? 100,
            vinteAnos:
              backendConfig.tempoBatismo?.vinteAnos ?? backendConfig.tempobatismo?.vinteAnos ?? 150,
            maisVinte:
              backendConfig.tempoBatismo?.maisVinte ?? backendConfig.tempobatismo?.maisVinte ?? 200,
          },
          cargos: {
            umCargo: backendConfig.cargos?.umCargo ?? 50,
            doisCargos: backendConfig.cargos?.doisCargos ?? 100,
            tresOuMais: backendConfig.cargos?.tresOuMais ?? 150,
          },
          nomeUnidade: {
            comUnidade:
              backendConfig.nomeUnidade?.comUnidade ?? backendConfig.nomeunidade?.comUnidade ?? 25,
          },
          temLicao: {
            comLicao: backendConfig.temLicao?.comLicao ?? backendConfig.temlicao?.comLicao ?? 30,
          },
          pontuacaoDinamica: {
            multiplicador: backendConfig.pontuacaoDinamica?.multiplicador ?? 5,
          },
          totalPresenca: {
            zeroATres:
              backendConfig.totalPresenca?.zeroATres ??
              backendConfig.totalpresenca?.zeroATres ??
              25,
            quatroASete:
              backendConfig.totalPresenca?.quatroASete ??
              backendConfig.totalpresenca?.quatroASete ??
              50,
            oitoATreze:
              backendConfig.totalPresenca?.oitoATreze ??
              backendConfig.totalpresenca?.oitoATreze ??
              100,
          },
          escolaSabatina: {
            comunhao:
              backendConfig.escolaSabatina?.comunhao ??
              backendConfig.escolasabatina?.comunhao ??
              10,
            missao:
              backendConfig.escolaSabatina?.missao ?? backendConfig.escolasabatina?.missao ?? 15,
            estudoBiblico:
              backendConfig.escolaSabatina?.estudoBiblico ??
              backendConfig.escolasabatina?.estudoBiblico ??
              20,
            batizouAlguem:
              backendConfig.escolaSabatina?.batizouAlguem ??
              backendConfig.escolasabatina?.batizouAlguem ??
              100,
            discipuladoPosBatismo:
              backendConfig.escolaSabatina?.discipuladoPosBatismo ??
              backendConfig.escolasabatina?.discipuladoPosBatismo ??
              25,
          },
          cpfValido: {
            valido: backendConfig.cpfValido?.valido ?? backendConfig.cpfvalido?.valido ?? 25,
          },
          camposVaziosACMS: {
            semCamposVazios:
              backendConfig.camposVaziosACMS?.semCamposVazios ??
              backendConfig.camposvaziosacms?.completos ??
              50,
          },
        };

        setConfig(configCompleta);
      } else {
        setConfig(defaultConfig);
      }

      if (result.updatedUsers > 0) {
        toast({
          title: '✅ Configurações resetadas!',
          description: `${result.updatedUsers} usuários tiveram seus pontos recalculados automaticamente.`,
        });
      } else {
        toast({
          title: '✅ Configurações resetadas!',
          description: 'As configurações foram resetadas com sucesso.',
        });
      }

      // Invalidar cache das queries relacionadas aos usuários
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      toast({
        title: '❌ Erro ao resetar',
        description: 'Não foi possível resetar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
    return (
      (config.engajamento?.alto || 0) +
      (config.classificacao?.frequente || 0) +
      (config.dizimista?.recorrente || 0) +
      (config.ofertante?.recorrente || 0) +
      (config.tempoBatismo?.maisVinte || 0) +
      (config.cargos?.tresOuMais || 0) +
      (config.nomeUnidade?.comUnidade || 0) +
      (config.temLicao?.comLicao || 0) +
      (config.totalPresenca?.oitoATreze || 0) +
      (config.escolaSabatina?.comunhao || 0) +
      (config.escolaSabatina?.missao || 0) +
      (config.escolaSabatina?.estudoBiblico || 0) +
      (config.escolaSabatina?.batizouAlguem || 0) +
      (config.escolaSabatina?.discipuladoPosBatismo || 0) +
      (config.cpfValido?.valido || 0) +
      (config.camposVaziosACMS?.semCamposVazios || 0)
    );
  };

  const getConfigSummary = () => {
    return {
      categoriesCount: Object.keys(config).length,
      criteriaCount: Object.values(config).reduce((total, section) => {
        return total + Object.keys(section).length;
      }, 0),
    };
  };

  // Loading state
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const renderSection = (
    title: string,
    icon: any,
    section: keyof PointsConfig,
    fields: { key: string; label: string; description: string }[]
  ) => {
    const IconComponent = icon;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={field.key}
                    type="number"
                    min="0"
                    value={
                      config[section]?.[field.key as keyof (typeof config)[typeof section]] || 0
                    }
                    onChange={e => updateConfig(section, field.key, parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                  <Badge variant="secondary" className="text-xs">
                    pontos
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            Base de Cálculo do Sistema
          </h2>
          <p className="text-muted-foreground">
            Configure os pontos para cada critério de avaliação dos usuários
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? 'Resetando...' : 'Resetar'}
          </Button>
          <Button
            variant="outline"
            onClick={handleCalculatePoints}
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {isLoading ? 'Calculando...' : 'Calcular Pontos'}
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isLoading ? 'Salvando e recalculando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Alert */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Atenção: Alterações afetam a base de cálculo de pontuação de todos os usuários. Use
              "Calcular Pontos" para recalcular manualmente ou "Salvar" para salvar e recalcular
              automaticamente.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Calculadora de Preset Automático */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Calculator className="h-5 w-5" />
            Calculadora de Preset Automático
          </CardTitle>
          <p className="text-sm text-blue-700">
            Digite a média de pontos desejada e o sistema calculará automaticamente todos os valores
            da base de cálculo
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="targetAverage" className="text-blue-900 font-medium">
                Média de Pontos Desejada
              </Label>
              <Input
                id="targetAverage"
                type="number"
                value={targetAverage}
                onChange={e => setTargetAverage(e.target.value)}
                placeholder="Ex: 595"
                className="mt-1.5 text-lg font-semibold border-blue-300 focus:border-blue-500"
                min="1"
                step="1"
              />
              <p className="text-xs text-blue-600 mt-1">
                {currentAverage !== null && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Média atual: {currentAverage} pontos
                  </span>
                )}
              </p>
            </div>

            <Button
              onClick={handleCalculateAutomaticPreset}
              disabled={isCalculatingPreset || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              size="lg"
            >
              {isCalculatingPreset ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Calcular Preset
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2 text-blue-800">
              <Star className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-medium">Como funciona:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>O sistema analisa a média atual de pontos de todos os usuários</li>
                  <li>
                    Calcula automaticamente quanto cada campo deve valer para atingir a média
                    desejada
                  </li>
                  <li>Preenche automaticamente todos os campos abaixo</li>
                  <li>Você pode revisar e ajustar manualmente antes de salvar</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Sections */}
      <div className="space-y-6">
        {renderSection('Engajamento', TrendingUp, 'engajamento', [
          { key: 'baixo', label: 'Baixo', description: 'Engajamento baixo' },
          { key: 'medio', label: 'Médio', description: 'Engajamento médio' },
          { key: 'alto', label: 'Alto', description: 'Engajamento alto' },
        ])}

        {renderSection('Classificação', Users, 'classificacao', [
          { key: 'frequente', label: 'Frequente', description: 'Usuários frequentes' },
          { key: 'naoFrequente', label: 'Não Frequente', description: 'Usuários não frequentes' },
        ])}

        {renderSection('Dizimista', Gift, 'dizimista', [
          { key: 'naoDizimista', label: 'Não dizimista', description: 'Sem contribuição' },
          { key: 'pontual', label: 'Pontual (1-3 meses)', description: 'Contribuição pontual' },
          { key: 'sazonal', label: 'Sazonal (4-7 meses)', description: 'Contribuição sazonal' },
          {
            key: 'recorrente',
            label: 'Recorrente (8-12 meses)',
            description: 'Contribuição recorrente',
          },
        ])}

        {renderSection('Ofertante', Heart, 'ofertante', [
          { key: 'naoOfertante', label: 'Não ofertante', description: 'Sem ofertas' },
          { key: 'pontual', label: 'Pontual (1-3 meses)', description: 'Ofertas pontuais' },
          { key: 'sazonal', label: 'Sazonal (4-7 meses)', description: 'Ofertas sazonais' },
          {
            key: 'recorrente',
            label: 'Recorrente (8-12 meses)',
            description: 'Ofertas recorrentes',
          },
        ])}

        {renderSection('Tempo de Batismo', Calendar, 'tempoBatismo', [
          { key: 'doisAnos', label: '0-2 anos', description: 'Batismo recente' },
          { key: 'cincoAnos', label: '3-5 anos', description: 'Batismo intermediário' },
          { key: 'dezAnos', label: '6-10 anos', description: 'Batismo consolidado' },
          { key: 'vinteAnos', label: '11-20 anos', description: 'Batismo maduro' },
          { key: 'maisVinte', label: '20+ anos', description: 'Batismo veterano' },
        ])}

        {renderSection('Cargos', Award, 'cargos', [
          { key: 'umCargo', label: '1 cargo', description: 'Um cargo de liderança' },
          { key: 'doisCargos', label: '2 cargos', description: 'Dois cargos de liderança' },
          { key: 'tresOuMais', label: '3+ cargos', description: 'Três ou mais cargos' },
        ])}

        {renderSection('Nome da Unidade', CheckCircle, 'nomeUnidade', [
          { key: 'comUnidade', label: 'Com unidade', description: 'Unidade cadastrada' },
        ])}

        {renderSection('Tem Lição', Book, 'temLicao', [
          { key: 'comLicao', label: 'Com lição', description: 'Participação em estudos' },
        ])}

        {renderSection('Pontuação Dinâmica', Star, 'pontuacaoDinamica', [
          {
            key: 'multiplicador',
            label: 'Multiplicador',
            description: 'Multiplicador para valores 0-13',
          },
        ])}

        {renderSection('Total de Presença', Calendar, 'totalPresenca', [
          { key: 'zeroATres', label: '0-3 presenças', description: 'Baixa frequência' },
          { key: 'quatroASete', label: '4-7 presenças', description: 'Frequência regular' },
          { key: 'oitoATreze', label: '8-13 presenças', description: 'Alta frequência' },
        ])}

        {renderSection('Escola Sabatina', Crown, 'escolaSabatina', [
          { key: 'comunhao', label: 'Comunhão', description: 'Presença na comunhão' },
          { key: 'missao', label: 'Missão', description: 'Participação em missões' },
          {
            key: 'estudoBiblico',
            label: 'Estudo Bíblico',
            description: 'Participação em estudos bíblicos',
          },
          { key: 'batizouAlguem', label: 'Batizou Alguém', description: 'Liderança em batismos' },
          {
            key: 'discipuladoPosBatismo',
            label: 'Discipulado Pós-Batismo',
            description: 'Participação em estudos de discipulado',
          },
        ])}

        {renderSection('CPF Válido', CheckCircle, 'cpfValido', [
          { key: 'valido', label: 'Válido', description: 'Documentação em dia' },
        ])}

        {renderSection('Campos Vazios ACMS', Mountain, 'camposVaziosACMS', [
          {
            key: 'semCamposVazios',
            label: 'Sem campos vazios',
            description: 'Perfil completo no sistema',
          },
        ])}
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Resumo da Base de Cálculo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{getTotalMaxPoints()}</div>
              <div className="text-sm text-muted-foreground">Pontos Máximos Possíveis</div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {getConfigSummary().categoriesCount}
              </div>
              <div className="text-sm text-muted-foreground">Categorias Configuradas</div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {getConfigSummary().criteriaCount}
              </div>
              <div className="text-sm text-muted-foreground">Critérios de Pontuação</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
