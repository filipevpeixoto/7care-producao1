/**
 * Zod Schemas para Validação de API
 * Schemas centralizados para validação de requests
 */

import { z } from 'zod';

// ============================================
// Validadores de Senha Segura
// ============================================

/**
 * Regex para validação de senha forte:
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial
 */
const _strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Schema para validação de senha forte
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres')
  .refine(password => /[a-z]/.test(password), 'Senha deve conter pelo menos uma letra minúscula')
  .refine(password => /[A-Z]/.test(password), 'Senha deve conter pelo menos uma letra maiúscula')
  .refine(password => /\d/.test(password), 'Senha deve conter pelo menos um número')
  .refine(
    password => /[@$!%*?&]/.test(password),
    'Senha deve conter pelo menos um caractere especial (@$!%*?&)'
  );

/**
 * Schema para senha básica (mantido para retrocompatibilidade)
 */
export const basicPasswordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

// ============================================
// Schemas de Autenticação
// ============================================

export const loginSchema = z.object({
  email: z.string().min(1, 'Email ou usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: strongPasswordSchema.optional(),
  role: z
    .enum(['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'])
    .optional(),
  church: z.string().optional(),
  churchCode: z.string().optional(),
});

export const changePasswordSchema = z.object({
  userId: z.number().int().positive('ID do usuário inválido'),
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: strongPasswordSchema,
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

// ============================================
// Schemas de Usuário
// ============================================

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  role: z
    .enum(['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'])
    .default('member'),
  church: z.string().optional(),
  churchCode: z.string().optional(),
  districtId: z.number().int().positive().optional().nullable(),
  departments: z.string().optional(),
  birthDate: z.string().optional(),
  civilStatus: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  baptismDate: z.string().optional(),
  previousReligion: z.string().optional(),
  biblicalInstructor: z.string().optional().nullable(),
  interestedSituation: z.string().optional(),
  isDonor: z.boolean().default(false),
  isTither: z.boolean().default(false),
  isApproved: z.boolean().default(false),
  observations: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  firstAccess: z.boolean().optional(),
  status: z.string().optional(),
  points: z.number().int().optional(),
  level: z.string().optional(),
  attendance: z.number().int().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID deve ser um número').transform(Number),
});

// ============================================
// Schemas de Igreja
// ============================================

export const createChurchSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  code: z.string().optional(),
  address: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  pastor: z.string().optional().nullable(),
  districtId: z.number().int().positive().optional().nullable(),
});

export const updateChurchSchema = createChurchSchema.partial();

// ============================================
// Schemas de Evento
// ============================================

export const createEventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  date: z.string().min(1, 'Data é obrigatória'),
  endDate: z.string().optional().nullable(),
  time: z.string().optional(),
  location: z.string().optional().nullable(),
  type: z.string().default('evento'),
  color: z.string().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional().nullable(),
  church: z.string().optional(),
  churchId: z.number().int().positive().optional().nullable(),
  organizerId: z.number().int().positive().optional().nullable(),
});

export const updateEventSchema = createEventSchema.partial();

// ============================================
// Schemas de Reunião
// ============================================

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  scheduledAt: z.string().min(1, 'Data/hora é obrigatória'),
  duration: z.number().int().positive().default(60),
  location: z.string().optional().nullable(),
  requesterId: z.number().int().positive('ID do solicitante inválido'),
  assignedToId: z.number().int().positive().optional().nullable(),
  typeId: z.number().int().positive().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  isUrgent: z.boolean().default(false),
  status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']).default('pending'),
  notes: z.string().optional().nullable(),
});

export const updateMeetingSchema = createMeetingSchema.partial();

// ============================================
// Schemas de Relacionamento
// ============================================

export const createRelationshipSchema = z.object({
  interestedId: z.number().int().positive('ID do interessado inválido'),
  missionaryId: z.number().int().positive('ID do missionário inválido'),
  status: z.enum(['active', 'pending', 'inactive']).default('active'),
  notes: z.string().optional().nullable(),
});

// ============================================
// Schemas de Discipulado
// ============================================

export const createDiscipleshipRequestSchema = z.object({
  interestedId: z.number().int().positive('ID do interessado inválido'),
  missionaryId: z.number().int().positive('ID do missionário inválido'),
  notes: z.string().optional().nullable(),
});

export const updateDiscipleshipRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  notes: z.string().optional().nullable(),
});

// ============================================
// Schemas de Mensagem
// ============================================

export const createMessageSchema = z.object({
  conversationId: z.number().int().positive('ID da conversa inválido'),
  senderId: z.number().int().positive('ID do remetente inválido'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
});

// ============================================
// Schemas de Notificação
// ============================================

export const createNotificationSchema = z.object({
  userId: z.number().int().positive('ID do usuário inválido'),
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  type: z.string().optional(),
});

// ============================================
// Schemas de Oração
// ============================================

export const createPrayerSchema = z.object({
  userId: z.number().int().positive('ID do usuário inválido'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  isPublic: z.boolean().default(true),
  allowIntercessors: z.boolean().default(true),
});

// ============================================
// Schemas de Check-in Emocional
// ============================================

export const createEmotionalCheckInSchema = z.object({
  userId: z.number().int().positive('ID do usuário inválido'),
  emotionalScore: z.number().int().min(1).max(5).optional().nullable(),
  mood: z.string().optional().nullable(),
  prayerRequest: z.string().optional().nullable(),
  isPrivate: z.boolean().default(false),
  allowChurchMembers: z.boolean().default(true),
});

// ============================================
// Schemas de Configuração
// ============================================

export const pointsConfigSchema = z
  .object({
    visitaWeight: z.number().optional().default(1),
    estudoBiblicoWeight: z.number().optional().default(1),
    cultoWeight: z.number().optional().default(1),
    comunhaoWeight: z.number().optional().default(1),
    ofertaWeight: z.number().optional().default(1),
    dizimoWeight: z.number().optional().default(1),
    evangelismoWeight: z.number().optional().default(1),
    servicoWeight: z.number().optional().default(1),
    liderancaWeight: z.number().optional().default(1),
    capacitacaoWeight: z.number().optional().default(1),
  })
  .passthrough(); // Permite campos extras

export const googleDriveConfigSchema = z.object({
  spreadsheetUrl: z.string().url('URL inválida'),
  sheetName: z.string().min(1, 'Nome da aba é obrigatório'),
  apiKey: z.string().min(1, 'API Key é obrigatória'),
});

// ============================================
// Schemas de Push Notification
// ============================================

export const pushSubscriptionSchema = z.object({
  userId: z.number().int().positive('ID do usuário inválido'),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  deviceName: z.string().optional(),
});

export const sendPushNotificationSchema = z.object({
  userIds: z.array(z.number().int().positive()),
  title: z.string().min(1, 'Título é obrigatório'),
  body: z.string().min(1, 'Corpo é obrigatório'),
  icon: z.string().optional(),
  url: z.string().url().optional(),
});

// ============================================
// Schemas de Query Params comuns
// ============================================

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  pageSize: z.string().regex(/^\d+$/).transform(Number).default('20'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const userFilterSchema = z.object({
  role: z
    .enum(['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'])
    .optional(),
  status: z.string().optional(),
  church: z.string().optional(),
  isApproved: z
    .string()
    .transform(val => val === 'true')
    .optional(),
});

// ============================================
// Tipos inferidos dos Schemas
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateChurchInput = z.infer<typeof createChurchSchema>;
export type UpdateChurchInput = z.infer<typeof updateChurchSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type CreateDiscipleshipRequestInput = z.infer<typeof createDiscipleshipRequestSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type CreatePrayerInput = z.infer<typeof createPrayerSchema>;
export type CreateEmotionalCheckInInput = z.infer<typeof createEmotionalCheckInSchema>;
export type PointsConfigInput = z.infer<typeof pointsConfigSchema>;
export type GoogleDriveConfigInput = z.infer<typeof googleDriveConfigSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type SendPushNotificationInput = z.infer<typeof sendPushNotificationSchema>;

// ============================================
// Schemas de Settings
// ============================================

export const setDefaultChurchSchema = z.object({
  churchId: z.number().int().positive('ID da igreja inválido'),
});

export const systemLogoSchema = z.object({
  logoUrl: z.string().min(1, 'URL do logo é obrigatória'),
});

// ============================================
// Schemas de ID params
// ============================================

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido').transform(Number),
});

// userIdParamSchema já foi definido anteriormente na linha 74

// ============================================
// Schemas de Visitas
// ============================================

export const markVisitSchema = z.object({
  notes: z.string().optional().nullable(),
  visitDate: z.string().optional(),
  visitType: z.enum(['home', 'church', 'hospital', 'other']).default('home'),
});

// ============================================
// Schemas de Conversas e Mensagens
// ============================================

export const createDirectConversationSchema = z.object({
  participantIds: z.array(z.number().int().positive()).min(2, 'Mínimo 2 participantes'),
  initialMessage: z.string().optional(),
});

// ============================================
// Schemas de Eleições
// ============================================

export const createElectionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().min(1, 'Data de fim é obrigatória'),
  type: z.enum(['single', 'multiple']).default('single'),
  maxVotes: z.number().int().positive().default(1),
  allowAbstention: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});

export const castVoteSchema = z.object({
  electionId: z.number().int().positive('ID da eleição inválido'),
  candidateIds: z.array(z.number().int().positive()).min(1, 'Selecione pelo menos um candidato'),
  voterId: z.number().int().positive('ID do votante inválido'),
});

// ============================================
// Schemas de Distritos
// ============================================

export const createDistrictSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  region: z.string().optional().nullable(),
  pastorId: z.number().int().positive().optional().nullable(),
});

export const updateDistrictSchema = createDistrictSchema.partial();

// ============================================
// Schemas de Pastores
// ============================================

export const createPastorSchema = z.object({
  userId: z.number().int().positive('ID do usuário inválido'),
  districtId: z.number().int().positive().optional().nullable(),
  title: z.string().optional().default('Pastor'),
  startDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ============================================
// Schemas de Tarefas
// ============================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  assignedToId: z.number().int().positive().optional().nullable(),
  createdById: z.number().int().positive('ID do criador inválido'),
  relatedUserId: z.number().int().positive().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

// ============================================
// Tipos adicionais inferidos
// ============================================

export type MarkVisitInput = z.infer<typeof markVisitSchema>;
export type CreateDirectConversationInput = z.infer<typeof createDirectConversationSchema>;
export type CreateElectionInput = z.infer<typeof createElectionSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
export type CreateDistrictInput = z.infer<typeof createDistrictSchema>;
export type CreatePastorInput = z.infer<typeof createPastorSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
