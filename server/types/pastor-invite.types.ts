/**
 * Tipos para o sistema de convite de pastores
 */

// Status do convite
export type InviteStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

// Status da validação de igreja
export type ChurchValidationStatus = 'exact_match' | 'similar_found' | 'not_found';

// Ação para igreja não encontrada
export type ChurchValidationAction = 'use_match' | 'use_suggestion' | 'create_new' | 'ignore';

// Dados pessoais (Passo 1)
export interface PersonalData {
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

// Dados do distrito (Passo 2)
export interface DistrictData {
  name: string;
  associationId?: number;
  description?: string;
}

// Igreja (Passo 3)
export interface ChurchData {
  name: string;
  address: string;
  isNew: boolean; // true se criada pelo pastor
}

// Linha do Excel (Passo 4)
export interface ExcelRow {
  nome: string;
  igreja: string;
  telefone?: string;
  email?: string;
  cargo?: string;
}

// Dados do Excel importado
export interface ExcelData {
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  data: ExcelRow[];
}

// Validação de uma igreja (Passo 5)
export interface ChurchValidation {
  excelChurchName: string;
  status: ChurchValidationStatus;
  matchedChurchId?: number;
  action: ChurchValidationAction;
  selectedSuggestionId?: number;
  memberCount: number;
}

// Sugestão de igreja similar
export interface SimilarChurch {
  id: number;
  name: string;
  similarity: number; // 0-100
}

// Resultado de validação completo
export interface ValidationResult {
  churchName: string;
  status: ChurchValidationStatus;
  matchedChurchId?: number;
  suggestions?: SimilarChurch[];
  memberCount: number;
  action?: ChurchValidationAction;
  selectedSuggestionId?: number;
}

// Dados completos do onboarding (JSONB no banco)
export interface OnboardingData {
  personal: PersonalData;
  district: DistrictData;
  churches: ChurchData[];
  excelData?: ExcelData;
  churchValidation?: ChurchValidation[];
  passwordHash?: string;
  completedSteps: number[];
  lastStepAt: string;
}

// Convite do pastor (tabela completa)
export interface PastorInvite {
  id: number;
  token: string;
  email: string;
  createdBy: number;
  expiresAt: Date;
  status: InviteStatus;
  onboardingData?: OnboardingData;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: number;
  rejectionReason?: string;
  userId?: number;
  districtId?: number;
  createdAt: Date;
  updatedAt: Date;
}

// DTO para criar convite
export interface CreateInviteDTO {
  email: string;
  expiresInDays?: number;
}

// DTO para submeter onboarding
export interface SubmitOnboardingDTO {
  personal: PersonalData;
  district: DistrictData;
  churches: ChurchData[];
  excelData?: ExcelData;
  churchValidation?: ChurchValidation[];
  password: string;
}

// DTO para rejeitar convite
export interface RejectInviteDTO {
  reason: string;
  details?: string;
}

// Response de upload de Excel
export interface ExcelUploadResponse {
  fileName: string;
  totalRows: number;
  preview: ExcelRow[];
  churches: string[]; // Lista única de igrejas
}

// Response de validação de token
export interface ValidateTokenResponse {
  valid: boolean;
  email: string;
  expiresAt: string;
}

// Response de criação de convite
export interface CreateInviteResponse {
  token: string;
  link: string;
  expiresAt: string;
}

// Response de aprovação
export interface ApproveInviteResponse {
  success: boolean;
  userId: number;
  districtId: number;
}
