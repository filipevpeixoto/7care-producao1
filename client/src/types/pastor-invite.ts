/**
 * Tipos para o sistema de convite de pastores (Frontend)
 */

export type InviteStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
export type ChurchValidationStatus = 'exact_match' | 'similar_found' | 'not_found';
export type ChurchValidationAction = 'use_match' | 'use_suggestion' | 'create_new' | 'ignore';

export interface PersonalData {
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

export interface DistrictData {
  name: string;
  associationId?: number;
  description?: string;
}

export interface ChurchData {
  name: string;
  address: string;
  isNew: boolean;
}

export interface ExcelRow {
  nome: string;
  igreja: string;
  telefone?: string;
  email?: string;
  cargo?: string;
}

export interface ExcelData {
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  data: ExcelRow[];
}

export interface ChurchValidation {
  excelChurchName: string;
  status: ChurchValidationStatus;
  matchedChurchId?: number;
  action: ChurchValidationAction;
  selectedSuggestionId?: number;
  memberCount: number;
}

export interface SimilarChurch {
  id: number;
  name: string;
  similarity: number;
}

export interface ValidationResult {
  churchName: string;
  status: ChurchValidationStatus;
  matchedChurchId?: number;
  suggestions?: SimilarChurch[];
  memberCount: number;
  action?: ChurchValidationAction;
  selectedSuggestionId?: number;
}

export interface OnboardingData {
  personal?: PersonalData;
  district?: DistrictData;
  churches?: ChurchData[];
  excelData?: ExcelData;
  churchValidation?: ChurchValidation[];
  completedSteps: number[];
  lastStepAt: string;
}

export interface PastorInvite {
  id: number;
  token: string;
  email: string;
  createdBy: number;
  expiresAt: string;
  status: InviteStatus;
  onboardingData?: OnboardingData;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: number;
  rejectionReason?: string;
  userId?: number;
  districtId?: number;
  createdAt: string;
  updatedAt: string;
}
