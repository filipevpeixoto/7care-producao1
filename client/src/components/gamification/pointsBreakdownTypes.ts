export interface PointsBreakdownProps {
  userData: import('@/types/domain').UserMember & { actualPoints?: number };
  breakdown?: {
    engajamento?: number;
    classificacao?: number;
    dizimista?: number;
    ofertante?: number;
    tempoBatismo?: number;
    cargos?: number;
    nomeUnidade?: number;
    temLicao?: number;
    totalPresenca?: number;
    comunhao?: number;
    missao?: number;
    estudoBiblico?: number;
    batizouAlguem?: number;
    discipuladoPosBatismo?: number;
    cpfValido?: number;
    camposVaziosACMS?: number;
  };
  showDetails?: boolean;
}

export interface PointsConfig {
  engajamento: { baixo: number; medio: number; alto: number };
  classificacao: { frequente: number; naoFrequente: number };
  dizimista: { naoDizimista: number; pontual: number; sazonal: number; recorrente: number };
  ofertante: { naoOfertante: number; pontual: number; sazonal: number; recorrente: number };
  tempoBatismo: {
    doisAnos: number;
    cincoAnos: number;
    dezAnos: number;
    vinteAnos: number;
    maisVinte: number;
  };
  cargos: { umCargo: number; doisCargos: number; tresOuMais: number };
  nomeUnidade: { comUnidade: number };
  temLicao: { comLicao: number };
  totalPresenca: { zeroATres: number; quatroASete: number; oitoATreze: number };
  escolaSabatina: {
    comunhao: number;
    missao: number;
    estudoBiblico: number;
    batizouAlguem: number;
    discipuladoPosBatismo: number;
  };
  cpfValido: { valido: number };
  camposVaziosACMS: { completos: number };
}
