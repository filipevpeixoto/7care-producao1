import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  varchar,
  date,
  index,
} from 'drizzle-orm/pg-core';

// Tabela de distritos
// Nota: pastorId não tem foreign key para evitar referência circular
export const districts = pgTable(
  'districts',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    pastorId: integer('pastor_id'), // Referência ao usuário pastor (sem FK para evitar circular)
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    // Índices para otimização de queries
    nameIdx: index('districts_name_idx').on(table.name),
    pastorIdx: index('districts_pastor_idx').on(table.pastorId),
  })
);

// Tabela de usuários
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role').notNull().default('member'),
    church: text('church'),
    churchCode: text('church_code'),
    districtId: integer('district_id').references(() => districts.id),
    departments: text('departments'),
    birthDate: date('birth_date'),
    civilStatus: text('civil_status'),
    occupation: text('occupation'),
    education: text('education'),
    address: text('address'),
    baptismDate: date('baptism_date'),
    previousReligion: text('previous_religion'),
    biblicalInstructor: text('biblical_instructor'),
    interestedSituation: text('interested_situation'),
    isDonor: boolean('is_donor').default(false),
    isTither: boolean('is_tither').default(false),
    isApproved: boolean('is_approved').default(false),
    points: integer('points').default(0),
    level: text('level').default('Iniciante'),
    attendance: integer('attendance').default(0),
    extraData: jsonb('extra_data'),

    // Campos para cálculo de pontos (movidos de extra_data)
    engajamento: text('engajamento'), // 'Baixo', 'Médio', 'Alto'
    classificacao: text('classificacao'), // 'Frequente', 'Não Frequente'
    dizimistaType: text('dizimista_type'), // 'Não dizimista', 'Pontual (1-3)', 'Sazonal (4-7)', 'Recorrente (8-12)'
    ofertanteType: text('ofertante_type'), // 'Não ofertante', 'Pontual (1-3)', 'Sazonal (4-7)', 'Recorrente (8-12)'
    tempoBatismoAnos: integer('tempo_batismo_anos'), // Anos de batismo (numérico)
    departamentosCargos: text('departamentos_cargos'), // Lista de departamentos e cargos separados por ';'
    nomeUnidade: text('nome_unidade'), // Nome da unidade/grupo pequeno
    temLicao: boolean('tem_licao').default(false), // Tem lição da Escola Sabatina
    totalPresenca: integer('total_presenca').default(0), // Total de presenças (0-13)
    comunhao: integer('comunhao').default(0), // Pontuação comunhão (0-13)
    missao: integer('missao').default(0), // Pontuação missão (0-13)
    estudoBiblico: integer('estudo_biblico').default(0), // Pontuação estudo bíblico (0-13)
    batizouAlguem: boolean('batizou_alguem').default(false), // Batizou alguém
    discPosBatismal: integer('disc_pos_batismal').default(0), // Quantidade de discipulados pós-batismo
    cpfValido: boolean('cpf_valido').default(false), // CPF válido
    camposVazios: boolean('campos_vazios').default(true), // Tem campos vazios no ACMS

    observations: text('observations'),
    firstAccess: boolean('first_access').default(true),
    status: text('status').default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    // Índices para otimização de queries frequentes
    nameIdx: index('users_name_idx').on(table.name),
    roleIdx: index('users_role_idx').on(table.role),
    churchIdx: index('users_church_idx').on(table.church),
    churchCodeIdx: index('users_church_code_idx').on(table.churchCode),
    districtIdx: index('users_district_idx').on(table.districtId),
    statusIdx: index('users_status_idx').on(table.status),
    pointsIdx: index('users_points_idx').on(table.points),
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  })
);

// Tabela de igrejas
export const churches = pgTable(
  'churches',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: varchar('code', { length: 10 }).notNull().unique(),
    address: text('address'),
    email: text('email'),
    phone: text('phone'),
    pastor: text('pastor'),
    districtId: integer('district_id').references(() => districts.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    nameIdx: index('churches_name_idx').on(table.name),
    districtIdx: index('churches_district_idx').on(table.districtId),
  })
);

// Tabela de eventos
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    date: timestamp('date').notNull(),
    endDate: timestamp('end_date'),
    location: text('location'),
    type: text('type').notNull(),
    color: text('color'),
    capacity: integer('capacity'),
    isRecurring: boolean('is_recurring').default(false),
    recurrencePattern: text('recurrence_pattern'),
    createdBy: integer('created_by').references(() => users.id),
    churchId: integer('church_id').references(() => churches.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    dateIdx: index('events_date_idx').on(table.date),
    typeIdx: index('events_type_idx').on(table.type),
    churchIdx: index('events_church_idx').on(table.churchId),
    createdByIdx: index('events_created_by_idx').on(table.createdBy),
  })
);

// Tabela de relacionamentos
export const relationships = pgTable(
  'relationships',
  {
    id: serial('id').primaryKey(),
    interestedId: integer('interested_id').references(() => users.id),
    missionaryId: integer('missionary_id').references(() => users.id),
    status: text('status').default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    interestedIdx: index('relationships_interested_idx').on(table.interestedId),
    missionaryIdx: index('relationships_missionary_idx').on(table.missionaryId),
    statusIdx: index('relationships_status_idx').on(table.status),
  })
);

// Tabela de reuniões
export const meetings = pgTable(
  'meetings',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    scheduledAt: timestamp('scheduled_at').notNull(),
    duration: integer('duration').default(60),
    location: text('location'),
    requesterId: integer('requester_id').references(() => users.id),
    assignedToId: integer('assigned_to_id').references(() => users.id),
    typeId: integer('type_id').references(() => meetingTypes.id),
    priority: text('priority').default('medium'),
    isUrgent: boolean('is_urgent').default(false),
    status: text('status').default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    scheduledAtIdx: index('meetings_scheduled_at_idx').on(table.scheduledAt),
    statusIdx: index('meetings_status_idx').on(table.status),
    requesterIdx: index('meetings_requester_idx').on(table.requesterId),
    assignedToIdx: index('meetings_assigned_to_idx').on(table.assignedToId),
  })
);

// Tabela de mensagens
export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    senderId: integer('sender_id').references(() => users.id),
    conversationId: integer('conversation_id').references(() => conversations.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    conversationIdx: index('messages_conversation_idx').on(table.conversationId),
    senderIdx: index('messages_sender_idx').on(table.senderId),
    createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
  })
);

// Tabela de conversas
export const conversations = pgTable(
  'conversations',
  {
    id: serial('id').primaryKey(),
    title: text('title'),
    type: text('type').default('private'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    createdByIdx: index('conversations_created_by_idx').on(table.createdBy),
  })
);

// Tabela de notificações
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    userId: integer('user_id').references(() => users.id),
    type: text('type').notNull(),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    isReadIdx: index('notifications_is_read_idx').on(table.isRead),
    typeIdx: index('notifications_type_idx').on(table.type),
  })
);

// Tabela de subscriptions push
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    userIdx: index('push_subscriptions_user_idx').on(table.userId),
    isActiveIdx: index('push_subscriptions_is_active_idx').on(table.isActive),
  })
);

// Tabela de solicitações de discipulado
export const discipleshipRequests = pgTable(
  'discipleship_requests',
  {
    id: serial('id').primaryKey(),
    interestedId: integer('interested_id').references(() => users.id),
    missionaryId: integer('missionary_id').references(() => users.id),
    status: text('status').default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    interestedIdx: index('discipleship_interested_idx').on(table.interestedId),
    missionaryIdx: index('discipleship_missionary_idx').on(table.missionaryId),
    statusIdx: index('discipleship_status_idx').on(table.status),
  })
);

// Tabela de perfis missionários
export const missionaryProfiles = pgTable(
  'missionary_profiles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    specialization: text('specialization'),
    experience: text('experience'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    userIdx: index('missionary_profiles_user_idx').on(table.userId),
    isActiveIdx: index('missionary_profiles_is_active_idx').on(table.isActive),
  })
);

// Tabela de check-ins emocionais
export const emotionalCheckins = pgTable(
  'emotional_checkins',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    emotionalScore: integer('emotional_score'),
    mood: text('mood'),
    prayerRequest: text('prayer_request'),
    notes: text('notes'),
    isPrivate: boolean('is_private').default(false),
    allowChurchMembers: boolean('allow_church_members').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    userIdx: index('emotional_checkins_user_idx').on(table.userId),
    createdAtIdx: index('emotional_checkins_created_at_idx').on(table.createdAt),
  })
);

// Tabela de configurações de pontos
export const pointConfigs = pgTable(
  'point_configs',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    value: integer('value').notNull(),
    category: text('category').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    categoryIdx: index('point_configs_category_idx').on(table.category),
  })
);

// Tabela de conquistas
export const achievements = pgTable(
  'achievements',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    pointsRequired: integer('points_required').notNull(),
    icon: text('icon'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    pointsRequiredIdx: index('achievements_points_required_idx').on(table.pointsRequired),
  })
);

// Tabela de atividades de pontos
export const pointActivities = pgTable(
  'point_activities',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    activity: text('activity').notNull(),
    points: integer('points').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    userIdx: index('point_activities_user_idx').on(table.userId),
    createdAtIdx: index('point_activities_created_at_idx').on(table.createdAt),
  })
);

// Tabela de configurações do sistema
export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabela de configurações do sistema (settings)
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabela de participantes de eventos
export const eventParticipants = pgTable(
  'event_participants',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id').references(() => events.id),
    userId: integer('user_id').references(() => users.id),
    status: text('status').default('registered'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    eventIdx: index('event_participants_event_idx').on(table.eventId),
    userIdx: index('event_participants_user_idx').on(table.userId),
  })
);

// Tabela de tipos de reunião
export const meetingTypes = pgTable('meeting_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabela de conquistas do usuário
export const userAchievements = pgTable(
  'user_achievements',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    achievementId: integer('achievement_id').references(() => achievements.id),
    earnedAt: timestamp('earned_at').defaultNow(),
  },
  table => ({
    userIdx: index('user_achievements_user_idx').on(table.userId),
  })
);

// Tabela de histórico de pontos do usuário
export const userPointsHistory = pgTable(
  'user_points_history',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    points: integer('points').notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    userIdx: index('user_points_history_user_idx').on(table.userId),
    createdAtIdx: index('user_points_history_created_at_idx').on(table.createdAt),
  })
);

// Tabela de orações
export const prayers = pgTable(
  'prayers',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    requesterId: integer('requester_id').references(() => users.id),
    status: text('status').default('active'),
    isPrivate: boolean('is_private').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    requesterIdx: index('prayers_requester_idx').on(table.requesterId),
    statusIdx: index('prayers_status_idx').on(table.status),
  })
);

// Tabela de intercessores de oração
export const prayerIntercessors = pgTable(
  'prayer_intercessors',
  {
    id: serial('id').primaryKey(),
    prayerId: integer('prayer_id').references(() => prayers.id),
    userId: integer('user_id').references(() => users.id),
    joinedAt: timestamp('joined_at').defaultNow(),
  },
  table => ({
    prayerIdx: index('prayer_intercessors_prayer_idx').on(table.prayerId),
    userIdx: index('prayer_intercessors_user_idx').on(table.userId),
  })
);

// Tabela de sessões de vídeo
export const videoCallSessions = pgTable(
  'video_call_sessions',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    hostId: integer('host_id').references(() => users.id),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    status: text('status').default('scheduled'),
    meetingId: text('meeting_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    hostIdx: index('video_call_sessions_host_idx').on(table.hostId),
    startTimeIdx: index('video_call_sessions_start_time_idx').on(table.startTime),
    statusIdx: index('video_call_sessions_status_idx').on(table.status),
  })
);

// Tabela de participantes de vídeo
export const videoCallParticipants = pgTable(
  'video_call_participants',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id').references(() => videoCallSessions.id),
    userId: integer('user_id').references(() => users.id),
    joinedAt: timestamp('joined_at').defaultNow(),
    leftAt: timestamp('left_at'),
  },
  table => ({
    sessionIdx: index('video_call_participants_session_idx').on(table.sessionId),
    userIdx: index('video_call_participants_user_idx').on(table.userId),
  })
);

// Tabela de participantes de conversas
export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id').references(() => conversations.id),
    userId: integer('user_id').references(() => users.id),
    joinedAt: timestamp('joined_at').defaultNow(),
  },
  table => ({
    conversationIdx: index('conversation_participants_conversation_idx').on(table.conversationId),
    userIdx: index('conversation_participants_user_idx').on(table.userId),
  })
);

// Tabela de permissões de filtros de eventos
export const eventFilterPermissions = pgTable('event_filter_permissions', {
  id: serial('id').primaryKey(),
  permissions: jsonb('permissions').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabela de convites de pastores
export const pastorInvites = pgTable(
  'pastor_invites',
  {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 64 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull(),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    onboardingData: jsonb('onboarding_data'),
    submittedAt: timestamp('submitted_at'),
    reviewedAt: timestamp('reviewed_at'),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    rejectionReason: text('rejection_reason'),
    userId: integer('user_id').references(() => users.id),
    districtId: integer('district_id').references(() => districts.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    tokenIdx: index('pastor_invites_token_idx').on(table.token),
    emailIdx: index('pastor_invites_email_idx').on(table.email),
    statusIdx: index('pastor_invites_status_idx').on(table.status),
    expiresAtIdx: index('pastor_invites_expires_at_idx').on(table.expiresAt),
  })
);

// Exportar todas as tabelas
export const schema = {
  districts,
  users,
  churches,
  events,
  relationships,
  meetings,
  messages,
  conversations,
  notifications,
  pushSubscriptions,
  discipleshipRequests,
  missionaryProfiles,
  emotionalCheckins,
  pointConfigs,
  achievements,
  pointActivities,
  systemConfig,
  systemSettings,
  eventParticipants,
  meetingTypes,
  userAchievements,
  userPointsHistory,
  prayers,
  prayerIntercessors,
  videoCallSessions,
  videoCallParticipants,
  conversationParticipants,
  eventFilterPermissions,
  pastorInvites,
};
