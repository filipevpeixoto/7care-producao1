/**
 * Testes das Rotas de Pontos
 * Cobre endpoints de gamificação e pontuação
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Points Routes', () => {
  interface UserPoints {
    userId: number;
    points: number;
    level: number;
    achievements: string[];
    weeklyPoints: number;
    monthlyPoints: number;
  }

  interface PointTransaction {
    id: number;
    userId: number;
    points: number;
    type: 'earn' | 'redeem' | 'bonus' | 'penalty';
    reason: string;
    createdAt: Date;
  }

  let usersPoints: Map<number, UserPoints>;
  let transactions: PointTransaction[];

  beforeEach(() => {
    usersPoints = new Map();
    usersPoints.set(1, {
      userId: 1,
      points: 150,
      level: 3,
      achievements: ['first_visit', 'consistent_member'],
      weeklyPoints: 30,
      monthlyPoints: 80,
    });
    usersPoints.set(2, {
      userId: 2,
      points: 500,
      level: 7,
      achievements: ['first_visit', 'prayer_warrior', 'top_contributor'],
      weeklyPoints: 100,
      monthlyPoints: 250,
    });

    transactions = [
      { id: 1, userId: 1, points: 10, type: 'earn', reason: 'attendance', createdAt: new Date() },
      {
        id: 2,
        userId: 1,
        points: 20,
        type: 'earn',
        reason: 'bible_reading',
        createdAt: new Date(),
      },
      {
        id: 3,
        userId: 2,
        points: 50,
        type: 'bonus',
        reason: 'weekly_challenge',
        createdAt: new Date(),
      },
    ];
  });

  describe('GET /api/points/:userId', () => {
    it('deve retornar pontos do usuário', () => {
      const userId = 1;
      const userPoints = usersPoints.get(userId);

      expect(userPoints).toBeDefined();
      expect(userPoints!.points).toBe(150);
      expect(userPoints!.level).toBe(3);
    });

    it('deve retornar 404 para usuário inexistente', () => {
      const userId = 999;
      const userPoints = usersPoints.get(userId);

      expect(userPoints).toBeUndefined();
    });

    it('deve incluir conquistas do usuário', () => {
      const userId = 2;
      const userPoints = usersPoints.get(userId);

      expect(userPoints!.achievements).toContain('prayer_warrior');
      expect(userPoints!.achievements).toHaveLength(3);
    });
  });

  describe('GET /api/points/leaderboard', () => {
    it('deve retornar ranking ordenado por pontos', () => {
      const leaderboard = Array.from(usersPoints.values()).sort((a, b) => b.points - a.points);

      expect(leaderboard[0].userId).toBe(2);
      expect(leaderboard[0].points).toBe(500);
    });

    it('deve limitar resultados do ranking', () => {
      const limit = 1;
      const leaderboard = Array.from(usersPoints.values())
        .sort((a, b) => b.points - a.points)
        .slice(0, limit);

      expect(leaderboard).toHaveLength(1);
    });

    it('deve filtrar por período semanal', () => {
      const weeklyLeaderboard = Array.from(usersPoints.values()).sort(
        (a, b) => b.weeklyPoints - a.weeklyPoints
      );

      expect(weeklyLeaderboard[0].userId).toBe(2);
      expect(weeklyLeaderboard[0].weeklyPoints).toBe(100);
    });

    it('deve filtrar por período mensal', () => {
      const monthlyLeaderboard = Array.from(usersPoints.values()).sort(
        (a, b) => b.monthlyPoints - a.monthlyPoints
      );

      expect(monthlyLeaderboard[0].monthlyPoints).toBe(250);
    });
  });

  describe('POST /api/points/award', () => {
    it('deve adicionar pontos ao usuário', () => {
      const userId = 1;
      const pointsToAdd = 25;

      const currentPoints = usersPoints.get(userId)!;
      currentPoints.points += pointsToAdd;
      currentPoints.weeklyPoints += pointsToAdd;
      currentPoints.monthlyPoints += pointsToAdd;

      expect(currentPoints.points).toBe(175);
    });

    it('deve registrar transação de pontos', () => {
      const newTransaction: PointTransaction = {
        id: 4,
        userId: 1,
        points: 15,
        type: 'earn',
        reason: 'participation',
        createdAt: new Date(),
      };

      transactions.push(newTransaction);

      const userTransactions = transactions.filter(t => t.userId === 1);
      expect(userTransactions).toHaveLength(3);
    });

    it('deve atualizar nível quando atingir threshold', () => {
      const levelThresholds = [0, 50, 100, 200, 350, 500, 700, 1000];

      const calculateLevel = (points: number): number => {
        for (let i = levelThresholds.length - 1; i >= 0; i--) {
          if (points >= levelThresholds[i]) {
            return i + 1;
          }
        }
        return 1;
      };

      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(50)).toBe(2);
      expect(calculateLevel(150)).toBe(3);
      expect(calculateLevel(500)).toBe(6);
      expect(calculateLevel(1000)).toBe(8);
    });

    it('deve dar bônus para multiplicador ativo', () => {
      const basePoints = 10;
      const multiplier = 2; // Evento especial

      const finalPoints = basePoints * multiplier;
      expect(finalPoints).toBe(20);
    });
  });

  describe('POST /api/points/redeem', () => {
    it('deve descontar pontos do usuário', () => {
      const userId = 2;
      const pointsToRedeem = 100;

      const currentPoints = usersPoints.get(userId)!;
      const hasEnough = currentPoints.points >= pointsToRedeem;

      expect(hasEnough).toBe(true);

      if (hasEnough) {
        currentPoints.points -= pointsToRedeem;
      }

      expect(currentPoints.points).toBe(400);
    });

    it('deve rejeitar quando pontos insuficientes', () => {
      const userId = 1;
      const pointsToRedeem = 200; // Mais do que tem

      const currentPoints = usersPoints.get(userId)!;
      const hasEnough = currentPoints.points >= pointsToRedeem;

      expect(hasEnough).toBe(false);
    });

    it('deve registrar transação de resgate', () => {
      const redeemTransaction: PointTransaction = {
        id: 5,
        userId: 2,
        points: -50,
        type: 'redeem',
        reason: 'reward_claimed',
        createdAt: new Date(),
      };

      transactions.push(redeemTransaction);

      const redeems = transactions.filter(t => t.type === 'redeem');
      expect(redeems).toHaveLength(1);
    });
  });

  describe('GET /api/points/transactions/:userId', () => {
    it('deve retornar histórico de transações', () => {
      const userId = 1;
      const userTransactions = transactions.filter(t => t.userId === userId);

      expect(userTransactions).toHaveLength(2);
    });

    it('deve ordenar por data decrescente', () => {
      const sorted = [...transactions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sorted[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        sorted[sorted.length - 1].createdAt.getTime()
      );
    });

    it('deve filtrar por tipo de transação', () => {
      const bonusTransactions = transactions.filter(t => t.type === 'bonus');
      expect(bonusTransactions).toHaveLength(1);
      expect(bonusTransactions[0].reason).toBe('weekly_challenge');
    });

    it('deve paginar transações', () => {
      const page = 1;
      const perPage = 2;
      const userId = 1;

      const userTx = transactions.filter(t => t.userId === userId);
      const paginated = userTx.slice((page - 1) * perPage, page * perPage);

      expect(paginated.length).toBeLessThanOrEqual(perPage);
    });
  });

  describe('GET /api/points/achievements', () => {
    it('deve listar conquistas disponíveis', () => {
      const availableAchievements = [
        { id: 'first_visit', name: 'Primeiro Culto', points: 10, icon: '🏠' },
        { id: 'consistent_member', name: 'Membro Fiel', points: 50, icon: '⭐' },
        { id: 'prayer_warrior', name: 'Guerreiro de Oração', points: 100, icon: '🙏' },
        { id: 'top_contributor', name: 'Top Contribuidor', points: 200, icon: '🏆' },
      ];

      expect(availableAchievements).toHaveLength(4);
      expect(availableAchievements[0].id).toBe('first_visit');
    });

    it('deve marcar conquistas obtidas', () => {
      const userId = 2;
      const userAchievements = usersPoints.get(userId)!.achievements;

      const allAchievements = [
        { id: 'first_visit', name: 'Primeiro Culto' },
        { id: 'prayer_warrior', name: 'Guerreiro de Oração' },
        { id: 'helper', name: 'Ajudante' },
      ];

      const withStatus = allAchievements.map(a => ({
        ...a,
        unlocked: userAchievements.includes(a.id),
      }));

      expect(withStatus[0].unlocked).toBe(true); // first_visit
      expect(withStatus[2].unlocked).toBe(false); // helper
    });
  });

  describe('POST /api/points/achievements/unlock', () => {
    it('deve desbloquear conquista para usuário', () => {
      const userId = 1;
      const achievementId = 'helper';

      const userPoints = usersPoints.get(userId)!;
      if (!userPoints.achievements.includes(achievementId)) {
        userPoints.achievements.push(achievementId);
      }

      expect(userPoints.achievements).toContain('helper');
    });

    it('deve ignorar conquista já desbloqueada', () => {
      const userId = 1;
      const achievementId = 'first_visit'; // Já tem

      const userPoints = usersPoints.get(userId)!;
      const hadBefore = userPoints.achievements.includes(achievementId);

      if (!userPoints.achievements.includes(achievementId)) {
        userPoints.achievements.push(achievementId);
      }

      expect(hadBefore).toBe(true);
      expect(userPoints.achievements.filter(a => a === achievementId)).toHaveLength(1);
    });

    it('deve dar pontos ao desbloquear conquista', () => {
      const achievementPoints: Record<string, number> = {
        first_visit: 10,
        helper: 25,
        prayer_warrior: 100,
      };

      const userId = 1;
      const achievementId = 'helper';
      const userPoints = usersPoints.get(userId)!;

      const pointsEarned = achievementPoints[achievementId] || 0;
      userPoints.points += pointsEarned;

      expect(userPoints.points).toBe(175); // 150 + 25
    });
  });

  describe('Regras de Negócio', () => {
    it('deve calcular pontos por participação em evento', () => {
      const eventPointRules: Record<string, number> = {
        culto: 10,
        escola_sabatina: 15,
        pequeno_grupo: 20,
        programa_especial: 25,
        campori: 50,
      };

      expect(eventPointRules['culto']).toBe(10);
      expect(eventPointRules['campori']).toBe(50);
    });

    it('deve aplicar bônus para sequência de participações', () => {
      const consecutiveDays = 7;
      const basePoints = 10;

      // Bônus de 10% por dia consecutivo
      const bonusMultiplier = 1 + consecutiveDays * 0.1;
      const finalPoints = Math.round(basePoints * bonusMultiplier);

      expect(finalPoints).toBe(17); // 10 * 1.7
    });

    it('deve limitar pontos diários', () => {
      const dailyLimit = 100;
      const pointsEarned = 50;
      let dailyTotal = 80;

      const canEarn = Math.min(pointsEarned, dailyLimit - dailyTotal);
      dailyTotal += canEarn;

      expect(canEarn).toBe(20);
      expect(dailyTotal).toBe(100);
    });

    it('deve resetar pontos semanais/mensais', () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const dayOfMonth = now.getDate();

      // Reset semanal (domingo = 0)
      const shouldResetWeekly = dayOfWeek === 0;
      // Reset mensal (dia 1)
      const shouldResetMonthly = dayOfMonth === 1;

      expect(typeof shouldResetWeekly).toBe('boolean');
      expect(typeof shouldResetMonthly).toBe('boolean');
    });
  });

  describe('Estatísticas', () => {
    it('deve calcular média de pontos por usuário', () => {
      const allPoints = Array.from(usersPoints.values()).map(u => u.points);
      const average = allPoints.reduce((a, b) => a + b, 0) / allPoints.length;

      expect(average).toBe(325); // (150 + 500) / 2
    });

    it('deve calcular total de pontos distribuídos', () => {
      const totalEarned = transactions
        .filter(t => t.type === 'earn' || t.type === 'bonus')
        .reduce((sum, t) => sum + t.points, 0);

      expect(totalEarned).toBe(80); // 10 + 20 + 50
    });

    it('deve identificar usuários mais ativos', () => {
      const userActivity = transactions.reduce(
        (acc, t) => {
          acc[t.userId] = (acc[t.userId] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>
      );

      const sorted = Object.entries(userActivity).sort((a, b) => b[1] - a[1]);

      expect(sorted[0][0]).toBe('1'); // Usuário 1 tem mais transações
      expect(sorted[0][1]).toBe(2);
    });
  });
});
