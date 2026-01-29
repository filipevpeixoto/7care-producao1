/**
 * District Repository
 * Métodos relacionados a distritos
 */

import { eq, sql, count } from 'drizzle-orm';
import { db } from '../neonConfig';
import * as schema from '../schema';
import { logger } from '../utils/logger';

export interface District {
  id: number;
  name: string;
  code: string;
  pastorId: number | null;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  pastorName?: string;
  pastorEmail?: string;
}

export interface CreateDistrictDTO {
  name: string;
  code: string;
  pastorId?: number | null;
  description?: string | null;
}

export interface UpdateDistrictDTO {
  name?: string;
  code?: string;
  pastorId?: number | null;
  description?: string | null;
}

export interface DistrictStats {
  totalChurches: number;
  totalMembers: number;
  totalPastors: number;
  totalEvents: number;
}

export class DistrictRepository {
  /**
   * Busca todos os distritos
   */
  async getAllDistricts(): Promise<District[]> {
    try {
      const districts = await db.select().from(schema.districts).orderBy(schema.districts.name);
      return districts.map(this.mapDistrictRecord);
    } catch (error) {
      logger.error('Erro ao buscar distritos', error);
      return [];
    }
  }

  /**
   * Busca todos os distritos com informações do pastor
   */
  async getAllDistrictsWithPastor(): Promise<District[]> {
    try {
      const result = await db.execute(sql`
        SELECT d.*, u.name as pastor_name, u.email as pastor_email
        FROM districts d
        LEFT JOIN users u ON d.pastor_id = u.id
        ORDER BY d.name
      `);
      return (result.rows as Record<string, unknown>[]).map(this.mapDistrictRecordWithPastor);
    } catch (error) {
      logger.error('Erro ao buscar distritos com pastor', error);
      return [];
    }
  }

  /**
   * Busca distrito por ID
   */
  async getDistrictById(id: number): Promise<District | null> {
    try {
      const [district] = await db
        .select()
        .from(schema.districts)
        .where(eq(schema.districts.id, id))
        .limit(1);
      return district ? this.mapDistrictRecord(district) : null;
    } catch (error) {
      logger.error('Erro ao buscar distrito por ID', error);
      return null;
    }
  }

  /**
   * Busca distrito por código
   */
  async getDistrictByCode(code: string): Promise<District | null> {
    try {
      const [district] = await db
        .select()
        .from(schema.districts)
        .where(eq(schema.districts.code, code))
        .limit(1);
      return district ? this.mapDistrictRecord(district) : null;
    } catch (error) {
      logger.error('Erro ao buscar distrito por código', error);
      return null;
    }
  }

  /**
   * Cria novo distrito
   */
  async createDistrict(data: CreateDistrictDTO): Promise<District> {
    try {
      const [district] = await db
        .insert(schema.districts)
        .values({
          name: data.name,
          code: data.code,
          pastorId: data.pastorId ?? null,
          description: data.description ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return this.mapDistrictRecord(district);
    } catch (error) {
      logger.error('Erro ao criar distrito', error);
      throw error;
    }
  }

  /**
   * Atualiza distrito
   */
  async updateDistrict(id: number, data: UpdateDistrictDTO): Promise<District | null> {
    try {
      const [district] = await db
        .update(schema.districts)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.districts.id, id))
        .returning();
      return district ? this.mapDistrictRecord(district) : null;
    } catch (error) {
      logger.error('Erro ao atualizar distrito', error);
      return null;
    }
  }

  /**
   * Deleta distrito
   */
  async deleteDistrict(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.districts).where(eq(schema.districts.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Erro ao deletar distrito', error);
      return false;
    }
  }

  /**
   * Conta total de distritos
   */
  async countDistricts(): Promise<number> {
    try {
      const [result] = await db.select({ count: count() }).from(schema.districts);
      return result?.count || 0;
    } catch (error) {
      logger.error('Erro ao contar distritos', error);
      return 0;
    }
  }

  /**
   * Busca estatísticas do distrito
   */
  async getDistrictStats(districtId: number): Promise<DistrictStats> {
    try {
      // Conta igrejas
      const [churchCount] = await db
        .select({ count: count() })
        .from(schema.churches)
        .where(eq(schema.churches.districtId, districtId));

      // Conta membros
      const [memberCount] = await db
        .select({ count: count() })
        .from(schema.users)
        .where(eq(schema.users.districtId, districtId));

      // Conta pastores
      const pastorResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM users
        WHERE district_id = ${districtId} AND role = 'pastor'
      `);
      const pastorCount = (pastorResult.rows[0] as { count: number })?.count || 0;

      // Conta eventos (através das igrejas do distrito)
      const eventResult = await db.execute(sql`
        SELECT COUNT(e.id) as count
        FROM events e
        JOIN churches c ON e.church_id = c.id
        WHERE c.district_id = ${districtId}
      `);
      const eventCount = (eventResult.rows[0] as { count: number })?.count || 0;

      return {
        totalChurches: churchCount?.count || 0,
        totalMembers: memberCount?.count || 0,
        totalPastors: Number(pastorCount),
        totalEvents: Number(eventCount),
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas do distrito', error);
      return {
        totalChurches: 0,
        totalMembers: 0,
        totalPastors: 0,
        totalEvents: 0,
      };
    }
  }

  /**
   * Busca distritos por pastor
   */
  async getDistrictsByPastor(pastorId: number): Promise<District[]> {
    try {
      const districts = await db
        .select()
        .from(schema.districts)
        .where(eq(schema.districts.pastorId, pastorId))
        .orderBy(schema.districts.name);
      return districts.map(this.mapDistrictRecord);
    } catch (error) {
      logger.error('Erro ao buscar distritos por pastor', error);
      return [];
    }
  }

  /**
   * Mapeia registro do banco para tipo District
   */
  private mapDistrictRecord(record: Record<string, unknown>): District {
    return {
      id: record.id as number,
      name: record.name as string,
      code: record.code as string,
      pastorId: record.pastorId as number | null,
      description: record.description as string | null,
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : (record.createdAt as string | null),
      updatedAt:
        record.updatedAt instanceof Date
          ? record.updatedAt.toISOString()
          : (record.updatedAt as string | null),
    };
  }

  /**
   * Mapeia registro com informações do pastor
   */
  private mapDistrictRecordWithPastor(record: Record<string, unknown>): District {
    return {
      id: record.id as number,
      name: record.name as string,
      code: record.code as string,
      pastorId: record.pastor_id as number | null,
      description: record.description as string | null,
      createdAt:
        record.created_at instanceof Date
          ? record.created_at.toISOString()
          : (record.created_at as string | null),
      updatedAt:
        record.updated_at instanceof Date
          ? record.updated_at.toISOString()
          : (record.updated_at as string | null),
      pastorName: record.pastor_name as string | undefined,
      pastorEmail: record.pastor_email as string | undefined,
    };
  }
}

export const districtRepository = new DistrictRepository();
export default districtRepository;
