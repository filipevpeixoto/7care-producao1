const XLSX = require('xlsx');

// Funções de parse (copiadas do importHelpers/Settings)
const parseDizimistaField = (val) => {
  if (!val) return { isDonor: false, dizimistaType: 'naoDizimista' };
  const str = String(val).toLowerCase().trim();

  // Primeiro verificar valores negativos
  if (
    str === 'não' ||
    str === 'nao' ||
    str === 'false' ||
    str === '0' ||
    str === '' ||
    str.includes('não dizimista') ||
    str.includes('nao dizimista')
  ) {
    return { isDonor: false, dizimistaType: 'naoDizimista' };
  }

  // Valores positivos
  if (str === 'sim' || str === 'true' || str === '1') {
    return { isDonor: true, dizimistaType: 'regular' };
  }

  // Tipos específicos (usando padrão de quantidade de meses)
  if (str.includes('fiel') || str.includes('recorrente') || str.includes('8-12') || str.includes('(8-12)')) {
    return { isDonor: true, dizimistaType: 'recorrente' };
  }
  if (str.includes('sazonal') || str.includes('4-7') || str.includes('(4-7)')) {
    return { isDonor: true, dizimistaType: 'sazonal' };
  }
  if (str.includes('pontual') || str.includes('1-3') || str.includes('(1-3)')) {
    return { isDonor: true, dizimistaType: 'pontual' };
  }

  // Se chegou aqui e não é vazio/negativo, considerar como dizimista com tipo customizado
  if (str !== '') {
    return { isDonor: true, dizimistaType: str };
  }

  return { isDonor: false, dizimistaType: 'naoDizimista' };
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

console.log('=== COMPARAÇÃO DE PROCESSAMENTO DIZIMISTA/OFERTANTE ===\n');

const valorOriginalDizimista = row.Dizimista || row.dizimista;
const valorOriginalOfertante = row.Ofertante || row.ofertante;

console.log('VALOR ORIGINAL NA PLANILHA:');
console.log('  Dizimista:', valorOriginalDizimista);
console.log('  Ofertante:', valorOriginalOfertante);

const dizimistaResult = parseDizimistaField(valorOriginalDizimista);
console.log('\nPROCESSAMENTO (parseDizimistaField):');
console.log('  isDonor:', dizimistaResult.isDonor);
console.log('  dizimistaType:', dizimistaResult.dizimistaType);

console.log('\n--- O que o Settings.tsx envia ao backend: ---');
console.log('  isDonor:', dizimistaResult.isDonor);
console.log('  dizimistaType:', dizimistaResult.dizimistaType);

console.log('\n--- O que o Step4 ESTÁ enviando (atualmente): ---');
console.log('  dizimista:', dizimistaResult.dizimistaType, '(processed.dizimistaType)');

console.log('\n--- O que o Step4 DEVERIA enviar: ---');
console.log('  dizimista:', valorOriginalDizimista, '(valor ORIGINAL da planilha)');
