const XLSX = require('xlsx');

// Funções auxiliares (mesmas do importHelpers)
const toStr = (val) => {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s === '' ? undefined : s;
};

const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const cleanSexo = (val) => {
  if (!val) return undefined;
  const s = String(val).toLowerCase().trim();
  if (s.includes('masc') || s === 'm') return 'M';
  if (s.includes('fem') || s === 'f') return 'F';
  return undefined;
};

const parseBooleanField = (val) => {
  if (val === undefined || val === null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  const s = String(val).toLowerCase().trim();
  return s === 'sim' || s === 's' || s === 'yes' || s === 'true' || s === '1' || s === 'x';
};

const parseDate = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1900, 0, 1);
    const daysSinceEpoch = dateValue - 2;
    return new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
  }
  return null;
};

const formatDateToISO = (date) => {
  if (!date) return undefined;
  return date.toISOString().split('T')[0];
};

// Ler planilha
const workbook = XLSX.readFile('/Users/filipevpeixoto/Downloads/Santana do Livramento.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

// Encontrar Filipe
const row = data.find(r => {
  const nome = r.Nome || r.nome || '';
  return nome.toLowerCase().includes('filipe') && nome.toLowerCase().includes('peixoto');
});

if (!row) {
  console.log('Filipe não encontrado');
  process.exit(1);
}

// Simular o processamento exato do Step4ExcelImport
const excelRow = {
  // Campos obrigatórios
  nome: row.Nome,
  igreja: row.Igreja,
  
  // Campos básicos
  telefone: toStr(row.Celular),
  email: toStr(row.Email),
  cargo: undefined, // extraData
  codigo: toStr(row['Código']),
  tipo: 'pastor', // processado
  distrital: undefined, // extraData
  
  // Dados pessoais
  dataNascimento: formatDateToISO(parseDate(row.Nascimento)),
  estadoCivil: toStr(row['Estado civil']),
  profissao: toStr(row['Ocupação']),
  escolaridade: toStr(row['Grau de educação']),
  endereco: toStr(row['Endereço']),
  sexo: cleanSexo(row.Sexo),
  cpf: toStr(row.CPF),
  idade: parseNumber(row.Idade) || undefined,
  bairro: toStr(row.Bairro),
  cidadeEstado: toStr(row['Cidade e Estado']),
  cidadeNascimento: toStr(row['Cidade de nascimento']),
  estadoNascimento: toStr(row['Estado de nascimento']),
  
  // Dados religiosos
  dataBatismo: formatDateToISO(parseDate(row.Batismo)),
  dizimista: toStr(row.Dizimista), // dizimistaType
  ofertante: toStr(row.Ofertante), // ofertanteType
  religiaoAnterior: toStr(row['Religião anterior']),
  instrutorBiblico: toStr(row['Instrutor bíblico']),
  
  // Engajamento e Classificação
  engajamento: toStr(row.Engajamento),
  classificacao: toStr(row['Classificação']),
  
  // Campos de pontuação
  tempoBatismoAnos: parseNumber(row['Tempo de batismo - anos']),
  departamentosCargos: toStr(row['Departamentos e cargos']),
  nomeUnidade: toStr(row['Nome da unidade']),
  temLicao: parseBooleanField(row['Tem lição']),
  totalPresenca: parseNumber(row['Total de presença']),
  comunhao: parseNumber(row['Comunhão']),
  missao: parseNumber(row['Missão']),
  estudoBiblico: parseNumber(row['Estudo bíblico']),
  batizouAlguem: parseBooleanField(row['Batizou alguém']),
  discPosBatismal: parseNumber(row['Disc. pós batismal']),
  cpfValido: parseBooleanField(row['CPF válido']),
  camposVazios: parseBooleanField(row['Campos vazios/inválidos']),
  
  // Escola Sabatina
  matriculadoES: parseBooleanField(row['Matriculado na ES']),
  periodoES: toStr(row['Período ES']),
  
  // Dízimos (12 meses)
  dizimos12m: toStr(row['Dízimos - 12m']),
  ultimoDizimo: formatDateToISO(parseDate(row['Último dízimo - 12m'])),
  valorDizimo: toStr(row['Valor dízimo - 12m']),
  numeroMesesSemDizimar: parseNumber(row['Número de meses s/ dizimar']) || undefined,
  dizimistaAntesUltimoDizimo: toStr(row['Dizimista antes do últ. dízimo']),
  dizimistaType: undefined, // extraData
  
  // Ofertas (12 meses)
  ofertas12m: toStr(row['Ofertas - 12m']),
  ultimaOferta: formatDateToISO(parseDate(row['Última oferta - 12m'])),
  valorOferta: toStr(row['Valor oferta - 12m']),
  numeroMesesSemOfertar: parseNumber(row['Número de meses s/ ofertar']) || undefined,
  ofertanteAntesUltimaOferta: toStr(row['Ofertante antes da últ. oferta']),
  ofertanteType: undefined, // extraData
  
  // Movimentos
  ultimoMovimento: toStr(row['Último movimento']),
  dataUltimoMovimento: formatDateToISO(parseDate(row['Data do último movimento'])),
  tipoEntrada: toStr(row['Tipo de entrada']),
  
  // Batismo detalhado
  tempoBatismo: toStr(row['Tempo de batismo']),
  localidadeBatismo: toStr(row['Localidade do batismo']),
  batizadoPor: toStr(row['Batizado por']),
  idadeBatismo: toStr(row['Idade no Batismo']),
  
  // Conversão
  comoConheceu: toStr(row['Como conheceu a IASD']),
  fatorDecisivo: toStr(row['Fator decisivo']),
  comoEstudou: toStr(row['Como estudou a Bíblia']),
  instrutorBiblico2: toStr(row['Instrutor bíblico 2']),
  
  // Cargos
  temCargo: toStr(row['Tem cargo']),
  teen: toStr(row.Teen),
  
  // Família
  nomeMae: toStr(row['Nome da mãe']),
  nomePai: toStr(row['Nome do pai']),
  dataCasamento: formatDateToISO(parseDate(row['Data de casamento'])),
  
  // Presença detalhada
  presencaCartao: parseNumber(row['Total presença no cartão']) || undefined,
  presencaQuizLocal: parseNumber(row['Presença no quiz local']) || undefined,
  presencaQuizOutra: parseNumber(row['Presença no quiz outra unidade']) || undefined,
  presencaQuizOnline: parseNumber(row['Presença no quiz online']) || undefined,
  teveParticipacao: toStr(row['Teve participação']),
  
  // Colaboração
  campoColaborador: toStr(row['Campo - colaborador']),
  areaColaborador: toStr(row['Área - colaborador']),
  estabelecimentoColaborador: toStr(row['Estabelecimento - colaborador']),
  funcaoColaborador: toStr(row['Função - colaborador']),
  
  // Educação
  alunoEducacao: toStr(row['Aluno educação Adv.']),
  parentesco: toStr(row['Parentesco p/ c/ aluno']),
  
  // Validação
  nomeCamposVazios: toStr(row['Nome dos campos vazios no ACMS']),
  
  // Observações
  observacoes: undefined,
  
  // Flag de validação
  valid: true,
};

// Contar campos preenchidos (mesma lógica do Step4)
const detectedFields = Object.entries(excelRow).filter(
  ([key, val]) =>
    key !== 'valid' &&
    key !== 'validationError' &&
    val !== undefined &&
    val !== null &&
    val !== ''
);

const camposVaziosList = Object.entries(excelRow).filter(
  ([key, val]) =>
    key !== 'valid' &&
    key !== 'validationError' &&
    (val === undefined || val === null || val === '')
);

console.log('=== RESULTADO DO PROCESSAMENTO ===\n');
console.log(`Campos detectados: ${detectedFields.length}`);
console.log(`Campos vazios/perdidos: ${camposVaziosList.length}\n`);

console.log('CAMPOS VAZIOS/PERDIDOS NO PROCESSAMENTO:');
camposVaziosList.forEach(([key, val], i) => {
  // Verificar se tinha valor na planilha original
  const mapeamentoInverso = {
    'cargo': null,
    'distrital': null,
    'dizimistaType': null,
    'ofertanteType': null,
    'observacoes': null,
  };
  
  console.log(`${i+1}. ${key} = ${val}`);
});

// Verificar campos com valor 0 ou false que existem
console.log('\n\nCAMPOS COM VALOR 0 OU FALSE (podem estar sendo ignorados):');
Object.entries(excelRow).forEach(([key, val]) => {
  if (val === 0 || val === false) {
    console.log(`- ${key} = ${val}`);
  }
});
