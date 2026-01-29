/**
 * Storage Interface Types
 * Tipos TypeScript para o NeonAdapter e interface IStorage
 */

import {
  User,
  Church,
  Event,
  Meeting,
  Message,
  Conversation,
  Notification,
  Achievement,
  PointActivity,
  Relationship,
  DiscipleshipRequest,
  MissionaryProfile,
  MeetingType,
} from '../../shared/schema';

// Tipos de entrada (sem id e timestamps automáticos)
export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt'>>;

export type CreateChurchInput = Omit<Church, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateChurchInput = Partial<Omit<Church, 'id' | 'createdAt'>>;

export type CreateEventInput = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEventInput = Partial<Omit<Event, 'id' | 'createdAt'>>;

export type CreateMeetingInput = Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMeetingInput = Partial<Omit<Meeting, 'id' | 'createdAt'>>;

export type CreateMessageInput = Omit<Message, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMessageInput = Partial<Omit<Message, 'id' | 'createdAt'>>;

export type CreateNotificationInput = Omit<Notification, 'id' | 'createdAt'>;
export type UpdateNotificationInput = Partial<Omit<Notification, 'id' | 'createdAt'>>;

export type CreateRelationshipInput = Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateRelationshipInput = Partial<Omit<Relationship, 'id' | 'createdAt'>>;

export type CreateDiscipleshipRequestInput = Omit<
  DiscipleshipRequest,
  'id' | 'createdAt' | 'updatedAt'
> & {
  requestedMissionaryId?: number | null;
};
export type UpdateDiscipleshipRequestInput = Partial<Omit<DiscipleshipRequest, 'id' | 'createdAt'>>;

// Tipos para check-in emocional
export interface EmotionalCheckIn {
  id: number;
  userId: number;
  emotionalScore: number | null;
  mood: string | null;
  prayerRequest: string | null;
  isPrivate: boolean;
  allowChurchMembers: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateEmotionalCheckInInput = Omit<EmotionalCheckIn, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEmotionalCheckInInput = Partial<Omit<EmotionalCheckIn, 'id' | 'createdAt'>>;

// Tipos para orações
export interface Prayer {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  isAnswered: boolean;
  answeredAt: string | null;
  testimony: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreatePrayerInput = Omit<
  Prayer,
  'id' | 'createdAt' | 'updatedAt' | 'isAnswered' | 'answeredAt' | 'testimony'
>;

// Tipos para push subscriptions
export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscription {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deviceName?: string | null;
}

export type CreatePushSubscriptionInput = {
  userId: number;
  subscription: PushSubscriptionPayload;
  deviceName?: string | null;
  isActive?: boolean;
};

// Tipos para atividades
export interface Activity {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  date?: string | null;
  active: boolean;
  order: number;
}

export type CreateActivityInput = Omit<Activity, 'id'>;
export type UpdateActivityInput = Partial<Omit<Activity, 'id'>>;

// Tipos para configuração de pontos
export interface PointsConfigurationActivity {
  id: string;
  name: string;
  points: number;
  category: string;
}

export interface PointsConfigurationLevel {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number;
}

export interface PointsConfiguration {
  basicPoints?: number;
  attendancePoints?: number;
  eventPoints?: number;
  donationPoints?: number;
  activities?: PointsConfigurationActivity[];
  levels?: PointsConfigurationLevel[];
  engajamento?: {
    baixo: number;
    medio: number;
    alto: number;
  };
  classificacao?: {
    frequente: number;
    naoFrequente: number;
  };
  dizimista?: {
    naoDizimista: number;
    pontual: number;
    sazonal: number;
    recorrente: number;
  };
  ofertante?: {
    naoOfertante: number;
    pontual: number;
    sazonal: number;
    recorrente: number;
  };
  tempoBatismo?: {
    doisAnos: number;
    cincoAnos: number;
    dezAnos: number;
    vinteAnos: number;
    maisVinte: number;
  };
  cargos?: {
    umCargo: number;
    doisCargos: number;
    tresOuMais: number;
  };
  nomeUnidade?: {
    comUnidade: number;
    semUnidade: number;
  };
  temLicao?: {
    comLicao: number;
  };
  pontuacaoDinamica?: {
    multiplicador: number;
  };
  totalPresenca?: {
    zeroATres: number;
    quatroASete: number;
    oitoATreze: number;
  };
  presenca?: {
    multiplicador: number;
  };
  escolaSabatina?: {
    comunhao: number;
    missao: number;
    estudoBiblico: number;
    batizouAlguem: number;
    discipuladoPosBatismo: number;
  };
  batizouAlguem?: {
    sim: number;
    nao: number;
  };
  discipuladoPosBatismo?: {
    multiplicador: number;
  };
  cpfValido?: {
    valido: number;
    invalido: number;
  };
  camposVaziosACMS?: {
    completos: number;
    incompletos: number;
  };
}

/**
 * Interface com todos os campos obrigatórios para cálculo de pontos
 * Use getRequiredPointsConfig() para converter PointsConfiguration
 */
export interface RequiredPointsConfiguration {
  basicPoints: number;
  attendancePoints: number;
  eventPoints: number;
  donationPoints: number;
  engajamento: {
    baixo: number;
    medio: number;
    alto: number;
  };
  classificacao: {
    frequente: number;
    naoFrequente: number;
  };
  dizimista: {
    naoDizimista: number;
    pontual: number;
    sazonal: number;
    recorrente: number;
  };
  ofertante: {
    naoOfertante: number;
    pontual: number;
    sazonal: number;
    recorrente: number;
  };
  tempoBatismo: {
    doisAnos: number;
    cincoAnos: number;
    dezAnos: number;
    vinteAnos: number;
    maisVinte: number;
  };
  cargos: {
    umCargo: number;
    doisCargos: number;
    tresOuMais: number;
  };
  nomeUnidade: {
    comUnidade: number;
    semUnidade: number;
  };
  temLicao: {
    comLicao: number;
  };
  pontuacaoDinamica: {
    multiplicador: number;
  };
  totalPresenca: {
    zeroATres: number;
    quatroASete: number;
    oitoATreze: number;
  };
  presenca: {
    multiplicador: number;
  };
  escolaSabatina: {
    comunhao: number;
    missao: number;
    estudoBiblico: number;
    batizouAlguem: number;
    discipuladoPosBatismo: number;
  };
  batizouAlguem: {
    sim: number;
    nao: number;
  };
  discipuladoPosBatismo: {
    multiplicador: number;
  };
  cpfValido: {
    valido: number;
    invalido: number;
  };
  camposVaziosACMS: {
    completos: number;
    incompletos: number;
  };
}

/**
 * Valores padrão para configuração de pontos
 */
export const DEFAULT_POINTS_CONFIG: RequiredPointsConfiguration = {
  basicPoints: 25,
  attendancePoints: 25,
  eventPoints: 50,
  donationPoints: 75,
  engajamento: { baixo: 25, medio: 50, alto: 75 },
  classificacao: { frequente: 75, naoFrequente: 25 },
  dizimista: { naoDizimista: 0, pontual: 50, sazonal: 75, recorrente: 100 },
  ofertante: { naoOfertante: 0, pontual: 50, sazonal: 75, recorrente: 100 },
  tempoBatismo: { doisAnos: 50, cincoAnos: 75, dezAnos: 100, vinteAnos: 150, maisVinte: 200 },
  cargos: { umCargo: 50, doisCargos: 75, tresOuMais: 100 },
  nomeUnidade: { comUnidade: 50, semUnidade: 0 },
  temLicao: { comLicao: 50 },
  pontuacaoDinamica: { multiplicador: 1 },
  totalPresenca: { zeroATres: 25, quatroASete: 50, oitoATreze: 100 },
  presenca: { multiplicador: 1 },
  escolaSabatina: {
    comunhao: 25,
    missao: 25,
    estudoBiblico: 25,
    batizouAlguem: 50,
    discipuladoPosBatismo: 25,
  },
  batizouAlguem: { sim: 100, nao: 0 },
  discipuladoPosBatismo: { multiplicador: 1 },
  cpfValido: { valido: 25, invalido: 0 },
  camposVaziosACMS: { completos: 50, incompletos: 0 },
};

/**
 * Converte PointsConfiguration para RequiredPointsConfiguration
 * Preenche valores faltantes com defaults
 */
export function getRequiredPointsConfig(config: PointsConfiguration): RequiredPointsConfiguration {
  return {
    basicPoints: config.basicPoints ?? DEFAULT_POINTS_CONFIG.basicPoints,
    attendancePoints: config.attendancePoints ?? DEFAULT_POINTS_CONFIG.attendancePoints,
    eventPoints: config.eventPoints ?? DEFAULT_POINTS_CONFIG.eventPoints,
    donationPoints: config.donationPoints ?? DEFAULT_POINTS_CONFIG.donationPoints,
    engajamento: config.engajamento ?? DEFAULT_POINTS_CONFIG.engajamento,
    classificacao: config.classificacao ?? DEFAULT_POINTS_CONFIG.classificacao,
    dizimista: config.dizimista ?? DEFAULT_POINTS_CONFIG.dizimista,
    ofertante: config.ofertante ?? DEFAULT_POINTS_CONFIG.ofertante,
    tempoBatismo: config.tempoBatismo ?? DEFAULT_POINTS_CONFIG.tempoBatismo,
    cargos: config.cargos ?? DEFAULT_POINTS_CONFIG.cargos,
    nomeUnidade: config.nomeUnidade ?? DEFAULT_POINTS_CONFIG.nomeUnidade,
    temLicao: config.temLicao ?? DEFAULT_POINTS_CONFIG.temLicao,
    pontuacaoDinamica: config.pontuacaoDinamica ?? DEFAULT_POINTS_CONFIG.pontuacaoDinamica,
    totalPresenca: config.totalPresenca ?? DEFAULT_POINTS_CONFIG.totalPresenca,
    presenca: config.presenca ?? DEFAULT_POINTS_CONFIG.presenca,
    escolaSabatina: config.escolaSabatina ?? DEFAULT_POINTS_CONFIG.escolaSabatina,
    batizouAlguem: config.batizouAlguem ?? DEFAULT_POINTS_CONFIG.batizouAlguem,
    discipuladoPosBatismo:
      config.discipuladoPosBatismo ?? DEFAULT_POINTS_CONFIG.discipuladoPosBatismo,
    cpfValido: config.cpfValido ?? DEFAULT_POINTS_CONFIG.cpfValido,
    camposVaziosACMS: config.camposVaziosACMS ?? DEFAULT_POINTS_CONFIG.camposVaziosACMS,
  };
}

// Tipos para configuração do Google Drive
export interface GoogleDriveConfig {
  spreadsheetUrl: string;
  sheetName: string;
  apiKey: string;
  updatedAt: string;
}

// Tipos para configuração de eventos
export interface EventPermissions {
  [key: string]: boolean | string[] | Record<string, boolean>;
}

// Tipo para resultado de cálculo de pontos
export interface PointsCalculationResult {
  success: boolean;
  points?: number;
  breakdown?: Record<string, number>;
  level?: string;
  details?: Record<string, unknown>;
  message?: string;
  error?: string;
  userData?: Record<string, unknown>;
}
export interface PointsRecalculationResult {
  success: boolean;
  message?: string;
  updatedUsers?: number;
  totalUsers?: number;
  errors?: number;
  error?: string;
  results?: Record<string, unknown>[];
  details?: Record<string, unknown>;
}

/**
 * Interface completa do Storage
 * Define todos os métodos disponíveis para acesso ao banco de dados
 */
export interface IStorage {
  // ===== USUÁRIOS =====
  getAllUsers(): Promise<User[]>;
  getVisitedUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(userData: CreateUserInput): Promise<User>;
  updateUser(id: number, updates: UpdateUserInput): Promise<User | null>;
  updateUserDirectly(id: number, updates: UpdateUserInput): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;
  approveUser(id: number): Promise<User | null>;
  rejectUser(id: number): Promise<User | null>;
  updateUserChurch(userId: number, churchName: string): Promise<boolean>;
  getUserDetailedData(userId: number): Promise<User | null>;
  calculateUserPoints(userId: number): Promise<PointsCalculationResult>;

  // ===== IGREJAS =====
  getAllChurches(): Promise<Church[]>;
  getChurchById(id: number): Promise<Church | null>;
  createChurch(churchData: CreateChurchInput): Promise<Church>;
  updateChurch(id: number, updates: UpdateChurchInput): Promise<Church | null>;
  deleteChurch(id: number): Promise<boolean>;
  getDefaultChurch(): Promise<Church | null>;
  setDefaultChurch(churchId: number): Promise<boolean>;
  getOrCreateChurch(churchName: string): Promise<Church>;

  // ===== EVENTOS =====
  getAllEvents(): Promise<Event[]>;
  getEventById(id: number): Promise<Event | null>;
  createEvent(eventData: CreateEventInput): Promise<Event>;
  updateEvent(id: number, updates: UpdateEventInput): Promise<Event | null>;
  deleteEvent(id: number): Promise<boolean>;
  clearAllEvents(): Promise<boolean>;

  // ===== REUNIÕES =====
  getAllMeetings(): Promise<Meeting[]>;
  getMeetingById(id: number): Promise<Meeting | null>;
  getMeetingsByUserId(userId: number): Promise<Meeting[]>;
  getMeetingsByStatus(status: string): Promise<Meeting[]>;
  createMeeting(meetingData: CreateMeetingInput): Promise<Meeting>;
  updateMeeting(id: number, updates: UpdateMeetingInput): Promise<Meeting | null>;
  deleteMeeting(id: number): Promise<boolean>;
  getMeetingTypes(): Promise<MeetingType[]>;

  // ===== RELACIONAMENTOS =====
  getAllRelationships(): Promise<Relationship[]>;
  getRelationshipById(id: number): Promise<Relationship | null>;
  getRelationshipsByMissionary(missionaryId: number): Promise<Relationship[]>;
  getRelationshipsByInterested(interestedId: number): Promise<Relationship[]>;
  createRelationship(data: CreateRelationshipInput): Promise<Relationship>;
  deleteRelationship(id: number): Promise<boolean>;
  deleteRelationshipByInterested(interestedId: number): Promise<boolean>;

  // ===== DISCIPULADO =====
  getAllDiscipleshipRequests(): Promise<DiscipleshipRequest[]>;
  getDiscipleshipRequestById(id: number): Promise<DiscipleshipRequest | null>;
  createDiscipleshipRequest(data: CreateDiscipleshipRequestInput): Promise<DiscipleshipRequest>;
  updateDiscipleshipRequest(
    id: number,
    updates: UpdateDiscipleshipRequestInput
  ): Promise<DiscipleshipRequest | null>;
  deleteDiscipleshipRequest(id: number): Promise<boolean>;

  // ===== MENSAGENS =====
  getAllMessages(): Promise<Message[]>;
  getMessageById(id: number): Promise<Message | null>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(data: CreateMessageInput): Promise<Message>;
  updateMessage(id: number, updates: UpdateMessageInput): Promise<Message | null>;
  deleteMessage(id: number): Promise<boolean>;

  // ===== CONVERSAS =====
  getAllConversations(): Promise<Conversation[]>;
  getConversationById(id: number): Promise<Conversation | null>;
  getConversationsByUser(userId: number): Promise<Conversation[]>;
  getOrCreateDirectConversation(userId1: number, userId2: number): Promise<Conversation>;
  createConversation(data: Partial<Conversation>): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | null>;
  deleteConversation(id: number): Promise<boolean>;

  // ===== NOTIFICAÇÕES =====
  getAllNotifications(): Promise<Notification[]>;
  getNotificationById(id: number): Promise<Notification | null>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(data: CreateNotificationInput): Promise<Notification>;
  updateNotification(id: number, updates: UpdateNotificationInput): Promise<Notification | null>;
  markNotificationAsRead(id: number): Promise<Notification | null>;
  deleteNotification(id: number): Promise<boolean>;

  // ===== PUSH SUBSCRIPTIONS =====
  getPushSubscriptionsByUser(userId: number): Promise<PushSubscription[]>;
  createPushSubscription(data: CreatePushSubscriptionInput): Promise<PushSubscription>;
  togglePushSubscription(id: number): Promise<PushSubscription | null>;
  deletePushSubscription(id: number): Promise<boolean>;
  sendPushNotifications(data: {
    userIds: number[];
    title: string;
    body: string;
    icon?: string;
    url?: string;
  }): Promise<{ sent: number; failed: number }>;

  // ===== ORAÇÕES =====
  getAllPrayers(): Promise<Prayer[]>;
  getPrayerById(id: number): Promise<Prayer | null>;
  createPrayer(data: CreatePrayerInput): Promise<Prayer>;
  markPrayerAsAnswered(id: number, testimony?: string): Promise<Prayer | null>;
  deletePrayer(id: number): Promise<boolean>;
  addIntercessor(
    prayerId: number,
    intercessorId: number
  ): Promise<{ prayerId: number; intercessorId: number }>;
  removeIntercessor(prayerId: number, intercessorId: number): Promise<boolean>;
  getIntercessorsByPrayer(prayerId: number): Promise<User[]>;
  getPrayersUserIsInterceding(userId: number): Promise<Prayer[]>;

  // ===== CHECK-IN EMOCIONAL =====
  createEmotionalCheckIn(data: CreateEmotionalCheckInInput): Promise<EmotionalCheckIn>;
  getEmotionalCheckInsForAdmin(): Promise<EmotionalCheckIn[]>;
  getEmotionalCheckInsByUser(userId: number): Promise<EmotionalCheckIn[]>;

  // ===== PERFIS DE MISSIONÁRIO =====
  getAllMissionaryProfiles(): Promise<MissionaryProfile[]>;
  getMissionaryProfileById(id: number): Promise<MissionaryProfile | null>;
  getMissionaryProfileByUserId(userId: number): Promise<MissionaryProfile | null>;
  createMissionaryProfile(data: Partial<MissionaryProfile>): Promise<MissionaryProfile>;
  updateMissionaryProfile(
    id: number,
    updates: Partial<MissionaryProfile>
  ): Promise<MissionaryProfile | null>;
  deleteMissionaryProfile(id: number): Promise<boolean>;
  getUsersWithMissionaryProfile(): Promise<User[]>;

  // ===== CONQUISTAS E PONTOS =====
  getAllAchievements(): Promise<Achievement[]>;
  getAchievementById(id: number): Promise<Achievement | null>;
  createAchievement(data: Partial<Achievement>): Promise<Achievement>;
  updateAchievement(id: number, updates: Partial<Achievement>): Promise<Achievement | null>;
  deleteAchievement(id: number): Promise<boolean>;
  getAllPointActivities(): Promise<PointActivity[]>;
  createPointActivity(data: Partial<PointActivity>): Promise<PointActivity>;

  // ===== ATIVIDADES =====
  getAllActivities(): Promise<Activity[]>;
  createActivity(data: CreateActivityInput): Promise<Activity>;
  updateActivity(id: number, updates: UpdateActivityInput): Promise<Activity | null>;
  deleteActivity(id: number): Promise<boolean>;

  // ===== CONFIGURAÇÕES DO SISTEMA =====
  getPointsConfiguration(): Promise<PointsConfiguration>;
  savePointsConfiguration(config: PointsConfiguration): Promise<void>;
  resetPointsConfiguration(): Promise<void>;
  getEventPermissions(): Promise<EventPermissions | null>;
  saveEventPermissions(permissions: EventPermissions): Promise<void>;
  getSystemConfig(key: string): Promise<unknown | null>;
  saveSystemConfig(key: string, value: unknown): Promise<void>;
  saveSystemLogo(logoUrl: string): Promise<void>;
  getSystemLogo(): Promise<string | null>;
  clearSystemLogo(): Promise<void>;
  getGoogleDriveConfig(): Promise<GoogleDriveConfig | null>;
  saveGoogleDriveConfig(config: GoogleDriveConfig): Promise<void>;

  // ===== UTILITÁRIOS =====
  clearAllData(): Promise<void>;
  calculateAdvancedUserPoints(): Promise<PointsRecalculationResult>;
}
