/**
 * Repositories Index
 * Exporta todos os repositórios modulares
 */

export { UserRepository, userRepository } from './userRepository';
export { ChurchRepository, churchRepository } from './churchRepository';
export { EventRepository, eventRepository } from './eventRepository';
export { RelationshipRepository, relationshipRepository } from './relationshipRepository';
export { MeetingRepository, meetingRepository } from './meetingRepository';
export { PrayerRepository, prayerRepository } from './prayerRepository';
export { MessageRepository, messageRepository, ConversationRepository, conversationRepository } from './messageRepository';
export { PointsRepository, pointsRepository } from './pointsRepository';
export { SystemRepository, systemRepository } from './systemRepository';
export { createPaginatedResult, paginateArray } from './BaseRepository';
export type { PaginationOptions, PaginatedResult } from './BaseRepository';

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
};

export default repositories;
