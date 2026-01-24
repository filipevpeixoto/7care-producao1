import { sql } from 'drizzle-orm';
import { db } from '../neonConfig';

/**
 * Migração: Adiciona coluna emotional_score à tabela emotional_checkins
 * Data: 2026-01-23
 * 
 * Esta migração garante que a coluna emotional_score existe no banco de dados.
 * Se já existir, a migração é ignorada (IF NOT EXISTS).
 */
export async function addEmotionalScoreColumn() {
  try {
    console.log('🔄 Verificando coluna emotional_score...');
    
    // Adiciona a coluna se não existir
    await db.execute(sql`
      ALTER TABLE emotional_checkins 
      ADD COLUMN IF NOT EXISTS emotional_score INTEGER
    `);
    
    console.log('✅ Coluna emotional_score verificada/criada com sucesso');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna emotional_score:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addEmotionalScoreColumn()
    .then(() => {
      console.log('✅ Migração concluída');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}
