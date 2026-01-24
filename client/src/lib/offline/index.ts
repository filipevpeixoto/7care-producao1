/**
 * Módulo principal de offline
 * Exporta todas as funcionalidades
 */

// Database
export {
  db,
  saveUsersOffline,
  getUsersOffline,
  saveCurrentUserOffline,
  getCurrentUserOffline,
  updateUserOffline,
  saveEventsOffline,
  getEventsOffline,
  updateEventOffline,
  saveTasksOffline,
  getTasksOffline,
  updateTaskOffline,
  saveMessagesOffline,
  getMessagesOffline,
  addToSyncQueue,
  getSyncQueue,
  getAllSyncQueue,
  getSyncQueueCount,
  getPendingSyncCount,
  cleanExpiredData,
  clearAllOfflineData,
  getStorageUsage,
  getLastSyncTime,
  setMeta,
  hasOfflinePermission,
  // Conflict resolution
  recordConflict,
  getUnresolvedConflicts,
  resolveConflict,
  // Stats
  getOfflineStats,
  verifyDatabaseIntegrity,
} from './database';

// Sync Manager
export {
  processQueue,
  forceSync,
  setupAutoSync,
  teardownAutoSync,
  addSyncListener,
  getSyncStatus,
  getSyncProgress,
  pauseSync,
  resumeSync,
  isSyncInProgress,
  isSyncPaused,
  syncItem,
  getSyncStats,
  clearFailedItems,
} from './syncManager';

// Crypto
export {
  encryptData,
  decryptData,
  isCryptoAvailable,
  clearEncryptionKey,
  rotateKey,
  getKeyVersion,
  hasValidKey,
  hashData,
} from './crypto';

// Offline Fetch
export {
  offlineFetch,
  enableGlobalOfflineFetch,
  disableGlobalOfflineFetch,
  isOfflineFetchEnabled,
  setOfflineUserRole,
  getOfflineUserRole,
  hasOfflineAccess,
  cacheCurrentUser,
  getCachedCurrentUser,
  clearCacheTimestamps,
} from './offlineFetch';

// Prepare Offline
export {
  prepareForOffline,
  getOfflineDataStatus,
} from './prepareOffline';

// Tipos
export type {
  SyncQueueItem,
  OfflineUser,
  OfflineEvent,
  OfflineTask,
  OfflineMessage,
  ConflictRecord,
  TaskData,
} from './database';

export type {
  SyncStatus,
  SyncProgress,
  SyncResult,
} from './syncManager';

export type {
  PrepareOfflineProgress,
  ProgressCallback,
} from './prepareOffline';

// Debug e diagnóstico
export { testOfflineData } from './testOfflineData';

// Configurações
export const OFFLINE_CONFIG = {
  TTL_DAYS: 7,
  MAX_STORAGE_MB: 50,
  SYNC_INTERVAL_MS: 30000, // 30 segundos
  MAX_RETRIES: 5,
  BASE_RETRY_DELAY_MS: 1000,
  ALLOWED_OFFLINE_ROLES: ['superadmin', 'pastor', 'admin_readonly'] as const,
} as const;

/**
 * Verifica se o usuário tem permissão para dados offline completos
 */
export function canAccessFullOfflineData(role: string): boolean {
  return OFFLINE_CONFIG.ALLOWED_OFFLINE_ROLES.includes(
    role as (typeof OFFLINE_CONFIG.ALLOWED_OFFLINE_ROLES)[number]
  );
}
