/**
 * Notification Repository
 * Gerencia operações de notificações no banco de dados
 */

import { eq, desc } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { Notification } from '../../shared/schema';
import type { CreateNotificationInput, UpdateNotificationInput } from '../types/storage';

export class NotificationRepository {
  /**
   * Busca todas as notificações
   */
  async getAll(): Promise<Notification[]> {
    try {
      const notifications = await db
        .select()
        .from(schema.notifications)
        .orderBy(desc(schema.notifications.createdAt));
      return notifications.map(n => this.mapRecord(n));
    } catch (error) {
      logger.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  /**
   * Busca notificação por ID
   */
  async getById(id: number): Promise<Notification | null> {
    try {
      const [notification] = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.id, id))
        .limit(1);
      return notification ? this.mapRecord(notification) : null;
    } catch (error) {
      logger.error('Erro ao buscar notificação por ID:', error);
      return null;
    }
  }

  /**
   * Busca notificações de um usuário
   */
  async getByUserId(userId: number, limit = 50): Promise<Notification[]> {
    try {
      const notifications = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit);
      return notifications.map(n => this.mapRecord(n));
    } catch (error) {
      logger.error('Erro ao buscar notificações do usuário:', error);
      return [];
    }
  }

  /**
   * Conta notificações não lidas de um usuário
   */
  async countUnread(userId: number): Promise<number> {
    try {
      const notifications = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId));
      return notifications.filter(n => !n.isRead).length;
    } catch (error) {
      logger.error('Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }

  /**
   * Cria uma nova notificação
   */
  async create(data: CreateNotificationInput): Promise<Notification> {
    try {
      const [notification] = await db
        .insert(schema.notifications)
        .values({
          title: data.title,
          message: data.message,
          userId: data.userId,
          type: data.type || 'general',
          isRead: false,
          createdAt: new Date(),
        })
        .returning();
      return this.mapRecord(notification);
    } catch (error) {
      logger.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma notificação
   */
  async update(id: number, updates: UpdateNotificationInput): Promise<Notification | null> {
    try {
      const [notification] = await db
        .update(schema.notifications)
        .set(updates)
        .where(eq(schema.notifications.id, id))
        .returning();
      return notification ? this.mapRecord(notification) : null;
    } catch (error) {
      logger.error('Erro ao atualizar notificação:', error);
      return null;
    }
  }

  /**
   * Marca notificação como lida
   */
  async markAsRead(id: number): Promise<Notification | null> {
    try {
      const [notification] = await db
        .update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.id, id))
        .returning();
      return notification ? this.mapRecord(notification) : null;
    } catch (error) {
      logger.error('Erro ao marcar notificação como lida:', error);
      return null;
    }
  }

  /**
   * Marca todas as notificações de um usuário como lidas
   */
  async markAllAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.userId, userId));
      return true;
    } catch (error) {
      logger.error('Erro ao marcar todas notificações como lidas:', error);
      return false;
    }
  }

  /**
   * Deleta uma notificação
   */
  async delete(id: number): Promise<boolean> {
    try {
      await db.delete(schema.notifications).where(eq(schema.notifications.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar notificação:', error);
      return false;
    }
  }

  /**
   * Deleta todas as notificações de um usuário
   */
  async deleteAllByUser(userId: number): Promise<boolean> {
    try {
      await db.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar notificações do usuário:', error);
      return false;
    }
  }

  /**
   * Mapeia registro do banco para o tipo Notification
   */
  private mapRecord(record: Record<string, unknown>): Notification {
    const createdAt =
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : String(record.createdAt || '');

    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      title: record.title == null ? '' : String(record.title),
      message: record.message == null ? '' : String(record.message),
      type: record.type == null ? 'general' : String(record.type),
      isRead: record.isRead == null ? false : Boolean(record.isRead),
      createdAt,
    };
  }
}

export const notificationRepository = new NotificationRepository();
