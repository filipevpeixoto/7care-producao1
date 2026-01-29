/**
 * Adapter de Usuários - Operações CRUD para tabela users
 * Extraído do neonAdapter.ts para melhor organização
 */

import { db } from '../neonConfig';
import { schema } from '../schema';
import { eq, and, desc, asc, ne, or, sql as drizzleSql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { CreateUserInput, UpdateUserInput } from '../types/storage';
import { User } from '../../shared/schema';

/**
 * Converte row do banco para tipo User
 */
export function toUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    name: row.name == null ? '' : String(row.name),
    email: row.email == null ? '' : String(row.email),
    password: row.password == null ? undefined : String(row.password),
    role: (row.role == null ? 'member' : String(row.role)) as User['role'],
    church: row.church == null ? null : String(row.church),
    churchId: row.churchId == null ? null : Number(row.churchId),
    districtId: row.districtId == null ? null : Number(row.districtId),
    phone: row.phone == null ? null : String(row.phone),
    address: row.address == null ? null : String(row.address),
    birthDate: row.birthDate == null ? null : String(row.birthDate),
    avatarUrl: row.avatarUrl == null ? null : String(row.avatarUrl),
    points: row.points == null ? 0 : Number(row.points),
    streak: row.streak == null ? 0 : Number(row.streak),
    level: row.level == null ? 1 : typeof row.level === 'number' ? row.level : String(row.level),
    status: (row.status == null ? 'active' : String(row.status)) as User['status'],
    visitedBy: row.visitedBy == null ? null : Number(row.visitedBy),
    howKnew: row.howKnew == null ? null : String(row.howKnew),
    invitedBy: row.invitedBy == null ? null : String(row.invitedBy),
    maritalStatus: row.maritalStatus == null ? null : String(row.maritalStatus),
    gender: row.gender == null ? null : String(row.gender),
    ministries: row.ministries == null ? null : String(row.ministries),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? ''),
    lastLogin:
      row.lastLogin == null
        ? null
        : row.lastLogin instanceof Date
          ? row.lastLogin.toISOString()
          : String(row.lastLogin),
    lastStreak:
      row.lastStreak == null
        ? null
        : row.lastStreak instanceof Date
          ? row.lastStreak.toISOString()
          : String(row.lastStreak),
  };
}

/**
 * Busca todos os usuários
 */
export async function getAllUsers(): Promise<User[]> {
  const rows = await db.select().from(schema.users).orderBy(asc(schema.users.name));
  return rows.map(row => toUser(row as Record<string, unknown>));
}

/**
 * Busca usuários visitados (status = 'visited')
 */
export async function getVisitedUsers(): Promise<User[]> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(drizzleSql`${schema.users.status} = 'visited'`)
    .orderBy(desc(schema.users.createdAt));
  return rows.map(row => toUser(row as Record<string, unknown>));
}

/**
 * Busca usuário por ID
 */
export async function getUserById(id: number): Promise<User | null> {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (rows.length === 0) return null;
  return toUser(rows[0] as Record<string, unknown>);
}

/**
 * Busca usuário por email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (rows.length === 0) return null;
  return toUser(rows[0] as Record<string, unknown>);
}

/**
 * Busca usuários por ID da igreja
 */
export async function getUsersByChurchId(churchId: number): Promise<User[]> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.districtId, churchId)) // Usando districtId como proxy
    .orderBy(asc(schema.users.name));
  return rows.map(row => toUser(row as Record<string, unknown>));
}

/**
 * Busca usuários por ID do distrito
 */
export async function getUsersByDistrictId(districtId: number): Promise<User[]> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.districtId, districtId))
    .orderBy(asc(schema.users.name));
  return rows.map(row => toUser(row as Record<string, unknown>));
}

/**
 * Busca usuários por role
 */
export async function getUsersByRole(role: string): Promise<User[]> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(drizzleSql`${schema.users.role} = ${role}`)
    .orderBy(asc(schema.users.name));
  return rows.map(row => toUser(row as Record<string, unknown>));
}

/**
 * Cria novo usuário
 */
export async function createUser(userData: CreateUserInput): Promise<User> {
  const hashedPassword = userData.password
    ? await bcrypt.hash(userData.password, 10)
    : await bcrypt.hash('temp123', 10);

  // Extrair dados válidos para inserção
  const insertData: typeof schema.users.$inferInsert = {
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    role: userData.role ?? 'member',
    status: userData.status ?? 'active',
    church: userData.church ?? null,
    churchCode: userData.churchCode ?? null,
    districtId: userData.districtId ?? null,
    points: userData.points ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Adicionar campos opcionais se existirem (usando Record para campos não no schema)
  const optionalData: Record<string, unknown> = {};
  if (userData.phone !== undefined) optionalData.phone = userData.phone;
  if (userData.address !== undefined) insertData.address = userData.address;
  if (userData.birthDate !== undefined) insertData.birthDate = userData.birthDate;
  if (userData.avatarUrl !== undefined) optionalData.avatarUrl = userData.avatarUrl;

  // Merge optional data
  const finalInsertData = { ...insertData, ...optionalData };

  const [inserted] = await db
    .insert(schema.users)

    .values(finalInsertData as any)
    .returning();

  return toUser(inserted as Record<string, unknown>);
}

/**
 * Atualiza usuário
 */
export async function updateUser(id: number, updates: UpdateUserInput): Promise<User | null> {
  const safeUpdates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      if (key === 'password' && value) {
        safeUpdates[key] = await bcrypt.hash(String(value), 10);
      } else {
        safeUpdates[key] = value;
      }
    }
  }

  safeUpdates.updatedAt = new Date();

  const [updated] = await db
    .update(schema.users)
    .set(safeUpdates)
    .where(eq(schema.users.id, id))
    .returning();

  if (!updated) return null;
  return toUser(updated as Record<string, unknown>);
}

/**
 * Atualiza usuário diretamente (sem hash de senha)
 */
export async function updateUserDirectly(
  id: number,
  updates: UpdateUserInput
): Promise<User | null> {
  const safeUpdates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      safeUpdates[key] = value;
    }
  }

  safeUpdates.updatedAt = new Date();

  const [updated] = await db
    .update(schema.users)
    .set(safeUpdates)
    .where(eq(schema.users.id, id))
    .returning();

  if (!updated) return null;
  return toUser(updated as Record<string, unknown>);
}

/**
 * Deleta usuário
 */
export async function deleteUser(id: number): Promise<boolean> {
  const result = await db
    .delete(schema.users)
    .where(eq(schema.users.id, id))
    .returning({ id: schema.users.id });
  return result.length > 0;
}

/**
 * Conta total de usuários
 */
export async function countUsers(): Promise<number> {
  const result = await db.select({ count: drizzleSql<number>`count(*)` }).from(schema.users);
  return Number(result[0]?.count ?? 0);
}

/**
 * Conta usuários por status
 */
export async function countUsersByStatus(status: string): Promise<number> {
  const result = await db
    .select({ count: drizzleSql<number>`count(*)` })
    .from(schema.users)
    .where(drizzleSql`${schema.users.status} = ${status}`);
  return Number(result[0]?.count ?? 0);
}

/**
 * Busca usuários com paginação
 */
export async function getUsersPaginated(
  page: number = 1,
  limit: number = 20,
  filters?: {
    churchId?: number;
    districtId?: number;
    role?: string;
    status?: string;
    search?: string;
  }
): Promise<{ users: User[]; total: number; pages: number }> {
  const offset = (page - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [];

  // churchId não existe na tabela users, usar districtId como filtro primário
  if (filters?.districtId) {
    conditions.push(eq(schema.users.districtId, filters.districtId));
  }
  if (filters?.role) {
    conditions.push(drizzleSql`${schema.users.role} = ${filters.role}`);
  }
  if (filters?.status) {
    conditions.push(drizzleSql`${schema.users.status} = ${filters.status}`);
  }
  if (filters?.search) {
    const searchCondition = or(
      drizzleSql`${schema.users.name} ILIKE ${`%${filters.search}%`}`,
      drizzleSql`${schema.users.email} ILIKE ${`%${filters.search}%`}`
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // Garantir que whereClause nunca seja undefined
  const whereClause =
    conditions.length > 0 ? (and(...conditions) as ReturnType<typeof drizzleSql>) : drizzleSql`1=1`;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: drizzleSql<number>`count(*)` })
      .from(schema.users)
      .where(whereClause),
    db
      .select()
      .from(schema.users)
      .where(whereClause)
      .orderBy(asc(schema.users.name))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const pages = Math.ceil(total / limit);
  const users = rows.map(row => toUser(row as Record<string, unknown>));

  return { users, total, pages };
}

/**
 * Verifica se email já existe
 */
export async function emailExists(email: string, excludeId?: number): Promise<boolean> {
  const conditions = [eq(schema.users.email, email)];
  if (excludeId) {
    conditions.push(ne(schema.users.id, excludeId));
  }

  const result = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(...conditions))
    .limit(1);

  return result.length > 0;
}

/**
 * Atualiza último login (usando updatedAt como proxy)
 */
export async function updateLastLogin(id: number): Promise<void> {
  await db
    .update(schema.users)
    .set({ updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(schema.users.id, id));
}

/**
 * Atualiza pontos do usuário
 */
export async function updateUserPoints(id: number, points: number, streak?: number): Promise<void> {
  const updates: Record<string, unknown> = { points };
  if (streak !== undefined) {
    updates.streak = streak;
  }

  await db.update(schema.users).set(updates).where(eq(schema.users.id, id));
}

/**
 * Busca ranking de usuários por pontos
 */
export async function getUsersRanking(limit: number = 10): Promise<User[]> {
  const rows = await db.select().from(schema.users).orderBy(desc(schema.users.points)).limit(limit);

  return rows.map(row => toUser(row as Record<string, unknown>));
}

export default {
  toUser,
  getAllUsers,
  getVisitedUsers,
  getUserById,
  getUserByEmail,
  getUsersByChurchId,
  getUsersByDistrictId,
  getUsersByRole,
  createUser,
  updateUser,
  updateUserDirectly,
  deleteUser,
  countUsers,
  countUsersByStatus,
  getUsersPaginated,
  emailExists,
  updateLastLogin,
  updateUserPoints,
  getUsersRanking,
};
