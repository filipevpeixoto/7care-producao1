/**
 * Dependency Injection Container
 * Container centralizado para injeção de dependências
 *
 * Padrão Service Locator simples para projetos sem tsyringe
 * Permite troca de implementações para testes
 */

import { userRepository, UserRepository } from './repositories/userRepository';
import { churchRepository, ChurchRepository } from './repositories/churchRepository';
import { eventRepository, EventRepository } from './repositories/eventRepository';
import {
  relationshipRepository,
  RelationshipRepository,
} from './repositories/relationshipRepository';
import { meetingRepository, MeetingRepository } from './repositories/meetingRepository';
import { prayerRepository, PrayerRepository } from './repositories/prayerRepository';
import {
  messageRepository,
  MessageRepository,
  conversationRepository,
  ConversationRepository,
} from './repositories/messageRepository';
import { pointsRepository, PointsRepository } from './repositories/pointsRepository';
import { systemRepository, SystemRepository } from './repositories/systemRepository';
import { districtRepository, DistrictRepository } from './repositories/districtRepository';
import { electionRepository, ElectionRepository } from './repositories/electionRepository';
import { auditRepository, AuditRepository } from './repositories/auditRepository';
import { auditService, AuditService } from './services/auditService';
import { authService, AuthService } from './services/authService';
import { userService, UserService } from './services/userService';
import { cacheService, CacheService } from './services/cacheService';

/**
 * Tipos de serviços registrados
 */
export type ServiceType =
  | 'userRepository'
  | 'churchRepository'
  | 'eventRepository'
  | 'relationshipRepository'
  | 'meetingRepository'
  | 'prayerRepository'
  | 'messageRepository'
  | 'conversationRepository'
  | 'pointsRepository'
  | 'systemRepository'
  | 'districtRepository'
  | 'electionRepository'
  | 'auditRepository'
  | 'auditService'
  | 'authService'
  | 'userService'
  | 'cacheService';

/**
 * Mapa de tipos para instâncias
 */
interface ServiceMap {
  userRepository: UserRepository;
  churchRepository: ChurchRepository;
  eventRepository: EventRepository;
  relationshipRepository: RelationshipRepository;
  meetingRepository: MeetingRepository;
  prayerRepository: PrayerRepository;
  messageRepository: MessageRepository;
  conversationRepository: ConversationRepository;
  pointsRepository: PointsRepository;
  systemRepository: SystemRepository;
  districtRepository: DistrictRepository;
  electionRepository: ElectionRepository;
  auditRepository: AuditRepository;
  auditService: AuditService;
  authService: AuthService;
  userService: UserService;
  cacheService: CacheService;
}

/**
 * Container de Injeção de Dependências
 */
class DIContainer {
  private services: Map<string, unknown> = new Map();
  private factories: Map<string, () => unknown> = new Map();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Registra implementações padrão
   */
  private registerDefaults(): void {
    // Repositories
    this.register('userRepository', userRepository);
    this.register('churchRepository', churchRepository);
    this.register('eventRepository', eventRepository);
    this.register('relationshipRepository', relationshipRepository);
    this.register('meetingRepository', meetingRepository);
    this.register('prayerRepository', prayerRepository);
    this.register('messageRepository', messageRepository);
    this.register('conversationRepository', conversationRepository);
    this.register('pointsRepository', pointsRepository);
    this.register('systemRepository', systemRepository);
    this.register('districtRepository', districtRepository);
    this.register('electionRepository', electionRepository);
    this.register('auditRepository', auditRepository);

    // Services
    this.register('auditService', auditService);
    this.register('authService', authService);
    this.register('userService', userService);
    this.register('cacheService', cacheService);
  }

  /**
   * Registra um serviço
   */
  register<K extends keyof ServiceMap>(name: K, instance: ServiceMap[K]): void {
    this.services.set(name, instance);
  }

  /**
   * Registra uma factory para criação lazy
   */
  registerFactory<K extends keyof ServiceMap>(name: K, factory: () => ServiceMap[K]): void {
    this.factories.set(name, factory);
  }

  /**
   * Resolve um serviço
   */
  resolve<K extends keyof ServiceMap>(name: K): ServiceMap[K] {
    // Verifica se já tem uma instância
    if (this.services.has(name)) {
      return this.services.get(name) as ServiceMap[K];
    }

    // Verifica se tem uma factory
    if (this.factories.has(name)) {
      const factory = this.factories.get(name) as () => ServiceMap[K];
      const instance = factory();
      this.services.set(name, instance);
      return instance;
    }

    throw new Error(`Service '${name}' not registered in container`);
  }

  /**
   * Verifica se um serviço está registrado
   */
  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Remove um serviço (útil para testes)
   */
  unregister(name: string): void {
    this.services.delete(name);
    this.factories.delete(name);
  }

  /**
   * Reseta o container para o estado inicial
   */
  reset(): void {
    this.services.clear();
    this.factories.clear();
    this.registerDefaults();
  }

  /**
   * Cria um container filho com escopo isolado
   */
  createScope(): DIContainer {
    const scoped = new DIContainer();
    // Copia referências do container pai
    this.services.forEach((value, key) => {
      scoped.services.set(key, value);
    });
    this.factories.forEach((value, key) => {
      scoped.factories.set(key, value);
    });
    return scoped;
  }
}

// Instância singleton do container
export const container = new DIContainer();

// Atalhos para resolve comum
export const getRepository = <K extends keyof ServiceMap>(name: K) => container.resolve(name);
export const getService = <K extends keyof ServiceMap>(name: K) => container.resolve(name);

export default container;
