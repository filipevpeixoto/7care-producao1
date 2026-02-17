/**
 * Points Calculation unit tests
 * Tests parseExtraData and calculateUserPointsFromConfig — pure business logic, no mocks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  parseExtraData,
  calculateUserPointsFromConfig,
  type PointsConfig,
} from '../services/pointsCalculation';

/** Helper to create a minimal User with extraData */
const makeUser = (extraData: unknown) =>
  ({ id: 1, name: 'Test', email: 'test@test.com', extraData }) as any;

describe('pointsCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────
  // parseExtraData
  // ────────────────────────────────────────────────────────────────
  describe('parseExtraData', () => {
    it('parses string JSON extraData', () => {
      const user = makeUser('{"engajamento":"Alto","classificacao":"Frequente"}');
      const result = parseExtraData(user);

      expect(result.engajamento).toBe('Alto');
      expect(result.classificacao).toBe('Frequente');
    });

    it('returns object extraData as-is', () => {
      const obj = { engajamento: 'Medio', temLicao: true };
      const user = makeUser(obj);
      const result = parseExtraData(user);

      expect(result).toEqual(obj);
    });

    it('returns empty object when extraData is null', () => {
      const user = makeUser(null);
      expect(parseExtraData(user)).toEqual({});
    });

    it('returns empty object when extraData is undefined', () => {
      const user = makeUser(undefined);
      expect(parseExtraData(user)).toEqual({});
    });

    it('returns empty object for invalid JSON string', () => {
      const user = makeUser('this is not json');
      expect(parseExtraData(user)).toEqual({});
    });
  });

  // ────────────────────────────────────────────────────────────────
  // calculateUserPointsFromConfig
  // ────────────────────────────────────────────────────────────────
  describe('calculateUserPointsFromConfig', () => {
    const fullConfig: PointsConfig = {
      engajamento: { alto: 30, medio: 20, baixo: 10 },
      classificacao: { frequente: 15, naoFrequente: 5 },
      dizimista: { naoDizimista: 0, recorrente: 20, sazonal: 10, pontual: 5 },
      ofertante: { naoOfertante: 0, recorrente: 20, sazonal: 10, pontual: 5 },
      tempobatismo: { maisVinte: 25, dezAnos: 20, cincoAnos: 15, doisAnos: 10 },
      cargos: { tresOuMais: 15, doisCargos: 10, umCargo: 5 },
      nomeunidade: { comUnidade: 5 },
      temlicao: { comLicao: 10 },
      totalpresenca: { oitoATreze: 20, quatroASete: 10 },
      escolasabatina: { comunhao: 2, missao: 3, estudoBiblico: 4 },
      discipuladoPosBatismo: { multiplicador: 5 },
      cpfValido: { valido: 5 },
      camposVaziosACMS: { completos: 5 },
    };

    // Engajamento
    it('scores engajamento alto', () => {
      const user = makeUser('{"engajamento":"Alto"}');
      const pts = calculateUserPointsFromConfig(user, fullConfig);
      expect(pts).toBe(30);
    });

    it('scores engajamento medio', () => {
      const user = makeUser('{"engajamento":"Medio"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(20);
    });

    it('scores engajamento baixo', () => {
      const user = makeUser('{"engajamento":"Baixo"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(10);
    });

    // Classificação
    it('scores classificação frequente', () => {
      const user = makeUser('{"classificacao":"Frequente"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(15);
    });

    it('scores classificação naoFrequente (matches "frequente" substring first)', () => {
      // Note: "naofrequente" contains "frequente", so the first branch matches
      const user = makeUser('{"classificacao":"NaoFrequente"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(15);
    });

    // Dizimista
    it('scores dizimista recorrente', () => {
      const user = makeUser('{"dizimistaType":"Recorrente"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(20);
    });

    it('scores dizimista sazonal', () => {
      const user = makeUser('{"dizimistaType":"Sazonal"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(10);
    });

    it('scores dizimista pontual', () => {
      const user = makeUser('{"dizimistaType":"Pontual"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(5);
    });

    // Ofertante
    it('scores ofertante recorrente', () => {
      const user = makeUser('{"ofertanteType":"Recorrente"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(20);
    });

    it('scores ofertante sazonal', () => {
      const user = makeUser('{"ofertanteType":"Sazonal"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(10);
    });

    it('scores ofertante pontual', () => {
      const user = makeUser('{"ofertanteType":"Pontual"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(5);
    });

    // Tempo de batismo
    it('scores tempoBatismo >= 20', () => {
      const user = makeUser('{"tempoBatismoAnos":25}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(25);
    });

    it('scores tempoBatismo >= 10', () => {
      const user = makeUser('{"tempoBatismoAnos":15}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(20);
    });

    it('scores tempoBatismo >= 5', () => {
      const user = makeUser('{"tempoBatismoAnos":7}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(15);
    });

    it('scores tempoBatismo >= 2', () => {
      const user = makeUser('{"tempoBatismoAnos":3}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(10);
    });

    it('scores tempoBatismo < 2 as 0', () => {
      const user = makeUser('{"tempoBatismoAnos":1}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(0);
    });

    // Cargos
    it('scores 1 cargo', () => {
      const user = makeUser('{"temCargo":"Sim","departamentosCargos":"Deacon"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(5);
    });

    it('scores 2 cargos', () => {
      const user = makeUser('{"temCargo":"Sim","departamentosCargos":"Deacon;Elder"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(10);
    });

    it('scores 3+ cargos', () => {
      const user = makeUser('{"temCargo":"Sim","departamentosCargos":"A;B;C;D"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(15);
    });

    it('scores 0 when temCargo is not Sim', () => {
      const user = makeUser('{"temCargo":"Nao","departamentosCargos":"A;B"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(0);
    });

    // Nome da Unidade
    it('scores nomeUnidade with value', () => {
      const user = makeUser('{"nomeUnidade":"Unit A"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(5);
    });

    it('scores 0 without nomeUnidade', () => {
      const user = makeUser('{}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(0);
    });

    it('scores 0 with empty nomeUnidade', () => {
      const user = makeUser('{"nomeUnidade":"   "}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(0);
    });

    // Tem lição
    it('scores temLicao true (boolean)', () => {
      const user = makeUser({ temLicao: true });
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(10);
    });

    it('scores temLicao "true" (string)', () => {
      const user = makeUser('{"temLicao":"true"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(10);
    });

    it('scores 0 for temLicao false', () => {
      const user = makeUser({ temLicao: false });
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(0);
    });

    // Total presença
    it('scores totalPresenca 8-13 range', () => {
      const user = makeUser('{"totalPresenca":10}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(20);
    });

    it('scores totalPresenca 4-7 range', () => {
      const user = makeUser('{"totalPresenca":6}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(10);
    });

    it('scores totalPresenca below 4 as 0', () => {
      const user = makeUser('{"totalPresenca":2}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(0);
    });

    it('scores totalPresenca as string', () => {
      const user = makeUser('{"totalPresenca":"9"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(20);
    });

    // Escola Sabatina multipliers
    it('scores comunhao multiplier', () => {
      const user = makeUser('{"comunhao":3}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(6); // 3*2
    });

    it('scores missao multiplier', () => {
      const user = makeUser('{"missao":2}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(6); // 2*3
    });

    it('scores estudoBiblico multiplier', () => {
      const user = makeUser('{"estudoBiblico":4}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(16); // 4*4
    });

    // CPF válido
    it('scores cpfValido "Sim"', () => {
      const user = makeUser('{"cpfValido":"Sim"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(5);
    });

    it('scores cpfValido "true"', () => {
      const user = makeUser('{"cpfValido":"true"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(5);
    });

    it('scores 0 for cpfValido not matching', () => {
      const user = makeUser('{"cpfValido":"Nao"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(0);
    });

    // Campos vazios ACMS
    it('scores camposVaziosACMS "false" (means complete)', () => {
      const user = makeUser('{"camposVaziosACMS":"false"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(5);
    });

    it('scores 0 for camposVaziosACMS "true"', () => {
      const user = makeUser('{"camposVaziosACMS":"true"}');
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(0);
    });

    // Empty config
    it('returns 0 with empty config', () => {
      const user = makeUser('{"engajamento":"Alto","classificacao":"Frequente"}');
      expect(calculateUserPointsFromConfig(user, {})).toBe(0);
    });

    // Rounding
    it('rounds the result', () => {
      const config: PointsConfig = {
        escolasabatina: { comunhao: 1.3 },
      };
      const user = makeUser('{"comunhao":3}');
      // 3 * 1.3 = 3.9 → rounded to 4
      expect(calculateUserPointsFromConfig(user, config)).toBe(4);
    });

    // Combined scoring
    it('combines multiple criteria correctly', () => {
      const user = makeUser(
        JSON.stringify({
          engajamento: 'Alto',
          classificacao: 'Frequente',
          dizimistaType: 'Recorrente',
          tempoBatismoAnos: 22,
          temLicao: true,
          cpfValido: 'Sim',
        })
      );

      // 30 + 15 + 20 + 25 + 10 + 5 = 105
      expect(calculateUserPointsFromConfig(user, fullConfig)).toBe(105);
    });
  });
});
