import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Carregar variáveis de ambiente
config();

const sql = neon(process.env.DATABASE_URL!);

async function migrateExtraDataToColumns() {
  console.log('🚀 Iniciando migração de extra_data para colunas separadas...\n');

  try {
    // 1. Adicionar novas colunas na tabela users
    console.log('📋 Passo 1: Adicionando novas colunas...');
    
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS engajamento TEXT,
      ADD COLUMN IF NOT EXISTS classificacao TEXT,
      ADD COLUMN IF NOT EXISTS dizimista_type TEXT,
      ADD COLUMN IF NOT EXISTS ofertante_type TEXT,
      ADD COLUMN IF NOT EXISTS tempo_batismo_anos INTEGER,
      ADD COLUMN IF NOT EXISTS departamentos_cargos TEXT,
      ADD COLUMN IF NOT EXISTS nome_unidade TEXT,
      ADD COLUMN IF NOT EXISTS tem_licao BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS total_presenca INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS comunhao INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS missao INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS estudo_biblico INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS batizou_alguem BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS disc_pos_batismal INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cpf_valido BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS campos_vazios BOOLEAN DEFAULT true
    `;
    
    console.log('✅ Colunas adicionadas com sucesso!\n');

    // 2. Buscar todos os usuários
    console.log('📋 Passo 2: Buscando usuários...');
    const users = await sql`SELECT id, name, extra_data FROM users WHERE role != 'admin'`;
    console.log(`✅ ${users.length} usuários encontrados\n`);

    // 3. Migrar dados de cada usuário
    console.log('📋 Passo 3: Migrando dados do extra_data para colunas...');
    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        let extraData: any = {};
        
        // Parsear extra_data
        if (user.extra_data) {
          if (typeof user.extra_data === 'string') {
            extraData = JSON.parse(user.extra_data);
          } else {
            extraData = user.extra_data;
          }
        }

        // Se não tem dados relevantes, pular
        if (!extraData.engajamento && !extraData.classificacao) {
          skippedCount++;
          continue;
        }

        // Preparar valores (tratar 'Sim'/'Não' como boolean)
        const temLicao = extraData.temLicao === true || extraData.temLicao === 'Sim';
        const batizouAlguem = extraData.batizouAlguem === 'Sim' || extraData.batizouAlguem === true;
        const cpfValido = extraData.cpfValido === 'Sim' || extraData.cpfValido === true;
        const camposVazios = !(extraData.camposVazios === 0 || extraData.camposVazios === false || extraData.camposVazios === '0');

        // Atualizar usuário
        await sql`
          UPDATE users SET
            engajamento = ${extraData.engajamento || null},
            classificacao = ${extraData.classificacao || null},
            dizimista_type = ${extraData.dizimistaType || null},
            ofertante_type = ${extraData.ofertanteType || null},
            tempo_batismo_anos = ${extraData.tempoBatismoAnos || null},
            departamentos_cargos = ${extraData.departamentosCargos || null},
            nome_unidade = ${extraData.nomeUnidade || null},
            tem_licao = ${temLicao},
            total_presenca = ${extraData.totalPresenca || 0},
            comunhao = ${extraData.comunhao || 0},
            missao = ${extraData.missao || 0},
            estudo_biblico = ${extraData.estudoBiblico || 0},
            batizou_alguem = ${batizouAlguem},
            disc_pos_batismal = ${extraData.discPosBatismal || 0},
            cpf_valido = ${cpfValido},
            campos_vazios = ${camposVazios}
          WHERE id = ${user.id}
        `;

        migratedCount++;
        
        if (migratedCount % 50 === 0) {
          console.log(`   ✓ ${migratedCount} usuários migrados...`);
        }

      } catch (error) {
        console.error(`   ❌ Erro ao migrar usuário ${user.name}:`, error);
      }
    }

    console.log(`\n✅ Migração concluída!`);
    console.log(`   📊 ${migratedCount} usuários migrados`);
    console.log(`   ⏭️  ${skippedCount} usuários pulados (sem dados)`);

    // 4. Criar índices para melhorar performance
    console.log('\n📋 Passo 4: Criando índices...');
    
    await sql`CREATE INDEX IF NOT EXISTS idx_users_engajamento ON users(engajamento)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_classificacao ON users(classificacao)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_dizimista_type ON users(dizimista_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_tempo_batismo_anos ON users(tempo_batismo_anos)`;
    
    console.log('✅ Índices criados!\n');

    console.log('🎉 Migração completa com sucesso!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar migração
migrateExtraDataToColumns()
  .then(() => {
    console.log('\n✅ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });

