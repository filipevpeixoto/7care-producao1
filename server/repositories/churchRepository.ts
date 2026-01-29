/**
 * Church Repository
 * Métodos relacionados a igrejas extraídos do NeonAdapter
 */

import { eq, sql, count } from 'drizzle-orm';
import { db } from '../neonConfig';
import * as schema from '../schema';
import type { Church, InsertChurch, UpdateChurch } from '../../shared/schema';
import { logger } from '../utils/logger';

export class ChurchRepository {
  /**
   * Gera código de igreja baseado no nome
   */
  private generateChurchCode(name: string): string {
    const base = name
      .split(' ')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return (base || 'CH').slice(0, 10);
  }

  /**
   * Resolve código único de igreja
   */
  private async resolveChurchCode(name: string, providedCode?: string | null): Promise<string> {
    const initialCode = (
      providedCode && providedCode.trim() !== '' ? providedCode : this.generateChurchCode(name)
    ).slice(0, 10);
    let finalCode = initialCode;
    let counter = 1;

    while (true) {
      const existing = await db
        .select()
        .from(schema.churches)
        .where(eq(schema.churches.code, finalCode))
        .limit(1);
      if (existing.length === 0) {
        return finalCode;
      }
      const suffix = String(counter);
      const truncated = initialCode.slice(0, Math.max(1, 10 - suffix.length));
      finalCode = `${truncated}${suffix}`;
      counter += 1;
    }
  }

  /**
   * Busca todas as igrejas
   */
  async getAllChurches(): Promise<Church[]> {
    try {
      const churches = await db.select().from(schema.churches).orderBy(schema.churches.name);
      return churches.map(this.mapChurchRecord);
    } catch (error) {
      logger.error('Erro ao buscar igrejas', error);
      return [];
    }
  }

  /**
   * Busca igreja por ID
   */
  async getChurchById(id: number): Promise<Church | null> {
    try {
      const [church] = await db
        .select()
        .from(schema.churches)
        .where(eq(schema.churches.id, id))
        .limit(1);
      return church ? this.mapChurchRecord(church) : null;
    } catch (error) {
      logger.error('Erro ao buscar igreja por ID', error);
      return null;
    }
  }

  /**
   * Busca igreja por código
   */
  async getChurchByCode(code: string): Promise<Church | null> {
    try {
      const [church] = await db
        .select()
        .from(schema.churches)
        .where(eq(schema.churches.code, code))
        .limit(1);
      return church ? this.mapChurchRecord(church) : null;
    } catch (error) {
      logger.error('Erro ao buscar igreja por código', error);
      return null;
    }
  }

  /**
   * Busca igreja por nome
   */
  async getChurchByName(name: string): Promise<Church | null> {
    try {
      const [church] = await db
        .select()
        .from(schema.churches)
        .where(eq(sql`LOWER(${schema.churches.name})`, name.toLowerCase()))
        .limit(1);
      return church ? this.mapChurchRecord(church) : null;
    } catch (error) {
      logger.error('Erro ao buscar igreja por nome', error);
      return null;
    }
  }

  /**
   * Cria nova igreja
   */
  async createChurch(churchData: InsertChurch): Promise<Church> {
    try {
      const code = await this.resolveChurchCode(churchData.name, churchData.code);
      const [church] = await db
        .insert(schema.churches)
        .values({
          ...churchData,
          code,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return this.mapChurchRecord(church);
    } catch (error) {
      logger.error('Erro ao criar igreja', error);
      throw error;
    }
  }

  /**
   * Atualiza igreja
   */
  async updateChurch(id: number, churchData: UpdateChurch): Promise<Church | null> {
    try {
      // Extrair apenas campos válidos para update
      const { createdAt: _createdAt, ...updateData } = churchData as Record<string, unknown>;
      const [church] = await db
        .update(schema.churches)
        .set({
          ...updateData,
          updatedAt: new Date(),
        } as Record<string, unknown>)
        .where(eq(schema.churches.id, id))
        .returning();
      return church ? this.mapChurchRecord(church) : null;
    } catch (error) {
      logger.error('Erro ao atualizar igreja', error);
      return null;
    }
  }

  /**
   * Deleta igreja
   */
  async deleteChurch(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.churches).where(eq(schema.churches.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Erro ao deletar igreja', error);
      return false;
    }
  }

  /**
   * Busca igrejas por distrito
   */
  async getChurchesByDistrict(districtId: number): Promise<Church[]> {
    try {
      const churches = await db
        .select()
        .from(schema.churches)
        .where(eq(schema.churches.districtId, districtId))
        .orderBy(schema.churches.name);
      return churches.map(this.mapChurchRecord);
    } catch (error) {
      logger.error('Erro ao buscar igrejas por distrito', error);
      return [];
    }
  }

  /**
   * Conta total de igrejas
   */
  async countChurches(): Promise<number> {
    try {
      const [result] = await db.select({ count: count() }).from(schema.churches);
      return result?.count || 0;
    } catch (error) {
      logger.error('Erro ao contar igrejas', error);
      return 0;
    }
  }

  /**
   * Busca ou cria igreja pelo nome
   */
  async getOrCreateChurch(name: string, districtId?: number): Promise<Church> {
    const existing = await this.getChurchByName(name);
    if (existing) return existing;

    return this.createChurch({ name, districtId: districtId ?? null });
  }

  /**
   * Mapeia registro do banco para tipo Church
   */
  private mapChurchRecord(record: Record<string, unknown>): Church {
    return {
      id: record.id as number,
      name: record.name as string,
      code: record.code as string,
      address: record.address as string | null | undefined,
      phone: record.phone as string | null | undefined,
      email: record.email as string | null | undefined,
      pastor: record.pastor as string | null | undefined,
      districtId: record.districtId as number | null | undefined,
      isDefault: record.isDefault as boolean | undefined,
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : (record.createdAt as string | undefined),
      updatedAt:
        record.updatedAt instanceof Date
          ? record.updatedAt.toISOString()
          : (record.updatedAt as string | undefined),
    };
  }
}

export const churchRepository = new ChurchRepository();
export default churchRepository;
