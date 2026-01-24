/**
 * Módulo de Storage para Usuários
 */

import { db, sql as neonSql } from '../neonConfig';
import { schema } from '../schema';
import { eq, asc, or, and, sql as drizzleSql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { isSuperAdmin, hasAdminAccess } from '../utils/permissions';
import { toUser, toPermissionUser } from './helpers';
import type { User } from '../../shared/schema';
import type { CreateUserInput, UpdateUserInput } from '../types/storage';

export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await db.select().from(schema.users).orderBy(asc(schema.users.id));
    return result.map(user => toUser(user));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
}

export async function getVisitedUsers(): Promise<User[]> {
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
    return result.map(user => toUser(user));
  } catch (error) {
    console.error('Erro ao buscar usuários visitados:', error);
    return [];
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    const row = result[0] || null;
    return row ? toUser(row) : null;
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    const row = result[0] || null;
    return row ? toUser(row) : null;
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }
}

export async function createUser(userData: CreateUserInput): Promise<User> {
  try {
    const password = userData.password || 'temp123';
    let hashedPassword = password;
    if (!password.startsWith('$2')) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const newUser = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.insert(schema.users).values(newUser as typeof schema.users.$inferInsert).returning();
    return toUser(result[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
}

export async function updateUser(id: number, updates: UpdateUserInput): Promise<User | null> {
  try {
    if (updates.password && !updates.password.startsWith('$2')) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const dbUpdates: Record<string, unknown> = { ...updates, updatedAt: new Date() };
    if (typeof dbUpdates.level === 'number') {
      dbUpdates.level = String(dbUpdates.level);
    }

    const result = await db
      .update(schema.users)
      .set(dbUpdates as typeof schema.users.$inferInsert)
      .where(eq(schema.users.id, id))
      .returning();

    return result[0] ? toUser(result[0]) : null;
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return null;
  }
}

export async function updateUserDirectly(id: number, updates: UpdateUserInput): Promise<User | null> {
  try {
    if (updates.password && !updates.password.startsWith('$2')) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedAt = new Date();
    const extraDataString = typeof updates.extraData === 'object' ? 
      JSON.stringify(updates.extraData) : 
      updates.extraData;

    await neonSql`
      UPDATE users 
      SET extra_data = ${extraDataString}::jsonb, updated_at = ${updatedAt}
      WHERE id = ${id}
      RETURNING id, name, extra_data, updated_at
    `;

    return await getUserById(id);
  } catch (error) {
    console.error('Erro ao atualizar usuário diretamente:', error);
    return null;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    const user = await getUserById(id);
    if (user && isSuperAdmin(toPermissionUser(user))) {
      throw new Error("Não é possível excluir o Super Administrador do sistema");
    }

    if (user && hasAdminAccess(toPermissionUser(user))) {
      throw new Error("Não é possível excluir usuários administradores do sistema");
    }

    await db.delete(schema.users).where(eq(schema.users.id, id));
    return true;
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    throw error;
  }
}

export async function approveUser(id: number): Promise<User | null> {
  return updateUser(id, { isApproved: true, status: 'active' });
}

export async function rejectUser(id: number): Promise<User | null> {
  return updateUser(id, { isApproved: false, status: 'rejected' });
}

export async function updateUserChurch(userId: number, churchName: string): Promise<boolean> {
  try {
    await db.update(schema.users)
      .set({ church: churchName, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
    return true;
  } catch (error) {
    console.error('Erro ao atualizar igreja do usuário:', error);
    return false;
  }
}

export async function getUserDetailedData(userId: number): Promise<User | null> {
  return getUserById(userId);
}
