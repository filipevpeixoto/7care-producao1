import { useQuery } from '@tanstack/react-query';
import { PointsCalculator, UserData } from '@/lib/pointsCalculator';
import { GAMIFICATION_LEVELS } from '@/lib/gamification';
import { hasAdminAccess } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  points?: number;
  attendance?: number;
  level?: string;
  // Campos para cálculo de pontuação
  engajamento?: string;
  classificacao?: string;
  dizimista?: string;
  ofertante?: string;
  tempoBatismo?: number;
  cargos?: string[];
  departamentos?: string[];
  nomeUnidade?: string;
  temLicao?: boolean;
  comunhao?: number;
  missao?: number;
  estudoBiblico?: number;
  totalPresenca?: number;
  batizouAlguem?: boolean;
  discipuladoPosBatismo?: number;
  cpfValido?: boolean;
  camposVaziosACMS?: boolean;
  hasLesson?: boolean; // Added this field based on new_code
}

export const usePointsCalculation = () => {
  const { user: currentUser } = useAuth();
  
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users-with-points', currentUser?.id],
    queryFn: async () => {
      // WORKAROUND: Usar /api/users até resolver problema do /api/users/with-points
      const response = await fetch('/api/users', {
        headers: {
          'x-user-id': currentUser?.id?.toString() || '',
          'x-user-role': currentUser?.role || ''
        }
      });
      if (!response.ok) {
        throw new Error('Falha ao carregar usuários');
      }
      const usersData = await response.json();
      
      // Simular pontos para usuários que não têm
      return usersData.map((user: any) => ({
        ...user,
        points: user.points || 
          (hasAdminAccess(user) ? 1000 : 
           user.role === 'member' ? 500 : 
           user.role === 'missionary' ? 750 : 250)
      })) as Promise<User[]>;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Buscar configuração de pontuação do banco
  const { data: pointsConfig } = useQuery({
    queryKey: ['points-config'],
    queryFn: async () => {
      const response = await fetch('/api/system/points-config');
      if (!response.ok) {
        throw new Error('Falha ao carregar configuração de pontuação');
      }
      return response.json();
    }
  });

  const calculateUserPoints = (user: User): number => {
    // Se não temos configuração, usar valores padrão
    if (!pointsConfig) {
      const userData: UserData = {
        engajamento: user.engajamento as any,
        classificacao: user.classificacao as any,
        dizimista: user.dizimista as any,
        ofertante: user.ofertante as any,
        tempoBatismo: user.tempoBatismo,
        cargos: user.cargos,
        departamentos: user.departamentos,
        nomeUnidade: user.nomeUnidade,
        temLicao: user.hasLesson || user.temLicao,
        comunhao: user.comunhao,
        missao: user.missao,
        estudoBiblico: user.estudoBiblico,
        totalPresenca: user.totalPresenca,
        batizouAlguem: user.batizouAlguem,
        discipuladoPosBatismo: user.discipuladoPosBatismo,
        cpfValido: user.cpfValido,
        camposVaziosACMS: user.camposVaziosACMS
      };
      const result = PointsCalculator.calculateTotalPoints(userData);
      return typeof result === 'number' ? result : 0;
    }

    // Usar configuração do banco para cálculo correto
    let totalPoints = 0;
    
    // Engajamento
    if (user.engajamento && typeof user.engajamento === 'string') {
      const engajamento = user.engajamento.toLowerCase();
      if (engajamento.includes('baixo')) totalPoints += pointsConfig.engajamento.baixo;
      else if (engajamento.includes('médio') || engajamento.includes('medio')) totalPoints += pointsConfig.engajamento.medio;
      else if (engajamento.includes('alto')) totalPoints += pointsConfig.engajamento.alto;
    }
    
    // Classificação
    if (user.classificacao && typeof user.classificacao === 'string') {
      const classificacao = user.classificacao.toLowerCase();
      if (classificacao.includes('frequente')) totalPoints += pointsConfig.classificacao.frequente;
      else totalPoints += pointsConfig.classificacao.naoFrequente;
    }
    
    // Dizimista
    if (user.dizimista && typeof user.dizimista === 'string') {
      const dizimista = user.dizimista.toLowerCase();
      if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) totalPoints += pointsConfig.dizimista.naoDizimista;
      else if (dizimista.includes('pontual')) totalPoints += pointsConfig.dizimista.pontual;
      else if (dizimista.includes('sazonal')) totalPoints += pointsConfig.dizimista.sazonal;
      else if (dizimista.includes('recorrente')) totalPoints += pointsConfig.dizimista.recorrente;
    }
    
    // Ofertante
    if (user.ofertante && typeof user.ofertante === 'string') {
      const ofertante = user.ofertante.toLowerCase();
      if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) totalPoints += pointsConfig.ofertante.naoOfertante;
      else if (ofertante.includes('pontual')) totalPoints += pointsConfig.ofertante.pontual;
      else if (ofertante.includes('sazonal')) totalPoints += pointsConfig.ofertante.sazonal;
      else if (ofertante.includes('recorrente')) totalPoints += pointsConfig.ofertante.recorrente;
    }
    
    // Tempo de Batismo
    if (user.tempoBatismo) {
      if (user.tempoBatismo >= 2 && user.tempoBatismo < 5) totalPoints += pointsConfig.tempoBatismo.doisAnos;
      else if (user.tempoBatismo >= 5 && user.tempoBatismo < 10) totalPoints += pointsConfig.tempoBatismo.cincoAnos;
      else if (user.tempoBatismo >= 10 && user.tempoBatismo < 20) totalPoints += pointsConfig.tempoBatismo.dezAnos;
      else if (user.tempoBatismo >= 20 && user.tempoBatismo < 30) totalPoints += pointsConfig.tempoBatismo.vinteAnos;
      else if (user.tempoBatismo >= 30) totalPoints += pointsConfig.tempoBatismo.maisVinte;
    }
    
    // Cargos
    if (user.cargos && user.cargos.length > 0) {
      if (user.cargos.length === 1) totalPoints += pointsConfig.cargos.umCargo;
      else if (user.cargos.length === 2) totalPoints += pointsConfig.cargos.doisCargos;
      else totalPoints += pointsConfig.cargos.tresOuMais;
    }
    
    // Nome da Unidade
    if (user.nomeUnidade) totalPoints += pointsConfig.nomeUnidade.comUnidade;
    
    // Tem Lição
    if (user.hasLesson || user.temLicao) totalPoints += pointsConfig.temLicao.comLicao;
    
    // Pontuação Dinâmica (usar multiplicador da configuração)
    if (user.comunhao) totalPoints += (user.comunhao * pointsConfig.pontuacaoDinamica.multiplicador);
    if (user.missao) totalPoints += (user.missao * pointsConfig.pontuacaoDinamica.multiplicador);
    if (user.estudoBiblico) totalPoints += (user.estudoBiblico * pointsConfig.pontuacaoDinamica.multiplicador);
    
    // Total de Presença
    if (user.totalPresenca) {
      if (user.totalPresenca >= 0 && user.totalPresenca <= 3) totalPoints += pointsConfig.totalPresenca.zeroATres;
      else if (user.totalPresenca >= 4 && user.totalPresenca <= 7) totalPoints += pointsConfig.totalPresenca.quatroASete;
      else totalPoints += pointsConfig.totalPresenca.oitoATreze;
    }
    
    // Batizou Alguém
    if (user.batizouAlguem) totalPoints += pointsConfig.escolaSabatina.batizouAlguem;
    
    // Discipulado Pós-Batismo
    if (user.discipuladoPosBatismo) totalPoints += (user.discipuladoPosBatismo * pointsConfig.escolaSabatina.discipuladoPosBatismo);
    
    // CPF Válido
    if (user.cpfValido) totalPoints += pointsConfig.cpfValido.valido;
    
    // Campos Vazios no ACMS
    if (!user.camposVaziosACMS) totalPoints += pointsConfig.camposVaziosACMS.semCamposVazios;
    
    return totalPoints;
  };

  const calculateAllUsersPoints = () => {
    if (!users || !Array.isArray(users)) return [];
    
    return users.map(user => {
      const calculatedPoints = calculateUserPoints(user);
      return {
        ...user,
        calculatedPoints: typeof calculatedPoints === 'number' ? calculatedPoints : 0,
        pointsBreakdown: PointsCalculator.calculateDetailedPoints({
          engajamento: user.engajamento as any,
          classificacao: user.classificacao as any,
          dizimista: user.dizimista as any,
          ofertante: user.ofertante as any,
          tempoBatismo: user.tempoBatismo,
          cargos: user.cargos,
          departamentos: user.departamentos,
          nomeUnidade: user.nomeUnidade,
          temLicao: user.hasLesson || user.temLicao,
          comunhao: user.comunhao,
          missao: user.missao,
          estudoBiblico: user.estudoBiblico,
          totalPresenca: user.totalPresenca,
          batizouAlguem: user.batizouAlguem,
          discipuladoPosBatismo: user.discipuladoPosBatismo,
          cpfValido: user.cpfValido,
          camposVaziosACMS: user.camposVaziosACMS
        })
      };
    });
  };

  const getTopUsers = (limit: number = 10) => {
    const usersWithPoints = calculateAllUsersPoints();
    if (!usersWithPoints || usersWithPoints.length === 0) return [];
    
    // Filtrar apenas usuários com pontos válidos
    const validUsers = usersWithPoints.filter(user => typeof user.calculatedPoints === 'number');
    
    if (validUsers.length === 0) return [];
    
    return validUsers
      .sort((a, b) => (b.calculatedPoints || 0) - (a.calculatedPoints || 0))
      .slice(0, limit);
  };

  const getUsersByLevel = (levelId: number) => {
    if (!users) return [];
    
    const usersWithPoints = calculateAllUsersPoints();
    if (!usersWithPoints || usersWithPoints.length === 0) return [];
    
    const level = GAMIFICATION_LEVELS.find(l => l.id === levelId);
    
    if (!level) return [];
    
    // Filtrar apenas usuários com pontos válidos
    const validUsers = usersWithPoints.filter(user => typeof user.calculatedPoints === 'number');
    
    if (validUsers.length === 0) return [];
    
    return validUsers.filter(user => {
      const points = user.calculatedPoints || 0;
      return typeof points === 'number' && points >= level.minPoints && (!level.maxPoints || points <= level.maxPoints);
    });
  };

  const getStatistics = () => {
    if (!users) {
      return {
        totalUsers: 0,
        averagePoints: 0,
        topPerformer: null,
        levelDistribution: {},
        totalPoints: 0
      };
    }

    const usersWithPoints = calculateAllUsersPoints();
    
    // Verificar se há usuários com pontos
    if (usersWithPoints.length === 0) {
      return {
        totalUsers: 0,
        averagePoints: 0,
        topPerformer: null,
        levelDistribution: {},
        totalPoints: 0
      };
    }
    
    // Filtrar apenas usuários com pontos válidos
    const validUsers = usersWithPoints.filter(user => typeof user.calculatedPoints === 'number');
    
    if (validUsers.length === 0) {
      return {
        totalUsers: 0,
        averagePoints: 0,
        topPerformer: null,
        levelDistribution: {},
        totalPoints: 0
      };
    }
    
    const totalPoints = validUsers.reduce((sum, user) => {
      const userPoints = user.calculatedPoints || 0;
      return sum + (typeof userPoints === 'number' ? userPoints : 0);
    }, 0);
    const averagePoints = validUsers.length > 0 ? Math.round(totalPoints / validUsers.length) : 0;
    
    // Adicionar valor inicial para evitar erro de array vazio
    const topPerformer = validUsers.reduce((top, user) => {
      const currentPoints = user.calculatedPoints || 0;
      const topPoints = top.calculatedPoints || 0;
      if (typeof currentPoints === 'number' && typeof topPoints === 'number') {
        return currentPoints > topPoints ? user : top;
      }
      return top; // Manter o top atual se os pontos não forem válidos
    }, validUsers[0]); // Valor inicial é o primeiro usuário

    // Distribuição por níveis
    const levelDistribution: Record<string, number> = {};
    GAMIFICATION_LEVELS.forEach(level => {
      levelDistribution[level.mount] = 0;
    });

    validUsers.forEach(user => {
      const userPoints = user.calculatedPoints || 0;
      if (typeof userPoints === 'number') {
        const level = GAMIFICATION_LEVELS.find(l => 
          userPoints >= l.minPoints && 
          (!l.maxPoints || userPoints <= l.maxPoints)
        );
        if (level) {
          levelDistribution[level.mount]++;
        }
      }
    });

    return {
      totalUsers: validUsers.length,
      averagePoints: typeof averagePoints === 'number' ? averagePoints : 0,
      topPerformer: topPerformer || null,
      levelDistribution: levelDistribution || {},
      totalPoints: typeof totalPoints === 'number' ? totalPoints : 0
    };
  };

  return {
    users,
    isLoading,
    error,
    calculateUserPoints,
    calculateAllUsersPoints,
    getTopUsers,
    getUsersByLevel,
    getStatistics
  };
}; 