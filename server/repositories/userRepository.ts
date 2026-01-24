/**
 * User Repository
 * Métodos relacionados a usuários extraídos do NeonAdapter
 */

import { eq, desc, sql, and, or, like, isNull, count, inArray } from 'drizzle-orm';
import { db } from '../neonConfig';
import * as schema from '../schema';
import type { User, InsertUser, UpdateUser } from '../../shared/schema';

export class UserRepository {
  /**
   * Busca todos os usuários
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await db.select().from(schema.users).orderBy(schema.users.name);
      return users.map(this.mapUserRecord);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  /**
   * Busca usuário por ID
   */
  async getUserById(id: number): Promise<User | null> {
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      return user ? this.mapUserRecord(user) : null;
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      return null;
    }
  }

  /**
   * Busca usuário por email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(sql`LOWER(${schema.users.email})`, email.toLowerCase()))
        .limit(1);
      return user ? this.mapUserRecord(user) : null;
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      return null;
    }
  }

  /**
   * Cria novo usuário
   */
  async createUser(userData: InsertUser): Promise<User> {
    try {
      // Construir dados de inserção tipados
      const insertData: Record<string, unknown> = {
        name: userData.name,
        email: userData.email,
        password: userData.password ?? 'temp123',
        role: userData.role ?? 'member',
        church: userData.church ?? null,
        churchCode: userData.churchCode ?? null,
        districtId: userData.districtId ?? null,
        points: userData.points ?? 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [user] = await db.insert(schema.users).values(insertData).returning();
      return this.mapUserRecord(user);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  /**
   * Atualiza usuário
   */
  async updateUser(id: number, userData: UpdateUser): Promise<User | null> {
    try {
      // Extrair apenas campos válidos para update, excluindo id e createdAt
      const { createdAt, ...updateData } = userData as Record<string, unknown>;
      const [user] = await db
        .update(schema.users)
        .set({
          ...updateData,
          updatedAt: new Date()
        } as Record<string, unknown>)
        .where(eq(schema.users.id, id))
        .returning();
      return user ? this.mapUserRecord(user) : null;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return null;
    }
  }

  /**
   * Deleta usuário
   */
  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.users).where(eq(schema.users.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      return false;
    }
  }

  /**
   * Conta total de usuários
   */
  async countUsers(): Promise<number> {
    try {
      const [result] = await db.select({ count: count() }).from(schema.users);
      return result?.count || 0;
    } catch (error) {
      console.error('Erro ao contar usuários:', error);
      return 0;
    }
  }

  /**
   * Busca usuários por igreja
   */
  async getUsersByChurch(church: string): Promise<User[]> {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.church, church))
        .orderBy(schema.users.name);
      return users.map(this.mapUserRecord);
    } catch (error) {
      console.error('Erro ao buscar usuários por igreja:', error);
      return [];
    }
  }

  /**
   * Busca usuários por distrito
   */
  async getUsersByDistrict(districtId: number): Promise<User[]> {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.districtId, districtId))
        .orderBy(schema.users.name);
      return users.map(this.mapUserRecord);
    } catch (error) {
      console.error('Erro ao buscar usuários por distrito:', error);
      return [];
    }
  }

  /**
   * Busca usuários por role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.role, role))
        .orderBy(schema.users.name);
      return users.map(this.mapUserRecord);
    } catch (error) {
      console.error('Erro ao buscar usuários por role:', error);
      return [];
    }
  }

  /**
   * Busca usuários com filtros
   */
  async searchUsers(query: string, limit: number = 50): Promise<User[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const users = await db
        .select()
        .from(schema.users)
        .where(
          or(
            like(sql`LOWER(${schema.users.name})`, searchTerm),
            like(sql`LOWER(${schema.users.email})`, searchTerm)
          )
        )
        .orderBy(schema.users.name)
        .limit(limit);
      return users.map(this.mapUserRecord);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  /**
   * Atualiza pontos do usuário
   */
  async updateUserPoints(id: number, points: number): Promise<User | null> {
    return this.updateUser(id, { points });
  }

  /**
   * Mapeia registro do banco para tipo User
   */
  private mapUserRecord(record: Record<string, unknown>): User {
    return {
      id: record.id as number,
      name: record.name as string,
      email: record.email as string,
      password: record.password as string | undefined,
      role: record.role as User['role'],
      church: record.church as string | null | undefined,
      districtId: record.districtId as number | null | undefined,
      points: (record.points as number) || 0,
      calculatedPoints: (record.calculatedPoints as number) || 0,
      level: record.level as string | number | undefined,
      avatarUrl: record.avatarUrl as string | null | undefined,
      firstAccess: record.firstAccess as boolean | undefined,
      lastAccess: record.lastAccess as string | undefined,
      createdAt: record.createdAt instanceof Date 
        ? record.createdAt.toISOString() 
        : record.createdAt as string | undefined,
      updatedAt: record.updatedAt instanceof Date 
        ? record.updatedAt.toISOString() 
        : record.updatedAt as string | undefined,
      engajamento: record.engajamento as string | undefined,
      classificacao: record.classificacao as string | undefined,
      dizimistaType: record.dizimistaType as string | undefined,
      extraData: record.extraData as Record<string, unknown> | undefined,
    };
  }
}

export const userRepository = new UserRepository();
export default userRepository;
