import { sql } from '../../neonConfig';
import { getRepository } from '../../container';
import type { UserRepository } from '../../repositories/userRepository';
import { hasAdminAccess } from '../../utils/permissions';
import { type Express, type Request, type Response, type NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { getAuthUserId } from '../../utils/authHelpers';
import {
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendInternalError,
} from '../../utils/apiResponse';

export {
  sql,
  getRepository,
  hasAdminAccess,
  logger,
  getAuthUserId,
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendInternalError,
};

export type { UserRepository, Express, Request, Response, NextFunction };

export type SqlRow = Record<string, unknown>;
export type ElectionConfigRow = SqlRow & {
  removed_candidates?: unknown;
  current_leaders?: unknown;
  voters?: unknown;
  positions?: unknown;
  criteria?: unknown;
  church_name?: unknown;
  max_nominations_per_voter?: unknown;
};
export type ElectionCriteria = {
  dizimistaRecorrente?: boolean;
  mustBeTither?: boolean;
  mustBeDonor?: boolean;
  minAttendance?: number;
  minMonthsInChurch?: number;
  minEngagement?: boolean;
  minClassification?: boolean;
  minBaptismYears?: number;
  classification?: {
    enabled?: boolean;
    frequente?: boolean;
    naoFrequente?: boolean;
    aResgatar?: boolean;
  };
};
export type ResultRow = {
  position_id: string;
  candidate_id: number;
  candidate_name?: string | null;
  candidate_email?: string | null;
  nominations?: number | string | null;
  votes?: number | string | null;
  percentage?: number;
};
export type VoteResultRow = {
  candidate_id: number;
  votes: number | string | null;
};
export type CandidateRow = {
  id?: number;
  candidate_id?: number;
  name?: string | null;
  candidate_name?: string | null;
  unit?: string | null;
  church?: string | null;
  nome_unidade?: string | null;
  nomeUnidade?: string | null;
  birth_date?: string | null;
  birthDate?: string | null;
  extra_data?: unknown;
  points?: number | string | null;
  nominations?: number | string | null;
  votes?: number | string | null;
  percentage?: number | string | null;
};
export type ElectionRow = SqlRow & {
  id?: number;
  election_id?: number;
  config_id?: number;
  status?: string;
  current_position?: number | null;
  current_phase?: string | null;
  result_announced?: boolean | null;
  created_at?: unknown;
  updated_at?: unknown;
  positions?: unknown;
  voters?: unknown;
  max_nominations_per_voter?: number | null;
  church_name?: unknown;
};
export type NormalizedCandidate = {
  id: number;
  name: string;
  unit: string;
  birthDate: string | null;
  extraData: Record<string, unknown> | null;
  points: number;
  nominations: number;
  votes: number;
  percentage: number;
  nomeUnidade: string | null;
};

export type MemberRow = {
  id: number;
  name: string;
  email: string;
  church?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string | null;
  birth_date?: string | null;
  is_tither?: boolean | null;
  is_donor?: boolean | null;
  attendance?: number | null;
  extra_data?: string | null;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const getErrorStack = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
};

export const parseHeaderUserId = (req: Request): number | null => {
  const userId = getAuthUserId(req);
  return userId || null;
};

export const parseIdValue = (value: unknown): number | null => {
  if (value == null) {
    return null;
  }
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(String(rawValue), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const toNumber = (value: unknown): number => {
  if (value == null) {
    return 0;
  }
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Type for count query results
export type CountRow = { count: string | number };
export const parseCount = (row: unknown): number => {
  if (!row) return 0;
  const countRow = row as CountRow;
  return typeof countRow.count === 'number'
    ? countRow.count
    : parseInt(String(countRow.count), 10) || 0;
};

export const parseExtraData = (extraData: unknown): Record<string, unknown> => {
  if (!extraData) {
    return {};
  }
  if (typeof extraData === 'string') {
    try {
      return JSON.parse(extraData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof extraData === 'object') {
    return extraData as Record<string, unknown>;
  }
  return {};
};

// Helper para obter igrejas do distrito do usuário (para isolamento de pastor)
export type DistrictFilterResult = {
  hasDistrictFilter: boolean;
  districtId: number | null;
  churchNames: string[];
};

export const getDistrictFilterForUser = async (
  userId: number | null,
  userRepo: UserRepository
): Promise<DistrictFilterResult> => {
  if (!userId) {
    return { hasDistrictFilter: false, districtId: null, churchNames: [] };
  }

  try {
    const user = await userRepo.getUserById(userId);

    // Se não é pastor ou não tem distrito, não filtra
    if (!user || user.role !== 'pastor' || !user.districtId) {
      return { hasDistrictFilter: false, districtId: null, churchNames: [] };
    }

    // Buscar igrejas do distrito
    const churches = await sql<{ name: string }>`
      SELECT name FROM churches WHERE district_id = ${user.districtId}
    `;

    const churchNames = churches.map(c => c.name);

    logger.debug(
      `🏛️ Filtro de distrito aplicado: districtId=${user.districtId}, igrejas=${churchNames.length}`
    );

    return {
      hasDistrictFilter: true,
      districtId: user.districtId,
      churchNames,
    };
  } catch (error) {
    logger.error('Erro ao obter filtro de distrito:', error);
    return { hasDistrictFilter: false, districtId: null, churchNames: [] };
  }
};

export const createCheckReadOnlyAccess = (userRepo: UserRepository) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseHeaderUserId(req);
      if (userId !== null) {
        const user = await userRepo.getUserById(userId);
        const extraData = user ? parseExtraData(user.extraData) : {};
        const readOnlyFlag = (extraData as { readOnly?: boolean }).readOnly;
        if (user && (user.role === 'admin_readonly' || readOnlyFlag === true)) {
          return res.status(403).json({
            success: false,
            message:
              'Usuário de teste possui acesso somente para leitura. Edições não são permitidas.',
            code: 'READONLY_ACCESS',
          });
        }
      }
      return next();
    } catch (error: unknown) {
      logger.error('Erro ao verificar acesso read-only:', error);
      return next();
    }
  };
};
