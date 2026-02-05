const XLSX = require('xlsx');

// Ler planilha
const workbook = XLSX.readFile('/Users/filipevpeixoto/Downloads/Santana do Livramento.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

// Encontrar Filipe
const filipe = data.find(row => {
  const nome = row.Nome || row.nome || '';
  return nome.toLowerCase().includes('filipe') && nome.toLowerCase().includes('peixoto');
});

if (!filipe) {
  console.log('Filipe não encontrado');
  process.exit(1);
}

// Colunas da planilha
const colunasExcel = Object.keys(filipe);

// Campos que o ExcelRow espera (baseado em pastor-invite.ts)
const camposExcelRow = [
  'nome', 'igreja', 'telefone', 'email', 'cargo', 'codigo', 'tipo', 'distrital',
  'dataNascimento', 'estadoCivil', 'profissao', 'escolaridade', 'endereco', 'sexo', 'cpf', 'idade',
  'bairro', 'cidadeEstado', 'cidadeNascimento', 'estadoNascimento',
  'dataBatismo', 'dizimista', 'ofertante', 'religiaoAnterior', 'instrutorBiblico',
  'engajamento', 'classificacao',
  'tempoBatismoAnos', 'departamentosCargos', 'nomeUnidade', 'temLicao', 'totalPresenca',
  'comunhao', 'missao', 'estudoBiblico', 'batizouAlguem', 'discPosBatismal', 'cpfValido', 'camposVazios',
  'matriculadoES', 'periodoES',
  'dizimos12m', 'ultimoDizimo', 'valorDizimo', 'numeroMesesSemDizimar', 'dizimistaAntesUltimoDizimo', 'dizimistaType',
  'ofertas12m', 'ultimaOferta', 'valorOferta', 'numeroMesesSemOfertar', 'ofertanteAntesUltimaOferta', 'ofertanteType',
  'ultimoMovimento', 'dataUltimoMovimento', 'tipoEntrada',
  'tempoBatismo', 'localidadeBatismo', 'batizadoPor', 'idadeBatismo',
  'comoConheceu', 'fatorDecisivo', 'comoEstudou', 'instrutorBiblico2',
  'temCargo', 'teen',
  'nomeMae', 'nomePai', 'dataCasamento',
  'presencaCartao', 'presencaQuizLocal', 'presencaQuizOutra', 'presencaQuizOnline', 'teveParticipacao',
  'campoColaborador', 'areaColaborador', 'estabelecimentoColaborador', 'funcaoColaborador',
  'alunoEducacao', 'parentesco', 'nomeCamposVazios',
  'observacoes', 'valid', 'validationError'
];

// Mapeamento de colunas Excel para campos ExcelRow
const mapeamento = {
  'Igreja': 'igreja',
  'Nome': 'nome',
  'Código': 'codigo',
  'Tipo': 'tipo',
  'Sexo': 'sexo',
  'Idade': 'idade',
  'Nascimento': 'dataNascimento',
  'Engajamento': 'engajamento',
  'Classificação': 'classificacao',
  'Dizimista': 'dizimista',
  'Dízimos - 12m': 'dizimos12m',
  'Último dízimo - 12m': 'ultimoDizimo',
  'Valor dízimo - 12m': 'valorDizimo',
  'Número de meses s/ dizimar': 'numeroMesesSemDizimar',
  'Dizimista antes do últ. dízimo': 'dizimistaAntesUltimoDizimo',
  'Ofertante': 'ofertante',
  'Ofertas - 12m': 'ofertas12m',
  'Última oferta - 12m': 'ultimaOferta',
  'Valor oferta - 12m': 'valorOferta',
  'Número de meses s/ ofertar': 'numeroMesesSemOfertar',
  'Ofertante antes da últ. oferta': 'ofertanteAntesUltimaOferta',
  'Último movimento': 'ultimoMovimento',
  'Data do último movimento': 'dataUltimoMovimento',
  'Tipo de entrada': 'tipoEntrada',
  'Tempo de batismo': 'tempoBatismo',
  'Batismo': 'dataBatismo',
  'Localidade do batismo': 'localidadeBatismo',
  'Batizado por': 'batizadoPor',
  'Idade no Batismo': 'idadeBatismo',
  'Tempo de batismo - anos': 'tempoBatismoAnos',
  'Religião anterior': 'religiaoAnterior',
  'Como conheceu a IASD': 'comoConheceu',
  'Fator decisivo': 'fatorDecisivo',
  'Como estudou a Bíblia': 'comoEstudou',
  'Instrutor bíblico': 'instrutorBiblico',
  'Instrutor bíblico 2': 'instrutorBiblico2',
  'Tem cargo': 'temCargo',
  'Teen': 'teen',
  'Departamentos e cargos': 'departamentosCargos',
  'Nome da mãe': 'nomeMae',
  'Nome do pai': 'nomePai',
  'Grau de educação': 'escolaridade',
  'Ocupação': 'profissao',
  'Estado civil': 'estadoCivil',
  'Data de casamento': 'dataCasamento',
  'Celular': 'telefone',
  'Email': 'email',
  'Cidade e Estado': 'cidadeEstado',
  'Bairro': 'bairro',
  'Endereço': 'endereco',
  'Cidade de nascimento': 'cidadeNascimento',
  'Estado de nascimento': 'estadoNascimento',
  'CPF': 'cpf',
  'Nome da unidade': 'nomeUnidade',
  'Matriculado na ES': 'matriculadoES',
  'Tem lição': 'temLicao',
  'Comunhão': 'comunhao',
  'Missão': 'missao',
  'Estudo bíblico': 'estudoBiblico',
  'Batizou alguém': 'batizouAlguem',
  'Disc. pós batismal': 'discPosBatismal',
  'Total presença no cartão': 'presencaCartao',
  'Presença no quiz local': 'presencaQuizLocal',
  'Presença no quiz outra unidade': 'presencaQuizOutra',
  'Presença no quiz online': 'presencaQuizOnline',
  'Total de presença': 'totalPresenca',
  'Teve participação': 'teveParticipacao',
  'Período ES': 'periodoES',
  'Campo - colaborador': 'campoColaborador',
  'Área - colaborador': 'areaColaborador',
  'Estabelecimento - colaborador': 'estabelecimentoColaborador',
  'Função - colaborador': 'funcaoColaborador',
  'Campos vazios/inválidos': 'camposVazios',
  'CPF válido': 'cpfValido',
  'Aluno educação Adv.': 'alunoEducacao',
  'Parentesco p/ c/ aluno': 'parentesco',
  'Nome dos campos vazios no ACMS': 'nomeCamposVazios',
};

console.log('=== ANÁLISE DE MAPEAMENTO ===\n');

// Verificar quais colunas do Excel NÃO estão mapeadas
const naoMapeadas = [];
colunasExcel.forEach(col => {
  if (!mapeamento[col]) {
    naoMapeadas.push(col);
  }
});

console.log('COLUNAS DO EXCEL SEM MAPEAMENTO:');
naoMapeadas.forEach((col, i) => {
  const valor = filipe[col];
  const displayVal = valor === undefined || valor === null || valor === '' ? '(vazio)' : String(valor).substring(0, 50);
  console.log(`${i+1}. "${col}" = ${displayVal}`);
});

console.log('\n--- Total: ' + naoMapeadas.length + ' colunas sem mapeamento ---');
