import { sql } from 'drizzle-orm';
import { db } from '../neonConfig';
import { logger } from '../utils/logger';

/**
 * Migração: Adiciona coluna emotional_score à tabela emotional_checkins
 * Data: 2026-01-23
 * 
 * Esta migração garante que a coluna emotional_score existe no banco de dados.
 * Se já existir, a migração é ignorada (IF NOT EXISTS).
 */
export async function addEmotionalScoreColumn() {
  try {
    logger.info('🔄 Verificando coluna emotional_score...');
    
    // Adiciona a coluna se não existir
    await db.execute(sql`
      ALTER TABLE emotional_checkins 
      ADD COLUMN IF NOT EXISTS emotional_score INTEGER
    `);
    
    logger.info('✅ Coluna emotional_score verificada/criada com sucesso');
    return { success: true };
  } catch (error) {
    logger.error('❌ Erro ao adicionar coluna emotional_score', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addEmotionalScoreColumn()
    .then(() => {
      logger.info('✅ Migração concluída');
      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Falha na migração', error);
      process.exit(1);
    });
}
