/**
 * Storage Index - Exporta todos os módulos de storage
 * 
 * A refatoração do NeonAdapter (3100+ linhas) foi dividida em:
 * - helpers.ts - Funções utilitárias e mappers de registros
 * - userStorage.ts - Operações CRUD de usuários (~170 linhas)
 * - churchStorage.ts - Operações CRUD de igrejas (~130 linhas)
 * - eventStorage.ts - Operações CRUD de eventos (~170 linhas)
 * - facade.ts - Facade para acesso unificado aos módulos
 * 
 * O NeonAdapter original ainda existe para compatibilidade,
 * mas os novos módulos podem ser usados diretamente.
 */

// Helpers e mappers
export * from './helpers';

// Módulos de domínio
export * as userStorage from './userStorage';
export * as churchStorage from './churchStorage';
export * as eventStorage from './eventStorage';

// Facade para acesso unificado
export { StorageFacade } from './facade';

// Re-exportar tipos úteis
export type { 
  CreateUserInput, 
  UpdateUserInput,
  CreateChurchInput,
  UpdateChurchInput,
  CreateEventInput,
  UpdateEventInput,
  CreateMeetingInput,
  UpdateMeetingInput,
  CreateMessageInput,
  UpdateMessageInput,
  CreateNotificationInput,
  UpdateNotificationInput,
  CreateRelationshipInput,
  CreateDiscipleshipRequestInput,
  UpdateDiscipleshipRequestInput,
  CreateEmotionalCheckInInput,
  CreateActivityInput,
  UpdateActivityInput,
  CreatePushSubscriptionInput,
  CreatePrayerInput,
  PointsConfiguration,
  EventPermissions,
  PointsCalculationResult,
  PointsRecalculationResult,
  PushSubscription,
  Activity,
  GoogleDriveConfig,
  Prayer,
  EmotionalCheckIn
} from '../types/storage';
