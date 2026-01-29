#!/usr/bin/env node
/**
 * Script para executar migrations do banco de dados
 */

import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

import { runMigrations } from './server/utils/migrationRunner';
import { logger } from './server/utils/logger';

async function main() {
  try {
    logger.info('🚀 Iniciando execução de migrations...');
    await runMigrations();
    logger.info('✅ Migrations concluídas com sucesso!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro ao executar migrations:', error);
    process.exit(1);
  }
}

main();
