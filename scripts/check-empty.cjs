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

console.log('=== CAMPOS COM VALORES PREENCHIDOS ===\n');

let preenchidos = 0;
let vazios = 0;
const camposVaziosList = [];

colunasExcel.forEach((col, i) => {
  const val = filipe[col];
  const isVazio = val === undefined || val === null || val === '' || val === '(vazio)';
  
  if (isVazio) {
    vazios++;
    camposVaziosList.push(col);
  } else {
    preenchidos++;
  }
});

console.log(`Total de colunas: ${colunasExcel.length}`);
console.log(`Preenchidos: ${preenchidos}`);
console.log(`Vazios: ${vazios}`);
console.log('\nCAMPOS VAZIOS NA PLANILHA:');
camposVaziosList.forEach((col, i) => {
  console.log(`${i+1}. ${col}`);
});
