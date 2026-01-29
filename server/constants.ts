/**
 * @fileoverview Constantes centralizadas do servidor
 * @module server/constants
 *
 * Este arquivo contém todas as constantes e valores mágicos do servidor,
 * centralizados para facilitar manutenção e evitar valores hardcoded.
 */

// ============================================
// LIMITES E THRESHOLDS
// ============================================

/** Limites de paginação */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

/** Limites de upload de arquivos */
export const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES: 10,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
} as const;

/** Limites de rate limiting */
export const RATE_LIMITS = {
  /** Requisições gerais por janela */
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 100,
  },
  /** Login - mais restritivo */
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 5,
  },
  /** Upload de arquivos */
  UPLOAD: {
    WINDOW_MS: 60 * 1000, // 1 minuto
    MAX_REQUESTS: 10,
  },
} as const;

// ============================================
// CACHE TTLs (em segundos)
// ============================================

export const CACHE_TTL = {
  /** Distritos - raramente mudam */
  DISTRICTS: 600, // 10 minutos
  /** Igrejas - raramente mudam */
  CHURCHES: 600, // 10 minutos
  /** Dashboard stats - tolera delay */
  DASHBOARD: 300, // 5 minutos
  /** Lista de usuários */
  USERS: 120, // 2 minutos
  /** Lista de membros */
  MEMBERS: 120, // 2 minutos
  /** Perfil próprio - precisa ser atual */
  PROFILE: 30, // 30 segundos
  /** Configurações do sistema */
  SETTINGS: 3600, // 1 hora
} as const;

// ============================================
// JWT E AUTENTICAÇÃO
// ============================================

export const AUTH = {
  /** Tempo de expiração do token (em segundos) */
  TOKEN_EXPIRY: 3600, // 1 hora
  /** Tempo de expiração do refresh token (em segundos) */
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 3600, // 7 dias
  /** Algoritmo de hash para senhas */
  HASH_ALGORITHM: 'bcrypt',
  /** Rounds para bcrypt */
  BCRYPT_ROUNDS: 10,
  /** Tamanho mínimo de senha */
  MIN_PASSWORD_LENGTH: 8,
} as const;

// ============================================
// VALIDAÇÃO DE DADOS
// ============================================

export const VALIDATION = {
  /** Limites de texto */
  TEXT: {
    NAME_MIN: 2,
    NAME_MAX: 100,
    EMAIL_MAX: 255,
    PHONE_MAX: 20,
    ADDRESS_MAX: 500,
    DESCRIPTION_MAX: 2000,
    NOTES_MAX: 5000,
  },
  /** Limites de números */
  NUMBERS: {
    MIN_YEAR: 1900,
    MAX_YEAR: 2100,
    MIN_AGE: 0,
    MAX_AGE: 150,
  },
  /** Padrões regex */
  PATTERNS: {
    PHONE: /^\+?[\d\s\-()]+$/,
    CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/,
    CEP: /^\d{5}-?\d{3}$/,
  },
} as const;

// ============================================
// GAMIFICAÇÃO
// ============================================

export const GAMIFICATION = {
  /** Pontos por ação */
  POINTS: {
    ATTENDANCE: 10,
    TASK_COMPLETE: 5,
    GROUP_PARTICIPATION: 3,
    PRAYER_ANSWERED: 2,
    FIRST_ATTENDANCE_WEEK: 15,
    PROFILE_COMPLETE: 20,
    REFERRAL: 25,
  },
  /** Limites diários para evitar spam */
  DAILY_CAPS: {
    MAX_ATTENDANCE_POINTS: 30,
    MAX_TASK_POINTS: 50,
    MAX_TOTAL_POINTS: 100,
  },
  /** Níveis */
  LEVELS: [
    { level: 1, name: 'Iniciante', minPoints: 0 },
    { level: 2, name: 'Participante', minPoints: 50 },
    { level: 3, name: 'Engajado', minPoints: 150 },
    { level: 4, name: 'Dedicado', minPoints: 350 },
    { level: 5, name: 'Fiel', minPoints: 700 },
    { level: 6, name: 'Líder', minPoints: 1200 },
    { level: 7, name: 'Mestre', minPoints: 2000 },
  ],
} as const;

// ============================================
// AUDIT LOG
// ============================================

export const AUDIT = {
  /** Tamanho máximo do buffer em memória */
  MAX_BUFFER_SIZE: 1000,
  /** Campos sensíveis a sanitizar */
  SENSITIVE_FIELDS: ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv', 'ssn', 'cpf'],
} as const;

// ============================================
// HTTP STATUS CODES (para referência)
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// ROLES E PERMISSÕES
// ============================================

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  ADMIN_READONLY: 'admin_readonly',
  PASTOR: 'pastor',
  LEADER: 'leader',
  MEMBER: 'member',
} as const;

export const ROLE_HIERARCHY = [
  'superadmin',
  'admin',
  'admin_readonly',
  'pastor',
  'leader',
  'member',
] as const;

// ============================================
// DATABASE
// ============================================

export const DATABASE = {
  /** Pool de conexões */
  POOL: {
    MIN_CONNECTIONS: 2,
    MAX_CONNECTIONS: 10,
    IDLE_TIMEOUT_MS: 30000,
    CONNECTION_TIMEOUT_MS: 10000,
  },
  /** Retry para queries */
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 100,
    MAX_DELAY_MS: 5000,
  },
} as const;

// ============================================
// ENVIRONMENT
// ============================================

export const ENV = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
} as const;

export const isProduction = () => process.env.NODE_ENV === ENV.PRODUCTION;
export const isDevelopment = () => process.env.NODE_ENV === ENV.DEVELOPMENT;
export const isTest = () => process.env.NODE_ENV === ENV.TEST;
