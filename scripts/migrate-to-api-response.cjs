/**
 * Script para migrar rotas para usar apiResponse padronizado
 * Uso: node scripts/migrate-to-api-response.cjs
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../server/routes');

// Padrões a serem substituídos
const patterns = [
  // res.status(200).json(data) -> sendSuccess(res, data)
  {
    regex: /res\.status\(200\)\.json\(([^)]+)\)/g,
    replacement: 'sendSuccess(res, $1)',
  },
  // res.json(data) -> sendSuccess(res, data)
  {
    regex: /res\.json\(([^)]+)\)(?!.*sendSuccess)/g,
    replacement: 'sendSuccess(res, $1)',
    skipIfHasApiResponse: true,
  },
  // res.status(201).json(data) -> sendCreated(res, data)
  {
    regex: /res\.status\(201\)\.json\(([^)]+)\)/g,
    replacement: 'sendCreated(res, $1)',
  },
  // res.status(404).json({ error: 'message' }) -> sendNotFound(res, 'message')
  {
    regex: /res\.status\(404\)\.json\(\{\s*error:\s*['"]([^'"]+)['"]\s*\}\)/g,
    replacement: "sendNotFound(res, '$1')",
  },
  // res.status(403).json({ error: 'message' }) -> sendForbidden(res, 'message')
  {
    regex: /res\.status\(403\)\.json\(\{\s*error:\s*['"]([^'"]+)['"]\s*\}\)/g,
    replacement: "sendForbidden(res, '$1')",
  },
  // res.status(401).json({ error: 'message' }) -> sendUnauthorized(res, 'message')
  {
    regex: /res\.status\(401\)\.json\(\{\s*error:\s*['"]([^'"]+)['"]\s*\}\)/g,
    replacement: "sendUnauthorized(res, '$1')",
  },
  // res.status(400).json({ error: 'message' }) -> sendValidationError(res, { message: 'message' })
  {
    regex: /res\.status\(400\)\.json\(\{\s*error:\s*['"]([^'"]+)['"]\s*\}\)/g,
    replacement: "sendValidationError(res, { message: '$1' })",
  },
  // res.status(500).json({ error: 'message' }) -> sendInternalError(res, 'message')
  {
    regex: /res\.status\(500\)\.json\(\{\s*error:\s*['"]([^'"]+)['"]\s*\}\)/g,
    replacement: "sendInternalError(res, '$1')",
  },
];

// Função para verificar se arquivo já importa apiResponse
function hasApiResponseImport(content) {
  return /import.*from\s+['"].*\/apiResponse['"]/.test(content);
}

// Função para adicionar import se não existir
function addApiResponseImport(content) {
  if (hasApiResponseImport(content)) {
    return content;
  }

  // Procurar o último import
  const importRegex = /import\s+.*from\s+['"].*['"]\s*;/g;
  const imports = content.match(importRegex);

  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const importStatement = `import {\n  sendSuccess,\n  sendCreated,\n  sendError,\n  sendNotFound,\n  sendUnauthorized,\n  sendForbidden,\n  sendValidationError,\n  sendInternalError,\n} from '../utils/apiResponse';`;

    return content.replace(lastImport, `${lastImport}\n${importStatement}`);
  }

  // Se não encontrar imports, adiciona no início do arquivo (após comentários)
  const lines = content.split('\n');
  let insertIndex = 0;

  // Pular comentários no início
  while (insertIndex < lines.length && (lines[insertIndex].startsWith('/**') || lines[insertIndex].startsWith(' *') || lines[insertIndex].startsWith('//') || lines[insertIndex].trim() === '')) {
    insertIndex++;
  }

  lines.splice(insertIndex, 0, `import {\n  sendSuccess,\n  sendCreated,\n  sendError,\n  sendNotFound,\n  sendUnauthorized,\n  sendForbidden,\n  sendValidationError,\n  sendInternalError,\n} from '../utils/apiResponse';\n`);

  return lines.join('\n');
}

// Função para migrar um arquivo
function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Verificar se já usa apiResponse
    if (hasApiResponseImport(content)) {
      console.log(`⏭️  SKIP: ${path.basename(filePath)} (já usa apiResponse)`);
      return false;
    }

    let changed = false;

    // Aplicar substituições
    for (const pattern of patterns) {
      const matches = content.match(pattern.regex);
      if (matches && matches.length > 0) {
        content = content.replace(pattern.regex, pattern.replacement);
        changed = true;
      }
    }

    if (!changed) {
      console.log(`⏭️  SKIP: ${path.basename(filePath)} (nenhuma alteração necessária)`);
      return false;
    }

    // Adicionar import
    content = addApiResponseImport(content);

    // Salvar arquivo
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ MIGRADO: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ ERRO ao migrar ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// Função para processar diretório recursivamente
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let migratedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      migratedCount += processDirectory(filePath);
    } else if (file.endsWith('.ts') && file.endsWith('Routes.ts')) {
      if (migrateFile(filePath)) {
        migratedCount++;
      }
    }
  }

  return migratedCount;
}

// Main
console.log('\n🔄 Iniciando migração para apiResponse padronizado...\n');

const migratedCount = processDirectory(ROUTES_DIR);

console.log(`\n✅ Migração concluída: ${migratedCount} arquivo(s) migrado(s)\n`);
