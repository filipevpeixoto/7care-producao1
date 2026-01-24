/**
 * NeonAdapter Refatorado
 * 
 * Este arquivo mantém a compatibilidade com o NeonAdapter original,
 * mas delega operações para módulos especializados.
 * 
 * Estrutura de módulos:
 * - storage/helpers.ts - Funções utilitárias e mappers
 * - storage/userStorage.ts - Operações de usuários
 * - storage/churchStorage.ts - Operações de igrejas
 * - storage/eventStorage.ts - Operações de eventos
 * 
 * O NeonAdapter original ainda é usado para funcionalidades
 * que ainda não foram migradas (meetings, messages, etc.)
 */

import * as userStorage from './userStorage';
import * as churchStorage from './churchStorage';
import * as eventStorage from './eventStorage';
import {
  toUser,
  toPermissionUser,
  mapChurchRecord,
  mapRelationshipRecord,
  mapMeetingRecord,
  mapMeetingTypeRecord,
  mapMessageRecord,
  mapNotificationRecord,
  mapAchievementRecord,
  mapPointActivityRecord,
  mapDiscipleshipRequestRecord,
  mapEmotionalCheckInRecord,
  mapMissionaryProfileRecord,
  mapPushSubscriptionRecord,
  mapPrayerRecord,
  toDateString,
  toOptionalDateString,
  normalizeExtraData,
  getActivitiesFromConfig
} from './helpers';

// Re-exportar os módulos para uso direto
export {
  userStorage,
  churchStorage,
  eventStorage
};

// Re-exportar helpers para uso em outros lugares
export {
  toUser,
  toPermissionUser,
  mapChurchRecord,
  mapRelationshipRecord,
  mapMeetingRecord,
  mapMeetingTypeRecord,
  mapMessageRecord,
  mapNotificationRecord,
  mapAchievementRecord,
  mapPointActivityRecord,
  mapDiscipleshipRequestRecord,
  mapEmotionalCheckInRecord,
  mapMissionaryProfileRecord,
  mapPushSubscriptionRecord,
  mapPrayerRecord,
  toDateString,
  toOptionalDateString,
  normalizeExtraData,
  getActivitiesFromConfig
};

/**
 * Facade para o NeonAdapter usando os novos módulos
 * Pode ser usado como alternativa ao NeonAdapter original
 */
export const StorageFacade = {
  // Usuários
  getAllUsers: userStorage.getAllUsers,
  getUserById: userStorage.getUserById,
  getUserByEmail: userStorage.getUserByEmail,
  createUser: userStorage.createUser,
  updateUser: userStorage.updateUser,
  deleteUser: userStorage.deleteUser,
  approveUser: userStorage.approveUser,
  rejectUser: userStorage.rejectUser,
  getVisitedUsers: userStorage.getVisitedUsers,
  updateUserChurch: userStorage.updateUserChurch,
  getUserDetailedData: userStorage.getUserDetailedData,
  
  // Igrejas
  getAllChurches: churchStorage.getAllChurches,
  getChurchById: churchStorage.getChurchById,
  createChurch: churchStorage.createChurch,
  updateChurch: churchStorage.updateChurch,
  deleteChurch: churchStorage.deleteChurch,
  getOrCreateChurch: churchStorage.getOrCreateChurch,
  getChurchesByDistrict: churchStorage.getChurchesByDistrict,
  getDefaultChurch: churchStorage.getDefaultChurch,
  setDefaultChurch: churchStorage.setDefaultChurch,
  
  // Eventos
  getAllEvents: eventStorage.getAllEvents,
  getEventById: eventStorage.getEventById,
  createEvent: eventStorage.createEvent,
  updateEvent: eventStorage.updateEvent,
  deleteEvent: eventStorage.deleteEvent,
  clearAllEvents: eventStorage.clearAllEvents
};
