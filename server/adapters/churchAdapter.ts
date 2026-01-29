/**
 * Adapter de Igrejas - Operações CRUD para tabela churches
 * Extraído do neonAdapter.ts para melhor organização
 */

import { db } from '../neonConfig';
import { schema } from '../schema';
import { eq, and, asc, sql as drizzleSql } from 'drizzle-orm';
import { CreateChurchInput, UpdateChurchInput } from '../types/storage';
import { Church } from '../../shared/schema';

/**
 * Converte row do banco para tipo Church
 */
export function toChurch(row: Record<string, unknown>): Church {
  return {
    id: Number(row.id),
    name: row.name == null ? '' : String(row.name),
    code: row.code == null ? '' : String(row.code),
    address: row.address == null ? null : String(row.address),
    phone: row.phone == null ? null : String(row.phone),
    email: row.email == null ? null : String(row.email),
    pastor: row.pastor == null ? null : String(row.pastor),
    districtId: row.districtId == null ? null : Number(row.districtId),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? ''),
  };
}

/**
 * Gera código único para igreja
 */
export async function generateChurchCode(): Promise<string> {
  const prefix = 'CH';
  const result = await db.select({ count: drizzleSql<number>`count(*)` }).from(schema.churches);
  const count = Number(result[0]?.count ?? 0) + 1;
  return `${prefix}${count.toString().padStart(5, '0')}`;
}

/**
 * Busca todas as igrejas
 */
export async function getAllChurches(): Promise<Church[]> {
  const rows = await db.select().from(schema.churches).orderBy(asc(schema.churches.name));
  return rows.map(row => toChurch(row as Record<string, unknown>));
}

/**
 * Busca igreja por ID
 */
export async function getChurchById(id: number): Promise<Church | null> {
  const rows = await db.select().from(schema.churches).where(eq(schema.churches.id, id)).limit(1);
  if (rows.length === 0) return null;
  return toChurch(rows[0] as Record<string, unknown>);
}

/**
 * Busca igreja por código
 */
export async function getChurchByCode(code: string): Promise<Church | null> {
  const rows = await db
    .select()
    .from(schema.churches)
    .where(eq(schema.churches.code, code))
    .limit(1);
  if (rows.length === 0) return null;
  return toChurch(rows[0] as Record<string, unknown>);
}

/**
 * Busca igrejas por ID do distrito
 */
export async function getChurchesByDistrictId(districtId: number): Promise<Church[]> {
  const rows = await db
    .select()
    .from(schema.churches)
    .where(eq(schema.churches.districtId, districtId))
    .orderBy(asc(schema.churches.name));
  return rows.map(row => toChurch(row as Record<string, unknown>));
}

/**
 * Busca igrejas por status (retorna todas, status não existe na tabela)
 */
export async function getChurchesByStatus(_status: string): Promise<Church[]> {
  // status não existe na tabela churches
  const rows = await db.select().from(schema.churches).orderBy(asc(schema.churches.name));
  return rows.map(row => toChurch(row as Record<string, unknown>));
}

/**
 * Cria nova igreja
 */
export async function createChurch(churchData: CreateChurchInput): Promise<Church> {
  const code = churchData.code || (await generateChurchCode());

  const [inserted] = await db
    .insert(schema.churches)
    .values({
      name: churchData.name,
      code,
      address: churchData.address,
      phone: churchData.phone,
      email: churchData.email,
      pastor: churchData.pastor,
      districtId: churchData.districtId,
    })
    .returning();

  return toChurch(inserted as Record<string, unknown>);
}

/**
 * Atualiza igreja
 */
export async function updateChurch(id: number, updates: UpdateChurchInput): Promise<Church | null> {
  const safeUpdates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      safeUpdates[key] = value;
    }
  }

  safeUpdates.updatedAt = new Date();

  const [updated] = await db
    .update(schema.churches)
    .set(safeUpdates)
    .where(eq(schema.churches.id, id))
    .returning();

  if (!updated) return null;
  return toChurch(updated as Record<string, unknown>);
}

/**
 * Deleta igreja
 */
export async function deleteChurch(id: number): Promise<boolean> {
  const result = await db
    .delete(schema.churches)
    .where(eq(schema.churches.id, id))
    .returning({ id: schema.churches.id });
  return result.length > 0;
}

/**
 * Conta igrejas
 */
export async function countChurches(districtId?: number): Promise<number> {
  const conditions: ReturnType<typeof eq>[] = [];

  if (districtId) {
    conditions.push(eq(schema.churches.districtId, districtId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({ count: drizzleSql<number>`count(*)` })
    .from(schema.churches)
    .where(whereClause);

  return Number(result[0]?.count ?? 0);
}

/**
 * Conta membros de uma igreja (usando districtId como proxy)
 */
export async function countChurchMembers(churchId: number): Promise<number> {
  // churchId não existe na tabela users, usando districtId
  const result = await db
    .select({ count: drizzleSql<number>`count(*)` })
    .from(schema.users)
    .where(eq(schema.users.districtId, churchId));

  return Number(result[0]?.count ?? 0);
}

/**
 * Busca estatísticas da igreja
 */
export async function getChurchStats(churchId: number): Promise<{
  totalMembers: number;
  activeMembers: number;
  visitedMembers: number;
  totalEvents: number;
  upcomingEvents: number;
}> {
  // churchId não existe na tabela users, usando districtId como proxy
  const [totalMembers, activeMembers, visitedMembers, totalEvents, upcomingEvents] =
    await Promise.all([
      db
        .select({ count: drizzleSql<number>`count(*)` })
        .from(schema.users)
        .where(eq(schema.users.districtId, churchId)),
      db
        .select({ count: drizzleSql<number>`count(*)` })
        .from(schema.users)
        .where(
          and(eq(schema.users.districtId, churchId), drizzleSql`${schema.users.status} = 'active'`)
        ),
      db
        .select({ count: drizzleSql<number>`count(*)` })
        .from(schema.users)
        .where(
          and(eq(schema.users.districtId, churchId), drizzleSql`${schema.users.status} = 'visited'`)
        ),
      db
        .select({ count: drizzleSql<number>`count(*)` })
        .from(schema.events)
        .where(eq(schema.events.churchId, churchId)),
      db
        .select({ count: drizzleSql<number>`count(*)` })
        .from(schema.events)
        .where(
          and(eq(schema.events.churchId, churchId), drizzleSql`${schema.events.date} >= NOW()`)
        ),
    ]);

  return {
    totalMembers: Number(totalMembers[0]?.count ?? 0),
    activeMembers: Number(activeMembers[0]?.count ?? 0),
    visitedMembers: Number(visitedMembers[0]?.count ?? 0),
    totalEvents: Number(totalEvents[0]?.count ?? 0),
    upcomingEvents: Number(upcomingEvents[0]?.count ?? 0),
  };
}

/**
 * Busca igrejas com paginação
 */
export async function getChurchesPaginated(
  page: number = 1,
  limit: number = 20,
  filters?: {
    districtId?: number;
    status?: string;
    search?: string;
  }
): Promise<{ churches: Church[]; total: number; pages: number }> {
  const offset = (page - 1) * limit;
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof drizzleSql>)[] = [];

  if (filters?.districtId) {
    conditions.push(eq(schema.churches.districtId, filters.districtId));
  }
  // status não existe na tabela churches
  if (filters?.search) {
    conditions.push(drizzleSql`${schema.churches.name} ILIKE ${`%${filters.search}%`}`);
  }

  const whereClause =
    conditions.length > 0
      ? and(...(conditions as [(typeof conditions)[0], ...(typeof conditions)[0][]]))
      : undefined;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: drizzleSql<number>`count(*)` })
      .from(schema.churches)
      .where(whereClause),
    db
      .select()
      .from(schema.churches)
      .where(whereClause)
      .orderBy(asc(schema.churches.name))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const pages = Math.ceil(total / limit);
  const churches = rows.map(row => toChurch(row as Record<string, unknown>));

  return { churches, total, pages };
}

export default {
  toChurch,
  generateChurchCode,
  getAllChurches,
  getChurchById,
  getChurchByCode,
  getChurchesByDistrictId,
  getChurchesByStatus,
  createChurch,
  updateChurch,
  deleteChurch,
  countChurches,
  countChurchMembers,
  getChurchStats,
  getChurchesPaginated,
};
