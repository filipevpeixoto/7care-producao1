/**
 * Testes do módulo de pontos
 */

const {
  DEFAULT_POINTS_CONFIG,
  calculateUserPoints,
  calculateStepProgress,
  calculateLevel,
  calculateGroupStats,
  calculateChurchRanking
} = require('../../netlify/functions/modules/points.cjs');

describe('Points Module', () => {
  describe('DEFAULT_POINTS_CONFIG', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_POINTS_CONFIG.etapa1).toBeDefined();
      expect(DEFAULT_POINTS_CONFIG.etapa2).toBeDefined();
      expect(DEFAULT_POINTS_CONFIG.etapa3).toBeDefined();
      expect(DEFAULT_POINTS_CONFIG.etapa4).toBeDefined();
      expect(DEFAULT_POINTS_CONFIG.etapa5).toBeDefined();
      expect(DEFAULT_POINTS_CONFIG.etapa6).toBeDefined();
      expect(DEFAULT_POINTS_CONFIG.etapa7).toBeDefined();
      expect(DEFAULT_POINTS_CONFIG.biblicalStudies).toBeDefined();
    });
  });

  describe('calculateUserPoints', () => {
    it('should return 0 for user with no activities', () => {
      const user = {};
      expect(calculateUserPoints(user)).toBe(0);
    });

    it('should calculate points for step 1 activities', () => {
      const user = {
        step1_orar_por_1: true,
        step1_orar_por_2: true,
        step1_orar_por_3: false
      };
      expect(calculateUserPoints(user)).toBe(20); // 10 + 10
    });

    it('should calculate points for all steps', () => {
      const user = {
        step1_orar_por_1: true,
        step2_cuidar_de_1: true,
        step3_cultivar_1: true,
        step4_convidar_1: true,
        step5_apresentar_1: true,
        step6_preparar_1: true,
        step7_batismo_1: true
      };
      // 10 + 10 + 15 + 15 + 20 + 20 + 25 = 115
      expect(calculateUserPoints(user)).toBe(115);
    });

    it('should add biblical studies points', () => {
      const user = {
        estudos_biblicos_count: 3
      };
      expect(calculateUserPoints(user)).toBe(45); // 3 * 15
    });

    it('should use custom config if provided', () => {
      const user = { step1_orar_por_1: true };
      const customConfig = { ...DEFAULT_POINTS_CONFIG, etapa1: 50 };
      expect(calculateUserPoints(user, customConfig)).toBe(50);
    });
  });

  describe('calculateStepProgress', () => {
    it('should count completed activities per step', () => {
      const user = {
        step1_orar_por_1: true,
        step1_orar_por_2: true,
        step1_orar_por_3: false,
        step2_cuidar_de_1: true,
        step2_cuidar_de_2: false,
        step2_cuidar_de_3: false
      };
      const progress = calculateStepProgress(user);
      expect(progress.step1).toBe(2);
      expect(progress.step2).toBe(1);
      expect(progress.step3).toBe(0);
    });

    it('should return 0 for all steps when user is empty', () => {
      const progress = calculateStepProgress({});
      Object.values(progress).forEach(value => {
        expect(value).toBe(0);
      });
    });
  });

  describe('calculateLevel', () => {
    it('should return Semente for 0 points', () => {
      const level = calculateLevel(0);
      expect(level.name).toBe('Semente');
      expect(level.level).toBe(1);
      expect(level.icon).toBe('🌱');
    });

    it('should return Broto for 50-149 points', () => {
      const level = calculateLevel(75);
      expect(level.name).toBe('Broto');
      expect(level.level).toBe(2);
    });

    it('should return Pescador for 1000+ points', () => {
      const level = calculateLevel(1500);
      expect(level.name).toBe('Pescador');
      expect(level.level).toBe(7);
      expect(level.nextLevel).toBe(null);
    });

    it('should include progress percent', () => {
      const level = calculateLevel(100);
      expect(level.progressPercent).toBeDefined();
      expect(level.progressPercent).toBeGreaterThanOrEqual(0);
      expect(level.progressPercent).toBeLessThanOrEqual(100);
    });

    it('should include points needed for next level', () => {
      const level = calculateLevel(30);
      expect(level.nextLevel).toBeDefined();
      expect(level.nextLevel.pointsNeeded).toBe(20); // 50 - 30
    });
  });

  describe('calculateGroupStats', () => {
    it('should handle empty array', () => {
      const stats = calculateGroupStats([]);
      expect(stats.totalMembers).toBe(0);
      expect(stats.totalPoints).toBe(0);
      expect(stats.averagePoints).toBe(0);
      expect(stats.participationRate).toBe(0);
    });

    it('should calculate stats for multiple users', () => {
      const users = [
        { id: 1, name: 'User 1', points: 100 },
        { id: 2, name: 'User 2', points: 200 },
        { id: 3, name: 'User 3', points: 0 }
      ];
      const stats = calculateGroupStats(users);
      expect(stats.totalMembers).toBe(3);
      expect(stats.totalPoints).toBe(300);
      expect(stats.averagePoints).toBe(100);
      expect(stats.participationRate).toBe(67); // 2/3 = 66.67%
    });

    it('should return top performers', () => {
      const users = [
        { id: 1, name: 'Top', points: 500 },
        { id: 2, name: 'Mid', points: 250 },
        { id: 3, name: 'Low', points: 100 }
      ];
      const stats = calculateGroupStats(users);
      expect(stats.topPerformers[0].name).toBe('Top');
      expect(stats.topPerformers[0].points).toBe(500);
    });

    it('should calculate step progress percentages', () => {
      const users = [
        {
          id: 1,
          points: 30,
          step1_orar_por_1: true,
          step1_orar_por_2: true,
          step1_orar_por_3: true
        }
      ];
      const stats = calculateGroupStats(users);
      expect(stats.stepProgress.step1).toBe(100);
      expect(stats.stepProgress.step2).toBe(0);
    });
  });

  describe('calculateChurchRanking', () => {
    it('should sort users by points descending', () => {
      const users = [
        { id: 1, name: 'Low', points: 50 },
        { id: 2, name: 'High', points: 200 },
        { id: 3, name: 'Mid', points: 100 }
      ];
      const ranking = calculateChurchRanking(users);
      expect(ranking[0].name).toBe('High');
      expect(ranking[0].rank).toBe(1);
      expect(ranking[1].name).toBe('Mid');
      expect(ranking[1].rank).toBe(2);
      expect(ranking[2].name).toBe('Low');
      expect(ranking[2].rank).toBe(3);
    });

    it('should include level information', () => {
      const users = [{ id: 1, name: 'User', points: 100 }];
      const ranking = calculateChurchRanking(users);
      expect(ranking[0].level).toBeDefined();
      expect(ranking[0].level.name).toBe('Broto');
    });
  });
});
