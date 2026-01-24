/**
 * Type Extensions para Express Request
 * Extende o tipo Request do Express com propriedades customizadas
 */

import { Request } from 'express';
import { User } from '@shared/schema';

/**
 * Request com userId autenticado
 */
export interface AuthenticatedRequest extends Request {
  userId?: number;
  user?: User;
}

/**
 * Request com token CSRF
 */
export interface CsrfRequest extends Request {
  csrfToken?: string;
}

/**
 * Request completo com todas as extensões
 */
export interface ExtendedRequest extends Request {
  userId?: number;
  user?: User;
  csrfToken?: string;
  startTime?: number;
  requestId?: string;
}

/**
 * Tipos para campos de usuário com dados estendidos
 */
export interface UserExtraFields {
  engajamento?: 'alto' | 'medio' | 'baixo' | null;
  classificacao?: string | null;
  dizimistaType?: string | null;
  ofertanteType?: string | null;
  tempoBatismoAnos?: number | null;
  temLicao?: boolean | null;
  totalPresenca?: number | null;
  cpfValido?: boolean | null;
  camposVazios?: number | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  twoFactorPendingSecret?: string | null;
  backupCodes?: string[] | null;
}

/**
 * User com campos extras
 */
export type UserWithExtras = User & Partial<UserExtraFields>;

/**
 * Tipos para pontos
 */
export interface PointsConfig {
  basicPoints?: number;
  attendancePoints?: number;
  eventPoints?: number;
  donationPoints?: number;
  [key: string]: number | undefined;
}

/**
 * Tipo para Window com extensões
 */
export interface ExtendedWindow extends Window {
  Sentry?: {
    addBreadcrumb: (breadcrumb: {
      category: string;
      message: string;
      level: string;
      data?: Record<string, unknown>;
    }) => void;
  };
  gtag?: (
    command: string,
    action: string,
    params: Record<string, unknown>
  ) => void;
  testOfflineData?: unknown;
}

/**
 * Navigator com extensões iOS
 */
export interface ExtendedNavigator extends Navigator {
  standalone?: boolean;
}

/**
 * Tipos para classificações
 */
export type EngajamentoType = 'alto' | 'medio' | 'baixo';
export type ClassificacaoType = 'ativo' | 'regular' | 'irregular' | 'inativo';
export type DizimistaType = 'fiel' | 'regular' | 'irregular' | 'nao';
export type OfertanteType = 'generoso' | 'regular' | 'ocasional' | 'nao';

/**
 * Dados do usuário para cálculo de pontos
 */
export interface PointsCalculationData {
  engajamento?: EngajamentoType | null;
  classificacao?: ClassificacaoType | null;
  dizimista?: DizimistaType | null;
  ofertante?: OfertanteType | null;
  tempoBatismoAnos?: number | null;
  temLicao?: boolean | null;
  totalPresenca?: number | null;
}
