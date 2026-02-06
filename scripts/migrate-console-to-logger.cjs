/**
 * Script para migrar console.log/error/warn/info para logger estruturado
 * Mantém compatibilidade e não quebra código em produção
 */

const fs = require('fs');
const path = require('path');

// Arquivos a migrar (apenas código de produção)
const filesToMigrate = [
  'server/storage/churchStorage.ts',
  'server/storage/eventStorage.ts',
  'server/storage/userStorage.ts',
  'server/services/authService.ts',
  'server/services/cacheService.ts',
  'server/services/dracmaSubmitter.ts',
  'server/services/googleCalendarService.ts',
  'server/jobs/dracmaSubmissionJob.ts',
  'server/neonConfig.ts',
];

const baseDir = path.resolve(__dirname, '..');

function migrateFile(filePath) {
  const fullPath = path.join(baseDir, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Arquivo não encontrado: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Verificar se já tem import do logger
  const hasLoggerImport = content.includes("from '../utils/logger'") ||
                          content.includes("from './utils/logger'") ||
                          content.includes("from '../../utils/logger'");

  // Adicionar import se não tiver
  if (!hasLoggerImport && (content.includes('console.log') || content.includes('console.error'))) {
    // Encontrar onde adicionar o import (após outros imports)
    const importRegex = /^import .* from .*$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.indexOf(lastImport) + lastImport.length;

      // Determinar o caminho relativo correto
      const depth = filePath.split('/').length - 2; // -2 porque server/ é base
      const relativePath = '../'.repeat(depth) + 'utils/logger';

      content = content.slice(0, lastImportIndex) +
                `\nimport { logger } from '${relativePath}';` +
                content.slice(lastImportIndex);
    }
  }

  // Substituir console.error → logger.error
  content = content.replace(
    /console\.error\(['"`]([^'"`]+)['"`],\s*([^)]+)\)/g,
    "logger.error('$1', $2)"
  );
  content = content.replace(
    /console\.error\(['"`]([^'"`]+)['"`]\)/g,
    "logger.error('$1')"
  );
  content = content.replace(
    /console\.error\(([^)]+)\)/g,
    "logger.error($1)"
  );

  // Substituir console.log → logger.info
  content = content.replace(
    /console\.log\(['"`]([^'"`]+)['"`],\s*([^)]+)\)/g,
    "logger.info('$1', $2)"
  );
  content = content.replace(
    /console\.log\(['"`]([^'"`]+)['"`]\)/g,
    "logger.info('$1')"
  );
  content = content.replace(
    /console\.log\(([^)]+)\)/g,
    "logger.info($1)"
  );

  // Substituir console.warn → logger.warn
  content = content.replace(
    /console\.warn\(['"`]([^'"`]+)['"`],\s*([^)]+)\)/g,
    "logger.warn('$1', $2)"
  );
  content = content.replace(
    /console\.warn\(['"`]([^'"`]+)['"`]\)/g,
    "logger.warn('$1')"
  );
  content = content.replace(
    /console\.warn\(([^)]+)\)/g,
    "logger.warn($1)"
  );

  // Substituir console.info → logger.info
  content = content.replace(
    /console\.info\(['"`]([^'"`]+)['"`],\s*([^)]+)\)/g,
    "logger.info('$1', $2)"
  );
  content = content.replace(
    /console\.info\(['"`]([^'"`]+)['"`]\)/g,
    "logger.info('$1')"
  );

  // Verificar se houve mudanças
  if (content === originalContent) {
    console.log(`⏭️  Sem mudanças: ${filePath}`);
    return false;
  }

  // Salvar arquivo
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Migrado: ${filePath}`);
  return true;
}

// Executar migração
console.log('🔄 Iniciando migração de console.* para logger...\n');

let migrated = 0;
filesToMigrate.forEach(file => {
  if (migrateFile(file)) {
    migrated++;
  }
});

console.log(`\n✅ Migração concluída: ${migrated} arquivo(s) modificado(s)`);
console.log('⚠️  Revise as mudanças com git diff antes de commitar');
