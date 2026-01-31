/**
 * Repositories Index
 * Exporta todos os repositórios modulares
 */

import { userRepository } from './userRepository';
import { churchRepository } from './churchRepository';
import { eventRepository } from './eventRepository';
import { relationshipRepository } from './relationshipRepository';
import { meetingRepository } from './meetingRepository';
import { prayerRepository } from './prayerRepository';
import { messageRepository, conversationRepository } from './messageRepository';
import { pointsRepository } from './pointsRepository';
import { systemRepository } from './systemRepository';
import { districtRepository } from './districtRepository';
import { electionRepository } from './electionRepository';
import { auditRepository } from './auditRepository';
import { notificationRepository } from './notificationRepository';
import { pushSubscriptionRepository } from './pushSubscriptionRepository';
import { achievementRepository } from './achievementRepository';

export { UserRepository, userRepository } from './userRepository';
export { ChurchRepository, churchRepository } from './churchRepository';
export { EventRepository, eventRepository } from './eventRepository';
export { RelationshipRepository, relationshipRepository } from './relationshipRepository';
export { MeetingRepository, meetingRepository } from './meetingRepository';
export { PrayerRepository, prayerRepository } from './prayerRepository';
export {
  MessageRepository,
  messageRepository,
  ConversationRepository,
  conversationRepository,
} from './messageRepository';
export { PointsRepository, pointsRepository } from './pointsRepository';
export { SystemRepository, systemRepository } from './systemRepository';
export { DistrictRepository, districtRepository } from './districtRepository';
export { ElectionRepository, electionRepository } from './electionRepository';
export { AuditRepository, auditRepository } from './auditRepository';
export { NotificationRepository, notificationRepository } from './notificationRepository';
export {
  PushSubscriptionRepository,
  pushSubscriptionRepository,
} from './pushSubscriptionRepository';
export { AchievementRepository, achievementRepository } from './achievementRepository';
export { createPaginatedResult, paginateArray } from './BaseRepository';
export type { PaginationOptions, PaginatedResult } from './BaseRepository';

// Interfaces
export * from './interfaces/IRepository';

// Objeto consolidado com todos os repositories
export const repositories = {
  users: userRepository,
  churches: churchRepository,
  events: eventRepository,
  relationships: relationshipRepository,
  meetings: meetingRepository,
  prayers: prayerRepository,
  messages: messageRepository,
  conversations: conversationRepository,
  points: pointsRepository,
  system: systemRepository,
  districts: districtRepository,
  elections: electionRepository,
  audit: auditRepository,
  notifications: notificationRepository,
  pushSubscriptions: pushSubscriptionRepository,
  achievements: achievementRepository,
};

export default repositories;
