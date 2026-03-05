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

/**
 * Resolve o districtId efetivo para filtrar dados, respeitando impersonação.
 *
 * Lógica:
 * - Pastor: sempre retorna seu próprio districtId (obrigatório)
 * - Superadmin com ?districtId=X (impersonação): retorna X
 * - Superadmin sem districtId: retorna null (vê tudo)
 * - Outros roles: retorna null (filtragem feita por outros meios)
 *
 * @returns districtId numérico ou null (sem filtro de distrito)
 */
export function getEffectiveDistrictId(
  req: Request,
  user: { role?: string; districtId?: number | null; email?: string | null } | null
): number | null {
  if (!user) return null;

  // Pastor: sempre filtrado pelo seu distrito
  if (user.role === 'pastor' && user.districtId) {
    return user.districtId;
  }

  // Superadmin: pode filtrar por distrito via query param (impersonação)
  if (user.role === 'superadmin') {
    const requestedDistrict = req.query.districtId;
    if (requestedDistrict && typeof requestedDistrict === 'string') {
      const parsed = parseInt(requestedDistrict, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null; // Superadmin sem filtro vê tudo
  }

  return null;
}
