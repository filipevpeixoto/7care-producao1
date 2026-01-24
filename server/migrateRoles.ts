import { sql } from './neonConfig';

/**
 * Script de migração para nova hierarquia de perfis
 * Converte 'admin' para 'pastor' e cria estrutura de distritos
 */
export async function migrateRoles() {
  console.log('🚀 Iniciando migração de roles e distritos...\n');

  try {
    // 1. Criar tabela districts
    console.log('📋 Passo 1: Criando tabela districts...');
    await sql`
      CREATE TABLE IF NOT EXISTS districts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        pastor_id INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Tabela districts criada!\n');

    // 2. Adicionar coluna districtId em users (se não existir)
    console.log('📋 Passo 2: Adicionando coluna district_id em users...');
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS district_id INTEGER
    `;
    console.log('✅ Coluna district_id adicionada em users!\n');

    // 3. Adicionar coluna districtId em churches (se não existir)
    console.log('📋 Passo 3: Adicionando coluna district_id em churches...');
    await sql`
      ALTER TABLE churches 
      ADD COLUMN IF NOT EXISTS district_id INTEGER
    `;
    console.log('✅ Coluna district_id adicionada em churches!\n');

    // 4. Criar distrito de Santana do Livramento
    console.log('📋 Passo 4: Criando distrito de Santana do Livramento...');
    const defaultDistrict = await sql`
      INSERT INTO districts (name, code, description)
      VALUES ('Santana do Livramento', 'SLIV001', 'Distrito de Santana do Livramento')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    const defaultDistrictId = defaultDistrict[0]?.id;
    console.log(`✅ Distrito de Santana do Livramento criado (ID: ${defaultDistrictId})!\n`);

    // 5. Converter todos os usuários com role='admin' para role='pastor'
    console.log('📋 Passo 5: Convertendo admins para pastores...');
    const updatedAdmins = await sql`
      UPDATE users 
      SET role = 'pastor'
      WHERE role = 'admin'
      RETURNING id, name, email
    `;
    console.log(`✅ ${updatedAdmins.length} usuários convertidos de admin para pastor!\n`);

    // 6. Converter admin@7care.com para superadmin
    console.log('📋 Passo 6: Convertendo admin@7care.com para superadmin...');
    const superAdminUpdate = await sql`
      UPDATE users 
      SET role = 'superadmin'
      WHERE email = 'admin@7care.com' AND role = 'pastor'
      RETURNING id, name, email
    `;
    if (superAdminUpdate.length > 0) {
      console.log(`✅ Usuário ${superAdminUpdate[0].email} convertido para superadmin!\n`);
    } else {
      // Se não encontrou, verificar se já é superadmin ou criar
      const existingSuperAdmin = await sql`
        SELECT id FROM users WHERE email = 'admin@7care.com'
      `;
      if (existingSuperAdmin.length > 0) {
        await sql`
          UPDATE users 
          SET role = 'superadmin'
          WHERE email = 'admin@7care.com'
        `;
        console.log('✅ Usuário admin@7care.com atualizado para superadmin!\n');
      } else {
        console.log('⚠️  Usuário admin@7care.com não encontrado. Será criado no próximo passo.\n');
      }
    }

    // 7. Associar pastores ao distrito de Santana do Livramento
    if (defaultDistrictId) {
      console.log('📋 Passo 7: Associando pastores ao distrito de Santana do Livramento...');
      const associatedPastors = await sql`
        UPDATE users 
        SET district_id = ${defaultDistrictId}
        WHERE role = 'pastor' AND district_id IS NULL
        RETURNING id, name
      `;
      console.log(`✅ ${associatedPastors.length} pastores associados ao distrito de Santana do Livramento!\n`);
    }

    // 8. Associar igrejas ao distrito de Santana do Livramento
    if (defaultDistrictId) {
      console.log('📋 Passo 8: Associando igrejas ao distrito de Santana do Livramento...');
      const associatedChurches = await sql`
        UPDATE churches 
        SET district_id = ${defaultDistrictId}
        WHERE district_id IS NULL
        RETURNING id, name
      `;
      console.log(`✅ ${associatedChurches.length} igrejas associadas ao distrito de Santana do Livramento!\n`);
    }

    // 9. Criar índices para melhorar performance
    console.log('📋 Passo 9: Criando índices...');
    await sql`CREATE INDEX IF NOT EXISTS idx_users_district_id ON users(district_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_churches_district_id ON churches(district_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_districts_pastor_id ON districts(pastor_id)`;
    console.log('✅ Índices criados!\n');

    console.log('🎉 Migração de roles e distritos concluída com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   - Tabela districts criada`);
    console.log(`   - Colunas district_id adicionadas`);
    console.log(`   - Distrito de Santana do Livramento criado (ID: ${defaultDistrictId})`);
    console.log(`   - ${updatedAdmins.length} admins convertidos para pastores`);
    console.log(`   - admin@7care.com convertido para superadmin`);
    console.log(`   - Todas as igrejas associadas ao distrito de Santana do Livramento`);

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar migração
migrateRoles()
  .then(() => {
    console.log('\n✅ Migração executada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar migração:', error);
    process.exit(1);
  });

