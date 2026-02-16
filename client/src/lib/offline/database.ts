export { db } from './database-core';

export {
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
  saveRelationshipsOffline,
  getRelationshipsOffline,
  updateRelationshipOffline,
  savePrayersOffline,
  getPrayersOffline,
  updatePrayerOffline,
  saveMeetingsOffline,
  getMeetingsOffline,
  updateMeetingOffline,
  saveEmotionalCheckinsOffline,
  getEmotionalCheckinsOffline,
  saveDiscipleshipRequestsOffline,
  getDiscipleshipRequestsOffline,
  updateDiscipleshipRequestOffline,
  saveNotificationsOffline,
  getNotificationsOffline,
  updateNotificationOffline,
  saveMessagesOffline,
  getMessagesOffline,
} from './database-crud';

export {
  addToSyncQueue,
  getSyncQueue,
  getAllSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  getSyncQueueCount,
  getPendingSyncCount,
  recordConflict,
  getUnresolvedConflicts,
  resolveConflict,
} from './database-sync';

export {
  hasOfflinePermission,
  getLastSyncTime,
  setMeta,
  cleanExpiredData,
  clearAllOfflineData,
  getStorageUsage,
  getOfflineStats,
  verifyDatabaseIntegrity,
} from './database-utils';

export type {
  OfflineUser,
  OfflineEvent,
  OfflineTask,
  OfflineMessage,
  OfflineRelationship,
  OfflinePrayer,
  OfflineMeeting,
  OfflineEmotionalCheckin,
  OfflineDiscipleshipRequest,
  OfflineNotification,
  SyncQueueItem,
  OfflineMeta,
  ConflictRecord,
} from './database-types';

export type {
  TaskData,
  RelationshipData,
  PrayerData,
  MeetingData,
  EmotionalCheckinData,
  DiscipleshipRequestData,
  NotificationData,
} from './database-crud';
