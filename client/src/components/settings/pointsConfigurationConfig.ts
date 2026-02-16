export interface PointsConfig {
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
    semUnidade?: number;
  };
  temLicao: {
    comLicao: number;
    semLicao?: number;
  };
  pontuacaoDinamica: {
    multiplicador: number;
  };
  totalPresenca: {
    zeroATres: number;
    quatroASete: number;
    oitoATreze: number;
  };
  escolaSabatina: {
    comunhao: number;
    missao: number;
    estudoBiblico: number;
    batizouAlguem: number;
    discipuladoPosBatismo: number;
  };
  cpfValido: {
    valido: number;
    invalido?: number;
  };
  camposVaziosACMS: {
    semCamposVazios: number;
    incompletos?: number;
  };
}

export const defaultConfig: PointsConfig = {
  engajamento: {
    baixo: 200,
    medio: 400,
    alto: 600,
  },
  classificacao: {
    frequente: 300,
    naoFrequente: 150,
  },
  dizimista: {
    naoDizimista: 0,
    pontual: 100,
    sazonal: 200,
    recorrente: 300,
  },
  ofertante: {
    naoOfertante: 0,
    pontual: 60,
    sazonal: 120,
    recorrente: 180,
  },
  tempoBatismo: {
    doisAnos: 100,
    cincoAnos: 200,
    dezAnos: 400,
    vinteAnos: 600,
    maisVinte: 800,
  },
  cargos: {
    umCargo: 200,
    doisCargos: 400,
    tresOuMais: 600,
  },
  nomeUnidade: {
    comUnidade: 100,
  },
  temLicao: {
    comLicao: 120,
  },
  pontuacaoDinamica: {
    multiplicador: 25,
  },
  totalPresenca: {
    zeroATres: 0,
    quatroASete: 200,
    oitoATreze: 400,
  },
  escolaSabatina: {
    comunhao: 40,
    missao: 60,
    estudoBiblico: 20,
    batizouAlguem: 400,
    discipuladoPosBatismo: 80,
  },
  cpfValido: {
    valido: 100,
  },
  camposVaziosACMS: {
    semCamposVazios: 200,
  },
};
