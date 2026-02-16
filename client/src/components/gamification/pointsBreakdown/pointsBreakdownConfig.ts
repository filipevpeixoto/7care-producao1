import type { PointsConfig } from '../pointsBreakdownTypes';

export const createSafeConfig = (pointsConfig: PointsConfig | null) => {
  if (!pointsConfig) return null;
  return {
    engajamento: pointsConfig.engajamento || { baixo: 0, medio: 0, alto: 0 },
    classificacao: pointsConfig.classificacao || { frequente: 0, naoFrequente: 0 },
    dizimista: pointsConfig.dizimista || {
      naoDizimista: 0,
      pontual: 0,
      sazonal: 0,
      recorrente: 0,
    },
    ofertante: pointsConfig.ofertante || {
      naoOfertante: 0,
      pontual: 0,
      sazonal: 0,
      recorrente: 0,
    },
    tempoBatismo: pointsConfig.tempoBatismo || {
      doisAnos: 0,
      cincoAnos: 0,
      dezAnos: 0,
      vinteAnos: 0,
      maisVinte: 0,
    },
    cargos: pointsConfig.cargos || { umCargo: 0, doisCargos: 0, tresOuMais: 0 },
    nomeUnidade: pointsConfig.nomeUnidade || { comUnidade: 0 },
    temLicao: pointsConfig.temLicao || { comLicao: 0 },
    totalPresenca: pointsConfig.totalPresenca || {
      zeroATres: 0,
      quatroASete: 0,
      oitoATreze: 0,
    },
    escolaSabatina: pointsConfig.escolaSabatina || {
      comunhao: 0,
      missao: 0,
      estudoBiblico: 0,
      batizouAlguem: 0,
      discipuladoPosBatismo: 0,
    },
    cpfValido: pointsConfig.cpfValido || { valido: 0 },
    camposVaziosACMS: pointsConfig.camposVaziosACMS || { completos: 0 },
  };
};
