/**
 * Módulo Index - Exporta todos os módulos
 * Centraliza imports/exports para facilitar uso
 */

const auth = require('./auth.cjs');
const rateLimit = require('./rateLimit.cjs');
const validation = require('./validation.cjs');
const responses = require('./responses.cjs');
const logger = require('./logger.cjs');
const database = require('./database.cjs');
const points = require('./points.cjs');
const users = require('./users.cjs');
const churches = require('./churches.cjs');
const districts = require('./districts.cjs');
const invites = require('./invites.cjs');
const excelProcessor = require('./excelProcessor.cjs');

module.exports = {
  // Autenticação
  auth,
  ...auth,
  
  // Rate Limiting
  rateLimit,
  checkRateLimit: rateLimit.checkRateLimit,
  rateLimitMiddleware: rateLimit.rateLimitMiddleware,
  
  // Validação
  validation,
  sanitizeString: validation.sanitizeString,
  sanitizeObject: validation.sanitizeObject,
  isValidEmail: validation.isValidEmail,
  validateUserData: validation.validateUserData,
  parseDate: validation.parseDate,
  parseBool: validation.parseBool,
  
  // Respostas
  responses,
  successResponse: responses.successResponse,
  errorResponse: responses.errorResponse,
  notFoundResponse: responses.notFoundResponse,
  unauthorizedResponse: responses.unauthorizedResponse,
  forbiddenResponse: responses.forbiddenResponse,
  validationErrorResponse: responses.validationErrorResponse,
  toCamelCase: responses.toCamelCase,
  toSnakeCase: responses.toSnakeCase,
  
  // Logger
  logger,
  log: logger,
  
  // Database
  database,
  db: database,
  
  // Pontos
  points,
  calculateUserPoints: points.calculateUserPoints,
  calculateLevel: points.calculateLevel,
  calculateGroupStats: points.calculateGroupStats,
  
  // Usuários
  users,
  
  // Igrejas
  churches,
  
  // Distritos
  districts,
  
  // Convites
  invites,
  INVITE_STATUS: invites.INVITE_STATUS,
  
  // Processador Excel
  excelProcessor,
  processExcel: excelProcessor.processExcel,
  extractChurches: excelProcessor.extractChurches,
  detectMemberType: excelProcessor.detectMemberType
};
