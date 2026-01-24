/**
 * Type Extensions para cliente
 * Tipos customizados para extensões de window, navigator, etc.
 */

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
    captureException: (error: Error) => void;
    captureMessage: (message: string) => void;
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
 * Tipos para classificações de usuário
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

/**
 * Configuração de pontos
 */
export interface PointsConfig {
  basicPoints?: number;
  attendancePoints?: number;
  eventPoints?: number;
  donationPoints?: number;
  [key: string]: number | undefined;
}

/**
 * Helper para verificar navigator iOS standalone
 */
export function isIOSStandalone(): boolean {
  return (navigator as ExtendedNavigator).standalone === true;
}

/**
 * Helper para acessar Sentry de forma tipada
 */
export function getSentry(): ExtendedWindow['Sentry'] | undefined {
  return (window as unknown as ExtendedWindow).Sentry;
}

/**
 * Helper para acessar gtag de forma tipada
 */
export function getGtag(): ExtendedWindow['gtag'] | undefined {
  return (window as unknown as ExtendedWindow).gtag;
}
