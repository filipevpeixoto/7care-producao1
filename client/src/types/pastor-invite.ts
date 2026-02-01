/**
 * Tipos para o sistema de convite de pastores (Frontend)
 * Alinhado com os campos do Gestão de Dados para importação completa
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
  type: 'igreja' | 'grupo'; // (i) para igreja, (g) para grupo organizado
}

/**
 * Interface completa para linha de dados do Excel
 * Inclui todos os campos reconhecidos pelo Gestão de Dados
 */
export interface ExcelRow {
  // Campos obrigatórios
  nome: string;
  igreja: string;

  // Campos básicos
  telefone?: string;
  email?: string;
  cargo?: string;
  codigo?: string;
  tipo?: string;

  // Dados pessoais
  dataNascimento?: string;
  estadoCivil?: string;
  profissao?: string;
  escolaridade?: string;
  endereco?: string;
  sexo?: string;
  cpf?: string;
  idade?: number;
  bairro?: string;
  cidadeEstado?: string;
  cidadeNascimento?: string;
  estadoNascimento?: string;

  // Dados religiosos
  dataBatismo?: string;
  dizimista?: string;
  ofertante?: string;
  religiaoAnterior?: string;
  instrutorBiblico?: string;

  // Engajamento e Classificação
  engajamento?: string;
  classificacao?: string;

  // Campos de pontuação
  tempoBatismoAnos?: number;
  departamentosCargos?: string;
  nomeUnidade?: string;
  temLicao?: boolean;
  totalPresenca?: number;
  comunhao?: number;
  missao?: number;
  estudoBiblico?: number;
  batizouAlguem?: boolean;
  discPosBatismal?: number;
  cpfValido?: boolean;
  camposVazios?: boolean;

  // Escola Sabatina
  matriculadoES?: boolean;
  periodoES?: string;

  // Dízimos (12 meses)
  dizimos12m?: string;
  ultimoDizimo?: string;
  valorDizimo?: string;
  numeroMesesSemDizimar?: number;
  dizimistaAntesUltimoDizimo?: string;
  dizimistaType?: string;

  // Ofertas (12 meses)
  ofertas12m?: string;
  ultimaOferta?: string;
  valorOferta?: string;
  numeroMesesSemOfertar?: number;
  ofertanteAntesUltimaOferta?: string;
  ofertanteType?: string;

  // Movimentos
  ultimoMovimento?: string;
  dataUltimoMovimento?: string;
  tipoEntrada?: string;

  // Batismo detalhado
  tempoBatismo?: string;
  localidadeBatismo?: string;
  batizadoPor?: string;
  idadeBatismo?: string;

  // Conversão
  comoConheceu?: string;
  fatorDecisivo?: string;
  comoEstudou?: string;
  instrutorBiblico2?: string;

  // Cargos
  temCargo?: string;
  teen?: string;

  // Família
  nomeMae?: string;
  nomePai?: string;
  dataCasamento?: string;

  // Presença detalhada
  presencaCartao?: number;
  presencaQuizLocal?: number;
  presencaQuizOutra?: number;
  presencaQuizOnline?: number;
  teveParticipacao?: string;

  // Colaboração
  campoColaborador?: string;
  areaColaborador?: string;
  estabelecimentoColaborador?: string;
  funcaoColaborador?: string;

  // Educação
  alunoEducacao?: string;
  parentesco?: string;

  // Validação
  nomeCamposVazios?: string;

  // Observações
  observacoes?: string;

  // Flag de validação interna
  valid?: boolean;
  validationError?: string;
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
