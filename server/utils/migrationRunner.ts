/**
 * Migration Runner
 * Sistema de migrações formais para o banco de dados
 */

import { neon } from '@neondatabase/serverless';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL || '';
const sql = neon(connectionString);

interface Migration {
  id: string;
  name: string;
  executedAt?: Date;
}

/**
 * Cria tabela de controle de migrações se não existir
 */
async function ensureMigrationsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

/**
 * Busca migrações já executadas
 */
async function getExecutedMigrations(): Promise<string[]> {
  const result = await sql`SELECT name FROM _migrations ORDER BY id`;
  return result.map(row => row.name as string);
}

/**
 * Marca migração como executada
 */
async function markMigrationAsExecuted(name: string): Promise<void> {
  await sql`INSERT INTO _migrations (name) VALUES (${name})`;
}

/**
 * Busca arquivos de migração
 */
function getMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, '../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  
  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
    .filter(file => !file.includes('.test.'))
    .sort();
}

/**
 * Executa todas as migrações pendentes
 */
export async function runMigrations(): Promise<void> {
  logger.info('🔄 Iniciando sistema de migrações...');
  
  try {
    await ensureMigrationsTable();
    
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = getMigrationFiles();
    
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      logger.info('✅ Nenhuma migração pendente');
      return;
    }
    
    logger.info(`📋 ${pendingMigrations.length} migrações pendentes`);
    
    for (const migrationFile of pendingMigrations) {
      logger.info(`⏳ Executando: ${migrationFile}`);
      
      try {
        const migrationPath = path.join(__dirname, '../migrations', migrationFile);
        const migration = await import(migrationPath);
        
        if (typeof migration.up === 'function') {
          await migration.up(sql);
        } else if (typeof migration.default === 'function') {
          await migration.default(sql);
        } else {
          logger.warn(`⚠️ Migração ${migrationFile} não tem função up() ou default()`);
          continue;
        }
        
        await markMigrationAsExecuted(migrationFile);
        logger.info(`✅ Migração executada: ${migrationFile}`);
      } catch (error) {
        logger.error(`❌ Erro na migração ${migrationFile}:`, error);
        throw error;
      }
    }
    
    logger.info('🎉 Todas as migrações executadas com sucesso!');
  } catch (error) {
    logger.error('❌ Erro ao executar migrações:', error);
    throw error;
  }
}

/**
 * Reverte a última migração
 */
export async function rollbackLastMigration(): Promise<void> {
  logger.info('🔄 Revertendo última migração...');
  
  try {
    await ensureMigrationsTable();
    
    const result = await sql`
      SELECT name FROM _migrations 
      ORDER BY id DESC 
      LIMIT 1
    `;
    
    if (result.length === 0) {
      logger.info('ℹ️ Nenhuma migração para reverter');
      return;
    }
    
    const lastMigration = result[0].name as string;
    logger.info(`⏳ Revertendo: ${lastMigration}`);
    
    const migrationPath = path.join(__dirname, '../migrations', lastMigration);
    const migration = await import(migrationPath);
    
    if (typeof migration.down === 'function') {
      await migration.down(sql);
      await sql`DELETE FROM _migrations WHERE name = ${lastMigration}`;
      logger.info(`✅ Migração revertida: ${lastMigration}`);
    } else {
      logger.warn(`⚠️ Migração ${lastMigration} não tem função down()`);
    }
  } catch (error) {
    logger.error('❌ Erro ao reverter migração:', error);
    throw error;
  }
}

/**
 * Lista status das migrações
 */
export async function getMigrationStatus(): Promise<Migration[]> {
  await ensureMigrationsTable();
  
  const executedMigrations = await sql`
    SELECT name, executed_at as "executedAt" 
    FROM _migrations 
    ORDER BY id
  `;
  
  const migrationFiles = getMigrationFiles();
  
  return migrationFiles.map(file => ({
    id: file,
    name: file.replace(/^\d+[-_]/, '').replace(/\.(ts|js)$/, ''),
    executedAt: executedMigrations.find(m => m.name === file)?.executedAt as Date | undefined,
  }));
}

// Executar se chamado diretamente
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
      runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'down':
      rollbackLastMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'status':
      getMigrationStatus()
        .then(migrations => {
          console.table(migrations.map(m => ({
            name: m.name,
            executed: m.executedAt ? '✅' : '❌',
            date: m.executedAt?.toISOString() || '-'
          })));
          process.exit(0);
        })
        .catch(() => process.exit(1));
      break;
    default:
      console.log('Uso: npx tsx server/utils/migrationRunner.ts [up|down|status]');
      process.exit(1);
  }
}
