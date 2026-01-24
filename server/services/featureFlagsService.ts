/**
 * Feature Flags Service
 * Sistema de feature toggles para controle gradual de features
 */

import { Request } from 'express';
import { logger } from '../utils/logger';

/**
 * Tipo de estratégia de rollout
 */
type RolloutStrategy = 
  | 'all'           // Habilitado para todos
  | 'none'          // Desabilitado para todos
  | 'percentage'    // Porcentagem de usuários
  | 'userIds'       // Lista específica de IDs
  | 'roles'         // Roles específicas
  | 'churches'      // Igrejas específicas
  | 'environment';  // Baseado em ambiente

/**
 * Configuração de feature flag
 */
interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  strategy: RolloutStrategy;
  config: {
    percentage?: number;
    userIds?: number[];
    roles?: string[];
    churches?: string[];
    environments?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contexto do usuário para avaliação de flags
 */
interface UserContext {
  userId?: number;
  role?: string;
  church?: string;
  email?: string;
}

/**
 * Armazenamento de feature flags (em memória para simplicidade)
 * Em produção, usar Redis ou banco de dados
 */
const featureFlags: Map<string, FeatureFlag> = new Map();

/**
 * Inicializa flags padrão
 */
function initDefaultFlags(): void {
  const defaultFlags: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'new_dashboard',
      description: 'Novo design do dashboard',
      enabled: false,
      strategy: 'percentage',
      config: { percentage: 10 },
    },
    {
      name: 'advanced_reports',
      description: 'Relatórios avançados com gráficos',
      enabled: true,
      strategy: 'roles',
      config: { roles: ['superadmin', 'pastor'] },
    },
    {
      name: 'dark_mode',
      description: 'Tema escuro',
      enabled: true,
      strategy: 'all',
      config: {},
    },
    {
      name: 'beta_features',
      description: 'Features em beta testing',
      enabled: false,
      strategy: 'userIds',
      config: { userIds: [] },
    },
    {
      name: 'ai_assistant',
      description: 'Assistente de IA para discipulado',
      enabled: false,
      strategy: 'environment',
      config: { environments: ['development'] },
    },
    {
      name: 'offline_mode',
      description: 'Modo offline com IndexedDB',
      enabled: true,
      strategy: 'all',
      config: {},
    },
    {
      name: 'push_notifications',
      description: 'Notificações push',
      enabled: true,
      strategy: 'all',
      config: {},
    },
    {
      name: 'two_factor_auth',
      description: 'Autenticação de dois fatores',
      enabled: true,
      strategy: 'all',
      config: {},
    },
  ];

  const now = new Date();
  defaultFlags.forEach(flag => {
    featureFlags.set(flag.name, {
      ...flag,
      createdAt: now,
      updatedAt: now,
    });
  });

  logger.info(`Feature flags inicializadas: ${defaultFlags.length}`);
}

/**
 * Hash simples para distribuição de porcentagem
 */
function hashUserId(userId: number): number {
  return userId % 100;
}

/**
 * Verifica se uma feature está habilitada para um contexto
 */
export function isFeatureEnabled(
  flagName: string,
  context: UserContext = {}
): boolean {
  const flag = featureFlags.get(flagName);
  
  if (!flag) {
    logger.warn(`Feature flag não encontrada: ${flagName}`);
    return false;
  }

  if (!flag.enabled) {
    return false;
  }

  switch (flag.strategy) {
    case 'all':
      return true;

    case 'none':
      return false;

    case 'percentage':
      if (!context.userId || !flag.config.percentage) {
        return false;
      }
      return hashUserId(context.userId) < flag.config.percentage;

    case 'userIds':
      if (!context.userId || !flag.config.userIds) {
        return false;
      }
      return flag.config.userIds.includes(context.userId);

    case 'roles':
      if (!context.role || !flag.config.roles) {
        return false;
      }
      return flag.config.roles.includes(context.role);

    case 'churches':
      if (!context.church || !flag.config.churches) {
        return false;
      }
      return flag.config.churches.includes(context.church);

    case 'environment':
      if (!flag.config.environments) {
        return false;
      }
      return flag.config.environments.includes(process.env.NODE_ENV || 'development');

    default:
      return false;
  }
}

/**
 * Obtém todas as flags habilitadas para um contexto
 */
export function getEnabledFeatures(context: UserContext = {}): string[] {
  const enabled: string[] = [];
  
  featureFlags.forEach((flag, name) => {
    if (isFeatureEnabled(name, context)) {
      enabled.push(name);
    }
  });
  
  return enabled;
}

/**
 * Obtém todas as flags com status
 */
export function getAllFlags(): FeatureFlag[] {
  return Array.from(featureFlags.values());
}

/**
 * Cria ou atualiza uma flag
 */
export function setFlag(
  name: string,
  config: Partial<Omit<FeatureFlag, 'name' | 'createdAt' | 'updatedAt'>>
): FeatureFlag {
  const existing = featureFlags.get(name);
  const now = new Date();
  
  const flag: FeatureFlag = {
    name,
    description: config.description || existing?.description || '',
    enabled: config.enabled ?? existing?.enabled ?? false,
    strategy: config.strategy || existing?.strategy || 'none',
    config: config.config || existing?.config || {},
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  
  featureFlags.set(name, flag);
  logger.info(`Feature flag atualizada: ${name}`, { enabled: flag.enabled, strategy: flag.strategy });
  
  return flag;
}

/**
 * Remove uma flag
 */
export function removeFlag(name: string): boolean {
  const deleted = featureFlags.delete(name);
  if (deleted) {
    logger.info(`Feature flag removida: ${name}`);
  }
  return deleted;
}

/**
 * Middleware para adicionar flags ao request
 */
export function featureFlagsMiddleware(
  req: Request & { featureFlags?: string[]; userContext?: UserContext },
  _res: unknown,
  next: () => void
): void {
  const context: UserContext = {
    userId: (req as Request & { userId?: number }).userId,
    role: (req as Request & { user?: { role?: string } }).user?.role,
    church: (req as Request & { user?: { church?: string } }).user?.church,
  };
  
  req.userContext = context;
  req.featureFlags = getEnabledFeatures(context);
  
  next();
}

/**
 * Helper para criar decorador de feature flag
 */
export function requireFeature(flagName: string) {
  return function(
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(this: unknown, ...args: unknown[]) {
      const req = args[0] as Request & { userContext?: UserContext };
      const res = args[1] as { status: (code: number) => { json: (data: unknown) => void } };
      
      if (!isFeatureEnabled(flagName, req.userContext || {})) {
        return res.status(403).json({
          error: 'Feature não disponível',
          feature: flagName,
        });
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Endpoint para obter flags do usuário
 */
export function getUserFlagsEndpoint(
  req: Request & { userContext?: UserContext },
  res: { json: (data: unknown) => void }
): void {
  const context: UserContext = {
    userId: (req as Request & { userId?: number }).userId,
    role: (req as Request & { user?: { role?: string } }).user?.role,
    church: (req as Request & { user?: { church?: string } }).user?.church,
  };
  
  res.json({
    features: getEnabledFeatures(context),
  });
}

/**
 * Inicializa o serviço de feature flags
 */
export function initFeatureFlags(): void {
  initDefaultFlags();
}

export default {
  init: initFeatureFlags,
  isEnabled: isFeatureEnabled,
  getEnabled: getEnabledFeatures,
  getAll: getAllFlags,
  set: setFlag,
  remove: removeFlag,
  middleware: featureFlagsMiddleware,
  endpoint: getUserFlagsEndpoint,
  requireFeature,
};
