/**
 * Google Calendar Repository
 * Métodos relacionados a tokens e configurações do Google Calendar
 */

import { eq } from 'drizzle-orm';
import { db } from '../neonConfig';
import * as schema from '../schema';
import { logger } from '../utils/logger';
import type { GoogleCalendarTokens } from '../types/storage';

export class GoogleCalendarRepository {
  /**
   * Salva tokens do Google Calendar para um usuário (delete + insert)
   */
  async saveTokens(userId: number, tokens: GoogleCalendarTokens): Promise<void> {
    try {
      await db
        .delete(schema.googleCalendarTokens)
        .where(eq(schema.googleCalendarTokens.userId, userId));

      await db.insert(schema.googleCalendarTokens).values({
        userId: tokens.userId,
        districtId: tokens.districtId || null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        tokenType: 'Bearer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error saving Google Calendar tokens:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to save Google Calendar tokens: ${error.message}`, {
          cause: error,
        });
      }
      throw new Error(`Failed to save Google Calendar tokens: ${String(error)}`, {
        cause: error,
      });
    }
  }

  /**
   * Busca tokens do Google Calendar de um usuário
   */
  async getTokens(userId: number): Promise<GoogleCalendarTokens | null> {
    try {
      const result = await db
        .select()
        .from(schema.googleCalendarTokens)
        .where(eq(schema.googleCalendarTokens.userId, userId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        userId: row.userId,
        districtId: row.districtId || undefined,
        accessToken: row.accessToken,
        refreshToken: row.refreshToken,
        expiresAt: row.expiresAt,
        scope: row.scope,
      };
    } catch (error) {
      logger.error('Error getting Google Calendar tokens:', error);
      return null;
    }
  }

  /**
   * Atualiza tokens do Google Calendar
   */
  async updateTokens(userId: number, tokens: Partial<GoogleCalendarTokens>): Promise<void> {
    try {
      await db
        .update(schema.googleCalendarTokens)
        .set({
          ...tokens,
          updatedAt: new Date(),
        })
        .where(eq(schema.googleCalendarTokens.userId, userId));
    } catch (error) {
      logger.error('Error updating Google Calendar tokens:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to update Google Calendar tokens: ${error.message}`, {
          cause: error,
        });
      }
      throw new Error(`Failed to update Google Calendar tokens: ${String(error)}`, {
        cause: error,
      });
    }
  }

  /**
   * Deleta tokens do Google Calendar de um usuário
   */
  async deleteTokens(userId: number): Promise<void> {
    try {
      await db
        .delete(schema.googleCalendarTokens)
        .where(eq(schema.googleCalendarTokens.userId, userId));
    } catch (error) {
      logger.error('Error deleting Google Calendar tokens:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to delete Google Calendar tokens: ${error.message}`, {
          cause: error,
        });
      }
      throw new Error(`Failed to delete Google Calendar tokens: ${String(error)}`, {
        cause: error,
      });
    }
  }

  /**
   * Busca evento por Google Calendar Event ID
   */
  async getEventByGoogleId(googleCalendarEventId: string): Promise<unknown | null> {
    try {
      const result = await db
        .select()
        .from(schema.events)
        .where(eq(schema.events.googleCalendarEventId, googleCalendarEventId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return result[0];
    } catch (error) {
      logger.error('Error getting event by Google ID:', error);
      return null;
    }
  }
}

export const googleCalendarRepository = new GoogleCalendarRepository();
export default googleCalendarRepository;
