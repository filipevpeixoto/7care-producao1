/**
 * Auth Helpers
 * Funções utilitárias para obter dados do usuário autenticado via JWT.
 *
 * Após o middleware optionalJwtAuth (registrado globalmente no app.ts),
 * req.userId e req.user estarão disponíveis se um token JWT válido foi enviado.
 *
 * Essas funções substituem o padrão inseguro de ler x-user-id do header,
 * que é facilmente spoofável pelo cliente.
 */

import { type Request } from 'express';
import type { AuthenticatedRequest } from '../middleware/jwtAuth';

/**
 * Obtém o ID do usuário autenticado via JWT.
 * Retorna 0 se não autenticado.
 */
export function getAuthUserId(req: Request): number {
  return (req as AuthenticatedRequest).userId || 0;
}

/**
 * Obtém os dados do usuário autenticado via JWT.
 * Retorna null se não autenticado.
 */
export function getAuthUser(req: Request): AuthenticatedRequest['user'] | null {
  return (req as AuthenticatedRequest).user || null;
}

/**
 * Obtém o role do usuário autenticado via JWT.
 * Retorna undefined se não autenticado.
 */
export function getAuthUserRole(req: Request): string | undefined {
  return (req as AuthenticatedRequest).userRole;
}

/**
 * Obtém o districtId do usuário autenticado via JWT.
 * Retorna null se não autenticado ou sem distrito.
 */
export function getAuthDistrictId(req: Request): number | undefined {
  return (req as AuthenticatedRequest).user?.districtId;
}
