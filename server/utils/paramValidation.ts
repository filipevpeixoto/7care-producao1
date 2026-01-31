/**
 * Validação de parâmetros de rota com Zod
 *
 * Este módulo fornece schemas Zod reutilizáveis para validação
 * de parâmetros numéricos em rotas da API.
 */

import { z } from 'zod';

// ============ SCHEMAS DE ID ============

/**
 * Schema para validar parâmetro :id numérico
 */
export const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'ID deve ser um número' })
    .int('ID deve ser um número inteiro')
    .positive('ID deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :userId numérico
 */
export const userIdParamSchema = z.object({
  userId: z.coerce
    .number({ invalid_type_error: 'userId deve ser um número' })
    .int('userId deve ser um número inteiro')
    .positive('userId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :churchId numérico
 */
export const churchIdParamSchema = z.object({
  churchId: z.coerce
    .number({ invalid_type_error: 'churchId deve ser um número' })
    .int('churchId deve ser um número inteiro')
    .positive('churchId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :districtId numérico
 */
export const districtIdParamSchema = z.object({
  districtId: z.coerce
    .number({ invalid_type_error: 'districtId deve ser um número' })
    .int('districtId deve ser um número inteiro')
    .positive('districtId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :eventId numérico
 */
export const eventIdParamSchema = z.object({
  eventId: z.coerce
    .number({ invalid_type_error: 'eventId deve ser um número' })
    .int('eventId deve ser um número inteiro')
    .positive('eventId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :meetingId numérico
 */
export const meetingIdParamSchema = z.object({
  meetingId: z.coerce
    .number({ invalid_type_error: 'meetingId deve ser um número' })
    .int('meetingId deve ser um número inteiro')
    .positive('meetingId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :prayerId numérico
 */
export const prayerIdParamSchema = z.object({
  prayerId: z.coerce
    .number({ invalid_type_error: 'prayerId deve ser um número' })
    .int('prayerId deve ser um número inteiro')
    .positive('prayerId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :notificationId numérico
 */
export const notificationIdParamSchema = z.object({
  notificationId: z.coerce
    .number({ invalid_type_error: 'notificationId deve ser um número' })
    .int('notificationId deve ser um número inteiro')
    .positive('notificationId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :relationshipId numérico
 */
export const relationshipIdParamSchema = z.object({
  relationshipId: z.coerce
    .number({ invalid_type_error: 'relationshipId deve ser um número' })
    .int('relationshipId deve ser um número inteiro')
    .positive('relationshipId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :electionId numérico
 */
export const electionIdParamSchema = z.object({
  electionId: z.coerce
    .number({ invalid_type_error: 'electionId deve ser um número' })
    .int('electionId deve ser um número inteiro')
    .positive('electionId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :taskId numérico
 */
export const taskIdParamSchema = z.object({
  taskId: z.coerce
    .number({ invalid_type_error: 'taskId deve ser um número' })
    .int('taskId deve ser um número inteiro')
    .positive('taskId deve ser um número positivo'),
});

/**
 * Schema para validar parâmetro :conversationId numérico
 */
export const conversationIdParamSchema = z.object({
  conversationId: z.coerce
    .number({ invalid_type_error: 'conversationId deve ser um número' })
    .int('conversationId deve ser um número inteiro')
    .positive('conversationId deve ser um número positivo'),
});

// ============ SCHEMAS COMBINADOS ============

/**
 * Schema para validar :userId e :id juntos
 */
export const userAndIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

/**
 * Schema para validar :districtId e :id juntos
 */
export const districtAndIdParamSchema = z.object({
  districtId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

// ============ HELPER FUNCTION ============

/**
 * Função helper para extrair ID validado de params
 * Lança ValidationError se inválido
 */
export function parseId(value: string | undefined, fieldName = 'id'): number {
  const parsed = parseInt(value || '', 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} inválido: deve ser um número positivo`);
  }
  return parsed;
}

/**
 * Função helper para extrair ID validado ou null
 */
export function parseIdOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

// ============ TIPOS EXPORTADOS ============

export type IdParam = z.infer<typeof idParamSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type ChurchIdParam = z.infer<typeof churchIdParamSchema>;
export type DistrictIdParam = z.infer<typeof districtIdParamSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type MeetingIdParam = z.infer<typeof meetingIdParamSchema>;
export type PrayerIdParam = z.infer<typeof prayerIdParamSchema>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
export type RelationshipIdParam = z.infer<typeof relationshipIdParamSchema>;
export type ElectionIdParam = z.infer<typeof electionIdParamSchema>;
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;
