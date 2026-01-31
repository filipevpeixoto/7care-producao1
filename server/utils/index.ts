/**
 * Utilities Index
 * Exporta todas as funções utilitárias do servidor
 */

// Logging
export { logger } from './logger';

// Error handling
export { asyncHandler, asyncHandlerWithNotFound } from './asyncHandler';
export * from './errorHandler';

// API responses
export {
  success,
  error,
  paginated,
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendInternalError,
  sendPaginated,
} from './apiResponse';
export type { SuccessResponse, ErrorResponse, PaginatedResponse } from './apiResponse';

// Validation
export * from './paramValidation';
export * from './validators';
export * from './passwordValidator';
export * from './church-validation';

// Pagination
export * from './pagination';

// Parsers - exclude parseId to avoid duplicate export (already in paramValidation)
export {
  parseCargos,
  parseBoolean,
  parseNumber,
  parseFloat,
  parseDate,
  parseBirthDate,
  parseEmail,
  parsePhone,
  parseIds,
  sanitizeString,
  parseUserRole,
} from './parsers';

// Permissions
export * from './permissions';

// Route helpers
export * from './route-helpers';

// Data utilities
export * from './dataloader';

// Circuit breaker
export * from './circuitBreaker';

// Excel utilities
export * from './excelUtils';
