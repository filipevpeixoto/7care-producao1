/**
 * Repositories Index
 * Exporta todos os repositórios modulares
 */

export { UserRepository, userRepository } from './userRepository';
export { ChurchRepository, churchRepository } from './churchRepository';
export { EventRepository, eventRepository } from './eventRepository';

// Re-export default instances
export default {
  users: require('./userRepository').userRepository,
  churches: require('./churchRepository').churchRepository,
  events: require('./eventRepository').eventRepository,
};
