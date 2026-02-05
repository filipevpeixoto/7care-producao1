const XLSX = require('xlsx');

// Simular a função parseDate atualizada
const parseDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    const dateStr = String(dateValue).trim().replace(/['"]/g, '');

    // 1. Tipo number - serial date do Excel
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = dateValue - 2;
      const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    }

    // 1b. String numérica (serial date como string)
    if (/^\d{4,6}$/.test(dateStr)) {
      const serialNum = parseInt(dateStr, 10);
      if (serialNum >= 1 && serialNum <= 60000) {
        const excelEpoch = new Date(1900, 0, 1);
        const daysSinceEpoch = serialNum - 2;
        const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
          return date;
        }
      }
    }

    return null;
  } catch (e) {
    return null;
  }
};

const formatDateToISO = (date) => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

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

console.log('=== TESTE CONVERSÃO DE DATAS DO FILIPE ===\n');

const camposDatas = [
  { nome: 'Nascimento', valor: filipe['Nascimento'] },
  { nome: 'Batismo', valor: filipe['Batismo'] },
  { nome: 'Último dízimo - 12m', valor: filipe['Último dízimo - 12m'] },
  { nome: 'Última oferta - 12m', valor: filipe['Última oferta - 12m'] },
  { nome: 'Data do último movimento', valor: filipe['Data do último movimento'] },
  { nome: 'Data de casamento', valor: filipe['Data de casamento'] },
];

camposDatas.forEach(campo => {
  const original = campo.valor;
  const parsed = parseDate(original);
  const formatted = formatDateToISO(parsed);
  
  console.log(`${campo.nome}:`);
  console.log(`  Original: ${original} (tipo: ${typeof original})`);
  console.log(`  Convertido: ${formatted}`);
  console.log('');
});
