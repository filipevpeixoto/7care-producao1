import { useState, useEffect, useMemo } from 'react';
import { createLogger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Users,
  Book,
  Heart,
  Calendar,
  Award,
  CheckCircle,
  Star,
  Target,
  Gift,
  Crown,
  Mountain,
} from 'lucide-react';
import { getLevelByPoints, getMountName, getLevelIcon } from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';
import type { PointsBreakdownProps, PointsConfig } from './pointsBreakdownTypes';
import { CategoryGrid, type Category } from './pointsBreakdown/PointsBreakdownCards';
import {
  PointsBreakdownLoading,
  PointsBreakdownError,
} from './pointsBreakdown/PointsBreakdownStates';
import { createSafeConfig } from './pointsBreakdown/pointsBreakdownConfig';

const gamificationLogger = createLogger('Gamification');

export const PointsBreakdown = ({
  userData,
  breakdown,
  showDetails = true,
}: PointsBreakdownProps) => {
  const [pointsConfig, setPointsConfig] = useState<PointsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const safeConfig = useMemo(() => createSafeConfig(pointsConfig), [pointsConfig]);

  // Buscar configuração de pontos do servidor
  useEffect(() => {
    const fetchPointsConfig = async () => {
      try {
        const response = await fetch('/api/system/points-config');
        if (response.ok) {
          const config = await response.json();
          setPointsConfig(config);
        }
      } catch (error) {
        // Erro silencioso - usar valores padrão
      } finally {
        setLoading(false);
      }
    };

    fetchPointsConfig();
  }, []);

  // Função para gerar dicas personalizadas para cada usuário
  const generatePersonalizedTips = (categoryName: string): string[] => {
    if (!pointsConfig || !safeConfig) return [];

    const tips: string[] = [];

    switch (categoryName) {
      case 'Engajamento':
        if (userData.engajamento && typeof userData.engajamento === 'string') {
          const engajamento = userData.engajamento.toLowerCase();
          if (engajamento.includes('baixo')) {
            tips.push(`🔸 Participe mais ativamente dos cultos e eventos`);
            tips.push(`🔸 Envolva-se em grupos de estudo bíblico`);
            tips.push(`🔸 Ofereça-se para ajudar em atividades da igreja`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.engajamento.medio - safeConfig.engajamento.baixo} pontos`
            );
          } else if (engajamento.includes('médio') || engajamento.includes('medio')) {
            tips.push(`🔸 Assuma mais responsabilidades na igreja`);
            tips.push(`🔸 Liderança em ministérios específicos`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.engajamento.alto - safeConfig.engajamento.medio} pontos`
            );
          }
        } else {
          tips.push(`🔸 Informe seu nível de engajamento para receber pontos`);
        }
        break;

      case 'Classificação':
        if (userData.classificacao && typeof userData.classificacao === 'string') {
          const classificacao = userData.classificacao.toLowerCase();
          if (!classificacao.includes('frequente')) {
            tips.push(`🔸 Aumente sua frequência nos cultos`);
            tips.push(`🔸 Participe regularmente das atividades`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.classificacao.frequente - safeConfig.classificacao.naoFrequente} pontos`
            );
          }
        } else {
          tips.push(`🔸 Informe sua classificação para receber pontos`);
        }
        break;

      case 'Fidelidade Regular com Dízimo':
        if (userData.dizimista && typeof userData.dizimista === 'string') {
          const dizimista = userData.dizimista.toLowerCase();
          if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
            tips.push(`🔸 Comece a contribuir com dízimo`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.dizimista.pontual - safeConfig.dizimista.naoDizimista} pontos`
            );
          } else if (dizimista.includes('pontual')) {
            tips.push(`🔸 Torne-se dizimista sazonal`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.dizimista.sazonal - safeConfig.dizimista.pontual} pontos`
            );
          } else if (dizimista.includes('sazonal')) {
            tips.push(`🔸 Torne-se dizimista recorrente`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.dizimista.recorrente - safeConfig.dizimista.sazonal} pontos`
            );
          }
        } else {
          tips.push(`🔸 Informe seu status de dizimista para receber pontos`);
        }
        break;

      case 'Fidelidade Regular com Ofertas':
        if (userData.ofertante && typeof userData.ofertante === 'string') {
          const ofertante = userData.ofertante.toLowerCase();
          if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
            tips.push(`🔸 Comece a contribuir com ofertas`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.ofertante.pontual - safeConfig.ofertante.naoOfertante} pontos`
            );
          } else if (ofertante.includes('pontual')) {
            tips.push(`🔸 Torne-se ofertante sazonal`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.ofertante.sazonal - safeConfig.ofertante.pontual} pontos`
            );
          } else if (ofertante.includes('sazonal')) {
            tips.push(`🔸 Torne-se ofertante recorrente`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.ofertante.recorrente - safeConfig.ofertante.sazonal} pontos`
            );
          }
        } else {
          tips.push(`🔸 Informe seu status de ofertante para receber pontos`);
        }
        break;

      case 'Tempo de Batismo':
        if (userData.tempoBatismo) {
          const tempo = userData.tempoBatismo;
          if (typeof tempo === 'number') {
            if (tempo < 2) {
              tips.push(`🔸 Continue crescendo espiritualmente`);
              tips.push(
                `🔸 Potencial de ganhar +${pointsConfig.tempoBatismo?.doisAnos || 0} pontos em 2 anos`
              );
            } else if (tempo < 5) {
              tips.push(
                `🔸 Potencial de ganhar +${(pointsConfig.tempoBatismo?.cincoAnos || 0) - (pointsConfig.tempoBatismo?.doisAnos || 0)} pontos em 3 anos`
              );
            } else if (tempo < 10) {
              tips.push(
                `🔸 Potencial de ganhar +${(pointsConfig.tempoBatismo?.dezAnos || 0) - (pointsConfig.tempoBatismo?.cincoAnos || 0)} pontos em 5 anos`
              );
            } else if (tempo < 20) {
              tips.push(
                `🔸 Potencial de ganhar +${(pointsConfig.tempoBatismo?.vinteAnos || 0) - (pointsConfig.tempoBatismo?.dezAnos || 0)} pontos em 10 anos`
              );
            }
          }
        } else {
          tips.push(`🔸 Informe seu tempo de batismo para receber pontos`);
        }
        break;

      case 'Cargos':
        if (userData.cargos && Array.isArray(userData.cargos)) {
          const numCargos = userData.cargos.length;
          if (numCargos === 0) {
            tips.push(`🔸 Candidate-se a um cargo na igreja`);
            tips.push(`🔸 Potencial de ganhar +${safeConfig.cargos.umCargo} pontos`);
          } else if (numCargos === 1) {
            tips.push(`🔸 Assuma um segundo cargo`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.cargos.doisCargos - safeConfig.cargos.umCargo} pontos`
            );
          } else if (numCargos === 2) {
            tips.push(`🔸 Assuma um terceiro cargo`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.cargos.tresOuMais - safeConfig.cargos.doisCargos} pontos`
            );
          }
        } else {
          tips.push(`🔸 Candidate-se a cargos na igreja para receber pontos`);
        }
        break;

      case 'Nome da Unidade':
        if (!userData.nomeUnidade || !userData.nomeUnidade.trim()) {
          tips.push(`🔸 Cadastre-se em uma unidade`);
          tips.push(`🔸 Potencial de ganhar +${safeConfig.nomeUnidade.comUnidade} pontos`);
        }
        break;

      case 'Tem Lição':
        if (!userData.temLicao) {
          tips.push(`🔸 Participe de estudos bíblicos`);
          tips.push(`🔸 Potencial de ganhar +${safeConfig.temLicao.comLicao} pontos`);
        }
        break;

      case 'Total de Presença':
        if (userData.totalPresenca != null) {
          const presenca = userData.totalPresenca;
          if (presenca <= 3) {
            tips.push(`🔸 Aumente sua frequência nos cultos`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.totalPresenca.quatroASete - safeConfig.totalPresenca.zeroATres} pontos`
            );
          } else if (presenca <= 7) {
            tips.push(`🔸 Continue aumentando sua presença`);
            tips.push(
              `🔸 Potencial de ganhar +${safeConfig.totalPresenca.oitoATreze - safeConfig.totalPresenca.quatroASete} pontos`
            );
          }
        } else {
          tips.push(`🔸 Informe sua frequência para receber pontos`);
        }
        break;

      case 'Batizou Alguém':
        if (!userData.batizouAlguem) {
          tips.push(`🔸 Envolva-se em evangelismo`);
          tips.push(
            `🔸 Potencial de ganhar +${safeConfig.escolaSabatina.batizouAlguem} pontos por batismo`
          );
        }
        break;

      case 'CPF Válido':
        if (!userData.cpfValido) {
          tips.push(`🔸 Atualize seu CPF no sistema`);
          tips.push(`🔸 Potencial de ganhar +${safeConfig.cpfValido.valido} pontos`);
        }
        break;

      case 'Campos Vazios ACMS':
        if (userData.camposVaziosACMS != null && userData.camposVaziosACMS > 0) {
          tips.push(`🔸 Complete todos os campos do seu perfil`);
          tips.push(`🔸 Potencial de ganhar +${safeConfig.camposVaziosACMS.completos} pontos`);
        }
        break;

      case 'Comunhão (ES)':
        if (!userData.escolaSabatina?.comunhao || userData.escolaSabatina.comunhao === 0) {
          tips.push(`🔸 Participe de atividades de comunhão`);
          tips.push(
            `🔸 Potencial de ganhar +${safeConfig.escolaSabatina.comunhao} pontos por atividade`
          );
        } else {
          tips.push(`🔸 Continue participando de comunhões`);
          tips.push(`🔸 Cada atividade vale +${safeConfig.escolaSabatina.comunhao} pontos`);
        }
        break;

      case 'Missão (ES)':
        if (!userData.escolaSabatina?.missao || userData.escolaSabatina.missao === 0) {
          tips.push(`🔸 Envolva-se em atividades missionárias`);
          tips.push(
            `🔸 Potencial de ganhar +${safeConfig.escolaSabatina.missao} pontos por atividade`
          );
        } else {
          tips.push(`🔸 Continue com o trabalho missionário`);
          tips.push(`🔸 Cada atividade vale +${safeConfig.escolaSabatina.missao} pontos`);
        }
        break;

      case 'Estudo Bíblico (ES)':
        if (
          !userData.escolaSabatina?.estudoBiblico ||
          userData.escolaSabatina.estudoBiblico === 0
        ) {
          tips.push(`🔸 Participe de estudos bíblicos`);
          tips.push(
            `🔸 Potencial de ganhar +${safeConfig.escolaSabatina.estudoBiblico} pontos por estudo`
          );
        } else {
          tips.push(`🔸 Continue estudando a Bíblia`);
          tips.push(`🔸 Cada estudo vale +${safeConfig.escolaSabatina.estudoBiblico} pontos`);
        }
        break;

      case 'Batizou Alguém (ES)':
        if (
          !userData.escolaSabatina?.batizouAlguem ||
          userData.escolaSabatina.batizouAlguem === 0
        ) {
          tips.push(`🔸 Envolva-se em evangelismo`);
          tips.push(
            `🔸 Potencial de ganhar +${safeConfig.escolaSabatina.batizouAlguem} pontos por batismo`
          );
        } else {
          tips.push(`🔸 Continue liderando batismos`);
          tips.push(`🔸 Cada batismo vale +${safeConfig.escolaSabatina.batizouAlguem} pontos`);
        }
        break;

      case 'Discipulado Pós-Batismo (ES)':
        if (
          !userData.escolaSabatina?.discipuladoPosBatismo ||
          userData.escolaSabatina.discipuladoPosBatismo === 0
        ) {
          tips.push(`🔸 Acompanhe novos batizados`);
          tips.push(
            `🔸 Potencial de ganhar +${safeConfig.escolaSabatina.discipuladoPosBatismo} pontos por acompanhamento`
          );
        } else {
          tips.push(`🔸 Continue o discipulado`);
          tips.push(
            `🔸 Cada acompanhamento vale +${safeConfig.escolaSabatina.discipuladoPosBatismo} pontos`
          );
        }
        break;
    }

    return tips;
  };

  // Se temos os pontos reais do usuário, usar eles
  const actualPoints = userData.actualPoints || 0;
  const currentLevel = getLevelByPoints(actualPoints);

  // Calcular pontos de cada categoria - PRIORIZAR breakdown da API
  const calculateCategoryPoints = (categoryName: string): number => {
    // PRIMEIRO: Usar o breakdown da API se disponível (mais preciso)
    if (breakdown) {
      switch (categoryName) {
        case 'Engajamento':
          return breakdown.engajamento || 0;
        case 'Classificação':
          return breakdown.classificacao || 0;
        case 'Dizimista':
          return breakdown.dizimista || 0;
        case 'Ofertante':
          return breakdown.ofertante || 0;
        case 'Tempo de Batismo':
          return breakdown.tempoBatismo || 0;
        case 'Cargos':
          return breakdown.cargos || 0;
        case 'Nome da Unidade':
          return breakdown.nomeUnidade || 0;
        case 'Tem Lição':
          return breakdown.temLicao || 0;
        case 'Total de Presença':
          return breakdown.totalPresenca || 0;
        case 'Batizou Alguém':
          return breakdown.batizouAlguem || 0;
        case 'CPF Válido':
          return breakdown.cpfValido || 0;
        case 'Campos Vazios ACMS':
          return breakdown.camposVaziosACMS || 0;
        default:
          return 0;
      }
    }

    // FALLBACK: Calcular baseado na configuração local se não tiver breakdown
    if (!pointsConfig || !safeConfig) return 0;

    try {
      switch (categoryName) {
        case 'Engajamento':
          if (userData.engajamento && typeof userData.engajamento === 'string') {
            const engajamento = userData.engajamento.toLowerCase();
            if (engajamento.includes('baixo')) return safeConfig.engajamento.baixo;
            if (engajamento.includes('médio') || engajamento.includes('medio')) {
              return safeConfig.engajamento.medio;
            }
            if (engajamento.includes('alto')) return safeConfig.engajamento.alto;
          }
          return 0;

        case 'Classificação':
          if (userData.classificacao && typeof userData.classificacao === 'string') {
            const classificacao = userData.classificacao.toLowerCase();
            if (classificacao.includes('frequente')) return safeConfig.classificacao.frequente;
            else return safeConfig.classificacao.naoFrequente;
          }
          return 0;

        case 'Dizimista':
          if (userData.dizimista && typeof userData.dizimista === 'string') {
            const dizimista = userData.dizimista.toLowerCase();
            if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
              return safeConfig.dizimista.naoDizimista;
            }
            if (dizimista.includes('pontual')) return safeConfig.dizimista.pontual;
            if (dizimista.includes('sazonal')) return safeConfig.dizimista.sazonal;
            if (dizimista.includes('recorrente')) return safeConfig.dizimista.recorrente;
          }
          return 0;

        case 'Ofertante':
          if (userData.ofertante && typeof userData.ofertante === 'string') {
            const ofertante = userData.ofertante.toLowerCase();
            if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
              return safeConfig.ofertante.naoOfertante;
            }
            if (ofertante.includes('pontual')) return safeConfig.ofertante.pontual;
            if (ofertante.includes('sazonal')) return safeConfig.ofertante.sazonal;
            if (ofertante.includes('recorrente')) return safeConfig.ofertante.recorrente;
          }
          return 0;

        case 'Tempo de Batismo':
          if (userData.tempoBatismo) {
            if (typeof userData.tempoBatismo === 'string' && userData.tempoBatismo.length > 0) {
              if (userData.tempoBatismo.includes('2 a 4')) {
                return pointsConfig.tempoBatismo?.doisAnos || 0;
              }
              if (userData.tempoBatismo.includes('5 a 9')) {
                return pointsConfig.tempoBatismo?.cincoAnos || 0;
              }
              if (userData.tempoBatismo.includes('10 a 14')) {
                return pointsConfig.tempoBatismo?.dezAnos || 0;
              }
              if (userData.tempoBatismo.includes('15 a 19')) {
                return pointsConfig.tempoBatismo?.vinteAnos || 0;
              }
              if (
                userData.tempoBatismo.includes('20 a 29') ||
                userData.tempoBatismo.includes('30+')
              ) {
                return pointsConfig.tempoBatismo?.maisVinte || 0;
              }
            } else if (typeof userData.tempoBatismo === 'number') {
              if (userData.tempoBatismo >= 2 && userData.tempoBatismo < 5) {
                return pointsConfig.tempoBatismo?.doisAnos || 0;
              }
              if (userData.tempoBatismo >= 5 && userData.tempoBatismo < 10) {
                return pointsConfig.tempoBatismo?.dezAnos || 0;
              }
              if (userData.tempoBatismo >= 10 && userData.tempoBatismo < 20) {
                return pointsConfig.tempoBatismo?.vinteAnos || 0;
              }
              if (userData.tempoBatismo >= 20 && userData.tempoBatismo < 30) {
                return pointsConfig.tempoBatismo?.vinteAnos || 0;
              }
              if (userData.tempoBatismo >= 30) return pointsConfig.tempoBatismo?.maisVinte || 0;
            }
          }
          return 0;

        case 'Cargos':
          if (userData.cargos && Array.isArray(userData.cargos)) {
            const numCargos = userData.cargos.length;
            if (numCargos === 1) return pointsConfig.cargos?.umCargo || 0;
            if (numCargos === 2) return pointsConfig.cargos?.doisCargos || 0;
            if (numCargos >= 3) return pointsConfig.cargos?.tresOuMais || 0;
          }
          return 0;

        case 'Nome da Unidade':
          if (userData.nomeUnidade && userData.nomeUnidade.trim()) {
            return safeConfig.nomeUnidade.comUnidade;
          }
          return 0;

        case 'Tem Lição':
          if (userData.temLicao) {
            return safeConfig.temLicao.comLicao;
          }
          return 0;

        case 'Total de Presença':
          if (userData.totalPresenca != null) {
            const presenca = userData.totalPresenca;
            if (presenca >= 0 && presenca <= 3) return safeConfig.totalPresenca.zeroATres;
            if (presenca >= 4 && presenca <= 7) return safeConfig.totalPresenca.quatroASete;
            if (presenca >= 8 && presenca <= 13) return safeConfig.totalPresenca.oitoATreze;
          }
          return 0;

        case 'Batizou Alguém':
          if (userData.batizouAlguem) {
            if (typeof userData.batizouAlguem === 'number') {
              return userData.batizouAlguem > 0 ? safeConfig.escolaSabatina.batizouAlguem : 0;
            }
            return userData.batizouAlguem ? safeConfig.escolaSabatina.batizouAlguem : 0;
          }
          return 0;

        case 'CPF Válido':
          if (userData.cpfValido) {
            if (typeof userData.cpfValido === 'string') {
              return userData.cpfValido === 'Sim' ? safeConfig.cpfValido.valido : 0;
            }
            return userData.cpfValido ? safeConfig.cpfValido.valido : 0;
          }
          return 0;

        case 'Campos Vazios ACMS':
          if (userData.camposVaziosACMS === 0) {
            return safeConfig.camposVaziosACMS.completos;
          }
          return 0;

        default:
          return 0;
      }
    } catch (error) {
      gamificationLogger.error(`Erro ao calcular pontos para ${categoryName}:`, error);
      return 0;
    }
  };

  // Função para calcular pontos específicos da Escola Sabatina
  const calculateEscolaSabatinaPoints = (categoryName: string): number => {
    // PRIORIZAR breakdown da API se disponível
    if (breakdown) {
      switch (categoryName) {
        case 'comunhao':
          return breakdown.comunhao || 0;
        case 'missao':
          return breakdown.missao || 0;
        case 'estudoBiblico':
          return breakdown.estudoBiblico || 0;
        case 'batizouAlguem':
          return breakdown.batizouAlguem || 0;
        case 'discipuladoPosBatismo':
          return breakdown.discipuladoPosBatismo || 0;
        default:
          return 0;
      }
    }

    // FALLBACK: Calcular se não tiver breakdown
    if (!pointsConfig || !safeConfig) return 0;
    if (!userData.escolaSabatina) return 0;

    try {
      switch (categoryName) {
        case 'comunhao':
          return Number(userData.escolaSabatina.comunhao || 0) * safeConfig.escolaSabatina.comunhao;
        case 'missao':
          return Number(userData.escolaSabatina.missao || 0) * safeConfig.escolaSabatina.missao;
        case 'estudoBiblico':
          return (
            Number(userData.escolaSabatina.estudoBiblico || 0) * safeConfig.escolaSabatina.estudoBiblico
          );
        case 'batizouAlguem':
          return (
            Number(userData.escolaSabatina.batizouAlguem || 0) * safeConfig.escolaSabatina.batizouAlguem
          );
        case 'discipuladoPosBatismo':
          return (
            Number(userData.escolaSabatina.discipuladoPosBatismo || 0) *
            safeConfig.escolaSabatina.discipuladoPosBatismo
          );
        default:
          return 0;
      }
    } catch (error) {
      gamificationLogger.error(`Erro ao calcular pontos para ${categoryName} da Escola Sabatina:`, error);
      return 0;
    }
  };

  const categories: Category[] = [
    {
      name: 'Engajamento',
      points: calculateCategoryPoints('Engajamento'),
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-slate-800/60',
      description: 'Nível de participação e envolvimento',
    },
    {
      name: 'Classificação',
      points: calculateCategoryPoints('Classificação'),
      icon: Users,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-slate-800/60',
      description: 'Status de frequência na igreja',
    },
    {
      name: 'Fidelidade Regular com Dízimo',
      points: calculateCategoryPoints('Dizimista'),
      icon: Gift,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-slate-800/60',
      description: 'Fidelidade regular com dízimo',
    },
    {
      name: 'Fidelidade Regular com Ofertas',
      points: calculateCategoryPoints('Ofertante'),
      icon: Heart,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-slate-800/60',
      description: 'Contribuição com ofertas',
    },
    {
      name: 'Tempo de Batismo',
      points: calculateCategoryPoints('Tempo de Batismo'),
      icon: Calendar,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-slate-800/60',
      description: 'Anos desde o batismo',
    },
    {
      name: 'Cargos',
      points: calculateCategoryPoints('Cargos'),
      icon: Award,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-slate-800/60',
      description: 'Funções na igreja',
    },
    {
      name: 'Nome da Unidade',
      points: calculateCategoryPoints('Nome da Unidade'),
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-slate-800/60',
      description: 'Unidade cadastrada',
    },
    {
      name: 'Tem Lição',
      points: calculateCategoryPoints('Tem Lição'),
      icon: Book,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-slate-800/60',
      description: 'Participação em estudos',
    },
    {
      name: 'Total de Presença',
      points: calculateCategoryPoints('Total de Presença'),
      icon: Calendar,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-slate-800/60',
      description: 'Frequência nos cultos',
    },
    {
      name: 'CPF Válido',
      points: calculateCategoryPoints('CPF Válido'),
      icon: CheckCircle,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-slate-800/60',
      description: 'Documentação em dia',
    },
    {
      name: 'Campos Vazios ACMS',
      points: calculateCategoryPoints('Campos Vazios ACMS'),
      icon: Mountain,
      color: 'text-stone-600 dark:text-stone-400',
      bgColor: 'bg-stone-50 dark:bg-slate-800/60',
      description: 'Perfil completo no sistema',
    },
  ];

  // Pontuação máxima por categoria principal
  const getMaxPointsForCategory = (categoryName: string): number => {
    if (!pointsConfig || !safeConfig) return 0;
    switch (categoryName) {
      case 'Engajamento':
        return safeConfig.engajamento.alto;
      case 'Classificação':
        return safeConfig.classificacao.frequente;
      case 'Fidelidade Regular com Dízimo':
      case 'Fidelidade regular com dízimo':
        return safeConfig.dizimista.recorrente;
      case 'Fidelidade Regular com Ofertas':
        return safeConfig.ofertante.recorrente;
      case 'Tempo de Batismo': {
        const t = safeConfig.tempoBatismo;
        return Math.max(
          t.doisAnos || 0,
          t.cincoAnos || 0,
          t.dezAnos || 0,
          t.vinteAnos || 0,
          t.maisVinte || 0
        );
      }
      case 'Cargos':
        return safeConfig.cargos.tresOuMais;
      case 'Nome da Unidade':
        return safeConfig.nomeUnidade.comUnidade;
      case 'Tem Lição':
        return safeConfig.temLicao.comLicao;
      case 'Total de Presença':
        return safeConfig.totalPresenca.oitoATreze;
      case 'CPF Válido':
        return safeConfig.cpfValido.valido;
      case 'Campos Vazios ACMS':
        return safeConfig.camposVaziosACMS.completos;
      default:
        return 0;
    }
  };

  // Categorias detalhadas da Escola Sabatina
  const escolaSabatinaCategories: Category[] = [
    {
      name: 'Comunhão (ES)',
      points: calculateEscolaSabatinaPoints('comunhao'),
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-slate-800/60',
      description: 'Participação em comunhão',
    },
    {
      name: 'Missão (ES)',
      points: calculateEscolaSabatinaPoints('missao'),
      icon: Target,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-slate-800/60',
      description: 'Atividades missionárias',
    },
    {
      name: 'Estudo Bíblico (ES)',
      points: calculateEscolaSabatinaPoints('estudoBiblico'),
      icon: Book,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-slate-800/60',
      description: 'Estudos bíblicos realizados',
    },
    {
      name: 'Batizou Alguém (ES)',
      points: calculateEscolaSabatinaPoints('batizouAlguem'),
      icon: Crown,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-slate-800/60',
      description: 'Liderança em batismos',
    },
    {
      name: 'Discipulado Pós-Batismo (ES)',
      points: calculateEscolaSabatinaPoints('discipuladoPosBatismo'),
      icon: Star,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-slate-800/60',
      description: 'Acompanhamento pós-batismo',
    },
  ];

  // Calcular total da Escola Sabatina
  const totalEscolaSabatina = escolaSabatinaCategories.reduce(
    (total, cat) => total + cat.points,
    0
  );

  // Calcular total de todas as categorias
  const totalCalculated =
    categories.reduce((total, cat) => total + cat.points, 0) + totalEscolaSabatina;

  // Loading state
  if (loading) {
    return <PointsBreakdownLoading message="Carregando configuração de pontos..." />;
  }

  // Error state
  if (!pointsConfig) {
    return (
      <PointsBreakdownError
        message="Erro ao carregar configuração de pontos"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Detalhes da Pontuação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/40 dark:to-blue-900/40 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {actualPoints}
            </div>
            <div className="text-sm text-muted-foreground">Pontos Reais do Usuário</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              <div className="flex items-center gap-2">
                <MountIcon iconType={getLevelIcon(actualPoints)} className="h-5 w-5" />
                <div className="text-sm font-medium">{getMountName(actualPoints)}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{currentLevel.name}</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/40 dark:to-yellow-900/40 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.round((actualPoints / 1000) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Completude</div>
            <Progress value={Math.round((actualPoints / 1000) * 100)} className="h-2 mt-2" />
          </div>
        </div>

        {showDetails && (
          <>
            {/* Categorias com pontos e dicas personalizadas */}
            <CategoryGrid
              title="Categorias Principais"
              categories={categories}
              columnsClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
              getTips={generatePersonalizedTips}
              getMaxPoints={getMaxPointsForCategory}
            />

            {/* Categorias da Escola Sabatina */}
            <CategoryGrid
              title="Escola Sabatina"
              categories={escolaSabatinaCategories}
              columnsClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3"
              getTips={generatePersonalizedTips}
            />

            {/* Resumo dos Totais */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Resumo dos Totais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-900/80 rounded-lg border dark:border-slate-600">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {totalCalculated}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Calculado</div>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800/80 dark:to-slate-900/80 rounded-lg border dark:border-slate-600">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {totalEscolaSabatina}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Escola Sabatina</div>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800/80 dark:to-slate-900/80 rounded-lg border dark:border-slate-600">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {actualPoints}
                  </div>
                  <div className="text-sm text-muted-foreground">Pontos Reais</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
