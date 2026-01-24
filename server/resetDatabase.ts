/**
 * Script para resetar o banco de dados e reinserir dados iniciais
 * Use: npx tsx server/resetDatabase.ts
 */

import 'dotenv/config';
import { NeonAdapter } from './neonAdapter';
import { setupNeonData } from './setupNeonData';
import { migrateToNeon } from './migrateToNeon';
import { db } from './neonConfig';

async function resetDatabase() {
  console.log('🔄 Iniciando reset do banco de dados...\n');

  try {
    // 1. Executar migração para criar tabelas
    console.log('📋 Etapa 1: Criando/validando tabelas...');
    await migrateToNeon();
    console.log('✅ Tabelas criadas com sucesso!\n');

    // 2. Limpar todos os dados INCLUINDO ADMIN
    console.log('🧹 Etapa 2: Limpando TODOS os dados...');
    const storage = new NeonAdapter();
    
    // Deletar todos os usuários, sem exceção
    try {
      await db.execute('DELETE FROM users');
      console.log('  🗑️ Todos os usuários deletados');
    } catch (e: any) {
      if (!e.message.includes('does not exist')) {
        throw e;
      }
    }
    
    // Limpar dados das outras tabelas
    await storage.clearAllData();
    console.log('✅ Todos os dados foram limpos com sucesso!\n');

    // 3. Inserir dados iniciais
    console.log('📥 Etapa 3: Inserindo dados iniciais...');
    await setupNeonData();
    console.log('✅ Dados iniciais inseridos com sucesso!\n');

    console.log('🎉 Reset do banco de dados concluído com sucesso!');
    console.log('📊 Você pode fazer login com: admin@7care.com / meu7care');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao resetar banco de dados:', error);
    process.exit(1);
  }
}

resetDatabase();
