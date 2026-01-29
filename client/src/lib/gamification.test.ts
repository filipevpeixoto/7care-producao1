import { describe, it, expect } from 'vitest';
import {
  getLevelByPoints,
  getNextLevel,
  getProgressToNextLevel,
  getPointsToNextLevel,
  getMountName,
  getLevelName,
  getLevelColor,
  getLevelIcon,
  getLevelDescription,
  GAMIFICATION_LEVELS,
} from './gamification';

describe('gamification', () => {
  describe('getLevelByPoints', () => {
    it('returns Vale do Jordão for 0 points', () => {
      const level = getLevelByPoints(0);
      expect(level.name).toBe('Vale do Jordão');
      expect(level.id).toBe(0);
    });

    it('returns Monte Sinai for 300 points', () => {
      const level = getLevelByPoints(300);
      expect(level.name).toBe('Monte Sinai');
      expect(level.id).toBe(1);
    });

    it('returns Monte Nebo for 450 points (middle of range)', () => {
      const level = getLevelByPoints(450);
      expect(level.name).toBe('Monte Nebo');
      expect(level.id).toBe(2);
    });

    it('returns Canaã for 1000+ points', () => {
      const level = getLevelByPoints(1000);
      expect(level.name).toBe('Canaã');
      expect(level.id).toBe(8);
    });

    it('returns Canaã for very high points', () => {
      const level = getLevelByPoints(5000);
      expect(level.name).toBe('Canaã');
    });

    it('returns first level for negative points', () => {
      const level = getLevelByPoints(-100);
      expect(level.id).toBe(0);
    });
  });

  describe('getNextLevel', () => {
    it('returns Monte Sinai for points in Vale do Jordão', () => {
      const nextLevel = getNextLevel(100);
      expect(nextLevel?.name).toBe('Monte Sinai');
    });

    it('returns null for Canaã (max level)', () => {
      const nextLevel = getNextLevel(1000);
      expect(nextLevel).toBeNull();
    });

    it('returns correct next level for each level', () => {
      expect(getNextLevel(0)?.id).toBe(1);
      expect(getNextLevel(300)?.id).toBe(2);
      expect(getNextLevel(400)?.id).toBe(3);
      expect(getNextLevel(500)?.id).toBe(4);
    });
  });

  describe('getProgressToNextLevel', () => {
    it('returns 0% at the start of a level', () => {
      const progress = getProgressToNextLevel(300); // Start of Monte Sinai
      expect(progress).toBe(0);
    });

    it('returns 50% at halfway through a level', () => {
      // Vale do Jordão: 0-299, next at 300
      // 150 is halfway through 300 points needed
      const progress = getProgressToNextLevel(150);
      expect(progress).toBe(50);
    });

    it('returns 100% for max level', () => {
      const progress = getProgressToNextLevel(1000);
      expect(progress).toBe(100);
    });
  });

  describe('getPointsToNextLevel', () => {
    it('returns correct points needed from 0', () => {
      const pointsNeeded = getPointsToNextLevel(0);
      expect(pointsNeeded).toBe(300); // Need 300 to reach Monte Sinai
    });

    it('returns correct points from middle of level', () => {
      const pointsNeeded = getPointsToNextLevel(350); // Middle of Monte Sinai
      expect(pointsNeeded).toBe(50); // Need 50 more for Monte Nebo at 400
    });

    it('returns 0 for max level', () => {
      const pointsNeeded = getPointsToNextLevel(1000);
      expect(pointsNeeded).toBe(0);
    });
  });

  describe('getMountName', () => {
    it('returns mount name for given points', () => {
      expect(getMountName(0)).toBe('Vale do Jordão');
      expect(getMountName(500)).toBe('Monte Moriá');
      expect(getMountName(1000)).toBe('Canaã');
    });
  });

  describe('getLevelName', () => {
    it('returns level name for given points', () => {
      expect(getLevelName(0)).toBe('Vale do Jordão');
      expect(getLevelName(700)).toBe('Monte Hermon');
    });
  });

  describe('getLevelColor', () => {
    it('returns correct color class for each level', () => {
      expect(getLevelColor(0)).toBe('text-gray-600');
      expect(getLevelColor(300)).toBe('text-orange-600');
      expect(getLevelColor(600)).toBe('text-green-600');
    });
  });

  describe('getLevelIcon', () => {
    it('returns correct icon for each level', () => {
      expect(getLevelIcon(0)).toBe('valley');
      expect(getLevelIcon(300)).toBe('mountain-1');
      expect(getLevelIcon(1000)).toBe('mountain-8');
    });
  });

  describe('getLevelDescription', () => {
    it('returns description for given points', () => {
      const description = getLevelDescription(0);
      expect(description).toContain('início da jornada');
    });
  });

  describe('GAMIFICATION_LEVELS', () => {
    it('has 9 levels total', () => {
      expect(GAMIFICATION_LEVELS).toHaveLength(9);
    });

    it('levels are ordered by id', () => {
      for (let i = 0; i < GAMIFICATION_LEVELS.length; i++) {
        expect(GAMIFICATION_LEVELS[i].id).toBe(i);
      }
    });

    it('all levels have required properties', () => {
      GAMIFICATION_LEVELS.forEach(level => {
        expect(level).toHaveProperty('id');
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('mount');
        expect(level).toHaveProperty('minPoints');
        expect(level).toHaveProperty('color');
        expect(level).toHaveProperty('benefits');
        expect(level).toHaveProperty('icon');
        expect(level).toHaveProperty('description');
        expect(level.benefits.length).toBeGreaterThan(0);
      });
    });

    it('minPoints are in ascending order', () => {
      for (let i = 1; i < GAMIFICATION_LEVELS.length; i++) {
        expect(GAMIFICATION_LEVELS[i].minPoints).toBeGreaterThan(
          GAMIFICATION_LEVELS[i - 1].minPoints
        );
      }
    });
  });
});
