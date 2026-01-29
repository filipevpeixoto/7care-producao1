import { db } from './neonConfig';

export async function migrateToNeon() {
  console.log('🚀 Iniciando migração para Neon Database...');

  try {
    // Criar tabelas
    console.log('📋 Criando tabelas...');

    // Tabela de usuários
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        church TEXT,
        church_code TEXT,
        departments TEXT,
        birth_date DATE,
        civil_status TEXT,
        occupation TEXT,
        education TEXT,
        address TEXT,
        baptism_date DATE,
        previous_religion TEXT,
        biblical_instructor TEXT,
        interested_situation TEXT,
        is_donor BOOLEAN DEFAULT FALSE,
        is_tither BOOLEAN DEFAULT FALSE,
        is_approved BOOLEAN DEFAULT FALSE,
        points INTEGER DEFAULT 0,
        level TEXT DEFAULT 'Iniciante',
        attendance INTEGER DEFAULT 0,
        extra_data JSONB,
        observations TEXT,
        first_access BOOLEAN DEFAULT TRUE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de igrejas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS churches (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code VARCHAR(10) NOT NULL UNIQUE,
        address TEXT,
        email TEXT,
        phone TEXT,
        pastor TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de eventos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        location TEXT,
        type TEXT NOT NULL,
        capacity INTEGER,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurrence_pattern TEXT,
        created_by INTEGER REFERENCES users(id),
        church_id INTEGER REFERENCES churches(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de relacionamentos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS relationships (
        id SERIAL PRIMARY KEY,
        interested_id INTEGER REFERENCES users(id),
        missionary_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de reuniões
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        location TEXT,
        type TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        church_id INTEGER REFERENCES churches(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de conversas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT,
        type TEXT DEFAULT 'private',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de mensagens
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        sender_id INTEGER REFERENCES users(id),
        conversation_id INTEGER REFERENCES conversations(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de notificações
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de solicitações de discipulado
    await db.execute(`
      CREATE TABLE IF NOT EXISTS discipleship_requests (
        id SERIAL PRIMARY KEY,
        interested_id INTEGER REFERENCES users(id),
        missionary_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de perfis missionários
    await db.execute(`
      CREATE TABLE IF NOT EXISTS missionary_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        specialization TEXT,
        experience TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de check-ins emocionais
    await db.execute(`
      CREATE TABLE IF NOT EXISTS emotional_checkins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        emotional_score INTEGER,
        mood TEXT,
        prayer_request TEXT,
        notes TEXT,
        is_private BOOLEAN DEFAULT FALSE,
        allow_church_members BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Adicionar colunas faltantes se tabela já existir
    await db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emotional_checkins' AND column_name = 'emotional_score') THEN
          ALTER TABLE emotional_checkins ADD COLUMN emotional_score INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emotional_checkins' AND column_name = 'prayer_request') THEN
          ALTER TABLE emotional_checkins ADD COLUMN prayer_request TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emotional_checkins' AND column_name = 'is_private') THEN
          ALTER TABLE emotional_checkins ADD COLUMN is_private BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emotional_checkins' AND column_name = 'allow_church_members') THEN
          ALTER TABLE emotional_checkins ADD COLUMN allow_church_members BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emotional_checkins' AND column_name = 'updated_at') THEN
          ALTER TABLE emotional_checkins ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        END IF;
      END $$;
    `);

    // Tabela de configurações de pontos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS point_configs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        value INTEGER NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de conquistas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        points_required INTEGER NOT NULL,
        icon TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de atividades de pontos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS point_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        activity TEXT NOT NULL,
        points INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de configurações do sistema
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de configurações do sistema (settings)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de participantes de eventos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id),
        user_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'registered',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de tipos de reunião
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meeting_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de conquistas do usuário
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        achievement_id INTEGER REFERENCES achievements(id),
        earned_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de histórico de pontos do usuário
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de orações
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prayers (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        requester_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'active',
        is_private BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de intercessores de oração
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prayer_intercessors (
        id SERIAL PRIMARY KEY,
        prayer_id INTEGER REFERENCES prayers(id),
        user_id INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de sessões de vídeo
    await db.execute(`
      CREATE TABLE IF NOT EXISTS video_call_sessions (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        host_id INTEGER REFERENCES users(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status TEXT DEFAULT 'scheduled',
        meeting_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela de participantes de vídeo
    await db.execute(`
      CREATE TABLE IF NOT EXISTS video_call_participants (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES video_call_sessions(id),
        user_id INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP
      );
    `);

    // Tabela de participantes de conversas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id),
        user_id INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Tabelas criadas com sucesso!');

    // Criar super administrador se não existir
    console.log('👤 Verificando super administrador...');

    const existingAdmin = await db.execute(`
      SELECT id FROM users WHERE email = 'admin@7care.com' LIMIT 1
    `);

    if (existingAdmin.rows.length === 0) {
      console.log('🔐 Criando super administrador...');

      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('meu7care', 10);

      const extraData = JSON.stringify({
        superAdmin: true,
        permanent: true,
        engajamento: 'alto',
        classificacao: 'frequente',
        dizimistaType: 'recorrente',
        ofertanteType: 'recorrente',
        tempoBatismoAnos: 10,
        nomeUnidade: 'Administração',
        comunhao: 5,
        missao: 5,
        estudoBiblico: 5,
        totalPresenca: 100,
        batizouAlguem: true,
        discPosBatismal: 3,
        cpfValido: true,
        camposVaziosACMS: false,
      });

      await db.execute(`
        INSERT INTO users (
          name, email, password, role, church, church_code, departments,
          birth_date, civil_status, occupation, education, address, baptism_date,
          previous_religion, biblical_instructor, interested_situation,
          is_donor, is_tither, is_approved, points, level, attendance,
          extra_data, observations, first_access, status
        ) VALUES (
          'Super Administrador', 'admin@7care.com', '${hashedPassword}', 'admin', 'Sistema', 'SYS', 'Administração',
          '1990-01-01', 'Solteiro', 'Administrador do Sistema', 'Superior', 'Sistema', '1990-01-01',
          'N/A', 'N/A', 'N/A',
          false, false, true, 1000, 'Super Admin', 100,
          '${extraData}', 'Super administrador permanente do sistema', false, 'approved'
        )
      `);

      console.log('✅ Super administrador criado!');
    } else {
      console.log('✅ Super administrador já existe!');
    }

    console.log('🎉 Migração para Neon Database concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}
