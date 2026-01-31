/**
 * Migração: Popular coluna username_normalized
 *
 * Este script popula a coluna username_normalized para todos os usuários
 * existentes, permitindo busca eficiente O(1) no login.
 *
 * Executar: npx tsx server/migrateUsernameNormalized.ts
 */

import 'dotenv/config';
import { db } from './neonConfig';
import { schema } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Normaliza um nome para formato de username
 * Exemplo: "João da Silva" -> "joaodasilva"
 */
function normalizeUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
    .trim();
}

async function migrateUsernameNormalized() {
  console.log('🔄 Iniciando migração de username_normalized...\n');

  try {
    // Buscar todos os usuários
    const users = await db.select().from(schema.users);
    console.log(`📊 Total de usuários: ${users.length}`);

    let updated = 0;
    let skipped = 0;
    const duplicates: string[] = [];
    const usedUsernames = new Map<string, number>();

    for (const user of users) {
      // Gerar username normalizado
      let normalized = normalizeUsername(user.name);

      // Verificar duplicatas
      if (usedUsernames.has(normalized)) {
        // Adicionar sufixo numérico para evitar duplicata
        const count = usedUsernames.get(normalized)! + 1;
        usedUsernames.set(normalized, count);
        normalized = `${normalized}${count}`;
        duplicates.push(`${user.name} -> ${normalized}`);
      } else {
        usedUsernames.set(normalized, 1);
      }

      // Pular se já tem username normalizado igual
      if (user.usernameNormalized === normalized) {
        skipped++;
        continue;
      }

      // Atualizar usuário
      await db
        .update(schema.users)
        .set({ usernameNormalized: normalized })
        .where(eq(schema.users.id, user.id));

      updated++;

      if (updated % 100 === 0) {
        console.log(`  ✅ ${updated} usuários atualizados...`);
      }
    }

    console.log('\n✅ Migração concluída!');
    console.log(`   Atualizados: ${updated}`);
    console.log(`   Já corretos: ${skipped}`);

    if (duplicates.length > 0) {
      console.log(`\n⚠️  ${duplicates.length} usernames com sufixo (duplicatas):`);
      duplicates.slice(0, 10).forEach(d => console.log(`   - ${d}`));
      if (duplicates.length > 10) {
        console.log(`   ... e mais ${duplicates.length - 10}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrateUsernameNormalized();
