import { db, sql as neonSql } from '../neonConfig';
import { schema } from '../schema';
import { eq, and, or, sql as drizzleSql, asc } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { isSuperAdmin, hasAdminAccess } from '../utils/permissions';
import { logger } from '../utils/logger';
import { CreateUserInput, UpdateUserInput } from '../types/storage';
import { User } from '../../shared/schema';

export class UserRepository {
  private toDateString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value == null) {
      return '';
    }
    return String(value);
  }

  private normalizeExtraData(value: unknown): Record<string, unknown> | string | null | undefined {
    if (value == null) {
      return value as null | undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return String(value);
  }

  private toUser(row: Record<string, unknown>): User {
    return {
      id: Number(row.id),
      name: row.name == null ? '' : String(row.name),
      email: row.email == null ? '' : String(row.email),
      password: row.password == null ? '' : String(row.password),
      role: (row.role == null ? 'member' : String(row.role)) as User['role'],
      church: row.church == null ? null : String(row.church),
      churchCode: row.churchCode == null ? '' : String(row.churchCode),
      districtId: row.districtId == null ? null : Number(row.districtId),
      departments: row.departments == null ? '' : String(row.departments),
      birthDate: row.birthDate == null ? '' : String(row.birthDate),
      civilStatus: row.civilStatus == null ? '' : String(row.civilStatus),
      occupation: row.occupation == null ? '' : String(row.occupation),
      education: row.education == null ? '' : String(row.education),
      address: row.address == null ? '' : String(row.address),
      baptismDate: row.baptismDate == null ? '' : String(row.baptismDate),
      previousReligion: row.previousReligion == null ? '' : String(row.previousReligion),
      biblicalInstructor: row.biblicalInstructor == null ? null : String(row.biblicalInstructor),
      interestedSituation: row.interestedSituation == null ? '' : String(row.interestedSituation),
      isDonor: Boolean(row.isDonor),
      isTither: Boolean(row.isTither),
      isApproved: Boolean(row.isApproved),
      points: Number(row.points ?? 0),
      level: row.level == null ? '' : String(row.level),
      attendance: Number(row.attendance ?? 0),
      extraData: this.normalizeExtraData(row.extraData),
      observations: row.observations == null ? '' : String(row.observations),
      createdAt: this.toDateString(row.createdAt),
      updatedAt: this.toDateString(row.updatedAt),
      firstAccess: Boolean(row.firstAccess),
      status: row.status == null ? undefined : String(row.status),
      phone: row.phone == null ? undefined : String(row.phone),
      cpf: row.cpf == null ? undefined : String(row.cpf),
      profilePhoto: row.profilePhoto == null ? undefined : String(row.profilePhoto),
      isOffering: row.isOffering == null ? undefined : Boolean(row.isOffering),
      hasLesson: row.hasLesson == null ? undefined : Boolean(row.hasLesson),
    };
  }

  private toPermissionUser(user: {
    id?: number;
    role?: string;
    email?: string;
    districtId?: number | null;
    church?: string | null;
  }): Partial<User> {
    return {
      id: user.id,
      role: user.role as User['role'],
      email: user.email,
      districtId: user.districtId ?? undefined,
      church: user.church ?? undefined,
    };
  }

  /**
   * Normaliza um nome para formato de username
   * Exemplo: "João da Silva" -> "joaodasilva"
   */
  private normalizeUsername(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
      .trim();
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const result = await db.select().from(schema.users).orderBy(asc(schema.users.id));
      return result.map(user => this.toUser(user));
    } catch (error) {
      logger.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  /**
   * Busca usuários por distrito específico (query otimizada)
   * PERFORMANCE: Evita carregar todos os usuários e filtrar na memória
   */
  async getUsersByDistrictId(districtId: number): Promise<User[]> {
    try {
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.districtId, districtId))
        .orderBy(asc(schema.users.id));
      return result.map(user => this.toUser(user));
    } catch (error) {
      logger.error('Erro ao buscar usuários por distrito:', error);
      return [];
    }
  }

  /**
   * Busca usuários por distrito com filtros opcionais (query otimizada)
   * PERFORMANCE: Evita carregar todos os usuários e filtrar na memória
   */
  async getUsersByDistrictIdWithFilters(
    districtId: number,
    filters?: { role?: string; status?: string; church?: string }
  ): Promise<User[]> {
    try {
      const conditions = [eq(schema.users.districtId, districtId)];

      if (filters?.role) {
        conditions.push(eq(schema.users.role, filters.role));
      }
      if (filters?.status) {
        conditions.push(eq(schema.users.status, filters.status));
      }
      if (filters?.church) {
        conditions.push(eq(schema.users.church, filters.church));
      }

      const result = await db
        .select()
        .from(schema.users)
        .where(and(...conditions))
        .orderBy(asc(schema.users.id));
      return result.map(user => this.toUser(user));
    } catch (error) {
      logger.error('Erro ao buscar usuários por distrito com filtros:', error);
      return [];
    }
  }

  /**
   * Conta usuários por distrito (query otimizada para stats)
   */
  async countUsersByDistrictId(districtId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: drizzleSql<number>`count(*)::int` })
        .from(schema.users)
        .where(eq(schema.users.districtId, districtId));
      return result[0]?.count ?? 0;
    } catch (error) {
      logger.error('Erro ao contar usuários por distrito:', error);
      return 0;
    }
  }

  async getVisitedUsers(): Promise<User[]> {
    try {
      const result = await db
        .select()
        .from(schema.users)
        .where(
          and(
            or(eq(schema.users.role, 'member'), eq(schema.users.role, 'missionary')),
            drizzleSql`extra_data->>'visited' = 'true'`
          )
        )
        .orderBy(schema.users.id);
      return result.map(user => this.toUser(user));
    } catch (error) {
      logger.error('Erro ao buscar usuários visitados:', error);
      return [];
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      const row = result[0] || null;
      return row ? this.toUser(row) : null;
    } catch (error) {
      logger.error('Erro ao buscar usuário por ID:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      const row = result[0] || null;
      return row ? this.toUser(row) : null;
    } catch (error) {
      logger.error('Erro ao buscar usuário por email:', error);
      return null;
    }
  }

  /**
   * Busca usuário por username normalizado (O(1) com índice)
   * Usado para login por username gerado do nome
   */
  async getUserByNormalizedUsername(username: string): Promise<User | null> {
    try {
      // Normalizar o input da mesma forma que foi salvo
      const normalized = this.normalizeUsername(username);

      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.usernameNormalized, normalized))
        .limit(1);

      const row = result[0] || null;
      return row ? this.toUser(row) : null;
    } catch (error) {
      logger.error('Erro ao buscar usuário por username normalizado:', error);
      return null;
    }
  }

  async createUser(userData: CreateUserInput): Promise<User> {
    try {
      // Hash da senha - gerar senha aleatória se não fornecida
      const { generateTemporaryPassword, BCRYPT_SALT_ROUNDS } = await import('../config/security');
      const password = userData.password || generateTemporaryPassword();
      let hashedPassword = password;
      if (!password.startsWith('$2')) {
        hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      }

      // Gerar username normalizado para busca eficiente no login
      const usernameNormalized = this.normalizeUsername(userData.name);

      const newUser = {
        ...userData,
        password: hashedPassword,
        usernameNormalized,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db
        .insert(schema.users)
        .values(newUser as typeof schema.users.$inferInsert)
        .returning();
      return this.toUser(result[0]);
    } catch (error) {
      logger.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: UpdateUserInput): Promise<User | null> {
    try {
      // Hash da senha se fornecida
      if (updates.password && !updates.password.startsWith('$2')) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      // Converter level para string se for número
      const dbUpdates: Record<string, unknown> = { ...updates, updatedAt: new Date() };

      // Atualizar username normalizado se o nome foi alterado
      if (updates.name) {
        dbUpdates.usernameNormalized = this.normalizeUsername(updates.name);
      }
      if (typeof dbUpdates.level === 'number') {
        dbUpdates.level = String(dbUpdates.level);
      }

      const result = await db
        .update(schema.users)
        .set(dbUpdates as typeof schema.users.$inferInsert)
        .where(eq(schema.users.id, id))
        .returning();

      return result[0] ? this.toUser(result[0]) : null;
    } catch (error) {
      logger.error('Erro ao atualizar usuário', error);
      return null;
    }
  }

  async updateUserDirectly(id: number, updates: UpdateUserInput): Promise<User | null> {
    try {
      logger.debug(`Atualizando usuário ${id} diretamente`, { updates });

      // Hash da senha se fornecida
      if (updates.password && !updates.password.startsWith('$2')) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const updatedAt = new Date();

      // Usar consulta SQL direta para garantir que funcione
      const extraDataString =
        typeof updates.extraData === 'object'
          ? JSON.stringify(updates.extraData)
          : updates.extraData;

      const result = await neonSql`
        UPDATE users 
        SET extra_data = ${extraDataString}::jsonb, updated_at = ${updatedAt}
        WHERE id = ${id}
        RETURNING id, name, extra_data, updated_at
      `;

      logger.debug(`Usuário ${id} atualizado diretamente`, { extraData: result[0]?.extra_data });
      return await this.getUserById(id);
    } catch (error) {
      logger.error('Erro ao atualizar usuário diretamente', error);
      return null;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Verificar se é super administrador
      const user = await this.getUserById(id);
      if (user && isSuperAdmin(this.toPermissionUser(user))) {
        throw new Error('Não é possível excluir o Super Administrador do sistema');
      }

      // Verificar se é administrador (pastor ou superadmin)
      if (user && hasAdminAccess(this.toPermissionUser(user))) {
        throw new Error('Não é possível excluir usuários administradores do sistema');
      }

      await db.delete(schema.users).where(eq(schema.users.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar usuário', error);
      throw error;
    }
  }

  async getUserDetailedData(userId: number): Promise<User | null> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;

      // Extrair dados do extraData se existir
      let extraData: Record<string, unknown> = {};
      if (user.extraData) {
        if (typeof user.extraData === 'string') {
          try {
            extraData = JSON.parse(user.extraData);
          } catch (e) {
            logger.warn('Erro ao fazer parse do extraData:', e);
            extraData = {};
          }
        } else if (typeof user.extraData === 'object') {
          extraData = user.extraData;
        }
      }

      return {
        ...user,
        extraData,
      };
    } catch (error) {
      logger.error('Erro ao buscar dados detalhados do usuário:', error);
      return null;
    }
  }

  async updateUserChurch(userId: number, churchName: string): Promise<boolean> {
    try {
      await db.update(schema.users).set({ church: churchName }).where(eq(schema.users.id, userId));
      return true;
    } catch (error) {
      logger.error('Erro ao atualizar igreja do usuário:', error);
      return false;
    }
  }

  async approveUser(id: number): Promise<User | null> {
    try {
      const [user] = await db
        .update(schema.users)
        .set({ status: 'approved' })
        .where(eq(schema.users.id, id))
        .returning();
      return user ? this.toUser(user) : null;
    } catch (error) {
      logger.error('Erro ao aprovar usuário:', error);
      return null;
    }
  }

  async rejectUser(id: number): Promise<User | null> {
    try {
      const [user] = await db
        .update(schema.users)
        .set({ status: 'rejected' })
        .where(eq(schema.users.id, id))
        .returning();
      return user ? this.toUser(user) : null;
    } catch (error) {
      logger.error('Erro ao rejeitar usuário:', error);
      return null;
    }
  }

  async countUsers(): Promise<number> {
    try {
      const result = await db.select({ count: drizzleSql<number>`count(*)` }).from(schema.users);
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      logger.error('Erro ao contar usuários:', error);
      return 0;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.role, role))
        .orderBy(asc(schema.users.name));
      return users.map(u => this.toUser(u));
    } catch (error) {
      logger.error('Erro ao buscar usuários por role:', error);
      return [];
    }
  }

  async getUsersByChurch(church: string): Promise<User[]> {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.church, church))
        .orderBy(asc(schema.users.name));
      return users.map(u => this.toUser(u));
    } catch (error) {
      logger.error('Erro ao buscar usuários por igreja:', error);
      return [];
    }
  }

  async getUsersByDistrict(districtId: number): Promise<User[]> {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.districtId, districtId))
        .orderBy(asc(schema.users.name));
      return users.map(u => this.toUser(u));
    } catch (error) {
      logger.error('Erro ao buscar usuários por distrito:', error);
      return [];
    }
  }

  async searchUsers(term: string, limit = 50): Promise<User[]> {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(
          or(
            drizzleSql`LOWER(${schema.users.name}) LIKE LOWER(${`%${term}%`})`,
            drizzleSql`LOWER(${schema.users.email}) LIKE LOWER(${`%${term}%`})`
          )
        )
        .orderBy(asc(schema.users.name))
        .limit(limit);
      return users.map(u => this.toUser(u));
    } catch (error) {
      logger.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  async updateUserPoints(userId: number, points: number): Promise<User | null> {
    try {
      const [user] = await db
        .update(schema.users)
        .set({ points })
        .where(eq(schema.users.id, userId))
        .returning();
      return user ? this.toUser(user) : null;
    } catch (error) {
      logger.error('Erro ao atualizar pontos do usuário:', error);
      return null;
    }
  }
}

export const userRepository = new UserRepository();
export default userRepository;
