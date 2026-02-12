/**
 * Points Calculation Service
 * @module services/pointsCalculation
 * @description Lógica de cálculo de pontos de usuários baseada em configuração.
 * Extraído de userRoutes.ts para separar business logic de roteamento.
 */

import type { User } from '../../shared/schema';

/** Dados extras do usuário relevantes ao cálculo de pontos */
export interface UserExtraData {
  engajamento?: string;
  classificacao?: string;
  dizimistaType?: string;
  ofertanteType?: string;
  tempoBatismoAnos?: number;
  temCargo?: string;
  departamentosCargos?: string;
  nomeUnidade?: string;
  temLicao?: boolean | string;
  totalPresenca?: number | string;
  comunhao?: number;
  missao?: number;
  estudoBiblico?: number;
  batizouAlguem?: string;
  discipuladoPosBatismo?: number;
  cpfValido?: string;
  camposVaziosACMS?: string;
  [key: string]: unknown;
}

/** Configuração de pesos para cada critério de pontuação */
export interface PointsConfig {
  basicPoints?: number;
  engajamento?: { alto?: number; medio?: number; baixo?: number };
  classificacao?: { frequente?: number; naoFrequente?: number };
  dizimista?: { naoDizimista?: number; recorrente?: number; sazonal?: number; pontual?: number };
  ofertante?: { naoOfertante?: number; recorrente?: number; sazonal?: number; pontual?: number };
  tempobatismo?: { maisVinte?: number; dezAnos?: number; cincoAnos?: number; doisAnos?: number };
  cargos?: { tresOuMais?: number; doisCargos?: number; umCargo?: number };
  nomeunidade?: { comUnidade?: number };
  temlicao?: { comLicao?: number };
  totalpresenca?: { oitoATreze?: number; quatroASete?: number };
  escolasabatina?: { comunhao?: number; missao?: number; estudoBiblico?: number };
  batizouAlguem?: { sim?: number };
  discipuladoPosBatismo?: { multiplicador?: number };
  cpfvalido?: { valido?: number };
  cpfValido?: { valido?: number };
  camposvaziosacms?: { completos?: number };
  camposVaziosACMS?: { completos?: number };
}

/**
 * Faz o parse do campo extraData do usuário, que pode ser string JSON ou objeto.
 */
export const parseExtraData = (user: User): UserExtraData => {
  if (!user.extraData) return {};
  if (typeof user.extraData === 'string') {
    try {
      return JSON.parse(user.extraData) as UserExtraData;
    } catch {
      return {};
    }
  }
  return user.extraData as UserExtraData;
};

/**
 * Calcula os pontos de um usuário com base na configuração fornecida.
 * Avalia 15 critérios: engajamento, classificação, dizimista, ofertante,
 * tempo de batismo, cargos, unidade, lição, presença, escola sabatina,
 * discipulado, CPF válido e campos ACMS.
 */
export const calculateUserPointsFromConfig = (user: User, config: PointsConfig): number => {
  let points = 0;
  const extraData = parseExtraData(user);

  // 1. ENGAJAMENTO
  const engajamento = extraData.engajamento?.toLowerCase() || '';
  if (engajamento.includes('alto')) {
    points += config.engajamento?.alto || 0;
  } else if (engajamento.includes('medio')) {
    points += config.engajamento?.medio || 0;
  } else if (engajamento.includes('baixo')) {
    points += config.engajamento?.baixo || 0;
  }

  // 2. CLASSIFICAÇÃO
  const classificacao = extraData.classificacao?.toLowerCase() || '';
  if (classificacao.includes('frequente')) {
    points += config.classificacao?.frequente || 0;
  } else if (classificacao.includes('naofrequente')) {
    points += config.classificacao?.naoFrequente || 0;
  }

  // 3. DIZIMISTA
  const dizimistaType = extraData.dizimistaType?.toLowerCase() || '';
  if (dizimistaType.includes('recorrente')) {
    points += config.dizimista?.recorrente || 0;
  } else if (dizimistaType.includes('sazonal')) {
    points += config.dizimista?.sazonal || 0;
  } else if (dizimistaType.includes('pontual')) {
    points += config.dizimista?.pontual || 0;
  }

  // 4. OFERTANTE
  const ofertanteType = extraData.ofertanteType?.toLowerCase() || '';
  if (ofertanteType.includes('recorrente')) {
    points += config.ofertante?.recorrente || 0;
  } else if (ofertanteType.includes('sazonal')) {
    points += config.ofertante?.sazonal || 0;
  } else if (ofertanteType.includes('pontual')) {
    points += config.ofertante?.pontual || 0;
  }

  // 5. TEMPO DE BATISMO
  const tempoBatismoAnos = extraData.tempoBatismoAnos || 0;
  if (tempoBatismoAnos >= 20) {
    points += config.tempobatismo?.maisVinte || 0;
  } else if (tempoBatismoAnos >= 10) {
    points += config.tempobatismo?.dezAnos || 0;
  } else if (tempoBatismoAnos >= 5) {
    points += config.tempobatismo?.cincoAnos || 0;
  } else if (tempoBatismoAnos >= 2) {
    points += config.tempobatismo?.doisAnos || 0;
  }

  // 6. CARGOS
  if (extraData.temCargo === 'Sim' && extraData.departamentosCargos) {
    const numCargos = extraData.departamentosCargos.split(';').length;
    if (numCargos >= 3) {
      points += config.cargos?.tresOuMais || 0;
    } else if (numCargos === 2) {
      points += config.cargos?.doisCargos || 0;
    } else if (numCargos === 1) {
      points += config.cargos?.umCargo || 0;
    }
  }

  // 7. NOME DA UNIDADE
  if (extraData.nomeUnidade?.trim()) {
    points += config.nomeunidade?.comUnidade || 0;
  }

  // 8. TEM LIÇÃO
  if (extraData.temLicao === true || extraData.temLicao === 'true') {
    points += config.temlicao?.comLicao || 0;
  }

  // 9. TOTAL DE PRESENÇA
  if (extraData.totalPresenca !== undefined && extraData.totalPresenca !== null) {
    const presenca =
      typeof extraData.totalPresenca === 'string'
        ? parseInt(extraData.totalPresenca)
        : extraData.totalPresenca;
    if (presenca >= 8 && presenca <= 13) {
      points += config.totalpresenca?.oitoATreze || 0;
    } else if (presenca >= 4 && presenca <= 7) {
      points += config.totalpresenca?.quatroASete || 0;
    }
  }

  // 10. ESCOLA SABATINA - COMUNHÃO
  if (extraData.comunhao && extraData.comunhao > 0) {
    points += extraData.comunhao * (config.escolasabatina?.comunhao || 0);
  }

  // 11. ESCOLA SABATINA - MISSÃO
  if (extraData.missao && extraData.missao > 0) {
    points += extraData.missao * (config.escolasabatina?.missao || 0);
  }

  // 12. ESCOLA SABATINA - ESTUDO BÍBLICO
  if (extraData.estudoBiblico && extraData.estudoBiblico > 0) {
    points += extraData.estudoBiblico * (config.escolasabatina?.estudoBiblico || 0);
  }

  // 13. ESCOLA SABATINA - DISCIPULADO PÓS-BATISMO
  if (extraData.discipuladoPosBatismo && extraData.discipuladoPosBatismo > 0) {
    points += extraData.discipuladoPosBatismo * (config.discipuladoPosBatismo?.multiplicador || 0);
  }

  // 14. CPF VÁLIDO
  if (extraData.cpfValido === 'Sim' || extraData.cpfValido === 'true') {
    points += config.cpfValido?.valido || 0;
  }

  // 15. CAMPOS VAZIOS ACMS
  if (extraData.camposVaziosACMS === 'false') {
    points += config.camposVaziosACMS?.completos || 0;
  }

  return Math.round(points);
};
