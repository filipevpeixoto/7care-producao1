const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/filipevpeixoto/Downloads/Santana do Livramento.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

// Encontrar Filipe Vitola Peixoto
const filipe = data.find(row => {
  const nome = row.Nome || row.nome || '';
  return nome.toLowerCase().includes('filipe') && nome.toLowerCase().includes('peixoto');
});

if (!filipe) {
  console.log('Filipe não encontrado');
  process.exit(1);
}

console.log('=== DADOS DE FILIPE VITOLA PEIXOTO ===');
console.log('');

// Listar todas as colunas com valores
const headers = Object.keys(filipe);
headers.forEach((col, i) => {
  const val = filipe[col];
  const displayVal = val === undefined || val === null || val === '' ? '(vazio)' : String(val);
  console.log((i+1) + '. ' + col + ': ' + displayVal);
});
