/**
 * Message Repository
 * Métodos relacionados a mensagens e conversas
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { Message, Conversation } from '../../shared/schema';
import type { CreateMessageInput, UpdateMessageInput } from '../types/storage';

export class MessageRepository {
  /**
   * Busca todas as mensagens
   */
  async getAll(): Promise<Message[]> {
    try {
      const messages = await db
        .select()
        .from(schema.messages)
        .orderBy(desc(schema.messages.createdAt));
      return messages.map(this.mapMessageRecord);
    } catch (error) {
      logger.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  /**
   * Busca mensagens por conversa
   */
  async getByConversationId(conversationId: number): Promise<Message[]> {
    try {
      const messages = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, conversationId))
        .orderBy(schema.messages.createdAt);
      return messages.map(this.mapMessageRecord);
    } catch (error) {
      logger.error('Erro ao buscar mensagens da conversa:', error);
      return [];
    }
  }

  /**
   * Busca mensagem por ID
   */
  async getById(id: number): Promise<Message | null> {
    try {
      const [message] = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, id))
        .limit(1);
      return message ? this.mapMessageRecord(message) : null;
    } catch (error) {
      logger.error('Erro ao buscar mensagem por ID:', error);
      return null;
    }
  }

  /**
   * Cria nova mensagem
   */
  async create(data: CreateMessageInput): Promise<Message> {
    try {
      const [message] = await db
        .insert(schema.messages)
        .values({
          content: data.content,
          senderId: data.senderId,
          conversationId: data.conversationId,
        })
        .returning();
      return this.mapMessageRecord(message);
    } catch (error) {
      logger.error('Erro ao criar mensagem:', error);
      throw error;
    }
  }

  /**
   * Atualiza mensagem
   */
  async update(id: number, updates: UpdateMessageInput): Promise<Message | null> {
    try {
      const [message] = await db
        .update(schema.messages)
        .set({
          ...updates,
        })
        .where(eq(schema.messages.id, id))
        .returning();
      return message ? this.mapMessageRecord(message) : null;
    } catch (error) {
      logger.error('Erro ao atualizar mensagem:', error);
      return null;
    }
  }

  /**
   * Deleta mensagem
   */
  async delete(id: number): Promise<boolean> {
    try {
      await db
        .delete(schema.messages)
        .where(eq(schema.messages.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar mensagem:', error);
      return false;
    }
  }

  /**
   * Mapeia registro do banco para o tipo Message
   */
  private mapMessageRecord(record: Record<string, unknown>): Message {
    return {
      id: Number(record.id),
      content: String(record.content || ''),
      senderId: record.senderId ? Number(record.senderId) : undefined,
      conversationId: record.conversationId ? Number(record.conversationId) : undefined,
      createdAt: record.createdAt instanceof Date 
        ? record.createdAt.toISOString() 
        : String(record.createdAt || ''),
    };
  }
}

export class ConversationRepository {
  /**
   * Busca todas as conversas
   */
  async getAll(): Promise<Conversation[]> {
    try {
      const conversations = await db
        .select()
        .from(schema.conversations)
        .orderBy(desc(schema.conversations.updatedAt));
      return conversations.map(this.mapRecord);
    } catch (error) {
      logger.error('Erro ao buscar conversas:', error);
      return [];
    }
  }

  /**
   * Busca conversas por usuário
   */
  async getByUserId(userId: number): Promise<Conversation[]> {
    try {
      const result = await db
        .select({
          conversation: schema.conversations,
        })
        .from(schema.conversationParticipants)
        .innerJoin(
          schema.conversations,
          eq(schema.conversationParticipants.conversationId, schema.conversations.id)
        )
        .where(eq(schema.conversationParticipants.userId, userId))
        .orderBy(desc(schema.conversations.updatedAt));
      
      return result.map(r => this.mapRecord(r.conversation));
    } catch (error) {
      logger.error('Erro ao buscar conversas do usuário:', error);
      return [];
    }
  }

  /**
   * Busca conversa por ID
   */
  async getById(id: number): Promise<Conversation | null> {
    try {
      const [conversation] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id))
        .limit(1);
      return conversation ? this.mapRecord(conversation) : null;
    } catch (error) {
      logger.error('Erro ao buscar conversa por ID:', error);
      return null;
    }
  }

  /**
   * Cria nova conversa
   */
  async create(data: Partial<Conversation>): Promise<Conversation> {
    try {
      const [conversation] = await db
        .insert(schema.conversations)
        .values({
          title: data.title,
          type: data.type || 'private',
          createdBy: data.createdBy,
        })
        .returning();
      return this.mapRecord(conversation);
    } catch (error) {
      logger.error('Erro ao criar conversa:', error);
      throw error;
    }
  }

  /**
   * Atualiza conversa
   */
  async update(id: number, updates: Partial<Conversation>): Promise<Conversation | null> {
    try {
      const [conversation] = await db
        .update(schema.conversations)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.conversations.id, id))
        .returning();
      return conversation ? this.mapRecord(conversation) : null;
    } catch (error) {
      logger.error('Erro ao atualizar conversa:', error);
      return null;
    }
  }

  /**
   * Deleta conversa
   */
  async delete(id: number): Promise<boolean> {
    try {
      // Primeiro deleta as mensagens
      await db
        .delete(schema.messages)
        .where(eq(schema.messages.conversationId, id));
      
      // Depois deleta os participantes
      await db
        .delete(schema.conversationParticipants)
        .where(eq(schema.conversationParticipants.conversationId, id));
      
      // Por fim, deleta a conversa
      await db
        .delete(schema.conversations)
        .where(eq(schema.conversations.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar conversa:', error);
      return false;
    }
  }

  /**
   * Busca ou cria conversa direta entre dois usuários
   */
  async getOrCreateDirect(userAId: number, userBId: number): Promise<Conversation> {
    try {
      // Busca conversa existente entre os dois usuários
      const existingConversations = await this.getByUserId(userAId);
      
      for (const conv of existingConversations) {
        if (conv.type === 'private') {
          const participants = await db
            .select()
            .from(schema.conversationParticipants)
            .where(eq(schema.conversationParticipants.conversationId, conv.id));
          
          const participantIds = participants.map(p => Number(p.userId));
          if (
            participantIds.length === 2 &&
            participantIds.includes(userAId) &&
            participantIds.includes(userBId)
          ) {
            return conv;
          }
        }
      }

      // Cria nova conversa
      const conversation = await this.create({
        type: 'private',
        createdBy: userAId,
      });

      // Adiciona participantes
      await db.insert(schema.conversationParticipants).values([
        { conversationId: conversation.id, userId: userAId },
        { conversationId: conversation.id, userId: userBId },
      ]);

      return conversation;
    } catch (error) {
      logger.error('Erro ao buscar/criar conversa direta:', error);
      throw error;
    }
  }

  /**
   * Mapeia registro do banco para o tipo Conversation
   */
  private mapRecord(record: Record<string, unknown>): Conversation {
    return {
      id: Number(record.id),
      title: record.title ? String(record.title) : undefined,
      type: String(record.type || 'private'),
      createdBy: record.createdBy ? Number(record.createdBy) : undefined,
      createdAt: record.createdAt instanceof Date 
        ? record.createdAt.toISOString() 
        : String(record.createdAt || ''),
      updatedAt: record.updatedAt instanceof Date 
        ? record.updatedAt.toISOString() 
        : String(record.updatedAt || ''),
    };
  }
}

export const messageRepository = new MessageRepository();
export const conversationRepository = new ConversationRepository();
