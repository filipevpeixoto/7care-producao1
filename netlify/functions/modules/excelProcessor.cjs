/**
 * Módulo de Processamento de Excel
 * Centraliza parsing e processamento de arquivos Excel
 */

const { parseDate, parseBool, parseNumber, formatPhoneNumber } = require('./validation.cjs');

/**
 * Mapeamento de nomes de colunas para campos do sistema
 */
const COLUMN_MAPPINGS = {
  // Nome
  nome: 'name',
  name: 'name',
  'nome completo': 'name',
  'full name': 'name',
  
  // Email
  email: 'email',
  'e-mail': 'email',
  'email address': 'email',
  
  // Telefone
  telefone: 'phone',
  phone: 'phone',
  celular: 'phone',
  mobile: 'phone',
  whatsapp: 'phone',
  
  // Igreja
  igreja: 'church',
  church: 'church',
  'nome da igreja': 'church',
  'church name': 'church',
  
  // Tipo de membro
  'tipo': 'memberType',
  'type': 'memberType',
  'tipo de membro': 'memberType',
  'member type': 'memberType',
  categoria: 'memberType',
  category: 'memberType',
  
  // Data de nascimento
  'data de nascimento': 'birthDate',
  'birth date': 'birthDate',
  nascimento: 'birthDate',
  birthday: 'birthDate',
  'data nasc': 'birthDate',
  
  // Data de batismo
  'data de batismo': 'baptismDate',
  'baptism date': 'baptismDate',
  batismo: 'baptismDate',
  
  // Endereço
  endereco: 'address',
  address: 'address',
  'endereço': 'address',
  
  // Cidade
  cidade: 'city',
  city: 'city',
  
  // Estado
  estado: 'state',
  state: 'state',
  uf: 'state',
  
  // Etapas do funil
  'orar por 1': 'step1_orar_por_1',
  'orar por 2': 'step1_orar_por_2',
  'orar por 3': 'step1_orar_por_3',
  'cuidar de 1': 'step2_cuidar_de_1',
  'cuidar de 2': 'step2_cuidar_de_2',
  'cuidar de 3': 'step2_cuidar_de_3',
  'cultivar 1': 'step3_cultivar_1',
  'cultivar 2': 'step3_cultivar_2',
  'cultivar 3': 'step3_cultivar_3',
  'convidar 1': 'step4_convidar_1',
  'convidar 2': 'step4_convidar_2',
  'convidar 3': 'step4_convidar_3',
  'apresentar 1': 'step5_apresentar_1',
  'apresentar 2': 'step5_apresentar_2',
  'apresentar 3': 'step5_apresentar_3',
  'preparar 1': 'step6_preparar_1',
  'preparar 2': 'step6_preparar_2',
  'preparar 3': 'step6_preparar_3',
  'batismo 1': 'step7_batismo_1',
  'batismo 2': 'step7_batismo_2',
  'batismo 3': 'step7_batismo_3',
  
  // Estudos bíblicos
  'estudos biblicos': 'estudosBiblicos',
  'estudos bíblicos': 'estudosBiblicos',
  'biblical studies': 'estudosBiblicos',
  
  // Pontos
  pontos: 'points',
  points: 'points',
  score: 'points'
};

/**
 * Normaliza nome de coluna
 * @param {string} columnName - Nome da coluna
 * @returns {string} Nome normalizado
 */
function normalizeColumnName(columnName) {
  if (!columnName) return '';
  return String(columnName)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' '); // Normaliza espaços
}

/**
 * Mapeia coluna para campo do sistema
 * @param {string} columnName - Nome da coluna
 * @returns {string|null} Nome do campo ou null
 */
function mapColumnToField(columnName) {
  const normalized = normalizeColumnName(columnName);
  return COLUMN_MAPPINGS[normalized] || null;
}

/**
 * Detecta tipo de membro a partir do texto
 * @param {string} text - Texto para analisar
 * @returns {string} Tipo de membro detectado
 */
function detectMemberType(text) {
  if (!text) return 'member';
  
  const normalized = normalizeColumnName(text);
  
  // Interessado/Visitante
  if (normalized.includes('interessad') || 
      normalized.includes('visitant') ||
      normalized.includes('interest') ||
      normalized.includes('visitor')) {
    return 'interested';
  }
  
  // Missionário
  if (normalized.includes('missionar') ||
      normalized.includes('missionary')) {
    return 'missionary';
  }
  
  // Admin/Líder
  if (normalized.includes('admin') ||
      normalized.includes('lider') ||
      normalized.includes('leader') ||
      normalized.includes('coordenador') ||
      normalized.includes('coordinator')) {
    return 'admin';
  }
  
  // Membro padrão
  return 'member';
}

/**
 * Processa linha do Excel
 * @param {Object} row - Linha do Excel
 * @param {Object} columnMap - Mapeamento de colunas
 * @returns {Object} Dados processados
 */
function processRow(row, columnMap) {
  const processed = {};
  
  for (const [excelCol, systemField] of Object.entries(columnMap)) {
    const value = row[excelCol];
    if (value === undefined || value === null || value === '') continue;
    
    switch (systemField) {
      case 'phone':
        processed[systemField] = formatPhoneNumber(value);
        break;
        
      case 'birthDate':
      case 'baptismDate':
        const date = parseDate(value);
        if (date) {
          processed[systemField] = date.toISOString().split('T')[0];
        }
        break;
        
      case 'memberType':
        processed[systemField] = detectMemberType(value);
        break;
        
      case 'points':
      case 'estudosBiblicos':
        processed[systemField] = parseNumber(value);
        break;
        
      // Campos booleanos (etapas)
      case 'step1_orar_por_1':
      case 'step1_orar_por_2':
      case 'step1_orar_por_3':
      case 'step2_cuidar_de_1':
      case 'step2_cuidar_de_2':
      case 'step2_cuidar_de_3':
      case 'step3_cultivar_1':
      case 'step3_cultivar_2':
      case 'step3_cultivar_3':
      case 'step4_convidar_1':
      case 'step4_convidar_2':
      case 'step4_convidar_3':
      case 'step5_apresentar_1':
      case 'step5_apresentar_2':
      case 'step5_apresentar_3':
      case 'step6_preparar_1':
      case 'step6_preparar_2':
      case 'step6_preparar_3':
      case 'step7_batismo_1':
      case 'step7_batismo_2':
      case 'step7_batismo_3':
        processed[systemField] = parseBool(value);
        break;
        
      case 'email':
        const email = String(value).toLowerCase().trim();
        // Valida formato básico de email
        if (email.includes('@') && email.includes('.')) {
          processed[systemField] = email;
        }
        break;
        
      default:
        processed[systemField] = String(value).trim();
    }
  }
  
  return processed;
}

/**
 * Extrai igrejas únicas dos dados
 * @param {Array} rows - Linhas processadas
 * @returns {Array} Lista de igrejas únicas
 */
function extractChurches(rows) {
  const churchSet = new Set();
  const churches = [];
  
  for (const row of rows) {
    const churchName = row.church;
    if (churchName && !churchSet.has(churchName.toLowerCase())) {
      churchSet.add(churchName.toLowerCase());
      churches.push({
        name: churchName,
        memberCount: rows.filter(r => 
          r.church && r.church.toLowerCase() === churchName.toLowerCase()
        ).length
      });
    }
  }
  
  return churches.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Agrupa membros por igreja
 * @param {Array} rows - Linhas processadas
 * @returns {Object} Membros agrupados por igreja
 */
function groupByChurch(rows) {
  const grouped = {};
  
  for (const row of rows) {
    const churchName = row.church || 'Sem Igreja';
    if (!grouped[churchName]) {
      grouped[churchName] = [];
    }
    grouped[churchName].push(row);
  }
  
  return grouped;
}

/**
 * Valida dados processados
 * @param {Array} rows - Linhas processadas
 * @returns {Object} Resultado da validação
 */
function validateProcessedData(rows) {
  const errors = [];
  const warnings = [];
  const valid = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 porque Excel começa em 1 e tem header
    const rowErrors = [];
    const rowWarnings = [];
    
    // Validações obrigatórias
    if (!row.name || row.name.length < 2) {
      rowErrors.push('Nome inválido ou muito curto');
    }
    
    // Validações opcionais
    if (row.email && !row.email.includes('@')) {
      rowWarnings.push('Email pode estar inválido');
    }
    
    if (row.phone && row.phone.length < 8) {
      rowWarnings.push('Telefone pode estar incompleto');
    }
    
    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, data: row, errors: rowErrors });
    } else {
      valid.push(row);
      if (rowWarnings.length > 0) {
        warnings.push({ row: rowNum, warnings: rowWarnings });
      }
    }
  }
  
  return {
    valid,
    errors,
    warnings,
    summary: {
      total: rows.length,
      validCount: valid.length,
      errorCount: errors.length,
      warningCount: warnings.length
    }
  };
}

/**
 * Gera estatísticas dos dados
 * @param {Array} rows - Linhas processadas
 * @returns {Object} Estatísticas
 */
function generateStats(rows) {
  const churches = extractChurches(rows);
  const memberTypes = {};
  let withEmail = 0;
  let withPhone = 0;
  let withBirthDate = 0;
  
  for (const row of rows) {
    const type = row.memberType || 'member';
    memberTypes[type] = (memberTypes[type] || 0) + 1;
    
    if (row.email) withEmail++;
    if (row.phone) withPhone++;
    if (row.birthDate) withBirthDate++;
  }
  
  return {
    totalRows: rows.length,
    churches: churches.length,
    churchList: churches,
    memberTypes,
    dataCompleteness: {
      email: Math.round((withEmail / rows.length) * 100),
      phone: Math.round((withPhone / rows.length) * 100),
      birthDate: Math.round((withBirthDate / rows.length) * 100)
    }
  };
}

/**
 * Processa arquivo Excel completo
 * @param {Array} data - Dados do Excel (array de objetos)
 * @returns {Object} Resultado do processamento
 */
function processExcel(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      success: false,
      error: 'Arquivo vazio ou formato inválido'
    };
  }
  
  // Detecta colunas
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  const columnMap = {};
  const unmappedColumns = [];
  
  for (const col of columns) {
    const field = mapColumnToField(col);
    if (field) {
      columnMap[col] = field;
    } else {
      unmappedColumns.push(col);
    }
  }
  
  // Processa linhas
  const processedRows = [];
  for (const row of data) {
    const processed = processRow(row, columnMap);
    if (Object.keys(processed).length > 0) {
      processedRows.push(processed);
    }
  }
  
  // Valida dados
  const validation = validateProcessedData(processedRows);
  
  // Gera estatísticas
  const stats = generateStats(validation.valid);
  
  return {
    success: true,
    data: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    stats,
    columnMapping: {
      mapped: columnMap,
      unmapped: unmappedColumns
    }
  };
}

module.exports = {
  COLUMN_MAPPINGS,
  normalizeColumnName,
  mapColumnToField,
  detectMemberType,
  processRow,
  extractChurches,
  groupByChurch,
  validateProcessedData,
  generateStats,
  processExcel
};
