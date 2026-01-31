/**
 * Push Subscription Repository
 * Gerencia operações de push subscriptions (web push) no banco de dados
 */

import { eq, desc, inArray, and } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type {
  PushSubscription,
  CreatePushSubscriptionInput,
  PushSubscriptionPayload,
} from '../types/storage';

export class PushSubscriptionRepository {
  /**
   * Busca todas as push subscriptions
   */
  async getAll(): Promise<PushSubscription[]> {
    try {
      const subscriptions = await db
        .select()
        .from(schema.pushSubscriptions)
        .orderBy(desc(schema.pushSubscriptions.createdAt));
      return subscriptions.map(s => this.mapRecord(s));
    } catch (error) {
      logger.error('Erro ao buscar push subscriptions:', error);
      return [];
    }
  }

  /**
   * Busca push subscriptions por ID de usuário
   */
  async getByUserId(userId: number): Promise<PushSubscription[]> {
    try {
      const subscriptions = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.userId, userId))
        .orderBy(desc(schema.pushSubscriptions.createdAt));
      return subscriptions.map(s => this.mapRecord(s));
    } catch (error) {
      logger.error('Erro ao buscar push subscriptions do usuário:', error);
      return [];
    }
  }

  /**
   * Busca push subscriptions ativas por IDs de usuários
   */
  async getActiveByUserIds(userIds: number[]): Promise<PushSubscription[]> {
    try {
      const subscriptions = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(
          and(
            inArray(schema.pushSubscriptions.userId, userIds),
            eq(schema.pushSubscriptions.isActive, true)
          )
        );
      return subscriptions.map(s => this.mapRecord(s));
    } catch (error) {
      logger.error('Erro ao buscar push subscriptions ativas:', error);
      return [];
    }
  }

  /**
   * Busca push subscription por ID
   */
  async getById(id: number): Promise<PushSubscription | null> {
    try {
      const [subscription] = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.id, id))
        .limit(1);
      return subscription ? this.mapRecord(subscription) : null;
    } catch (error) {
      logger.error('Erro ao buscar push subscription por ID:', error);
      return null;
    }
  }

  /**
   * Cria ou atualiza push subscription
   * Se já existe uma com o mesmo endpoint, atualiza
   */
  async create(data: CreatePushSubscriptionInput): Promise<PushSubscription> {
    try {
      const subscriptionPayload: PushSubscriptionPayload =
        typeof data.subscription === 'string' ? JSON.parse(data.subscription) : data.subscription;

      // Verificar se já existe uma subscription com o mesmo endpoint
      const [existing] = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.endpoint, subscriptionPayload.endpoint))
        .limit(1);

      if (existing) {
        // Atualizar a existente
        const [updated] = await db
          .update(schema.pushSubscriptions)
          .set({
            userId: data.userId,
            p256dh: subscriptionPayload.keys.p256dh,
            auth: subscriptionPayload.keys.auth,
            isActive: data.isActive ?? true,
            updatedAt: new Date(),
          })
          .where(eq(schema.pushSubscriptions.id, existing.id))
          .returning();
        return this.mapRecord(updated);
      }

      // Criar nova
      const [subscription] = await db
        .insert(schema.pushSubscriptions)
        .values({
          userId: data.userId,
          endpoint: subscriptionPayload.endpoint,
          p256dh: subscriptionPayload.keys.p256dh,
          auth: subscriptionPayload.keys.auth,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return this.mapRecord(subscription);
    } catch (error) {
      logger.error('Erro ao criar push subscription:', error);
      throw error;
    }
  }

  /**
   * Alterna o status ativo/inativo de uma subscription
   */
  async toggle(id: number): Promise<PushSubscription | null> {
    try {
      const [existing] = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.id, id))
        .limit(1);

      if (!existing) {
        return null;
      }

      const [updated] = await db
        .update(schema.pushSubscriptions)
        .set({
          isActive: !existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(schema.pushSubscriptions.id, id))
        .returning();

      return updated ? this.mapRecord(updated) : null;
    } catch (error) {
      logger.error('Erro ao alternar push subscription:', error);
      return null;
    }
  }

  /**
   * Desativa uma subscription (após falha de envio)
   */
  async deactivate(id: number): Promise<boolean> {
    try {
      await db
        .update(schema.pushSubscriptions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.pushSubscriptions.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao desativar push subscription:', error);
      return false;
    }
  }

  /**
   * Deleta uma push subscription
   */
  async delete(id: number): Promise<boolean> {
    try {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar push subscription:', error);
      return false;
    }
  }

  /**
   * Deleta todas as subscriptions de um usuário
   */
  async deleteByUserId(userId: number): Promise<boolean> {
    try {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar push subscriptions do usuário:', error);
      return false;
    }
  }

  /**
   * Converte Date para string ISO
   */
  private toDateString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value || '');
  }

  /**
   * Mapeia registro do banco para o tipo PushSubscription
   */
  private mapRecord(record: Record<string, unknown>): PushSubscription {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      endpoint: record.endpoint == null ? '' : String(record.endpoint),
      p256dh: record.p256dh == null ? '' : String(record.p256dh),
      auth: record.auth == null ? '' : String(record.auth),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
      deviceName: record.deviceName == null ? null : String(record.deviceName),
    };
  }
}

export const pushSubscriptionRepository = new PushSubscriptionRepository();
