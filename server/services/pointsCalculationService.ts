/**
 * Points Calculation Service
 * Wrapper para métodos complexos de cálculo de pontos
 *
 * TODO: Refatorar para usar repositories diretamente em vez de NeonAdapter
 * Mantido como wrapper temporário para não alterar a lógica de negócio existente
 */

import { NeonAdapter } from '../neonAdapter';
import type { PointsCalculationResult, PointsRecalculationResult } from '../types/storage';
import type { User } from '../../shared/schema';

// Instância singleton compartilhada
const adapter = new NeonAdapter();

export class PointsCalculationService {
  /**
   * Calcula pontos para um único usuário
   */
  async calculateUserPoints(userId: number): Promise<PointsCalculationResult> {
    return adapter.calculateUserPoints(userId);
  }

  /**
   * Recalcula pontos avançados (todos os usuários, opcionalmente filtrado por distrito)
   */
  async calculateAdvancedUserPoints(
    districtId?: number | null
  ): Promise<PointsRecalculationResult> {
    return adapter.calculateAdvancedUserPoints(districtId);
  }

  /**
   * Calcula pontos para múltiplos usuários em batch
   */
  async calculateUserPointsBatch(users: User[]): Promise<Map<number, number>> {
    return adapter.calculateUserPointsBatch(users);
  }
}

export const pointsCalculationService = new PointsCalculationService();
