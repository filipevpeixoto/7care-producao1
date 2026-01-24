import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export async function createRelationshipsTable() {
  try {
    console.log('🔧 Criando tabela relationships...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS relationships (
        id SERIAL PRIMARY KEY,
        interested_id INTEGER REFERENCES users(id),
        missionary_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    console.log('✅ Tabela relationships criada com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar tabela relationships:', error);
    return false;
  }
}
