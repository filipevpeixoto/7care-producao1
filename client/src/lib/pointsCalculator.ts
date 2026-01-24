export interface UserData {
  // Engajamento
  engajamento?: 'Baixo' | 'Médio' | 'Alto' | 'Frequente';
  
  // Classificação
  classificacao?: 'A resgatar' | 'Pontual' | 'Recorrente';
  
  // Dizimista
  dizimista?: 'Não dizimista' | 'Pontual (1-3 meses)' | 'Sazonal (4-7 meses)' | 'Recorrente (8-12 meses)';
  
  // Ofertante
  ofertante?: 'Não ofertante' | 'Pontual (1-3 meses)' | 'Sazonal (4-7 meses)' | 'Recorrente (8-12 meses)';
  
  // Tempo de Batismo (em anos)
  tempoBatismo?: number;
  
  // Cargos
  cargos?: string[];
  
  // Departamentos
  departamentos?: string[];
  
  // Nome da Unidade
  nomeUnidade?: string;
  
  // Tem Lição
  temLicao?: boolean | number;
  
  // Pontuação Dinâmica (0-13)
  comunhao?: number;
  missao?: number;
  estudoBiblico?: number;
  
  // Total de Presença
  totalPresenca?: number;
  
  // Batizou Alguém
  batizouAlguem?: boolean | number;
  
  // Discipulado Pós-Batismo
  discipuladoPosBatismo?: number;
  
  // CPF Válido
  cpfValido?: boolean | string;
  
  // Campos Vazios no ACMS
  camposVaziosACMS?: boolean | string;
  
  // Pontuação real da API (para evitar recálculo incorreto)
  actualPoints?: number;
}

export class PointsCalculator {
  /**
   * Calcula a pontuação total do usuário baseada em todos os critérios
   */
  static calculateTotalPoints(userData: UserData): number {
    let totalPoints = 0;
    
    // Engajamento
    totalPoints += this.calculateEngagementPoints(userData.engajamento);
    
    // Classificação
    totalPoints += this.calculateClassificationPoints(userData.classificacao);
    
    // Dizimista
    totalPoints += this.calculateTitherPoints(userData.dizimista);
    
    // Ofertante
    totalPoints += this.calculateOfferingPoints(userData.ofertante);
    
    // Tempo de Batismo
    totalPoints += this.calculateBaptismTimePoints(userData.tempoBatismo);
    
    // Cargos
    totalPoints += this.calculatePositionsPoints(userData.cargos);
    
    // Nome da Unidade
    totalPoints += this.calculateUnitNamePoints(userData.nomeUnidade);
    
    // Tem Lição
    totalPoints += this.calculateLessonPoints(userData.temLicao);
    
    // Pontuação Dinâmica
    totalPoints += this.calculateComunhaoPoints(userData.comunhao);
    totalPoints += this.calculateMissaoPoints(userData.missao);
    totalPoints += this.calculateEstudoBiblicoPoints(userData.estudoBiblico);
    
    // Total de Presença
    totalPoints += this.calculateAttendancePoints(userData.totalPresenca);
    
    // Batizou Alguém
    totalPoints += this.calculateBaptismPoints(userData.batizouAlguem);
    
    // Discipulado Pós-Batismo
    totalPoints += this.calculatePostBaptismPoints(userData.discipuladoPosBatismo);
    
    // CPF Válido
    totalPoints += this.calculateValidCPFPoints(userData.cpfValido);
    
    // Campos Vazios no ACMS
    totalPoints += this.calculateEmptyFieldsPoints(userData.camposVaziosACMS);
    
    return totalPoints;
  }
  
  /**
   * Calcula pontos por engajamento
   */
  static calculateEngagementPoints(engajamento?: string): number {
    switch (engajamento) {
      case 'Baixo': return 10;
      case 'Médio': return 25;
      case 'Alto': return 50;
      case 'Frequente': return 75;
      default: return 0;
    }
  }
  
  /**
   * Calcula pontos por classificação
   */
  static calculateClassificationPoints(classificacao?: string): number {
    switch (classificacao) {
      case 'Frequente': return 75;
      case 'Pontual': return 25;
      case 'A resgatar': return 25;
      default: return 0;
    }
  }
  
  /**
   * Calcula pontos por dizimista
   */
  static calculateTitherPoints(dizimista?: string): number {
    switch (dizimista) {
      case 'Não dizimista': return 0;
      case 'Pontual (1-3 meses)': return 25;
      case 'Sazonal (4-7 meses)': return 50;
      case 'Recorrente (8-12 meses)': return 100;
      default: return 0;
    }
  }
  
  /**
   * Calcula pontos por ofertante
   */
  static calculateOfferingPoints(ofertante?: string): number {
    switch (ofertante) {
      case 'Não ofertante': return 0;
      case 'Ofertante': return 25;
      case 'Pontual (1-3 meses)': return 25;
      case 'Sazonal (4-7 meses)': return 50;
      case 'Recorrente (8-12 meses)': return 100;
      default: return 0;
    }
  }
  
  /**
   * Calcula pontos por tempo de batismo
   */
  static calculateBaptismTimePoints(tempoBatismo?: number | string): number {
    if (!tempoBatismo) return 0;
    
    // Se for string, tentar extrair o número
    if (typeof tempoBatismo === 'string' && tempoBatismo.length > 0) {
      if (tempoBatismo.includes('2 a 4')) return 25;
      if (tempoBatismo.includes('5 a 9')) return 50;
      if (tempoBatismo.includes('10 a 14')) return 100;
      if (tempoBatismo.includes('15 a 19')) return 150;
      if (tempoBatismo.includes('20 a 29')) return 200;
      if (tempoBatismo.includes('30+')) return 200;
      return 0;
    }
    
    // Se for número
    const tempoNumero = typeof tempoBatismo === 'string' ? parseInt(tempoBatismo) : tempoBatismo;
    if (tempoNumero <= 2) return 25;
    if (tempoNumero <= 5) return 50;
    if (tempoNumero <= 10) return 100;
    if (tempoNumero <= 15) return 150;
    if (tempoNumero <= 20) return 200;
    return 200; // 20+ anos
  }
  
  /**
   * Calcula pontos por cargos
   */
  static calculatePositionsPoints(cargos?: string[]): number {
    if (!cargos || cargos.length === 0) return 0;
    
    const validCargos = cargos.filter(cargo => cargo && cargo.trim() !== '');
    
    if (validCargos.length === 1) return 50;
    if (validCargos.length === 2) return 100;
    if (validCargos.length === 3) return 150;
    return 150; // 4+ cargos
  }
  
  /**
   * Calcula pontos por nome da unidade
   */
  static calculateUnitNamePoints(nomeUnidade?: string): number {
    return nomeUnidade && nomeUnidade.trim() !== '' ? 25 : 0;
  }
  
  /**
   * Calcula pontos por ter lição
   */
  static calculateLessonPoints(temLicao?: boolean | number): number {
    if (typeof temLicao === 'number') {
      return temLicao > 0 ? 50 : 0;
    }
    return temLicao ? 50 : 0;
  }
  
  /**
   * Calcula pontos por batizar alguém
   */
  static calculateBaptismPoints(batizouAlguem?: boolean | number): number {
    if (typeof batizouAlguem === 'number') {
      return batizouAlguem > 0 ? 200 : 0;
    }
    return batizouAlguem ? 200 : 0;
  }
  
  /**
   * Calcula pontos por discipulado pós-batismo
   */
  static calculatePostBaptismPoints(discipuladoPosBatismo?: number): number {
    if (!discipuladoPosBatismo || discipuladoPosBatismo < 0) return 0;
    return discipuladoPosBatismo * 150;
  }
  
  /**
   * Calcula pontos por comunhão
   */
  static calculateComunhaoPoints(comunhao?: number): number {
    if (comunhao === undefined || comunhao === null || comunhao < 0 || comunhao > 13) return 0;
    return comunhao * 50;
  }
  
  /**
   * Calcula pontos por missão
   */
  static calculateMissaoPoints(missao?: number): number {
    if (missao === undefined || missao === null || missao < 0 || missao > 13) return 0;
    return missao * 75;
  }
  
  /**
   * Calcula pontos por estudo bíblico
   */
  static calculateEstudoBiblicoPoints(estudoBiblico?: number): number {
    if (estudoBiblico === undefined || estudoBiblico === null || estudoBiblico < 0 || estudoBiblico > 13) return 0;
    return estudoBiblico * 100;
  }
  
  /**
   * Calcula pontos por total de presença
   */
  static calculateAttendancePoints(totalPresenca?: number): number {
    if (!totalPresenca || totalPresenca < 0) return 0;
    
    if (totalPresenca <= 3) return 25;
    if (totalPresenca <= 7) return 50;
    if (totalPresenca <= 13) return 100;
    if (totalPresenca <= 14) return 100;
    return 100; // Máximo de 100 pontos para 15+ presenças
  }
  
  /**
   * Calcula pontos por CPF válido
   */
  static calculateValidCPFPoints(cpfValido?: boolean | string): number {
    if (typeof cpfValido === 'string') {
      return cpfValido === 'Sim' ? 25 : 0;
    }
    return cpfValido ? 25 : 0;
  }
  
  /**
   * Calcula pontos por campos vazios no ACMS
   */
  static calculateEmptyFieldsPoints(camposVaziosACMS?: boolean | string): number {
    if (typeof camposVaziosACMS === 'string') {
      return camposVaziosACMS === 'false' ? 50 : 0;
    }
    return camposVaziosACMS ? 0 : 50; // 50 pontos se NÃO tem campos vazios, 0 se tem
  }
  
  /**
   * Calcula pontos detalhados para debug
   */
  static calculateDetailedPoints(userData: UserData): {
    total: number;
    breakdown: {
      engajamento: number;
      classificacao: number;
      dizimista: number;
      ofertante: number;
      tempoBatismo: number;
      cargos: number;
      nomeUnidade: number;
      temLicao: number;
      comunhao: number;
      missao: number;
      estudoBiblico: number;
      totalPresenca: number;
      batizouAlguem: number;
      discipuladoPosBatismo: number;
      cpfValido: number;
      camposVaziosACMS: number;
    };
  } {
    const breakdown = {
      engajamento: this.calculateEngagementPoints(userData.engajamento),
      classificacao: this.calculateClassificationPoints(userData.classificacao),
      dizimista: this.calculateTitherPoints(userData.dizimista),
      ofertante: this.calculateOfferingPoints(userData.ofertante),
      tempoBatismo: this.calculateBaptismTimePoints(userData.tempoBatismo),
      cargos: this.calculatePositionsPoints(userData.cargos),
      nomeUnidade: this.calculateUnitNamePoints(userData.nomeUnidade),
      temLicao: this.calculateLessonPoints(userData.temLicao),
      comunhao: this.calculateComunhaoPoints(userData.comunhao),
      missao: this.calculateMissaoPoints(userData.missao),
      estudoBiblico: this.calculateEstudoBiblicoPoints(userData.estudoBiblico),
      totalPresenca: this.calculateAttendancePoints(userData.totalPresenca),
      batizouAlguem: this.calculateBaptismPoints(userData.batizouAlguem),
      discipuladoPosBatismo: this.calculatePostBaptismPoints(userData.discipuladoPosBatismo),
      cpfValido: this.calculateValidCPFPoints(userData.cpfValido),
      camposVaziosACMS: this.calculateEmptyFieldsPoints(userData.camposVaziosACMS)
    };
    
    const total = Object.values(breakdown).reduce((sum, points) => sum + points, 0);
    
    return { total, breakdown };
  }
} 