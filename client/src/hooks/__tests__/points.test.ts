/**
 * Testes para cálculo de pontos
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals';

describe('User Points Calculation', () => {
  describe('Cálculo de Pontos', () => {
    it('deve calcular pontos básicos corretamente', () => {
      const calculatePoints = (activities: { type: string; value: number }[]) => {
        const pointsConfig: Record<string, number> = {
          attendance: 10,
          event: 15,
          visit: 20,
          discipleship: 25,
          donation: 5,
        };

        return activities.reduce((total, activity) => {
          const points = pointsConfig[activity.type] || 0;
          return total + (points * activity.value);
        }, 0);
      };

      const activities = [
        { type: 'attendance', value: 4 },
        { type: 'event', value: 2 },
        { type: 'visit', value: 1 },
      ];

      expect(calculatePoints(activities)).toBe(90);
    });

    it('deve calcular nível baseado em pontos', () => {
      const calculateLevel = (points: number): string => {
        if (points >= 1000) return 'diamond';
        if (points >= 500) return 'gold';
        if (points >= 200) return 'silver';
        if (points >= 50) return 'bronze';
        return 'beginner';
      };

      expect(calculateLevel(0)).toBe('beginner');
      expect(calculateLevel(49)).toBe('beginner');
      expect(calculateLevel(50)).toBe('bronze');
      expect(calculateLevel(199)).toBe('bronze');
      expect(calculateLevel(200)).toBe('silver');
      expect(calculateLevel(499)).toBe('silver');
      expect(calculateLevel(500)).toBe('gold');
      expect(calculateLevel(999)).toBe('gold');
      expect(calculateLevel(1000)).toBe('diamond');
      expect(calculateLevel(5000)).toBe('diamond');
    });

    it('deve retornar 0 para atividade desconhecida', () => {
      const calculatePoints = (activities: { type: string; value: number }[]) => {
        const pointsConfig: Record<string, number> = {
          attendance: 10,
          event: 15,
          visit: 20,
          discipleship: 25,
          donation: 5,
        };

        return activities.reduce((total, activity) => {
          const points = pointsConfig[activity.type] || 0;
          return total + (points * activity.value);
        }, 0);
      };

      const activities = [
        { type: 'unknown', value: 10 },
      ];

      expect(calculatePoints(activities)).toBe(0);
    });
  });

  describe('Breakdown de Pontos', () => {
    interface UserData {
      totalPresenca: number;
      comunhao: number;
      missao: number;
      estudoBiblico: number;
      batizouAlguem: boolean;
      discipuladoPosBatismo: number;
      temLicao: boolean;
      cargos: string[];
    }

    it('deve calcular breakdown por categoria', () => {
      const calculateBreakdown = (userData: UserData) => {
        return {
          presenca: Math.min(userData.totalPresenca * 2, 100),
          comunhao: Math.min(userData.comunhao * 5, 50),
          missao: Math.min(userData.missao * 5, 50),
          estudoBiblico: Math.min(userData.estudoBiblico * 3, 30),
          batismo: userData.batizouAlguem ? 100 : 0,
          discipulado: Math.min(userData.discipuladoPosBatismo * 10, 50),
          licao: userData.temLicao ? 20 : 0,
          cargos: userData.cargos.length * 15,
        };
      };

      const userData: UserData = {
        totalPresenca: 30,
        comunhao: 8,
        missao: 5,
        estudoBiblico: 10,
        batizouAlguem: true,
        discipuladoPosBatismo: 3,
        temLicao: true,
        cargos: ['Diácono', 'Professor'],
      };

      const breakdown = calculateBreakdown(userData);

      expect(breakdown.presenca).toBe(60);
      expect(breakdown.comunhao).toBe(40);
      expect(breakdown.missao).toBe(25);
      expect(breakdown.batismo).toBe(100);
      expect(breakdown.licao).toBe(20);
      expect(breakdown.cargos).toBe(30);
    });

    it('deve aplicar limites máximos corretamente', () => {
      const calculateBreakdown = (userData: UserData) => {
        return {
          presenca: Math.min(userData.totalPresenca * 2, 100),
          comunhao: Math.min(userData.comunhao * 5, 50),
          missao: Math.min(userData.missao * 5, 50),
        };
      };

      const userData: UserData = {
        totalPresenca: 100, // 100 * 2 = 200, mas max é 100
        comunhao: 20, // 20 * 5 = 100, mas max é 50
        missao: 20, // 20 * 5 = 100, mas max é 50
        estudoBiblico: 0,
        batizouAlguem: false,
        discipuladoPosBatismo: 0,
        temLicao: false,
        cargos: [],
      };

      const breakdown = calculateBreakdown(userData);

      expect(breakdown.presenca).toBe(100);
      expect(breakdown.comunhao).toBe(50);
      expect(breakdown.missao).toBe(50);
    });
  });

  describe('Ranking', () => {
    it('deve ordenar usuários por pontos', () => {
      const users = [
        { id: 1, name: 'Alice', points: 150 },
        { id: 2, name: 'Bob', points: 500 },
        { id: 3, name: 'Carol', points: 250 },
        { id: 4, name: 'David', points: 100 },
      ];

      const ranked = [...users].sort((a, b) => b.points - a.points);

      expect(ranked[0].name).toBe('Bob');
      expect(ranked[1].name).toBe('Carol');
      expect(ranked[2].name).toBe('Alice');
      expect(ranked[3].name).toBe('David');
    });

    it('deve calcular posição no ranking', () => {
      const calculateRankPosition = (userPoints: number, allPoints: number[]): number => {
        const sorted = [...allPoints].sort((a, b) => b - a);
        return sorted.indexOf(userPoints) + 1;
      };

      const allPoints = [100, 500, 250, 150, 300];
      
      expect(calculateRankPosition(500, allPoints)).toBe(1);
      expect(calculateRankPosition(300, allPoints)).toBe(2);
      expect(calculateRankPosition(100, allPoints)).toBe(5);
    });

    it('deve lidar com empates no ranking', () => {
      const calculateRankPosition = (userPoints: number, allPoints: number[]): number => {
        const sorted = [...allPoints].sort((a, b) => b - a);
        return sorted.indexOf(userPoints) + 1;
      };

      const allPoints = [100, 200, 200, 300];
      
      expect(calculateRankPosition(300, allPoints)).toBe(1);
      expect(calculateRankPosition(200, allPoints)).toBe(2); // Primeiro 200
      expect(calculateRankPosition(100, allPoints)).toBe(4);
    });
  });
});

describe('Points Configuration', () => {
  it('deve ter valores padrão de configuração', () => {
    const defaultConfig = {
      attendancePoints: 10,
      eventParticipationPoints: 15,
      visitPoints: 20,
      discipleshipPoints: 25,
      donationPoints: 5,
      maxDailyPoints: 100,
      streakBonus: 5,
    };

    expect(defaultConfig.attendancePoints).toBeGreaterThan(0);
    expect(defaultConfig.maxDailyPoints).toBeGreaterThanOrEqual(100);
    expect(Object.keys(defaultConfig)).toHaveLength(7);
  });

  it('deve aplicar limite máximo de pontos diários', () => {
    const applyDailyLimit = (earnedPoints: number, maxDaily: number): number => {
      return Math.min(earnedPoints, maxDaily);
    };

    expect(applyDailyLimit(50, 100)).toBe(50);
    expect(applyDailyLimit(150, 100)).toBe(100);
    expect(applyDailyLimit(100, 100)).toBe(100);
  });

  it('deve calcular bônus de streak', () => {
    const calculateStreakBonus = (consecutiveDays: number, bonusPerDay: number): number => {
      return consecutiveDays * bonusPerDay;
    };

    expect(calculateStreakBonus(0, 5)).toBe(0);
    expect(calculateStreakBonus(7, 5)).toBe(35);
    expect(calculateStreakBonus(30, 5)).toBe(150);
  });
});

describe('Points Aggregation', () => {
  it('deve agregar pontos por período', () => {
    type PointEntry = { date: string; points: number };
    
    const aggregateByMonth = (entries: PointEntry[]): Record<string, number> => {
      return entries.reduce((acc, entry) => {
        const month = entry.date.substring(0, 7);
        acc[month] = (acc[month] || 0) + entry.points;
        return acc;
      }, {} as Record<string, number>);
    };

    const entries: PointEntry[] = [
      { date: '2026-01-01', points: 10 },
      { date: '2026-01-15', points: 20 },
      { date: '2026-02-01', points: 15 },
    ];

    const aggregated = aggregateByMonth(entries);

    expect(aggregated['2026-01']).toBe(30);
    expect(aggregated['2026-02']).toBe(15);
  });

  it('deve calcular total de pontos', () => {
    const calculateTotal = (categories: Record<string, number>): number => {
      return Object.values(categories).reduce((sum, val) => sum + val, 0);
    };

    const breakdown = {
      presenca: 60,
      comunhao: 40,
      missao: 25,
      batismo: 100,
    };

    expect(calculateTotal(breakdown)).toBe(225);
  });
});
