import { describe, it, expect } from 'vitest';
import { PointsCalculator, UserData } from './pointsCalculator';

describe('PointsCalculator', () => {
  describe('calculateEngagementPoints', () => {
    it('returns correct points for each engagement level', () => {
      expect(PointsCalculator.calculateEngagementPoints('Baixo')).toBe(10);
      expect(PointsCalculator.calculateEngagementPoints('Médio')).toBe(25);
      expect(PointsCalculator.calculateEngagementPoints('Alto')).toBe(50);
      expect(PointsCalculator.calculateEngagementPoints('Frequente')).toBe(75);
    });

    it('returns 0 for undefined engagement', () => {
      expect(PointsCalculator.calculateEngagementPoints(undefined)).toBe(0);
    });

    it('returns 0 for unknown engagement level', () => {
      expect(PointsCalculator.calculateEngagementPoints('Unknown')).toBe(0);
    });
  });

  describe('calculateClassificationPoints', () => {
    it('returns correct points for each classification', () => {
      expect(PointsCalculator.calculateClassificationPoints('Frequente')).toBe(75);
      expect(PointsCalculator.calculateClassificationPoints('Pontual')).toBe(25);
      expect(PointsCalculator.calculateClassificationPoints('A resgatar')).toBe(25);
    });

    it('returns 0 for undefined classification', () => {
      expect(PointsCalculator.calculateClassificationPoints(undefined)).toBe(0);
    });
  });

  describe('calculateTitherPoints', () => {
    it('returns correct points for each tithe status', () => {
      expect(PointsCalculator.calculateTitherPoints('Não dizimista')).toBe(0);
      expect(PointsCalculator.calculateTitherPoints('Pontual (1-3 meses)')).toBe(25);
      expect(PointsCalculator.calculateTitherPoints('Sazonal (4-7 meses)')).toBe(50);
      expect(PointsCalculator.calculateTitherPoints('Recorrente (8-12 meses)')).toBe(100);
    });
  });

  describe('calculateOfferingPoints', () => {
    it('returns correct points for each offering status', () => {
      expect(PointsCalculator.calculateOfferingPoints('Não ofertante')).toBe(0);
      expect(PointsCalculator.calculateOfferingPoints('Ofertante')).toBe(25);
      expect(PointsCalculator.calculateOfferingPoints('Pontual (1-3 meses)')).toBe(25);
      expect(PointsCalculator.calculateOfferingPoints('Sazonal (4-7 meses)')).toBe(50);
      expect(PointsCalculator.calculateOfferingPoints('Recorrente (8-12 meses)')).toBe(100);
    });
  });

  describe('calculateBaptismTimePoints', () => {
    it('returns correct points for numeric years', () => {
      expect(PointsCalculator.calculateBaptismTimePoints(1)).toBe(25);
      expect(PointsCalculator.calculateBaptismTimePoints(3)).toBe(50);
      expect(PointsCalculator.calculateBaptismTimePoints(7)).toBe(100);
      expect(PointsCalculator.calculateBaptismTimePoints(12)).toBe(150);
      expect(PointsCalculator.calculateBaptismTimePoints(18)).toBe(200);
      expect(PointsCalculator.calculateBaptismTimePoints(30)).toBe(200);
    });

    it('returns correct points for string ranges', () => {
      expect(PointsCalculator.calculateBaptismTimePoints('2 a 4 anos')).toBe(25);
      expect(PointsCalculator.calculateBaptismTimePoints('5 a 9 anos')).toBe(50);
      expect(PointsCalculator.calculateBaptismTimePoints('10 a 14 anos')).toBe(100);
      expect(PointsCalculator.calculateBaptismTimePoints('15 a 19 anos')).toBe(150);
      expect(PointsCalculator.calculateBaptismTimePoints('20 a 29 anos')).toBe(200);
      expect(PointsCalculator.calculateBaptismTimePoints('30+ anos')).toBe(200);
    });

    it('returns 0 for undefined', () => {
      expect(PointsCalculator.calculateBaptismTimePoints(undefined)).toBe(0);
    });
  });

  describe('calculatePositionsPoints', () => {
    it('returns correct points based on number of positions', () => {
      expect(PointsCalculator.calculatePositionsPoints(['Líder'])).toBe(50);
      expect(PointsCalculator.calculatePositionsPoints(['Líder', 'Músico'])).toBe(100);
      expect(PointsCalculator.calculatePositionsPoints(['Líder', 'Músico', 'Professor'])).toBe(150);
      expect(PointsCalculator.calculatePositionsPoints(['A', 'B', 'C', 'D'])).toBe(150);
    });

    it('returns 0 for empty or undefined positions', () => {
      expect(PointsCalculator.calculatePositionsPoints(undefined)).toBe(0);
      expect(PointsCalculator.calculatePositionsPoints([])).toBe(0);
    });

    it('ignores empty string positions', () => {
      expect(PointsCalculator.calculatePositionsPoints(['Líder', '', '  '])).toBe(50);
    });
  });

  describe('calculateComunhaoPoints', () => {
    it('returns points as comunhao * 50', () => {
      expect(PointsCalculator.calculateComunhaoPoints(0)).toBe(0);
      expect(PointsCalculator.calculateComunhaoPoints(1)).toBe(50);
      expect(PointsCalculator.calculateComunhaoPoints(5)).toBe(250);
      expect(PointsCalculator.calculateComunhaoPoints(13)).toBe(650);
    });

    it('returns 0 for invalid values', () => {
      expect(PointsCalculator.calculateComunhaoPoints(undefined)).toBe(0);
      expect(PointsCalculator.calculateComunhaoPoints(-1)).toBe(0);
      expect(PointsCalculator.calculateComunhaoPoints(14)).toBe(0);
    });
  });

  describe('calculateMissaoPoints', () => {
    it('returns points as missao * 75', () => {
      expect(PointsCalculator.calculateMissaoPoints(0)).toBe(0);
      expect(PointsCalculator.calculateMissaoPoints(5)).toBe(375);
      expect(PointsCalculator.calculateMissaoPoints(10)).toBe(750);
      expect(PointsCalculator.calculateMissaoPoints(13)).toBe(975);
    });
  });

  describe('calculateEstudoBiblicoPoints', () => {
    it('returns points as estudoBiblico * 100', () => {
      expect(PointsCalculator.calculateEstudoBiblicoPoints(0)).toBe(0);
      expect(PointsCalculator.calculateEstudoBiblicoPoints(5)).toBe(500);
      expect(PointsCalculator.calculateEstudoBiblicoPoints(10)).toBe(1000);
      expect(PointsCalculator.calculateEstudoBiblicoPoints(13)).toBe(1300);
    });
  });

  describe('calculateAttendancePoints', () => {
    it('returns correct points for attendance ranges', () => {
      expect(PointsCalculator.calculateAttendancePoints(0)).toBe(0);
      expect(PointsCalculator.calculateAttendancePoints(3)).toBe(25);
      expect(PointsCalculator.calculateAttendancePoints(7)).toBe(50);
      expect(PointsCalculator.calculateAttendancePoints(13)).toBe(100);
      expect(PointsCalculator.calculateAttendancePoints(15)).toBe(100);
    });
  });

  describe('calculateBaptismPoints', () => {
    it('returns 200 points for baptizing someone', () => {
      expect(PointsCalculator.calculateBaptismPoints(true)).toBe(200);
      expect(PointsCalculator.calculateBaptismPoints(1)).toBe(200);
      expect(PointsCalculator.calculateBaptismPoints(false)).toBe(0);
      expect(PointsCalculator.calculateBaptismPoints(0)).toBe(0);
      expect(PointsCalculator.calculateBaptismPoints(undefined)).toBe(0);
    });
  });

  describe('calculatePostBaptismPoints', () => {
    it('returns points as discipulado * 150', () => {
      expect(PointsCalculator.calculatePostBaptismPoints(0)).toBe(0);
      expect(PointsCalculator.calculatePostBaptismPoints(1)).toBe(150);
      expect(PointsCalculator.calculatePostBaptismPoints(3)).toBe(450);
    });

    it('returns 0 for negative values', () => {
      expect(PointsCalculator.calculatePostBaptismPoints(-1)).toBe(0);
    });
  });

  describe('calculateValidCPFPoints', () => {
    it('returns 25 points for valid CPF', () => {
      expect(PointsCalculator.calculateValidCPFPoints(true)).toBe(25);
      expect(PointsCalculator.calculateValidCPFPoints('Sim')).toBe(25);
      expect(PointsCalculator.calculateValidCPFPoints(false)).toBe(0);
      expect(PointsCalculator.calculateValidCPFPoints('Não')).toBe(0);
      expect(PointsCalculator.calculateValidCPFPoints(undefined)).toBe(0);
    });
  });

  describe('calculateEmptyFieldsPoints', () => {
    it('returns 50 points when no empty fields', () => {
      expect(PointsCalculator.calculateEmptyFieldsPoints(false)).toBe(50);
      expect(PointsCalculator.calculateEmptyFieldsPoints('false')).toBe(50);
      expect(PointsCalculator.calculateEmptyFieldsPoints(true)).toBe(0);
      expect(PointsCalculator.calculateEmptyFieldsPoints('true')).toBe(0);
    });
  });

  describe('calculateLessonPoints', () => {
    it('returns 50 points for having lesson', () => {
      expect(PointsCalculator.calculateLessonPoints(true)).toBe(50);
      expect(PointsCalculator.calculateLessonPoints(1)).toBe(50);
      expect(PointsCalculator.calculateLessonPoints(false)).toBe(0);
      expect(PointsCalculator.calculateLessonPoints(0)).toBe(0);
    });
  });

  describe('calculateUnitNamePoints', () => {
    it('returns 25 points for having unit name', () => {
      expect(PointsCalculator.calculateUnitNamePoints('Unidade 1')).toBe(25);
      expect(PointsCalculator.calculateUnitNamePoints('')).toBe(0);
      expect(PointsCalculator.calculateUnitNamePoints('   ')).toBe(0);
      expect(PointsCalculator.calculateUnitNamePoints(undefined)).toBe(0);
    });
  });

  describe('calculateTotalPoints', () => {
    it('includes camposVaziosACMS bonus when empty', () => {
      const userData: UserData = {}; // camposVaziosACMS is undefined, so 50 points
      expect(PointsCalculator.calculateTotalPoints(userData)).toBe(50);
    });

    it('correctly sums multiple categories', () => {
      const userData: UserData = {
        engajamento: 'Alto', // 50
        classificacao: 'Pontual', // 25
        dizimista: 'Pontual (1-3 meses)', // 25
        temLicao: true, // 50
        // camposVaziosACMS undefined = 50
      };
      expect(PointsCalculator.calculateTotalPoints(userData)).toBe(200);
    });
  });

  describe('calculateDetailedPoints', () => {
    it('returns breakdown of all point categories', () => {
      const userData: UserData = {
        engajamento: 'Alto',
        classificacao: 'Pontual',
      };
      const result = PointsCalculator.calculateDetailedPoints(userData);

      expect(result.breakdown.engajamento).toBe(50);
      expect(result.breakdown.classificacao).toBe(25);
      expect(result.total).toBe(125); // 50 + 25 + 50 (camposVazios)
    });

    it('includes all categories in breakdown', () => {
      const userData: UserData = {};
      const result = PointsCalculator.calculateDetailedPoints(userData);

      expect(result.breakdown).toHaveProperty('engajamento');
      expect(result.breakdown).toHaveProperty('classificacao');
      expect(result.breakdown).toHaveProperty('dizimista');
      expect(result.breakdown).toHaveProperty('ofertante');
      expect(result.breakdown).toHaveProperty('tempoBatismo');
      expect(result.breakdown).toHaveProperty('cargos');
      expect(result.breakdown).toHaveProperty('nomeUnidade');
      expect(result.breakdown).toHaveProperty('temLicao');
      expect(result.breakdown).toHaveProperty('comunhao');
      expect(result.breakdown).toHaveProperty('missao');
      expect(result.breakdown).toHaveProperty('estudoBiblico');
      expect(result.breakdown).toHaveProperty('totalPresenca');
      expect(result.breakdown).toHaveProperty('batizouAlguem');
      expect(result.breakdown).toHaveProperty('discipuladoPosBatismo');
      expect(result.breakdown).toHaveProperty('cpfValido');
      expect(result.breakdown).toHaveProperty('camposVaziosACMS');
      expect(result).toHaveProperty('total');
    });
  });
});
