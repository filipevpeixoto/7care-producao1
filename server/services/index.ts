/**
 * Services Index
 * Exporta todos os serviços da aplicação
 */

// Serviços de autenticação e usuários
export {
  authService,
  type LoginResult,
  type RegisterResult,
  type PasswordChangeResult,
} from './authService';
export {
  userService,
  type UserFilterOptions,
  type PaginationOptions,
  type PaginatedResult,
  type UserOperationResult,
} from './userService';

// Serviços de infraestrutura
import apmService from './apmService';
import { cacheService } from './cacheService';
import featureFlagsService from './featureFlagsService';
import sentryService from './sentryService';
import twoFactorService from './twoFactorService';

export { apmService, cacheService, featureFlagsService, sentryService, twoFactorService };

// Objeto consolidado com todos os services
export const services = {
  auth: async () => (await import('./authService')).authService,
  user: async () => (await import('./userService')).userService,
  apm: async () => (await import('./apmService')).default,
  cache: async () => (await import('./cacheService')).cacheService,
  featureFlags: async () => (await import('./featureFlagsService')).default,
  sentry: async () => (await import('./sentryService')).default,
  twoFactor: async () => (await import('./twoFactorService')).default,
};

export default services;
