/**
 * Módulo de Storage para Igrejas
 */

import { db } from '../neonConfig';
import { schema } from '../schema';
import { eq, asc } from 'drizzle-orm';
import { resolveChurchCode } from './helpers';
import type { Church } from '../../shared/schema';
import type { CreateChurchInput, UpdateChurchInput } from '../types/storage';

export async function getAllChurches(): Promise<Church[]> {
  try {
    const result = await db.select().from(schema.churches).orderBy(asc(schema.churches.id));
    return result as unknown as Church[];
  } catch (error) {
    console.error('Erro ao buscar igrejas:', error);
    return [];
  }
}

export async function getChurchesByDistrict(districtId: number): Promise<Church[]> {
  try {
    const result = await db
      .select()
      .from(schema.churches)
      .where(eq(schema.churches.districtId, districtId))
      .orderBy(asc(schema.churches.id));
    return result as unknown as Church[];
  } catch (error) {
    console.error('Erro ao buscar igrejas por distrito:', error);
    return [];
  }
}

export async function getChurchById(id: number): Promise<Church | null> {
  try {
    const result = await db
      .select()
      .from(schema.churches)
      .where(eq(schema.churches.id, id))
      .limit(1);
    return (result[0] || null) as unknown as Church | null;
  } catch (error) {
    console.error('Erro ao buscar igreja por ID:', error);
    return null;
  }
}

export async function createChurch(churchData: CreateChurchInput): Promise<Church> {
  try {
    const providedCode = (churchData as { code?: string | null }).code;
    const code = await resolveChurchCode(churchData.name, providedCode);
    const newChurch = {
      ...churchData,
      code,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(schema.churches).values(newChurch).returning();
    return result[0] as unknown as Church;
  } catch (error) {
    console.error('Erro ao criar igreja:', error);
    throw error;
  }
}

export async function updateChurch(id: number, updates: UpdateChurchInput): Promise<Church | null> {
  try {
    const dbUpdates: Record<string, unknown> = { ...updates, updatedAt: new Date() };

    const result = await db
      .update(schema.churches)
      .set(dbUpdates)
      .where(eq(schema.churches.id, id))
      .returning();

    return (result[0] || null) as unknown as Church | null;
  } catch (error) {
    console.error('Erro ao atualizar igreja:', error);
    return null;
  }
}

export async function deleteChurch(id: number): Promise<boolean> {
  try {
    await db.delete(schema.churches).where(eq(schema.churches.id, id));
    return true;
  } catch (error) {
    console.error('Erro ao deletar igreja:', error);
    return false;
  }
}

export async function getOrCreateChurch(churchName: string): Promise<Church> {
  try {
    // Buscar igreja existente pelo nome
    const existing = await db
      .select()
      .from(schema.churches)
      .where(eq(schema.churches.name, churchName))
      .limit(1);

    if (existing.length > 0) {
      return existing[0] as unknown as Church;
    }

    // Criar nova igreja
    return await createChurch({ name: churchName });
  } catch (error) {
    console.error('Erro ao obter ou criar igreja:', error);
    throw error;
  }
}

export async function getDefaultChurch(): Promise<Church | null> {
  try {
    const result = await db
      .select()
      .from(schema.churches)
      .orderBy(asc(schema.churches.id))
      .limit(1);
    return (result[0] || null) as unknown as Church | null;
  } catch (error) {
    console.error('Erro ao buscar igreja padrão:', error);
    return null;
  }
}

export async function setDefaultChurch(churchId: number): Promise<boolean> {
  try {
    await db
      .update(schema.churches)
      .set({ updatedAt: new Date() })
      .where(eq(schema.churches.id, churchId));
    return true;
  } catch (error) {
    console.error('Erro ao definir igreja padrão:', error);
    return false;
  }
}
