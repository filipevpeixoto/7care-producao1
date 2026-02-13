/**
 * Tipos e interfaces para o banco de dados offline
 */

import type { User, Event, Message } from '@shared/schema';

export interface OfflineUser {
  id: number;
  data: string; // Dados criptografados
  checksum: string; // Hash dos dados originais para detecção de conflitos
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number; // Versão do registro para controle de conflitos
}

export interface OfflineEvent {
  id: number;
  data: string; // JSON string
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineTask {
  id: number;
  data: string;
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineMessage {
  id: number;
  conversationId: number;
  data: string; // Dados criptografados
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineRelationship {
  id: number;
  data: string; // JSON string com dados do relacionamento
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflinePrayer {
  id: number;
  data: string; // JSON string com dados do pedido de oração
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineMeeting {
  id: number;
  data: string; // JSON string com dados da reunião
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineEmotionalCheckin {
  id: number;
  userId: number;
  data: string; // JSON string com dados do check-in
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineDiscipleshipRequest {
  id: number;
  data: string; // JSON string com dados do pedido de discipulado
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineNotification {
  id: number;
  userId: number;
  data: string; // JSON string com dados da notificação
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface SyncQueueItem {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity:
    | 'users'
    | 'events'
    | 'tasks'
    | 'messages'
    | 'relationships'
    | 'prayers'
    | 'meetings'
    | 'emotional-checkins'
    | 'discipleship-requests'
    | 'notifications';
  entityId?: number;
  data: string;
  originalChecksum?: string; // Checksum dos dados originais (para detectar conflitos)
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  createdAt: number;
  retryCount: number;
  nextRetryAt?: number; // Timestamp para exponential backoff
  lastError?: string;
  priority: number; // Prioridade na fila (menor = maior prioridade)
}

export interface OfflineMeta {
  key: string;
  value: string;
  updatedAt: number;
}

export interface ConflictRecord {
  id?: number;
  entity: string;
  entityId: number;
  localData: string;
  serverData: string;
  localChecksum: string;
  serverChecksum: string;
  createdAt: number;
  resolvedAt?: number;
  resolution?: 'local' | 'server' | 'merged';
}

export interface TaskData {
  id: number;
  [key: string]: unknown;
}

export interface RelationshipData {
  id: number;
  discipuladorId: number;
  discipuloId: number;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PrayerData {
  id: number;
  userId: number;
  request: string;
  isAnswered: boolean;
  [key: string]: unknown;
}

export interface MeetingData {
  id: number;
  title: string;
  description?: string | null;
  type: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  [key: string]: unknown;
}

export interface EmotionalCheckinData {
  id: number;
  userId: number;
  mood: number;
  note?: string | null;
  createdAt: string;
  [key: string]: unknown;
}

export interface DiscipleshipRequestData {
  id: number;
  requesterId: number;
  targetId: number;
  status: string;
  [key: string]: unknown;
}

export interface NotificationData {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  [key: string]: unknown;
}

export interface SyncQueueInput {
  type: 'create' | 'update' | 'delete';
  entity: SyncQueueItem['entity'];
  entityId?: number;
  data: unknown;
  originalChecksum?: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  priority?: number;
}

export { User, Event, Message };
