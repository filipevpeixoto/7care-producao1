const XLSX = require('xlsx');

// Funções de parse (mesmas do importHelpers/Settings)
const toStr = (val) => {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s === '' ? undefined : s;
};

const parseDizimistaField = (val) => {
  if (!val) return { isDonor: false, dizimistaType: 'naoDizimista' };
  const str = String(val).toLowerCase().trim();
  if (str === 'não' || str === 'nao' || str === 'false' || str === '0' || str === '' || str.includes('não dizimista')) {
    return { isDonor: false, dizimistaType: 'naoDizimista' };
  }
  if (str === 'sim' || str === 'true' || str === '1') {
    return { isDonor: true, dizimistaType: 'regular' };
  }
  if (str.includes('fiel') || str.includes('recorrente') || str.includes('8-12')) {
    return { isDonor: true, dizimistaType: 'recorrente' };
  }
  if (str.includes('sazonal') || str.includes('4-7')) {
    return { isDonor: true, dizimistaType: 'sazonal' };
  }
  if (str.includes('pontual') || str.includes('1-3')) {
    return { isDonor: true, dizimistaType: 'pontual' };
  }
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

console.log('=== COMPARAÇÃO APÓS CORREÇÃO ===\n');

const dizimistaOriginal = toStr(row.Dizimista || row.dizimista);
const ofertanteOriginal = toStr(row.Ofertante || row.ofertante);
const engajamentoOriginal = toStr(row.Engajamento || row.engajamento);
const classificacaoOriginal = toStr(row['Classificação'] || row.classificacao);

console.log('VALORES ORIGINAIS DA PLANILHA (como Settings.tsx envia):');
console.log('  dizimista:', dizimistaOriginal);
console.log('  ofertante:', ofertanteOriginal);
console.log('  engajamento:', engajamentoOriginal);
console.log('  classificacao:', classificacaoOriginal);

console.log('\nVALORES QUE O WIZARD AGORA ENVIA (CORRIGIDO):');
console.log('  dizimista:', dizimistaOriginal, '(valor original)');
console.log('  ofertante:', ofertanteOriginal, '(valor original)');
console.log('  engajamento:', engajamentoOriginal, '(valor original)');
console.log('  classificacao:', classificacaoOriginal, '(valor original)');

console.log('\nCOMO O BACKEND VAI PROCESSAR:');
const dizimistaResult = parseDizimistaField(dizimistaOriginal);
console.log('  parseDizimistaField("' + dizimistaOriginal + '"):');
console.log('    isDonor:', dizimistaResult.isDonor);
console.log('    dizimistaType:', dizimistaResult.dizimistaType);
