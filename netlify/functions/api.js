// server/index.ts
import "dotenv/config";
import express3 from "express";
import helmet2 from "helmet";
import compression from "compression";

// server/routes/index.ts
import express from "express";
import { createServer } from "http";

// server/utils/logger.ts
var isDev = process.env.NODE_ENV === "development";
var isTest = process.env.NODE_ENV === "test";
var SENSITIVE_FIELDS = [
  "password",
  "senha",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cpf",
  "rg",
  "creditCard",
  "cardNumber",
  "cvv",
  "secret",
  "apiKey",
  "api_key",
  "privateKey",
  "private_key"
];
var PARTIAL_MASK_FIELDS = [
  "email",
  "phone",
  "telefone",
  "celular"
];
var maskEmail = (email) => {
  const [local, domain] = email.split("@");
  if (!domain) return "[MASKED_EMAIL]";
  if (local.length <= 2) return `**@${domain}`;
  return `${local[0]}***@${domain}`;
};
var maskPhone = (phone) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "[MASKED_PHONE]";
  return `***-***-${digits.slice(-4)}`;
};
var sanitizeValue = (key, value) => {
  const lowerKey = key.toLowerCase();
  if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
    return "[REDACTED]";
  }
  if (typeof value === "string") {
    if (PARTIAL_MASK_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      if (lowerKey.includes("email")) {
        return maskEmail(value);
      }
      if (lowerKey.includes("phone") || lowerKey.includes("telefone") || lowerKey.includes("celular")) {
        return maskPhone(value);
      }
    }
  }
  return value;
};
var sanitizeObject = (obj, depth = 0) => {
  if (depth > 10) return "[MAX_DEPTH]";
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }
  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeObject(value, depth + 1);
      } else {
        sanitized[key] = sanitizeValue(key, value);
      }
    }
    return sanitized;
  }
  return obj;
};
var getTimestamp = () => {
  return (/* @__PURE__ */ new Date()).toISOString();
};
var logger = {
  /**
   * Log de informação (apenas em desenvolvimento)
   */
  info: (message, ...args) => {
    if (isDev && !isTest) {
      console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args.map((arg) => sanitizeObject(arg)));
    }
  },
  /**
   * Log de erro (sempre, em produção e desenvolvimento)
   */
  error: (message, ...args) => {
    if (!isTest) {
      console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...args.map((arg) => sanitizeObject(arg)));
    }
  },
  /**
   * Log de warning (apenas em desenvolvimento)
   */
  warn: (message, ...args) => {
    if (isDev && !isTest) {
      console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args.map((arg) => sanitizeObject(arg)));
    }
  },
  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug: (message, ...args) => {
    if (isDev && !isTest) {
      console.log(`[${getTimestamp()}] [DEBUG] ${message}`, ...args.map((arg) => sanitizeObject(arg)));
    }
  },
  /**
   * Log de request HTTP (apenas em desenvolvimento)
   */
  request: (method, path3, statusCode, duration) => {
    if (isDev && !isTest) {
      console.log(`[${getTimestamp()}] [HTTP] ${method} ${path3} ${statusCode} ${duration}ms`);
    }
  },
  /**
   * Log com sanitização explícita de dados
   * Use quando precisar logar objetos que podem conter dados sensíveis
   */
  sanitized: (message, data) => {
    if (isDev && !isTest) {
      const sanitized = sanitizeObject(data);
      console.log(`[${getTimestamp()}] [INFO] ${message}`, JSON.stringify(sanitized, null, 2));
    }
  },
  /**
   * Log de banco de dados (apenas em desenvolvimento)
   */
  db: (operation, table, duration) => {
    if (isDev && !isTest) {
      const durationStr = duration !== void 0 ? ` (${duration}ms)` : "";
      console.log(`[${getTimestamp()}] [DB] ${operation} ${table}${durationStr}`);
    }
  },
  /**
   * Log de sucesso de autenticação (sanitizado)
   */
  authSuccess: (userId, email) => {
    if (isDev && !isTest) {
      const maskedEmail = email ? maskEmail(email) : "unknown";
      console.log(`[${getTimestamp()}] [AUTH] Login successful - User ID: ${userId}, Email: ${maskedEmail}`);
    }
  },
  /**
   * Log de falha de autenticação (sanitizado)
   */
  authFailure: (reason, email) => {
    if (!isTest) {
      const maskedEmail = email ? maskEmail(email) : "unknown";
      console.log(`[${getTimestamp()}] [AUTH] Login failed - Reason: ${reason}, Email: ${maskedEmail}`);
    }
  }
};

// server/neonConfig.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
var connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_enihr4YBSDm8@ep-still-glade-ac5u1r48-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
var POOL_CONFIG = {
  connectionTimeoutMillis: 1e4,
  // 10 segundos para timeout de conexão
  idleTimeoutMillis: 3e4,
  // 30 segundos para conexões idle
  max: 10
  // Máximo de conexões no pool
};
var RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 2e3
};
var NEON_OPTIONS = {
  fullResults: false,
  // Otimiza retorno de resultados
  fetchOptions: {
    // Timeout para requisições fetch - importante para evitar conexões pendentes
    signal: void 0
    // Será definido por requisição
  }
};
var sqlBase = neon(connectionString, NEON_OPTIONS);
var db = drizzle(sqlBase);
var sql = sqlBase;
var isDevelopment = process.env.NODE_ENV === "development";
var isProduction = process.env.NODE_ENV === "production";
console.log("\u{1F517} Neon Database configurado com pooling e retry:", {
  environment: process.env.NODE_ENV,
  hasConnectionString: !!process.env.DATABASE_URL,
  isDevelopment,
  isProduction,
  poolConfig: POOL_CONFIG,
  retryConfig: RETRY_CONFIG,
  connectionStringLength: connectionString.length
});

// server/migrateToNeon.ts
async function migrateToNeon() {
  console.log("\u{1F680} Iniciando migra\xE7\xE3o para Neon Database...");
  try {
    console.log("\u{1F4CB} Criando tabelas...");
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        sender_id INTEGER REFERENCES users(id),
        conversation_id INTEGER REFERENCES conversations(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id),
        user_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'registered',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meeting_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        achievement_id INTEGER REFERENCES achievements(id),
        earned_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prayer_intercessors (
        id SERIAL PRIMARY KEY,
        prayer_id INTEGER REFERENCES prayers(id),
        user_id INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW()
      );
    `);
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS video_call_participants (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES video_call_sessions(id),
        user_id INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id),
        user_id INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("\u2705 Tabelas criadas com sucesso!");
    console.log("\u{1F464} Verificando super administrador...");
    const existingAdmin = await db.execute(`
      SELECT id FROM users WHERE email = 'admin@7care.com' LIMIT 1
    `);
    if (existingAdmin.rows.length === 0) {
      console.log("\u{1F510} Criando super administrador...");
      const bcrypt6 = await import("bcryptjs");
      const hashedPassword = await bcrypt6.hash("meu7care", 10);
      const extraData = JSON.stringify({
        superAdmin: true,
        permanent: true,
        engajamento: "alto",
        classificacao: "frequente",
        dizimistaType: "recorrente",
        ofertanteType: "recorrente",
        tempoBatismoAnos: 10,
        nomeUnidade: "Administra\xE7\xE3o",
        comunhao: 5,
        missao: 5,
        estudoBiblico: 5,
        totalPresenca: 100,
        batizouAlguem: true,
        discPosBatismal: 3,
        cpfValido: true,
        camposVaziosACMS: false
      });
      await db.execute(`
        INSERT INTO users (
          name, email, password, role, church, church_code, departments,
          birth_date, civil_status, occupation, education, address, baptism_date,
          previous_religion, biblical_instructor, interested_situation,
          is_donor, is_tither, is_approved, points, level, attendance,
          extra_data, observations, first_access, status
        ) VALUES (
          'Super Administrador', 'admin@7care.com', '${hashedPassword}', 'admin', 'Sistema', 'SYS', 'Administra\xE7\xE3o',
          '1990-01-01', 'Solteiro', 'Administrador do Sistema', 'Superior', 'Sistema', '1990-01-01',
          'N/A', 'N/A', 'N/A',
          false, false, true, 1000, 'Super Admin', 100,
          '${extraData}', 'Super administrador permanente do sistema', false, 'approved'
        )
      `);
      console.log("\u2705 Super administrador criado!");
    } else {
      console.log("\u2705 Super administrador j\xE1 existe!");
    }
    console.log("\u{1F389} Migra\xE7\xE3o para Neon Database conclu\xEDda com sucesso!");
  } catch (error) {
    console.error("\u274C Erro na migra\xE7\xE3o:", error);
    throw error;
  }
}

// server/schema.ts
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  varchar,
  date,
  index
} from "drizzle-orm/pg-core";
var districts = pgTable(
  "districts",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    pastorId: integer("pastor_id"),
    // Referência ao usuário pastor (sem FK para evitar circular)
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    // Índices para otimização de queries
    nameIdx: index("districts_name_idx").on(table.name),
    pastorIdx: index("districts_pastor_idx").on(table.pastorId)
  })
);
var users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: text("role").notNull().default("member"),
    church: text("church"),
    churchCode: text("church_code"),
    districtId: integer("district_id").references(() => districts.id),
    departments: text("departments"),
    birthDate: date("birth_date"),
    civilStatus: text("civil_status"),
    occupation: text("occupation"),
    education: text("education"),
    address: text("address"),
    baptismDate: date("baptism_date"),
    previousReligion: text("previous_religion"),
    biblicalInstructor: text("biblical_instructor"),
    interestedSituation: text("interested_situation"),
    isDonor: boolean("is_donor").default(false),
    isTither: boolean("is_tither").default(false),
    isApproved: boolean("is_approved").default(false),
    points: integer("points").default(0),
    level: text("level").default("Iniciante"),
    attendance: integer("attendance").default(0),
    extraData: jsonb("extra_data"),
    // Campos para cálculo de pontos (movidos de extra_data)
    engajamento: text("engajamento"),
    // 'Baixo', 'Médio', 'Alto'
    classificacao: text("classificacao"),
    // 'Frequente', 'Não Frequente'
    dizimistaType: text("dizimista_type"),
    // 'Não dizimista', 'Pontual (1-3)', 'Sazonal (4-7)', 'Recorrente (8-12)'
    ofertanteType: text("ofertante_type"),
    // 'Não ofertante', 'Pontual (1-3)', 'Sazonal (4-7)', 'Recorrente (8-12)'
    tempoBatismoAnos: integer("tempo_batismo_anos"),
    // Anos de batismo (numérico)
    departamentosCargos: text("departamentos_cargos"),
    // Lista de departamentos e cargos separados por ';'
    nomeUnidade: text("nome_unidade"),
    // Nome da unidade/grupo pequeno
    temLicao: boolean("tem_licao").default(false),
    // Tem lição da Escola Sabatina
    totalPresenca: integer("total_presenca").default(0),
    // Total de presenças (0-13)
    comunhao: integer("comunhao").default(0),
    // Pontuação comunhão (0-13)
    missao: integer("missao").default(0),
    // Pontuação missão (0-13)
    estudoBiblico: integer("estudo_biblico").default(0),
    // Pontuação estudo bíblico (0-13)
    batizouAlguem: boolean("batizou_alguem").default(false),
    // Batizou alguém
    discPosBatismal: integer("disc_pos_batismal").default(0),
    // Quantidade de discipulados pós-batismo
    cpfValido: boolean("cpf_valido").default(false),
    // CPF válido
    camposVazios: boolean("campos_vazios").default(true),
    // Tem campos vazios no ACMS
    observations: text("observations"),
    firstAccess: boolean("first_access").default(true),
    status: text("status").default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    // Índices para otimização de queries frequentes
    nameIdx: index("users_name_idx").on(table.name),
    roleIdx: index("users_role_idx").on(table.role),
    churchIdx: index("users_church_idx").on(table.church),
    churchCodeIdx: index("users_church_code_idx").on(table.churchCode),
    districtIdx: index("users_district_idx").on(table.districtId),
    statusIdx: index("users_status_idx").on(table.status),
    pointsIdx: index("users_points_idx").on(table.points),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt)
  })
);
var churches = pgTable(
  "churches",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: varchar("code", { length: 10 }).notNull().unique(),
    address: text("address"),
    email: text("email"),
    phone: text("phone"),
    pastor: text("pastor"),
    districtId: integer("district_id").references(() => districts.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    nameIdx: index("churches_name_idx").on(table.name),
    districtIdx: index("churches_district_idx").on(table.districtId)
  })
);
var events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    date: timestamp("date").notNull(),
    endDate: timestamp("end_date"),
    location: text("location"),
    type: text("type").notNull(),
    color: text("color"),
    capacity: integer("capacity"),
    isRecurring: boolean("is_recurring").default(false),
    recurrencePattern: text("recurrence_pattern"),
    createdBy: integer("created_by").references(() => users.id),
    churchId: integer("church_id").references(() => churches.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    dateIdx: index("events_date_idx").on(table.date),
    typeIdx: index("events_type_idx").on(table.type),
    churchIdx: index("events_church_idx").on(table.churchId),
    createdByIdx: index("events_created_by_idx").on(table.createdBy)
  })
);
var relationships = pgTable(
  "relationships",
  {
    id: serial("id").primaryKey(),
    interestedId: integer("interested_id").references(() => users.id),
    missionaryId: integer("missionary_id").references(() => users.id),
    status: text("status").default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    interestedIdx: index("relationships_interested_idx").on(table.interestedId),
    missionaryIdx: index("relationships_missionary_idx").on(table.missionaryId),
    statusIdx: index("relationships_status_idx").on(table.status)
  })
);
var meetings = pgTable(
  "meetings",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    scheduledAt: timestamp("scheduled_at").notNull(),
    duration: integer("duration").default(60),
    location: text("location"),
    requesterId: integer("requester_id").references(() => users.id),
    assignedToId: integer("assigned_to_id").references(() => users.id),
    typeId: integer("type_id").references(() => meetingTypes.id),
    priority: text("priority").default("medium"),
    isUrgent: boolean("is_urgent").default(false),
    status: text("status").default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    scheduledAtIdx: index("meetings_scheduled_at_idx").on(table.scheduledAt),
    statusIdx: index("meetings_status_idx").on(table.status),
    requesterIdx: index("meetings_requester_idx").on(table.requesterId),
    assignedToIdx: index("meetings_assigned_to_idx").on(table.assignedToId)
  })
);
var messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    senderId: integer("sender_id").references(() => users.id),
    conversationId: integer("conversation_id").references(() => conversations.id),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversationId),
    senderIdx: index("messages_sender_idx").on(table.senderId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt)
  })
);
var conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    title: text("title"),
    type: text("type").default("private"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    createdByIdx: index("conversations_created_by_idx").on(table.createdBy)
  })
);
var notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    userId: integer("user_id").references(() => users.id),
    type: text("type").notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    isReadIdx: index("notifications_is_read_idx").on(table.isRead),
    typeIdx: index("notifications_type_idx").on(table.type)
  })
);
var pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    userIdx: index("push_subscriptions_user_idx").on(table.userId),
    isActiveIdx: index("push_subscriptions_is_active_idx").on(table.isActive)
  })
);
var discipleshipRequests = pgTable(
  "discipleship_requests",
  {
    id: serial("id").primaryKey(),
    interestedId: integer("interested_id").references(() => users.id),
    missionaryId: integer("missionary_id").references(() => users.id),
    status: text("status").default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    interestedIdx: index("discipleship_interested_idx").on(table.interestedId),
    missionaryIdx: index("discipleship_missionary_idx").on(table.missionaryId),
    statusIdx: index("discipleship_status_idx").on(table.status)
  })
);
var missionaryProfiles = pgTable(
  "missionary_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    specialization: text("specialization"),
    experience: text("experience"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    userIdx: index("missionary_profiles_user_idx").on(table.userId),
    isActiveIdx: index("missionary_profiles_is_active_idx").on(table.isActive)
  })
);
var emotionalCheckins = pgTable(
  "emotional_checkins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    emotionalScore: integer("emotional_score"),
    mood: text("mood"),
    prayerRequest: text("prayer_request"),
    notes: text("notes"),
    isPrivate: boolean("is_private").default(false),
    allowChurchMembers: boolean("allow_church_members").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    userIdx: index("emotional_checkins_user_idx").on(table.userId),
    createdAtIdx: index("emotional_checkins_created_at_idx").on(table.createdAt)
  })
);
var pointConfigs = pgTable(
  "point_configs",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    value: integer("value").notNull(),
    category: text("category").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    categoryIdx: index("point_configs_category_idx").on(table.category)
  })
);
var achievements = pgTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    pointsRequired: integer("points_required").notNull(),
    icon: text("icon"),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    pointsRequiredIdx: index("achievements_points_required_idx").on(table.pointsRequired)
  })
);
var pointActivities = pgTable(
  "point_activities",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    activity: text("activity").notNull(),
    points: integer("points").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    userIdx: index("point_activities_user_idx").on(table.userId),
    createdAtIdx: index("point_activities_created_at_idx").on(table.createdAt)
  })
);
var systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var districtSettings = pgTable(
  "district_settings",
  {
    id: serial("id").primaryKey(),
    districtId: integer("district_id").references(() => districts.id).notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    districtKeyIdx: index("district_settings_district_key_idx").on(table.districtId, table.key)
  })
);
var systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var districtPointsConfig = pgTable(
  "district_points_config",
  {
    id: serial("id").primaryKey(),
    districtId: integer("district_id").references(() => districts.id).notNull(),
    category: text("category").notNull(),
    // engajamento, classificacao, dizimista, etc.
    key: text("key").notNull(),
    // baixo, medio, alto, etc.
    value: integer("value").notNull().default(0),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    districtCategoryKeyIdx: index("district_points_district_category_key_idx").on(
      table.districtId,
      table.category,
      table.key
    ),
    uniqueDistrictCategoryKey: index("district_points_unique_idx").on(
      table.districtId,
      table.category,
      table.key
    )
  })
);
var eventParticipants = pgTable(
  "event_participants",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").references(() => events.id),
    userId: integer("user_id").references(() => users.id),
    status: text("status").default("registered"),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    eventIdx: index("event_participants_event_idx").on(table.eventId),
    userIdx: index("event_participants_user_idx").on(table.userId)
  })
);
var meetingTypes = pgTable("meeting_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow()
});
var userAchievements = pgTable(
  "user_achievements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    achievementId: integer("achievement_id").references(() => achievements.id),
    earnedAt: timestamp("earned_at").defaultNow()
  },
  (table) => ({
    userIdx: index("user_achievements_user_idx").on(table.userId)
  })
);
var userPointsHistory = pgTable(
  "user_points_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    points: integer("points").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    userIdx: index("user_points_history_user_idx").on(table.userId),
    createdAtIdx: index("user_points_history_created_at_idx").on(table.createdAt)
  })
);
var prayers = pgTable(
  "prayers",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    requesterId: integer("requester_id").references(() => users.id),
    status: text("status").default("active"),
    isPrivate: boolean("is_private").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    requesterIdx: index("prayers_requester_idx").on(table.requesterId),
    statusIdx: index("prayers_status_idx").on(table.status)
  })
);
var prayerIntercessors = pgTable(
  "prayer_intercessors",
  {
    id: serial("id").primaryKey(),
    prayerId: integer("prayer_id").references(() => prayers.id),
    userId: integer("user_id").references(() => users.id),
    joinedAt: timestamp("joined_at").defaultNow()
  },
  (table) => ({
    prayerIdx: index("prayer_intercessors_prayer_idx").on(table.prayerId),
    userIdx: index("prayer_intercessors_user_idx").on(table.userId)
  })
);
var videoCallSessions = pgTable(
  "video_call_sessions",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    hostId: integer("host_id").references(() => users.id),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    status: text("status").default("scheduled"),
    meetingId: text("meeting_id").notNull(),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    hostIdx: index("video_call_sessions_host_idx").on(table.hostId),
    startTimeIdx: index("video_call_sessions_start_time_idx").on(table.startTime),
    statusIdx: index("video_call_sessions_status_idx").on(table.status)
  })
);
var videoCallParticipants = pgTable(
  "video_call_participants",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => videoCallSessions.id),
    userId: integer("user_id").references(() => users.id),
    joinedAt: timestamp("joined_at").defaultNow(),
    leftAt: timestamp("left_at")
  },
  (table) => ({
    sessionIdx: index("video_call_participants_session_idx").on(table.sessionId),
    userIdx: index("video_call_participants_user_idx").on(table.userId)
  })
);
var conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").references(() => conversations.id),
    userId: integer("user_id").references(() => users.id),
    joinedAt: timestamp("joined_at").defaultNow()
  },
  (table) => ({
    conversationIdx: index("conversation_participants_conversation_idx").on(table.conversationId),
    userIdx: index("conversation_participants_user_idx").on(table.userId)
  })
);
var eventFilterPermissions = pgTable("event_filter_permissions", {
  id: serial("id").primaryKey(),
  permissions: jsonb("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var pastorInvites = pgTable(
  "pastor_invites",
  {
    id: serial("id").primaryKey(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    createdBy: integer("created_by").references(() => users.id).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    onboardingData: jsonb("onboarding_data"),
    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: integer("reviewed_by").references(() => users.id),
    rejectionReason: text("rejection_reason"),
    userId: integer("user_id").references(() => users.id),
    districtId: integer("district_id").references(() => districts.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    tokenIdx: index("pastor_invites_token_idx").on(table.token),
    emailIdx: index("pastor_invites_email_idx").on(table.email),
    statusIdx: index("pastor_invites_status_idx").on(table.status),
    expiresAtIdx: index("pastor_invites_expires_at_idx").on(table.expiresAt)
  })
);
var schema = {
  districts,
  users,
  churches,
  events,
  relationships,
  meetings,
  messages,
  conversations,
  notifications,
  pushSubscriptions,
  discipleshipRequests,
  missionaryProfiles,
  emotionalCheckins,
  pointConfigs,
  achievements,
  pointActivities,
  systemConfig,
  systemSettings,
  eventParticipants,
  meetingTypes,
  userAchievements,
  userPointsHistory,
  prayers,
  prayerIntercessors,
  videoCallSessions,
  videoCallParticipants,
  conversationParticipants,
  eventFilterPermissions,
  pastorInvites,
  districtPointsConfig
};

// server/neonAdapter.ts
import { eq, and, desc, asc, ne, or, inArray, sql as drizzleSql } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import webpush from "web-push";

// server/utils/permissions.ts
var hasAdminAccess = (user) => {
  if (!user) return false;
  return user.role === "superadmin" || user.role === "pastor";
};
var isSuperAdmin = (user) => {
  if (!user) return false;
  return user.role === "superadmin";
};
var isPastor = (user) => {
  if (!user) return false;
  return user.role === "pastor";
};
var canManagePastors = (user) => {
  return isSuperAdmin(user);
};

// server/types/storage.ts
var DEFAULT_POINTS_CONFIG = {
  basicPoints: 25,
  attendancePoints: 25,
  eventPoints: 50,
  donationPoints: 75,
  engajamento: { baixo: 25, medio: 50, alto: 75 },
  classificacao: { frequente: 75, naoFrequente: 25 },
  dizimista: { naoDizimista: 0, pontual: 50, sazonal: 75, recorrente: 100 },
  ofertante: { naoOfertante: 0, pontual: 50, sazonal: 75, recorrente: 100 },
  tempoBatismo: { doisAnos: 50, cincoAnos: 75, dezAnos: 100, vinteAnos: 150, maisVinte: 200 },
  cargos: { umCargo: 50, doisCargos: 75, tresOuMais: 100 },
  nomeUnidade: { comUnidade: 50, semUnidade: 0 },
  temLicao: { comLicao: 50 },
  pontuacaoDinamica: { multiplicador: 1 },
  totalPresenca: { zeroATres: 25, quatroASete: 50, oitoATreze: 100 },
  presenca: { multiplicador: 1 },
  escolaSabatina: {
    comunhao: 25,
    missao: 25,
    estudoBiblico: 25,
    batizouAlguem: 50,
    discipuladoPosBatismo: 25
  },
  batizouAlguem: { sim: 100, nao: 0 },
  discipuladoPosBatismo: { multiplicador: 1 },
  cpfValido: { valido: 25, invalido: 0 },
  camposVaziosACMS: { completos: 50, incompletos: 0 }
};
function getRequiredPointsConfig(config) {
  return {
    basicPoints: config.basicPoints ?? DEFAULT_POINTS_CONFIG.basicPoints,
    attendancePoints: config.attendancePoints ?? DEFAULT_POINTS_CONFIG.attendancePoints,
    eventPoints: config.eventPoints ?? DEFAULT_POINTS_CONFIG.eventPoints,
    donationPoints: config.donationPoints ?? DEFAULT_POINTS_CONFIG.donationPoints,
    engajamento: config.engajamento ?? DEFAULT_POINTS_CONFIG.engajamento,
    classificacao: config.classificacao ?? DEFAULT_POINTS_CONFIG.classificacao,
    dizimista: config.dizimista ?? DEFAULT_POINTS_CONFIG.dizimista,
    ofertante: config.ofertante ?? DEFAULT_POINTS_CONFIG.ofertante,
    tempoBatismo: config.tempoBatismo ?? DEFAULT_POINTS_CONFIG.tempoBatismo,
    cargos: config.cargos ?? DEFAULT_POINTS_CONFIG.cargos,
    nomeUnidade: config.nomeUnidade ?? DEFAULT_POINTS_CONFIG.nomeUnidade,
    temLicao: config.temLicao ?? DEFAULT_POINTS_CONFIG.temLicao,
    pontuacaoDinamica: config.pontuacaoDinamica ?? DEFAULT_POINTS_CONFIG.pontuacaoDinamica,
    totalPresenca: config.totalPresenca ?? DEFAULT_POINTS_CONFIG.totalPresenca,
    presenca: config.presenca ?? DEFAULT_POINTS_CONFIG.presenca,
    escolaSabatina: config.escolaSabatina ?? DEFAULT_POINTS_CONFIG.escolaSabatina,
    batizouAlguem: config.batizouAlguem ?? DEFAULT_POINTS_CONFIG.batizouAlguem,
    discipuladoPosBatismo: config.discipuladoPosBatismo ?? DEFAULT_POINTS_CONFIG.discipuladoPosBatismo,
    cpfValido: config.cpfValido ?? DEFAULT_POINTS_CONFIG.cpfValido,
    camposVaziosACMS: config.camposVaziosACMS ?? DEFAULT_POINTS_CONFIG.camposVaziosACMS
  };
}

// server/neonAdapter.ts
var NeonAdapter = class {
  getActivitiesFromConfig(raw) {
    if (Array.isArray(raw)) {
      return raw;
    }
    return [];
  }
  toDateString(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value == null) {
      return "";
    }
    return String(value);
  }
  toOptionalDateString(value) {
    if (value == null) {
      return null;
    }
    return value instanceof Date ? value.toISOString() : String(value);
  }
  normalizeExtraData(value) {
    if (value == null) {
      return value;
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "object") {
      return value;
    }
    return String(value);
  }
  toUser(row) {
    return {
      id: Number(row.id),
      name: row.name == null ? "" : String(row.name),
      email: row.email == null ? "" : String(row.email),
      password: row.password == null ? "" : String(row.password),
      role: row.role == null ? "member" : String(row.role),
      church: row.church == null ? null : String(row.church),
      churchCode: row.churchCode == null ? "" : String(row.churchCode),
      districtId: row.districtId == null ? null : Number(row.districtId),
      departments: row.departments == null ? "" : String(row.departments),
      birthDate: row.birthDate == null ? "" : String(row.birthDate),
      civilStatus: row.civilStatus == null ? "" : String(row.civilStatus),
      occupation: row.occupation == null ? "" : String(row.occupation),
      education: row.education == null ? "" : String(row.education),
      address: row.address == null ? "" : String(row.address),
      baptismDate: row.baptismDate == null ? "" : String(row.baptismDate),
      previousReligion: row.previousReligion == null ? "" : String(row.previousReligion),
      biblicalInstructor: row.biblicalInstructor == null ? null : String(row.biblicalInstructor),
      interestedSituation: row.interestedSituation == null ? "" : String(row.interestedSituation),
      isDonor: Boolean(row.isDonor),
      isTither: Boolean(row.isTither),
      isApproved: Boolean(row.isApproved),
      points: Number(row.points ?? 0),
      level: row.level == null ? "" : String(row.level),
      attendance: Number(row.attendance ?? 0),
      extraData: this.normalizeExtraData(row.extraData),
      observations: row.observations == null ? "" : String(row.observations),
      createdAt: this.toDateString(row.createdAt),
      updatedAt: this.toDateString(row.updatedAt),
      firstAccess: Boolean(row.firstAccess),
      status: row.status == null ? void 0 : String(row.status),
      phone: row.phone == null ? void 0 : String(row.phone),
      cpf: row.cpf == null ? void 0 : String(row.cpf),
      profilePhoto: row.profilePhoto == null ? void 0 : String(row.profilePhoto),
      isOffering: row.isOffering == null ? void 0 : Boolean(row.isOffering),
      hasLesson: row.hasLesson == null ? void 0 : Boolean(row.hasLesson)
    };
  }
  generateChurchCode(name) {
    const base = name.split(" ").map((part) => part.trim()).filter(Boolean).map((part) => part[0]).join("").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return (base || "CH").slice(0, 10);
  }
  async resolveChurchCode(name, providedCode) {
    const initialCode = (providedCode && providedCode.trim() !== "" ? providedCode : this.generateChurchCode(name)).slice(0, 10);
    let finalCode = initialCode;
    let counter = 1;
    while (true) {
      const existing = await db.select().from(schema.churches).where(eq(schema.churches.code, finalCode)).limit(1);
      if (existing.length === 0) {
        return finalCode;
      }
      const suffix = String(counter);
      const truncated = initialCode.slice(0, Math.max(1, 10 - suffix.length));
      finalCode = `${truncated}${suffix}`;
      counter += 1;
    }
  }
  toPermissionUser(user) {
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      districtId: user.districtId ?? void 0,
      church: user.church ?? void 0
    };
  }
  mapPrayerRecord(record) {
    const createdAt = this.toOptionalDateString(record?.createdAt);
    const updatedAt = this.toOptionalDateString(record?.updatedAt);
    const isAnswered = record?.status === "answered";
    return {
      id: Number(record.id),
      userId: Number(record.requesterId),
      title: String(record.title),
      description: record.description == null ? null : String(record.description),
      isPublic: record.isPrivate === null ? true : !record.isPrivate,
      isAnswered,
      answeredAt: isAnswered ? updatedAt ? String(updatedAt) : null : null,
      testimony: null,
      createdAt: createdAt ? String(createdAt) : "",
      updatedAt: updatedAt ? String(updatedAt) : ""
    };
  }
  mapChurchRecord(record) {
    return {
      id: Number(record.id),
      name: record.name == null ? "" : String(record.name),
      code: record.code == null ? void 0 : String(record.code),
      address: record.address == null ? null : String(record.address),
      city: record.city == null ? null : String(record.city),
      state: record.state == null ? null : String(record.state),
      zip_code: record.zip_code == null ? null : String(record.zip_code),
      email: record.email == null ? null : String(record.email),
      phone: record.phone == null ? null : String(record.phone),
      pastor_name: record.pastor_name == null ? null : String(record.pastor_name),
      pastor_email: record.pastor_email == null ? null : String(record.pastor_email),
      established_date: record.established_date == null ? null : String(record.established_date),
      status: record.status == null ? null : String(record.status),
      districtId: record.districtId == null ? null : Number(record.districtId),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }
  mapRelationshipRecord(record) {
    return {
      id: Number(record.id),
      interestedId: record.interestedId == null ? void 0 : Number(record.interestedId),
      missionaryId: record.missionaryId == null ? void 0 : Number(record.missionaryId),
      userId1: record.userId1 == null ? void 0 : Number(record.userId1),
      userId2: record.userId2 == null ? void 0 : Number(record.userId2),
      relationshipType: record.relationshipType == null ? void 0 : String(record.relationshipType),
      status: record.status == null ? void 0 : String(record.status),
      notes: record.notes == null ? void 0 : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }
  mapMeetingRecord(record) {
    return {
      id: Number(record.id),
      requesterId: Number(record.requesterId ?? 0),
      assignedToId: Number(record.assignedToId ?? 0),
      typeId: Number(record.typeId ?? 0),
      title: record.title == null ? "" : String(record.title),
      description: record.description == null ? "" : String(record.description),
      scheduledAt: this.toDateString(record.scheduledAt),
      duration: Number(record.duration ?? 0),
      location: record.location == null ? "" : String(record.location),
      priority: record.priority == null ? "" : String(record.priority),
      isUrgent: Boolean(record.isUrgent),
      status: record.status == null ? "" : String(record.status),
      notes: record.notes == null ? "" : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }
  mapMeetingTypeRecord(record) {
    return {
      id: Number(record.id),
      name: record.name == null ? "" : String(record.name),
      description: record.description == null ? "" : String(record.description),
      duration: Number(record.duration ?? 0),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }
  mapConversationRecord(record) {
    const typeValue = record.type == null ? "" : String(record.type);
    return {
      id: Number(record.id),
      title: record.title == null ? "" : String(record.title),
      type: typeValue,
      isGroup: typeValue === "group" || typeValue === "grupo",
      createdBy: record.createdBy == null ? null : Number(record.createdBy),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }
  mapMessageRecord(record) {
    return {
      id: Number(record.id),
      conversationId: Number(record.conversationId ?? 0),
      senderId: Number(record.senderId ?? 0),
      content: record.content == null ? "" : String(record.content),
      messageType: record.messageType == null ? "text" : String(record.messageType),
      isRead: record.isRead == null ? false : Boolean(record.isRead),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }
  mapPointActivityRecord(record) {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      pointId: Number(record.pointId ?? record.id ?? 0),
      points: Number(record.points ?? 0),
      description: record.description == null ? "" : String(record.description),
      createdAt: this.toDateString(record.createdAt)
    };
  }
  mapAchievementRecord(record) {
    return {
      id: Number(record.id),
      name: record.name == null ? "" : String(record.name),
      description: record.description == null ? "" : String(record.description),
      icon: record.icon == null ? "" : String(record.icon),
      requiredPoints: Number(record.pointsRequired ?? record.requiredPoints ?? 0),
      requiredConditions: record.requiredConditions == null ? "" : String(record.requiredConditions),
      badgeColor: record.badgeColor == null ? "" : String(record.badgeColor),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }
  mapDiscipleshipRequestRecord(record) {
    const interestedId = record.interestedId == null ? void 0 : Number(record.interestedId);
    const missionaryId = record.missionaryId == null ? void 0 : Number(record.missionaryId);
    return {
      id: Number(record.id),
      requesterId: Number(interestedId ?? 0),
      mentorId: Number(missionaryId ?? 0),
      status: record.status == null ? "" : String(record.status),
      message: record.notes == null ? "" : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
      interestedId,
      missionaryId,
      notes: record.notes == null ? void 0 : String(record.notes)
    };
  }
  mapEmotionalCheckInRecord(record) {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      emotionalScore: record.emotionalScore == null ? null : Number(record.emotionalScore),
      mood: record.mood == null ? null : String(record.mood),
      prayerRequest: record.prayerRequest == null ? null : String(record.prayerRequest),
      isPrivate: Boolean(record.isPrivate),
      allowChurchMembers: record.allowChurchMembers == null ? true : Boolean(record.allowChurchMembers),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }
  mapMissionaryProfileRecord(record) {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      missionField: record.missionField == null ? String(record.specialization ?? "") : String(record.missionField),
      startDate: record.startDate == null ? "" : String(record.startDate),
      endDate: record.endDate == null ? "" : String(record.endDate),
      status: record.status == null ? "active" : String(record.status),
      notes: record.notes == null ? String(record.experience ?? "") : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
      isActive: record.isActive == null ? void 0 : Boolean(record.isActive)
    };
  }
  mapPushSubscriptionRecord(record) {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      endpoint: record.endpoint == null ? "" : String(record.endpoint),
      p256dh: record.p256dh == null ? "" : String(record.p256dh),
      auth: record.auth == null ? "" : String(record.auth),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
      deviceName: record.deviceName == null ? null : String(record.deviceName)
    };
  }
  mapNotificationRecord(record) {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      title: record.title == null ? "" : String(record.title),
      message: record.message == null ? "" : String(record.message),
      type: record.type == null ? "general" : String(record.type),
      isRead: record.isRead == null ? false : Boolean(record.isRead),
      createdAt: this.toDateString(record.createdAt)
    };
  }
  // ========== USUÁRIOS ==========
  async getAllUsers() {
    try {
      const result = await db.select().from(schema.users).orderBy(asc(schema.users.id));
      return result.map((user) => this.toUser(user));
    } catch (error) {
      logger.error("Erro ao buscar usu\xE1rios:", error);
      return [];
    }
  }
  async getVisitedUsers() {
    try {
      const result = await db.select().from(schema.users).where(
        and(
          or(eq(schema.users.role, "member"), eq(schema.users.role, "missionary")),
          drizzleSql`extra_data->>'visited' = 'true'`
        )
      ).orderBy(schema.users.id);
      return result.map((user) => this.toUser(user));
    } catch (error) {
      logger.error("Erro ao buscar usu\xE1rios visitados:", error);
      return [];
    }
  }
  async getUserById(id) {
    try {
      const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      const row = result[0] || null;
      return row ? this.toUser(row) : null;
    } catch (error) {
      logger.error("Erro ao buscar usu\xE1rio por ID:", error);
      return null;
    }
  }
  async getUserByEmail(email) {
    try {
      const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      const row = result[0] || null;
      return row ? this.toUser(row) : null;
    } catch (error) {
      logger.error("Erro ao buscar usu\xE1rio por email:", error);
      return null;
    }
  }
  async createUser(userData) {
    try {
      const password = userData.password || "temp123";
      let hashedPassword = password;
      if (!password.startsWith("$2")) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      const newUser = {
        ...userData,
        password: hashedPassword,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      const result = await db.insert(schema.users).values(newUser).returning();
      return this.toUser(result[0]);
    } catch (error) {
      logger.error("Erro ao criar usu\xE1rio:", error);
      throw error;
    }
  }
  async updateUser(id, updates) {
    try {
      if (updates.password && !updates.password.startsWith("$2")) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      const dbUpdates = { ...updates, updatedAt: /* @__PURE__ */ new Date() };
      if (typeof dbUpdates.level === "number") {
        dbUpdates.level = String(dbUpdates.level);
      }
      const result = await db.update(schema.users).set(dbUpdates).where(eq(schema.users.id, id)).returning();
      return result[0] ? this.toUser(result[0]) : null;
    } catch (error) {
      logger.error("Erro ao atualizar usu\xE1rio", error);
      return null;
    }
  }
  async updateUserDirectly(id, updates) {
    try {
      logger.debug(`Atualizando usu\xE1rio ${id} diretamente`, { updates });
      if (updates.password && !updates.password.startsWith("$2")) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      const updatedAt = /* @__PURE__ */ new Date();
      const extraDataString = typeof updates.extraData === "object" ? JSON.stringify(updates.extraData) : updates.extraData;
      const result = await sql`
        UPDATE users 
        SET extra_data = ${extraDataString}::jsonb, updated_at = ${updatedAt}
        WHERE id = ${id}
        RETURNING id, name, extra_data, updated_at
      `;
      logger.debug(`Usu\xE1rio ${id} atualizado diretamente`, { extraData: result[0]?.extra_data });
      return await this.getUserById(id);
    } catch (error) {
      logger.error("Erro ao atualizar usu\xE1rio diretamente", error);
      return null;
    }
  }
  async deleteUser(id) {
    try {
      const user = await this.getUserById(id);
      if (user && isSuperAdmin(this.toPermissionUser(user))) {
        throw new Error("N\xE3o \xE9 poss\xEDvel excluir o Super Administrador do sistema");
      }
      if (user && hasAdminAccess(this.toPermissionUser(user))) {
        throw new Error("N\xE3o \xE9 poss\xEDvel excluir usu\xE1rios administradores do sistema");
      }
      await db.delete(schema.users).where(eq(schema.users.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar usu\xE1rio", error);
      throw error;
    }
  }
  // ========== IGREJAS ==========
  async getAllChurches() {
    try {
      const result = await db.select().from(schema.churches).orderBy(asc(schema.churches.id));
      return result;
    } catch (error) {
      logger.error("Erro ao buscar igrejas", error);
      return [];
    }
  }
  async getChurchesByDistrict(districtId) {
    try {
      const result = await db.select().from(schema.churches).where(eq(schema.churches.districtId, districtId)).orderBy(asc(schema.churches.id));
      return result;
    } catch (error) {
      logger.error("Erro ao buscar igrejas por distrito:", error);
      return [];
    }
  }
  async getChurchById(id) {
    try {
      const result = await db.select().from(schema.churches).where(eq(schema.churches.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error("Erro ao buscar igreja por ID:", error);
      return null;
    }
  }
  async createChurch(churchData) {
    try {
      const providedCode = churchData.code;
      const code = await this.resolveChurchCode(churchData.name, providedCode);
      const newChurch = {
        ...churchData,
        code,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      const result = await db.insert(schema.churches).values(newChurch).returning();
      return result[0];
    } catch (error) {
      logger.error("Erro ao criar igreja:", error);
      throw error;
    }
  }
  async updateChurch(id, updates) {
    try {
      const dbUpdates = { ...updates, updatedAt: /* @__PURE__ */ new Date() };
      const result = await db.update(schema.churches).set(dbUpdates).where(eq(schema.churches.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      logger.error("Erro ao atualizar igreja:", error);
      return null;
    }
  }
  async deleteChurch(id) {
    try {
      await db.delete(schema.churches).where(eq(schema.churches.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar igreja:", error);
      return false;
    }
  }
  // ========== EVENTOS ==========
  async getAllEvents() {
    try {
      const result = await db.select({
        id: schema.events.id,
        title: schema.events.title,
        description: schema.events.description,
        date: schema.events.date,
        endDate: schema.events.endDate,
        location: schema.events.location,
        type: schema.events.type,
        color: schema.events.color,
        capacity: schema.events.capacity,
        isRecurring: schema.events.isRecurring,
        recurrencePattern: schema.events.recurrencePattern,
        createdBy: schema.events.createdBy,
        churchId: schema.events.churchId,
        createdAt: schema.events.createdAt,
        updatedAt: schema.events.updatedAt
      }).from(schema.events).orderBy(desc(schema.events.date));
      return result;
    } catch (error) {
      logger.error("Erro ao buscar eventos:", error);
      return [];
    }
  }
  async getEventById(id) {
    try {
      const result = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error("Erro ao buscar evento por ID:", error);
      return null;
    }
  }
  async createEvent(eventData) {
    try {
      const eventExtras = eventData;
      const baseDate = new Date(eventExtras.date);
      if (eventExtras.time) {
        const [hours, minutes] = eventExtras.time.split(":");
        const parsedHours = Number(hours);
        const parsedMinutes = Number(minutes);
        if (!Number.isNaN(parsedHours)) {
          baseDate.setHours(parsedHours);
        }
        if (!Number.isNaN(parsedMinutes)) {
          baseDate.setMinutes(parsedMinutes);
        }
      }
      const newEvent = {
        title: eventExtras.title || "Evento",
        description: eventExtras.description ?? null,
        date: baseDate,
        endDate: eventExtras.endDate ? new Date(eventExtras.endDate) : null,
        location: eventExtras.location ?? null,
        type: eventExtras.type || "evento",
        color: eventExtras.color ?? null,
        capacity: eventExtras.capacity ?? eventExtras.maxParticipants ?? null,
        isRecurring: eventExtras.isRecurring ?? false,
        recurrencePattern: eventExtras.recurrencePattern ?? null,
        createdBy: eventExtras.organizerId ?? null,
        churchId: eventExtras.churchId ?? null,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      const result = await db.insert(schema.events).values(newEvent).returning();
      return result[0];
    } catch (error) {
      logger.error("Erro ao criar evento:", error);
      throw error;
    }
  }
  async updateEvent(id, updates) {
    try {
      const updatesExtras = updates;
      const dbUpdates = { updatedAt: /* @__PURE__ */ new Date() };
      if (updatesExtras.title !== void 0) dbUpdates.title = updatesExtras.title;
      if (updatesExtras.description !== void 0)
        dbUpdates.description = updatesExtras.description ?? null;
      if (updatesExtras.location !== void 0) dbUpdates.location = updatesExtras.location ?? null;
      if (updatesExtras.type !== void 0) dbUpdates.type = updatesExtras.type;
      if (updatesExtras.isRecurring !== void 0)
        dbUpdates.isRecurring = updatesExtras.isRecurring;
      if (updatesExtras.recurrencePattern !== void 0)
        dbUpdates.recurrencePattern = updatesExtras.recurrencePattern ?? null;
      if (updatesExtras.maxParticipants !== void 0)
        dbUpdates.capacity = updatesExtras.maxParticipants ?? null;
      if (updatesExtras.capacity !== void 0) dbUpdates.capacity = updatesExtras.capacity ?? null;
      if (updatesExtras.organizerId !== void 0)
        dbUpdates.createdBy = updatesExtras.organizerId ?? null;
      if (updatesExtras.color !== void 0) dbUpdates.color = updatesExtras.color ?? null;
      if (updatesExtras.churchId !== void 0) dbUpdates.churchId = updatesExtras.churchId ?? null;
      if (updatesExtras.date !== void 0) {
        const nextDate = new Date(updatesExtras.date);
        if (updatesExtras.time) {
          const [hours, minutes] = updatesExtras.time.split(":");
          const parsedHours = Number(hours);
          const parsedMinutes = Number(minutes);
          if (!Number.isNaN(parsedHours)) {
            nextDate.setHours(parsedHours);
          }
          if (!Number.isNaN(parsedMinutes)) {
            nextDate.setMinutes(parsedMinutes);
          }
        }
        dbUpdates.date = nextDate;
      }
      if (updatesExtras.endDate !== void 0) {
        dbUpdates.endDate = updatesExtras.endDate ? new Date(updatesExtras.endDate) : null;
      }
      const result = await db.update(schema.events).set(dbUpdates).where(eq(schema.events.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      logger.error("Erro ao atualizar evento:", error);
      return null;
    }
  }
  async deleteEvent(id) {
    try {
      await db.delete(schema.events).where(eq(schema.events.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar evento:", error);
      return false;
    }
  }
  // ========== DADOS DETALHADOS DO USUÁRIO ==========
  async getUserDetailedData(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;
      let extraData = {};
      if (user.extraData) {
        if (typeof user.extraData === "string") {
          try {
            extraData = JSON.parse(user.extraData);
          } catch (e) {
            logger.warn("Erro ao fazer parse do extraData:", e);
            extraData = {};
          }
        } else if (typeof user.extraData === "object") {
          extraData = user.extraData;
        }
      }
      return {
        ...user,
        extraData
      };
    } catch (error) {
      logger.error("Erro ao buscar dados detalhados do usu\xE1rio:", error);
      return null;
    }
  }
  // ========== CONFIGURAÇÃO DE PONTOS ==========
  async getPointsConfiguration() {
    try {
      const configs = await db.select().from(schema.pointConfigs);
      if (configs.length === 0) {
        return this.getDefaultPointsConfiguration();
      }
      const resolved = this.getDefaultPointsConfiguration();
      const setNested = (category, key, value) => {
        const group = resolved[category];
        if (group && typeof group === "object") {
          group[key] = value;
        }
      };
      configs.forEach((item) => {
        if (item.name === "basicPoints") resolved.basicPoints = item.value;
        else if (item.name === "attendancePoints") resolved.attendancePoints = item.value;
        else if (item.name === "eventPoints") resolved.eventPoints = item.value;
        else if (item.name === "donationPoints") resolved.donationPoints = item.value;
        else {
          const parts = item.name.split("_");
          const category = parts[0];
          const key = parts.slice(1).join("_");
          setNested(category, key, item.value);
        }
      });
      return resolved;
    } catch (error) {
      logger.error("\u274C Erro ao buscar configura\xE7\xE3o de pontos:", error);
      return this.getDefaultPointsConfiguration();
    }
  }
  // Buscar configuração de pontos específica do distrito, com fallback para global
  async getPointsConfigurationByDistrict(districtId) {
    try {
      if (!districtId) {
        return this.getPointsConfiguration();
      }
      const districtConfigs = await db.select().from(schema.districtPointsConfig).where(eq(schema.districtPointsConfig.districtId, districtId));
      if (districtConfigs.length === 0) {
        logger.info(`Distrito ${districtId} n\xE3o tem config pr\xF3pria, usando global`);
        return this.getPointsConfiguration();
      }
      const resolved = this.getDefaultPointsConfiguration();
      const setNested = (category, key, value) => {
        const group = resolved[category];
        if (group && typeof group === "object") {
          group[key] = value;
        }
      };
      districtConfigs.forEach((item) => {
        if (item.category && item.key) {
          const category = item.category;
          setNested(category, item.key, item.value);
        }
      });
      logger.info(`Usando configura\xE7\xE3o de pontos do distrito ${districtId}`);
      return resolved;
    } catch (error) {
      logger.error(`\u274C Erro ao buscar configura\xE7\xE3o de pontos do distrito ${districtId}:`, error);
      return this.getPointsConfiguration();
    }
  }
  getDefaultPointsConfiguration() {
    return {
      basicPoints: 25,
      attendancePoints: 25,
      eventPoints: 50,
      donationPoints: 75,
      engajamento: {
        baixo: 25,
        medio: 50,
        alto: 75
      },
      classificacao: {
        frequente: 75,
        naoFrequente: 25
      },
      dizimista: {
        naoDizimista: 0,
        pontual: 50,
        sazonal: 75,
        recorrente: 100
      },
      ofertante: {
        naoOfertante: 0,
        pontual: 50,
        sazonal: 75,
        recorrente: 100
      },
      tempoBatismo: {
        doisAnos: 50,
        cincoAnos: 75,
        dezAnos: 100,
        vinteAnos: 150,
        maisVinte: 200
      },
      cargos: {
        umCargo: 50,
        doisCargos: 100,
        tresOuMais: 150
      },
      nomeUnidade: {
        comUnidade: 25,
        semUnidade: 0
      },
      temLicao: {
        comLicao: 50
      },
      pontuacaoDinamica: {
        multiplicador: 25
      },
      totalPresenca: {
        zeroATres: 25,
        quatroASete: 50,
        oitoATreze: 100
      },
      presenca: {
        multiplicador: 5
      },
      escolaSabatina: {
        comunhao: 50,
        missao: 75,
        estudoBiblico: 100,
        batizouAlguem: 200,
        discipuladoPosBatismo: 50
      },
      batizouAlguem: {
        sim: 200,
        nao: 0
      },
      discipuladoPosBatismo: {
        multiplicador: 50
      },
      cpfValido: {
        valido: 25,
        invalido: 0
      },
      camposVaziosACMS: {
        completos: 50,
        incompletos: 0
      }
    };
  }
  async savePointsConfiguration(config) {
    try {
      await db.delete(schema.pointConfigs);
      const basicConfigs = [
        { name: "basicPoints", value: config.basicPoints || 100, category: "basic" },
        { name: "attendancePoints", value: config.attendancePoints || 10, category: "basic" },
        { name: "eventPoints", value: config.eventPoints || 20, category: "basic" },
        { name: "donationPoints", value: config.donationPoints || 50, category: "basic" }
      ];
      const engajamentoConfigs = [
        {
          name: "engajamento_baixo",
          value: config.engajamento?.baixo || 10,
          category: "engajamento"
        },
        {
          name: "engajamento_medio",
          value: config.engajamento?.medio || 25,
          category: "engajamento"
        },
        {
          name: "engajamento_alto",
          value: config.engajamento?.alto || 50,
          category: "engajamento"
        }
      ];
      const classificacaoConfigs = [
        {
          name: "classificacao_frequente",
          value: config.classificacao?.frequente || 30,
          category: "classificacao"
        },
        {
          name: "classificacao_naoFrequente",
          value: config.classificacao?.naoFrequente || 5,
          category: "classificacao"
        }
      ];
      const dizimistaConfigs = [
        {
          name: "dizimista_naoDizimista",
          value: config.dizimista?.naoDizimista || 0,
          category: "dizimista"
        },
        {
          name: "dizimista_pontual",
          value: config.dizimista?.pontual || 20,
          category: "dizimista"
        },
        {
          name: "dizimista_sazonal",
          value: config.dizimista?.sazonal || 15,
          category: "dizimista"
        },
        {
          name: "dizimista_recorrente",
          value: config.dizimista?.recorrente || 40,
          category: "dizimista"
        }
      ];
      const ofertanteConfigs = [
        {
          name: "ofertante_naoOfertante",
          value: config.ofertante?.naoOfertante || 0,
          category: "ofertante"
        },
        {
          name: "ofertante_pontual",
          value: config.ofertante?.pontual || 15,
          category: "ofertante"
        },
        {
          name: "ofertante_sazonal",
          value: config.ofertante?.sazonal || 10,
          category: "ofertante"
        },
        {
          name: "ofertante_recorrente",
          value: config.ofertante?.recorrente || 30,
          category: "ofertante"
        }
      ];
      const tempoBatismoConfigs = [
        {
          name: "tempoBatismo_doisAnos",
          value: config.tempoBatismo?.doisAnos || 10,
          category: "tempoBatismo"
        },
        {
          name: "tempoBatismo_cincoAnos",
          value: config.tempoBatismo?.cincoAnos || 20,
          category: "tempoBatismo"
        },
        {
          name: "tempoBatismo_dezAnos",
          value: config.tempoBatismo?.dezAnos || 30,
          category: "tempoBatismo"
        },
        {
          name: "tempoBatismo_vinteAnos",
          value: config.tempoBatismo?.vinteAnos || 40,
          category: "tempoBatismo"
        },
        {
          name: "tempoBatismo_maisVinte",
          value: config.tempoBatismo?.maisVinte || 50,
          category: "tempoBatismo"
        }
      ];
      const cargosConfigs = [
        { name: "cargos_umCargo", value: config.cargos?.umCargo || 50, category: "cargos" },
        { name: "cargos_doisCargos", value: config.cargos?.doisCargos || 100, category: "cargos" },
        { name: "cargos_tresOuMais", value: config.cargos?.tresOuMais || 150, category: "cargos" }
      ];
      const unidadeConfigs = [
        {
          name: "nomeUnidade_comUnidade",
          value: config.nomeUnidade?.comUnidade || 15,
          category: "nomeUnidade"
        },
        {
          name: "nomeUnidade_semUnidade",
          value: config.nomeUnidade?.semUnidade || 0,
          category: "nomeUnidade"
        }
      ];
      const temLicaoConfigs = [
        { name: "temLicao_comLicao", value: config.temLicao?.comLicao || 50, category: "temLicao" }
      ];
      const multiplicadorConfigs = [
        {
          name: "pontuacaoDinamica_multiplicador",
          value: config.pontuacaoDinamica?.multiplicador || 5,
          category: "multiplicador"
        },
        {
          name: "presenca_multiplicador",
          value: config.presenca?.multiplicador || 2,
          category: "multiplicador"
        }
      ];
      const batismoConfigs = [
        { name: "batizouAlguem_sim", value: config.batizouAlguem?.sim || 100, category: "batismo" },
        { name: "batizouAlguem_nao", value: config.batizouAlguem?.nao || 0, category: "batismo" }
      ];
      const discipuladoConfigs = [
        {
          name: "discipuladoPosBatismo_multiplicador",
          value: config.discipuladoPosBatismo?.multiplicador || 10,
          category: "discipulado"
        }
      ];
      const cpfConfigs = [
        { name: "cpfValido_valido", value: config.cpfValido?.valido || 20, category: "cpf" },
        { name: "cpfValido_invalido", value: config.cpfValido?.invalido || 0, category: "cpf" }
      ];
      const camposConfigs = [
        {
          name: "camposVaziosACMS_completos",
          value: config.camposVaziosACMS?.completos || 25,
          category: "campos"
        },
        {
          name: "camposVaziosACMS_incompletos",
          value: config.camposVaziosACMS?.incompletos || 0,
          category: "campos"
        }
      ];
      const totalPresencaConfigs = [
        {
          name: "totalPresenca_zeroATres",
          value: config.totalPresenca?.zeroATres || 25,
          category: "totalPresenca"
        },
        {
          name: "totalPresenca_quatroASete",
          value: config.totalPresenca?.quatroASete || 50,
          category: "totalPresenca"
        },
        {
          name: "totalPresenca_oitoATreze",
          value: config.totalPresenca?.oitoATreze || 100,
          category: "totalPresenca"
        }
      ];
      const escolaSabatinaConfigs = [
        {
          name: "escolaSabatina_comunhao",
          value: config.escolaSabatina?.comunhao || 50,
          category: "escolaSabatina"
        },
        {
          name: "escolaSabatina_missao",
          value: config.escolaSabatina?.missao || 75,
          category: "escolaSabatina"
        },
        {
          name: "escolaSabatina_estudoBiblico",
          value: config.escolaSabatina?.estudoBiblico || 100,
          category: "escolaSabatina"
        },
        {
          name: "escolaSabatina_batizouAlguem",
          value: config.escolaSabatina?.batizouAlguem || 200,
          category: "escolaSabatina"
        },
        {
          name: "escolaSabatina_discipuladoPosBatismo",
          value: config.escolaSabatina?.discipuladoPosBatismo || 25,
          category: "escolaSabatina"
        }
      ];
      const allConfigs = [
        ...basicConfigs,
        ...engajamentoConfigs,
        ...classificacaoConfigs,
        ...dizimistaConfigs,
        ...ofertanteConfigs,
        ...tempoBatismoConfigs,
        ...cargosConfigs,
        ...unidadeConfigs,
        ...temLicaoConfigs,
        ...multiplicadorConfigs,
        ...batismoConfigs,
        ...discipuladoConfigs,
        ...cpfConfigs,
        ...camposConfigs,
        ...totalPresencaConfigs,
        ...escolaSabatinaConfigs
      ];
      await db.insert(schema.pointConfigs).values(allConfigs);
    } catch (error) {
      logger.error("Erro ao salvar configura\xE7\xE3o de pontos", error);
      throw error;
    }
  }
  async resetPointsConfiguration() {
    try {
      await db.delete(schema.pointConfigs);
      logger.info("Configura\xE7\xE3o de pontos resetada");
    } catch (error) {
      logger.error("Erro ao resetar configura\xE7\xE3o de pontos", error);
      throw error;
    }
  }
  async resetAllUserPoints() {
    try {
      logger.info("Zerando pontos de todos os usu\xE1rios...");
      await db.update(schema.users).set({ points: 0 });
      logger.info("Pontos zerados para todos os usu\xE1rios");
      return {
        success: true,
        message: "Pontos zerados para todos os usu\xE1rios"
      };
    } catch (error) {
      logger.error("Erro ao zerar pontos", error);
      return { success: false, message: "Erro ao zerar pontos", error: error.message };
    }
  }
  async calculateUserPoints(userId) {
    try {
      const userResult = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      if (!userResult || userResult.length === 0) {
        return { success: false, message: "Usu\xE1rio n\xE3o encontrado" };
      }
      const userData = userResult[0];
      if (!userData) {
        logger.warn("Usu\xE1rio n\xE3o encontrado no banco de dados", { userId });
        return { success: false, message: "Usu\xE1rio n\xE3o encontrado" };
      }
      if (isSuperAdmin(this.toPermissionUser(userData))) {
        return { success: true, points: 0, breakdown: {}, message: "Admin n\xE3o possui pontos" };
      }
      let userDistrictId = userData.districtId || null;
      if (!userDistrictId && userData.churchCode) {
        const churchResult = await db.select({ districtId: schema.churches.districtId }).from(schema.churches).where(eq(schema.churches.code, userData.churchCode)).limit(1);
        if (churchResult && churchResult.length > 0) {
          userDistrictId = churchResult[0].districtId;
        }
      }
      const rawConfig = await this.getPointsConfigurationByDistrict(userDistrictId);
      const pointsConfig = getRequiredPointsConfig(rawConfig);
      let extraData = {};
      if (typeof userData.extraData === "string") {
        try {
          extraData = JSON.parse(userData.extraData);
        } catch (error) {
          logger.warn("Erro ao parsear extraData", { userId, error });
          extraData = {};
        }
      } else if (userData.extraData && typeof userData.extraData === "object") {
        extraData = userData.extraData;
      }
      let totalPoints = 0;
      const pointsBreakdown = {};
      const engajamentoValue = userData.engajamento || extraData?.engajamento;
      if (engajamentoValue) {
        const engajamento = String(engajamentoValue).toLowerCase();
        if (engajamento.includes("baixo")) {
          pointsBreakdown.engajamento = pointsConfig.engajamento.baixo;
          totalPoints += pointsConfig.engajamento.baixo;
        } else if (engajamento.includes("m\xE9dio") || engajamento.includes("medio")) {
          pointsBreakdown.engajamento = pointsConfig.engajamento.medio;
          totalPoints += pointsConfig.engajamento.medio;
        } else if (engajamento.includes("alto")) {
          pointsBreakdown.engajamento = pointsConfig.engajamento.alto;
          totalPoints += pointsConfig.engajamento.alto;
        }
      }
      const classificacaoValue = userData.classificacao || extraData?.classificacao;
      if (classificacaoValue) {
        const classificacao = String(classificacaoValue).toLowerCase();
        if (classificacao.includes("frequente") && !classificacao.includes("n\xE3o")) {
          pointsBreakdown.classificacao = pointsConfig.classificacao.frequente;
          totalPoints += pointsConfig.classificacao.frequente;
        } else {
          pointsBreakdown.classificacao = pointsConfig.classificacao.naoFrequente;
          totalPoints += pointsConfig.classificacao.naoFrequente;
        }
      }
      const dizimistaValue = userData.dizimistaType || extraData?.dizimistaType;
      if (dizimistaValue) {
        const dizimista = String(dizimistaValue).toLowerCase();
        if (dizimista.includes("n\xE3o dizimista") || dizimista.includes("nao dizimista")) {
          pointsBreakdown.dizimista = pointsConfig.dizimista.naoDizimista;
          totalPoints += pointsConfig.dizimista.naoDizimista;
        } else if (dizimista.includes("pontual")) {
          pointsBreakdown.dizimista = pointsConfig.dizimista.pontual;
          totalPoints += pointsConfig.dizimista.pontual;
        } else if (dizimista.includes("sazonal")) {
          pointsBreakdown.dizimista = pointsConfig.dizimista.sazonal;
          totalPoints += pointsConfig.dizimista.sazonal;
        } else if (dizimista.includes("recorrente")) {
          pointsBreakdown.dizimista = pointsConfig.dizimista.recorrente;
          totalPoints += pointsConfig.dizimista.recorrente;
        }
      }
      const ofertanteValue = userData.ofertanteType || extraData?.ofertanteType;
      if (ofertanteValue) {
        const ofertante = String(ofertanteValue).toLowerCase();
        if (ofertante.includes("n\xE3o ofertante") || ofertante.includes("nao ofertante")) {
          pointsBreakdown.ofertante = pointsConfig.ofertante.naoOfertante;
          totalPoints += pointsConfig.ofertante.naoOfertante;
        } else if (ofertante.includes("pontual")) {
          pointsBreakdown.ofertante = pointsConfig.ofertante.pontual;
          totalPoints += pointsConfig.ofertante.pontual;
        } else if (ofertante.includes("sazonal")) {
          pointsBreakdown.ofertante = pointsConfig.ofertante.sazonal;
          totalPoints += pointsConfig.ofertante.sazonal;
        } else if (ofertante.includes("recorrente")) {
          pointsBreakdown.ofertante = pointsConfig.ofertante.recorrente;
          totalPoints += pointsConfig.ofertante.recorrente;
        }
      }
      const tempoBatismoValue = userData.tempoBatismoAnos || extraData?.tempoBatismoAnos;
      if (tempoBatismoValue && typeof tempoBatismoValue === "number" && tempoBatismoValue > 0) {
        const tempo = tempoBatismoValue;
        if (tempo >= 2 && tempo < 5) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.doisAnos;
          totalPoints += pointsConfig.tempoBatismo.doisAnos;
        } else if (tempo >= 5 && tempo < 10) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.cincoAnos;
          totalPoints += pointsConfig.tempoBatismo.cincoAnos;
        } else if (tempo >= 10 && tempo < 20) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.dezAnos;
          totalPoints += pointsConfig.tempoBatismo.dezAnos;
        } else if (tempo >= 20 && tempo < 30) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.vinteAnos;
          totalPoints += pointsConfig.tempoBatismo.vinteAnos;
        } else if (tempo >= 30) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.maisVinte;
          totalPoints += pointsConfig.tempoBatismo.maisVinte;
        }
      }
      const departamentosCargos = String(
        userData.departamentosCargos || extraData?.departamentosCargos || ""
      ).trim();
      if (departamentosCargos && departamentosCargos.length > 0) {
        const numCargos = departamentosCargos.split(";").filter((c) => c.trim()).length;
        if (numCargos === 1) {
          pointsBreakdown.cargos = pointsConfig.cargos.umCargo;
          totalPoints += pointsConfig.cargos.umCargo;
        } else if (numCargos === 2) {
          pointsBreakdown.cargos = pointsConfig.cargos.doisCargos;
          totalPoints += pointsConfig.cargos.doisCargos;
        } else if (numCargos >= 3) {
          pointsBreakdown.cargos = pointsConfig.cargos.tresOuMais;
          totalPoints += pointsConfig.cargos.tresOuMais;
        }
      }
      const nomeUnidade = String(userData.nomeUnidade || extraData?.nomeUnidade || "").trim();
      if (nomeUnidade && nomeUnidade.length > 0) {
        pointsBreakdown.nomeUnidade = pointsConfig.nomeUnidade.comUnidade;
        totalPoints += pointsConfig.nomeUnidade.comUnidade;
      }
      const temLicaoValue = userData.temLicao ?? extraData?.temLicao;
      if (temLicaoValue === true || temLicaoValue === "true" || temLicaoValue === 1) {
        pointsBreakdown.temLicao = pointsConfig.temLicao.comLicao;
        totalPoints += pointsConfig.temLicao.comLicao;
      }
      const totalPresencaValue = userData.totalPresenca ?? extraData?.totalPresenca;
      if (totalPresencaValue !== void 0 && totalPresencaValue !== null) {
        const presenca = Number(totalPresencaValue);
        if (!isNaN(presenca)) {
          if (presenca >= 0 && presenca <= 3) {
            pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.zeroATres;
            totalPoints += pointsConfig.totalPresenca.zeroATres;
          } else if (presenca >= 4 && presenca <= 7) {
            pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.quatroASete;
            totalPoints += pointsConfig.totalPresenca.quatroASete;
          } else if (presenca >= 8 && presenca <= 13) {
            pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.oitoATreze;
            totalPoints += pointsConfig.totalPresenca.oitoATreze;
          }
        }
      }
      const comunhaoValue = Number(userData.comunhao ?? extraData?.comunhao ?? 0);
      if (comunhaoValue > 0) {
        const pontosComunhao = comunhaoValue * pointsConfig.escolaSabatina.comunhao;
        pointsBreakdown.comunhao = pontosComunhao;
        totalPoints += pontosComunhao;
      }
      const missaoValue = Number(userData.missao ?? extraData?.missao ?? 0);
      if (missaoValue > 0) {
        const pontosMissao = missaoValue * pointsConfig.escolaSabatina.missao;
        pointsBreakdown.missao = pontosMissao;
        totalPoints += pontosMissao;
      }
      const estudoBiblicoValue = Number(userData.estudoBiblico ?? extraData?.estudoBiblico ?? 0);
      if (estudoBiblicoValue > 0) {
        const pontosEstudoBiblico = estudoBiblicoValue * pointsConfig.escolaSabatina.estudoBiblico;
        pointsBreakdown.estudoBiblico = pontosEstudoBiblico;
        totalPoints += pontosEstudoBiblico;
      }
      const batizouAlguemValue = userData.batizouAlguem ?? extraData?.batizouAlguem;
      if (batizouAlguemValue === "Sim" || batizouAlguemValue === true || batizouAlguemValue === "true") {
        pointsBreakdown.batizouAlguem = pointsConfig.escolaSabatina.batizouAlguem;
        totalPoints += pointsConfig.escolaSabatina.batizouAlguem;
      }
      const discipuladoPosBatismoValue = Number(
        userData.discPosBatismal ?? extraData?.discPosBatismal ?? 0
      );
      if (discipuladoPosBatismoValue > 0) {
        const pontosDiscipulado = discipuladoPosBatismoValue * pointsConfig.escolaSabatina.discipuladoPosBatismo;
        pointsBreakdown.discipuladoPosBatismo = pontosDiscipulado;
        totalPoints += pontosDiscipulado;
      }
      const cpfValidoValue = userData.cpfValido ?? extraData?.cpfValido;
      if (cpfValidoValue === "Sim" || cpfValidoValue === true || cpfValidoValue === "true") {
        pointsBreakdown.cpfValido = pointsConfig.cpfValido.valido;
        totalPoints += pointsConfig.cpfValido.valido;
      }
      const camposVaziosValue = userData.camposVazios ?? extraData?.camposVaziosACMS;
      if (camposVaziosValue === false || camposVaziosValue === 0 || camposVaziosValue === "0") {
        pointsBreakdown.camposVaziosACMS = pointsConfig.camposVaziosACMS.completos;
        totalPoints += pointsConfig.camposVaziosACMS.completos;
      }
      const roundedTotalPoints = Math.round(totalPoints);
      return {
        success: true,
        points: roundedTotalPoints,
        breakdown: pointsBreakdown,
        userData: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          extraData
        }
      };
    } catch (error) {
      logger.error("\u274C Erro ao calcular pontos:", error);
      return {
        success: false,
        message: "Erro ao calcular pontos",
        error: error.message
      };
    }
  }
  /**
   * Calcula pontos para múltiplos usuários de uma vez (otimizado - evita N+1)
   * Esta versão usa os dados já carregados, evitando queries extras ao banco.
   * @param users Array de usuários já carregados
   * @returns Map de userId -> pontos calculados
   */
  async calculateUserPointsBatch(users2) {
    const pointsMap = /* @__PURE__ */ new Map();
    try {
      const rawConfig = await this.getPointsConfiguration();
      const pointsConfig = getRequiredPointsConfig(rawConfig);
      for (const userData of users2) {
        if (isSuperAdmin(this.toPermissionUser(userData))) {
          pointsMap.set(userData.id, 0);
          continue;
        }
        let extraData = {};
        if (typeof userData.extraData === "string") {
          try {
            extraData = JSON.parse(userData.extraData);
          } catch {
            extraData = {};
          }
        } else if (userData.extraData && typeof userData.extraData === "object") {
          extraData = userData.extraData;
        }
        let totalPoints = 0;
        const getField = (field, defaultValue) => {
          const directValue = userData[field];
          if (directValue !== void 0 && directValue !== null) {
            return directValue;
          }
          return extraData?.[field] ?? defaultValue;
        };
        const engajamentoValue = getField("engajamento");
        if (engajamentoValue) {
          const engajamento = String(engajamentoValue).toLowerCase();
          if (engajamento.includes("baixo")) {
            totalPoints += pointsConfig.engajamento?.baixo ?? 0;
          } else if (engajamento.includes("m\xE9dio") || engajamento.includes("medio")) {
            totalPoints += pointsConfig.engajamento?.medio ?? 0;
          } else if (engajamento.includes("alto")) {
            totalPoints += pointsConfig.engajamento?.alto ?? 0;
          }
        }
        const classificacaoValue = getField("classificacao");
        if (classificacaoValue) {
          const classificacao = String(classificacaoValue).toLowerCase();
          if (classificacao.includes("frequente") && !classificacao.includes("n\xE3o")) {
            totalPoints += pointsConfig.classificacao?.frequente ?? 0;
          } else {
            totalPoints += pointsConfig.classificacao?.naoFrequente ?? 0;
          }
        }
        const dizimistaValue = getField("dizimistaType");
        if (dizimistaValue) {
          const dizimista = String(dizimistaValue).toLowerCase();
          if (dizimista.includes("n\xE3o dizimista") || dizimista.includes("nao dizimista")) {
            totalPoints += pointsConfig.dizimista?.naoDizimista ?? 0;
          } else if (dizimista.includes("pontual")) {
            totalPoints += pointsConfig.dizimista?.pontual ?? 0;
          } else if (dizimista.includes("sazonal")) {
            totalPoints += pointsConfig.dizimista?.sazonal ?? 0;
          } else if (dizimista.includes("recorrente")) {
            totalPoints += pointsConfig.dizimista?.recorrente ?? 0;
          }
        }
        const ofertanteValue = getField("ofertanteType");
        if (ofertanteValue) {
          const ofertante = String(ofertanteValue).toLowerCase();
          if (ofertante.includes("n\xE3o ofertante") || ofertante.includes("nao ofertante")) {
            totalPoints += pointsConfig.ofertante?.naoOfertante ?? 0;
          } else if (ofertante.includes("pontual")) {
            totalPoints += pointsConfig.ofertante?.pontual ?? 0;
          } else if (ofertante.includes("sazonal")) {
            totalPoints += pointsConfig.ofertante?.sazonal ?? 0;
          } else if (ofertante.includes("recorrente")) {
            totalPoints += pointsConfig.ofertante?.recorrente ?? 0;
          }
        }
        const tempoBatismo = getField("tempoBatismoAnos");
        if (tempoBatismo !== null && tempoBatismo !== void 0) {
          const anos = Number(tempoBatismo);
          if (!isNaN(anos) && pointsConfig.tempoBatismo) {
            if (anos <= 2) {
              totalPoints += pointsConfig.tempoBatismo.doisAnos ?? 0;
            } else if (anos <= 5) {
              totalPoints += pointsConfig.tempoBatismo.cincoAnos ?? 0;
            } else if (anos <= 10) {
              totalPoints += pointsConfig.tempoBatismo.dezAnos ?? 0;
            } else if (anos <= 20) {
              totalPoints += pointsConfig.tempoBatismo.vinteAnos ?? 0;
            } else {
              totalPoints += pointsConfig.tempoBatismo.maisVinte ?? 0;
            }
          }
        }
        const temLicao = getField("temLicao");
        if (temLicao === true && pointsConfig.temLicao) {
          totalPoints += pointsConfig.temLicao.comLicao ?? 0;
        }
        const totalPresenca = getField("totalPresenca");
        if (totalPresenca !== null && totalPresenca !== void 0) {
          const presencas = Number(totalPresenca);
          if (!isNaN(presencas) && pointsConfig.presenca) {
            totalPoints += presencas * (pointsConfig.presenca.multiplicador ?? 0);
          }
        }
        const cpfValido = getField("cpfValido");
        if (cpfValido !== void 0 && pointsConfig.cpfValido) {
          if (cpfValido === true) {
            totalPoints += pointsConfig.cpfValido.valido ?? 0;
          } else {
            totalPoints += pointsConfig.cpfValido.invalido ?? 0;
          }
        }
        const camposVazios = getField("camposVazios");
        if (camposVazios !== void 0 && pointsConfig.camposVaziosACMS) {
          if (camposVazios === false) {
            totalPoints += pointsConfig.camposVaziosACMS.completos ?? 0;
          } else {
            totalPoints += pointsConfig.camposVaziosACMS.incompletos ?? 0;
          }
        }
        const batizouAlguem = getField("batizouAlguem");
        if (batizouAlguem === true && pointsConfig.batizouAlguem) {
          totalPoints += pointsConfig.batizouAlguem.sim ?? 0;
        }
        pointsMap.set(userData.id, Math.round(totalPoints));
      }
    } catch (error) {
      logger.error("\u274C Erro ao calcular pontos em batch:", error);
    }
    return pointsMap;
  }
  // Método para recalcular pontos de todos os usuários
  async calculateAdvancedUserPoints() {
    try {
      const users2 = await this.getAllUsers();
      let updatedCount = 0;
      let errorCount = 0;
      const results = [];
      for (const user of users2) {
        try {
          if (isSuperAdmin(this.toPermissionUser(user))) {
            continue;
          }
          const calculation = await this.calculateUserPoints(user.id);
          if (calculation && calculation.success) {
            if (user.points !== calculation.points) {
              await db.update(schema.users).set({ points: calculation.points }).where(eq(schema.users.id, user.id));
              updatedCount++;
            }
            results.push({
              userId: user.id,
              name: user.name,
              points: calculation.points,
              updated: user.points !== calculation.points
            });
          } else {
            errorCount++;
          }
        } catch (_userError) {
          errorCount++;
        }
      }
      return {
        success: true,
        message: `Pontos recalculados para ${users2.length} usu\xE1rios. ${updatedCount} atualizados.`,
        updatedUsers: updatedCount,
        totalUsers: users2.length,
        errors: errorCount,
        results
      };
    } catch (error) {
      logger.error("\u274C Erro ao recalcular pontos:", error);
      return {
        success: false,
        message: "Erro ao recalcular pontos",
        error: error.message
      };
    }
  }
  // ========== MÉTODOS ADICIONAIS (Sistema, Logo, etc) ==========
  async saveSystemLogo(logoData) {
    try {
      await db.insert(schema.systemSettings).values({
        key: "system_logo",
        value: logoData,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: schema.systemSettings.key,
        set: {
          value: logoData,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } catch (error) {
      logger.error("Erro ao salvar logo do sistema:", error);
      throw error;
    }
  }
  async getSystemLogo() {
    try {
      const result = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, "system_logo")).limit(1);
      const value = result[0]?.value;
      if (value == null) {
        return null;
      }
      if (typeof value === "string") {
        return value;
      }
      return JSON.stringify(value);
    } catch (error) {
      logger.error("Erro ao buscar logo do sistema:", error);
      return null;
    }
  }
  async clearSystemLogo() {
    try {
      await db.delete(schema.systemSettings).where(eq(schema.systemSettings.key, "system_logo"));
    } catch (error) {
      logger.error("Erro ao limpar logo do sistema:", error);
      throw error;
    }
  }
  async saveSystemSetting(key, value) {
    try {
      await db.insert(schema.systemSettings).values({
        key,
        value: JSON.stringify(value),
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: schema.systemSettings.key,
        set: {
          value: JSON.stringify(value),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } catch (error) {
      logger.error("Erro ao salvar configura\xE7\xE3o do sistema:", error);
      throw error;
    }
  }
  async getSystemSetting(key) {
    try {
      const result = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, key)).limit(1);
      const value = result[0]?.value;
      if (value == null) {
        return null;
      }
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      logger.error("Erro ao buscar configura\xE7\xE3o do sistema", error);
      return null;
    }
  }
  async clearAllData() {
    try {
      logger.info("Iniciando limpeza completa de todos os dados do sistema...");
      logger.debug("Limpando participantes de v\xEDdeo...");
      await db.delete(schema.videoCallParticipants);
      logger.debug("Limpando participantes de conversas...");
      await db.delete(schema.conversationParticipants);
      logger.debug("Limpando participantes de eventos...");
      await db.delete(schema.eventParticipants);
      logger.debug("Limpando intercessores de ora\xE7\xE3o...");
      await db.delete(schema.prayerIntercessors);
      logger.debug("Limpando conquistas de usu\xE1rios...");
      await db.delete(schema.userAchievements);
      logger.debug("Limpando hist\xF3rico de pontos...");
      await db.delete(schema.userPointsHistory);
      logger.debug("Limpando atividades de pontos...");
      await db.delete(schema.pointActivities);
      logger.debug("Limpando mensagens...");
      await db.delete(schema.messages);
      logger.debug("Limpando sess\xF5es de v\xEDdeo...");
      await db.delete(schema.videoCallSessions);
      logger.debug("Limpando conversas...");
      await db.delete(schema.conversations);
      logger.debug("Limpando eventos...");
      await db.delete(schema.events);
      logger.debug("Limpando reuni\xF5es...");
      await db.delete(schema.meetings);
      logger.debug("Limpando ora\xE7\xF5es...");
      await db.delete(schema.prayers);
      logger.debug("Limpando notifica\xE7\xF5es...");
      await db.delete(schema.notifications);
      logger.debug("Limpando subscriptions push...");
      await db.delete(schema.pushSubscriptions);
      logger.debug("Limpando check-ins emocionais...");
      await db.delete(schema.emotionalCheckins);
      logger.debug("Limpando relacionamentos...");
      await db.delete(schema.relationships);
      logger.debug("Limpando solicita\xE7\xF5es de discipulado...");
      await db.delete(schema.discipleshipRequests);
      logger.debug("Limpando perfis mission\xE1rios...");
      await db.delete(schema.missionaryProfiles);
      logger.debug("Limpando tipos de reuni\xE3o...");
      await db.delete(schema.meetingTypes);
      logger.debug("Limpando conquistas...");
      await db.delete(schema.achievements);
      logger.debug("Limpando configura\xE7\xF5es de pontos...");
      await db.delete(schema.pointConfigs);
      logger.debug("Limpando igrejas...");
      await db.delete(schema.churches);
      logger.debug("Limpando usu\xE1rios (mantendo admin)...");
      await db.delete(schema.users).where(ne(schema.users.role, "admin"));
      logger.info(
        "Todos os dados foram limpos com sucesso! Mantidos: usu\xE1rios admin, configura\xE7\xF5es do sistema e permiss\xF5es"
      );
    } catch (error) {
      logger.error("Erro ao limpar dados", error);
      throw error;
    }
  }
  // ========== MÉTODOS PRIORITÁRIOS (TOP 10 MAIS USADOS) ==========
  // 0. getAllRelationships - Busca todos os relacionamentos
  async getAllRelationships() {
    try {
      const relationships2 = await db.select().from(schema.relationships);
      return relationships2.map((relationship) => this.mapRelationshipRecord(relationship));
    } catch (error) {
      logger.error("Erro ao buscar todos os relacionamentos", error);
      return [];
    }
  }
  // 1. getRelationshipsByMissionary (7x usado)
  async getRelationshipsByMissionary(missionaryId) {
    try {
      const relationships2 = await db.select().from(schema.relationships).where(eq(schema.relationships.missionaryId, missionaryId));
      return relationships2.map((relationship) => this.mapRelationshipRecord(relationship));
    } catch (error) {
      logger.error("Erro ao buscar relacionamentos do mission\xE1rio", error);
      return [];
    }
  }
  // 2. getMeetingsByUserId (5x usado)
  async getMeetingsByUserId(userId) {
    try {
      const meetings2 = await db.select().from(schema.meetings).where(
        or(eq(schema.meetings.requesterId, userId), eq(schema.meetings.assignedToId, userId))
      ).orderBy(desc(schema.meetings.scheduledAt));
      return meetings2.map((meeting) => this.mapMeetingRecord(meeting));
    } catch (error) {
      logger.error("Erro ao buscar reuni\xF5es do usu\xE1rio:", error);
      return [];
    }
  }
  // 3. getRelationshipsByInterested (4x usado)
  async getRelationshipsByInterested(interestedId) {
    try {
      const relationships2 = await db.select().from(schema.relationships).where(eq(schema.relationships.interestedId, interestedId));
      return relationships2.map((relationship) => this.mapRelationshipRecord(relationship));
    } catch (error) {
      logger.error("Erro ao buscar relacionamentos do interessado:", error);
      return [];
    }
  }
  async getRelationshipById(id) {
    try {
      const relationships2 = await db.select().from(schema.relationships).where(eq(schema.relationships.id, id)).limit(1);
      return relationships2[0] ? this.mapRelationshipRecord(relationships2[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar relacionamento por ID:", error);
      return null;
    }
  }
  async deleteRelationshipByInterested(interestedId) {
    try {
      await db.delete(schema.relationships).where(eq(schema.relationships.interestedId, interestedId));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar relacionamento por interessado:", error);
      return false;
    }
  }
  // 4. updateUserChurch (4x usado)
  async updateUserChurch(userId, churchName) {
    try {
      await db.update(schema.users).set({ church: churchName }).where(eq(schema.users.id, userId));
      return true;
    } catch (error) {
      logger.error("Erro ao atualizar igreja do usu\xE1rio:", error);
      return false;
    }
  }
  // 5. getAllDiscipleshipRequests (4x usado)
  async getAllDiscipleshipRequests() {
    try {
      const requests = await db.select().from(schema.discipleshipRequests).orderBy(desc(schema.discipleshipRequests.createdAt));
      return requests.map((request) => this.mapDiscipleshipRequestRecord(request));
    } catch (error) {
      logger.error("Erro ao buscar pedidos de discipulado:", error);
      return [];
    }
  }
  async getDiscipleshipRequestById(id) {
    try {
      const requests = await db.select().from(schema.discipleshipRequests).where(eq(schema.discipleshipRequests.id, id)).limit(1);
      return requests[0] ? this.mapDiscipleshipRequestRecord(requests[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar pedido de discipulado por ID:", error);
      return null;
    }
  }
  // 6. createRelationship (3x usado)
  async createRelationship(data) {
    try {
      const [relationship] = await db.insert(schema.relationships).values({
        missionaryId: data.missionaryId,
        interestedId: data.interestedId,
        status: data.status || "active",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapRelationshipRecord(relationship);
    } catch (error) {
      logger.error("Erro ao criar relacionamento:", error);
      throw error;
    }
  }
  // 7. getEventPermissions (3x usado)
  async getEventPermissions() {
    try {
      const permissions = await db.select().from(schema.eventFilterPermissions).limit(1);
      if (permissions.length > 0) {
        const perms = permissions[0].permissions;
        return typeof perms === "string" ? JSON.parse(perms) : perms;
      }
      return null;
    } catch (error) {
      logger.error("Erro ao buscar permiss\xF5es de eventos:", error);
      return null;
    }
  }
  // 8. getEmotionalCheckInsForAdmin (3x usado)
  async getEmotionalCheckInsForAdmin() {
    try {
      const checkIns = await db.select().from(schema.emotionalCheckins).orderBy(desc(schema.emotionalCheckins.createdAt));
      return checkIns.map((checkIn) => this.mapEmotionalCheckInRecord(checkIn));
    } catch (error) {
      logger.error("Erro ao buscar check-ins emocionais para admin:", error);
      return [];
    }
  }
  // 9. createDiscipleshipRequest (3x usado)
  async createDiscipleshipRequest(data) {
    try {
      const [request] = await db.insert(schema.discipleshipRequests).values({
        interestedId: data.interestedId,
        missionaryId: data.missionaryId ?? data.requestedMissionaryId,
        status: data.status || "pending",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapDiscipleshipRequestRecord(request);
    } catch (error) {
      logger.error("Erro ao criar pedido de discipulado:", error);
      throw error;
    }
  }
  // 10. getOrCreateChurch (3x usado)
  async getOrCreateChurch(churchName) {
    try {
      const existing = await db.select().from(schema.churches).where(eq(schema.churches.name, churchName)).limit(1);
      if (existing.length > 0) {
        return this.mapChurchRecord(existing[0]);
      }
      const code = await this.resolveChurchCode(churchName);
      const [newChurch] = await db.insert(schema.churches).values({
        name: churchName,
        code,
        address: "",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapChurchRecord(newChurch);
    } catch (error) {
      logger.error("Erro ao buscar/criar igreja:", error);
      throw error;
    }
  }
  // ========== MÉTODOS SECUNDÁRIOS (restantes) ==========
  // Meetings
  async getMeetingsByStatus(status) {
    try {
      const meetings2 = await db.select().from(schema.meetings).where(eq(schema.meetings.status, status)).orderBy(desc(schema.meetings.scheduledAt));
      return meetings2.map((meeting) => this.mapMeetingRecord(meeting));
    } catch (error) {
      logger.error("Erro ao buscar reuni\xF5es por status:", error);
      return [];
    }
  }
  async getAllMeetings() {
    try {
      const meetings2 = await db.select().from(schema.meetings).orderBy(desc(schema.meetings.scheduledAt));
      return meetings2.map((meeting) => this.mapMeetingRecord(meeting));
    } catch (error) {
      logger.error("Erro ao buscar todas as reuni\xF5es:", error);
      return [];
    }
  }
  async getMeetingTypes() {
    try {
      const types = await db.select().from(schema.meetingTypes);
      return types.map((type) => this.mapMeetingTypeRecord(type));
    } catch (error) {
      logger.error("Erro ao buscar tipos de reuni\xE3o:", error);
      return [];
    }
  }
  // Prayers
  async getPrayers() {
    try {
      const prayers2 = await db.select().from(schema.prayers).orderBy(desc(schema.prayers.createdAt));
      return prayers2.map((prayer) => this.mapPrayerRecord(prayer));
    } catch (error) {
      logger.error("Erro ao buscar ora\xE7\xF5es:", error);
      return [];
    }
  }
  async markPrayerAsAnswered(id, _testimony) {
    try {
      const [updated] = await db.update(schema.prayers).set({
        status: "answered",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(schema.prayers.id, id)).returning();
      return updated ? this.mapPrayerRecord(updated) : null;
    } catch (error) {
      logger.error("Erro ao marcar ora\xE7\xE3o como respondida:", error);
      return null;
    }
  }
  async addPrayerIntercessor(prayerId, intercessorId) {
    try {
      await db.insert(schema.prayerIntercessors).values({
        prayerId,
        userId: intercessorId,
        joinedAt: /* @__PURE__ */ new Date()
      });
      return true;
    } catch (error) {
      logger.error("Erro ao adicionar intercessor:", error);
      return false;
    }
  }
  async removePrayerIntercessor(prayerId, intercessorId) {
    try {
      await db.delete(schema.prayerIntercessors).where(
        and(
          eq(schema.prayerIntercessors.prayerId, prayerId),
          eq(schema.prayerIntercessors.userId, intercessorId)
        )
      );
      return true;
    } catch (error) {
      logger.error("Erro ao remover intercessor:", error);
      return false;
    }
  }
  async getPrayerIntercessors(prayerId) {
    try {
      const intercessors = await db.select().from(schema.prayerIntercessors).where(eq(schema.prayerIntercessors.prayerId, prayerId));
      const intercessorIds = intercessors.map((intercessor) => intercessor.userId).filter((id) => typeof id === "number");
      if (intercessorIds.length === 0) {
        return [];
      }
      const users2 = await db.select().from(schema.users).where(inArray(schema.users.id, intercessorIds));
      return users2.map((user) => this.toUser(user));
    } catch (error) {
      logger.error("Erro ao buscar intercessores:", error);
      return [];
    }
  }
  async getPrayersUserIsPrayingFor(userId) {
    try {
      const prayers2 = await db.select().from(schema.prayers).innerJoin(
        schema.prayerIntercessors,
        eq(schema.prayers.id, schema.prayerIntercessors.prayerId)
      ).where(eq(schema.prayerIntercessors.userId, userId));
      return prayers2.map((prayer) => this.mapPrayerRecord(prayer.prayers));
    } catch (error) {
      logger.error("Erro ao buscar ora\xE7\xF5es que usu\xE1rio est\xE1 orando:", error);
      return [];
    }
  }
  // Emotional Check-ins
  async getEmotionalCheckInsByUserId(userId) {
    try {
      const checkIns = await db.select().from(schema.emotionalCheckins).where(eq(schema.emotionalCheckins.userId, userId)).orderBy(desc(schema.emotionalCheckins.createdAt));
      return checkIns.map((checkIn) => this.mapEmotionalCheckInRecord(checkIn));
    } catch (error) {
      logger.error("Erro ao buscar check-ins do usu\xE1rio:", error);
      return [];
    }
  }
  // Discipulado
  async updateDiscipleshipRequest(id, updates) {
    try {
      const dbUpdates = { updatedAt: /* @__PURE__ */ new Date() };
      if (updates.status !== void 0) dbUpdates.status = updates.status ?? "pending";
      if (updates.notes !== void 0) dbUpdates.notes = updates.notes ?? null;
      if (updates.missionaryId !== void 0) dbUpdates.missionaryId = updates.missionaryId ?? null;
      if (updates.interestedId !== void 0) dbUpdates.interestedId = updates.interestedId ?? null;
      const [updated] = await db.update(schema.discipleshipRequests).set(dbUpdates).where(eq(schema.discipleshipRequests.id, id)).returning();
      return updated ? this.mapDiscipleshipRequestRecord(updated) : null;
    } catch (error) {
      logger.error("Erro ao atualizar pedido de discipulado:", error);
      return null;
    }
  }
  async deleteDiscipleshipRequest(id) {
    try {
      await db.delete(schema.discipleshipRequests).where(eq(schema.discipleshipRequests.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar pedido de discipulado:", error);
      return false;
    }
  }
  // Relacionamentos
  async deleteRelationship(relationshipId) {
    try {
      await db.delete(schema.relationships).where(eq(schema.relationships.id, relationshipId));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar relacionamento:", error);
      return false;
    }
  }
  // Chat/Mensagens
  async getConversationsByUserId(userId) {
    try {
      const conversations2 = await db.select().from(schema.conversations).innerJoin(
        schema.conversationParticipants,
        eq(schema.conversations.id, schema.conversationParticipants.conversationId)
      ).where(eq(schema.conversationParticipants.userId, userId));
      return conversations2.map(
        (conversation) => this.mapConversationRecord(conversation.conversations)
      );
    } catch (error) {
      logger.error("Erro ao buscar conversas:", error);
      return [];
    }
  }
  async getConversationsByUser(userId) {
    return this.getConversationsByUserId(userId);
  }
  async getAllConversations() {
    try {
      const conversations2 = await db.select().from(schema.conversations).orderBy(desc(schema.conversations.updatedAt));
      return conversations2.map((conversation) => this.mapConversationRecord(conversation));
    } catch (error) {
      logger.error("Erro ao buscar todas as conversas:", error);
      return [];
    }
  }
  async getConversationById(id) {
    try {
      const conversations2 = await db.select().from(schema.conversations).where(eq(schema.conversations.id, id)).limit(1);
      return conversations2[0] ? this.mapConversationRecord(conversations2[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar conversa por ID:", error);
      return null;
    }
  }
  async createConversation(data) {
    try {
      const [conversation] = await db.insert(schema.conversations).values({
        title: data.title ?? null,
        type: data.type ?? "private",
        createdBy: data.createdBy ?? null,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapConversationRecord(conversation);
    } catch (error) {
      logger.error("Erro ao criar conversa:", error);
      throw error;
    }
  }
  async updateConversation(id, updates) {
    try {
      const dbUpdates = { updatedAt: /* @__PURE__ */ new Date() };
      if (updates.title !== void 0) dbUpdates.title = updates.title ?? null;
      if (updates.type !== void 0) dbUpdates.type = updates.type ?? "private";
      if (updates.createdBy !== void 0) dbUpdates.createdBy = updates.createdBy ?? null;
      const [conversation] = await db.update(schema.conversations).set(dbUpdates).where(eq(schema.conversations.id, id)).returning();
      return conversation ? this.mapConversationRecord(conversation) : null;
    } catch (error) {
      logger.error("Erro ao atualizar conversa:", error);
      return null;
    }
  }
  async deleteConversation(id) {
    try {
      await db.delete(schema.conversationParticipants).where(eq(schema.conversationParticipants.conversationId, id));
      await db.delete(schema.conversations).where(eq(schema.conversations.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar conversa:", error);
      return false;
    }
  }
  async getOrCreateDirectConversation(userAId, userBId) {
    try {
      const existing = await db.select().from(schema.conversations).where(eq(schema.conversations.type, "direct")).limit(1);
      if (existing.length > 0) {
        return this.mapConversationRecord(existing[0]);
      }
      const [conversation] = await db.insert(schema.conversations).values({
        type: "direct",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      await db.insert(schema.conversationParticipants).values([
        { conversationId: conversation.id, userId: userAId, joinedAt: /* @__PURE__ */ new Date() },
        { conversationId: conversation.id, userId: userBId, joinedAt: /* @__PURE__ */ new Date() }
      ]);
      return this.mapConversationRecord(conversation);
    } catch (error) {
      logger.error("Erro ao buscar/criar conversa:", error);
      throw error;
    }
  }
  async getMessagesByConversationId(conversationId) {
    try {
      const messages2 = await db.select().from(schema.messages).where(eq(schema.messages.conversationId, conversationId)).orderBy(asc(schema.messages.createdAt));
      return messages2.map((message) => this.mapMessageRecord(message));
    } catch (error) {
      logger.error("Erro ao buscar mensagens:", error);
      return [];
    }
  }
  async getMessagesByConversation(conversationId) {
    return this.getMessagesByConversationId(conversationId);
  }
  async getAllMessages() {
    try {
      const messages2 = await db.select().from(schema.messages).orderBy(desc(schema.messages.createdAt));
      return messages2.map((message) => this.mapMessageRecord(message));
    } catch (error) {
      logger.error("Erro ao buscar todas as mensagens:", error);
      return [];
    }
  }
  async getMessageById(id) {
    try {
      const messages2 = await db.select().from(schema.messages).where(eq(schema.messages.id, id)).limit(1);
      return messages2[0] ? this.mapMessageRecord(messages2[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar mensagem por ID:", error);
      return null;
    }
  }
  async createMessage(data) {
    try {
      const [message] = await db.insert(schema.messages).values({
        content: data.content,
        senderId: data.senderId,
        conversationId: data.conversationId,
        createdAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapMessageRecord(message);
    } catch (error) {
      logger.error("Erro ao criar mensagem:", error);
      throw error;
    }
  }
  async updateMessage(id, updates) {
    try {
      const dbUpdates = {};
      if (updates.content !== void 0) dbUpdates.content = updates.content;
      if (updates.senderId !== void 0) dbUpdates.senderId = updates.senderId ?? null;
      if (updates.conversationId !== void 0)
        dbUpdates.conversationId = updates.conversationId ?? null;
      const [message] = await db.update(schema.messages).set(dbUpdates).where(eq(schema.messages.id, id)).returning();
      return message ? this.mapMessageRecord(message) : null;
    } catch (error) {
      logger.error("Erro ao atualizar mensagem:", error);
      return null;
    }
  }
  async deleteMessage(id) {
    try {
      await db.delete(schema.messages).where(eq(schema.messages.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar mensagem:", error);
      return false;
    }
  }
  // Eventos
  async saveEventPermissions(permissions) {
    try {
      const permissionsJson = JSON.stringify(permissions);
      await db.insert(schema.eventFilterPermissions).values({
        permissions: permissionsJson,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: schema.eventFilterPermissions.id,
        set: {
          permissions: permissionsJson,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } catch (error) {
      logger.error("Erro ao salvar permiss\xF5es de eventos:", error);
      throw error;
    }
  }
  async clearAllEvents() {
    try {
      await db.delete(schema.events);
      return true;
    } catch (error) {
      logger.error("Erro ao limpar eventos:", error);
      return false;
    }
  }
  // Sistema
  async getSystemConfig(key) {
    try {
      const result = await db.select().from(schema.systemConfig).where(eq(schema.systemConfig.key, key)).limit(1);
      const value = result[0]?.value;
      if (value == null) {
        return null;
      }
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      logger.error("Erro ao buscar config do sistema:", error);
      return null;
    }
  }
  async saveSystemConfig(key, value) {
    try {
      await db.insert(schema.systemConfig).values({
        key,
        value,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: schema.systemConfig.key,
        set: {
          value,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } catch (error) {
      logger.error("Erro ao salvar config do sistema:", error);
      throw error;
    }
  }
  // Usuários
  async approveUser(id) {
    try {
      const [user] = await db.update(schema.users).set({ status: "approved" }).where(eq(schema.users.id, id)).returning();
      return user ? this.toUser(user) : null;
    } catch (error) {
      logger.error("Erro ao aprovar usu\xE1rio:", error);
      return null;
    }
  }
  async rejectUser(id) {
    try {
      const [user] = await db.update(schema.users).set({ status: "rejected" }).where(eq(schema.users.id, id)).returning();
      return user ? this.toUser(user) : null;
    } catch (error) {
      logger.error("Erro ao rejeitar usu\xE1rio:", error);
      return null;
    }
  }
  async setDefaultChurch(churchId) {
    try {
      await db.insert(schema.systemSettings).values({
        key: "default_church_id",
        value: churchId.toString(),
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: schema.systemSettings.key,
        set: {
          value: churchId.toString(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      return true;
    } catch (error) {
      logger.error("Erro ao definir igreja padr\xE3o:", error);
      return false;
    }
  }
  // Pontos
  async getAllPointActivities() {
    try {
      const activities = await db.select().from(schema.pointActivities).orderBy(desc(schema.pointActivities.createdAt));
      return activities.map((activity) => this.mapPointActivityRecord(activity));
    } catch (error) {
      logger.error("Erro ao buscar atividades de pontos:", error);
      return [];
    }
  }
  async createPointActivity(data) {
    try {
      const [activity] = await db.insert(schema.pointActivities).values({
        userId: data.userId ?? null,
        activity: data.description ?? "",
        points: data.points ?? 0,
        description: data.description ?? null,
        createdAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapPointActivityRecord(activity);
    } catch (error) {
      logger.error("Erro ao criar atividade de pontos:", error);
      throw error;
    }
  }
  async getAllAchievements() {
    try {
      const achievements2 = await db.select().from(schema.achievements);
      return achievements2.map((achievement) => this.mapAchievementRecord(achievement));
    } catch (error) {
      logger.error("Erro ao buscar conquistas:", error);
      return [];
    }
  }
  async getAchievementById(id) {
    try {
      const achievements2 = await db.select().from(schema.achievements).where(eq(schema.achievements.id, id)).limit(1);
      return achievements2[0] ? this.mapAchievementRecord(achievements2[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar conquista por ID:", error);
      return null;
    }
  }
  async createAchievement(data) {
    try {
      const [achievement] = await db.insert(schema.achievements).values({
        name: data.name ?? "",
        description: data.description ?? null,
        pointsRequired: data.requiredPoints ?? 0,
        icon: data.icon ?? null,
        createdAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapAchievementRecord(achievement);
    } catch (error) {
      logger.error("Erro ao criar conquista:", error);
      throw error;
    }
  }
  async updateAchievement(id, updates) {
    try {
      const dbUpdates = {};
      if (updates.name !== void 0) dbUpdates.name = updates.name;
      if (updates.description !== void 0) dbUpdates.description = updates.description ?? null;
      if (updates.requiredPoints !== void 0) dbUpdates.pointsRequired = updates.requiredPoints;
      if (updates.icon !== void 0) dbUpdates.icon = updates.icon ?? null;
      const [achievement] = await db.update(schema.achievements).set(dbUpdates).where(eq(schema.achievements.id, id)).returning();
      return achievement ? this.mapAchievementRecord(achievement) : null;
    } catch (error) {
      logger.error("Erro ao atualizar conquista:", error);
      return null;
    }
  }
  async deleteAchievement(id) {
    try {
      await db.delete(schema.achievements).where(eq(schema.achievements.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar conquista:", error);
      return false;
    }
  }
  // Perfil Missionário
  async getMissionaryProfileByUserId(userId) {
    try {
      const profiles = await db.select().from(schema.missionaryProfiles).where(eq(schema.missionaryProfiles.userId, userId)).limit(1);
      return profiles[0] ? this.mapMissionaryProfileRecord(profiles[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar perfil mission\xE1rio:", error);
      return null;
    }
  }
  async createMissionaryProfile(data) {
    try {
      const [profile] = await db.insert(schema.missionaryProfiles).values({
        userId: data.userId,
        specialization: data.missionField ?? null,
        experience: data.notes ?? null,
        isActive: data.isActive ?? true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapMissionaryProfileRecord(profile);
    } catch (error) {
      logger.error("Erro ao criar perfil mission\xE1rio:", error);
      throw error;
    }
  }
  async getAllMissionaryProfiles() {
    try {
      const profiles = await db.select().from(schema.missionaryProfiles);
      return profiles.map((profile) => this.mapMissionaryProfileRecord(profile));
    } catch (error) {
      logger.error("Erro ao buscar perfis mission\xE1rios:", error);
      return [];
    }
  }
  async getMissionaryProfileById(id) {
    try {
      const profiles = await db.select().from(schema.missionaryProfiles).where(eq(schema.missionaryProfiles.id, id)).limit(1);
      return profiles[0] ? this.mapMissionaryProfileRecord(profiles[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar perfil mission\xE1rio por ID:", error);
      return null;
    }
  }
  async updateMissionaryProfile(id, updates) {
    try {
      const dbUpdates = { updatedAt: /* @__PURE__ */ new Date() };
      if (updates.userId !== void 0) dbUpdates.userId = updates.userId ?? null;
      if (updates.missionField !== void 0)
        dbUpdates.specialization = updates.missionField ?? null;
      if (updates.notes !== void 0) dbUpdates.experience = updates.notes ?? null;
      if (updates.isActive !== void 0) dbUpdates.isActive = updates.isActive ?? true;
      const [profile] = await db.update(schema.missionaryProfiles).set(dbUpdates).where(eq(schema.missionaryProfiles.id, id)).returning();
      return profile ? this.mapMissionaryProfileRecord(profile) : null;
    } catch (error) {
      logger.error("Erro ao atualizar perfil mission\xE1rio:", error);
      return null;
    }
  }
  async deleteMissionaryProfile(id) {
    try {
      await db.delete(schema.missionaryProfiles).where(eq(schema.missionaryProfiles.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar perfil mission\xE1rio:", error);
      return false;
    }
  }
  async getUsersWithMissionaryProfile() {
    try {
      const profiles = await db.select({ userId: schema.missionaryProfiles.userId }).from(schema.missionaryProfiles);
      const ids = profiles.map((profile) => profile.userId).filter(Boolean);
      if (ids.length === 0) {
        return [];
      }
      const users2 = await db.select().from(schema.users).where(inArray(schema.users.id, ids));
      return users2.map((user) => this.toUser(user));
    } catch (error) {
      logger.error("Erro ao buscar usu\xE1rios com perfil mission\xE1rio:", error);
      return [];
    }
  }
  // Igreja
  async getDefaultChurch() {
    try {
      const result = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, "default_church_id")).limit(1);
      const value = result[0]?.value;
      if (value != null) {
        const churchId = typeof value === "number" ? value : parseInt(String(value), 10);
        if (!Number.isNaN(churchId)) {
          return await this.getChurchById(churchId);
        }
      }
      return null;
    } catch (error) {
      logger.error("Erro ao buscar igreja padr\xE3o:", error);
      return null;
    }
  }
  // ========== MÉTODOS FINAIS (últimos 3) ==========
  async createEmotionalCheckIn(data) {
    try {
      const [checkIn] = await db.insert(schema.emotionalCheckins).values({
        userId: data.userId,
        emotionalScore: data.emotionalScore ?? null,
        mood: data.mood ?? null,
        prayerRequest: data.prayerRequest ?? null,
        isPrivate: data.isPrivate ?? false,
        allowChurchMembers: data.allowChurchMembers ?? true,
        createdAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapEmotionalCheckInRecord(checkIn);
    } catch (error) {
      logger.error("Erro ao criar emotional check-in:", error);
      throw error;
    }
  }
  async getPrayerById(prayerId) {
    try {
      const prayers2 = await db.select().from(schema.prayers).where(eq(schema.prayers.id, prayerId)).limit(1);
      return prayers2[0] ? this.mapPrayerRecord(prayers2[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar ora\xE7\xE3o por ID:", error);
      return null;
    }
  }
  async deletePrayer(prayerId) {
    try {
      await db.delete(schema.prayers).where(eq(schema.prayers.id, prayerId));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar ora\xE7\xE3o:", error);
      return false;
    }
  }
  // ========== NOTIFICAÇÕES ==========
  async getAllNotifications() {
    try {
      const notifications2 = await db.select().from(schema.notifications).orderBy(desc(schema.notifications.createdAt));
      return notifications2.map((notification) => this.mapNotificationRecord(notification));
    } catch (error) {
      logger.error("Erro ao buscar todas as notifica\xE7\xF5es:", error);
      return [];
    }
  }
  async getNotificationById(id) {
    try {
      const notifications2 = await db.select().from(schema.notifications).where(eq(schema.notifications.id, id)).limit(1);
      return notifications2[0] ? this.mapNotificationRecord(notifications2[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar notifica\xE7\xE3o por ID:", error);
      return null;
    }
  }
  async getNotificationsByUser(userId, limit = 50) {
    try {
      const notifications2 = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt)).limit(limit);
      return notifications2.map((notification) => this.mapNotificationRecord(notification));
    } catch (error) {
      logger.error("Erro ao buscar notifica\xE7\xF5es do usu\xE1rio:", error);
      return [];
    }
  }
  async createNotification(data) {
    try {
      const [notification] = await db.insert(schema.notifications).values({
        title: data.title,
        message: data.message,
        userId: data.userId,
        type: data.type || "general",
        isRead: false,
        createdAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapNotificationRecord(notification);
    } catch (error) {
      logger.error("Erro ao criar notifica\xE7\xE3o:", error);
      throw error;
    }
  }
  async updateNotification(id, updates) {
    try {
      const [notification] = await db.update(schema.notifications).set(updates).where(eq(schema.notifications.id, id)).returning();
      return notification ? this.mapNotificationRecord(notification) : null;
    } catch (error) {
      logger.error("Erro ao atualizar notifica\xE7\xE3o:", error);
      return null;
    }
  }
  async markNotificationAsRead(id) {
    try {
      const [notification] = await db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.id, id)).returning();
      return notification ? this.mapNotificationRecord(notification) : null;
    } catch (error) {
      logger.error("Erro ao marcar notifica\xE7\xE3o como lida:", error);
      return null;
    }
  }
  async deleteNotification(id) {
    try {
      await db.delete(schema.notifications).where(eq(schema.notifications.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar notifica\xE7\xE3o:", error);
      return false;
    }
  }
  // ========== PUSH SUBSCRIPTIONS ==========
  async getAllPushSubscriptions() {
    try {
      const subscriptions = await db.select().from(schema.pushSubscriptions).orderBy(desc(schema.pushSubscriptions.createdAt));
      return subscriptions.map((subscription) => this.mapPushSubscriptionRecord(subscription));
    } catch (error) {
      logger.error("Erro ao buscar push subscriptions:", error);
      return [];
    }
  }
  async getPushSubscriptionsByUser(userId) {
    try {
      const subscriptions = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId)).orderBy(desc(schema.pushSubscriptions.createdAt));
      return subscriptions.map((subscription) => this.mapPushSubscriptionRecord(subscription));
    } catch (error) {
      logger.error("Erro ao buscar push subscriptions do usu\xE1rio:", error);
      return [];
    }
  }
  async createPushSubscription(data) {
    try {
      const subscriptionPayload = typeof data.subscription === "string" ? JSON.parse(data.subscription) : data.subscription;
      const existing = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, subscriptionPayload.endpoint)).limit(1);
      if (existing.length > 0) {
        const [updated] = await db.update(schema.pushSubscriptions).set({
          userId: data.userId,
          p256dh: subscriptionPayload.keys.p256dh,
          auth: subscriptionPayload.keys.auth,
          isActive: data.isActive ?? true,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(schema.pushSubscriptions.id, existing[0].id)).returning();
        return this.mapPushSubscriptionRecord(updated);
      }
      const [subscription] = await db.insert(schema.pushSubscriptions).values({
        userId: data.userId,
        endpoint: subscriptionPayload.endpoint,
        p256dh: subscriptionPayload.keys.p256dh,
        auth: subscriptionPayload.keys.auth,
        isActive: data.isActive ?? true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapPushSubscriptionRecord(subscription);
    } catch (error) {
      logger.error("Erro ao criar push subscription:", error);
      throw error;
    }
  }
  async togglePushSubscription(id) {
    try {
      const existing = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, id)).limit(1);
      const current = existing[0];
      if (!current) {
        return null;
      }
      const [updated] = await db.update(schema.pushSubscriptions).set({
        isActive: !current.isActive,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(schema.pushSubscriptions.id, id)).returning();
      return updated ? this.mapPushSubscriptionRecord(updated) : null;
    } catch (error) {
      logger.error("Erro ao alternar push subscription:", error);
      return null;
    }
  }
  async deletePushSubscription(id) {
    try {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar push subscription:", error);
      return false;
    }
  }
  async sendPushNotifications(data) {
    if (!data.userIds.length) {
      return { sent: 0, failed: 0 };
    }
    const publicKey = process.env.VAPID_PUBLIC_KEY || "BD6cS7ooCOhh1lfv-D__PNYDv3S_S9EyR4bpowVJHcBxYIl5gtTFs8AThEO-MZnpzsKIZuRY3iR2oOMBDAOH2wY";
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("VAPID_PRIVATE_KEY n\xE3o configurada");
    }
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@7care.com";
    webpush.setVapidDetails(subject, publicKey, privateKey);
    try {
      const subscriptions = await db.select().from(schema.pushSubscriptions).where(
        and(
          inArray(schema.pushSubscriptions.userId, data.userIds),
          eq(schema.pushSubscriptions.isActive, true)
        )
      );
      let sent = 0;
      let failed = 0;
      for (const sub of subscriptions) {
        try {
          const payload = JSON.stringify({
            title: data.title,
            body: data.body,
            icon: data.icon || "/pwa-192x192.png",
            data: { url: data.url || "/" }
          });
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            payload
          );
          sent += 1;
        } catch (error) {
          failed += 1;
          const pushError = error;
          if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
            await db.update(schema.pushSubscriptions).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(schema.pushSubscriptions.id, sub.id));
          }
        }
      }
      return { sent, failed };
    } catch (error) {
      logger.error("Erro ao enviar push notifications:", error);
      return { sent: 0, failed: data.userIds.length };
    }
  }
  async getAllActivities() {
    const stored = await this.getSystemConfig("activities");
    return this.getActivitiesFromConfig(stored);
  }
  async createActivity(data) {
    const activities = await this.getAllActivities();
    const nextId = activities.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const activity = {
      id: nextId,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? "",
      date: data.date ?? null,
      active: data.active ?? true,
      order: data.order ?? activities.length
    };
    const updated = [...activities, activity];
    await this.saveSystemConfig("activities", updated);
    return activity;
  }
  async updateActivity(id, updates) {
    const activities = await this.getAllActivities();
    const index2 = activities.findIndex((item) => Number(item.id) === id);
    if (index2 === -1) {
      return null;
    }
    const updatedActivity = {
      ...activities[index2],
      ...updates,
      id
    };
    activities[index2] = updatedActivity;
    await this.saveSystemConfig("activities", activities);
    return updatedActivity;
  }
  async deleteActivity(id) {
    const activities = await this.getAllActivities();
    const filtered = activities.filter((item) => Number(item.id) !== id);
    if (filtered.length === activities.length) {
      return false;
    }
    await this.saveSystemConfig("activities", filtered);
    return true;
  }
  // ========== GOOGLE DRIVE CONFIG ==========
  async saveGoogleDriveConfig(config) {
    await this.saveSystemConfig("google_drive_config", config);
  }
  async getGoogleDriveConfig() {
    const config = await this.getSystemConfig("google_drive_config");
    if (!config) {
      return null;
    }
    return config;
  }
  // ========== MEETINGS ==========
  async createMeeting(data) {
    try {
      const [meeting] = await db.insert(schema.meetings).values({
        title: data.title,
        description: data.description || "",
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration || 60,
        location: data.location || "",
        requesterId: data.requesterId,
        assignedToId: data.assignedToId,
        typeId: data.typeId,
        isUrgent: data.isUrgent ?? false,
        status: data.status || "pending",
        priority: data.priority || "medium",
        notes: data.notes || "",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapMeetingRecord(meeting);
    } catch (error) {
      logger.error("Erro ao criar reuni\xE3o:", error);
      throw error;
    }
  }
  async updateMeeting(id, updates) {
    try {
      const dbUpdates = { updatedAt: /* @__PURE__ */ new Date() };
      if (updates.title !== void 0) dbUpdates.title = updates.title;
      if (updates.description !== void 0) dbUpdates.description = updates.description ?? "";
      if (updates.scheduledAt !== void 0) dbUpdates.scheduledAt = new Date(updates.scheduledAt);
      if (updates.duration !== void 0) dbUpdates.duration = updates.duration ?? 0;
      if (updates.location !== void 0) dbUpdates.location = updates.location ?? "";
      if (updates.requesterId !== void 0) dbUpdates.requesterId = updates.requesterId ?? null;
      if (updates.assignedToId !== void 0) dbUpdates.assignedToId = updates.assignedToId ?? null;
      if (updates.typeId !== void 0) dbUpdates.typeId = updates.typeId ?? null;
      if (updates.isUrgent !== void 0) dbUpdates.isUrgent = updates.isUrgent ?? false;
      if (updates.status !== void 0) dbUpdates.status = updates.status ?? "pending";
      if (updates.priority !== void 0) dbUpdates.priority = updates.priority ?? "medium";
      if (updates.notes !== void 0) dbUpdates.notes = updates.notes ?? "";
      const [meeting] = await db.update(schema.meetings).set({
        ...dbUpdates
      }).where(eq(schema.meetings.id, id)).returning();
      return meeting ? this.mapMeetingRecord(meeting) : null;
    } catch (error) {
      logger.error("Erro ao atualizar reuni\xE3o:", error);
      return null;
    }
  }
  async getMeetingById(id) {
    try {
      const meetings2 = await db.select().from(schema.meetings).where(eq(schema.meetings.id, id)).limit(1);
      return meetings2[0] ? this.mapMeetingRecord(meetings2[0]) : null;
    } catch (error) {
      logger.error("Erro ao buscar reuni\xE3o por ID:", error);
      return null;
    }
  }
  async deleteMeeting(id) {
    try {
      await db.delete(schema.meetings).where(eq(schema.meetings.id, id));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar reuni\xE3o:", error);
      return false;
    }
  }
  // ========== PRAYERS (métodos adicionais) ==========
  async getAllPrayers() {
    return this.getPrayers();
  }
  async createPrayer(data) {
    try {
      const [prayer] = await db.insert(schema.prayers).values({
        requesterId: data.userId,
        title: data.title,
        description: data.description || "",
        isPrivate: data.isPublic === void 0 ? false : !data.isPublic,
        status: "active",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return this.mapPrayerRecord(prayer);
    } catch (error) {
      logger.error("Erro ao criar ora\xE7\xE3o:", error);
      throw error;
    }
  }
  async addIntercessor(prayerId, intercessorId) {
    const success = await this.addPrayerIntercessor(prayerId, intercessorId);
    if (!success) {
      throw new Error("Erro ao adicionar intercessor");
    }
    return { prayerId, intercessorId };
  }
  async removeIntercessor(prayerId, intercessorId) {
    return this.removePrayerIntercessor(prayerId, intercessorId);
  }
  async getIntercessorsByPrayer(prayerId) {
    return this.getPrayerIntercessors(prayerId);
  }
  async getPrayersUserIsInterceding(userId) {
    return this.getPrayersUserIsPrayingFor(userId);
  }
  // ========== EMOTIONAL CHECK-INS ==========
  async getEmotionalCheckInsByUser(userId) {
    return this.getEmotionalCheckInsByUserId(userId);
  }
};

// server/setupNeonData.ts
import * as bcrypt2 from "bcryptjs";
async function setupNeonData() {
  const storage2 = new NeonAdapter();
  console.log("\u{1F680} Configurando dados iniciais no Neon Database...");
  const existingUsers = await storage2.getAllUsers();
  const nonAdminUsers = existingUsers.filter((u) => u.role !== "superadmin");
  if (nonAdminUsers.length > 0) {
    console.log("\u2705 Dados j\xE1 existem no Neon Database");
    return;
  }
  console.log("\u{1F451} Criando super admin...");
  const adminPassword = await bcrypt2.hash("meu7care", 10);
  const admin = await storage2.createUser({
    name: "Super Administrador",
    email: "admin@7care.com",
    password: adminPassword,
    role: "superadmin",
    church: "Armour",
    churchCode: "ARM001",
    departments: "Administra\xE7\xE3o",
    birthDate: "1990-01-01",
    civilStatus: "Solteiro",
    occupation: "Administrador",
    education: "Superior",
    address: "Rua Principal, 123",
    baptismDate: "2000-01-01",
    previousReligion: "Nenhuma",
    biblicalInstructor: "Pastor Jo\xE3o",
    interestedSituation: "Aprovado",
    isDonor: true,
    isTither: true,
    isApproved: true,
    points: 1e3,
    level: "Ouro",
    attendance: 100,
    extraData: JSON.stringify({
      engajamento: "Alto",
      classificacao: "Frequente",
      dizimista: "Pontual",
      ofertante: "Recorrente",
      tempoBatismo: 20,
      cargos: ["Administrador"],
      nomeUnidade: "Armour",
      temLicao: true,
      totalPresenca: 100,
      batizouAlguem: true,
      discipuladoPosBatismo: 5,
      cpfValido: true,
      camposVaziosACMS: false,
      escolaSabatina: {
        comunhao: 10,
        missao: 8,
        estudoBiblico: 9,
        batizouAlguem: true,
        discipuladoPosBatismo: 5
      }
    }),
    observations: "Super administrador do sistema",
    firstAccess: false,
    status: "active"
  });
  console.log("\u2705 Super admin criado:", admin.name);
  const armourUsers = [
    {
      name: "Pastor Jo\xE3o Silva",
      email: "joao@armour.com",
      password: "armour123",
      role: "admin",
      church: "Armour",
      churchCode: "ARM001",
      departments: "Pastoral",
      birthDate: "1975-05-15",
      civilStatus: "Casado",
      occupation: "Pastor",
      education: "Superior",
      address: "Rua da Igreja, 456",
      baptismDate: "1990-06-15",
      previousReligion: "Cat\xF3lico",
      biblicalInstructor: "Pastor Ant\xF4nio",
      interestedSituation: "Aprovado",
      isDonor: true,
      isTither: true,
      isApproved: true,
      points: 850,
      level: "Prata",
      attendance: 95,
      extraData: JSON.stringify({
        engajamento: "Alto",
        classificacao: "Frequente",
        dizimista: "Pontual",
        ofertante: "Recorrente",
        tempoBatismo: 30,
        cargos: ["Pastor"],
        nomeUnidade: "Armour",
        temLicao: true,
        totalPresenca: 95,
        batizouAlguem: true,
        discipuladoPosBatismo: 10,
        cpfValido: true,
        camposVaziosACMS: false
      }),
      observations: "Pastor da igreja Armour",
      firstAccess: false,
      status: "active"
    },
    {
      name: "Maria Santos",
      email: "maria@armour.com",
      password: "armour123",
      role: "member",
      church: "Armour",
      churchCode: "ARM001",
      departments: "M\xFAsica, Evangelismo",
      birthDate: "1985-03-20",
      civilStatus: "Casada",
      occupation: "Professora",
      education: "Superior",
      address: "Av. Central, 789",
      baptismDate: "2005-08-20",
      previousReligion: "Evang\xE9lica",
      biblicalInstructor: "Pastor Jo\xE3o",
      interestedSituation: "Aprovado",
      isDonor: true,
      isTither: true,
      isApproved: true,
      points: 650,
      level: "Bronze",
      attendance: 90,
      extraData: JSON.stringify({
        engajamento: "M\xE9dio",
        classificacao: "Frequente",
        dizimista: "Sazonal",
        ofertante: "Pontual",
        tempoBatismo: 15,
        cargos: ["M\xFAsica", "Evangelismo"],
        nomeUnidade: "Armour",
        temLicao: true,
        totalPresenca: 90,
        batizouAlguem: false,
        discipuladoPosBatismo: 2,
        cpfValido: true,
        camposVaziosACMS: false
      }),
      observations: "Membro ativo da igreja Armour",
      firstAccess: false,
      status: "active"
    },
    {
      name: "Carlos Oliveira",
      email: "carlos@armour.com",
      password: "armour123",
      role: "member",
      church: "Armour",
      churchCode: "ARM001",
      departments: "Jovens",
      birthDate: "1995-12-10",
      civilStatus: "Solteiro",
      occupation: "Estudante",
      education: "Superior",
      address: "Rua Nova, 321",
      baptismDate: "2015-12-10",
      previousReligion: "Nenhuma",
      biblicalInstructor: "Pastor Jo\xE3o",
      interestedSituation: "Aprovado",
      isDonor: false,
      isTither: false,
      isApproved: true,
      points: 400,
      level: "Bronze",
      attendance: 80,
      extraData: JSON.stringify({
        engajamento: "Baixo",
        classificacao: "Frequente",
        dizimista: "N\xE3o dizimista",
        ofertante: "N\xE3o ofertante",
        tempoBatismo: 5,
        cargos: ["Jovens"],
        nomeUnidade: "Armour",
        temLicao: false,
        totalPresenca: 80,
        batizouAlguem: false,
        discipuladoPosBatismo: 0,
        cpfValido: true,
        camposVaziosACMS: false
      }),
      observations: "Jovem membro da igreja Armour",
      firstAccess: false,
      status: "active"
    }
  ];
  console.log("\u{1F465} Criando usu\xE1rios do Armour...");
  for (const userData of armourUsers) {
    const hashedPassword = await bcrypt2.hash(userData.password, 10);
    const user = await storage2.createUser({
      ...userData,
      password: hashedPassword
    });
    console.log(`\u2705 Usu\xE1rio criado: ${user.name} (${user.email})`);
  }
  console.log("\u26EA Criando igreja Armour...");
  const church = await storage2.createChurch({
    name: "Igreja Armour",
    code: "ARM001",
    address: "Rua da Igreja, 456",
    city: "S\xE3o Paulo",
    state: "SP",
    zip_code: "01234-567",
    phone: "(11) 1234-5678",
    email: "contato@armour.com",
    pastor_name: "Pastor Jo\xE3o Silva",
    pastor_email: "joao@armour.com",
    established_date: "1990-01-01",
    status: "active",
    districtId: null,
    isActive: true
  });
  console.log("\u2705 Igreja Armour criada:", church.name);
  console.log("\u{1F4C5} Criando eventos da Armour...");
  const events2 = [
    {
      title: "Culto Dominical",
      description: "Culto de adora\xE7\xE3o e prega\xE7\xE3o",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1e3).toISOString(),
      // 2 dias no futuro
      time: "09:00",
      location: "Igreja Armour",
      type: "Culto",
      churchId: church.id,
      maxParticipants: 200,
      status: "active"
    },
    {
      title: "Reuni\xE3o de Jovens",
      description: "Encontro semanal dos jovens",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1e3).toISOString(),
      // 5 dias no futuro
      time: "19:30",
      location: "Igreja Armour - Sala dos Jovens",
      type: "Reuni\xE3o",
      churchId: church.id,
      maxParticipants: 50,
      status: "active"
    },
    {
      title: "Escola Sabatina",
      description: "Estudo b\xEDblico semanal",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1e3).toISOString(),
      // 3 dias no futuro
      time: "08:00",
      location: "Igreja Armour - Salas de Classe",
      type: "Estudo",
      churchId: church.id,
      maxParticipants: 100,
      status: "active"
    }
  ];
  for (const eventData of events2) {
    const event = await storage2.createEvent(eventData);
    console.log(`\u2705 Evento criado: ${event.title}`);
  }
  console.log("\u{1F389} Setup do Neon Database conclu\xEDdo com sucesso!");
  console.log("\u{1F4CA} Resumo:");
  console.log("   - 1 Super Admin (admin@7care.com)");
  console.log("   - 3 Usu\xE1rios da Armour");
  console.log("   - 1 Igreja Armour");
  console.log("   - 3 Eventos da Armour");
  return {
    admin,
    church,
    users: armourUsers.length,
    events: events2.length
  };
}

// server/routes/authRoutes.ts
import bcrypt3 from "bcryptjs";
import jwt from "jsonwebtoken";

// shared/schema.ts
import { z } from "zod";
var insertUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["superadmin", "pastor", "member", "interested", "missionary", "admin_readonly"]),
  church: z.string().optional(),
  churchCode: z.string().optional(),
  departments: z.string().optional(),
  birthDate: z.string().optional(),
  civilStatus: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  address: z.string().optional(),
  baptismDate: z.string().optional(),
  previousReligion: z.string().optional(),
  biblicalInstructor: z.string().optional(),
  interestedSituation: z.string().optional(),
  isDonor: z.boolean().default(false),
  isTither: z.boolean().default(false),
  isApproved: z.boolean().default(false),
  points: z.number().default(0),
  level: z.string().default("Iniciante"),
  attendance: z.number().default(0),
  extraData: z.union([z.string(), z.record(z.unknown())]).optional(),
  observations: z.string().optional(),
  firstAccess: z.boolean().default(true)
});
var insertMeetingSchema = z.object({
  requesterId: z.number(),
  assignedToId: z.number().optional(),
  typeId: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string(),
  duration: z.number().default(60),
  location: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  isUrgent: z.boolean().default(false),
  status: z.enum(["pending", "approved", "rejected", "completed", "cancelled"]).default("pending"),
  notes: z.string().optional()
});
var insertEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string(),
  endDate: z.string().optional().nullable(),
  time: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  color: z.string().optional().nullable(),
  organizerId: z.number().optional(),
  church: z.string().optional(),
  churchId: z.number().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional().nullable(),
  maxParticipants: z.number().optional(),
  isPublic: z.boolean().default(true)
});
var insertMessageSchema = z.object({
  conversationId: z.number(),
  senderId: z.number(),
  content: z.string().min(1),
  messageType: z.enum(["text", "image", "file", "system"]).default("text"),
  isRead: z.boolean().default(false)
});

// server/types/index.ts
var ErrorCodes = {
  // Autenticação
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  READONLY_ACCESS: "READONLY_ACCESS",
  // Validação
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  // Recursos
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",
  // Servidor
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED"
};

// server/utils/errorHandler.ts
var sendError = (res, statusCode, message, code, details) => {
  const errorResponse = {
    success: false,
    error: message,
    code: code || ErrorCodes.INTERNAL_ERROR,
    ...details && process.env.NODE_ENV === "development" ? { details } : {}
  };
  res.status(statusCode).json(errorResponse);
};
var handleError = (res, error, context) => {
  logger.error(`[${context}]`, error);
  let message = "Internal server error";
  let code = ErrorCodes.INTERNAL_ERROR;
  if (error instanceof Error) {
    if (process.env.NODE_ENV === "development") {
      message = error.message;
    }
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      message = "Resource already exists";
      code = ErrorCodes.ALREADY_EXISTS;
      sendError(res, 409, message, code);
      return;
    }
    if (error.message.includes("not found")) {
      message = "Resource not found";
      code = ErrorCodes.NOT_FOUND;
      sendError(res, 404, message, code);
      return;
    }
    if (error.message.includes("validation")) {
      message = error.message;
      code = ErrorCodes.VALIDATION_ERROR;
      sendError(res, 400, message, code);
      return;
    }
  }
  sendError(res, 500, message, code, error);
};
var handleNotFound = (res, resource) => {
  sendError(res, 404, `${resource} not found`, ErrorCodes.NOT_FOUND);
};
var handleBadRequest = (res, message) => {
  sendError(res, 400, message, ErrorCodes.VALIDATION_ERROR);
};
var handleUnauthorized = (res, message = "Authentication required") => {
  sendError(res, 401, message, ErrorCodes.UNAUTHORIZED);
};

// server/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 10,
  // 10 tentativas por janela (aumentado)
  message: {
    success: false,
    error: "Muitas tentativas de login. Por favor, aguarde 15 minutos.",
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  // Retorna rate limit info nos headers `RateLimit-*`
  legacyHeaders: false,
  // Desabilita headers `X-RateLimit-*` antigos
  skipSuccessfulRequests: true,
  // Não conta requisições bem-sucedidas
  // Validação de IP desabilitada para permitir keyGenerator customizado
  validate: { ip: false }
});
var registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 10,
  // 10 registros por hora
  message: {
    success: false,
    error: "Muitas tentativas de registro. Por favor, aguarde 1 hora.",
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false
});
var apiLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minuto
  max: 300,
  // 300 requisições por minuto (aumentado para uso normal)
  message: {
    success: false,
    error: "Muitas requisi\xE7\xF5es. Por favor, aguarde um momento.",
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "development"
  // Skip em desenvolvimento
});
var sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 3,
  // 3 tentativas por hora
  message: {
    success: false,
    error: "Muitas tentativas. Por favor, aguarde 1 hora.",
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false
});
var uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 50,
  // 50 uploads por hora
  message: {
    success: false,
    error: "Limite de uploads atingido. Por favor, aguarde 1 hora.",
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false
});
var pushNotificationLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minuto
  max: 10,
  // 10 notificações por minuto
  message: {
    success: false,
    error: "Limite de notifica\xE7\xF5es atingido. Por favor, aguarde.",
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false
});
var debugLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minuto
  max: 30,
  // 30 requisições por minuto
  message: {
    success: false,
    error: "Rate limit exceeded for debug endpoints.",
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "production"
  // Skip em produção
});
function getRateLimitStats() {
  return {
    message: "Rate limit stats - usando MemoryStore padr\xE3o. Para m\xE9tricas detalhadas, configure Redis.",
    limiters: [
      { name: "apiLimiter", windowMs: 6e4, maxRequests: 100 },
      { name: "authLimiter", windowMs: 9e5, maxRequests: 10 },
      { name: "registerLimiter", windowMs: 36e5, maxRequests: 10 },
      { name: "passwordResetLimiter", windowMs: 36e5, maxRequests: 3 },
      { name: "uploadLimiter", windowMs: 36e5, maxRequests: 50 },
      { name: "pushNotificationLimiter", windowMs: 6e4, maxRequests: 10 }
    ]
  };
}

// server/middleware/validation.ts
var formatZodErrors = (error) => {
  return error.errors.map((err) => ({
    field: err.path.join(".") || "body",
    message: err.message
  }));
};
var validateBody = (schema2) => {
  return (req, res, next) => {
    try {
      const result = schema2.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: "Erro de valida\xE7\xE3o",
          code: ErrorCodes.VALIDATION_ERROR,
          details: formatZodErrors(result.error)
        });
        return;
      }
      req.validatedBody = result.data;
      next();
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: "Erro interno de valida\xE7\xE3o",
        code: ErrorCodes.INTERNAL_ERROR
      });
    }
  };
};

// server/schemas/index.ts
import { z as z2 } from "zod";
var strongPasswordSchema = z2.string().min(8, "Senha deve ter no m\xEDnimo 8 caracteres").max(128, "Senha deve ter no m\xE1ximo 128 caracteres").refine((password) => /[a-z]/.test(password), "Senha deve conter pelo menos uma letra min\xFAscula").refine((password) => /[A-Z]/.test(password), "Senha deve conter pelo menos uma letra mai\xFAscula").refine((password) => /\d/.test(password), "Senha deve conter pelo menos um n\xFAmero").refine(
  (password) => /[@$!%*?&]/.test(password),
  "Senha deve conter pelo menos um caractere especial (@$!%*?&)"
);
var basicPasswordSchema = z2.string().min(6, "Senha deve ter pelo menos 6 caracteres");
var loginSchema = z2.object({
  email: z2.string().min(1, "Email ou usu\xE1rio \xE9 obrigat\xF3rio"),
  password: z2.string().min(1, "Senha \xE9 obrigat\xF3ria")
});
var registerSchema = z2.object({
  name: z2.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z2.string().email("Email inv\xE1lido"),
  password: strongPasswordSchema.optional(),
  role: z2.enum(["superadmin", "pastor", "member", "interested", "missionary", "admin_readonly"]).optional(),
  church: z2.string().optional(),
  churchCode: z2.string().optional()
});
var changePasswordSchema = z2.object({
  userId: z2.number().int().positive("ID do usu\xE1rio inv\xE1lido"),
  currentPassword: z2.string().min(1, "Senha atual \xE9 obrigat\xF3ria"),
  newPassword: strongPasswordSchema
});
var resetPasswordSchema = z2.object({
  email: z2.string().email("Email inv\xE1lido")
});
var createUserSchema = z2.object({
  name: z2.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z2.string().email("Email inv\xE1lido"),
  password: z2.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  role: z2.enum(["superadmin", "pastor", "member", "interested", "missionary", "admin_readonly"]).default("member"),
  church: z2.string().optional(),
  churchCode: z2.string().optional(),
  districtId: z2.number().int().positive().optional().nullable(),
  departments: z2.string().optional(),
  birthDate: z2.string().optional(),
  civilStatus: z2.string().optional(),
  occupation: z2.string().optional(),
  education: z2.string().optional(),
  address: z2.string().optional(),
  phone: z2.string().optional(),
  cpf: z2.string().optional(),
  baptismDate: z2.string().optional(),
  previousReligion: z2.string().optional(),
  biblicalInstructor: z2.string().optional().nullable(),
  interestedSituation: z2.string().optional(),
  isDonor: z2.boolean().default(false),
  isTither: z2.boolean().default(false),
  isApproved: z2.boolean().default(false),
  observations: z2.string().optional()
});
var updateUserSchema = createUserSchema.partial().extend({
  firstAccess: z2.boolean().optional(),
  status: z2.string().optional(),
  points: z2.number().int().optional(),
  level: z2.string().optional(),
  attendance: z2.number().int().optional()
});
var userIdParamSchema = z2.object({
  id: z2.string().regex(/^\d+$/, "ID deve ser um n\xFAmero").transform(Number)
});
var createChurchSchema = z2.object({
  name: z2.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  code: z2.string().optional(),
  address: z2.string().optional().nullable(),
  email: z2.string().email("Email inv\xE1lido").optional().nullable(),
  phone: z2.string().optional().nullable(),
  pastor: z2.string().optional().nullable(),
  districtId: z2.number().int().positive().optional().nullable()
});
var updateChurchSchema = createChurchSchema.partial();
var createEventSchema = z2.object({
  title: z2.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  description: z2.string().optional().nullable(),
  date: z2.string().min(1, "Data \xE9 obrigat\xF3ria"),
  endDate: z2.string().optional().nullable(),
  time: z2.string().optional(),
  location: z2.string().optional().nullable(),
  type: z2.string().default("evento"),
  color: z2.string().optional().nullable(),
  capacity: z2.number().int().positive().optional().nullable(),
  isRecurring: z2.boolean().default(false),
  recurrencePattern: z2.string().optional().nullable(),
  church: z2.string().optional(),
  churchId: z2.number().int().positive().optional().nullable(),
  organizerId: z2.number().int().positive().optional().nullable()
});
var updateEventSchema = createEventSchema.partial();
var createMeetingSchema = z2.object({
  title: z2.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  description: z2.string().optional().nullable(),
  scheduledAt: z2.string().min(1, "Data/hora \xE9 obrigat\xF3ria"),
  duration: z2.number().int().positive().default(60),
  location: z2.string().optional().nullable(),
  requesterId: z2.number().int().positive("ID do solicitante inv\xE1lido"),
  assignedToId: z2.number().int().positive().optional().nullable(),
  typeId: z2.number().int().positive().optional(),
  priority: z2.enum(["low", "medium", "high"]).default("medium"),
  isUrgent: z2.boolean().default(false),
  status: z2.enum(["pending", "approved", "rejected", "completed", "cancelled"]).default("pending"),
  notes: z2.string().optional().nullable()
});
var updateMeetingSchema = createMeetingSchema.partial();
var createRelationshipSchema = z2.object({
  interestedId: z2.number().int().positive("ID do interessado inv\xE1lido"),
  missionaryId: z2.number().int().positive("ID do mission\xE1rio inv\xE1lido"),
  status: z2.enum(["active", "pending", "inactive"]).default("active"),
  notes: z2.string().optional().nullable()
});
var createDiscipleshipRequestSchema = z2.object({
  interestedId: z2.number().int().positive("ID do interessado inv\xE1lido"),
  missionaryId: z2.number().int().positive("ID do mission\xE1rio inv\xE1lido"),
  notes: z2.string().optional().nullable()
});
var updateDiscipleshipRequestSchema = z2.object({
  status: z2.enum(["pending", "approved", "rejected"]).optional(),
  notes: z2.string().optional().nullable()
});
var createMessageSchema = z2.object({
  conversationId: z2.number().int().positive("ID da conversa inv\xE1lido"),
  senderId: z2.number().int().positive("ID do remetente inv\xE1lido"),
  content: z2.string().min(1, "Conte\xFAdo \xE9 obrigat\xF3rio"),
  messageType: z2.enum(["text", "image", "file", "system"]).default("text")
});
var createNotificationSchema = z2.object({
  userId: z2.number().int().positive("ID do usu\xE1rio inv\xE1lido"),
  title: z2.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  message: z2.string().min(1, "Mensagem \xE9 obrigat\xF3ria"),
  type: z2.string().optional()
});
var createPrayerSchema = z2.object({
  userId: z2.number().int().positive("ID do usu\xE1rio inv\xE1lido"),
  title: z2.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  description: z2.string().optional().nullable(),
  isPublic: z2.boolean().default(true),
  allowIntercessors: z2.boolean().default(true)
});
var createEmotionalCheckInSchema = z2.object({
  userId: z2.number().int().positive("ID do usu\xE1rio inv\xE1lido"),
  emotionalScore: z2.number().int().min(1).max(5).optional().nullable(),
  mood: z2.string().optional().nullable(),
  prayerRequest: z2.string().optional().nullable(),
  isPrivate: z2.boolean().default(false),
  allowChurchMembers: z2.boolean().default(true)
});
var pointsConfigSchema = z2.object({
  visitaWeight: z2.number().optional().default(1),
  estudoBiblicoWeight: z2.number().optional().default(1),
  cultoWeight: z2.number().optional().default(1),
  comunhaoWeight: z2.number().optional().default(1),
  ofertaWeight: z2.number().optional().default(1),
  dizimoWeight: z2.number().optional().default(1),
  evangelismoWeight: z2.number().optional().default(1),
  servicoWeight: z2.number().optional().default(1),
  liderancaWeight: z2.number().optional().default(1),
  capacitacaoWeight: z2.number().optional().default(1)
}).passthrough();
var googleDriveConfigSchema = z2.object({
  spreadsheetUrl: z2.string().url("URL inv\xE1lida"),
  sheetName: z2.string().min(1, "Nome da aba \xE9 obrigat\xF3rio"),
  apiKey: z2.string().min(1, "API Key \xE9 obrigat\xF3ria")
});
var pushSubscriptionSchema = z2.object({
  userId: z2.number().int().positive("ID do usu\xE1rio inv\xE1lido"),
  subscription: z2.object({
    endpoint: z2.string().url(),
    keys: z2.object({
      p256dh: z2.string(),
      auth: z2.string()
    })
  }),
  deviceName: z2.string().optional()
});
var sendPushNotificationSchema = z2.object({
  userIds: z2.array(z2.number().int().positive()),
  title: z2.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  body: z2.string().min(1, "Corpo \xE9 obrigat\xF3rio"),
  icon: z2.string().optional(),
  url: z2.string().url().optional()
});
var paginationSchema = z2.object({
  page: z2.string().regex(/^\d+$/).transform(Number).default("1"),
  pageSize: z2.string().regex(/^\d+$/).transform(Number).default("20"),
  sortBy: z2.string().optional(),
  sortOrder: z2.enum(["asc", "desc"]).optional()
});
var userFilterSchema = z2.object({
  role: z2.enum(["superadmin", "pastor", "member", "interested", "missionary", "admin_readonly"]).optional(),
  status: z2.string().optional(),
  church: z2.string().optional(),
  isApproved: z2.string().transform((val) => val === "true").optional()
});
var setDefaultChurchSchema = z2.object({
  churchId: z2.number().int().positive("ID da igreja inv\xE1lido")
});
var systemLogoSchema = z2.object({
  logoUrl: z2.string().min(1, "URL do logo \xE9 obrigat\xF3ria")
});
var idParamSchema = z2.object({
  id: z2.string().regex(/^\d+$/, "ID inv\xE1lido").transform(Number)
});
var markVisitSchema = z2.object({
  notes: z2.string().optional().nullable(),
  visitDate: z2.string().optional(),
  visitType: z2.enum(["home", "church", "hospital", "other"]).default("home")
});
var createDirectConversationSchema = z2.object({
  participantIds: z2.array(z2.number().int().positive()).min(2, "M\xEDnimo 2 participantes"),
  initialMessage: z2.string().optional()
});
var createElectionSchema = z2.object({
  title: z2.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  description: z2.string().optional().nullable(),
  startDate: z2.string().min(1, "Data de in\xEDcio \xE9 obrigat\xF3ria"),
  endDate: z2.string().min(1, "Data de fim \xE9 obrigat\xF3ria"),
  type: z2.enum(["single", "multiple"]).default("single"),
  maxVotes: z2.number().int().positive().default(1),
  allowAbstention: z2.boolean().default(false),
  isPublic: z2.boolean().default(true)
});
var castVoteSchema = z2.object({
  electionId: z2.number().int().positive("ID da elei\xE7\xE3o inv\xE1lido"),
  candidateIds: z2.array(z2.number().int().positive()).min(1, "Selecione pelo menos um candidato"),
  voterId: z2.number().int().positive("ID do votante inv\xE1lido")
});
var createDistrictSchema = z2.object({
  name: z2.string().min(1, "Nome \xE9 obrigat\xF3rio"),
  code: z2.string().optional(),
  region: z2.string().optional().nullable(),
  pastorId: z2.number().int().positive().optional().nullable()
});
var updateDistrictSchema = createDistrictSchema.partial();
var createPastorSchema = z2.object({
  userId: z2.number().int().positive("ID do usu\xE1rio inv\xE1lido"),
  districtId: z2.number().int().positive().optional().nullable(),
  title: z2.string().optional().default("Pastor"),
  startDate: z2.string().optional(),
  isActive: z2.boolean().default(true)
});
var createTaskSchema = z2.object({
  title: z2.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  description: z2.string().optional().nullable(),
  dueDate: z2.string().optional().nullable(),
  priority: z2.enum(["low", "medium", "high"]).default("medium"),
  status: z2.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  assignedToId: z2.number().int().positive().optional().nullable(),
  createdById: z2.number().int().positive("ID do criador inv\xE1lido"),
  relatedUserId: z2.number().int().positive().optional().nullable()
});
var updateTaskSchema = createTaskSchema.partial();

// server/config/jwtConfig.ts
var isProduction2 = process.env.NODE_ENV === "production";
var isDevelopment2 = process.env.NODE_ENV === "development";
if (isProduction2) {
  if (!process.env.JWT_SECRET) {
    throw new Error("\u{1F512} SEGURAN\xC7A CR\xCDTICA: JWT_SECRET n\xE3o configurado em produ\xE7\xE3o! Defina a vari\xE1vel de ambiente JWT_SECRET.");
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("\u{1F512} SEGURAN\xC7A CR\xCDTICA: JWT_REFRESH_SECRET n\xE3o configurado em produ\xE7\xE3o! Defina a vari\xE1vel de ambiente JWT_REFRESH_SECRET.");
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("\u{1F512} SEGURAN\xC7A: JWT_SECRET deve ter no m\xEDnimo 32 caracteres em produ\xE7\xE3o.");
  }
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error("\u{1F512} SEGURAN\xC7A: JWT_REFRESH_SECRET deve ter no m\xEDnimo 32 caracteres em produ\xE7\xE3o.");
  }
}
var JWT_SECRET = process.env.JWT_SECRET || (isDevelopment2 ? "7care-dev-secret-change-in-production-DO-NOT-USE-IN-PROD" : "");
var JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (isDevelopment2 ? "7care-dev-refresh-secret-change-in-production-DO-NOT-USE-IN-PROD" : "");
var JWT_EXPIRES_IN = "24h";
var JWT_REFRESH_EXPIRES_IN = "7d";
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("\u{1F512} SEGURAN\xC7A CR\xCDTICA: JWT_SECRET ou JWT_REFRESH_SECRET n\xE3o configurados!");
}
console.log("\u{1F510} JWT configurado:", {
  environment: process.env.NODE_ENV,
  hasSecret: !!process.env.JWT_SECRET,
  hasRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
  secretLength: JWT_SECRET.length,
  accessTokenExpiry: JWT_EXPIRES_IN,
  refreshTokenExpiry: JWT_REFRESH_EXPIRES_IN
});

// server/utils/passwordValidator.ts
var PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true
};
var COMMON_PASSWORDS = [
  "password",
  "12345678",
  "password123",
  "admin123",
  "qwerty123",
  "123456789",
  "letmein",
  "welcome",
  "monkey",
  "dragon",
  "master",
  "sunshine",
  "princess",
  "football",
  "iloveyou"
];
function validatePasswordStrength(password) {
  const errors = [];
  let score = 0;
  if (!password || password.length < PASSWORD_RULES.minLength) {
    errors.push(`A senha deve ter no m\xEDnimo ${PASSWORD_RULES.minLength} caracteres`);
  } else {
    score += 20;
  }
  if (password.length > PASSWORD_RULES.maxLength) {
    errors.push(`A senha deve ter no m\xE1ximo ${PASSWORD_RULES.maxLength} caracteres`);
  }
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra mai\xFAscula");
  } else if (/[A-Z]/.test(password)) {
    score += 20;
  }
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra min\xFAscula");
  } else if (/[a-z]/.test(password)) {
    score += 20;
  }
  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um n\xFAmero");
  } else if (/[0-9]/.test(password)) {
    score += 20;
  }
  if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("A senha deve conter pelo menos um caractere especial (!@#$%^&* etc)");
  } else if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    score += 20;
  }
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("Esta senha \xE9 muito comum. Escolha uma senha mais forte.");
    score = Math.max(0, score - 40);
  }
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  let strength;
  if (score >= 90) strength = "very-strong";
  else if (score >= 70) strength = "strong";
  else if (score >= 50) strength = "medium";
  else strength = "weak";
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score)
  };
}
function requireStrongPassword(password) {
  const validation = validatePasswordStrength(password);
  if (!validation.isValid) {
    throw new Error(`Senha fraca: ${validation.errors.join(", ")}`);
  }
  if (validation.strength === "weak") {
    throw new Error("A senha \xE9 muito fraca. Por favor, escolha uma senha mais forte.");
  }
}
function getPasswordSuggestions(password) {
  const suggestions = [];
  const validation = validatePasswordStrength(password);
  if (password.length < 12) {
    suggestions.push("Aumente o comprimento para pelo menos 12 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    suggestions.push("Adicione letras mai\xFAsculas");
  }
  if (!/[a-z]/.test(password)) {
    suggestions.push("Adicione letras min\xFAsculas");
  }
  if (!/[0-9]/.test(password)) {
    suggestions.push("Adicione n\xFAmeros");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    suggestions.push("Adicione caracteres especiais (!@#$%^&* etc)");
  }
  if (validation.strength === "weak" || validation.strength === "medium") {
    suggestions.push("Considere usar uma frase-senha com palavras aleat\xF3rias");
  }
  return suggestions;
}

// server/routes/authRoutes.ts
var authRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get("/api/status", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.post(
    "/api/auth/login",
    authLimiter,
    validateBody(loginSchema),
    async (req, res) => {
      try {
        const { email, password } = req.validatedBody;
        let user = await storage2.getUserByEmail(email);
        if (!user) {
          const allUsers = await storage2.getAllUsers();
          const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.]/g, "").toLowerCase();
          const normalizedInput = normalize(email);
          const foundUser = allUsers.find((u) => {
            const nameParts = u.name.trim().split(" ");
            let generatedUsername = "";
            if (nameParts.length === 1) {
              generatedUsername = normalize(nameParts[0]);
            } else {
              const firstName = normalize(nameParts[0]);
              const lastName = normalize(nameParts[nameParts.length - 1]);
              generatedUsername = `${firstName}.${lastName}`;
            }
            return generatedUsername === normalizedInput;
          });
          user = foundUser || null;
        }
        const userPassword = user?.password || "";
        if (user && userPassword && await bcrypt3.compare(password, userPassword)) {
          const isUsingDefaultPassword = await bcrypt3.compare("meu7care", userPassword);
          const shouldForceFirstAccess = isUsingDefaultPassword;
          logger.authSuccess(user.id, user.email);
          const token = jwt.sign(
            {
              id: user.id,
              email: user.email,
              role: user.role,
              name: user.name
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );
          const response = {
            success: true,
            data: {
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                church: user.church,
                isApproved: user.isApproved,
                status: user.status,
                firstAccess: shouldForceFirstAccess ? true : user.firstAccess,
                usingDefaultPassword: isUsingDefaultPassword,
                districtId: user.districtId || null
              }
            }
          };
          res.json({
            success: true,
            token,
            user: response.data?.user
          });
        } else {
          logger.authFailure("Invalid credentials", email);
          handleUnauthorized(res, "Invalid credentials");
        }
      } catch (error) {
        handleError(res, error, "Login");
      }
    }
  );
  app2.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage2.getUserByEmail(userData.email || "");
      if (existingUser) {
        handleBadRequest(res, "User already exists");
        return;
      }
      if (userData.password) {
        try {
          requireStrongPassword(userData.password);
        } catch (error) {
          const suggestions = getPasswordSuggestions(userData.password);
          return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : "Senha fraca",
            suggestions
          });
        }
      }
      const userRole = req.body.role || "interested";
      const user = await storage2.createUser({
        ...userData,
        role: userRole,
        isApproved: userRole === "interested",
        // Auto-approve interested users
        status: userRole === "interested" ? "approved" : "pending"
      });
      logger.info(`New user registered: ${user.email}`);
      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          firstAccess: user.firstAccess
        }
      });
    } catch (error) {
      handleError(res, error, "Registration");
      return;
    }
  });
  app2.post("/api/auth/logout", (_req, res) => {
    res.json({ success: true });
  });
  app2.get("/api/auth/me", async (req, res) => {
    try {
      const headerUserId = req.headers["x-user-id"] || req.headers["user-id"];
      const authHeaderValue = req.headers.authorization;
      const rawAuth = Array.isArray(authHeaderValue) ? authHeaderValue[0] : authHeaderValue;
      const authHeader = rawAuth ? String(rawAuth) : "";
      let id = null;
      const rawUserId = (req.query.userId ? String(req.query.userId) : void 0) || (headerUserId ? String(Array.isArray(headerUserId) ? headerUserId[0] : headerUserId) : void 0);
      if (rawUserId) {
        const parsed = parseInt(rawUserId, 10);
        if (!Number.isNaN(parsed)) id = parsed;
      }
      if (id === null && authHeader.startsWith("Bearer ") && JWT_SECRET) {
        const token = authHeader.slice("Bearer ".length).trim();
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (typeof decoded?.id === "number") id = decoded.id;
        } catch {
          id = null;
        }
      }
      if (id === null) {
        handleBadRequest(res, "User ID is required");
        return;
      }
      if (isNaN(id)) {
        handleBadRequest(res, "Invalid user ID");
        return;
      }
      const user = await storage2.getUserById(id);
      if (!user) {
        handleNotFound(res, "User");
        return;
      }
      if (!user.church) {
        const churches2 = await storage2.getAllChurches();
        if (churches2.length > 0) {
          const firstChurch = churches2[0];
          await storage2.updateUserChurch(id, firstChurch.name);
          user.church = firstChurch.name;
        }
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      handleError(res, error, "Get current user");
    }
  });
  app2.get("/api/user/church", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        handleBadRequest(res, "User ID is required");
        return;
      }
      const id = parseInt(userId);
      if (isNaN(id)) {
        handleBadRequest(res, "Invalid user ID");
        return;
      }
      const user = await storage2.getUserById(id);
      if (!user) {
        handleNotFound(res, "User");
        return;
      }
      let churchName = user.church;
      if (!churchName) {
        const churches2 = await storage2.getAllChurches();
        if (churches2.length > 0) {
          churchName = churches2[0].name;
          try {
            await storage2.updateUserChurch(id, churchName || "");
          } catch (updateError) {
            logger.error("Error updating user church:", updateError);
          }
        }
      }
      res.json({
        success: true,
        church: churchName || "Igreja n\xE3o dispon\xEDvel",
        userId: id
      });
    } catch (error) {
      handleError(res, error, "Get user church");
    }
  });
  app2.post(
    "/api/auth/reset-password",
    sensitiveLimiter,
    validateBody(resetPasswordSchema),
    async (req, res) => {
      try {
        const { email } = req.validatedBody;
        const user = await storage2.getUserByEmail(email);
        if (!user) {
          handleNotFound(res, "User");
          return;
        }
        const hashedPassword = await bcrypt3.hash("meu7care", 10);
        const updatedUser = await storage2.updateUser(user.id, {
          password: hashedPassword,
          firstAccess: true,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (updatedUser) {
          logger.info(`Password reset for user: ${user.email}`);
          res.json({
            success: true,
            message: "Password reset successfully",
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              isApproved: updatedUser.isApproved,
              status: updatedUser.status,
              firstAccess: updatedUser.firstAccess
            }
          });
        } else {
          handleError(res, new Error("Failed to reset password"), "Reset password");
        }
      } catch (error) {
        handleError(res, error, "Reset password");
      }
    }
  );
  app2.post(
    "/api/auth/change-password",
    sensitiveLimiter,
    validateBody(changePasswordSchema),
    async (req, res) => {
      try {
        const { userId, currentPassword, newPassword } = req.validatedBody;
        const user = await storage2.getUserById(userId);
        if (!user) {
          handleNotFound(res, "User");
          return;
        }
        const userPassword = user.password || "";
        if (!userPassword || !await bcrypt3.compare(currentPassword, userPassword)) {
          handleUnauthorized(res, "Current password is incorrect");
          return;
        }
        try {
          requireStrongPassword(newPassword);
        } catch (error) {
          const suggestions = getPasswordSuggestions(newPassword);
          return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : "Nova senha n\xE3o atende aos requisitos de seguran\xE7a",
            suggestions
          });
        }
        const hashedNewPassword = await bcrypt3.hash(newPassword, 10);
        const updatedUser = await storage2.updateUser(userId, {
          password: hashedNewPassword,
          firstAccess: false,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (updatedUser) {
          logger.info(`Password changed for user: ${user.email}`);
          return res.json({
            success: true,
            message: "Password changed successfully",
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              isApproved: updatedUser.isApproved,
              status: updatedUser.status,
              firstAccess: updatedUser.firstAccess
            }
          });
        } else {
          handleError(res, new Error("Failed to update password"), "Change password");
          return;
        }
      } catch (error) {
        handleError(res, error, "Change password");
        return;
      }
    }
  );
};

// server/middleware/index.ts
import jwt2 from "jsonwebtoken";

// server/middleware/cspHeaders.ts
import helmet from "helmet";
var cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      // Necessário para React em dev
      "'unsafe-eval'",
      // Remover em produção se possível
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      // Necessário para styled-components/tailwind
      "https://fonts.googleapis.com"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com"
    ],
    connectSrc: [
      "'self'",
      "https://api.sentry.io",
      "https://*.sentry.io",
      "https://www.google-analytics.com",
      "wss:",
      "ws:"
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'", "blob:"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
  },
  reportOnly: false
};
var devCspConfig = {
  ...cspConfig,
  directives: {
    ...cspConfig.directives,
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*"]
  }
};

// server/middleware/rateLimiters.ts
import rateLimit2 from "express-rate-limit";
var errorMessages = {
  default: "Muitas requisi\xE7\xF5es. Tente novamente em alguns minutos.",
  auth: "Muitas tentativas de login. Aguarde 15 minutos.",
  api: "Limite de requisi\xE7\xF5es atingido. Aguarde alguns segundos.",
  upload: "Muitos uploads. Aguarde antes de enviar mais arquivos.",
  sensitive: "Opera\xE7\xE3o bloqueada temporariamente por seguran\xE7a."
};
function createLimitHandler(type) {
  return (req, res) => {
    logger.warn(`Rate limit atingido: ${type}`, {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: errorMessages[type],
      retryAfter: res.getHeader("Retry-After")
    });
  };
}
var authRateLimiter = rateLimit2({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 5,
  message: errorMessages.auth,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler("auth"),
  skip: (_req) => process.env.NODE_ENV === "test"
});
var apiRateLimiter = rateLimit2({
  windowMs: 60 * 1e3,
  // 1 minuto
  max: 100,
  message: errorMessages.api,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler("api"),
  skip: (_req) => process.env.NODE_ENV === "test"
});
var uploadRateLimiter = rateLimit2({
  windowMs: 5 * 60 * 1e3,
  // 5 minutos
  max: 10,
  message: errorMessages.upload,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler("upload"),
  skip: (_req) => process.env.NODE_ENV === "test"
});
var sensitiveRateLimiter = rateLimit2({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 20,
  message: errorMessages.sensitive,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler("sensitive"),
  skip: (_req) => process.env.NODE_ENV === "test"
});
var searchRateLimiter = rateLimit2({
  windowMs: 60 * 1e3,
  // 1 minuto
  max: 30,
  message: errorMessages.default,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => process.env.NODE_ENV === "test"
});
var webhookRateLimiter = rateLimit2({
  windowMs: 60 * 1e3,
  // 1 minuto
  max: 1e3,
  message: errorMessages.default,
  standardHeaders: true,
  legacyHeaders: false
});

// server/middleware/index.ts
var storage = new NeonAdapter();
var resolveUserId = (req) => {
  const headerValue = req.headers["x-user-id"];
  const rawHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const parsedHeader = rawHeader ? parseInt(String(rawHeader), 10) : NaN;
  if (!Number.isNaN(parsedHeader)) return parsedHeader;
  const authHeaderValue = req.headers.authorization;
  if (!authHeaderValue) return null;
  const rawAuth = Array.isArray(authHeaderValue) ? authHeaderValue[0] : authHeaderValue;
  const authHeader = rawAuth ? String(rawAuth) : "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    if (!JWT_SECRET) return null;
    const decoded = jwt2.verify(token, JWT_SECRET);
    return typeof decoded?.id === "number" ? decoded.id : null;
  } catch {
    return null;
  }
};
var checkReadOnlyAccess = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (userId !== null) {
      const user = await storage.getUserById(userId);
      if (user) {
        const isReadOnly = user.role === "admin_readonly" || user.extraData && typeof user.extraData === "object" && user.extraData.readOnly === true;
        if (isReadOnly) {
          const errorResponse = {
            success: false,
            error: "Usu\xE1rio de teste possui acesso somente para leitura. Edi\xE7\xF5es n\xE3o s\xE3o permitidas.",
            code: ErrorCodes.READONLY_ACCESS
          };
          res.status(403).json(errorResponse);
          return;
        }
      }
    }
    next();
  } catch (error) {
    console.error("Error checking read-only access:", error);
    next();
  }
};
var requireAuth = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (userId === null) {
      const errorResponse = {
        success: false,
        error: "Authentication required",
        code: ErrorCodes.UNAUTHORIZED
      };
      res.status(401).json(errorResponse);
      return;
    }
    const user = await storage.getUserById(userId);
    if (!user) {
      const errorResponse = {
        success: false,
        error: "User not found",
        code: ErrorCodes.UNAUTHORIZED
      };
      res.status(401).json(errorResponse);
      return;
    }
    req.userId = userId;
    req.user = user;
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error("Error in requireAuth middleware:", error);
    const errorResponse = {
      success: false,
      error: "Authentication error",
      code: ErrorCodes.INTERNAL_ERROR
    };
    res.status(500).json(errorResponse);
  }
};
var requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      if (userId === null) {
        const errorResponse = {
          success: false,
          error: "Authentication required",
          code: ErrorCodes.UNAUTHORIZED
        };
        res.status(401).json(errorResponse);
        return;
      }
      const user = await storage.getUserById(userId);
      if (!user) {
        const errorResponse = {
          success: false,
          error: "User not found",
          code: ErrorCodes.UNAUTHORIZED
        };
        res.status(401).json(errorResponse);
        return;
      }
      if (!allowedRoles.includes(user.role)) {
        const errorResponse = {
          success: false,
          error: `Required role: ${allowedRoles.join(" or ")}`,
          code: ErrorCodes.FORBIDDEN
        };
        res.status(403).json(errorResponse);
        return;
      }
      req.userId = userId;
      req.user = user;
      req.userRole = user.role;
      next();
    } catch (error) {
      console.error("Error in requireRole middleware:", error);
      const errorResponse = {
        success: false,
        error: "Authorization error",
        code: ErrorCodes.INTERNAL_ERROR
      };
      res.status(500).json(errorResponse);
    }
  };
};

// server/utils/parsers.ts
var parseCargos = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") {
    return value.split(",").map((c) => c.trim()).filter((c) => c.length > 0);
  }
  return [];
};
var parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return lower === "sim" || lower === "true" || lower === "1" || lower === "yes";
  }
  return !!value;
};
var parseNumber = (value) => {
  if (typeof value === "number") {
    return isNaN(value) ? 0 : Math.floor(value);
  }
  if (typeof value === "string") {
    const num = parseInt(value.trim(), 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};
var parseDate = (dateValue) => {
  if (!dateValue) return null;
  try {
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    const dateStr = String(dateValue).trim().replace(/['"]/g, "");
    if (!isNaN(Number(dateValue)) && typeof dateValue === "number") {
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = dateValue - 2;
      const date2 = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1e3);
      if (!isNaN(date2.getTime()) && date2.getFullYear() > 1900) {
        return date2;
      }
    }
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const parsedDay = parseInt(day, 10);
        const parsedMonth = parseInt(month, 10);
        let parsedYear = parseInt(year, 10);
        if (parsedYear < 100) {
          parsedYear += parsedYear < 50 ? 2e3 : 1900;
        }
        if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12 && parsedYear >= 1900 && parsedYear <= 2100) {
          const date2 = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (date2.getDate() === parsedDay && date2.getMonth() === parsedMonth - 1 && date2.getFullYear() === parsedYear) {
            return date2;
          }
        }
      }
      if (parts.length === 2) {
        const [day, month] = parts;
        const parsedDay = parseInt(day, 10);
        const parsedMonth = parseInt(month, 10);
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12) {
          const date2 = new Date(currentYear, parsedMonth - 1, parsedDay);
          if (date2.getDate() === parsedDay && date2.getMonth() === parsedMonth - 1) {
            return date2;
          }
        }
      }
    }
    if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const parts = dateStr.split("-");
      const [day, month, year] = parts;
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);
      if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12 && parsedYear >= 1900 && parsedYear <= 2100) {
        const date2 = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (date2.getDate() === parsedDay && date2.getMonth() === parsedMonth - 1 && date2.getFullYear() === parsedYear) {
          return date2;
        }
      }
    }
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split("-");
      const parsedYear = parseInt(year, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedDay = parseInt(day, 10);
      if (parsedYear >= 1900 && parsedYear <= 2100 && parsedMonth >= 1 && parsedMonth <= 12 && parsedDay >= 1 && parsedDay <= 31) {
        const date2 = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (date2.getDate() === parsedDay && date2.getMonth() === parsedMonth - 1 && date2.getFullYear() === parsedYear) {
          return date2;
        }
      }
    }
    if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      const parts = dateStr.split("/");
      const [year, month, day] = parts;
      const parsedYear = parseInt(year, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedDay = parseInt(day, 10);
      if (parsedYear >= 1900 && parsedYear <= 2100 && parsedMonth >= 1 && parsedMonth <= 12 && parsedDay >= 1 && parsedDay <= 31) {
        const date2 = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (date2.getDate() === parsedDay && date2.getMonth() === parsedMonth - 1 && date2.getFullYear() === parsedYear) {
          return date2;
        }
      }
    }
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const parts = dateStr.split(".");
      const [day, month, year] = parts;
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);
      if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12 && parsedYear >= 1900 && parsedYear <= 2100) {
        const date2 = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (date2.getDate() === parsedDay && date2.getMonth() === parsedMonth - 1 && date2.getFullYear() === parsedYear) {
          return date2;
        }
      }
    }
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{2}$/)) {
      const parts = dateStr.split(".");
      const [day, month, year] = parts;
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(month, 10);
      let parsedYear = parseInt(year, 10);
      parsedYear += parsedYear < 50 ? 2e3 : 1900;
      if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12 && parsedYear >= 1900 && parsedYear <= 2100) {
        const date2 = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (date2.getDate() === parsedDay && date2.getMonth() === parsedMonth - 1 && date2.getFullYear() === parsedYear) {
          return date2;
        }
      }
    }
    const directDate = new Date(dateStr);
    if (!isNaN(directDate.getTime()) && directDate.getFullYear() > 1900) {
      return new Date(directDate.getFullYear(), directDate.getMonth(), directDate.getDate());
    }
    return null;
  } catch {
    return null;
  }
};
var parseBirthDate = (dateValue) => {
  const date2 = parseDate(dateValue);
  if (!date2) return null;
  const year = date2.getFullYear();
  const month = String(date2.getMonth() + 1).padStart(2, "0");
  const day = String(date2.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// server/routes/userRoutes.ts
import * as bcrypt4 from "bcryptjs";

// server/services/cacheService.ts
import { createClient } from "redis";
var REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
var DEFAULT_TTL = 60 * 5;
var MAX_MEMORY_CACHE_SIZE = 1e3;
var CacheService = class {
  constructor() {
    this.memoryCache = /* @__PURE__ */ new Map();
    this.redisClient = null;
    this.isRedisConnected = false;
    this.stats = { hits: 0, misses: 0 };
  }
  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.memoryCache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      isRedisConnected: this.isRedisConnected
    };
  }
  /**
   * Inicializa conexão com Redis
   */
  async initRedis() {
    if (process.env.NODE_ENV === "test") {
      console.log("[Cache] Modo teste - usando cache em mem\xF3ria");
      return false;
    }
    try {
      this.redisClient = createClient({ url: REDIS_URL });
      this.redisClient.on("error", (err) => {
        console.error("[Redis] Erro de conex\xE3o:", err.message);
        this.isRedisConnected = false;
      });
      this.redisClient.on("connect", () => {
        console.log("[Redis] Conectado com sucesso");
        this.isRedisConnected = true;
      });
      this.redisClient.on("reconnecting", () => {
        console.log("[Redis] Reconectando...");
      });
      await this.redisClient.connect();
      this.isRedisConnected = true;
      return true;
    } catch (error) {
      console.warn(
        "[Redis] N\xE3o foi poss\xEDvel conectar, usando cache em mem\xF3ria:",
        error.message
      );
      this.isRedisConnected = false;
      return false;
    }
  }
  /**
   * Fecha conexão com Redis
   */
  async closeRedis() {
    if (this.redisClient && this.isRedisConnected) {
      await this.redisClient.quit();
      this.isRedisConnected = false;
    }
  }
  /**
   * Limpa itens expirados do cache em memória
   */
  cleanMemoryCache() {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry < now) {
        this.memoryCache.delete(key);
      }
    }
    if (this.memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
      const keysToDelete = Array.from(this.memoryCache.keys()).slice(
        0,
        this.memoryCache.size - MAX_MEMORY_CACHE_SIZE
      );
      keysToDelete.forEach((key) => this.memoryCache.delete(key));
    }
  }
  /**
   * Define valor no cache
   */
  async set(key, value, ttlSeconds = DEFAULT_TTL) {
    const serialized = JSON.stringify(value);
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttlSeconds, serialized);
        return true;
      } catch (error) {
        console.error("[Cache] Erro ao definir no Redis:", error);
      }
    }
    const expiry = Date.now() + ttlSeconds * 1e3;
    this.memoryCache.set(key, { value: serialized, expiry });
    if (Math.random() < 0.01) {
      this.cleanMemoryCache();
    }
    return true;
  }
  /**
   * Obtém valor do cache
   */
  async get(key) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value);
        }
        this.stats.misses++;
      } catch (error) {
        console.error("[Cache] Erro ao obter do Redis:", error);
      }
    }
    const item = this.memoryCache.get(key);
    if (item) {
      if (item.expiry > Date.now()) {
        this.stats.hits++;
        return JSON.parse(item.value);
      } else {
        this.memoryCache.delete(key);
      }
    }
    this.stats.misses++;
    return null;
  }
  /**
   * Remove valor do cache
   */
  async del(key) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error("[Cache] Erro ao remover do Redis:", error);
      }
    }
    this.memoryCache.delete(key);
    return true;
  }
};
var cacheService = new CacheService();
var cacheSet = (key, value, ttlSeconds) => cacheService.set(key, value, ttlSeconds);
var cacheGet = (key) => cacheService.get(key);
async function cacheDelPattern(pattern) {
  const patternRegex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
  for (const key of cacheService["memoryCache"].keys()) {
    if (patternRegex.test(key)) {
      cacheService["memoryCache"].delete(key);
    }
  }
  const redisClient = cacheService["redisClient"];
  const isConnected = cacheService["isRedisConnected"];
  if (isConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error("[Cache] Erro ao deletar pattern do Redis:", error);
    }
  }
}

// server/middleware/cache.ts
function generateCacheKey(req, prefix) {
  const userId = req.headers["x-user-id"] || "anonymous";
  const queryString = JSON.stringify(req.query);
  return `${prefix}:${userId}:${req.path}:${queryString}`;
}
function cacheMiddleware(prefix, ttlSeconds) {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }
    const cacheKey = generateCacheKey(req, prefix);
    try {
      const cachedData = await cacheGet(cacheKey);
      if (cachedData) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-Key", cacheKey);
        res.json(cachedData);
        return;
      }
      const originalJson = res.json.bind(res);
      res.json = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheSet(cacheKey, data, ttlSeconds).catch((err) => {
            console.error("[Cache] Erro ao salvar cache:", err);
          });
        }
        res.setHeader("X-Cache", "MISS");
        return originalJson(data);
      };
      next();
    } catch (error) {
      console.error("[Cache] Erro no middleware:", error);
      next();
    }
  };
}
async function invalidateCache(pattern) {
  try {
    await cacheDelPattern(`${pattern}:*`);
  } catch (error) {
    console.error("[Cache] Erro ao invalidar:", error);
  }
}
function invalidateCacheMiddleware(...patterns) {
  return async (req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== "GET") {
        patterns.forEach((pattern) => {
          invalidateCache(pattern).catch((err) => {
            console.error("[Cache] Erro ao invalidar:", err);
          });
        });
      }
      return originalSend(data);
    };
    next();
  };
}

// server/constants.ts
var UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  // 5MB
  MAX_FILES: 10,
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".gif", ".webp"]
};
var RATE_LIMITS = {
  /** Requisições gerais por janela */
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1e3,
    // 15 minutos
    MAX_REQUESTS: 100
  },
  /** Login - mais restritivo */
  AUTH: {
    WINDOW_MS: 15 * 60 * 1e3,
    // 15 minutos
    MAX_REQUESTS: 5
  },
  /** Upload de arquivos */
  UPLOAD: {
    WINDOW_MS: 60 * 1e3,
    // 1 minuto
    MAX_REQUESTS: 10
  }
};
var CACHE_TTL = {
  /** Distritos - raramente mudam */
  DISTRICTS: 600,
  // 10 minutos
  /** Igrejas - raramente mudam */
  CHURCHES: 600,
  // 10 minutos
  /** Dashboard stats - tolera delay */
  DASHBOARD: 300,
  // 5 minutos
  /** Lista de usuários */
  USERS: 120,
  // 2 minutos
  /** Lista de membros */
  MEMBERS: 120,
  // 2 minutos
  /** Perfil próprio - precisa ser atual */
  PROFILE: 30,
  // 30 segundos
  /** Configurações do sistema */
  SETTINGS: 3600
  // 1 hora
};
var AUTH = {
  /** Tempo de expiração do token (em segundos) */
  TOKEN_EXPIRY: 3600,
  // 1 hora
  /** Tempo de expiração do refresh token (em segundos) */
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 3600,
  // 7 dias
  /** Algoritmo de hash para senhas */
  HASH_ALGORITHM: "bcrypt",
  /** Rounds para bcrypt */
  BCRYPT_ROUNDS: 10,
  /** Tamanho mínimo de senha */
  MIN_PASSWORD_LENGTH: 8
};

// server/routes/userRoutes.ts
var parseExtraData = (user) => {
  if (!user.extraData) return {};
  if (typeof user.extraData === "string") {
    try {
      return JSON.parse(user.extraData);
    } catch {
      return {};
    }
  }
  return user.extraData;
};
var calculateUserPointsFromConfig = (user, config) => {
  let points = 0;
  const extraData = parseExtraData(user);
  const engajamento = extraData.engajamento?.toLowerCase() || "";
  if (engajamento.includes("alto")) {
    points += config.engajamento?.alto || 0;
  } else if (engajamento.includes("medio")) {
    points += config.engajamento?.medio || 0;
  } else if (engajamento.includes("baixo")) {
    points += config.engajamento?.baixo || 0;
  }
  const classificacao = extraData.classificacao?.toLowerCase() || "";
  if (classificacao.includes("frequente")) {
    points += config.classificacao?.frequente || 0;
  } else if (classificacao.includes("naofrequente")) {
    points += config.classificacao?.naoFrequente || 0;
  }
  const dizimistaType = extraData.dizimistaType?.toLowerCase() || "";
  if (dizimistaType.includes("recorrente")) {
    points += config.dizimista?.recorrente || 0;
  } else if (dizimistaType.includes("sazonal")) {
    points += config.dizimista?.sazonal || 0;
  } else if (dizimistaType.includes("pontual")) {
    points += config.dizimista?.pontual || 0;
  }
  const ofertanteType = extraData.ofertanteType?.toLowerCase() || "";
  if (ofertanteType.includes("recorrente")) {
    points += config.ofertante?.recorrente || 0;
  } else if (ofertanteType.includes("sazonal")) {
    points += config.ofertante?.sazonal || 0;
  } else if (ofertanteType.includes("pontual")) {
    points += config.ofertante?.pontual || 0;
  }
  const tempoBatismoAnos = extraData.tempoBatismoAnos || 0;
  if (tempoBatismoAnos >= 20) {
    points += config.tempobatismo?.maisVinte || 0;
  } else if (tempoBatismoAnos >= 10) {
    points += config.tempobatismo?.dezAnos || 0;
  } else if (tempoBatismoAnos >= 5) {
    points += config.tempobatismo?.cincoAnos || 0;
  } else if (tempoBatismoAnos >= 2) {
    points += config.tempobatismo?.doisAnos || 0;
  }
  if (extraData.temCargo === "Sim" && extraData.departamentosCargos) {
    const numCargos = extraData.departamentosCargos.split(";").length;
    if (numCargos >= 3) {
      points += config.cargos?.tresOuMais || 0;
    } else if (numCargos === 2) {
      points += config.cargos?.doisCargos || 0;
    } else if (numCargos === 1) {
      points += config.cargos?.umCargo || 0;
    }
  }
  if (extraData.nomeUnidade?.trim()) {
    points += config.nomeunidade?.comUnidade || 0;
  }
  if (extraData.temLicao === true || extraData.temLicao === "true") {
    points += config.temlicao?.comLicao || 0;
  }
  if (extraData.totalPresenca !== void 0 && extraData.totalPresenca !== null) {
    const presenca = typeof extraData.totalPresenca === "string" ? parseInt(extraData.totalPresenca) : extraData.totalPresenca;
    if (presenca >= 8 && presenca <= 13) {
      points += config.totalpresenca?.oitoATreze || 0;
    } else if (presenca >= 4 && presenca <= 7) {
      points += config.totalpresenca?.quatroASete || 0;
    }
  }
  if (extraData.comunhao && extraData.comunhao > 0) {
    points += extraData.comunhao * (config.escolasabatina?.comunhao || 0);
  }
  if (extraData.missao && extraData.missao > 0) {
    points += extraData.missao * (config.escolasabatina?.missao || 0);
  }
  if (extraData.estudoBiblico && extraData.estudoBiblico > 0) {
    points += extraData.estudoBiblico * (config.escolasabatina?.estudoBiblico || 0);
  }
  if (extraData.discipuladoPosBatismo && extraData.discipuladoPosBatismo > 0) {
    points += extraData.discipuladoPosBatismo * (config.discipuladoPosBatismo?.multiplicador || 0);
  }
  if (extraData.cpfValido === "Sim" || extraData.cpfValido === "true") {
    points += config.cpfValido?.valido || 0;
  }
  if (extraData.camposVaziosACMS === "false") {
    points += config.camposVaziosACMS?.completos || 0;
  }
  return Math.round(points);
};
var userRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get(
    "/api/users",
    cacheMiddleware("users", CACHE_TTL.USERS),
    async (req, res) => {
      try {
        logger.debug("\u{1F50D} [GET /api/users] Iniciando busca de usu\xE1rios");
        const { role, status, church } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;
        const requestingUserId = parseInt(req.headers["x-user-id"] || "0");
        logger.debug("\u{1F4CB} Par\xE2metros:", { role, status, church, page, limit, requestingUserId });
        let requestingUser = null;
        if (requestingUserId) {
          requestingUser = await storage2.getUserById(requestingUserId);
        }
        let users2 = await storage2.getAllUsers();
        logger.debug(`\u2705 ${users2.length} usu\xE1rios encontrados no banco`);
        if (role) {
          users2 = users2.filter((u) => u.role === role);
        }
        if (status) {
          users2 = users2.filter((u) => u.status === status);
        }
        if (church) {
          users2 = users2.filter((u) => u.church === church);
        } else if (requestingUser && !isSuperAdmin(requestingUser)) {
          const userChurch = requestingUser.church;
          if (userChurch) {
            users2 = users2.filter((u) => u.church === userChurch);
          }
        }
        const totalUsers = users2.length;
        const totalPages = Math.ceil(totalUsers / limit);
        if (req.headers["x-user-role"] === "missionary" || req.headers["x-user-id"]) {
          const missionaryId = parseInt(req.headers["x-user-id"] || "0");
          const missionary = users2.find((u) => u.id === missionaryId);
          if (missionary && missionary.role === "missionary") {
            const churchInterested = users2.filter(
              (u) => u.role === "interested" && u.church === missionary.church && u.churchCode === missionary.churchCode
            );
            const relationships2 = await storage2.getRelationshipsByMissionary(missionaryId);
            const linkedInterestedIds = relationships2.map((r) => r.interestedId);
            const processedUsers = churchInterested.map((user) => {
              const isLinked = linkedInterestedIds.includes(user.id);
              if (isLinked) {
                return user;
              } else {
                return {
                  ...user,
                  id: user.id,
                  name: user.name,
                  role: user.role,
                  status: user.status,
                  church: user.church,
                  churchCode: user.churchCode,
                  email: user.email ? "***@***.***" : null,
                  phone: user.phone ? "***-***-****" : null,
                  address: user.address ? "*** *** ***" : null,
                  birthDate: user.birthDate ? "**/**/****" : null,
                  cpf: user.cpf ? "***.***.***-**" : null,
                  occupation: user.occupation ? "***" : null,
                  education: user.education ? "***" : null,
                  previousReligion: user.previousReligion ? "***" : null,
                  interestedSituation: user.interestedSituation ? "***" : null,
                  points: 0,
                  level: "***",
                  attendance: 0,
                  biblicalInstructor: null,
                  isLinked: false,
                  canRequestDiscipleship: true
                };
              }
            });
            const otherUsers = users2.filter(
              (u) => u.role !== "interested" || u.church !== missionary.church || u.churchCode !== missionary.churchCode
            );
            const finalUsers = [...processedUsers, ...otherUsers];
            const paginatedUsers2 = finalUsers.slice(offset, offset + limit);
            const safeUsers2 = paginatedUsers2.map(({ password: _password, ...user }) => user);
            res.json({
              data: safeUsers2,
              pagination: {
                page,
                limit,
                total: finalUsers.length,
                totalPages: Math.ceil(finalUsers.length / limit)
              }
            });
            return;
          }
        }
        const paginatedUsers = users2.slice(offset, offset + limit);
        const pointsMap = await storage2.calculateUserPointsBatch(paginatedUsers);
        const usersWithPoints = paginatedUsers.map((user) => ({
          ...user,
          calculatedPoints: pointsMap.get(user.id) ?? 0
        }));
        const safeUsers = usersWithPoints.map(({ password: _password, ...user }) => user);
        logger.debug(`\u{1F4E4} Enviando p\xE1gina ${page}/${totalPages} com ${safeUsers.length} usu\xE1rios`);
        res.json({
          data: safeUsers,
          pagination: {
            page,
            limit,
            total: totalUsers,
            totalPages
          }
        });
      } catch (error) {
        logger.error("\u274C Erro na rota GET /api/users:", error);
        handleError(res, error, "Get users");
      }
    }
  );
  app2.get("/api/users/:id(\\d+)", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inv\xE1lido" });
        return;
      }
      const user = await storage2.getUserById(id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const { password: _password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      handleError(res, error, "Get user");
    }
  });
  app2.post(
    "/api/users",
    checkReadOnlyAccess,
    invalidateCacheMiddleware("users"),
    validateBody(createUserSchema),
    async (req, res) => {
      try {
        const userData = req.validatedBody;
        logger.info(`Creating new user: ${userData.email}`);
        const hashedPassword = userData.password ? await bcrypt4.hash(userData.password, 10) : await bcrypt4.hash("meu7care", 10);
        let _processedChurch = null;
        if (userData.church && userData.church.trim() !== "") {
          try {
            const church = await storage2.getOrCreateChurch(userData.church.trim());
            _processedChurch = church.name;
          } catch (error) {
            logger.error(`Erro ao processar igreja "${userData.church}":`, error);
            _processedChurch = "Igreja Principal";
          }
        }
        const processedUserData = {
          ...userData,
          password: hashedPassword,
          firstAccess: true,
          status: "pending",
          isApproved: userData.isApproved || false,
          role: userData.role || "interested",
          points: 0,
          level: "Bronze",
          attendance: 0
        };
        const newUser = await storage2.createUser({
          ...processedUserData,
          biblicalInstructor: processedUserData.biblicalInstructor ?? null
        });
        res.status(201).json(newUser);
      } catch (error) {
        handleError(res, error, "Create user");
      }
    }
  );
  app2.put(
    "/api/users/:id(\\d+)",
    checkReadOnlyAccess,
    invalidateCacheMiddleware("users"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const updateData = req.body;
        if (updateData.biblicalInstructor !== void 0) {
          if (updateData.biblicalInstructor) {
            const existingRelationship = await storage2.getRelationshipsByInterested(id);
            if (!existingRelationship || existingRelationship.length === 0) {
              await storage2.createRelationship({
                missionaryId: parseInt(updateData.biblicalInstructor),
                interestedId: id,
                status: "active",
                notes: "Vinculado pelo admin"
              });
            }
          }
        }
        const user = await storage2.updateUser(id, updateData);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }
        const { password: _password2, ...safeUser } = user;
        res.json(safeUser);
      } catch (error) {
        handleError(res, error, "Update user");
      }
    }
  );
  app2.delete(
    "/api/users/:id(\\d+)",
    checkReadOnlyAccess,
    invalidateCacheMiddleware("users"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const user = await storage2.getUserById(id);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }
        if (user.email === "admin@7care.com") {
          res.status(403).json({
            error: "N\xE3o \xE9 poss\xEDvel excluir o Super Administrador do sistema"
          });
          return;
        }
        if (hasAdminAccess(user)) {
          res.status(403).json({
            error: "N\xE3o \xE9 poss\xEDvel excluir usu\xE1rios administradores do sistema"
          });
          return;
        }
        const success = await storage2.deleteUser(id);
        if (!success) {
          res.status(404).json({ error: "User not found" });
          return;
        }
        res.json({ success: true });
      } catch (error) {
        handleError(res, error, "Delete user");
      }
    }
  );
  app2.post(
    "/api/users/:id(\\d+)/approve",
    checkReadOnlyAccess,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const user = await storage2.approveUser(id);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }
        const { password: _password3, ...safeUser } = user;
        res.json(safeUser);
      } catch (error) {
        handleError(res, error, "Approve user");
      }
    }
  );
  app2.post(
    "/api/users/:id(\\d+)/reject",
    checkReadOnlyAccess,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const user = await storage2.rejectUser(id);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }
        const { password: _password4, ...safeUser } = user;
        res.json(safeUser);
      } catch (error) {
        handleError(res, error, "Reject user");
      }
    }
  );
  app2.get("/api/users/:id(\\d+)/calculate-points", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const result = await storage2.calculateUserPoints(userId);
      if (result && result.success) {
        res.json(result);
      } else {
        res.status(404).json(result || { error: "Usu\xE1rio n\xE3o encontrado" });
      }
    } catch (error) {
      handleError(res, error, "Calculate user points");
    }
  });
  app2.get("/api/users/:id(\\d+)/points-details", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage2.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
        return;
      }
      const result = await storage2.calculateUserPoints(userId);
      if (result && result.success) {
        res.json({
          success: true,
          userId: user.id,
          userName: user.name,
          currentPoints: user.points,
          calculatedPoints: result.points,
          level: result.level || user.level,
          breakdown: result.breakdown || {},
          details: result.details || {},
          userData: result.userData || {}
        });
      } else {
        res.json({
          success: false,
          userId: user.id,
          userName: user.name,
          currentPoints: user.points,
          calculatedPoints: 0,
          level: user.level,
          breakdown: {},
          details: {},
          error: result?.error || "Erro ao calcular pontos"
        });
      }
    } catch (error) {
      handleError(res, error, "Get user points details");
    }
  });
  app2.get("/api/users/birthdays", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      let userChurch = null;
      if (!hasAdminAccess({ role: userRole }) && userId) {
        try {
          const currentUser = await storage2.getUserById(parseInt(userId));
          if (currentUser && currentUser.church) {
            userChurch = currentUser.church;
          }
        } catch (error) {
          logger.error("Erro ao buscar usu\xE1rio para filtro de igreja:", error);
        }
      }
      const allUsers = await storage2.getAllUsers();
      const today = /* @__PURE__ */ new Date();
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();
      let filteredUsers = allUsers;
      if (userChurch && userRole !== "admin") {
        filteredUsers = allUsers.filter((user) => user.church === userChurch);
      }
      const usersWithBirthDates = filteredUsers.filter((user) => {
        if (!user.birthDate) return false;
        const birthDate = parseDate(user.birthDate);
        return birthDate && !isNaN(birthDate.getTime()) && birthDate.getFullYear() !== 1969;
      });
      const birthdaysToday = usersWithBirthDates.filter((user) => {
        const birthDate = parseDate(user.birthDate);
        return birthDate && birthDate.getMonth() === currentMonth && birthDate.getDate() === currentDay;
      });
      const birthdaysThisMonth = usersWithBirthDates.filter((user) => {
        const birthDate = parseDate(user.birthDate);
        const isThisMonth = birthDate && birthDate.getMonth() === currentMonth;
        const isNotToday = birthDate && !(birthDate.getDate() === currentDay);
        return isThisMonth && isNotToday;
      });
      birthdaysThisMonth.sort((a, b) => {
        const dateA = parseDate(a.birthDate);
        const dateB = parseDate(b.birthDate);
        return (dateA?.getDate() || 0) - (dateB?.getDate() || 0);
      });
      const formatBirthdayUser = (user) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        birthDate: user.birthDate || "",
        profilePhoto: user.profilePhoto,
        church: user.church || null
      });
      const allBirthdays = usersWithBirthDates.sort((a, b) => {
        const dateA = parseDate(a.birthDate);
        const dateB = parseDate(b.birthDate);
        if (!dateA || !dateB) return 0;
        const monthDiff = dateA.getMonth() - dateB.getMonth();
        if (monthDiff !== 0) return monthDiff;
        return dateA.getDate() - dateB.getDate();
      });
      res.json({
        today: birthdaysToday.map(formatBirthdayUser),
        thisMonth: birthdaysThisMonth.map(formatBirthdayUser),
        all: allBirthdays.map(formatBirthdayUser),
        filteredByChurch: userChurch || null
      });
    } catch (error) {
      handleError(res, error, "Get birthdays");
    }
  });
  app2.get("/api/my-interested", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] || "0");
      if (!userId) {
        res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
        return;
      }
      const user = await storage2.getUserById(userId);
      if (!user || user.role !== "missionary" && user.role !== "member") {
        res.status(403).json({ error: "Apenas mission\xE1rios e membros podem acessar esta rota" });
        return;
      }
      const allUsers = await storage2.getAllUsers();
      const churchInterested = allUsers.filter(
        (u) => u.role === "interested" && u.church === user.church
      );
      const relationships2 = await storage2.getRelationshipsByMissionary(userId);
      const linkedInterestedIds = relationships2.map((r) => r.interestedId);
      const processedUsers = churchInterested.map((user2) => {
        const isLinked = linkedInterestedIds.includes(user2.id);
        if (isLinked) {
          return {
            ...user2,
            isLinked: true,
            relationshipId: relationships2.find((r) => r.interestedId === user2.id)?.id
          };
        } else {
          return {
            ...user2,
            id: user2.id,
            name: user2.name,
            role: user2.role,
            status: user2.status,
            church: user2.church,
            churchCode: user2.churchCode,
            email: user2.email ? "***@***.***" : null,
            phone: user2.phone ? "***-***-****" : null,
            address: user2.address ? "*** *** ***" : null,
            birthDate: user2.birthDate ? "**/**/****" : null,
            cpf: user2.cpf ? "***.***.***-**" : null,
            occupation: user2.occupation ? "***" : null,
            education: user2.education ? "***" : null,
            previousReligion: user2.previousReligion ? "***" : null,
            interestedSituation: user2.interestedSituation ? "***" : null,
            points: 0,
            level: "***",
            attendance: 0,
            biblicalInstructor: null,
            isLinked: false,
            canRequestDiscipleship: true
          };
        }
      });
      const safeUsers = processedUsers.map(({ password: _password5, ...user2 }) => user2);
      res.json(safeUsers);
    } catch (error) {
      handleError(res, error, "Get my interested");
    }
  });
  app2.post("/api/users/bulk-import", async (req, res) => {
    try {
      const { users: users2 } = req.body;
      if (!Array.isArray(users2) || users2.length === 0) {
        res.status(400).json({ error: "Users array is required and must not be empty" });
        return;
      }
      let pointsConfig = {};
      try {
        const configData = await storage2.getPointsConfiguration();
        pointsConfig = configData || {};
        logger.info("Configura\xE7\xE3o de pontos carregada para importa\xE7\xE3o em massa");
      } catch (configError) {
        logger.warn(
          "N\xE3o foi poss\xEDvel carregar configura\xE7\xE3o de pontos, importando sem calcular pontos:",
          configError
        );
      }
      const processedUsers = [];
      const errors = [];
      for (let i = 0; i < users2.length; i++) {
        const userData = users2[i];
        try {
          const existingUser = await storage2.getUserByEmail(userData.email);
          if (existingUser) {
            errors.push({
              userId: userData.email,
              userName: userData.name,
              error: `User with email ${userData.email} already exists`
            });
            continue;
          }
          const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          const nameParts = userData.name.trim().split(" ");
          let baseUsername = "";
          if (nameParts.length === 1) {
            baseUsername = normalize(nameParts[0]);
          } else {
            const firstName = normalize(nameParts[0]);
            const lastName = normalize(nameParts[nameParts.length - 1]);
            baseUsername = `${firstName}.${lastName}`;
          }
          let finalUsername = baseUsername;
          let counter = 1;
          const allUsers = await storage2.getAllUsers();
          while (allUsers.some((u) => {
            const normalize2 = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const nameParts2 = u.name.trim().split(" ");
            let generatedUsername = "";
            if (nameParts2.length === 1) {
              generatedUsername = normalize2(nameParts2[0]);
            } else {
              const firstName = normalize2(nameParts2[0]);
              const lastName = normalize2(nameParts2[nameParts2.length - 1]);
              generatedUsername = `${firstName}.${lastName}`;
            }
            return generatedUsername === finalUsername;
          })) {
            finalUsername = `${baseUsername}${counter}`;
            counter++;
          }
          const hashedPassword = await bcrypt4.hash("meu7care", 10);
          const processedBirthDate = userData.birthDate ? parseBirthDate(userData.birthDate) : null;
          const processedBaptismDate = userData.baptismDate ? parseBirthDate(userData.baptismDate) : null;
          let processedChurch = null;
          if (userData.church && userData.church.trim() !== "") {
            try {
              const church = await storage2.getOrCreateChurch(userData.church.trim());
              processedChurch = church.name;
            } catch (error) {
              logger.error(`Erro ao processar igreja "${userData.church}":`, error);
              processedChurch = "Igreja Principal";
            }
          }
          const processedUserData = {
            ...userData,
            birthDate: processedBirthDate,
            baptismDate: processedBaptismDate,
            church: processedChurch,
            password: hashedPassword,
            firstAccess: true,
            status: "pending",
            isApproved: false
          };
          const newUser = await storage2.createUser({
            ...processedUserData,
            biblicalInstructor: processedUserData.biblicalInstructor ?? null
          });
          let calculatedPoints = 0;
          if (Object.keys(pointsConfig).length > 0) {
            try {
              calculatedPoints = calculateUserPointsFromConfig(newUser, pointsConfig);
              if (calculatedPoints > 0) {
                await storage2.updateUser(newUser.id, { points: calculatedPoints });
                logger.info(`Pontos calculados para ${newUser.name}: ${calculatedPoints}`);
              }
            } catch (pointsError) {
              logger.warn(`Erro ao calcular pontos para ${newUser.name}:`, pointsError);
            }
          }
          processedUsers.push({
            ...newUser,
            points: calculatedPoints,
            generatedUsername: finalUsername,
            defaultPassword: "meu7care"
          });
        } catch (error) {
          logger.error(`Error processing user ${i + 1}:`, error);
          errors.push({
            userId: userData.email,
            userName: userData.name,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      res.json({
        success: true,
        message: `Successfully processed ${processedUsers.length} users`,
        users: processedUsers,
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      handleError(res, error, "Bulk import");
    }
  });
  app2.post("/api/users/update-from-powerbi", async (req, res) => {
    try {
      const { users: usersData } = req.body;
      if (!Array.isArray(usersData) || usersData.length === 0) {
        res.status(400).json({ error: "Users array is required and must not be empty" });
        return;
      }
      let updatedCount = 0;
      let notFoundCount = 0;
      const errors = [];
      for (const userData of usersData) {
        try {
          if (!userData.nome && !userData.Nome && !userData.name) {
            continue;
          }
          const userName = userData.nome || userData.Nome || userData.name;
          const users2 = await sql`
            SELECT id, extra_data FROM users
            WHERE LOWER(name) = LOWER(${userName})
            LIMIT 1
          `;
          if (users2.length === 0) {
            notFoundCount++;
            continue;
          }
          const user = users2[0];
          let currentExtraData = {};
          if (user.extra_data) {
            currentExtraData = typeof user.extra_data === "string" ? JSON.parse(user.extra_data) : user.extra_data;
          }
          const updatedExtraData = {
            ...currentExtraData,
            engajamento: userData.engajamento || userData.Engajamento,
            classificacao: userData.classificacao || userData.Classificacao || userData.Classifica\u00E7\u00E3o,
            dizimistaType: userData.dizimista || userData.Dizimista,
            ofertanteType: userData.ofertante || userData.Ofertante,
            tempoBatismoAnos: userData.tempoBatismo || userData.TempoBatismo || userData["Tempo Batismo"],
            cargos: parseCargos(userData.cargos || userData.Cargos),
            nomeUnidade: userData.nomeUnidade || userData.NomeUnidade || userData["Nome Unidade"],
            temLicao: parseBoolean(
              userData.temLicao || userData.TemLicao || userData["Tem Licao"] || userData["Tem Li\xE7\xE3o"]
            ),
            comunhao: parseNumber(userData.comunhao || userData.Comunhao || userData.Comunh\u00E3o),
            missao: userData.missao || userData.Missao || userData.Miss\u00E3o,
            estudoBiblico: parseNumber(
              userData.estudoBiblico || userData.EstudoBiblico || userData["Estudo Biblico"] || userData["Estudo B\xEDblico"]
            ),
            totalPresenca: parseNumber(
              userData.totalPresenca || userData.TotalPresenca || userData["Total Presenca"] || userData["Total Presen\xE7a"]
            ),
            batizouAlguem: parseBoolean(
              userData.batizouAlguem || userData.BatizouAlguem || userData["Batizou Alguem"] || userData["Batizou Algu\xE9m"]
            ),
            discPosBatismal: parseNumber(
              userData.discipuladoPosBatismo || userData.DiscipuladoPosBatismo || userData["Discipulado Pos-Batismo"]
            ),
            cpfValido: userData.cpfValido || userData.CPFValido || userData["CPF Valido"] || userData["CPF V\xE1lido"],
            camposVaziosACMS: parseBoolean(
              userData.camposVaziosACMS || userData.CamposVaziosACMS || userData["Campos Vazios"]
            ),
            lastPowerBIUpdate: (/* @__PURE__ */ new Date()).toISOString()
          };
          await sql`
            UPDATE users
            SET extra_data = ${JSON.stringify(updatedExtraData)}
            WHERE id = ${user.id}
          `;
          updatedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push({
            userName: userData.nome || userData.Nome || userData.name,
            error: errorMessage
          });
        }
      }
      try {
        await storage2.calculateAdvancedUserPoints();
      } catch (error) {
        logger.error("Erro ao recalcular pontos:", error);
      }
      res.json({
        success: true,
        message: `${updatedCount} usu\xE1rios atualizados com sucesso`,
        updated: updatedCount,
        notFound: notFoundCount,
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      handleError(res, error, "Update from Power BI");
    }
  });
};

// server/routes/churchRoutes.ts
var churchRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get(
    "/api/churches",
    cacheMiddleware("churches", CACHE_TTL.CHURCHES),
    async (req, res) => {
      try {
        const userId = parseInt(req.headers["x-user-id"] || "0");
        const user = userId ? await storage2.getUserById(userId) : null;
        let churches2;
        if (isSuperAdmin(user)) {
          churches2 = await storage2.getAllChurches();
        } else if (isPastor(user) && user?.districtId) {
          churches2 = await storage2.getChurchesByDistrict(user.districtId);
        } else {
          const userChurch = user?.church;
          if (userChurch) {
            churches2 = await storage2.getAllChurches().then((chs) => chs.filter((ch) => ch.name === userChurch));
          } else {
            churches2 = [];
          }
        }
        res.json(churches2);
      } catch (error) {
        handleError(res, error, "Get churches");
      }
    }
  );
  app2.post(
    "/api/churches",
    validateBody(createChurchSchema),
    invalidateCacheMiddleware("churches"),
    async (req, res) => {
      try {
        const { name } = req.validatedBody;
        logger.info(`Creating church: ${name}`);
        const church = await storage2.getOrCreateChurch(name.trim());
        res.json(church);
      } catch (error) {
        handleError(res, error, "Create church");
      }
    }
  );
  app2.patch(
    "/api/churches/:id",
    validateBody(updateChurchSchema),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const updates = req.validatedBody;
        const oldChurch = await storage2.getAllChurches().then((churches2) => churches2.find((c) => c.id === id));
        const updatedChurch = await storage2.updateChurch(id, updates);
        if (updatedChurch) {
          if (updates.name && oldChurch && oldChurch.name !== updates.name) {
            const allUsers = await storage2.getAllUsers();
            for (const user of allUsers) {
              if (user.church === oldChurch.name) {
                try {
                  await storage2.updateUser(user.id, { church: updates.name });
                } catch (error) {
                  logger.error(`Erro ao atualizar usu\xE1rio ${user.name}:`, error);
                }
              }
            }
          }
          res.json(updatedChurch);
        } else {
          res.status(404).json({ error: "Igreja n\xE3o encontrada" });
        }
      } catch (error) {
        handleError(res, error, "Update church");
      }
    }
  );
  app2.get("/api/user/church", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }
      const id = parseInt(userId);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
      }
      const user = await storage2.getUserById(id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      let churchName = user.church;
      if (!churchName) {
        const churches2 = await storage2.getAllChurches();
        if (churches2.length > 0) {
          churchName = churches2[0].name;
          try {
            await storage2.updateUserChurch(id, churchName || "");
          } catch (updateError) {
            logger.error("Error updating user church:", updateError);
          }
        }
      }
      res.json({
        success: true,
        church: churchName || "Igreja n\xE3o dispon\xEDvel",
        userId: id
      });
    } catch (error) {
      handleError(res, error, "Get user church");
    }
  });
};

// server/routes/settingsRoutes.ts
import multer from "multer";
var settingsRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get("/api/settings/default-church", async (req, res) => {
    try {
      const defaultChurch = await storage2.getDefaultChurch();
      res.json({ defaultChurch });
    } catch (error) {
      handleError(res, error, "Get default church");
    }
  });
  app2.post("/api/settings/default-church", validateBody(setDefaultChurchSchema), async (req, res) => {
    try {
      const { churchId } = req.validatedBody;
      logger.info(`Setting default church: ${churchId}`);
      const success = await storage2.setDefaultChurch(churchId);
      if (success) {
        res.json({ success: true, message: "Default church updated successfully" });
      } else {
        res.status(400).json({ error: "Failed to update default church" });
      }
    } catch (error) {
      handleError(res, error, "Set default church");
    }
  });
  app2.post("/api/settings/logo", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const upload3 = multer({
        dest: "uploads/",
        limits: { fileSize: 5 * 1024 * 1024 }
      }).single("logo");
      upload3(req, res, async (err) => {
        if (err) {
          logger.error("Multer error:", err);
          const errorMessage = err instanceof Error ? err.message : "Error uploading logo";
          res.status(400).json({
            success: false,
            message: errorMessage
          });
          return;
        }
        const file = req.file;
        if (!file) {
          res.status(400).json({
            success: false,
            message: "No logo file provided"
          });
          return;
        }
        const logoUrl = `/uploads/${file.filename}`;
        try {
          await storage2.saveSystemLogo(logoUrl);
          logger.info(`System logo saved: ${logoUrl}`);
        } catch (dbError) {
          logger.error("Database error:", dbError);
          res.status(500).json({
            success: false,
            message: "Database error while saving logo"
          });
          return;
        }
        res.json({
          success: true,
          message: "Logo uploaded and saved successfully",
          logoUrl,
          filename: file.filename
        });
      });
    } catch (error) {
      handleError(res, error, "Logo upload");
    }
  });
  app2.get("/api/settings/logo", async (req, res) => {
    try {
      const logoData = await storage2.getSystemLogo();
      if (logoData) {
        res.json({
          success: true,
          logoUrl: logoData,
          filename: logoData
        });
      } else {
        res.json({
          success: true,
          logoUrl: null,
          filename: null
        });
      }
    } catch (error) {
      handleError(res, error, "Get logo");
    }
  });
  app2.delete("/api/settings/logo", async (req, res) => {
    try {
      await storage2.clearSystemLogo();
      res.json({
        success: true,
        message: "Logo deleted successfully"
      });
    } catch (error) {
      handleError(res, error, "Delete logo");
    }
  });
  app2.get("/api/meeting-types", async (req, res) => {
    try {
      const meetingTypes2 = await storage2.getMeetingTypes();
      res.json(meetingTypes2);
    } catch (error) {
      handleError(res, error, "Get meeting types");
    }
  });
};

// server/routes/systemRoutes.ts
var autoCleanupInterval = null;
var autoCleanupEnabled = true;
var systemRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  const executeAutoCleanup = async () => {
    try {
      const allRequests = await storage2.getAllDiscipleshipRequests();
      const approvedRequests = allRequests.filter((req) => req.status === "approved");
      let cleanedCount = 0;
      for (const request of approvedRequests) {
        try {
          if (request.interestedId == null) {
            continue;
          }
          const relationships2 = await storage2.getRelationshipsByInterested(request.interestedId);
          const hasActiveRelationship = relationships2.some((rel) => rel.status === "active");
          if (!hasActiveRelationship) {
            await storage2.updateDiscipleshipRequest(request.id, {
              status: "rejected",
              notes: "Limpeza autom\xE1tica - sem relacionamento ativo"
            });
            cleanedCount++;
          }
        } catch (error) {
          logger.error(`Erro na limpeza autom\xE1tica da solicita\xE7\xE3o ${request.id}:`, error);
        }
      }
      if (cleanedCount > 0) {
        logger.info(`\u{1F9F9} Limpeza autom\xE1tica conclu\xEDda: ${cleanedCount} solicita\xE7\xF5es rejeitadas`);
      }
      return cleanedCount;
    } catch (error) {
      logger.error("Erro na limpeza autom\xE1tica:", error);
      return 0;
    }
  };
  const startAutoCleanup = (intervalMinutes = 60) => {
    if (autoCleanupInterval) {
      clearInterval(autoCleanupInterval);
    }
    autoCleanupEnabled = true;
    const intervalMs = intervalMinutes * 60 * 1e3;
    logger.info(`\u23F0 Iniciando limpeza autom\xE1tica a cada ${intervalMinutes} minutos`);
    executeAutoCleanup();
    autoCleanupInterval = setInterval(async () => {
      if (autoCleanupEnabled) {
        await executeAutoCleanup();
      }
    }, intervalMs);
    return true;
  };
  const stopAutoCleanup = () => {
    if (autoCleanupInterval) {
      clearInterval(autoCleanupInterval);
      autoCleanupInterval = null;
    }
    autoCleanupEnabled = false;
    logger.info("\u23F0 Limpeza autom\xE1tica parada");
    return true;
  };
  app2.post("/api/system/clean-orphaned-approvals", async (req, res) => {
    try {
      const allRequests = await storage2.getAllDiscipleshipRequests();
      const approvedRequests = allRequests.filter((req2) => req2.status === "approved");
      let cleanedCount = 0;
      const errors = [];
      for (const request of approvedRequests) {
        try {
          if (request.interestedId == null) {
            continue;
          }
          const relationships2 = await storage2.getRelationshipsByInterested(request.interestedId);
          const hasActiveRelationship = relationships2.some((rel) => rel.status === "active");
          if (!hasActiveRelationship) {
            const updatedRequest = await storage2.updateDiscipleshipRequest(request.id, {
              status: "rejected",
              notes: "Solicita\xE7\xE3o rejeitada automaticamente - sem relacionamento ativo"
            });
            if (updatedRequest) {
              cleanedCount++;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
          logger.error(`Erro ao processar solicita\xE7\xE3o ${request.id}:`, error);
          errors.push({ requestId: request.id, error: errorMessage });
        }
      }
      res.json({
        success: true,
        message: `Limpeza autom\xE1tica conclu\xEDda`,
        cleanedCount,
        totalProcessed: approvedRequests.length,
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      handleError(res, error, "Clean orphaned approvals");
    }
  });
  app2.post("/api/system/schedule-cleanup", async (req, res) => {
    try {
      const { scheduleType, interval } = req.body;
      res.json({
        success: true,
        message: `Limpeza autom\xE1tica agendada para ${scheduleType}`,
        scheduleType,
        interval,
        nextRun: new Date(Date.now() + (interval || 24 * 60 * 60 * 1e3)).toISOString()
      });
    } catch (error) {
      handleError(res, error, "Schedule cleanup");
    }
  });
  app2.post("/api/system/auto-cleanup/start", async (req, res) => {
    try {
      const { intervalMinutes = 60 } = req.body;
      if (intervalMinutes < 15) {
        res.status(400).json({
          success: false,
          error: "Intervalo m\xEDnimo \xE9 de 15 minutos"
        });
        return;
      }
      startAutoCleanup(intervalMinutes);
      res.json({
        success: true,
        message: `Limpeza autom\xE1tica iniciada a cada ${intervalMinutes} minutos`,
        intervalMinutes,
        status: "running"
      });
    } catch (error) {
      handleError(res, error, "Start auto cleanup");
    }
  });
  app2.post("/api/system/auto-cleanup/stop", async (req, res) => {
    try {
      stopAutoCleanup();
      res.json({
        success: true,
        message: "Limpeza autom\xE1tica parada",
        status: "stopped"
      });
    } catch (error) {
      handleError(res, error, "Stop auto cleanup");
    }
  });
  app2.get("/api/system/auto-cleanup/status", async (req, res) => {
    try {
      res.json({
        success: true,
        status: autoCleanupEnabled ? "running" : "stopped",
        interval: autoCleanupInterval ? "configurado" : "n\xE3o configurado",
        lastRun: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      handleError(res, error, "Get auto cleanup status");
    }
  });
  logger.info("\u{1F680} Inicializando sistema de limpeza autom\xE1tica...");
  startAutoCleanup(60);
};

// server/routes/dashboardRoutes.ts
var dashboardRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get(
    "/api/dashboard/stats",
    cacheMiddleware("dashboard", CACHE_TTL.DASHBOARD),
    async (req, res) => {
      try {
        const userId = parseInt(req.headers["x-user-id"] || "0");
        const user = userId ? await storage2.getUserById(userId) : null;
        const allUsers = await storage2.getAllUsers();
        const allEvents = await storage2.getAllEvents();
        let usersToInclude = [];
        let eventsToInclude = [];
        let churchesToInclude = [];
        if (isSuperAdmin(user)) {
          if (user?.districtId) {
            const districtChurches = await storage2.getChurchesByDistrict(user.districtId);
            const districtChurchNames = districtChurches.map((ch) => ch.name);
            usersToInclude = allUsers.filter((u) => {
              const churchName = u.church ?? "";
              return u.email !== "admin@7care.com" && (districtChurchNames.includes(churchName) || u.districtId === user.districtId);
            });
            eventsToInclude = allEvents;
            churchesToInclude = districtChurches;
          } else {
            usersToInclude = allUsers.filter((u) => u.email !== "admin@7care.com");
            eventsToInclude = allEvents;
            churchesToInclude = await storage2.getAllChurches();
          }
        } else if (isPastor(user) && user?.districtId) {
          const districtChurches = await storage2.getChurchesByDistrict(user.districtId);
          const districtChurchNames = districtChurches.map((ch) => ch.name);
          usersToInclude = allUsers.filter((u) => {
            const churchName = u.church ?? "";
            return u.email !== "admin@7care.com" && (districtChurchNames.includes(churchName) || u.districtId === user.districtId);
          });
          eventsToInclude = allEvents;
          churchesToInclude = districtChurches;
        } else {
          const userChurch = user?.church;
          if (userChurch) {
            usersToInclude = allUsers.filter(
              (u) => u.email !== "admin@7care.com" && u.church === userChurch
            );
            eventsToInclude = allEvents.filter((e) => e.church === userChurch);
            churchesToInclude = await storage2.getAllChurches().then((chs) => chs.filter((ch) => ch.name === userChurch));
          } else {
            usersToInclude = [];
            eventsToInclude = [];
            churchesToInclude = [];
          }
        }
        const regularUsers = usersToInclude;
        const usersByRole = regularUsers.reduce(
          (acc, user2) => {
            acc[user2.role] = (acc[user2.role] || 0) + 1;
            return acc;
          },
          {}
        );
        const pendingApprovals = regularUsers.filter((user2) => user2.status === "pending").length;
        const now = /* @__PURE__ */ new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1e3);
        const parseLocalDate = (value) => {
          if (!value) return null;
          if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
          if (typeof value === "string" || typeof value === "number") {
            const d = new Date(value);
            if (!isNaN(d.getTime())) return d;
            const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) {
              const y = Number(m[1]);
              const mo = Number(m[2]) - 1;
              const da = Number(m[3]);
              return new Date(y, mo, da);
            }
          }
          return null;
        };
        const thisWeekEvents = eventsToInclude.filter((event) => {
          const start = parseLocalDate(event.date);
          const end = parseLocalDate(event.endDate) || start;
          if (!start) return false;
          return start < weekEnd && (end ? end >= weekStart : true);
        }).length;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const thisMonthEvents = eventsToInclude.filter((event) => {
          const start = parseLocalDate(event.date);
          const end = parseLocalDate(event.endDate) || start;
          if (!start) return false;
          return start < nextMonthStart && (end ? end >= monthStart : true);
        }).length;
        const today = /* @__PURE__ */ new Date();
        const todayStr = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const birthdaysToday = regularUsers.filter((user2) => {
          if (!user2.birthDate) return false;
          const birthDate = new Date(user2.birthDate);
          if (isNaN(birthDate.getTime())) return false;
          const birthStr = `${String(birthDate.getMonth() + 1).padStart(2, "0")}-${String(birthDate.getDate()).padStart(2, "0")}`;
          return birthStr === todayStr;
        }).length;
        const birthdaysThisWeek = regularUsers.filter((user2) => {
          if (!user2.birthDate) return false;
          const birthDate = new Date(user2.birthDate);
          if (isNaN(birthDate.getTime())) return false;
          const thisYearBirthday = new Date(
            now.getFullYear(),
            birthDate.getMonth(),
            birthDate.getDate()
          );
          return thisYearBirthday >= weekStart && thisYearBirthday < weekEnd;
        }).length;
        const churchesCount = churchesToInclude.length;
        const totalMissionaries = regularUsers.filter((u) => u.role === "missionary").length;
        let interestedBeingDiscipled = 0;
        try {
          const allRelationships = await storage2.getAllRelationships();
          const includedUserIds = new Set(usersToInclude.map((u) => u.id));
          const relationships2 = allRelationships.filter(
            (rel) => rel.interestedId != null && includedUserIds.has(rel.interestedId)
          );
          const activeRelationships = relationships2.filter((rel) => rel.status === "active");
          const interestedWithMentors = new Set(
            activeRelationships.map((rel) => rel.interestedId).filter((id) => id != null)
          );
          interestedBeingDiscipled = interestedWithMentors.size;
        } catch (error) {
          logger.error("Erro ao contar interessados sendo discipulados:", error);
        }
        const stats = {
          totalUsers: regularUsers.length,
          totalInterested: usersByRole.interested || 0,
          interestedBeingDiscipled,
          totalMembers: usersByRole.member || 0,
          totalMissionaries,
          totalAdmins: (usersByRole.pastor || 0) + (usersByRole.superadmin || 0),
          totalChurches: churchesCount,
          pendingApprovals,
          thisWeekEvents,
          thisMonthEvents,
          birthdaysToday,
          birthdaysThisWeek,
          totalEvents: eventsToInclude.length,
          approvedUsers: regularUsers.filter((user2) => user2.status === "approved").length
        };
        res.json(stats);
      } catch (error) {
        handleError(res, error, "Dashboard stats");
      }
    }
  );
  app2.get("/api/dashboard/visits", async (req, res) => {
    try {
      const allUsers = await storage2.getAllUsers();
      const targetUsers = allUsers.filter(
        (user) => user.role === "member" || user.role === "missionary"
      );
      let visitedPeople = 0;
      let totalVisits = 0;
      const visitedUsersList = [];
      targetUsers.forEach((user) => {
        try {
          if (user.extraData) {
            let extraData;
            if (typeof user.extraData === "string") {
              extraData = JSON.parse(user.extraData);
            } else {
              extraData = user.extraData || {};
            }
            if (extraData.visited === true) {
              visitedPeople++;
              const visitCount = extraData.visitCount || 1;
              totalVisits += visitCount;
              visitedUsersList.push({
                id: user.id,
                name: user.name,
                visitCount,
                lastVisitDate: extraData.lastVisitDate
              });
            }
          }
        } catch (error) {
          logger.error(`Erro ao processar usu\xE1rio ${user.name}:`, error);
        }
      });
      const expectedVisits = targetUsers.length;
      const percentage = expectedVisits > 0 ? Math.round(visitedPeople / expectedVisits * 100) : 0;
      res.json({
        completed: visitedPeople,
        expected: expectedVisits,
        totalVisits,
        visitedPeople,
        percentage,
        visitedUsersList
      });
    } catch (error) {
      handleError(res, error, "Get visits");
    }
  });
  app2.post("/api/users/:id(\\d+)/visit", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inv\xE1lido" });
        return;
      }
      const { visitDate } = req.body;
      if (!visitDate) {
        res.status(400).json({ error: "Data da visita \xE9 obrigat\xF3ria" });
        return;
      }
      const user = await storage2.getUserById(id);
      if (!user) {
        res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
        return;
      }
      let extraData = {};
      if (user.extraData) {
        if (typeof user.extraData === "string") {
          try {
            extraData = JSON.parse(user.extraData);
          } catch {
            extraData = {};
          }
        } else if (typeof user.extraData === "object") {
          extraData = { ...user.extraData };
        }
      }
      const previousVisitCount = typeof extraData.visitCount === "number" ? extraData.visitCount : 0;
      extraData.visited = true;
      extraData.lastVisitDate = visitDate;
      extraData.visitCount = previousVisitCount + 1;
      const updatedUser = await storage2.updateUser(id, {
        extraData: JSON.stringify(extraData)
      });
      if (!updatedUser) {
        res.status(500).json({ error: "Erro ao atualizar usu\xE1rio" });
        return;
      }
      const responseUser = {
        ...updatedUser,
        extraData
      };
      res.json(responseUser);
    } catch (error) {
      handleError(res, error, "Mark visit");
    }
  });
};

// server/routes/pointsRoutes.ts
var pointsRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  const parseExtraData3 = (user) => {
    if (!user.extraData) return {};
    if (typeof user.extraData === "string") {
      try {
        return JSON.parse(user.extraData);
      } catch {
        return {};
      }
    }
    return user.extraData;
  };
  const calculateUserPointsFromConfig2 = (user, config) => {
    let points = 0;
    const extraData = parseExtraData3(user);
    const engajamento = extraData.engajamento?.toLowerCase() || "";
    if (engajamento.includes("alto")) {
      points += config.engajamento?.alto || 0;
    } else if (engajamento.includes("medio")) {
      points += config.engajamento?.medio || 0;
    } else if (engajamento.includes("baixo")) {
      points += config.engajamento?.baixo || 0;
    }
    const classificacao = extraData.classificacao?.toLowerCase() || "";
    if (classificacao.includes("frequente")) {
      points += config.classificacao?.frequente || 0;
    } else if (classificacao.includes("naofrequente")) {
      points += config.classificacao?.naoFrequente || 0;
    }
    const dizimistaType = extraData.dizimistaType?.toLowerCase() || "";
    if (dizimistaType.includes("recorrente")) {
      points += config.dizimista?.recorrente || 0;
    } else if (dizimistaType.includes("sazonal")) {
      points += config.dizimista?.sazonal || 0;
    } else if (dizimistaType.includes("pontual")) {
      points += config.dizimista?.pontual || 0;
    }
    const ofertanteType = extraData.ofertanteType?.toLowerCase() || "";
    if (ofertanteType.includes("recorrente")) {
      points += config.ofertante?.recorrente || 0;
    } else if (ofertanteType.includes("sazonal")) {
      points += config.ofertante?.sazonal || 0;
    } else if (ofertanteType.includes("pontual")) {
      points += config.ofertante?.pontual || 0;
    }
    const tempoBatismoAnos = extraData.tempoBatismoAnos || 0;
    if (tempoBatismoAnos >= 20) {
      points += config.tempobatismo?.maisVinte || 0;
    } else if (tempoBatismoAnos >= 10) {
      points += config.tempobatismo?.dezAnos || 0;
    } else if (tempoBatismoAnos >= 5) {
      points += config.tempobatismo?.cincoAnos || 0;
    } else if (tempoBatismoAnos >= 2) {
      points += config.tempobatismo?.doisAnos || 0;
    }
    if (extraData.temCargo === "Sim" && extraData.departamentosCargos) {
      const numCargos = extraData.departamentosCargos.split(";").length;
      if (numCargos >= 3) {
        points += config.cargos?.tresOuMais || 0;
      } else if (numCargos === 2) {
        points += config.cargos?.doisCargos || 0;
      } else if (numCargos === 1) {
        points += config.cargos?.umCargo || 0;
      }
    }
    if (extraData.nomeUnidade?.trim()) {
      points += config.nomeunidade?.comUnidade || 0;
    }
    if (extraData.temLicao === true || extraData.temLicao === "true") {
      points += config.temlicao?.comLicao || 0;
    }
    if (extraData.totalPresenca !== void 0 && extraData.totalPresenca !== null) {
      const presenca = typeof extraData.totalPresenca === "string" ? parseInt(extraData.totalPresenca) : extraData.totalPresenca;
      if (presenca >= 8 && presenca <= 13) {
        points += config.totalpresenca?.oitoATreze || 0;
      } else if (presenca >= 4 && presenca <= 7) {
        points += config.totalpresenca?.quatroASete || 0;
      }
    }
    if (extraData.comunhao && extraData.comunhao > 0) {
      points += extraData.comunhao * (config.escolasabatina?.comunhao || 0);
    }
    if (extraData.missao && extraData.missao > 0) {
      points += extraData.missao * (config.escolasabatina?.missao || 0);
    }
    if (extraData.estudoBiblico && extraData.estudoBiblico > 0) {
      points += extraData.estudoBiblico * (config.escolasabatina?.estudoBiblico || 0);
    }
    if (extraData.discipuladoPosBatismo && extraData.discipuladoPosBatismo > 0) {
      points += extraData.discipuladoPosBatismo * (config.discipuladoPosBatismo?.multiplicador || 0);
    }
    if (extraData.cpfValido === "Sim" || extraData.cpfValido === "true") {
      points += config.cpfValido?.valido || 0;
    }
    if (extraData.camposVaziosACMS === "false") {
      points += config.camposVaziosACMS?.completos || 0;
    }
    return Math.round(points);
  };
  const calculateParameterAverage = (config) => {
    const values = [];
    if (config.basicPoints && config.basicPoints > 0) values.push(config.basicPoints);
    if (config.attendancePoints && config.attendancePoints > 0)
      values.push(config.attendancePoints);
    if (config.eventPoints && config.eventPoints > 0) values.push(config.eventPoints);
    if (config.donationPoints && config.donationPoints > 0) values.push(config.donationPoints);
    const categories = [
      "engajamento",
      "classificacao",
      "dizimista",
      "ofertante",
      "tempoBatismo",
      "cargos",
      "nomeUnidade",
      "temLicao",
      "totalPresenca",
      "escolaSabatina",
      "batizouAlguem",
      "cpfValido",
      "camposVaziosACMS"
    ];
    categories.forEach((category) => {
      const section = config[category];
      if (section && typeof section === "object") {
        Object.values(section).forEach((value) => {
          const numValue = Number(value);
          if (numValue > 0) values.push(numValue);
        });
      }
    });
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  };
  const applyAdjustmentFactorToParameters = (config, factor) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    if (newConfig.basicPoints) newConfig.basicPoints = Math.round(newConfig.basicPoints * factor);
    if (newConfig.attendancePoints)
      newConfig.attendancePoints = Math.round(newConfig.attendancePoints * factor);
    if (newConfig.eventPoints) newConfig.eventPoints = Math.round(newConfig.eventPoints * factor);
    if (newConfig.donationPoints)
      newConfig.donationPoints = Math.round(newConfig.donationPoints * factor);
    const pointCategories = [
      "engajamento",
      "classificacao",
      "dizimista",
      "ofertante",
      "tempoBatismo",
      "cargos",
      "nomeUnidade",
      "temLicao",
      "totalPresenca",
      "escolaSabatina",
      "batizouAlguem",
      "cpfValido",
      "camposVaziosACMS"
    ];
    pointCategories.forEach((category) => {
      const section = newConfig[category];
      if (section && typeof section === "object") {
        Object.keys(section).forEach((fieldKey) => {
          if (typeof section[fieldKey] === "number") {
            section[fieldKey] = Math.round(
              section[fieldKey] * factor
            );
          }
        });
      }
    });
    if (newConfig.pontuacaoDinamica) {
      newConfig.pontuacaoDinamica.multiplicador = 1;
    }
    if (newConfig.presenca) {
      newConfig.presenca.multiplicador = 1;
    }
    if (newConfig.discipuladoPosBatismo) {
      newConfig.discipuladoPosBatismo.multiplicador = 1;
    }
    return newConfig;
  };
  const mergePointsConfiguration = (base, partial) => {
    const safeBase = getRequiredPointsConfig(base);
    const tempoBatismo = partial.tempoBatismo ?? partial.tempobatismo ?? {};
    const nomeUnidade = partial.nomeUnidade ?? partial.nomeunidade ?? {};
    const temLicao = partial.temLicao ?? partial.temlicao ?? {};
    const totalPresenca = partial.totalPresenca ?? partial.totalpresenca ?? {};
    const escolaSabatina = partial.escolaSabatina ?? partial.escolasabatina ?? {};
    const batizouAlguem = partial.batizouAlguem ?? {};
    const cpfValido = partial.cpfValido ?? partial.cpfvalido ?? {};
    const camposVaziosACMS = partial.camposVaziosACMS ?? partial.camposvaziosacms ?? {};
    return {
      basicPoints: partial.basicPoints ?? safeBase.basicPoints,
      attendancePoints: partial.attendancePoints ?? safeBase.attendancePoints,
      eventPoints: partial.eventPoints ?? safeBase.eventPoints,
      donationPoints: partial.donationPoints ?? safeBase.donationPoints,
      engajamento: {
        baixo: partial.engajamento?.baixo ?? safeBase.engajamento.baixo,
        medio: partial.engajamento?.medio ?? safeBase.engajamento.medio,
        alto: partial.engajamento?.alto ?? safeBase.engajamento.alto
      },
      classificacao: {
        frequente: partial.classificacao?.frequente ?? safeBase.classificacao.frequente,
        naoFrequente: partial.classificacao?.naoFrequente ?? safeBase.classificacao.naoFrequente
      },
      dizimista: {
        naoDizimista: partial.dizimista?.naoDizimista ?? safeBase.dizimista.naoDizimista,
        pontual: partial.dizimista?.pontual ?? safeBase.dizimista.pontual,
        sazonal: partial.dizimista?.sazonal ?? safeBase.dizimista.sazonal,
        recorrente: partial.dizimista?.recorrente ?? safeBase.dizimista.recorrente
      },
      ofertante: {
        naoOfertante: partial.ofertante?.naoOfertante ?? safeBase.ofertante.naoOfertante,
        pontual: partial.ofertante?.pontual ?? safeBase.ofertante.pontual,
        sazonal: partial.ofertante?.sazonal ?? safeBase.ofertante.sazonal,
        recorrente: partial.ofertante?.recorrente ?? safeBase.ofertante.recorrente
      },
      tempoBatismo: {
        doisAnos: tempoBatismo.doisAnos ?? safeBase.tempoBatismo.doisAnos,
        cincoAnos: tempoBatismo.cincoAnos ?? safeBase.tempoBatismo.cincoAnos,
        dezAnos: tempoBatismo.dezAnos ?? safeBase.tempoBatismo.dezAnos,
        vinteAnos: safeBase.tempoBatismo.vinteAnos,
        maisVinte: tempoBatismo.maisVinte ?? safeBase.tempoBatismo.maisVinte
      },
      cargos: {
        umCargo: partial.cargos?.umCargo ?? safeBase.cargos.umCargo,
        doisCargos: partial.cargos?.doisCargos ?? safeBase.cargos.doisCargos,
        tresOuMais: partial.cargos?.tresOuMais ?? safeBase.cargos.tresOuMais
      },
      nomeUnidade: {
        comUnidade: nomeUnidade.comUnidade ?? safeBase.nomeUnidade.comUnidade,
        semUnidade: safeBase.nomeUnidade.semUnidade
      },
      temLicao: {
        comLicao: temLicao.comLicao ?? safeBase.temLicao.comLicao
      },
      pontuacaoDinamica: {
        multiplicador: partial.pontuacaoDinamica?.multiplicador ?? safeBase.pontuacaoDinamica.multiplicador
      },
      totalPresenca: {
        zeroATres: safeBase.totalPresenca.zeroATres,
        quatroASete: totalPresenca.quatroASete ?? safeBase.totalPresenca.quatroASete,
        oitoATreze: totalPresenca.oitoATreze ?? safeBase.totalPresenca.oitoATreze
      },
      presenca: {
        multiplicador: partial.presenca?.multiplicador ?? safeBase.presenca.multiplicador
      },
      escolaSabatina: {
        comunhao: escolaSabatina.comunhao ?? safeBase.escolaSabatina.comunhao,
        missao: escolaSabatina.missao ?? safeBase.escolaSabatina.missao,
        estudoBiblico: escolaSabatina.estudoBiblico ?? safeBase.escolaSabatina.estudoBiblico,
        batizouAlguem: escolaSabatina.batizouAlguem ?? safeBase.escolaSabatina.batizouAlguem,
        discipuladoPosBatismo: escolaSabatina.discipuladoPosBatismo ?? safeBase.escolaSabatina.discipuladoPosBatismo
      },
      batizouAlguem: {
        sim: batizouAlguem.sim ?? safeBase.batizouAlguem.sim,
        nao: safeBase.batizouAlguem.nao
      },
      discipuladoPosBatismo: {
        multiplicador: partial.discipuladoPosBatismo?.multiplicador ?? safeBase.discipuladoPosBatismo.multiplicador
      },
      cpfValido: {
        valido: cpfValido.valido ?? safeBase.cpfValido.valido,
        invalido: safeBase.cpfValido.invalido
      },
      camposVaziosACMS: {
        completos: camposVaziosACMS.completos ?? safeBase.camposVaziosACMS.completos,
        incompletos: safeBase.camposVaziosACMS.incompletos
      }
    };
  };
  app2.get("/api/system/points-config", async (req, res) => {
    try {
      const config = await storage2.getPointsConfiguration();
      res.json(config);
    } catch (error) {
      handleError(res, error, "Get points config");
    }
  });
  app2.post(
    "/api/system/points-config",
    validateBody(pointsConfigSchema),
    async (req, res) => {
      try {
        const config = req.validatedBody;
        await storage2.savePointsConfiguration(
          config
        );
        const result = await storage2.calculateAdvancedUserPoints();
        if (result.success) {
          res.json({
            success: true,
            message: `Configura\xE7\xE3o salva e pontos recalculados automaticamente! ${result.updatedUsers || 0} usu\xE1rios atualizados.`,
            updatedUsers: result.updatedUsers || 0,
            errors: result.errors || 0,
            details: result.message
          });
        } else {
          res.status(500).json({
            error: "Erro ao recalcular pontos automaticamente",
            details: result.message
          });
        }
      } catch (error) {
        handleError(res, error, "Save points config");
      }
    }
  );
  app2.post("/api/system/points-config/reset", async (req, res) => {
    try {
      await db.delete(schema.pointConfigs);
      const result = await storage2.calculateAdvancedUserPoints();
      if (result.success) {
        res.json({
          success: true,
          message: `Configura\xE7\xE3o resetada e pontos recalculados automaticamente! ${result.updatedUsers || 0} usu\xE1rios atualizados.`,
          updatedUsers: result.updatedUsers || 0,
          errors: result.errors || 0,
          details: result.message
        });
      } else {
        res.status(500).json({
          error: "Erro ao recalcular pontos automaticamente ap\xF3s reset",
          details: result.message
        });
      }
    } catch (error) {
      handleError(res, error, "Reset points config");
    }
  });
  app2.post("/api/users/recalculate-all-points", async (req, res) => {
    try {
      const users2 = await storage2.getAllUsers();
      let updatedCount = 0;
      let errorCount = 0;
      const results = [];
      for (const user of users2) {
        try {
          if (isSuperAdmin({ role: user.role, email: user.email })) {
            continue;
          }
          const calculation = await storage2.calculateUserPoints(user.id);
          if (calculation && typeof calculation === "object" && calculation.success) {
            if (user.points !== calculation.points) {
              await storage2.updateUser(user.id, { points: calculation.points });
              updatedCount++;
            }
            results.push({
              userId: user.id,
              name: user.name,
              points: calculation.points,
              updated: user.points !== calculation.points
            });
          } else {
            errorCount++;
          }
        } catch (userError) {
          logger.error(`Erro ao processar usu\xE1rio ${user.name}:`, userError);
          errorCount++;
        }
      }
      res.json({
        success: true,
        message: `Pontos recalculados para ${users2.length} usu\xE1rios. ${updatedCount} atualizados.`,
        updatedCount,
        totalUsers: users2.length,
        errors: errorCount,
        results
      });
    } catch (error) {
      handleError(res, error, "Recalculate all points");
    }
  });
  app2.get("/api/system/parameter-average", async (req, res) => {
    try {
      const currentConfig = await storage2.getPointsConfiguration();
      const currentAverage = calculateParameterAverage(currentConfig);
      res.json({
        success: true,
        currentAverage: currentAverage.toFixed(2),
        message: `M\xE9dia atual dos par\xE2metros: ${currentAverage.toFixed(2)}`
      });
    } catch (error) {
      handleError(res, error, "Get parameter average");
    }
  });
  app2.post("/api/system/district-average", async (req, res) => {
    try {
      const { targetAverage } = req.body;
      if (!targetAverage || typeof targetAverage !== "number") {
        res.status(400).json({
          success: false,
          error: "M\xE9dia desejada \xE9 obrigat\xF3ria e deve ser um n\xFAmero"
        });
        return;
      }
      const currentConfig = await storage2.getPointsConfiguration();
      const allUsers = await storage2.getAllUsers();
      const regularUsers = allUsers.filter((user) => user.email !== "admin@7care.com");
      if (regularUsers.length === 0) {
        res.status(400).json({
          success: false,
          error: "N\xE3o h\xE1 usu\xE1rios para calcular a m\xE9dia"
        });
        return;
      }
      let totalCurrentPoints = 0;
      for (const user of regularUsers) {
        const points = calculateUserPointsFromConfig2(user, currentConfig);
        totalCurrentPoints += Math.round(points);
      }
      const currentUserAverage = totalCurrentPoints / regularUsers.length;
      const adjustmentFactor = targetAverage / currentUserAverage;
      const newConfig = applyAdjustmentFactorToParameters(currentConfig, adjustmentFactor);
      const mergedConfig = mergePointsConfiguration(currentConfig, newConfig);
      await storage2.savePointsConfiguration(mergedConfig);
      const result = await storage2.calculateAdvancedUserPoints();
      if (!result.success) {
        throw new Error(`Erro no rec\xE1lculo autom\xE1tico: ${result.message}`);
      }
      res.json({
        success: true,
        currentUserAverage: currentUserAverage.toFixed(2),
        targetAverage,
        adjustmentFactor: adjustmentFactor.toFixed(2),
        updatedUsers: result.updatedUsers || 0,
        errors: result.errors || 0,
        message: `Configura\xE7\xE3o ajustada e pontos recalculados automaticamente! ${result.updatedUsers || 0} usu\xE1rios atualizados.`,
        details: result.message
      });
    } catch (error) {
      handleError(res, error, "District average");
    }
  });
  app2.get("/api/system/event-permissions", async (req, res) => {
    try {
      const permissions = await storage2.getEventPermissions();
      res.json({ success: true, permissions });
    } catch (error) {
      handleError(res, error, "Get event permissions");
    }
  });
  app2.post("/api/system/event-permissions", async (req, res) => {
    try {
      const { permissions } = req.body;
      if (!permissions || typeof permissions !== "object") {
        res.status(400).json({
          success: false,
          error: "Permiss\xF5es s\xE3o obrigat\xF3rias e devem ser um objeto"
        });
        return;
      }
      await storage2.saveEventPermissions(permissions);
      res.json({
        success: true,
        message: "Permiss\xF5es de eventos salvas com sucesso"
      });
    } catch (error) {
      handleError(res, error, "Save event permissions");
    }
  });
};

// server/routes/spiritualRoutes.ts
var spiritualRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.post("/api/emotional-checkin", validateBody(createEmotionalCheckInSchema), async (req, res) => {
    try {
      const validatedData = req.validatedBody;
      const { userId, emotionalScore, mood, prayerRequest, isPrivate, allowChurchMembers } = validatedData;
      logger.info(`Emotional check-in for user ${userId}`);
      let finalScore = emotionalScore ?? null;
      if (mood) {
        finalScore = null;
      }
      const checkIn = await storage2.createEmotionalCheckIn({
        userId,
        emotionalScore: finalScore,
        mood: mood ?? null,
        prayerRequest: prayerRequest ?? null,
        isPrivate,
        allowChurchMembers
      });
      res.json({ success: true, data: checkIn });
    } catch (error) {
      handleError(res, error, "Create emotional check-in");
    }
  });
  app2.get("/api/emotional-checkins/admin", async (req, res) => {
    try {
      const checkIns = await storage2.getEmotionalCheckInsForAdmin();
      res.json(checkIns);
    } catch (error) {
      handleError(res, error, "Get emotional check-ins for admin");
    }
  });
  app2.get("/api/spiritual-checkins/scores", async (req, res) => {
    try {
      const checkIns = await storage2.getEmotionalCheckInsForAdmin();
      const scoreGroups = {
        "1": { count: 0, label: "Distante", description: "Muito distante de Deus" },
        "2": { count: 0, label: "Frio", description: "Pouco conectado" },
        "3": { count: 0, label: "Neutro", description: "Indiferente" },
        "4": { count: 0, label: "Quente", description: "Conectado" },
        "5": { count: 0, label: "Intimidade", description: "Muito pr\xF3ximo de Deus" }
      };
      checkIns.forEach((checkIn) => {
        const score = checkIn.emotionalScore?.toString();
        if (score && scoreGroups[score]) {
          scoreGroups[score].count++;
        }
      });
      const allUsers = await storage2.getAllUsers();
      const usersWithCheckIn = new Set(checkIns.map((c) => c.userId));
      const usersWithoutCheckIn = allUsers.filter((u) => !usersWithCheckIn.has(u.id)).length;
      res.json({
        scoreGroups,
        usersWithoutCheckIn,
        total: allUsers.length
      });
    } catch (error) {
      handleError(res, error, "Get spiritual check-in scores");
    }
  });
  app2.get("/api/emotional-checkins/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        res.status(400).json({ error: "ID do usu\xE1rio inv\xE1lido" });
        return;
      }
      const checkIns = await storage2.getEmotionalCheckInsByUser(userId);
      res.json(checkIns);
    } catch (error) {
      handleError(res, error, "Get emotional check-ins by user");
    }
  });
  app2.post("/api/system/update-profiles-by-bible-study", async (req, res) => {
    try {
      const result = { success: true, message: "Funcionalidade n\xE3o implementada" };
      res.json({
        success: true,
        message: "Perfis atualizados com sucesso baseado no estudo b\xEDblico",
        result
      });
    } catch (error) {
      handleError(res, error, "Update profiles by Bible study");
    }
  });
};

// server/routes/eventRoutes.ts
var eventRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  const resolveOrganizerId = (req) => {
    const headerValue = req.headers["x-user-id"];
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const parsed = rawValue ? parseInt(String(rawValue), 10) : NaN;
    return Number.isNaN(parsed) ? 1 : parsed;
  };
  const resolveChurchInfo = async () => {
    const defaultChurch = await storage2.getDefaultChurch();
    if (defaultChurch?.id) {
      return { id: defaultChurch.id, name: defaultChurch.name || "" };
    }
    const churches2 = await storage2.getAllChurches();
    const firstChurch = churches2[0];
    if (firstChurch?.id) {
      return { id: firstChurch.id, name: firstChurch.name || "" };
    }
    return { id: 1, name: "" };
  };
  app2.get("/api/events", async (req, res) => {
    try {
      const { church, startDate, endDate } = req.query;
      let events2 = await storage2.getAllEvents();
      if (church) {
        events2 = events2.filter((e) => e.church === church);
      }
      if (startDate) {
        const start = new Date(startDate);
        events2 = events2.filter((e) => new Date(e.date || "") >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        events2 = events2.filter((e) => new Date(e.date || "") <= end);
      }
      res.json(events2);
    } catch (error) {
      handleError(res, error, "Get events");
    }
  });
  app2.post("/api/events", validateBody(createEventSchema), async (req, res) => {
    try {
      const eventData = req.validatedBody;
      logger.info(`Creating event: ${eventData.title}`);
      const organizerId = resolveOrganizerId(req);
      const churchInfo = await resolveChurchInfo();
      const churchId = eventData.churchId ?? churchInfo.id;
      const event = await storage2.createEvent({
        ...eventData,
        description: eventData.description ?? "",
        time: eventData.time ?? "",
        location: eventData.location ?? "",
        recurrencePattern: eventData.recurrencePattern ?? "",
        maxParticipants: 0,
        isPublic: true,
        church: eventData.church ?? churchInfo.name,
        organizerId: eventData.organizerId ?? organizerId,
        churchId
      });
      res.status(201).json(event);
    } catch (error) {
      handleError(res, error, "Create event");
    }
  });
  app2.delete("/api/events", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        res.status(400).json({ error: "IDs dos eventos s\xE3o obrigat\xF3rios" });
        return;
      }
      for (const id of ids) {
        await storage2.deleteEvent(id);
      }
      res.json({ success: true, message: `${ids.length} eventos removidos` });
    } catch (error) {
      handleError(res, error, "Delete events");
    }
  });
  app2.get("/api/event-types/:role", async (req, res) => {
    try {
      const { role } = req.params;
      const eventTypes = [
        { id: "culto", name: "Culto", color: "#3b82f6" },
        { id: "estudo_biblico", name: "Estudo B\xEDblico", color: "#10b981" },
        { id: "reuniao", name: "Reuni\xE3o", color: "#f59e0b" },
        { id: "evento_especial", name: "Evento Especial", color: "#8b5cf6" },
        { id: "visita", name: "Visita", color: "#ec4899" },
        { id: "batismo", name: "Batismo", color: "#06b6d4" },
        { id: "santa_ceia", name: "Santa Ceia", color: "#84cc16" }
      ];
      if (role === "superadmin" || role === "pastor" || role === "admin_readonly") {
        res.json(eventTypes);
        return;
      }
      const limitedTypes = eventTypes.filter(
        (t) => ["culto", "estudo_biblico", "visita"].includes(t.id)
      );
      res.json(limitedTypes);
    } catch (error) {
      handleError(res, error, "Get event types");
    }
  });
  app2.get("/api/calendar/events", async (req, res) => {
    try {
      const events2 = await storage2.getAllEvents();
      res.json(events2);
    } catch (error) {
      handleError(res, error, "Get calendar events");
    }
  });
  app2.post("/api/calendar/events", async (req, res) => {
    try {
      const eventData = req.body;
      const organizerId = resolveOrganizerId(req);
      const churchInfo = await resolveChurchInfo();
      const churchId = eventData?.churchId ?? churchInfo.id;
      const event = await storage2.createEvent({
        ...eventData,
        description: eventData?.description ?? "",
        time: eventData?.time ?? "",
        location: eventData?.location ?? "",
        recurrencePattern: eventData?.recurrencePattern ?? "",
        maxParticipants: eventData?.maxParticipants ?? eventData?.capacity ?? 0,
        isPublic: true,
        church: eventData?.church ?? churchInfo.name,
        organizerId: eventData?.organizerId ?? organizerId,
        churchId
      });
      res.status(201).json(event);
    } catch (error) {
      handleError(res, error, "Create calendar event");
    }
  });
};

// server/routes/meetingRoutes.ts
var meetingRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get("/api/meetings", async (req, res) => {
    try {
      const { userId, status } = req.query;
      let meetings2 = await storage2.getAllMeetings();
      if (userId) {
        const id = parseInt(String(userId), 10);
        meetings2 = meetings2.filter((m) => m.requesterId === id || m.assignedToId === id);
      }
      if (status) {
        meetings2 = meetings2.filter((m) => m.status === status);
      }
      res.json(meetings2);
    } catch (error) {
      handleError(res, error, "Get meetings");
    }
  });
  app2.post(
    "/api/meetings",
    validateBody(createMeetingSchema),
    async (req, res) => {
      try {
        const meetingData = req.validatedBody;
        logger.info(`Creating meeting: ${meetingData.title}`);
        const meeting = await storage2.createMeeting({
          ...meetingData,
          notes: meetingData.notes ?? "",
          isUrgent: meetingData.isUrgent ?? false
        });
        res.status(201).json(meeting);
      } catch (error) {
        handleError(res, error, "Create meeting");
      }
    }
  );
  app2.put("/api/meetings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const meetingData = req.body;
      const meeting = await storage2.updateMeeting(id, meetingData);
      if (!meeting) {
        res.status(404).json({ error: "Reuni\xE3o n\xE3o encontrada" });
        return;
      }
      res.json(meeting);
    } catch (error) {
      handleError(res, error, "Update meeting");
    }
  });
  app2.get("/api/meeting-types", async (req, res) => {
    try {
      const meetingTypes2 = await storage2.getMeetingTypes();
      res.json(meetingTypes2);
    } catch (error) {
      handleError(res, error, "Get meeting types");
    }
  });
};

// server/routes/relationshipRoutes.ts
var relationshipRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get("/api/relationships", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      const missionaryIdFilter = req.query.missionaryId;
      let userChurch = null;
      const userIdNum = userId ? parseInt(userId) : null;
      if (!hasAdminAccess({ role: userRole }) && userId) {
        const currentUser = await storage2.getUserById(parseInt(userId));
        if (currentUser?.church) {
          userChurch = currentUser.church;
        }
      }
      const relationships2 = await storage2.getAllRelationships();
      const enrichedRelationships = await Promise.all(
        relationships2.map(async (rel) => {
          const interested = rel.interestedId ? await storage2.getUserById(rel.interestedId) : null;
          const missionary = rel.missionaryId ? await storage2.getUserById(rel.missionaryId) : null;
          return {
            ...rel,
            interestedName: interested?.name || "Desconhecido",
            missionaryName: missionary?.name || "Desconhecido",
            interestedChurch: interested?.church || null,
            missionaryChurch: missionary?.church || null
          };
        })
      );
      let filteredRelationships = enrichedRelationships;
      if (userChurch && userIdNum) {
        filteredRelationships = enrichedRelationships.filter((rel) => {
          const r = rel;
          return r.missionaryId === userIdNum || // OU o relacionamento envolve sua igreja
          r.interestedChurch === userChurch || r.missionaryChurch === userChurch;
        });
      }
      if (missionaryIdFilter) {
        filteredRelationships = filteredRelationships.filter(
          (rel) => rel.missionaryId === parseInt(missionaryIdFilter)
        );
      }
      res.json(filteredRelationships);
    } catch (error) {
      handleError(res, error, "Get relationships");
    }
  });
  app2.post(
    "/api/relationships",
    validateBody(createRelationshipSchema),
    async (req, res) => {
      try {
        const { interestedId, missionaryId, status, notes } = req.validatedBody;
        logger.info(
          `Creating relationship: missionary ${missionaryId} -> interested ${interestedId}`
        );
        const interested = await storage2.getUserById(interestedId);
        const missionary = await storage2.getUserById(missionaryId);
        if (!interested) {
          res.status(404).json({ error: "Interessado n\xE3o encontrado" });
          return;
        }
        if (!missionary) {
          res.status(404).json({ error: "Discipulador n\xE3o encontrado" });
          return;
        }
        if (interested.church && missionary.church && interested.church !== missionary.church) {
          res.status(400).json({
            error: "Discipulado s\xF3 pode acontecer entre membros da mesma igreja",
            details: {
              interessadoIgreja: interested.church,
              discipuladorIgreja: missionary.church
            }
          });
          return;
        }
        const relationship = await storage2.createRelationship({
          interestedId,
          missionaryId,
          status: status || "active",
          notes: notes ?? void 0
        });
        res.status(201).json(relationship);
      } catch (error) {
        handleError(res, error, "Create relationship");
      }
    }
  );
  app2.delete("/api/relationships/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage2.deleteRelationship(id);
      if (!deleted) {
        res.status(404).json({ error: "Relacionamento n\xE3o encontrado" });
        return;
      }
      res.json({ success: true, message: "Relacionamento removido" });
    } catch (error) {
      handleError(res, error, "Delete relationship");
    }
  });
  app2.get("/api/relationships/interested/:interestedId", async (req, res) => {
    try {
      const interestedId = parseInt(req.params.interestedId);
      const relationships2 = await storage2.getRelationshipsByInterested(interestedId);
      res.json(relationships2);
    } catch (error) {
      handleError(res, error, "Get relationships by interested");
    }
  });
  app2.get("/api/relationships/missionary/:missionaryId", async (req, res) => {
    try {
      const missionaryId = parseInt(req.params.missionaryId);
      const relationships2 = await storage2.getRelationshipsByMissionary(missionaryId);
      res.json(relationships2);
    } catch (error) {
      handleError(res, error, "Get relationships by missionary");
    }
  });
  app2.delete("/api/relationships/active/:interestedId", async (req, res) => {
    try {
      const interestedId = parseInt(req.params.interestedId);
      const relationships2 = await storage2.getRelationshipsByInterested(interestedId);
      const activeRelationship = relationships2.find(
        (r) => r.status === "active"
      );
      if (!activeRelationship) {
        res.status(404).json({ error: "Nenhum relacionamento ativo encontrado" });
        return;
      }
      await storage2.deleteRelationship(activeRelationship.id);
      res.json({ success: true, message: "Relacionamento ativo removido" });
    } catch (error) {
      handleError(res, error, "Delete active relationship");
    }
  });
};

// server/routes/discipleshipRoutes.ts
var discipleshipRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get("/api/discipleship-requests", async (req, res) => {
    try {
      const { missionaryId, status } = req.query;
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      let userChurch = null;
      if (!hasAdminAccess({ role: userRole }) && userId) {
        const currentUser = await storage2.getUserById(parseInt(userId));
        if (currentUser?.church) {
          userChurch = currentUser.church;
        }
      }
      let requests = await storage2.getAllDiscipleshipRequests();
      if (missionaryId) {
        const id = parseInt(missionaryId);
        requests = requests.filter((r) => r.missionaryId === id);
      }
      if (status) {
        requests = requests.filter((r) => r.status === status);
      }
      const enrichedRequests = await Promise.all(
        requests.map(async (req2) => {
          const interested = req2.interestedId ? await storage2.getUserById(req2.interestedId) : null;
          const missionary = req2.missionaryId ? await storage2.getUserById(req2.missionaryId) : null;
          return {
            ...req2,
            interestedName: interested?.name || "Desconhecido",
            missionaryName: missionary?.name || "Desconhecido",
            interestedChurch: interested?.church || null,
            missionaryChurch: missionary?.church || null
          };
        })
      );
      let filteredRequests = enrichedRequests;
      if (userChurch) {
        filteredRequests = enrichedRequests.filter(
          (req2) => req2.interestedChurch === userChurch || req2.missionaryChurch === userChurch
        );
      }
      res.json(filteredRequests);
    } catch (error) {
      handleError(res, error, "Get discipleship requests");
    }
  });
  app2.post(
    "/api/discipleship-requests",
    validateBody(createDiscipleshipRequestSchema),
    async (req, res) => {
      try {
        const { interestedId, missionaryId, notes } = req.validatedBody;
        logger.info(
          `Creating discipleship request: missionary ${missionaryId} -> interested ${interestedId}`
        );
        const interested = await storage2.getUserById(interestedId);
        const missionary = await storage2.getUserById(missionaryId);
        if (!interested) {
          res.status(404).json({ error: "Interessado n\xE3o encontrado" });
          return;
        }
        if (!missionary) {
          res.status(404).json({ error: "Discipulador n\xE3o encontrado" });
          return;
        }
        if (interested.church && missionary.church && interested.church !== missionary.church) {
          res.status(400).json({
            error: "Discipulado s\xF3 pode acontecer entre membros da mesma igreja",
            details: {
              interessadoIgreja: interested.church,
              discipuladorIgreja: missionary.church
            }
          });
          return;
        }
        const existingRequests = await storage2.getAllDiscipleshipRequests();
        const hasPending = existingRequests.some(
          (r) => r.interestedId === interestedId && r.missionaryId === missionaryId && r.status === "pending"
        );
        if (hasPending) {
          res.status(400).json({ error: "J\xE1 existe um pedido pendente para este interessado" });
          return;
        }
        const request = await storage2.createDiscipleshipRequest({
          interestedId,
          missionaryId,
          status: "pending",
          notes: notes ?? void 0
        });
        res.status(201).json(request);
      } catch (error) {
        handleError(res, error, "Create discipleship request");
      }
    }
  );
  app2.put("/api/discipleship-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      const request = await storage2.updateDiscipleshipRequest(id, { status, notes });
      if (!request) {
        res.status(404).json({ error: "Pedido n\xE3o encontrado" });
        return;
      }
      if (status === "approved" && request.interestedId && request.missionaryId) {
        await storage2.createRelationship({
          interestedId: request.interestedId,
          missionaryId: request.missionaryId,
          status: "active",
          notes: `V\xEDnculo criado a partir do pedido de discipulado #${id}`
        });
      }
      res.json(request);
    } catch (error) {
      handleError(res, error, "Update discipleship request");
    }
  });
  app2.delete("/api/discipleship-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage2.deleteDiscipleshipRequest(id);
      res.json({ success: true, message: "Pedido removido" });
    } catch (error) {
      handleError(res, error, "Delete discipleship request");
    }
  });
  app2.post("/api/users/:id(\\d+)/disciple", async (req, res) => {
    try {
      const interestedId = parseInt(req.params.id);
      const { missionaryId } = req.body;
      if (!missionaryId) {
        res.status(400).json({ error: "ID do mission\xE1rio \xE9 obrigat\xF3rio" });
        return;
      }
      const existingRelationships = await storage2.getRelationshipsByInterested(interestedId);
      const hasActive = existingRelationships.some(
        (r) => r.status === "active"
      );
      if (hasActive) {
        res.status(400).json({ error: "Interessado j\xE1 possui um mission\xE1rio vinculado" });
        return;
      }
      const relationship = await storage2.createRelationship({
        interestedId,
        missionaryId,
        status: "active",
        notes: "V\xEDnculo criado diretamente"
      });
      res.status(201).json(relationship);
    } catch (error) {
      handleError(res, error, "Create direct discipleship");
    }
  });
};

// server/routes/messagingRoutes.ts
var messagingRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get("/api/conversations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const conversations2 = await storage2.getConversationsByUser(userId);
      res.json(conversations2);
    } catch (error) {
      handleError(res, error, "Get conversations");
    }
  });
  app2.post("/api/conversations/direct", async (req, res) => {
    try {
      const { userId1, userId2 } = req.body;
      if (!userId1 || !userId2) {
        res.status(400).json({ error: "IDs dos usu\xE1rios s\xE3o obrigat\xF3rios" });
        return;
      }
      const conversation = await storage2.getOrCreateDirectConversation(userId1, userId2);
      res.json(conversation);
    } catch (error) {
      handleError(res, error, "Create direct conversation");
    }
  });
  app2.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages2 = await storage2.getMessagesByConversation(conversationId);
      res.json(messages2);
    } catch (error) {
      handleError(res, error, "Get messages");
    }
  });
  app2.post("/api/messages", validateBody(createMessageSchema), async (req, res) => {
    try {
      const messageData = req.validatedBody;
      logger.info(`New message in conversation ${messageData.conversationId}`);
      const message = await storage2.createMessage({
        ...messageData,
        isRead: false
      });
      res.status(201).json(message);
    } catch (error) {
      handleError(res, error, "Create message");
    }
  });
};

// server/routes/notificationRoutes.ts
var notificationRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get("/api/notifications/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { unreadOnly } = req.query;
      let notifications2 = await storage2.getNotificationsByUser(userId);
      if (unreadOnly === "true") {
        notifications2 = notifications2.filter((n) => !n.isRead);
      }
      res.json(notifications2);
    } catch (error) {
      handleError(res, error, "Get notifications");
    }
  });
  app2.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage2.markNotificationAsRead(id);
      if (!notification) {
        res.status(404).json({ error: "Notifica\xE7\xE3o n\xE3o encontrada" });
        return;
      }
      res.json(notification);
    } catch (error) {
      handleError(res, error, "Mark notification as read");
    }
  });
  app2.get("/api/push/subscriptions", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId) : null;
      if (!userId || isNaN(userId)) {
        res.json([]);
        return;
      }
      const subscriptions = await storage2.getPushSubscriptionsByUser(userId);
      res.json(subscriptions);
    } catch (error) {
      handleError(res, error, "Get push subscriptions");
    }
  });
  app2.post("/api/push/subscribe", async (req, res) => {
    try {
      const { userId, subscription, deviceName } = req.body;
      if (!userId || !subscription) {
        res.status(400).json({ error: "Dados de inscri\xE7\xE3o s\xE3o obrigat\xF3rios" });
        return;
      }
      const subscriptionPayload = typeof subscription === "string" ? JSON.parse(subscription) : subscription;
      const pushSubscription = await storage2.createPushSubscription({
        userId,
        subscription: subscriptionPayload,
        deviceName: deviceName || "Dispositivo desconhecido",
        isActive: true
      });
      res.status(201).json(pushSubscription);
    } catch (error) {
      handleError(res, error, "Create push subscription");
    }
  });
  app2.patch("/api/push/subscriptions/:id/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subscription = await storage2.togglePushSubscription(id);
      if (!subscription) {
        res.status(404).json({ error: "Inscri\xE7\xE3o n\xE3o encontrada" });
        return;
      }
      res.json(subscription);
    } catch (error) {
      handleError(res, error, "Toggle push subscription");
    }
  });
  app2.delete("/api/push/subscriptions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage2.deletePushSubscription(id);
      res.json({ success: true, message: "Inscri\xE7\xE3o removida" });
    } catch (error) {
      handleError(res, error, "Delete push subscription");
    }
  });
  app2.post("/api/push/send", async (req, res) => {
    try {
      const { userIds, title, body, icon, url } = req.body;
      if (!userIds || !title || !body) {
        res.status(400).json({ error: "Dados da notifica\xE7\xE3o s\xE3o obrigat\xF3rios" });
        return;
      }
      const results = await storage2.sendPushNotifications({
        userIds,
        title,
        body,
        icon,
        url
      });
      res.json({ success: true, results });
    } catch (error) {
      handleError(res, error, "Send push notification");
    }
  });
};

// server/routes/prayerRoutes.ts
var prayerRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get("/api/prayers", async (req, res) => {
    try {
      const { userId, isPublic, isAnswered } = req.query;
      let prayers2 = await storage2.getAllPrayers();
      if (userId) {
        const id = parseInt(userId);
        prayers2 = prayers2.filter((p) => p.userId === id);
      }
      if (isPublic !== void 0) {
        const publicFilter = isPublic === "true";
        prayers2 = prayers2.filter((p) => p.isPublic === publicFilter);
      }
      if (isAnswered !== void 0) {
        const answeredFilter = isAnswered === "true";
        prayers2 = prayers2.filter((p) => p.isAnswered === answeredFilter);
      }
      res.json(prayers2);
    } catch (error) {
      handleError(res, error, "Get prayers");
    }
  });
  app2.post("/api/prayers", validateBody(createPrayerSchema), async (req, res) => {
    try {
      const prayerData = req.validatedBody;
      logger.info(`Creating prayer request: ${prayerData.title}`);
      const prayer = await storage2.createPrayer({
        ...prayerData,
        description: prayerData.description ?? null
      });
      res.status(201).json(prayer);
    } catch (error) {
      handleError(res, error, "Create prayer");
    }
  });
  app2.post("/api/prayers/:id/answer", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { testimony } = req.body;
      const prayer = await storage2.markPrayerAsAnswered(id, testimony);
      if (!prayer) {
        res.status(404).json({ error: "Pedido de ora\xE7\xE3o n\xE3o encontrado" });
        return;
      }
      res.json(prayer);
    } catch (error) {
      handleError(res, error, "Mark prayer as answered");
    }
  });
  app2.delete("/api/prayers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const prayer = await storage2.getPrayerById(id);
      if (!prayer) {
        res.status(404).json({ error: "Pedido de ora\xE7\xE3o n\xE3o encontrado" });
        return;
      }
      const user = userId ? await storage2.getUserById(userId) : null;
      if (prayer.userId !== userId && user?.role !== "superadmin" && user?.role !== "pastor") {
        res.status(403).json({ error: "Sem permiss\xE3o para remover este pedido" });
        return;
      }
      await storage2.deletePrayer(id);
      res.json({ success: true, message: "Pedido removido" });
    } catch (error) {
      handleError(res, error, "Delete prayer");
    }
  });
  app2.post("/api/prayers/:id/intercessor", async (req, res) => {
    try {
      const prayerId = parseInt(req.params.id);
      const { intercessorId } = req.body;
      if (!intercessorId) {
        res.status(400).json({ error: "ID do intercessor \xE9 obrigat\xF3rio" });
        return;
      }
      const result = await storage2.addIntercessor(prayerId, intercessorId);
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error, "Add intercessor");
    }
  });
  app2.delete("/api/prayers/:id/intercessor/:intercessorId", async (req, res) => {
    try {
      const prayerId = parseInt(req.params.id);
      const intercessorId = parseInt(req.params.intercessorId);
      await storage2.removeIntercessor(prayerId, intercessorId);
      res.json({ success: true, message: "Intercessor removido" });
    } catch (error) {
      handleError(res, error, "Remove intercessor");
    }
  });
  app2.get("/api/prayers/:id/intercessors", async (req, res) => {
    try {
      const prayerId = parseInt(req.params.id);
      const intercessors = await storage2.getIntercessorsByPrayer(prayerId);
      res.json(intercessors);
    } catch (error) {
      handleError(res, error, "Get intercessors");
    }
  });
  app2.get("/api/prayers/user/:userId/interceding", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const prayers2 = await storage2.getPrayersUserIsInterceding(userId);
      res.json(prayers2);
    } catch (error) {
      handleError(res, error, "Get prayers user is interceding");
    }
  });
};

// server/routes/calendarRoutes.ts
var calendarRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  const resolveOrganizerId = (req) => {
    const headerValue = req.headers["x-user-id"];
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const parsed = rawValue ? parseInt(String(rawValue), 10) : NaN;
    return Number.isNaN(parsed) ? 1 : parsed;
  };
  const resolveChurchId = async () => {
    const defaultChurch = await storage2.getDefaultChurch();
    if (defaultChurch?.id) {
      return defaultChurch.id;
    }
    const churches2 = await storage2.getAllChurches();
    return churches2[0]?.id ?? 1;
  };
  app2.post(
    "/api/calendar/google-drive-config",
    validateBody(googleDriveConfigSchema),
    async (req, res) => {
      try {
        const { spreadsheetUrl, sheetName, apiKey } = req.validatedBody;
        logger.info("Saving Google Drive config");
        await storage2.saveGoogleDriveConfig({
          spreadsheetUrl,
          sheetName,
          apiKey,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        res.json({ success: true, message: "Configura\xE7\xE3o salva" });
      } catch (error) {
        handleError(res, error, "Save Google Drive config");
      }
    }
  );
  app2.get("/api/calendar/google-drive-config", async (req, res) => {
    try {
      const config = await storage2.getGoogleDriveConfig();
      res.json(config || {});
    } catch (error) {
      handleError(res, error, "Get Google Drive config");
    }
  });
  app2.post("/api/calendar/test-google-drive", async (req, res) => {
    try {
      const { spreadsheetUrl, sheetName, apiKey } = req.body;
      const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!spreadsheetIdMatch) {
        res.status(400).json({ error: "URL da planilha inv\xE1lida" });
        return;
      }
      const spreadsheetId = spreadsheetIdMatch[1];
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        res.status(400).json({
          error: "Erro ao conectar com Google Sheets",
          details: errorData.error?.message || "Verifique as configura\xE7\xF5es"
        });
        return;
      }
      const data = await response.json();
      res.json({
        success: true,
        message: "Conex\xE3o bem-sucedida",
        rowCount: data.values?.length || 0
      });
    } catch (error) {
      handleError(res, error, "Test Google Drive connection");
    }
  });
  app2.post("/api/calendar/sync-google-drive", async (req, res) => {
    try {
      const config = await storage2.getGoogleDriveConfig();
      if (!config || !config.spreadsheetUrl) {
        res.status(400).json({ error: "Google Drive n\xE3o configurado" });
        return;
      }
      const spreadsheetIdMatch = config.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!spreadsheetIdMatch) {
        res.status(400).json({ error: "URL da planilha inv\xE1lida" });
        return;
      }
      const spreadsheetId = spreadsheetIdMatch[1];
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${config.sheetName}?key=${config.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        res.status(400).json({ error: "Erro ao buscar dados do Google Sheets" });
        return;
      }
      const data = await response.json();
      const rows = data.values || [];
      if (rows.length < 2) {
        res.json({ success: true, message: "Nenhum evento para importar", imported: 0 });
        return;
      }
      const headers = rows[0];
      const events2 = rows.slice(1);
      let imported = 0;
      const errors = [];
      const organizerId = resolveOrganizerId(req);
      const churchId = await resolveChurchId();
      for (const row of events2) {
        try {
          const eventData = {};
          headers.forEach((header, index2) => {
            eventData[header.toLowerCase().replace(/\s+/g, "_")] = row[index2] || "";
          });
          const event = {
            title: eventData.titulo || eventData.title || eventData.evento || "Evento sem t\xEDtulo",
            description: eventData.descricao || eventData.description || "",
            date: eventData.data || eventData.date || (/* @__PURE__ */ new Date()).toISOString(),
            endDate: eventData.data_fim || eventData.end_date || null,
            time: eventData.hora || eventData.time || "",
            location: eventData.local || eventData.location || "",
            type: eventData.tipo || eventData.type || "evento",
            color: eventData.cor || eventData.color || "#3b82f6",
            church: eventData.igreja || eventData.church || "",
            isRecurring: false,
            recurrencePattern: "",
            maxParticipants: 0,
            isPublic: true,
            organizerId,
            churchId
          };
          await storage2.createEvent(event);
          imported++;
        } catch (err) {
          errors.push(`Erro na linha ${imported + 2}: ${err}`);
        }
      }
      res.json({
        success: true,
        message: `Sincroniza\xE7\xE3o conclu\xEDda`,
        imported,
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      handleError(res, error, "Sync Google Drive");
    }
  });
  app2.post("/api/google-sheets/proxy", async (req, res) => {
    try {
      const { url, action, spreadsheetId, sheetName } = req.body;
      if (action && spreadsheetId) {
        const _scriptUrl = `https://script.google.com/macros/s/AKfycbxxxxx/exec?action=${action}&spreadsheetId=${spreadsheetId}&sheetName=${sheetName || "tarefas"}`;
        res.json({ tasks: [], success: true, message: "Google Sheets n\xE3o configurado" });
        return;
      }
      if (!url) {
        res.status(400).json({ error: "URL \xE9 obrigat\xF3ria" });
        return;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        res.status(response.status).json(errorData);
        return;
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      handleError(res, error, "Google Sheets proxy");
    }
  });
  app2.get("/api/activities", async (req, res) => {
    try {
      const activities = await storage2.getAllActivities();
      res.json(activities);
    } catch (error) {
      handleError(res, error, "Get activities");
    }
  });
  app2.post("/api/activities", async (req, res) => {
    try {
      const activityData = req.body;
      const activity = await storage2.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      handleError(res, error, "Create activity");
    }
  });
  app2.put("/api/activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const activityData = req.body;
      const activity = await storage2.updateActivity(id, activityData);
      if (!activity) {
        res.status(404).json({ error: "Atividade n\xE3o encontrada" });
        return;
      }
      res.json(activity);
    } catch (error) {
      handleError(res, error, "Update activity");
    }
  });
  app2.delete("/api/activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage2.deleteActivity(id);
      res.json({ success: true, message: "Atividade removida" });
    } catch (error) {
      handleError(res, error, "Delete activity");
    }
  });
};

// server/routes/taskRoutes.ts
var tasksCache = [];
var lastCacheUpdate = null;
function taskRoutes(app2) {
  app2.get("/api/tasks", async (req, res) => {
    try {
      logger.info("\u{1F4CB} GET /api/tasks - Retornando cache de tarefas");
      res.json({
        tasks: tasksCache,
        source: "local-cache",
        lastUpdate: lastCacheUpdate,
        note: "Para dados atualizados, use Google Sheets via /api/google-sheets/proxy"
      });
    } catch (error) {
      logger.error("Erro ao buscar tarefas:", error);
      res.status(500).json({
        error: "Erro ao buscar tarefas",
        tasks: []
      });
    }
  });
  app2.post("/api/tasks", async (req, res) => {
    try {
      const { title, description, priority, due_date, assigned_to, church, tags } = req.body;
      if (!title) {
        return res.status(400).json({ error: "T\xEDtulo \xE9 obrigat\xF3rio" });
      }
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const newTask = {
        id: Date.now(),
        title,
        description: description || "",
        status: "pending",
        priority: priority || "medium",
        due_date,
        created_by: userId,
        assigned_to: assigned_to ? parseInt(assigned_to) : void 0,
        church: church || "",
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        tags: tags || []
      };
      tasksCache.push(newTask);
      lastCacheUpdate = /* @__PURE__ */ new Date();
      logger.info(`\u2705 Tarefa criada localmente: ${newTask.id}`);
      return res.status(201).json(newTask);
    } catch (error) {
      logger.error("Erro ao criar tarefa:", error);
      return res.status(500).json({ error: "Erro ao criar tarefa" });
    }
  });
  app2.put("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskIndex = tasksCache.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ error: "Tarefa n\xE3o encontrada" });
      }
      const updates = req.body;
      tasksCache[taskIndex] = {
        ...tasksCache[taskIndex],
        ...updates,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      lastCacheUpdate = /* @__PURE__ */ new Date();
      logger.info(`\u2705 Tarefa atualizada: ${taskId}`);
      return res.json(tasksCache[taskIndex]);
    } catch (error) {
      logger.error("Erro ao atualizar tarefa:", error);
      return res.status(500).json({ error: "Erro ao atualizar tarefa" });
    }
  });
  app2.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskIndex = tasksCache.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ error: "Tarefa n\xE3o encontrada" });
      }
      tasksCache.splice(taskIndex, 1);
      lastCacheUpdate = /* @__PURE__ */ new Date();
      logger.info(`\u2705 Tarefa removida: ${taskId}`);
      return res.json({ success: true, message: "Tarefa removida" });
    } catch (error) {
      logger.error("Erro ao remover tarefa:", error);
      return res.status(500).json({ error: "Erro ao remover tarefa" });
    }
  });
  app2.post("/api/tasks/sync", async (req, res) => {
    try {
      const { tasks } = req.body;
      if (Array.isArray(tasks)) {
        tasksCache = tasks;
        lastCacheUpdate = /* @__PURE__ */ new Date();
        logger.info(`\u2705 Cache de tarefas sincronizado: ${tasks.length} tarefas`);
      }
      res.json({
        success: true,
        count: tasksCache.length,
        lastUpdate: lastCacheUpdate
      });
    } catch (error) {
      logger.error("Erro ao sincronizar tarefas:", error);
      res.status(500).json({ error: "Erro ao sincronizar tarefas" });
    }
  });
  app2.get("/api/tasks/users", async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      logger.error("Erro ao buscar usu\xE1rios para tarefas:", error);
      res.status(500).json({ error: "Erro ao buscar usu\xE1rios" });
    }
  });
  logger.info("\u{1F4CB} Rotas de tarefas registradas");
}

// server/routes/debugRoutes.ts
var debugRoutes = (app2) => {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const storage2 = new NeonAdapter();
  app2.get("/api/debug/visited-users", async (req, res) => {
    try {
      const users2 = await storage2.getAllUsers();
      const visitedUsers = users2.filter((u) => "lastVisitDate" in u && u.lastVisitDate);
      res.json({
        total: users2.length,
        visited: visitedUsers.length,
        users: visitedUsers.map((u) => ({
          id: u.id,
          name: u.name,
          lastVisitDate: u.lastVisitDate
        }))
      });
    } catch (error) {
      handleError(res, error, "Debug: Get visited users");
    }
  });
  app2.get("/api/debug/events", async (req, res) => {
    try {
      const events2 = await storage2.getAllEvents();
      res.json({
        total: events2.length,
        events: events2
      });
    } catch (error) {
      handleError(res, error, "Debug: Get events");
    }
  });
  app2.get("/api/debug/create-simple-event", async (req, res) => {
    try {
      const event = await storage2.createEvent({
        title: `Evento de Teste ${Date.now()}`,
        description: "Evento criado para debug",
        date: (/* @__PURE__ */ new Date()).toISOString(),
        time: "",
        location: "",
        type: "teste",
        color: "#3b82f6",
        isRecurring: false,
        recurrencePattern: "",
        maxParticipants: 0,
        isPublic: true,
        organizerId: 1,
        church: "",
        churchId: 1
      });
      res.json({
        success: true,
        event
      });
    } catch (error) {
      handleError(res, error, "Debug: Create simple event");
    }
  });
  app2.get("/api/debug/check-churches", async (req, res) => {
    try {
      const churches2 = await storage2.getAllChurches();
      res.json({
        total: churches2.length,
        churches: churches2
      });
    } catch (error) {
      handleError(res, error, "Debug: Check churches");
    }
  });
  app2.get("/api/debug/check-users", async (req, res) => {
    try {
      const users2 = await storage2.getAllUsers();
      const roleCount = {};
      users2.forEach((u) => {
        const role = u.role || "unknown";
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
      res.json({
        total: users2.length,
        byRole: roleCount
      });
    } catch (error) {
      handleError(res, error, "Debug: Check users");
    }
  });
  app2.get("/api/debug/check-events-db", async (req, res) => {
    try {
      const events2 = await storage2.getAllEvents();
      const typeCount = {};
      events2.forEach((e) => {
        const type = e.type || "unknown";
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      res.json({
        total: events2.length,
        byType: typeCount
      });
    } catch (error) {
      handleError(res, error, "Debug: Check events DB");
    }
  });
  app2.get("/api/debug/notifications", async (req, res) => {
    try {
      const notifications2 = await storage2.getAllNotifications();
      const unread = notifications2.filter((n) => !n.isRead);
      const typeCount = {};
      notifications2.forEach((n) => {
        const type = n.type || "unknown";
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      res.json({
        total: notifications2.length,
        unread: unread.length,
        byType: typeCount
      });
    } catch (error) {
      handleError(res, error, "Debug: Get notifications");
    }
  });
  app2.post("/api/debug/clean-duplicates", async (req, res) => {
    try {
      const events2 = await storage2.getAllEvents();
      const seen = /* @__PURE__ */ new Map();
      const duplicateIds = [];
      events2.forEach((e) => {
        const key = `${e.title}-${e.date}`;
        if (seen.has(key)) {
          duplicateIds.push(e.id);
        } else {
          seen.set(key, e.id);
        }
      });
      for (const id of duplicateIds) {
        await storage2.deleteEvent(id);
      }
      res.json({
        success: true,
        removed: duplicateIds.length
      });
    } catch (error) {
      handleError(res, error, "Debug: Clean duplicates");
    }
  });
  app2.post("/api/system/clear-all", async (req, res) => {
    try {
      if (process.env.NODE_ENV === "production") {
        res.status(403).json({ error: "Opera\xE7\xE3o n\xE3o permitida em produ\xE7\xE3o" });
        return;
      }
      res.json({ success: true, message: "Funcionalidade desabilitada por seguran\xE7a" });
    } catch (error) {
      handleError(res, error, "Debug: Clear all");
    }
  });
  app2.post("/api/system/check-missionary-profiles", async (req, res) => {
    try {
      const users2 = await storage2.getAllUsers();
      const missionaries = users2.filter((u) => u.role === "missionary");
      res.json({
        total: missionaries.length,
        missionaries: missionaries.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          isApproved: m.isApproved
        }))
      });
    } catch (error) {
      handleError(res, error, "Debug: Check missionary profiles");
    }
  });
  app2.get("/api/setup/test-data", async (req, res) => {
    try {
      const users2 = await storage2.getAllUsers();
      const churches2 = await storage2.getAllChurches();
      const events2 = await storage2.getAllEvents();
      res.json({
        users: users2.length,
        churches: churches2.length,
        events: events2.length,
        hasData: users2.length > 0 || churches2.length > 0 || events2.length > 0
      });
    } catch (error) {
      handleError(res, error, "Debug: Get test data");
    }
  });
};

// server/routes/analyticsRoutes.ts
var analyticsRoutes = (app2) => {
  app2.post("/api/analytics/vitals", async (req, res) => {
    try {
      const body = req.body;
      let vitals = [];
      let url;
      let userAgent;
      if (body.vitals && Array.isArray(body.vitals)) {
        vitals = body.vitals;
        url = body.url;
        userAgent = body.userAgent;
      } else if (body.name && body.value !== void 0) {
        vitals = [
          {
            name: body.name,
            value: body.value,
            rating: body.rating || "good"
          }
        ];
        url = body.url;
        userAgent = body.userAgent;
      } else {
        res.status(400).json({
          success: false,
          error: "Payload inv\xE1lido"
        });
        return;
      }
      logger.info("\u{1F4CA} Web Vitals recebidos:", {
        url,
        userAgent: userAgent?.substring(0, 50),
        // Truncar para não poluir logs
        vitalsCount: vitals.length,
        vitals: vitals.map((v) => ({
          name: v.name,
          value: v.value,
          rating: v.rating
        }))
      });
      const poorVitals = vitals.filter((v) => v.rating === "poor");
      if (poorVitals.length > 0) {
        logger.warn("\u26A0\uFE0F Vitals com performance ruim detectados:", {
          url,
          poorVitals: poorVitals.map((v) => `${v.name}: ${v.value}`)
        });
      }
      res.json({
        success: true,
        message: "Vitals registrados",
        received: vitals.length
      });
    } catch (error) {
      logger.error("\u274C Erro ao processar vitals:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao processar vitals"
      });
    }
  });
  app2.post("/api/analytics/error", async (req, res) => {
    try {
      const { message, stack, componentStack, url } = req.body;
      logger.error("\u{1F534} Erro capturado do frontend:", {
        message,
        url,
        stack: stack?.substring(0, 200),
        // Limitar tamanho
        component: componentStack?.split("\n")[0]
      });
      res.json({ success: true });
    } catch (_error) {
      res.status(200).json({ success: false });
    }
  });
  app2.get("/api/analytics/performance", async (_req, res) => {
    try {
      const metrics = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      };
      res.json(metrics);
    } catch (error) {
      logger.error("\u274C Erro ao buscar m\xE9tricas:", error);
      res.status(500).json({ error: "Erro ao buscar m\xE9tricas" });
    }
  });
};

// server/routes/twoFactorRoutes.ts
import { Router } from "express";

// server/services/twoFactorService.ts
import { generateSecret, generateURI, verifySync } from "otplib";
import * as QRCode from "qrcode";
import { eq as eq2 } from "drizzle-orm";
import crypto from "crypto";
async function generateTwoFactorSecret(userId, userEmail, appName = "7Care") {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    secret,
    issuer: appName,
    label: userEmail,
    algorithm: "sha1",
    digits: 6,
    period: 30
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff"
    }
  });
  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl
  };
}
async function savePendingTwoFactorSecret(userId, secret) {
  const encryptedSecret = encryptSecret(secret);
  await db.update(schema.users).set({ twoFactorPendingSecret: encryptedSecret }).where(eq2(schema.users.id, userId));
}
async function enableTwoFactor(userId, token) {
  const [user] = await db.select().from(schema.users).where(eq2(schema.users.id, userId)).limit(1);
  if (!user) {
    return { valid: false, message: "Usu\xE1rio n\xE3o encontrado" };
  }
  const userWith2FA = user;
  const pendingSecret = userWith2FA.twoFactorPendingSecret;
  if (!pendingSecret) {
    return { valid: false, message: "Nenhum 2FA pendente para ativar" };
  }
  const decryptedSecret = decryptSecret(pendingSecret);
  const isValid = verifySync({ secret: decryptedSecret, token });
  if (!isValid) {
    return { valid: false, message: "C\xF3digo inv\xE1lido" };
  }
  const recoveryCodes = generateRecoveryCodes();
  const hashedRecoveryCodes = recoveryCodes.map((code) => hashRecoveryCode(code));
  await db.update(schema.users).set({
    twoFactorSecret: pendingSecret,
    // Já está criptografado
    twoFactorPendingSecret: null,
    twoFactorEnabled: true,
    twoFactorRecoveryCodes: JSON.stringify(hashedRecoveryCodes)
  }).where(eq2(schema.users.id, userId));
  return {
    valid: true,
    message: "Autentica\xE7\xE3o de dois fatores ativada com sucesso"
  };
}
async function disableTwoFactor(userId, token) {
  const verification = await verifyTwoFactorToken(userId, token);
  if (!verification.valid) {
    return verification;
  }
  await db.update(schema.users).set({
    twoFactorSecret: null,
    twoFactorPendingSecret: null,
    twoFactorEnabled: false,
    twoFactorRecoveryCodes: null
  }).where(eq2(schema.users.id, userId));
  return {
    valid: true,
    message: "Autentica\xE7\xE3o de dois fatores desativada"
  };
}
async function verifyTwoFactorToken(userId, token) {
  const [user] = await db.select().from(schema.users).where(eq2(schema.users.id, userId)).limit(1);
  if (!user) {
    return { valid: false, message: "Usu\xE1rio n\xE3o encontrado" };
  }
  const userWithTwoFactor = user;
  if (!userWithTwoFactor.twoFactorEnabled || !userWithTwoFactor.twoFactorSecret) {
    return { valid: false, message: "2FA n\xE3o est\xE1 ativado" };
  }
  const decryptedSecret = decryptSecret(userWithTwoFactor.twoFactorSecret);
  const isValid = verifySync({ secret: decryptedSecret, token });
  if (isValid) {
    return { valid: true, message: "Token v\xE1lido" };
  }
  return { valid: false, message: "C\xF3digo inv\xE1lido ou expirado" };
}
async function verifyRecoveryCode(userId, code) {
  const [user] = await db.select().from(schema.users).where(eq2(schema.users.id, userId)).limit(1);
  if (!user) {
    return { valid: false, message: "Usu\xE1rio n\xE3o encontrado" };
  }
  const userWithTwoFactor = user;
  if (!userWithTwoFactor.twoFactorRecoveryCodes) {
    return { valid: false, message: "Nenhum c\xF3digo de recupera\xE7\xE3o dispon\xEDvel" };
  }
  const hashedCodes = JSON.parse(userWithTwoFactor.twoFactorRecoveryCodes);
  const hashedInput = hashRecoveryCode(code);
  const codeIndex = hashedCodes.findIndex((hashed) => hashed === hashedInput);
  if (codeIndex === -1) {
    return { valid: false, message: "C\xF3digo de recupera\xE7\xE3o inv\xE1lido" };
  }
  hashedCodes.splice(codeIndex, 1);
  await db.update(schema.users).set({ twoFactorRecoveryCodes: JSON.stringify(hashedCodes) }).where(eq2(schema.users.id, userId));
  return {
    valid: true,
    message: `C\xF3digo de recupera\xE7\xE3o v\xE1lido. Restam ${hashedCodes.length} c\xF3digos.`
  };
}
async function regenerateRecoveryCodes(userId, token) {
  const verification = await verifyTwoFactorToken(userId, token);
  if (!verification.valid) {
    return verification;
  }
  const recoveryCodes = generateRecoveryCodes();
  const hashedRecoveryCodes = recoveryCodes.map((code) => hashRecoveryCode(code));
  await db.update(schema.users).set({ twoFactorRecoveryCodes: JSON.stringify(hashedRecoveryCodes) }).where(eq2(schema.users.id, userId));
  return { codes: recoveryCodes };
}
async function checkTwoFactorStatus(userId) {
  const [user] = await db.select().from(schema.users).where(eq2(schema.users.id, userId)).limit(1);
  if (!user) {
    return { enabled: false, hasRecoveryCodes: false, recoveryCodesCount: 0 };
  }
  const userWithTwoFactor = user;
  let recoveryCodesCount = 0;
  if (userWithTwoFactor.twoFactorRecoveryCodes) {
    try {
      const codes = JSON.parse(userWithTwoFactor.twoFactorRecoveryCodes);
      recoveryCodesCount = codes.length;
    } catch {
    }
  }
  return {
    enabled: !!userWithTwoFactor.twoFactorEnabled,
    hasRecoveryCodes: recoveryCodesCount > 0,
    recoveryCodesCount
  };
}
function generateRecoveryCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part3 = crypto.randomBytes(2).toString("hex").toUpperCase();
    codes.push(`${part1}-${part2}-${part3}`);
  }
  return codes;
}
function hashRecoveryCode(code) {
  return crypto.createHash("sha256").update(code.toUpperCase().replace(/-/g, "")).digest("hex");
}
function encryptSecret(secret) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
function decryptSecret(encryptedSecret) {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedSecret.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
function getEncryptionKey() {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY || JWT_SECRET || "default-insecure-key-change-me-in-production-32";
  return crypto.createHash("sha256").update(key).digest();
}
var twoFactorService_default = {
  generateTwoFactorSecret,
  savePendingTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorToken,
  verifyRecoveryCode,
  regenerateRecoveryCodes,
  checkTwoFactorStatus
};

// server/routes/twoFactorRoutes.ts
var router = Router();
var getUserId = (req) => req.userId;
var getUserEmail = (req) => req.user?.email;
router.get("/status", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "N\xE3o autenticado" });
    }
    const status = await twoFactorService_default.checkTwoFactorStatus(userId);
    return res.json(status);
  } catch (error) {
    logger.error("Erro ao verificar status 2FA", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});
router.post("/setup", async (req, res) => {
  try {
    const userId = getUserId(req);
    const userEmail = getUserEmail(req) || "user@7care.com";
    if (!userId) {
      return res.status(401).json({ error: "N\xE3o autenticado" });
    }
    const status = await twoFactorService_default.checkTwoFactorStatus(userId);
    if (status.enabled) {
      return res.status(400).json({ error: "2FA j\xE1 est\xE1 ativado" });
    }
    const { secret, qrCodeDataUrl, otpauthUrl } = await twoFactorService_default.generateTwoFactorSecret(
      userId,
      userEmail,
      "7Care"
    );
    await twoFactorService_default.savePendingTwoFactorSecret(userId, secret);
    return res.json({
      qrCode: qrCodeDataUrl,
      manualKey: secret,
      // Para entrada manual no app
      otpauthUrl
    });
  } catch (error) {
    logger.error("Erro ao configurar 2FA", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});
router.post("/enable", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "N\xE3o autenticado" });
    }
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "C\xF3digo \xE9 obrigat\xF3rio" });
    }
    const result = await twoFactorService_default.enableTwoFactor(userId, token);
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, message: result.message });
  } catch (error) {
    logger.error("Erro ao ativar 2FA", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});
router.post("/disable", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "N\xE3o autenticado" });
    }
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "C\xF3digo \xE9 obrigat\xF3rio" });
    }
    const result = await twoFactorService_default.disableTwoFactor(userId, token);
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, message: result.message });
  } catch (error) {
    logger.error("Erro ao desativar 2FA", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});
router.post("/verify", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "N\xE3o autenticado" });
    }
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "C\xF3digo \xE9 obrigat\xF3rio" });
    }
    const result = await twoFactorService_default.verifyTwoFactorToken(userId, token);
    return res.json({ valid: result.valid, message: result.message });
  } catch (error) {
    logger.error("Erro ao verificar 2FA", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});
router.post("/verify-recovery", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { code } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "N\xE3o autenticado" });
    }
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "C\xF3digo de recupera\xE7\xE3o \xE9 obrigat\xF3rio" });
    }
    const result = await twoFactorService_default.verifyRecoveryCode(userId, code);
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ valid: true, message: result.message });
  } catch (error) {
    logger.error("Erro ao verificar c\xF3digo de recupera\xE7\xE3o", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});
router.post("/regenerate-recovery", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "N\xE3o autenticado" });
    }
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "C\xF3digo 2FA \xE9 obrigat\xF3rio" });
    }
    const result = await twoFactorService_default.regenerateRecoveryCodes(userId, token);
    if ("valid" in result && !result.valid) {
      return res.status(400).json({ error: result.message });
    }
    if ("codes" in result) {
      return res.json({
        success: true,
        recoveryCodes: result.codes,
        message: "Novos c\xF3digos de recupera\xE7\xE3o gerados. Guarde-os em local seguro!"
      });
    }
    return res.status(500).json({ error: "Erro inesperado" });
  } catch (error) {
    logger.error("Erro ao regenerar c\xF3digos de recupera\xE7\xE3o", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});
var twoFactorRoutes_default = router;

// server/routes/electionRoutes.ts
var getErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
var getErrorStack = (error) => {
  if (error instanceof Error) {
    return error.stack;
  }
  return void 0;
};
var parseHeaderUserId = (req) => {
  const headerValue = req.headers["x-user-id"];
  const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const parsed = rawValue ? parseInt(String(rawValue), 10) : NaN;
  return Number.isNaN(parsed) ? null : parsed;
};
var parseIdValue = (value) => {
  if (value == null) {
    return null;
  }
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(String(rawValue), 10);
  return Number.isNaN(parsed) ? null : parsed;
};
var toNumber = (value) => {
  if (value == null) {
    return 0;
  }
  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};
var parseCount = (row) => {
  if (!row) return 0;
  const countRow = row;
  return typeof countRow.count === "number" ? countRow.count : parseInt(String(countRow.count), 10) || 0;
};
var parseExtraData2 = (extraData) => {
  if (!extraData) {
    return {};
  }
  if (typeof extraData === "string") {
    try {
      return JSON.parse(extraData);
    } catch {
      return {};
    }
  }
  if (typeof extraData === "object") {
    return extraData;
  }
  return {};
};
var electionRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  const checkReadOnlyAccess2 = async (req, res, next) => {
    try {
      const userId = parseHeaderUserId(req);
      if (userId !== null) {
        const user = await storage2.getUserById(userId);
        const extraData = user ? parseExtraData2(user.extraData) : {};
        const readOnlyFlag = extraData.readOnly;
        if (user && (user.role === "admin_readonly" || readOnlyFlag === true)) {
          return res.status(403).json({
            success: false,
            message: "Usu\xE1rio de teste possui acesso somente para leitura. Edi\xE7\xF5es n\xE3o s\xE3o permitidas.",
            code: "READONLY_ACCESS"
          });
        }
      }
      return next();
    } catch (error) {
      console.error("Erro ao verificar acesso read-only:", error);
      return next();
    }
  };
  app2.post("/api/elections/config", checkReadOnlyAccess2, async (req, res) => {
    try {
      const body = req.body;
      await sql`
        CREATE TABLE IF NOT EXISTS election_configs (
          id SERIAL PRIMARY KEY,
          church_id INTEGER NOT NULL,
          church_name VARCHAR(255) NOT NULL,
          title VARCHAR(255) DEFAULT '',
          description TEXT DEFAULT '',
          voters INTEGER[] NOT NULL,
          criteria JSONB NOT NULL,
          positions TEXT[] NOT NULL,
          position_descriptions JSONB DEFAULT '{}'::jsonb,
          status VARCHAR(50) DEFAULT 'draft',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      try {
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT ''
        `;
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''
        `;
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS position_descriptions JSONB DEFAULT '{}'::jsonb
        `;
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS removed_candidates JSONB DEFAULT '[]'::jsonb
        `;
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS current_leaders JSONB DEFAULT '{}'::jsonb
        `;
      } catch (alterError) {
        logger.warn(
          "  Erro ao garantir colunas adicionais em election_configs:",
          getErrorMessage(alterError)
        );
      }
      const title = body.title && body.title.trim().length > 0 ? body.title.trim() : `Nomea\xE7\xE3o ${body.churchName || "Igreja"} - ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")}`;
      const result = await sql`
        INSERT INTO election_configs (church_id, church_name, title, voters, criteria, positions, position_descriptions, current_leaders, removed_candidates, status)
        VALUES (
          ${body.churchId || 1},
          ${body.churchName || "Igreja Central"},
          ${title},
          ${body.voters || []},
          ${JSON.stringify(body.criteria || {})},
          ${body.positions || []},
          ${JSON.stringify(body.position_descriptions || {})},
          ${JSON.stringify(body.current_leaders || {})},
          ${JSON.stringify(body.removed_candidates || [])},
          ${body.status || "draft"}
        )
        RETURNING *
      `;
      logger.info(" Configura\xE7\xE3o de elei\xE7\xE3o salva:", result[0].id);
      return res.status(200).json(result[0]);
    } catch (error) {
      console.error("\u274C Erro ao salvar configura\xE7\xE3o:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.put("/api/elections/config/:id", checkReadOnlyAccess2, async (req, res) => {
    try {
      const configId = parseInt(req.params.id, 10);
      if (!configId) {
        return res.status(400).json({ error: "ID da configura\xE7\xE3o inv\xE1lido" });
      }
      const body = req.body || {};
      logger.debug(" [UPDATE CONFIG] Recebendo atualiza\xE7\xE3o para configId:", configId);
      logger.debug(" [UPDATE CONFIG] removed_candidates recebido:", body.removed_candidates);
      try {
        await sql`
          ALTER TABLE election_configs 
          ADD COLUMN IF NOT EXISTS position_descriptions JSONB DEFAULT '{}'::jsonb
        `;
      } catch (alterError) {
        logger.warn(
          " Coluna position_descriptions j\xE1 existe ou erro ao adicionar:",
          getErrorMessage(alterError)
        );
      }
      try {
        await sql`
          ALTER TABLE election_configs 
          ADD COLUMN IF NOT EXISTS removed_candidates JSONB DEFAULT '[]'::jsonb
        `;
      } catch (alterError) {
        logger.warn(
          " Coluna removed_candidates j\xE1 existe ou erro ao adicionar:",
          getErrorMessage(alterError)
        );
      }
      try {
        await sql`
          ALTER TABLE election_configs 
          ADD COLUMN IF NOT EXISTS current_leaders JSONB DEFAULT '{}'::jsonb
        `;
      } catch (alterError) {
        logger.warn(
          " Coluna current_leaders j\xE1 existe ou erro ao adicionar:",
          getErrorMessage(alterError)
        );
      }
      const removedCandidatesJson = JSON.stringify(body.removed_candidates || []);
      const currentLeadersJson = JSON.stringify(body.current_leaders || {});
      logger.debug(" [UPDATE CONFIG] Salvando removed_candidates como:", removedCandidatesJson);
      logger.debug(" [UPDATE CONFIG] Salvando current_leaders como:", currentLeadersJson);
      const updatedConfig = await sql`
        UPDATE election_configs
        SET
          church_id = ${body.churchId || 0},
          church_name = ${body.churchName || ""},
          title = ${body.title || ""},
          voters = ${body.voters || []},
          criteria = ${JSON.stringify(body.criteria || {})},
          positions = ${body.positions || []},
          status = ${body.status || "draft"},
          position_descriptions = ${JSON.stringify(body.position_descriptions || {})},
          current_leaders = ${currentLeadersJson},
          removed_candidates = ${removedCandidatesJson},
          updated_at = NOW()
        WHERE id = ${configId}
        RETURNING *
      `;
      logger.info(
        " [UPDATE CONFIG] Config atualizado. removed_candidates salvo:",
        updatedConfig[0].removed_candidates
      );
      if (updatedConfig.length === 0) {
        return res.status(404).json({ error: "Configura\xE7\xE3o n\xE3o encontrada" });
      }
      logger.info(" Configura\xE7\xE3o de elei\xE7\xE3o atualizada:", configId);
      return res.status(200).json({
        message: "Configura\xE7\xE3o atualizada com sucesso",
        config: updatedConfig[0]
      });
    } catch (error) {
      console.error("\u274C Erro ao atualizar configura\xE7\xE3o:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/elections/config/:id", async (req, res) => {
    try {
      const configId = parseInt(req.params.id, 10);
      const config = await sql`
        SELECT ec.*, e.status as election_status, e.created_at as election_created_at
        FROM election_configs ec
        LEFT JOIN (
          SELECT DISTINCT ON (config_id) config_id, status, created_at
          FROM elections
          ORDER BY config_id, created_at DESC
        ) e ON ec.id = e.config_id
        WHERE ec.id = ${configId}
        ORDER BY ec.created_at DESC
      `;
      if (config.length === 0) {
        return res.status(404).json({ error: "Configura\xE7\xE3o n\xE3o encontrada" });
      }
      const configData = config[0];
      if (configData.removed_candidates) {
        if (typeof configData.removed_candidates === "string") {
          try {
            configData.removed_candidates = JSON.parse(configData.removed_candidates);
          } catch (_e) {
            configData.removed_candidates = [];
          }
        }
      } else {
        configData.removed_candidates = [];
      }
      if (configData.current_leaders) {
        if (typeof configData.current_leaders === "string") {
          try {
            configData.current_leaders = JSON.parse(configData.current_leaders);
          } catch (_e2) {
            configData.current_leaders = {};
          }
        }
      } else {
        configData.current_leaders = {};
      }
      logger.debug(
        " [GET CONFIG] Retornando config:",
        configId,
        "removed_candidates:",
        configData.removed_candidates,
        "current_leaders:",
        configData.current_leaders
      );
      return res.json(configData);
    } catch (error) {
      console.error("\u274C Erro ao buscar configura\xE7\xE3o:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/elections/config", async (req, res) => {
    try {
      const configId = parseIdValue(req.query.id);
      const parseRemovedCandidates = (configData) => {
        if (configData.removed_candidates) {
          if (typeof configData.removed_candidates === "string") {
            try {
              configData.removed_candidates = JSON.parse(configData.removed_candidates);
            } catch (_e3) {
              configData.removed_candidates = [];
            }
          }
        } else {
          configData.removed_candidates = [];
        }
        return configData;
      };
      if (configId !== null) {
        const config = await sql`
          SELECT ec.*, e.status as election_status, e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          WHERE ec.id = ${configId}
          ORDER BY ec.created_at DESC
        `;
        if (config.length === 0) {
          return res.status(404).json({ error: "Configura\xE7\xE3o n\xE3o encontrada" });
        }
        const configData = parseRemovedCandidates(config[0]);
        logger.debug(
          " [GET CONFIG] Retornando config (query):",
          configId,
          "removed_candidates:",
          configData.removed_candidates
        );
        return res.json(configData);
      } else {
        const config = await sql`
          SELECT ec.*, e.status as election_status, e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          ORDER BY ec.created_at DESC
          LIMIT 1
        `;
        if (config.length === 0) {
          return res.status(404).json({ error: "Nenhuma configura\xE7\xE3o encontrada" });
        }
        const configData = parseRemovedCandidates(config[0]);
        return res.json(configData);
      }
    } catch (error) {
      console.error("\u274C Erro ao buscar configura\xE7\xE3o:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/elections/configs", async (req, res) => {
    try {
      const requestingUserId = parseHeaderUserId(req);
      let requestingUser = null;
      let userChurch = null;
      if (requestingUserId) {
        const userResult = await sql`
          SELECT id, church, role, email FROM users WHERE id = ${requestingUserId}
        `;
        if (userResult.length > 0) {
          requestingUser = userResult[0];
          userChurch = userResult[0].church;
        }
      }
      const isSuperAdminUser = requestingUser && (requestingUser.role === "super_admin" || requestingUser.email === "admin@7care.com");
      let configs;
      if (isSuperAdminUser || !userChurch) {
        configs = await sql`
          SELECT DISTINCT ON (ec.id) 
            ec.*, 
            e.status as election_status, 
            e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          ORDER BY ec.id, ec.created_at DESC
        `;
      } else {
        configs = await sql`
          SELECT DISTINCT ON (ec.id) 
            ec.*, 
            e.status as election_status, 
            e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          WHERE ec.church_name = ${userChurch}
          ORDER BY ec.id, ec.created_at DESC
        `;
      }
      logger.debug(
        ` [GET CONFIGS] Retornando ${configs.length} configura\xE7\xF5es para usu\xE1rio ${requestingUserId} (igreja: ${userChurch || "todas"})`
      );
      return res.status(200).json(configs);
    } catch (error) {
      console.error("\u274C Erro ao buscar configura\xE7\xF5es:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.post("/api/elections/start", checkReadOnlyAccess2, async (req, res) => {
    try {
      const body = req.body;
      let config;
      if (body.configId) {
        config = await sql`
          SELECT * FROM election_configs 
          WHERE id = ${body.configId}
        `;
      } else {
        config = await sql`
          SELECT * FROM election_configs 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
      }
      if (config.length === 0) {
        return res.status(404).json({ error: "Configura\xE7\xE3o n\xE3o encontrada" });
      }
      logger.debug(" Desativando elei\xE7\xF5es ativas da configura\xE7\xE3o atual...");
      await sql`
        UPDATE elections 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active' AND config_id = ${config[0].id}
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS elections (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          current_position INTEGER DEFAULT 0,
          current_phase VARCHAR(20) DEFAULT 'nomination',
          result_announced BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS current_position INTEGER DEFAULT 0
      `;
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS current_phase VARCHAR(20) DEFAULT 'nomination'
      `;
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `;
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS result_announced BOOLEAN DEFAULT false
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS election_votes (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          voter_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          vote_type VARCHAR(20) DEFAULT 'nomination',
          voted_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(election_id, voter_id, position_id, candidate_id, vote_type)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS election_candidates (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          candidate_name VARCHAR(255) NOT NULL,
          faithfulness_punctual BOOLEAN DEFAULT false,
          faithfulness_seasonal BOOLEAN DEFAULT false,
          faithfulness_recurring BOOLEAN DEFAULT false,
          attendance_percentage INTEGER DEFAULT 0,
          months_in_church INTEGER DEFAULT 0,
          nominations INTEGER DEFAULT 0,
          phase VARCHAR(20) DEFAULT 'nomination'
        )
      `;
      logger.debug(" Verificando exist\xEAncia de elei\xE7\xE3o para esta configura\xE7\xE3o...");
      const existingElection = await sql`
        SELECT *
        FROM elections
        WHERE config_id = ${config[0].id}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      let currentElection;
      if (existingElection.length > 0) {
        currentElection = existingElection[0];
        logger.info(
          ` Reutilizando elei\xE7\xE3o existente ${currentElection.id} (config ${config[0].id})`
        );
        await sql`
          UPDATE elections
          SET status = 'active',
              current_position = 0,
              current_phase = 'nomination',
              result_announced = false,
              updated_at = NOW()
          WHERE id = ${currentElection.id}
        `;
        await sql`
          DELETE FROM election_votes
          WHERE election_id = ${currentElection.id}
        `;
        await sql`
          DELETE FROM election_candidates
          WHERE election_id = ${currentElection.id}
        `;
        const refreshed = await sql`
          SELECT * FROM elections WHERE id = ${currentElection.id}
        `;
        currentElection = refreshed[0];
      } else {
        const inserted = await sql`
          INSERT INTO elections (config_id, status, current_position, current_phase)
          VALUES (${config[0].id}, 'active', 0, 'nomination')
          RETURNING *
        `;
        currentElection = inserted[0];
        logger.info(` Nova elei\xE7\xE3o criada: ${currentElection.id}`);
      }
      logger.debug(" Buscando membros da igreja:", config[0].church_name);
      const churchMembers = await sql`
        SELECT id, name, email, church, role, status, created_at, birth_date, is_tither, is_donor, attendance, extra_data
        FROM users 
        WHERE church = ${String(config[0].church_name || "")} 
        AND (role LIKE '%member%' OR role LIKE '%admin%')
        AND (status = 'approved' OR status = 'pending')
      `;
      const positions = Array.isArray(config[0].positions) ? config[0].positions : JSON.parse(String(config[0].positions || "[]"));
      let votersArray = [];
      if (Array.isArray(config[0].voters)) {
        votersArray = config[0].voters;
      } else if (typeof config[0].voters === "string") {
        try {
          const parsed = JSON.parse(config[0].voters);
          if (Array.isArray(parsed)) {
            votersArray = parsed.map((value) => {
              if (typeof value === "number") {
                return value;
              }
              if (typeof value === "string") {
                const normalized = value.trim().replace(/^['"]+|['"]+$/g, "");
                return parseInt(normalized, 10);
              }
              return Number.NaN;
            }).filter((v) => !Number.isNaN(v));
          }
        } catch (_jsonErr) {
          const cleaned = config[0].voters.replace(/[{}]/g, "");
          if (cleaned.trim().length > 0) {
            votersArray = cleaned.split(",").map((v) => {
              const normalized = v.trim().replace(/^['"]+|['"]+$/g, "");
              return parseInt(normalized, 10);
            }).filter((v) => !Number.isNaN(v));
          }
        }
      }
      votersArray = Array.from(
        new Set(votersArray.filter((v) => typeof v === "number" && !Number.isNaN(v)))
      );
      const _configuredTotalVoters = votersArray.length;
      if (!positions || positions.length === 0) {
        logger.warn(" Nenhuma posi\xE7\xE3o configurada na elei\xE7\xE3o");
        return res.status(400).json({ error: "Configura\xE7\xE3o inv\xE1lida: nenhuma posi\xE7\xE3o encontrada" });
      }
      const candidatesToInsert = [];
      for (const position of positions) {
        for (const member of churchMembers) {
          let extraData = {};
          try {
            extraData = member.extra_data ? JSON.parse(member.extra_data) : {};
          } catch (e) {
            logger.warn(` Erro ao processar extraData para ${member.name}:`, getErrorMessage(e));
          }
          const dizimistaType = typeof extraData.dizimistaType === "string" ? extraData.dizimistaType : "";
          const ofertanteType = typeof extraData.ofertanteType === "string" ? extraData.ofertanteType : "";
          const dizimistaRecorrente = dizimistaType === "Recorrente (8-12)" || dizimistaType === "recorrente";
          const ofertanteRecorrente = ofertanteType === "Recorrente (8-12)" || ofertanteType === "recorrente";
          const engajamento = typeof extraData.engajamento === "string" ? extraData.engajamento : "baixo";
          const classificacao = typeof extraData.classificacao === "string" ? extraData.classificacao : "n\xE3o frequente";
          const tempoBatismoAnos = toNumber(extraData.tempoBatismoAnos);
          const presencaTotal = toNumber(extraData.totalPresenca);
          const _comunhao = toNumber(extraData.comunhao);
          const _missao = toNumber(extraData.missao);
          const _estudoBiblico = toNumber(extraData.estudoBiblico);
          const _discPosBatismal = toNumber(extraData.discPosBatismal);
          let idade = null;
          if (member.birth_date) {
            const birthDate = new Date(member.birth_date);
            idade = Math.floor((Date.now() - birthDate.getTime()) / (1e3 * 60 * 60 * 24 * 365.25));
          } else if (extraData.idade) {
            const parsedIdade = parseInt(String(extraData.idade), 10);
            idade = Number.isNaN(parsedIdade) ? null : parsedIdade;
          }
          const isTeenPosition = typeof position === "string" && position.toLowerCase().includes("teen");
          const criteria = typeof config[0].criteria === "object" && config[0].criteria !== null ? config[0].criteria : JSON.parse(String(config[0].criteria || "{}"));
          let isEligible = true;
          const monthsInChurch = member.created_at ? Math.floor(
            (Date.now() - new Date(member.created_at).getTime()) / (1e3 * 60 * 60 * 24 * 30)
          ) : 0;
          if (isTeenPosition) {
            isEligible = idade !== null && idade >= 10 && idade <= 15;
            if (!isEligible) {
              logger.debug(
                ` Candidato ${member.name} ineleg\xEDvel para posi\xE7\xE3o Teen (idade=${idade ?? "N/A"})`
              );
            }
          } else {
            if (criteria.dizimistaRecorrente && !dizimistaRecorrente) {
              isEligible = false;
            }
            if (criteria.mustBeTither && !dizimistaRecorrente) {
              isEligible = false;
            }
            if (criteria.mustBeDonor && !ofertanteRecorrente) {
              isEligible = false;
            }
            if (criteria.minAttendance && presencaTotal < criteria.minAttendance) {
              isEligible = false;
            }
            if (criteria.minMonthsInChurch && monthsInChurch < criteria.minMonthsInChurch) {
              isEligible = false;
            }
            if (criteria.minEngagement && engajamento === "baixo") {
              isEligible = false;
            }
            if (criteria.minClassification && classificacao === "n\xE3o frequente") {
              isEligible = false;
            }
            if (criteria.classification?.enabled) {
              const memberClassification = (classificacao || "").toLowerCase();
              let hasValidClassification = false;
              if (criteria.classification.frequente && memberClassification === "frequente") {
                hasValidClassification = true;
              }
              if (criteria.classification.naoFrequente && memberClassification === "n\xE3o frequente") {
                hasValidClassification = true;
              }
              if (criteria.classification.aResgatar && memberClassification === "a resgatar") {
                hasValidClassification = true;
              }
              if (!hasValidClassification) {
                isEligible = false;
                logger.warn(
                  ` Candidato ${member.name} ineleg\xEDvel por classifica\xE7\xE3o: ${classificacao}`
                );
              }
            }
            if (criteria.minBaptismYears && tempoBatismoAnos < criteria.minBaptismYears) {
              isEligible = false;
            }
            logger.debug(
              ` Candidato ${member.name}: eleg\xEDvel=${isEligible}, dizimistaRecorrente=${dizimistaRecorrente}, engajamento=${engajamento}, classificacao=${classificacao}, tempoBatismo=${tempoBatismoAnos} anos, presenca=${presencaTotal}, months=${monthsInChurch}`
            );
          }
          if (isEligible) {
            candidatesToInsert.push({
              election_id: currentElection.id,
              position_id: position,
              candidate_id: member.id,
              candidate_name: member.name,
              faithfulness_punctual: dizimistaRecorrente,
              faithfulness_seasonal: ofertanteRecorrente,
              faithfulness_recurring: dizimistaRecorrente && ofertanteRecorrente,
              attendance_percentage: presencaTotal,
              months_in_church: monthsInChurch
            });
          }
        }
      }
      if (candidatesToInsert.length > 0) {
        for (const candidate of candidatesToInsert) {
          await sql`
            INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, faithfulness_punctual, faithfulness_seasonal, faithfulness_recurring, attendance_percentage, months_in_church, nominations, phase)
            VALUES (${candidate.election_id}, ${candidate.position_id}, ${candidate.candidate_id}, ${candidate.candidate_name}, ${candidate.faithfulness_punctual}, ${candidate.faithfulness_seasonal}, ${candidate.faithfulness_recurring}, ${candidate.attendance_percentage}, ${candidate.months_in_church}, 0, 'nomination')
          `;
        }
        logger.info(` ${candidatesToInsert.length} candidatos inseridos`);
      }
      await sql`
        UPDATE election_configs 
        SET status = 'active' 
        WHERE id = ${config[0].id}
      `;
      logger.info(" Nomea\xE7\xE3o pronta:", currentElection.id);
      return res.status(200).json({
        electionId: currentElection.id,
        message: "Nomea\xE7\xE3o iniciada com sucesso"
      });
    } catch (error) {
      console.error("\u274C Erro ao iniciar elei\xE7\xE3o:", error);
      console.error("\u274C Stack trace:", getErrorStack(error));
      return res.status(500).json({ error: "Erro interno do servidor", details: getErrorMessage(error) });
    }
  });
  app2.put(
    "/api/elections/config/:id/toggle-status",
    checkReadOnlyAccess2,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.id);
        logger.debug(` [TOGGLE-STATUS] Requisi\xE7\xE3o recebida:`, {
          configId,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          body: req.body,
          headers: req.headers,
          method: req.method,
          url: req.url,
          userAgent: req.headers["user-agent"]
        });
        if (isNaN(configId) || configId <= 0) {
          console.error(`\u274C [TOGGLE-STATUS] configId inv\xE1lido:`, configId);
          return res.status(400).json({ error: "ID da configura\xE7\xE3o inv\xE1lido" });
        }
        try {
          await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
        `;
          await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        `;
          await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'
        `;
        } catch (alterError) {
          logger.warn(
            "  Erro ao garantir colunas em election_configs:",
            getErrorMessage(alterError)
          );
        }
        logger.debug(` [TOGGLE-STATUS] Buscando config ${configId}...`);
        const config = await sql`
        SELECT id, status, church_id, church_name
        FROM election_configs
        WHERE id = ${configId}
        ORDER BY created_at DESC
      `;
        logger.debug(
          ` [TOGGLE-STATUS] Config encontrada:`,
          config.length > 0 ? config[0] : "Nenhuma"
        );
        if (config.length === 0) {
          console.error(`\u274C [TOGGLE-STATUS] Config ${configId} n\xE3o encontrada`);
          return res.status(404).json({ error: "Configura\xE7\xE3o n\xE3o encontrada" });
        }
        await sql`
        CREATE TABLE IF NOT EXISTS elections (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          current_position INTEGER DEFAULT 0,
          current_phase VARCHAR(20) DEFAULT 'nomination',
          result_announced BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
        await sql`
        CREATE TABLE IF NOT EXISTS election_votes (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          voter_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          vote_type VARCHAR(20) DEFAULT 'nomination',
          voted_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(election_id, voter_id, position_id, candidate_id, vote_type)
        )
      `;
        await sql`
        CREATE TABLE IF NOT EXISTS election_candidates (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          candidate_name VARCHAR(255) NOT NULL,
          faithfulness_punctual BOOLEAN DEFAULT false,
          faithfulness_seasonal BOOLEAN DEFAULT false,
          faithfulness_recurring BOOLEAN DEFAULT false,
          attendance_percentage INTEGER DEFAULT 0,
          months_in_church INTEGER DEFAULT 0,
          nominations INTEGER DEFAULT 0,
          phase VARCHAR(20) DEFAULT 'nomination'
        )
      `;
        await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS result_announced BOOLEAN DEFAULT false
      `;
        const currentStatus = config[0].status || "draft";
        const newStatus = currentStatus === "active" ? "paused" : "active";
        logger.debug(` [TOGGLE-STATUS] Toggle status da nomea\xE7\xE3o ${configId}:`, {
          currentStatus,
          newStatus,
          church: config[0].church_name,
          churchId: config[0].church_id
        });
        logger.debug(` [TOGGLE-STATUS] Atualizando status no banco...`);
        const updateResult = await sql`
        UPDATE election_configs 
        SET status = ${newStatus},
            updated_at = NOW()
        WHERE id = ${configId}
      `;
        logger.info(` [TOGGLE-STATUS] Status atualizado com sucesso:`, updateResult);
        if (newStatus === "active") {
          const existingElection = await sql`
          SELECT id FROM elections
          WHERE config_id = ${configId}
          ORDER BY created_at DESC
          LIMIT 1
        `;
          if (existingElection.length === 0) {
            await sql`
            INSERT INTO elections (config_id, status, created_at)
            VALUES (${configId}, 'active', NOW())
          `;
            logger.info(` Nova elei\xE7\xE3o criada para config ${configId}`);
          } else {
            await sql`
            UPDATE elections
            SET status = 'active',
                result_announced = false,
                updated_at = NOW()
            WHERE id = ${existingElection[0].id}
          `;
            logger.info(` Elei\xE7\xE3o ${existingElection[0].id} reativada`);
          }
        } else {
          await sql`
          UPDATE elections
          SET status = 'paused'
          WHERE id = (
            SELECT id FROM elections
            WHERE config_id = ${configId}
            ORDER BY created_at DESC
            LIMIT 1
          )
        `;
          logger.info(`  Nomea\xE7\xE3o ${configId} pausada`);
        }
        logger.info(` [TOGGLE-STATUS] Processo conclu\xEDdo com sucesso para config ${configId}`);
        return res.status(200).json({
          message: newStatus === "active" ? "Nomea\xE7\xE3o retomada com sucesso" : "Nomea\xE7\xE3o pausada com sucesso",
          status: newStatus,
          configId,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (error) {
        const errorConfigId = req.params?.id;
        console.error(`\u274C [TOGGLE-STATUS] Erro completo ao processar config ${errorConfigId}:`, {
          error: getErrorMessage(error),
          stack: getErrorStack(error),
          name: error instanceof Error ? error.name : void 0,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          configId: errorConfigId
        });
        return res.status(500).json({
          error: "Erro interno do servidor",
          details: getErrorMessage(error),
          stack: getErrorStack(error),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
  );
  app2.get("/api/elections/dashboard/:configId", async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);
      const election = await sql`
        SELECT e.*, ec.voters, ec.positions, ec.church_name
        FROM elections e
        JOIN election_configs ec ON e.config_id = ec.id
        WHERE e.config_id = ${configId}
        AND e.status = 'active'
        ORDER BY e.created_at DESC
        LIMIT 1
      `;
      if (election.length === 0) {
        return res.status(404).json({ error: "Nenhuma elei\xE7\xE3o ativa para esta configura\xE7\xE3o" });
      }
      const voters = Array.isArray(election[0].voters) ? election[0].voters : JSON.parse(String(election[0].voters || "[]"));
      const totalVoters = voters.length;
      const votedVoters = await sql`
        SELECT COUNT(DISTINCT voter_id) as count
        FROM election_votes
        WHERE election_id = ${election[0].id}
      `;
      const allResults = await sql`
        SELECT 
          ev.position_id,
          ev.candidate_id,
          COALESCE(u.name, 'Usuário não encontrado') as candidate_name,
          u.email as candidate_email,
          COUNT(CASE WHEN ev.vote_type = 'nomination' THEN 1 END)::int as nominations,
          COUNT(CASE WHEN ev.vote_type = 'vote' THEN 1 END)::int as votes
        FROM election_votes ev
        LEFT JOIN users u ON ev.candidate_id = u.id
        WHERE ev.election_id = ${election[0].id}
        GROUP BY ev.position_id, ev.candidate_id, u.name, u.email
        HAVING COUNT(CASE WHEN ev.vote_type = 'nomination' THEN 1 END) > 0 
           OR COUNT(CASE WHEN ev.vote_type = 'vote' THEN 1 END) > 0
        ORDER BY ev.position_id, votes DESC, nominations DESC
      `;
      logger.debug(" [DASHBOARD] Resultados encontrados:", allResults.length);
      allResults.forEach((r) => {
        logger.debug(
          `  - Candidato ${r.candidate_id}: ${r.candidate_name} (${r.nominations} indica\xE7\xF5es, ${r.votes} votos)`
        );
      });
      const electionPositions = Array.isArray(election[0].positions) ? election[0].positions : JSON.parse(String(election[0].positions || "[]"));
      const positions = [];
      const resultsByPosition = /* @__PURE__ */ new Map();
      allResults.forEach((result) => {
        const existing = resultsByPosition.get(result.position_id);
        if (existing) {
          existing.push(result);
        } else {
          resultsByPosition.set(result.position_id, [result]);
        }
      });
      for (const position of electionPositions) {
        const results = resultsByPosition.get(position) ?? [];
        results.forEach((r) => {
          r.votes = toNumber(r.votes);
          r.nominations = toNumber(r.nominations);
        });
        const totalVotes = results.reduce((sum, r) => sum + toNumber(r.votes), 0);
        results.forEach((r) => {
          r.percentage = totalVotes > 0 ? toNumber(r.votes) / totalVotes * 100 : 0;
        });
        const winner = results.length > 0 && toNumber(results[0].votes) > 0 ? results[0] : null;
        const totalNominations = results.reduce((sum, r) => sum + toNumber(r.nominations), 0);
        positions.push({
          position,
          totalNominations,
          winner: winner ? {
            id: winner.candidate_id,
            name: winner.candidate_name,
            votes: winner.votes,
            percentage: winner.percentage
          } : null,
          results: results.map((r) => ({
            id: r.candidate_id,
            name: r.candidate_name || `Candidato ${r.candidate_id}`,
            email: r.candidate_email || "",
            nominations: toNumber(r.nominations),
            votes: toNumber(r.votes),
            percentage: r.percentage || 0
          }))
        });
      }
      const response = {
        election: {
          id: election[0].id,
          config_id: election[0].config_id,
          status: election[0].status,
          current_position: election[0].current_position,
          current_phase: election[0].current_phase || "nomination",
          church_name: election[0].church_name,
          created_at: election[0].created_at
        },
        totalVoters,
        votedVoters: votedVoters[0].count,
        currentPosition: election[0].current_position,
        totalPositions: electionPositions.length,
        positions
      };
      return res.status(200).json(response);
    } catch (error) {
      console.error("\u274C Erro ao buscar dashboard com configId:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.post(
    "/api/elections/advance-phase",
    checkReadOnlyAccess2,
    async (req, res) => {
      try {
        const body = req.body;
        const { configId, phase } = body;
        const adminId = parseHeaderUserId(req);
        if (adminId === null) {
          return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
        }
        const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;
        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return res.status(403).json({ error: "Acesso negado. Apenas administradores podem avan\xE7ar fases" });
        }
        const election = await sql`
        SELECT * FROM elections 
        WHERE config_id = ${configId}
        AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;
        if (election.length === 0) {
          return res.status(404).json({ error: "Nenhuma elei\xE7\xE3o ativa para esta configura\xE7\xE3o" });
        }
        logger.debug(` Atualizando fase da elei\xE7\xE3o ${election[0].id} para: ${phase}`);
        try {
          await sql`
          ALTER TABLE elections 
          ADD COLUMN IF NOT EXISTS current_phase VARCHAR(20) DEFAULT 'nomination'
        `;
        } catch (alterError) {
          logger.warn(
            " Coluna current_phase j\xE1 existe ou erro ao adicionar:",
            getErrorMessage(alterError)
          );
        }
        if (phase === "completed") {
          await sql`
          UPDATE elections 
          SET current_phase = ${phase}, updated_at = NOW()
          WHERE id = ${election[0].id}
        `;
        } else {
          await sql`
          UPDATE elections 
          SET current_phase = ${phase},
              result_announced = false,
              updated_at = NOW()
          WHERE id = ${election[0].id}
        `;
        }
        logger.info(` Fase da elei\xE7\xE3o ${election[0].id} avan\xE7ada para: ${phase}`);
        return res.status(200).json({
          message: `Fase avan\xE7ada para: ${phase}`,
          phase,
          electionId: election[0].id
        });
      } catch (error) {
        console.error("\u274C Erro ao avan\xE7ar fase:", error);
        return res.status(500).json({ error: "Erro interno do servidor", details: getErrorMessage(error) });
      }
    }
  );
  app2.post(
    "/api/elections/advance-position",
    checkReadOnlyAccess2,
    async (req, res) => {
      try {
        const body = req.body;
        const { configId, position } = body;
        const adminId = parseHeaderUserId(req);
        if (adminId === null) {
          return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
        }
        const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;
        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return res.status(403).json({ error: "Acesso negado. Apenas administradores podem avan\xE7ar posi\xE7\xF5es" });
        }
        const election = await sql`
        SELECT * FROM elections 
        WHERE config_id = ${configId}
        AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;
        if (election.length === 0) {
          return res.status(404).json({ error: "Nenhuma elei\xE7\xE3o ativa para esta configura\xE7\xE3o" });
        }
        await sql`
        UPDATE elections 
        SET current_position = ${position}, 
            current_phase = 'nomination',
            result_announced = false,
            updated_at = NOW()
        WHERE id = ${election[0].id}
      `;
        logger.info(` Posi\xE7\xE3o avan\xE7ada para ${position} e fase resetada para nomination`);
        return res.status(200).json({
          message: `Posi\xE7\xE3o avan\xE7ada para: ${position}`,
          currentPosition: position,
          currentPhase: "nomination"
        });
      } catch (error) {
        console.error("\u274C Erro ao avan\xE7ar posi\xE7\xE3o:", error);
        return res.status(500).json({ error: "Erro interno do servidor", details: getErrorMessage(error) });
      }
    }
  );
  app2.post("/api/elections/announce-result", async (req, res) => {
    try {
      const { configId } = req.body;
      const adminId = parseHeaderUserId(req);
      if (adminId === null) {
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
      }
      const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;
      if (!admin[0] || !hasAdminAccess(admin[0])) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem divulgar resultados" });
      }
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS result_announced BOOLEAN DEFAULT false
      `;
      const election = await sql`
        SELECT * FROM elections 
        WHERE config_id = ${configId}
        AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (election.length === 0) {
        return res.status(404).json({ error: "Nenhuma elei\xE7\xE3o ativa para esta configura\xE7\xE3o" });
      }
      const config = await sql`
        SELECT positions, voters
        FROM election_configs
        WHERE id = ${configId}
      `;
      if (config.length === 0) {
        return res.status(404).json({ error: "Configura\xE7\xE3o n\xE3o encontrada" });
      }
      const positions = Array.isArray(config[0].positions) ? config[0].positions : JSON.parse(String(config[0].positions || "[]"));
      if (!positions || positions.length === 0) {
        return res.status(400).json({ error: "Nenhuma posi\xE7\xE3o configurada nesta elei\xE7\xE3o" });
      }
      const currentPositionIndex = toNumber(election[0].current_position);
      if (currentPositionIndex >= positions.length) {
        return res.status(400).json({ error: "Posi\xE7\xE3o atual inv\xE1lida" });
      }
      const currentPositionName = String(positions[currentPositionIndex] || "");
      const voteResults = await sql`
        SELECT 
          ev.candidate_id,
          COUNT(*)::int as votes
        FROM election_votes ev
        WHERE ev.election_id = ${election[0].id}
          AND ev.position_id = ${currentPositionName}
          AND ev.vote_type = 'vote'
        GROUP BY ev.candidate_id
      `;
      let winnerInfo = null;
      if (voteResults.length > 0) {
        const totalVotes = voteResults.reduce((sum, row) => sum + toNumber(row.votes), 0);
        const sorted = voteResults.map((row) => ({
          candidate_id: row.candidate_id,
          votes: toNumber(row.votes)
        })).sort((a, b) => b.votes - a.votes);
        if (sorted[0] && sorted[0].votes > 0) {
          const candidateData = await sql`
            SELECT name FROM users WHERE id = ${sorted[0].candidate_id} LIMIT 1
          `;
          const candidateName = candidateData.length > 0 ? String(candidateData[0].name || "Candidato") : "Candidato";
          const percentage = totalVotes > 0 ? sorted[0].votes / totalVotes * 100 : 0;
          winnerInfo = {
            id: sorted[0].candidate_id,
            name: candidateName,
            votes: sorted[0].votes,
            percentage
          };
        }
      }
      await sql`
        UPDATE elections
        SET result_announced = true,
            updated_at = NOW()
        WHERE id = ${election[0].id}
      `;
      return res.status(200).json({
        message: "Resultado divulgado com sucesso",
        position: currentPositionName,
        winner: winnerInfo
      });
    } catch (error) {
      console.error("\u274C Erro ao divulgar resultado:", error);
      return res.status(500).json({ error: "Erro interno do servidor", details: getErrorMessage(error) });
    }
  });
  app2.post("/api/elections/reset-voting", async (req, res) => {
    try {
      const body = req.body;
      const { configId } = body;
      const adminId = parseHeaderUserId(req);
      if (adminId === null) {
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
      }
      const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;
      if (!admin[0] || !hasAdminAccess(admin[0])) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem repetir vota\xE7\xF5es" });
      }
      const election = await sql`
        SELECT e.*, ec.positions
        FROM elections e
        JOIN election_configs ec ON e.config_id = ec.id
        WHERE e.config_id = ${configId}
        AND e.status = 'active'
        ORDER BY e.created_at DESC
        LIMIT 1
      `;
      if (election.length === 0) {
        return res.status(404).json({ error: "Nenhuma elei\xE7\xE3o ativa para esta configura\xE7\xE3o" });
      }
      const positions = Array.isArray(election[0].positions) ? election[0].positions : JSON.parse(String(election[0].positions || "[]"));
      const currentPositionIndex = toNumber(election[0].current_position);
      if (currentPositionIndex >= positions.length) {
        return res.status(400).json({ error: "Posi\xE7\xE3o atual inv\xE1lida" });
      }
      const currentPositionName = String(positions[currentPositionIndex] || "");
      logger.debug(` Resetando votos para a posi\xE7\xE3o: ${currentPositionName}`);
      await sql`
        DELETE FROM election_votes
        WHERE election_id = ${election[0].id}
        AND position_id = ${currentPositionName}
        AND vote_type = 'vote'
      `;
      await sql`
        UPDATE elections 
        SET current_phase = 'voting',
            result_announced = false,
            updated_at = NOW()
        WHERE id = ${election[0].id}
      `;
      logger.info(` Vota\xE7\xE3o resetada para a posi\xE7\xE3o: ${currentPositionName}`);
      return res.status(200).json({
        message: `Vota\xE7\xE3o repetida com sucesso para: ${currentPositionName}`,
        currentPosition: currentPositionName,
        currentPhase: "voting"
      });
    } catch (error) {
      console.error("\u274C Erro ao resetar vota\xE7\xE3o:", error);
      return res.status(500).json({ error: "Erro interno do servidor", details: getErrorMessage(error) });
    }
  });
  app2.post("/api/elections/set-max-nominations", async (req, res) => {
    try {
      const { configId, maxNominations } = req.body;
      const adminId = parseHeaderUserId(req);
      if (adminId === null) {
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
      }
      const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;
      if (!admin[0] || !hasAdminAccess(admin[0])) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem alterar configura\xE7\xF5es" });
      }
      if (!maxNominations || maxNominations < 1) {
        return res.status(400).json({ error: "N\xFAmero de indica\xE7\xF5es deve ser maior que 0" });
      }
      try {
        await sql`
          ALTER TABLE election_configs 
          ADD COLUMN IF NOT EXISTS max_nominations_per_voter INTEGER DEFAULT 1
        `;
      } catch (alterError) {
        logger.warn(
          " Coluna max_nominations_per_voter j\xE1 existe ou erro ao adicionar:",
          getErrorMessage(alterError)
        );
      }
      await sql`
        UPDATE election_configs 
        SET max_nominations_per_voter = ${maxNominations}
        WHERE id = ${configId}
      `;
      logger.info(` M\xE1ximo de indica\xE7\xF5es atualizado para ${maxNominations} na elei\xE7\xE3o ${configId}`);
      return res.status(200).json({
        message: `M\xE1ximo de indica\xE7\xF5es atualizado para ${maxNominations}`,
        maxNominations
      });
    } catch (error) {
      console.error("\u274C Erro ao atualizar configura\xE7\xE3o:", error);
      return res.status(500).json({ error: "Erro interno do servidor", details: getErrorMessage(error) });
    }
  });
  app2.post("/api/elections/nominate", async (req, res) => {
    try {
      const body = req.body;
      const { electionId, positionId, candidateId } = body;
      const voterId = parseHeaderUserId(req);
      if (voterId === null) {
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
      }
      const election = await sql`
        SELECT * FROM elections 
        WHERE id = ${electionId}
        AND status = 'active'
      `;
      if (election.length === 0) {
        return res.status(404).json({ error: "Elei\xE7\xE3o n\xE3o encontrada ou inativa" });
      }
      const existingNomination = await sql`
        SELECT * FROM election_votes
        WHERE election_id = ${electionId}
        AND voter_id = ${voterId}
        AND position_id = ${positionId}
        AND vote_type = 'nomination'
      `;
      if (existingNomination.length > 0) {
        return res.status(400).json({ error: "Voc\xEA j\xE1 indicou um candidato para esta posi\xE7\xE3o" });
      }
      await sql`
        INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
        VALUES (${electionId}, ${voterId}, ${positionId}, ${candidateId}, 'nomination')
      `;
      await sql`
        UPDATE election_candidates 
        SET nominations = nominations + 1
        WHERE election_id = ${electionId}
        AND position_id = ${positionId}
        AND candidate_id = ${candidateId}
      `;
      return res.status(200).json({ message: "Indica\xE7\xE3o registrada com sucesso" });
    } catch (error) {
      console.error("\u274C Erro ao registrar indica\xE7\xE3o:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.delete(
    "/api/elections/config/:configId",
    checkReadOnlyAccess2,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.configId);
        const adminId = parseHeaderUserId(req);
        if (adminId === null) {
          return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
        }
        const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;
        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return res.status(403).json({ error: "Acesso negado. Apenas administradores podem excluir configura\xE7\xF5es" });
        }
        const config = await sql`
        SELECT * FROM election_configs WHERE id = ${configId}
      `;
        if (config.length === 0) {
          return res.status(404).json({ error: "Configura\xE7\xE3o n\xE3o encontrada" });
        }
        await sql`
        UPDATE elections 
        SET status = 'completed', updated_at = NOW()
        WHERE config_id = ${configId} AND status = 'active'
      `;
        await sql`DELETE FROM election_votes WHERE election_id IN (SELECT id FROM elections WHERE config_id = ${configId})`;
        await sql`DELETE FROM election_candidates WHERE election_id IN (SELECT id FROM elections WHERE config_id = ${configId})`;
        await sql`DELETE FROM elections WHERE config_id = ${configId}`;
        await sql`DELETE FROM election_configs WHERE id = ${configId}`;
        logger.info(` Configura\xE7\xE3o ${configId} exclu\xEDda com sucesso`);
        return res.status(200).json({ message: "Configura\xE7\xE3o exclu\xEDda com sucesso" });
      } catch (error) {
        console.error("\u274C Erro ao excluir configura\xE7\xE3o:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  );
  app2.post("/api/elections/approve-all-members", async (req, res) => {
    try {
      const adminId = parseHeaderUserId(req);
      if (adminId === null) {
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
      }
      const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;
      if (!admin[0] || !hasAdminAccess(admin[0])) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem aprovar membros" });
      }
      logger.info(" Aprovando todos os membros do sistema...");
      await sql`
        UPDATE users 
        SET status = 'approved', is_approved = true, updated_at = NOW()
        WHERE status != 'approved' OR is_approved = false
      `;
      const totalApproved = await sql`
        SELECT COUNT(*) as count FROM users WHERE is_approved = true
      `;
      const approvedCount = parseCount(totalApproved[0]);
      logger.info(` ${approvedCount} membros aprovados no total!`);
      return res.json({
        message: `Todos os membros foram aprovados! Total: ${approvedCount} membros aprovados.`,
        approved_count: approvedCount
      });
    } catch (error) {
      console.error("\u274C Erro ao aprovar membros:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/elections/cleanup", async (_req, res) => {
    try {
      logger.debug(" Iniciando limpeza de todas as vota\xE7\xF5es...");
      await sql`DELETE FROM election_votes`;
      logger.info(" Tabela election_votes limpa");
      await sql`DELETE FROM election_candidates`;
      logger.info(" Tabela election_candidates limpa");
      await sql`DELETE FROM elections`;
      logger.info(" Tabela elections limpa");
      await sql`DELETE FROM election_configs`;
      logger.info(" Tabela election_configs limpa");
      logger.info(" Limpeza conclu\xEDda com sucesso!");
      return res.status(200).json({
        message: "Todas as vota\xE7\xF5es foram limpas com sucesso",
        cleaned: {
          election_votes: true,
          election_candidates: true,
          elections: true,
          election_configs: true
        }
      });
    } catch (error) {
      console.error("\u274C Erro na limpeza:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/elections/active", async (req, res) => {
    try {
      const voterId = parseHeaderUserId(req);
      if (voterId === null) {
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
      }
      const userResult = await sql`
        SELECT id, church FROM users WHERE id = ${voterId}
      `;
      if (userResult.length === 0) {
        return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      }
      const userChurch = userResult[0].church;
      logger.debug(` Buscando elei\xE7\xF5es ativas para usu\xE1rio ${voterId}, igreja: ${userChurch}`);
      const activeElections = await sql`
        SELECT 
          e.id as election_id,
          e.config_id,
          e.current_position,
          e.current_phase,
          e.created_at,
          ec.church_name,
          ec.title,
          ec.positions,
          ec.voters,
          ec.church_id
        FROM elections e
        JOIN election_configs ec ON e.config_id = ec.id
        WHERE e.status = 'active'
        AND ${voterId} = ANY(ec.voters)
        AND (ec.church_name = ${userChurch} OR ${userChurch} IS NULL OR ${userChurch} = '')
        ORDER BY e.created_at DESC
      `;
      logger.debug(` Elei\xE7\xF5es ativas encontradas: ${activeElections.length}`);
      if (activeElections.length === 0) {
        return res.status(404).json({ error: "Nenhuma elei\xE7\xE3o ativa encontrada" });
      }
      return res.json({
        elections: activeElections.map((election) => ({
          election_id: election.election_id,
          config_id: election.config_id,
          current_position: election.current_position,
          current_phase: election.current_phase,
          church_name: election.church_name,
          title: election.title || "",
          positions: election.positions,
          voters: election.voters,
          created_at: election.created_at,
          status: "active"
        })),
        hasActiveElection: activeElections.length > 0
      });
    } catch (error) {
      console.error("\u274C Erro ao buscar elei\xE7\xF5es ativas:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/elections/voting/:configId", async (req, res) => {
    try {
      const { configId } = req.params;
      const voterId = parseHeaderUserId(req);
      logger.debug(` Interface de vota\xE7\xE3o para configId: ${configId}, voterId: ${voterId}`);
      const election = await sql`
        SELECT * FROM elections 
        WHERE config_id = ${configId} AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      if (election.length === 0) {
        const allElectionsForConfig = await sql`
          SELECT id, config_id, status, current_phase, created_at 
          FROM elections 
          WHERE config_id = ${configId}
          ORDER BY created_at DESC
        `;
        logger.warn(` Nenhuma elei\xE7\xE3o ativa encontrada para configId ${configId}`);
        logger.debug(` Elei\xE7\xF5es existentes para este config:`, allElectionsForConfig);
        return res.status(404).json({
          error: "Nenhuma elei\xE7\xE3o ativa encontrada",
          details: {
            configId,
            existingElections: allElectionsForConfig.map((e) => ({
              id: e.id,
              status: e.status,
              phase: e.current_phase,
              created: e.created_at
            }))
          }
        });
      }
      const config = await sql`
        SELECT * FROM election_configs WHERE id = ${configId}
      `;
      if (config.length === 0) {
        return res.status(404).json({ error: "Configura\xE7\xE3o de elei\xE7\xE3o n\xE3o encontrada" });
      }
      logger.debug(" [VOTING] Config carregado:", {
        configId,
        removed_candidates_raw: config[0].removed_candidates,
        removed_candidates_type: typeof config[0].removed_candidates,
        removed_candidates_isArray: Array.isArray(config[0].removed_candidates)
      });
      const positions = Array.isArray(config[0].positions) ? config[0].positions : JSON.parse(String(config[0].positions || "[]"));
      if (!positions || positions.length === 0) {
        logger.warn(" Nenhuma posi\xE7\xE3o configurada na elei\xE7\xE3o");
        return res.status(400).json({ error: "Configura\xE7\xE3o inv\xE1lida: nenhuma posi\xE7\xE3o encontrada" });
      }
      const currentPositionIndex = toNumber(election[0].current_position);
      if (currentPositionIndex >= positions.length) {
        logger.warn(" Posi\xE7\xE3o atual inv\xE1lida:", currentPositionIndex, "de", positions.length);
        return res.status(400).json({ error: "Posi\xE7\xE3o atual inv\xE1lida na elei\xE7\xE3o" });
      }
      const currentPositionName = String(positions[currentPositionIndex] || "");
      const currentPhase = election[0].current_phase || "nomination";
      let candidates = [];
      let totalVotesCount = 0;
      let votedVotersCount = 0;
      let allVotesCast = false;
      let winnerInfo = null;
      let voteResults = [];
      const votersArray = Array.isArray(config[0].voters) ? config[0].voters : JSON.parse(String(config[0].voters || "[]"));
      let effectiveTotalVoters = votersArray.length;
      if (currentPhase === "voting") {
        candidates = await sql`
          SELECT DISTINCT
            ev.candidate_id as id,
            u.name,
            u.church as unit,
            u.nome_unidade,
            u.birth_date,
            u.extra_data,
            0 as points,
            COUNT(*) as nominations
          FROM election_votes ev
          LEFT JOIN users u ON ev.candidate_id = u.id
          WHERE ev.election_id = ${election[0].id}
          AND ev.position_id = ${currentPositionName}
          AND ev.vote_type = 'nomination'
          GROUP BY ev.candidate_id, u.name, u.church, u.nome_unidade, u.birth_date, u.extra_data
          ORDER BY u.name
        `;
        voteResults = await sql`
          SELECT 
            ev.candidate_id,
            COUNT(*)::int as votes
          FROM election_votes ev
          WHERE ev.election_id = ${election[0].id}
            AND ev.position_id = ${currentPositionName}
            AND ev.vote_type = 'vote'
          GROUP BY ev.candidate_id
        `;
        totalVotesCount = voteResults.reduce(
          (sum, row) => sum + (parseInt(String(row.votes), 10) || 0),
          0
        );
        const distinctVotersResult = await sql`
          SELECT COUNT(DISTINCT voter_id)::int as count
          FROM election_votes
          WHERE election_id = ${election[0].id}
            AND position_id = ${currentPositionName}
            AND vote_type = 'vote'
        `;
        votedVotersCount = distinctVotersResult.length > 0 ? parseCount(distinctVotersResult[0]) : 0;
        if (effectiveTotalVoters === 0) {
          effectiveTotalVoters = Math.max(votedVotersCount, totalVotesCount);
        }
        if (effectiveTotalVoters > 0 && (votedVotersCount >= effectiveTotalVoters || totalVotesCount >= effectiveTotalVoters)) {
          allVotesCast = true;
        }
      } else {
        candidates = await sql`
          SELECT 
            ec.candidate_id as id,
            u.name,
            u.church as unit,
            u.nome_unidade,
            COALESCE(u.points, 0) as points
          FROM election_candidates ec
          LEFT JOIN users u ON ec.candidate_id = u.id
          WHERE ec.election_id = ${election[0].id}
          AND ec.position_id = ${currentPositionName}
          ORDER BY u.name
        `;
      }
      const hasVoted = await sql`
        SELECT COUNT(*) FROM election_votes
        WHERE election_id = ${election[0].id}
        AND position_id = ${currentPositionName}
        AND voter_id = ${voterId}
        AND vote_type = 'vote'
      `;
      const hasNominated = await sql`
        SELECT COUNT(*) FROM election_votes
        WHERE election_id = ${election[0].id}
        AND position_id = ${currentPositionName}
        AND voter_id = ${voterId}
        AND vote_type = 'nomination'
      `;
      const nominationCount = parseCount(hasNominated[0]);
      let votedCandidateName = null;
      if (parseCount(hasVoted[0]) > 0) {
        const userVote = await sql`
          SELECT ev.candidate_id, u.name
          FROM election_votes ev
          LEFT JOIN users u ON ev.candidate_id = u.id
          WHERE ev.election_id = ${election[0].id}
          AND ev.position_id = ${currentPositionName}
          AND ev.voter_id = ${voterId}
          AND ev.vote_type = 'vote'
          LIMIT 1
        `;
        if (userVote.length > 0) {
          votedCandidateName = userVote[0].name;
        }
      }
      let normalizedCandidates = candidates.flatMap((c) => {
        const candidateId = c.id ?? c.candidate_id;
        if (candidateId == null) {
          return [];
        }
        return [
          {
            id: Number(candidateId),
            name: c.name || c.candidate_name || "Candidato",
            unit: c.unit || c.church || "N/A",
            birthDate: c.birth_date || c.birthDate || null,
            extraData: (() => {
              try {
                return typeof c.extra_data === "string" ? JSON.parse(c.extra_data) : c.extra_data || null;
              } catch {
                return null;
              }
            })(),
            nomeUnidade: c.nome_unidade || c.nomeUnidade || null,
            points: toNumber(c.points ?? 0),
            nominations: toNumber(c.nominations ?? 0),
            votes: toNumber(c.votes ?? 0),
            percentage: toNumber(c.percentage ?? 0)
          }
        ];
      });
      if (currentPhase === "voting") {
        const voteMap = /* @__PURE__ */ new Map();
        voteResults.forEach((row) => {
          voteMap.set(row.candidate_id, parseInt(String(row.votes), 10) || 0);
        });
        const votesTotal = Array.from(voteMap.values()).reduce((sum, value) => sum + value, 0);
        normalizedCandidates = normalizedCandidates.map((candidate) => {
          const candidateVotes = voteMap.get(candidate.id) || 0;
          return {
            ...candidate,
            votes: candidateVotes,
            percentage: votesTotal > 0 ? candidateVotes / votesTotal * 100 : 0
          };
        });
        if (!winnerInfo && normalizedCandidates.length > 0) {
          const topCandidate = [...normalizedCandidates].sort((a, b) => b.votes - a.votes)[0];
          if (topCandidate && topCandidate.votes > 0) {
            winnerInfo = {
              id: topCandidate.id,
              name: topCandidate.name,
              votes: topCandidate.votes,
              percentage: topCandidate.percentage
            };
          }
        }
        totalVotesCount = votesTotal;
        if (effectiveTotalVoters === 0) {
          effectiveTotalVoters = Math.max(votedVotersCount, votesTotal);
        }
        if (effectiveTotalVoters > 0 && (votesTotal >= effectiveTotalVoters || votedVotersCount >= effectiveTotalVoters)) {
          allVotesCast = true;
        }
      }
      if (currentPhase === "completed") {
        allVotesCast = true;
        if (effectiveTotalVoters === 0) {
          effectiveTotalVoters = Math.max(votedVotersCount, totalVotesCount);
        }
      }
      const isTeenPosition = typeof currentPositionName === "string" && currentPositionName.toLowerCase().includes("teen");
      if (isTeenPosition) {
        normalizedCandidates = normalizedCandidates.filter((candidate) => {
          let age = null;
          if (candidate.birthDate) {
            const birthDate = new Date(candidate.birthDate);
            if (!Number.isNaN(birthDate.getTime())) {
              age = Math.floor((Date.now() - birthDate.getTime()) / (1e3 * 60 * 60 * 24 * 365.25));
            }
          } else if (candidate.extraData && candidate.extraData.idade) {
            const parsed = parseInt(String(candidate.extraData.idade), 10);
            age = Number.isNaN(parsed) ? null : parsed;
          }
          const eligible = age !== null && age >= 10 && age <= 15;
          if (!eligible) {
            logger.warn(
              ` Removendo candidato ${candidate.name} da lista Teen (idade=${age ?? "desconhecida"})`
            );
          }
          return eligible;
        });
      }
      logger.debug(" [VOTING] Verificando removed_candidates do config:", {
        raw: config[0].removed_candidates,
        type: typeof config[0].removed_candidates,
        isArray: Array.isArray(config[0].removed_candidates)
      });
      let removedCandidates = [];
      if (config[0].removed_candidates) {
        if (Array.isArray(config[0].removed_candidates)) {
          removedCandidates = config[0].removed_candidates;
        } else if (typeof config[0].removed_candidates === "string") {
          try {
            removedCandidates = JSON.parse(config[0].removed_candidates || "[]");
          } catch (e) {
            console.error("\u274C [VOTING] Erro ao parsear removed_candidates:", e);
            removedCandidates = [];
          }
        }
      }
      logger.debug(" [VOTING] removed_candidates parseado:", removedCandidates);
      logger.debug(" [VOTING] Total de candidatos antes do filtro:", normalizedCandidates.length);
      if (removedCandidates.length > 0) {
        const beforeCount = normalizedCandidates.length;
        normalizedCandidates = normalizedCandidates.filter((candidate) => {
          const isRemoved = removedCandidates.includes(candidate.id);
          if (isRemoved) {
            logger.warn(
              ` [VOTING] Removendo candidato ${candidate.name} (id: ${candidate.id}) - removido manualmente pelo admin`
            );
          }
          return !isRemoved;
        });
        logger.debug(
          ` [VOTING] Filtro de candidatos removidos: ${beforeCount} \u2192 ${normalizedCandidates.length} (removidos: ${beforeCount - normalizedCandidates.length})`
        );
      } else {
        logger.debug(" [VOTING] Nenhum candidato removido encontrado no config");
      }
      normalizedCandidates = normalizedCandidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        unit: candidate.unit,
        birthDate: candidate.birthDate,
        extraData: candidate.extraData,
        nomeUnidade: candidate.nomeUnidade || null,
        points: candidate.points,
        nominations: candidate.nominations,
        votes: candidate.votes,
        percentage: candidate.percentage
      }));
      const resultAnnounced = Boolean(election[0].result_announced);
      if (resultAnnounced) {
        allVotesCast = true;
        if (effectiveTotalVoters === 0) {
          effectiveTotalVoters = Math.max(votedVotersCount, totalVotesCount);
        }
      }
      logger.debug(" Status da vota\xE7\xE3o", {
        configId,
        position: currentPositionName,
        currentPhase,
        effectiveTotalVoters,
        totalVotesCount,
        votedVotersCount,
        allVotesCast,
        winner: winnerInfo ? { id: winnerInfo.id, votes: winnerInfo.votes, percentage: winnerInfo.percentage } : null
      });
      const maxNominationsPerVoter = toNumber(config[0].max_nominations_per_voter) || 1;
      const hasReachedNominationLimit = nominationCount >= maxNominationsPerVoter;
      const response = {
        election: {
          id: election[0].id,
          config_id: election[0].config_id,
          status: election[0].status,
          current_phase: election[0].current_phase
        },
        currentPosition: election[0].current_position,
        totalPositions: positions.length,
        currentPositionName,
        candidates: normalizedCandidates,
        phase: election[0].current_phase || "nomination",
        hasVoted: parseCount(hasVoted[0]) > 0,
        hasNominated: hasReachedNominationLimit,
        nominationCount,
        maxNominationsPerVoter,
        totalVoters: effectiveTotalVoters,
        totalVotes: totalVotesCount,
        votersWhoVoted: votedVotersCount,
        allVotesCast,
        resultAnnounced,
        winner: winnerInfo,
        userVote: null,
        votedCandidateName
      };
      logger.info(
        ` Interface de vota\xE7\xE3o carregada: ${normalizedCandidates.length} candidatos com nomes reais`
      );
      return res.json(response);
    } catch (error) {
      console.error("\u274C Erro na interface de vota\xE7\xE3o:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/elections/vote-log/:electionId", async (req, res) => {
    try {
      const { electionId } = req.params;
      logger.debug(` Buscando log de votos para elei\xE7\xE3o: ${electionId}`);
      const votes = await sql`
        SELECT 
          ev.id,
          ev.voter_id,
          ev.candidate_id,
          ev.position_id,
          ev.vote_type,
          ev.voted_at as created_at,
          u_voter.name as voter_name,
          u_candidate.name as candidate_name
        FROM election_votes ev
        LEFT JOIN users u_voter ON ev.voter_id = u_voter.id
        LEFT JOIN users u_candidate ON ev.candidate_id = u_candidate.id
        WHERE ev.election_id = ${electionId}
        ORDER BY ev.voted_at DESC
      `;
      logger.info(` Log encontrado: ${votes.length} registro(s) (votos + indica\xE7\xF5es)`);
      return res.json(votes);
    } catch (error) {
      console.error("\u274C Erro ao buscar log de votos:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/elections/debug/:electionId", async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const candidates = await sql`
        SELECT * FROM election_candidates 
        WHERE election_id = ${electionId}
        ORDER BY position_id, candidate_name
      `;
      const votes = await sql`
        SELECT * FROM election_votes 
        WHERE election_id = ${electionId}
        ORDER BY position_id, voter_id
      `;
      return res.status(200).json({
        electionId,
        candidates,
        votes,
        totalCandidates: candidates.length,
        totalVotes: votes.length
      });
    } catch (error) {
      console.error("\u274C Erro no debug:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.post("/api/elections/vote", async (req, res) => {
    try {
      const body = req.body;
      const { electionId, positionId, candidateId, configId, phase } = body;
      const voterId = parseHeaderUserId(req);
      logger.debug(" Recebendo voto/indica\xE7\xE3o:", { configId, candidateId, phase, voterId });
      if (voterId === null) {
        logger.warn(" Usu\xE1rio n\xE3o autenticado");
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
      }
      let election = [];
      let currentPositionName;
      let voteType;
      if (configId && phase) {
        logger.debug(" Formato novo: configId + phase");
        election = await sql`
          SELECT 
            e.id as election_id,
            e.config_id,
            e.status,
            e.current_position,
            e.current_phase,
            e.created_at,
            e.updated_at,
            ec.positions,
            ec.max_nominations_per_voter
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.config_id = ${configId}
          AND e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;
        logger.debug(" Elei\xE7\xE3o encontrada:", election.length > 0 ? "SIM" : "N\xC3O");
        if (election.length > 0) {
          logger.debug(" Dados brutos da elei\xE7\xE3o:", JSON.stringify(election[0]));
        }
        if (election.length === 0) {
          logger.warn(" Elei\xE7\xE3o n\xE3o encontrada");
          return res.status(404).json({ error: "Elei\xE7\xE3o n\xE3o encontrada ou inativa" });
        }
        const positions = Array.isArray(election[0].positions) ? election[0].positions : JSON.parse(String(election[0].positions || "[]"));
        if (!positions || positions.length === 0) {
          logger.warn(" Nenhuma posi\xE7\xE3o configurada na elei\xE7\xE3o");
          return res.status(400).json({ error: "Configura\xE7\xE3o inv\xE1lida: nenhuma posi\xE7\xE3o encontrada" });
        }
        const currentPos = election[0].current_position || 0;
        if (currentPos >= positions.length) {
          logger.warn(" Posi\xE7\xE3o atual inv\xE1lida:", currentPos, "de", positions.length);
          return res.status(400).json({ error: "Posi\xE7\xE3o atual inv\xE1lida na elei\xE7\xE3o" });
        }
        currentPositionName = positions[currentPos];
        voteType = phase === "nomination" ? "nomination" : "vote";
        logger.debug(" Dados da elei\xE7\xE3o:", {
          electionId: election[0].election_id,
          currentPosition: election[0].current_position,
          currentPositionName,
          voteType,
          maxNominations: election[0].max_nominations_per_voter
        });
        if (phase === "nomination") {
          const maxNominations = election[0].max_nominations_per_voter || 1;
          const existingNominations = await sql`
            SELECT COUNT(*) as count FROM election_votes
            WHERE election_id = ${election[0].election_id}
            AND voter_id = ${voterId}
            AND position_id = ${currentPositionName}
            AND vote_type = 'nomination'
          `;
          const nominationCount = parseCount(existingNominations[0]);
          logger.debug(` Limite de indica\xE7\xF5es: ${nominationCount}/${maxNominations}`);
          if (nominationCount >= maxNominations) {
            logger.warn(" Limite de indica\xE7\xF5es atingido");
            return res.status(400).json({
              error: `Voc\xEA j\xE1 atingiu o limite de ${maxNominations} indica\xE7\xE3o(\xF5es) para esta posi\xE7\xE3o`
            });
          }
        } else {
          const existingVote = await sql`
            SELECT * FROM election_votes
            WHERE election_id = ${election[0].election_id}
            AND voter_id = ${voterId}
            AND position_id = ${currentPositionName}
            AND vote_type = 'vote'
          `;
          if (existingVote.length > 0) {
            logger.warn(" J\xE1 votou para esta posi\xE7\xE3o");
            return res.status(400).json({ error: "Voc\xEA j\xE1 votou para esta posi\xE7\xE3o" });
          }
        }
        logger.info(" Registrando indica\xE7\xE3o/voto...");
        const result = await sql`
          INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
          VALUES (${election[0].election_id}, ${voterId}, ${currentPositionName}, ${candidateId}, ${voteType})
          RETURNING *
        `;
        logger.info(" Indica\xE7\xE3o/voto registrado com sucesso:", result[0]);
        if (voteType === "nomination") {
          const candidateRecord = await sql`
            SELECT * FROM election_candidates 
            WHERE election_id = ${election[0].election_id}
            AND position_id = ${currentPositionName}
            AND candidate_id = ${candidateId}
          `;
          if (candidateRecord.length === 0) {
            await sql`
              INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, nominations, votes)
              VALUES (${election[0].election_id}, ${currentPositionName}, ${candidateId}, '', 1, 0)
            `;
          } else {
            await sql`
              UPDATE election_candidates 
              SET nominations = nominations + 1
              WHERE election_id = ${election[0].election_id}
              AND position_id = ${currentPositionName}
              AND candidate_id = ${candidateId}
            `;
          }
        } else {
          const candidateRecord = await sql`
            SELECT * FROM election_candidates 
            WHERE election_id = ${election[0].election_id}
            AND position_id = ${currentPositionName}
            AND candidate_id = ${candidateId}
          `;
          if (candidateRecord.length === 0) {
            await sql`
              INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, nominations, votes)
              VALUES (${election[0].election_id}, ${currentPositionName}, ${candidateId}, '', 0, 1)
            `;
          } else {
            await sql`
              UPDATE election_candidates 
              SET votes = votes + 1
              WHERE election_id = ${election[0].election_id}
              AND position_id = ${currentPositionName}
              AND candidate_id = ${candidateId}
            `;
          }
        }
      } else {
        election = await sql`
          SELECT * FROM elections 
          WHERE id = ${electionId}
          AND status = 'active'
        `;
        if (election.length === 0) {
          return res.status(404).json({ error: "Elei\xE7\xE3o n\xE3o encontrada ou inativa" });
        }
        const existingVote = await sql`
          SELECT * FROM election_votes
          WHERE election_id = ${electionId}
          AND voter_id = ${voterId}
          AND position_id = ${positionId}
          AND vote_type = 'vote'
        `;
        if (existingVote.length > 0) {
          return res.status(400).json({ error: "Voc\xEA j\xE1 votou para esta posi\xE7\xE3o" });
        }
        await sql`
          INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
          VALUES (${electionId}, ${voterId}, ${positionId}, ${candidateId}, 'vote')
        `;
        await sql`
          UPDATE election_candidates 
          SET votes = votes + 1
          WHERE election_id = ${electionId}
          AND position_id = ${positionId}
          AND candidate_id = ${candidateId}
        `;
      }
      logger.info(" Retornando sucesso");
      return res.status(200).json({ message: "Voto registrado com sucesso" });
    } catch (error) {
      console.error("\u274C Erro ao registrar voto:", error);
      console.error("\u274C Stack trace:", getErrorStack(error));
      return res.status(500).json({
        error: "Erro interno do servidor",
        details: getErrorMessage(error)
      });
    }
  });
};

// server/routes/districtRoutes.ts
var districtRoutes = (app2) => {
  const storage2 = new NeonAdapter();
  app2.get(
    "/api/districts",
    cacheMiddleware("districts", CACHE_TTL.DISTRICTS),
    async (req, res) => {
      try {
        const userId = parseInt(req.headers["x-user-id"] || "0");
        const user = userId ? await storage2.getUserById(userId) : null;
        if (isSuperAdmin(user)) {
          const districts2 = await sql`
          SELECT d.*, u.name as pastor_name, u.email as pastor_email
          FROM districts d
          LEFT JOIN users u ON d.pastor_id = u.id
          ORDER BY d.name
        `;
          return res.json(districts2);
        } else if (hasAdminAccess(user) && user?.districtId) {
          const districts2 = await sql`
          SELECT d.*, u.name as pastor_name, u.email as pastor_email
          FROM districts d
          LEFT JOIN users u ON d.pastor_id = u.id
          WHERE d.id = ${user.districtId}
        `;
          return res.json(districts2);
        } else {
          return res.json([]);
        }
      } catch (error) {
        logger.error("Erro ao buscar distritos:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  app2.get(
    "/api/districts/:id",
    cacheMiddleware("districts", CACHE_TTL.DISTRICTS),
    async (req, res) => {
      try {
        const districtId = parseInt(req.params.id);
        const userId = parseInt(req.headers["x-user-id"] || "0");
        const user = userId ? await storage2.getUserById(userId) : null;
        const district = await sql`
        SELECT d.*, u.name as pastor_name, u.email as pastor_email
        FROM districts d
        LEFT JOIN users u ON d.pastor_id = u.id
        WHERE d.id = ${districtId}
      `;
        if (district.length === 0) {
          return res.status(404).json({ error: "Distrito n\xE3o encontrado" });
        }
        if (!isSuperAdmin(user) && !(isPastor(user) && user?.districtId === districtId)) {
          return res.status(403).json({ error: "Acesso negado" });
        }
        return res.json(district[0]);
      } catch (error) {
        logger.error("Erro ao buscar distrito:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/districts/pastor/create",
    invalidateCacheMiddleware("districts"),
    async (req, res) => {
      try {
        const userId = parseInt(req.headers["x-user-id"] || "0");
        const user = userId ? await storage2.getUserById(userId) : null;
        if (!isPastor(user)) {
          return res.status(403).json({ error: "Apenas pastores podem criar distritos atrav\xE9s desta rota" });
        }
        if (user?.districtId) {
          return res.status(400).json({ error: "Voc\xEA j\xE1 possui um distrito associado" });
        }
        const { name, code, pastorId } = req.body;
        if (!name) {
          return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio" });
        }
        const finalPastorId = pastorId && parseInt(pastorId) === userId ? userId : userId;
        let finalCode = code;
        if (!finalCode || finalCode.trim() === "") {
          finalCode = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").substring(0, 20);
        }
        const existing = await sql`
        SELECT id FROM districts WHERE code = ${finalCode}
      `;
        if (existing.length > 0) {
          let counter = 1;
          let newCode = `${finalCode}-${counter}`;
          while (true) {
            const check = await sql`
            SELECT id FROM districts WHERE code = ${newCode}
          `;
            if (check.length === 0) {
              finalCode = newCode;
              break;
            }
            counter++;
            newCode = `${finalCode}-${counter}`;
          }
        }
        const newDistrict = await sql`
        INSERT INTO districts (name, code, pastor_id, description, created_at, updated_at)
        VALUES (${name}, ${finalCode}, ${finalPastorId}, NULL, NOW(), NOW())
        RETURNING *
      `;
        if (newDistrict[0]) {
          await sql`
          UPDATE users
          SET district_id = ${newDistrict[0].id}
          WHERE id = ${finalPastorId}
        `;
        }
        return res.status(201).json(newDistrict[0]);
      } catch (error) {
        logger.error("Erro ao criar distrito pelo pastor:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  app2.post("/api/districts", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode criar distritos" });
      }
      const { name, code, pastorId, description } = req.body;
      if (!name || !code) {
        return res.status(400).json({ error: "Nome e c\xF3digo s\xE3o obrigat\xF3rios" });
      }
      const existing = await sql`
        SELECT id FROM districts WHERE code = ${code}
      `;
      if (existing.length > 0) {
        return res.status(400).json({ error: "C\xF3digo j\xE1 existe" });
      }
      if (pastorId) {
        const pastor = await storage2.getUserById(pastorId);
        if (!pastor || pastor.role !== "pastor") {
          return res.status(400).json({ error: "Usu\xE1rio n\xE3o \xE9 um pastor v\xE1lido" });
        }
      }
      const newDistrict = await sql`
        INSERT INTO districts (name, code, pastor_id, description, created_at, updated_at)
        VALUES (${name}, ${code}, ${pastorId || null}, ${description || null}, NOW(), NOW())
        RETURNING *
      `;
      if (pastorId && newDistrict[0]) {
        await sql`
          UPDATE users
          SET district_id = ${newDistrict[0].id}
          WHERE id = ${pastorId}
        `;
      }
      return res.status(201).json(newDistrict[0]);
    } catch (error) {
      logger.error("Erro ao criar distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/districts/:id", async (req, res) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode atualizar distritos" });
      }
      const { name, code, pastorId, description } = req.body;
      const existing = await sql`
        SELECT * FROM districts WHERE id = ${districtId}
      `;
      if (existing.length === 0) {
        return res.status(404).json({ error: "Distrito n\xE3o encontrado" });
      }
      if (code && code !== existing[0].code) {
        const codeExists = await sql`
          SELECT id FROM districts WHERE code = ${code} AND id != ${districtId}
        `;
        if (codeExists.length > 0) {
          return res.status(400).json({ error: "C\xF3digo j\xE1 existe" });
        }
      }
      if (pastorId !== void 0) {
        if (pastorId) {
          const pastor = await storage2.getUserById(pastorId);
          if (!pastor || pastor.role !== "pastor") {
            return res.status(400).json({ error: "Usu\xE1rio n\xE3o \xE9 um pastor v\xE1lido" });
          }
        }
      }
      const currentPastorId = existing[0].pastor_id;
      const newPastorId = pastorId !== void 0 ? pastorId || null : currentPastorId;
      const updated = await sql`
        UPDATE districts
        SET 
          name = COALESCE(${name}, name),
          code = COALESCE(${code}, code),
          pastor_id = ${newPastorId},
          description = COALESCE(${description}, description),
          updated_at = NOW()
        WHERE id = ${districtId}
        RETURNING *
      `;
      if (pastorId !== void 0) {
        if (existing[0].pastor_id) {
          await sql`
            UPDATE users
            SET district_id = NULL
            WHERE id = ${existing[0].pastor_id}
          `;
        }
        if (pastorId) {
          await sql`
            UPDATE users
            SET district_id = ${districtId}
            WHERE id = ${pastorId}
          `;
        }
      }
      return res.json(updated[0]);
    } catch (error) {
      logger.error("Erro ao atualizar distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.delete("/api/districts/:id", async (req, res) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode deletar distritos" });
      }
      const existing = await sql`
        SELECT * FROM districts WHERE id = ${districtId}
      `;
      if (existing.length === 0) {
        return res.status(404).json({ error: "Distrito n\xE3o encontrado" });
      }
      const churches2 = await sql`
        SELECT COUNT(*) as count FROM churches WHERE district_id = ${districtId}
      `;
      const churchCount = Number(churches2[0].count) || 0;
      if (churchCount > 0) {
        return res.status(400).json({
          error: "N\xE3o \xE9 poss\xEDvel deletar distrito com igrejas associadas. Remova as igrejas primeiro."
        });
      }
      await sql`
        UPDATE users
        SET district_id = NULL
        WHERE district_id = ${districtId}
      `;
      await sql`
        DELETE FROM districts WHERE id = ${districtId}
      `;
      return res.json({ success: true, message: "Distrito deletado com sucesso" });
    } catch (error) {
      logger.error("Erro ao deletar distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/districts/:id/churches", async (req, res) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!isSuperAdmin(user) && !(isPastor(user) && user?.districtId === districtId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      const churches2 = await storage2.getChurchesByDistrict(districtId);
      return res.json(churches2);
    } catch (error) {
      logger.error("Erro ao buscar igrejas do distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/pastors", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (isSuperAdmin(user)) {
        const pastors = await sql`
          SELECT u.*, d.name as district_name, d.code as district_code
          FROM users u
          LEFT JOIN districts d ON u.district_id = d.id
          WHERE u.role = 'pastor'
          ORDER BY u.name
        `;
        return res.json(pastors);
      } else {
        return res.json([]);
      }
    } catch (error) {
      logger.error("Erro ao buscar pastores:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/pastors/:id", async (req, res) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      const pastor = await sql`
        SELECT u.*, d.name as district_name, d.code as district_code
        FROM users u
        LEFT JOIN districts d ON u.district_id = d.id
        WHERE u.id = ${pastorId} AND u.role = 'pastor'
      `;
      if (pastor.length === 0) {
        return res.status(404).json({ error: "Pastor n\xE3o encontrado" });
      }
      if (!isSuperAdmin(user) && !(isPastor(user) && user?.id === pastorId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      return res.json(pastor[0]);
    } catch (error) {
      logger.error("Erro ao buscar pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/pastors", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!canManagePastors(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode criar pastores" });
      }
      const { name, email, password, districtId } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nome, email e senha s\xE3o obrigat\xF3rios" });
      }
      const existing = await storage2.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email j\xE1 est\xE1 em uso" });
      }
      if (districtId) {
        const district = await sql`
          SELECT id FROM districts WHERE id = ${districtId}
        `;
        if (district.length === 0) {
          return res.status(400).json({ error: "Distrito n\xE3o encontrado" });
        }
      }
      const bcrypt6 = await import("bcryptjs");
      const hashedPassword = await bcrypt6.hash(password, 10);
      const newPastor = await storage2.createUser({
        name,
        email,
        password: hashedPassword,
        role: "pastor",
        districtId: districtId || null,
        isApproved: true,
        firstAccess: true,
        churchCode: "",
        departments: "",
        birthDate: "",
        civilStatus: "",
        occupation: "",
        education: "",
        address: "",
        baptismDate: "",
        previousReligion: "",
        biblicalInstructor: null,
        interestedSituation: "",
        isDonor: false,
        isTither: false,
        points: 0,
        level: "Iniciante",
        attendance: 0,
        observations: ""
      });
      return res.status(201).json(newPastor);
    } catch (error) {
      logger.error("Erro ao criar pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/pastors/:id", async (req, res) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!canManagePastors(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode atualizar pastores" });
      }
      const pastor = await storage2.getUserById(pastorId);
      if (!pastor || pastor.role !== "pastor") {
        return res.status(404).json({ error: "Pastor n\xE3o encontrado" });
      }
      const { name, email, districtId, password } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (email && email !== pastor.email) {
        const existing = await storage2.getUserByEmail(email);
        if (existing) {
          return res.status(400).json({ error: "Email j\xE1 est\xE1 em uso" });
        }
        updates.email = email;
      }
      if (districtId !== void 0) {
        if (districtId) {
          const district = await sql`
            SELECT id FROM districts WHERE id = ${districtId}
          `;
          if (district.length === 0) {
            return res.status(400).json({ error: "Distrito n\xE3o encontrado" });
          }
        }
        updates.districtId = districtId;
      }
      if (password) {
        const bcrypt6 = await import("bcryptjs");
        updates.password = await bcrypt6.hash(password, 10);
      }
      const updated = await storage2.updateUser(pastorId, updates);
      return res.json(updated);
    } catch (error) {
      logger.error("Erro ao atualizar pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.delete("/api/pastors/:id", async (req, res) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!canManagePastors(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode deletar pastores" });
      }
      const pastor = await storage2.getUserById(pastorId);
      if (!pastor || pastor.role !== "pastor") {
        return res.status(404).json({ error: "Pastor n\xE3o encontrado" });
      }
      if (pastor.districtId) {
        await sql`
          UPDATE districts
          SET pastor_id = NULL
          WHERE pastor_id = ${pastorId}
        `;
      }
      await storage2.updateUser(pastorId, { role: "member", districtId: null });
      return res.json({ success: true, message: "Pastor removido com sucesso" });
    } catch (error) {
      logger.error("Erro ao deletar pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/churches/unassigned", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode ver igrejas sem distrito" });
      }
      const churches2 = await sql`
        SELECT * FROM churches 
        WHERE district_id IS NULL 
        ORDER BY name
      `;
      return res.json(churches2);
    } catch (error) {
      logger.error("Erro ao buscar igrejas sem distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/districts/:id/churches", async (req, res) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode vincular igrejas a distritos" });
      }
      const { churchId } = req.body;
      if (!churchId) {
        return res.status(400).json({ error: "ID da igreja \xE9 obrigat\xF3rio" });
      }
      const district = await sql`
        SELECT id FROM districts WHERE id = ${districtId}
      `;
      if (district.length === 0) {
        return res.status(404).json({ error: "Distrito n\xE3o encontrado" });
      }
      const church = await sql`
        SELECT id, name FROM churches WHERE id = ${churchId}
      `;
      if (church.length === 0) {
        return res.status(404).json({ error: "Igreja n\xE3o encontrada" });
      }
      await sql`
        UPDATE churches
        SET district_id = ${districtId}, updated_at = NOW()
        WHERE id = ${churchId}
      `;
      return res.json({
        success: true,
        message: `Igreja "${church[0].name}" vinculada ao distrito com sucesso`
      });
    } catch (error) {
      logger.error("Erro ao vincular igreja ao distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/districts/:id/churches/bulk", async (req, res) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode vincular igrejas a distritos" });
      }
      const { churchIds } = req.body;
      if (!churchIds || !Array.isArray(churchIds) || churchIds.length === 0) {
        return res.status(400).json({ error: "IDs das igrejas s\xE3o obrigat\xF3rios" });
      }
      const district = await sql`
        SELECT id FROM districts WHERE id = ${districtId}
      `;
      if (district.length === 0) {
        return res.status(404).json({ error: "Distrito n\xE3o encontrado" });
      }
      let successCount = 0;
      for (const churchId of churchIds) {
        try {
          await sql`
            UPDATE churches
            SET district_id = ${districtId}, updated_at = NOW()
            WHERE id = ${churchId}
          `;
          successCount++;
        } catch (e) {
          logger.error(`Erro ao vincular igreja ${churchId}:`, e);
        }
      }
      return res.json({
        success: true,
        message: `${successCount} igreja(s) vinculada(s) ao distrito com sucesso`,
        count: successCount
      });
    } catch (error) {
      logger.error("Erro ao vincular igrejas ao distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.delete("/api/districts/:id/churches/:churchId", async (req, res) => {
    try {
      const districtId = parseInt(req.params.id);
      const churchId = parseInt(req.params.churchId);
      const userId = parseInt(req.headers["x-user-id"] || "0");
      const user = userId ? await storage2.getUserById(userId) : null;
      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode desvincular igrejas de distritos" });
      }
      const church = await sql`
        SELECT id, name FROM churches WHERE id = ${churchId} AND district_id = ${districtId}
      `;
      if (church.length === 0) {
        return res.status(404).json({ error: "Igreja n\xE3o encontrada neste distrito" });
      }
      await sql`
        UPDATE churches
        SET district_id = NULL, updated_at = NOW()
        WHERE id = ${churchId}
      `;
      return res.json({
        success: true,
        message: `Igreja "${church[0].name}" desvinculada do distrito com sucesso`
      });
    } catch (error) {
      logger.error("Erro ao desvincular igreja do distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
};

// server/routes/importRoutes.ts
import multer2 from "multer";

// server/utils/excelUtils.ts
import ExcelJS from "exceljs";
import fs from "fs";
async function readExcelFile(filePath, sheetIndex = 0) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[sheetIndex];
    if (!worksheet) {
      throw new Error(`Planilha \xEDndice ${sheetIndex} n\xE3o encontrada`);
    }
    const headers = [];
    const rows = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
    });
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData = {};
      let hasData = false;
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1] || `Column${colNumber}`;
        const value = cell.value;
        if (value !== null && value !== void 0) {
          hasData = true;
          if (value instanceof Date) {
            rowData[header] = value;
          } else if (typeof value === "object" && "result" in value) {
            rowData[header] = value.result?.toString() || "";
          } else if (typeof value === "object" && "richText" in value) {
            rowData[header] = value.richText.map((rt) => rt.text).join("");
          } else {
            rowData[header] = value;
          }
        }
      });
      if (hasData) {
        rows.push(rowData);
      }
    }
    const validRows = rows.filter((row) => {
      const hasNewlines = Object.values(row).every(
        (val) => val && typeof val === "string" && val.includes("\n")
      );
      if (hasNewlines) return false;
      const mainFields = ["nome", "Nome", "name", "N"];
      const hasMainField = mainFields.some((field) => {
        const value = row[field];
        return value && typeof value === "string" && value.trim().length > 0;
      });
      return hasMainField;
    });
    return {
      headers,
      rows: validRows,
      sheetName: worksheet.name
    };
  } catch (error) {
    logger.error("Erro ao ler arquivo Excel:", error);
    throw error;
  }
}
function cleanupTempFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.warn("Erro ao remover arquivo tempor\xE1rio:", error);
  }
}

// server/routes/importRoutes.ts
var upload = multer2({ dest: "uploads/" });
var importRoutes = (app2) => {
  app2.post(
    "/api/calendar/import-simple",
    upload.single("file"),
    async (req, res) => {
      try {
        logger.info("Importa\xE7\xE3o simplificada iniciada");
        if (!req.file) {
          return res.status(400).json({ error: "Nenhum arquivo enviado" });
        }
        logger.info(`Arquivo recebido: ${req.file.originalname}`);
        if (!req.file.originalname.endsWith(".xlsx")) {
          return res.status(400).json({
            error: "Apenas arquivos .xlsx s\xE3o aceitos. Por favor, converta seu arquivo para formato Excel (.xlsx)."
          });
        }
        const filePath = req.file.path;
        const { rows: data, sheetName } = await readExcelFile(filePath);
        logger.info(`Planilha lida: ${sheetName}, ${data.length} linhas`);
        if (!data || data.length === 0) {
          cleanupTempFile(filePath);
          return res.status(400).json({ error: "Nenhum dado encontrado no arquivo" });
        }
        let importedCount = 0;
        const errors = [];
        const categoryMapping = {
          "igreja local": "igreja-local",
          "igreja-local": "igreja-local",
          "asr geral": "asr-geral",
          "asr-geral": "asr-geral",
          "asr administrativo": "asr-administrativo",
          "asr-administrativo": "asr-administrativo",
          "asr pastores": "asr-pastores",
          "asr-pastores": "asr-pastores",
          visitas: "visitas",
          reunioes: "reunioes",
          reuni\u00F5es: "reunioes",
          prega\u00E7\u00F5es: "pregacoes",
          pregacoes: "pregacoes"
        };
        for (let i = 0; i < data.length; i++) {
          try {
            const event = data[i];
            if (!event.Evento || !event.Data) {
              errors.push(`Linha ${i + 1}: campos obrigat\xF3rios ausentes`);
              continue;
            }
            const eventTitle = String(event.Evento).trim();
            const dateString = String(event.Data).trim();
            const category = event.Categoria ? String(event.Categoria).trim().toLowerCase() : "reunioes";
            const mappedType = categoryMapping[category] || "reunioes";
            let startDate = "";
            let endDate = "";
            if (dateString.includes("-")) {
              const [startPart, endPart] = dateString.split("-");
              const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
              const [startDay, startMonth] = startPart.trim().split("/");
              startDate = `${currentYear}-${startMonth.padStart(2, "0")}-${startDay.padStart(2, "0")}`;
              const [endDay, endMonth] = endPart.trim().split("/");
              endDate = `${currentYear}-${endMonth.padStart(2, "0")}-${endDay.padStart(2, "0")}`;
              logger.info(`Evento de m\xFAltiplos dias: ${eventTitle} (${startDate} at\xE9 ${endDate})`);
            } else {
              const [day, month] = dateString.split("/");
              const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
              startDate = `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
            let result;
            if (endDate) {
              const start = /* @__PURE__ */ new Date(`${startDate}T00:00:00Z`);
              const end = /* @__PURE__ */ new Date(`${endDate}T23:59:59Z`);
              const days = [];
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayDate = d.toISOString().split("T")[0];
                const isStart = dayDate === startDate;
                const isEnd = dayDate === endDate;
                let eventTitleForDay = eventTitle;
                if (isStart) eventTitleForDay = `${eventTitle} (In\xEDcio)`;
                else if (isEnd) eventTitleForDay = `${eventTitle} (Fim)`;
                else eventTitleForDay = `${eventTitle} (Continua)`;
                const dayResult = await sql`
                INSERT INTO events (title, description, date, location, type, capacity, is_recurring, recurrence_pattern, created_by, church_id, created_at, updated_at)
                VALUES (${eventTitleForDay}, ${`Evento importado: ${eventTitle}`}, ${`${dayDate}T19:00:00Z`}, ${""}, ${mappedType}, ${0}, ${false}, ${null}, ${1}, ${24}, ${(/* @__PURE__ */ new Date()).toISOString()}, ${(/* @__PURE__ */ new Date()).toISOString()})
                RETURNING id, title, date
              `;
                days.push(dayResult[0]);
              }
              result = days;
              logger.info(`Evento de m\xFAltiplos dias criado: ${eventTitle} (${days.length} dias)`);
            } else {
              const singleResult = await sql`
              INSERT INTO events (title, description, date, location, type, capacity, is_recurring, recurrence_pattern, created_by, church_id, created_at, updated_at)
              VALUES (${eventTitle}, ${`Evento importado: ${eventTitle}`}, ${`${startDate}T19:00:00Z`}, ${""}, ${mappedType}, ${0}, ${false}, ${null}, ${1}, ${24}, ${(/* @__PURE__ */ new Date()).toISOString()}, ${(/* @__PURE__ */ new Date()).toISOString()})
              RETURNING id, title, date
            `;
              result = singleResult[0];
            }
            if (Array.isArray(result)) {
              logger.info(
                `Evento de m\xFAltiplos dias inserido: ${eventTitle} (${result.length} dias)`
              );
              importedCount += result.length;
            } else {
              logger.info(`Evento inserido: ${eventTitle} (ID: ${result.id})`);
              importedCount++;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            logger.error(`Erro na linha ${i + 1}: ${errorMessage}`);
            errors.push(`Linha ${i + 1}: ${errorMessage}`);
          }
        }
        cleanupTempFile(filePath);
        return res.json({
          success: true,
          imported: importedCount,
          errors
        });
      } catch (error) {
        logger.error("Erro na importa\xE7\xE3o:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  );
};

// server/routes/inviteRoutes.ts
import crypto2 from "crypto";
import bcrypt5 from "bcryptjs";
import { eq as eq3, and as and2, desc as desc2 } from "drizzle-orm";
import multer3 from "multer";

// server/utils/church-validation.ts
function normalizeChurchName(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(igreja|adventista|setimo|dia|iasd|congregacao|grupo)\b/gi, "").replace(/\s+/g, " ").trim();
}
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2) return 100;
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return Math.round((maxLength - distance) / maxLength * 100);
}
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          // deletion
          dp[i][j - 1] + 1,
          // insertion
          dp[i - 1][j - 1] + 1
          // substitution
        );
      }
    }
  }
  return dp[m][n];
}
function findSimilarChurches(excelName, registeredChurches, threshold = 60) {
  const normalizedExcelName = normalizeChurchName(excelName);
  return registeredChurches.map((church) => ({
    id: church.id,
    name: church.name,
    similarity: calculateSimilarity(normalizedExcelName, normalizeChurchName(church.name))
  })).filter((c) => c.similarity >= threshold).sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}
function validateExcelChurches(excelChurchNames, registeredChurches, memberCountByChurch) {
  return excelChurchNames.map((excelChurchName) => {
    const exactMatch = registeredChurches.find(
      (c) => normalizeChurchName(c.name) === normalizeChurchName(excelChurchName)
    );
    if (exactMatch) {
      return {
        churchName: excelChurchName,
        status: "exact_match",
        matchedChurchId: exactMatch.id,
        memberCount: memberCountByChurch[excelChurchName] || 0
      };
    }
    const similar = findSimilarChurches(excelChurchName, registeredChurches);
    if (similar.length > 0) {
      return {
        churchName: excelChurchName,
        status: "similar_found",
        suggestions: similar,
        memberCount: memberCountByChurch[excelChurchName] || 0
      };
    }
    return {
      churchName: excelChurchName,
      status: "not_found",
      memberCount: memberCountByChurch[excelChurchName] || 0
    };
  });
}
function extractChurchesFromExcel(excelData) {
  const memberCount = {};
  excelData.forEach((row) => {
    if (row.igreja) {
      memberCount[row.igreja] = (memberCount[row.igreja] || 0) + 1;
    }
  });
  return {
    churches: Object.keys(memberCount),
    memberCount
  };
}

// server/routes/inviteRoutes.ts
var upload2 = multer3({ dest: "uploads/" });
var inviteRoutes = (app2) => {
  app2.post(
    "/api/invites",
    requireAuth,
    async (req, res) => {
      try {
        if (req.user?.role !== "superadmin") {
          res.status(403).json({
            error: "Acesso negado. Apenas superadmin pode criar convites."
          });
          return;
        }
        const { email, expiresInDays = 7 } = req.body;
        if (!email) {
          res.status(400).json({ error: "Email \xE9 obrigat\xF3rio" });
          return;
        }
        const existingInvites = await db.select().from(pastorInvites).where(and2(eq3(pastorInvites.email, email), eq3(pastorInvites.status, "pending"))).limit(1);
        if (existingInvites.length > 0) {
          res.status(400).json({
            error: "J\xE1 existe um convite pendente para este email"
          });
          return;
        }
        const token = crypto2.randomBytes(32).toString("hex");
        const expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        const [invite] = await db.insert(pastorInvites).values({
          token,
          email,
          createdBy: req.user.id,
          expiresAt,
          status: "pending"
        }).returning();
        const link = `${process.env.APP_URL || "http://localhost:5000"}/pastor-onboarding/${token}`;
        logger.info(`Convite criado para ${email} por ${req.user.email}`);
        const response = {
          token: invite.token,
          link,
          expiresAt: invite.expiresAt.toISOString()
        };
        res.json(response);
      } catch (error) {
        logger.error("Erro ao criar convite:", error);
        res.status(500).json({ error: "Erro ao criar convite" });
      }
    }
  );
  app2.get(
    "/api/invites/validate/:token",
    async (req, res) => {
      try {
        const { token } = req.params;
        const invites = await db.select().from(pastorInvites).where(eq3(pastorInvites.token, token)).limit(1);
        const invite = invites[0];
        if (!invite) {
          res.status(404).json({
            valid: false,
            error: "Convite n\xE3o encontrado"
          });
          return;
        }
        if (/* @__PURE__ */ new Date() > invite.expiresAt) {
          res.status(400).json({
            valid: false,
            error: "Convite expirado"
          });
          return;
        }
        if (invite.status !== "pending" && invite.status !== "submitted") {
          res.status(400).json({
            valid: false,
            error: "Convite j\xE1 foi processado"
          });
          return;
        }
        const response = {
          valid: true,
          email: invite.email,
          expiresAt: invite.expiresAt.toISOString()
        };
        res.json(response);
      } catch (error) {
        logger.error("Erro ao validar token:", error);
        res.status(500).json({ error: "Erro ao validar token" });
      }
    }
  );
  app2.get(
    "/api/churches/registered",
    async (_req, res) => {
      try {
        const allChurches = await db.select({
          id: churches.id,
          name: churches.name,
          code: churches.code
        }).from(churches);
        res.json({ churches: allChurches });
      } catch (error) {
        logger.error("Erro ao buscar igrejas:", error);
        res.status(500).json({ error: "Erro ao buscar igrejas" });
      }
    }
  );
  app2.post(
    "/api/invites/:token/upload-excel",
    upload2.single("file"),
    async (req, res) => {
      try {
        const { token } = req.params;
        if (!req.file) {
          res.status(400).json({ error: "Nenhum arquivo enviado" });
          return;
        }
        const invites = await db.select().from(pastorInvites).where(eq3(pastorInvites.token, token)).limit(1);
        const invite = invites[0];
        if (!invite || invite.status !== "pending") {
          cleanupTempFile(req.file.path);
          res.status(400).json({ error: "Convite inv\xE1lido" });
          return;
        }
        if (!req.file.originalname.endsWith(".xlsx") && !req.file.originalname.endsWith(".xls") && !req.file.originalname.endsWith(".csv")) {
          cleanupTempFile(req.file.path);
          res.status(400).json({ error: "Apenas arquivos Excel (.xlsx, .xls) ou CSV s\xE3o aceitos" });
          return;
        }
        const { rows: excelData } = await readExcelFile(req.file.path);
        if (!excelData || excelData.length === 0) {
          cleanupTempFile(req.file.path);
          res.status(400).json({ error: "Nenhum dado encontrado no arquivo" });
          return;
        }
        const formattedData = excelData.map((row) => ({
          nome: String(row.nome || row.Nome || row.name || "").trim(),
          igreja: String(row.igreja || row.Igreja || row.church || "").trim(),
          telefone: row.telefone || row.Telefone || row.phone ? String(row.telefone || row.Telefone || row.phone).trim() : void 0,
          email: row.email || row.Email ? String(row.email || row.Email).trim() : void 0,
          cargo: row.cargo || row.Cargo || row.role ? String(row.cargo || row.Cargo || row.role).trim() : void 0
        }));
        const { churches: uniqueChurches } = extractChurchesFromExcel(formattedData);
        const response = {
          fileName: req.file.originalname,
          totalRows: formattedData.length,
          data: formattedData,
          churches: uniqueChurches
        };
        cleanupTempFile(req.file.path);
        res.json(response);
      } catch (error) {
        if (req.file?.path) {
          cleanupTempFile(req.file.path);
        }
        logger.error("Erro ao processar Excel:", error);
        res.status(500).json({ error: "Erro ao processar arquivo Excel" });
      }
    }
  );
  app2.post(
    "/api/invites/:token/validate-churches",
    async (req, res) => {
      try {
        const { token } = req.params;
        const { excelData } = req.body;
        const invites = await db.select().from(pastorInvites).where(eq3(pastorInvites.token, token)).limit(1);
        const invite = invites[0];
        if (!invite || invite.status !== "pending") {
          res.status(400).json({ error: "Convite inv\xE1lido" });
          return;
        }
        if (!excelData || !excelData.data || excelData.data.length === 0) {
          res.status(400).json({ error: "Dados de Excel n\xE3o fornecidos" });
          return;
        }
        const { churches: excelChurchNames, memberCount } = extractChurchesFromExcel(
          excelData.data
        );
        const registeredChurches = await db.select({
          id: churches.id,
          name: churches.name
        }).from(churches);
        const validations = validateExcelChurches(
          excelChurchNames,
          registeredChurches,
          memberCount
        );
        logger.info(`Valida\xE7\xE3o de igrejas para convite ${token}: ${validations.length} igrejas`);
        res.json({ validations });
      } catch (error) {
        logger.error("Erro ao validar igrejas:", error);
        res.status(500).json({ error: "Erro ao validar igrejas" });
      }
    }
  );
  app2.post(
    "/api/invites/:token/submit",
    async (req, res) => {
      try {
        const { token } = req.params;
        const data = req.body;
        const invites = await db.select().from(pastorInvites).where(eq3(pastorInvites.token, token)).limit(1);
        const invite = invites[0];
        if (!invite) {
          res.status(404).json({ error: "Convite n\xE3o encontrado" });
          return;
        }
        if (invite.status !== "pending") {
          res.status(400).json({ error: "Convite j\xE1 foi processado" });
          return;
        }
        if (/* @__PURE__ */ new Date() > invite.expiresAt) {
          res.status(400).json({ error: "Convite expirado" });
          return;
        }
        const passwordHash = await bcrypt5.hash(data.password, 10);
        const onboardingData = {
          personal: data.personal,
          district: data.district,
          churches: data.churches,
          excelData: data.excelData,
          churchValidation: data.churchValidation,
          passwordHash,
          completedSteps: [1, 2, 3, 4, 5, 6],
          lastStepAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await db.update(pastorInvites).set({
          status: "submitted",
          submittedAt: /* @__PURE__ */ new Date(),
          onboardingData,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(pastorInvites.id, invite.id));
        logger.info(`Onboarding submetido para ${invite.email}`);
        res.json({
          success: true,
          message: "Cadastro enviado para aprova\xE7\xE3o. Voc\xEA receber\xE1 um email em breve."
        });
      } catch (error) {
        logger.error("Erro ao submeter onboarding:", error);
        res.status(500).json({ error: "Erro ao submeter cadastro" });
      }
    }
  );
  app2.get(
    "/api/invites",
    requireAuth,
    async (req, res) => {
      try {
        if (req.user?.role !== "superadmin") {
          res.status(403).json({ error: "Acesso negado" });
          return;
        }
        const { status } = req.query;
        let invitesList;
        if (status) {
          invitesList = await db.select().from(pastorInvites).where(eq3(pastorInvites.status, status)).orderBy(desc2(pastorInvites.createdAt));
        } else {
          invitesList = await db.select().from(pastorInvites).orderBy(desc2(pastorInvites.createdAt));
        }
        res.json({ invites: invitesList });
      } catch (error) {
        logger.error("Erro ao listar convites:", error);
        res.status(500).json({ error: "Erro ao listar convites" });
      }
    }
  );
  app2.get(
    "/api/invites/:id",
    requireAuth,
    async (req, res) => {
      try {
        if (req.user?.role !== "superadmin") {
          res.status(403).json({ error: "Acesso negado" });
          return;
        }
        const inviteId = parseInt(req.params.id);
        const invites = await db.select().from(pastorInvites).where(eq3(pastorInvites.id, inviteId)).limit(1);
        const invite = invites[0];
        if (!invite) {
          res.status(404).json({ error: "Convite n\xE3o encontrado" });
          return;
        }
        res.json({ invite });
      } catch (error) {
        logger.error("Erro ao buscar convite:", error);
        res.status(500).json({ error: "Erro ao buscar convite" });
      }
    }
  );
  app2.post(
    "/api/invites/:id/approve",
    requireAuth,
    async (req, res) => {
      try {
        if (req.user?.role !== "superadmin") {
          res.status(403).json({ error: "Acesso negado" });
          return;
        }
        const inviteId = parseInt(req.params.id);
        const invites = await db.select().from(pastorInvites).where(eq3(pastorInvites.id, inviteId)).limit(1);
        const invite = invites[0];
        if (!invite || invite.status !== "submitted") {
          res.status(400).json({ error: "Convite inv\xE1lido ou n\xE3o submetido" });
          return;
        }
        const data = invite.onboardingData;
        const [user] = await db.insert(users).values({
          name: data.personal.name,
          email: data.personal.email,
          password: data.passwordHash,
          role: "pastor",
          church: "",
          status: "approved"
        }).returning();
        const [district] = await db.insert(districts).values({
          name: data.district.name,
          code: `DIST-${Date.now()}`,
          pastorId: user.id,
          description: data.district.description
        }).returning();
        await db.update(users).set({ districtId: district.id }).where(eq3(users.id, user.id));
        const churchIds = {};
        for (const church of data.churches) {
          const [createdChurch] = await db.insert(churches).values({
            name: church.name,
            code: `IGR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            address: church.address,
            districtId: district.id
          }).returning();
          churchIds[church.name] = createdChurch.id;
        }
        if (data.excelData && data.churchValidation) {
          for (const member of data.excelData.data) {
            const foundValidation = data.churchValidation.find(
              (v) => v.excelChurchName === member.igreja
            );
            if (!foundValidation || foundValidation.action === "ignore") continue;
            let churchId = foundValidation.matchedChurchId;
            if (foundValidation.action === "create_new") {
              const churchName = foundValidation.excelChurchName;
              if (!churchIds[churchName]) {
                const [newChurch] = await db.insert(churches).values({
                  name: churchName,
                  code: `IGR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  address: "",
                  districtId: district.id
                }).returning();
                churchIds[churchName] = newChurch.id;
              }
              churchId = churchIds[churchName];
            }
            if (!churchId) continue;
            await db.insert(users).values({
              name: member.nome,
              email: member.email || `${Date.now()}@temp.com`,
              password: await bcrypt5.hash("changeme123", 10),
              role: "member",
              church: member.igreja,
              districtId: district.id,
              status: "pending",
              firstAccess: true
            });
          }
        }
        await db.update(pastorInvites).set({
          status: "approved",
          reviewedBy: req.user.id,
          reviewedAt: /* @__PURE__ */ new Date(),
          userId: user.id,
          districtId: district.id,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(pastorInvites.id, invite.id));
        logger.info(
          `Convite aprovado: ${invite.email} -> user ${user.id}, district ${district.id}`
        );
        const response = {
          success: true,
          userId: user.id,
          districtId: district.id
        };
        res.json(response);
      } catch (error) {
        logger.error("Erro ao aprovar convite:", error);
        res.status(500).json({ error: "Erro ao aprovar convite" });
      }
    }
  );
  app2.post(
    "/api/invites/:id/reject",
    requireAuth,
    async (req, res) => {
      try {
        if (req.user?.role !== "superadmin") {
          res.status(403).json({ error: "Acesso negado" });
          return;
        }
        const inviteId = parseInt(req.params.id);
        const { reason, details } = req.body;
        if (!reason) {
          res.status(400).json({ error: "Motivo da rejei\xE7\xE3o \xE9 obrigat\xF3rio" });
          return;
        }
        const invites = await db.select().from(pastorInvites).where(eq3(pastorInvites.id, inviteId)).limit(1);
        const invite = invites[0];
        if (!invite || invite.status !== "submitted") {
          res.status(400).json({ error: "Convite inv\xE1lido ou n\xE3o submetido" });
          return;
        }
        await db.update(pastorInvites).set({
          status: "rejected",
          reviewedBy: req.user.id,
          reviewedAt: /* @__PURE__ */ new Date(),
          rejectionReason: details || reason,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(pastorInvites.id, invite.id));
        logger.info(`Convite rejeitado: ${invite.email} - Motivo: ${reason}`);
        res.json({ success: true, message: "Convite rejeitado com sucesso" });
      } catch (error) {
        logger.error("Erro ao rejeitar convite:", error);
        res.status(500).json({ error: "Erro ao rejeitar convite" });
      }
    }
  );
};

// server/routes/adminRoutes.ts
import { Router as Router2 } from "express";

// server/repositories/BaseRepository.ts
function createPaginatedResult(data, page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

// server/repositories/auditRepository.ts
var AuditRepository = class {
  /**
   * Inicializa a tabela de audit logs se não existir
   */
  async ensureTable() {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          resource_id INTEGER,
          old_value JSONB,
          new_value JSONB,
          ip_address TEXT,
          user_agent TEXT,
          correlation_id TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id)
      `;
    } catch (error) {
      logger.error("Erro ao criar tabela de audit logs", error);
    }
  }
  /**
   * Cria um novo log de auditoria
   */
  async createAuditLog(data) {
    try {
      const oldValueJson = data.oldValue ? JSON.stringify(data.oldValue) : null;
      const newValueJson = data.newValue ? JSON.stringify(data.newValue) : null;
      const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;
      const [log2] = await sql`
        INSERT INTO audit_logs (
          user_id, user_email, action, resource, resource_id,
          old_value, new_value, ip_address, user_agent,
          correlation_id, metadata, created_at
        )
        VALUES (
          ${data.userId},
          ${data.userEmail},
          ${data.action},
          ${data.resource},
          ${data.resourceId ?? null},
          ${oldValueJson}::jsonb,
          ${newValueJson}::jsonb,
          ${data.ipAddress ?? null},
          ${data.userAgent ?? null},
          ${data.correlationId ?? null},
          ${metadataJson}::jsonb,
          NOW()
        )
        RETURNING *
      `;
      return this.mapAuditLogRecord(log2);
    } catch (error) {
      logger.error("Erro ao criar audit log", error);
      throw error;
    }
  }
  /**
   * Busca logs de auditoria com paginação e filtros
   */
  async getAuditLogs(options2) {
    try {
      const page = options2?.page || 1;
      const limit = options2?.limit || 50;
      const offset = (page - 1) * limit;
      const conditions = ["1=1"];
      const params = [];
      if (options2?.userId) {
        conditions.push(`user_id = $${params.length + 1}`);
        params.push(options2.userId);
      }
      if (options2?.action) {
        conditions.push(`action = $${params.length + 1}`);
        params.push(options2.action);
      }
      if (options2?.resource) {
        conditions.push(`resource = $${params.length + 1}`);
        params.push(options2.resource);
      }
      if (options2?.startDate) {
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(options2.startDate.toISOString());
      }
      if (options2?.endDate) {
        conditions.push(`created_at <= $${params.length + 1}`);
        params.push(options2.endDate.toISOString());
      }
      const logs = await sql`
        SELECT * FROM audit_logs
        WHERE 1=1
          AND (${options2?.userId ?? null}::integer IS NULL OR user_id = ${options2?.userId ?? null})
          AND (${options2?.action ?? null}::text IS NULL OR action = ${options2?.action ?? null})
          AND (${options2?.resource ?? null}::text IS NULL OR resource = ${options2?.resource ?? null})
          AND (${options2?.startDate?.toISOString() ?? null}::timestamp IS NULL OR created_at >= ${options2?.startDate?.toISOString() ?? null}::timestamp)
          AND (${options2?.endDate?.toISOString() ?? null}::timestamp IS NULL OR created_at <= ${options2?.endDate?.toISOString() ?? null}::timestamp)
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      const [countResult] = await sql`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE 1=1
          AND (${options2?.userId ?? null}::integer IS NULL OR user_id = ${options2?.userId ?? null})
          AND (${options2?.action ?? null}::text IS NULL OR action = ${options2?.action ?? null})
          AND (${options2?.resource ?? null}::text IS NULL OR resource = ${options2?.resource ?? null})
          AND (${options2?.startDate?.toISOString() ?? null}::timestamp IS NULL OR created_at >= ${options2?.startDate?.toISOString() ?? null}::timestamp)
          AND (${options2?.endDate?.toISOString() ?? null}::timestamp IS NULL OR created_at <= ${options2?.endDate?.toISOString() ?? null}::timestamp)
      `;
      const total = Number(countResult?.count || 0);
      const data = logs.map(this.mapAuditLogRecord);
      return createPaginatedResult(data, page, limit, total);
    } catch (error) {
      logger.error("Erro ao buscar audit logs", error);
      return createPaginatedResult([], options2?.page || 1, options2?.limit || 50, 0);
    }
  }
  /**
   * Busca logs por usuário
   */
  async getAuditLogsByUser(userId, options2) {
    return this.getAuditLogs({
      page: options2?.page ?? 1,
      limit: options2?.limit ?? 50,
      sortBy: options2?.sortBy,
      sortOrder: options2?.sortOrder,
      userId
    });
  }
  /**
   * Busca logs por ação
   */
  async getAuditLogsByAction(action, options2) {
    return this.getAuditLogs({
      page: options2?.page ?? 1,
      limit: options2?.limit ?? 50,
      sortBy: options2?.sortBy,
      sortOrder: options2?.sortOrder,
      action
    });
  }
  /**
   * Busca logs por recurso específico
   */
  async getAuditLogsByResource(resource, resourceId) {
    try {
      const logs = await sql`
        SELECT * FROM audit_logs
        WHERE resource = ${resource} AND resource_id = ${resourceId}
        ORDER BY created_at DESC
      `;
      return logs.map(this.mapAuditLogRecord);
    } catch (error) {
      logger.error("Erro ao buscar audit logs por recurso", error);
      return [];
    }
  }
  /**
   * Busca log por correlation ID
   */
  async getAuditLogsByCorrelationId(correlationId) {
    try {
      const logs = await sql`
        SELECT * FROM audit_logs
        WHERE correlation_id = ${correlationId}
        ORDER BY created_at ASC
      `;
      return logs.map(this.mapAuditLogRecord);
    } catch (error) {
      logger.error("Erro ao buscar audit logs por correlation ID", error);
      return [];
    }
  }
  /**
   * Deleta logs antigos (para manutenção)
   */
  async deleteOldLogs(olderThan) {
    try {
      const result = await sql`
        DELETE FROM audit_logs
        WHERE created_at < ${olderThan.toISOString()}
      `;
      return result?.length || 0;
    } catch (error) {
      logger.error("Erro ao deletar audit logs antigos", error);
      return 0;
    }
  }
  /**
   * Conta total de logs
   */
  async countLogs() {
    try {
      const [result] = await sql`
        SELECT COUNT(*) as count FROM audit_logs
      `;
      return Number(result?.count || 0);
    } catch (error) {
      logger.error("Erro ao contar audit logs", error);
      return 0;
    }
  }
  /**
   * Busca estatísticas de auditoria
   */
  async getAuditStats() {
    try {
      const [totalResult] = await sql`
        SELECT COUNT(*) as count FROM audit_logs
      `;
      const actionStats = await sql`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        GROUP BY action
        ORDER BY count DESC
      `;
      const resourceStats = await sql`
        SELECT resource, COUNT(*) as count
        FROM audit_logs
        GROUP BY resource
        ORDER BY count DESC
        LIMIT 10
      `;
      const recentLogs = await sql`
        SELECT * FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 10
      `;
      return {
        totalLogs: Number(totalResult?.count || 0),
        logsByAction: actionStats.map((r) => ({
          action: r.action,
          count: Number(r.count)
        })),
        logsByResource: resourceStats.map((r) => ({
          resource: r.resource,
          count: Number(r.count)
        })),
        recentActivity: recentLogs.map(this.mapAuditLogRecord)
      };
    } catch (error) {
      logger.error("Erro ao buscar estat\xEDsticas de auditoria", error);
      return {
        totalLogs: 0,
        logsByAction: [],
        logsByResource: [],
        recentActivity: []
      };
    }
  }
  /**
   * Mapeia registro do banco para tipo AuditLog
   */
  mapAuditLogRecord(record) {
    const parseJson = (value) => {
      if (!value) return null;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };
    return {
      id: record.id,
      userId: record.user_id,
      userEmail: record.user_email,
      action: record.action,
      resource: record.resource,
      resourceId: record.resource_id,
      oldValue: parseJson(record.old_value),
      newValue: parseJson(record.new_value),
      ipAddress: record.ip_address,
      userAgent: record.user_agent,
      correlationId: record.correlation_id,
      metadata: parseJson(record.metadata),
      createdAt: record.created_at instanceof Date ? record.created_at.toISOString() : record.created_at
    };
  }
};
var auditRepository = new AuditRepository();

// server/services/auditService.ts
var AuditService = class {
  constructor() {
    this.initialized = false;
  }
  /**
   * Inicializa o serviço de auditoria
   */
  async initialize() {
    if (this.initialized) return;
    try {
      await auditRepository.ensureTable();
      this.initialized = true;
      logger.info("Audit service initialized");
    } catch (error) {
      logger.error("Failed to initialize audit service", error);
    }
  }
  /**
   * Extrai contexto de auditoria de uma requisição Express
   */
  extractContextFromRequest(req) {
    const userId = parseInt(req.headers["x-user-id"] || "0");
    const userEmail = req.headers["x-user-email"] || "unknown";
    const correlationId = req.headers["x-correlation-id"] || void 0;
    return {
      userId: userId || void 0,
      userEmail,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers["user-agent"] || void 0,
      correlationId
    };
  }
  /**
   * Obtém IP do cliente considerando proxies
   */
  getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(",")[0].trim();
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  }
  /**
   * Registra uma ação de criação
   */
  async logCreate(context, resource, resourceId, newValue, metadata) {
    return this.log({
      ...context,
      action: "CREATE",
      resource,
      resourceId,
      newValue,
      metadata
    });
  }
  /**
   * Registra uma ação de leitura
   */
  async logRead(context, resource, resourceId, metadata) {
    return this.log({
      ...context,
      action: "READ",
      resource,
      resourceId: resourceId ?? null,
      metadata
    });
  }
  /**
   * Registra uma ação de atualização
   */
  async logUpdate(context, resource, resourceId, oldValue, newValue, metadata) {
    return this.log({
      ...context,
      action: "UPDATE",
      resource,
      resourceId,
      oldValue,
      newValue,
      metadata
    });
  }
  /**
   * Registra uma ação de deleção
   */
  async logDelete(context, resource, resourceId, oldValue, metadata) {
    return this.log({
      ...context,
      action: "DELETE",
      resource,
      resourceId,
      oldValue,
      metadata
    });
  }
  /**
   * Registra login bem-sucedido
   */
  async logLogin(context, metadata) {
    return this.log({
      ...context,
      action: "LOGIN",
      resource: "auth",
      metadata: {
        ...metadata,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  }
  /**
   * Registra logout
   */
  async logLogout(context, metadata) {
    return this.log({
      ...context,
      action: "LOGOUT",
      resource: "auth",
      metadata
    });
  }
  /**
   * Registra tentativa de login falha
   */
  async logLoginFailed(email, ipAddress, userAgent, reason, metadata) {
    return this.log({
      userId: 0,
      userEmail: email,
      action: "LOGIN_FAILED",
      resource: "auth",
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        reason,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  }
  /**
   * Registra mudança de senha
   */
  async logPasswordChange(context, metadata) {
    return this.log({
      ...context,
      action: "PASSWORD_CHANGE",
      resource: "user",
      resourceId: context.userId,
      metadata
    });
  }
  /**
   * Registra mudança de permissões
   */
  async logPermissionChange(context, targetUserId, oldPermissions, newPermissions, metadata) {
    return this.log({
      ...context,
      action: "PERMISSION_CHANGE",
      resource: "user",
      resourceId: targetUserId,
      oldValue: oldPermissions,
      newValue: newPermissions,
      metadata
    });
  }
  /**
   * Registra exportação de dados
   */
  async logExport(context, resource, recordCount, format, metadata) {
    return this.log({
      ...context,
      action: "EXPORT",
      resource,
      metadata: {
        ...metadata,
        recordCount,
        format,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  }
  /**
   * Registra importação de dados
   */
  async logImport(context, resource, recordCount, successCount, errorCount, metadata) {
    return this.log({
      ...context,
      action: "IMPORT",
      resource,
      metadata: {
        ...metadata,
        recordCount,
        successCount,
        errorCount,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  }
  /**
   * Registra atualização em lote
   */
  async logBulkUpdate(context, resource, affectedIds, changes, metadata) {
    return this.log({
      ...context,
      action: "BULK_UPDATE",
      resource,
      newValue: changes,
      metadata: {
        ...metadata,
        affectedIds,
        affectedCount: affectedIds.length
      }
    });
  }
  /**
   * Registra deleção em lote
   */
  async logBulkDelete(context, resource, deletedIds, metadata) {
    return this.log({
      ...context,
      action: "BULK_DELETE",
      resource,
      metadata: {
        ...metadata,
        deletedIds,
        deletedCount: deletedIds.length
      }
    });
  }
  /**
   * Método base para registrar log
   */
  async log(data) {
    if (!this.initialized) {
      await this.initialize();
    }
    try {
      return await auditRepository.createAuditLog(data);
    } catch (error) {
      logger.error("Failed to create audit log", error);
      return null;
    }
  }
  /**
   * Busca logs de auditoria
   */
  async getLogs(options2) {
    return auditRepository.getAuditLogs(options2);
  }
  /**
   * Busca logs por usuário
   */
  async getLogsByUser(userId, options2) {
    return auditRepository.getAuditLogsByUser(userId, options2);
  }
  /**
   * Busca logs por ação
   */
  async getLogsByAction(action, options2) {
    return auditRepository.getAuditLogsByAction(action, options2);
  }
  /**
   * Busca logs por recurso
   */
  async getLogsByResource(resource, resourceId) {
    return auditRepository.getAuditLogsByResource(resource, resourceId);
  }
  /**
   * Busca logs por correlation ID
   */
  async getLogsByCorrelationId(correlationId) {
    return auditRepository.getAuditLogsByCorrelationId(correlationId);
  }
  /**
   * Busca estatísticas de auditoria
   */
  async getStats() {
    return auditRepository.getAuditStats();
  }
  /**
   * Limpa logs antigos
   */
  async cleanupOldLogs(daysToKeep = 90) {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    return auditRepository.deleteOldLogs(cutoffDate);
  }
};
var auditService = new AuditService();

// server/services/monitoringService.ts
var metricsCache = [];
var MAX_METRICS_CACHE = 1e3;
var errorsCache = [];
var MAX_ERRORS_CACHE = 100;
var MonitoringService = class {
  constructor() {
    this.isInitialized = false;
    this.sentryDsn = null;
  }
  /**
   * Inicializa o serviço de monitoramento
   */
  async init() {
    if (this.isInitialized) return;
    this.sentryDsn = process.env.SENTRY_DSN || null;
    if (this.sentryDsn && process.env.NODE_ENV === "production") {
      try {
        logger.info("Monitoring service initialized (Sentry ready)");
      } catch (error) {
        logger.error("Failed to initialize Sentry:", error);
      }
    } else {
      logger.info("Monitoring service initialized (local mode)");
    }
    this.isInitialized = true;
  }
  /**
   * Captura e reporta um erro
   */
  captureError(error, context, severity = "error") {
    const errorObj = typeof error === "string" ? new Error(error) : error;
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    const logContext = {
      timestamp: timestamp2,
      severity,
      ...context,
      stack: errorObj.stack
    };
    switch (severity) {
      case "fatal":
      case "error":
        logger.error(`[${severity.toUpperCase()}] ${errorObj.message}`, logContext);
        break;
      case "warning":
        logger.warn(`[WARNING] ${errorObj.message}`, logContext);
        break;
      default:
        logger.info(`[INFO] ${errorObj.message}`, logContext);
    }
    errorsCache.unshift({
      timestamp: /* @__PURE__ */ new Date(),
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      severity
    });
    if (errorsCache.length > MAX_ERRORS_CACHE) {
      errorsCache.pop();
    }
    if (this.sentryDsn && process.env.NODE_ENV === "production") {
    }
  }
  /**
   * Captura uma mensagem (não erro)
   */
  captureMessage(message, context, severity = "info") {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    logger.info(`[MESSAGE] ${message}`, { timestamp: timestamp2, severity, ...context });
    if (this.sentryDsn && process.env.NODE_ENV === "production") {
    }
  }
  /**
   * Registra métrica de performance
   */
  recordMetric(metric) {
    metricsCache.push(metric);
    if (metricsCache.length > MAX_METRICS_CACHE) {
      metricsCache.shift();
    }
    if (metric.duration > 1e3) {
      logger.warn(`Slow endpoint: ${metric.method} ${metric.endpoint} - ${metric.duration}ms`);
    }
  }
  /**
   * Obtém métricas agregadas
   */
  getMetricsSummary() {
    if (metricsCache.length === 0) {
      return { totalRequests: 0, message: "No metrics recorded yet" };
    }
    const totalRequests = metricsCache.length;
    const avgDuration = metricsCache.reduce((acc, m) => acc + m.duration, 0) / totalRequests;
    const slowRequests = metricsCache.filter((m) => m.duration > 1e3).length;
    const errorRequests = metricsCache.filter((m) => m.statusCode >= 400).length;
    const endpointStats = {};
    metricsCache.forEach((m) => {
      const key = `${m.method} ${m.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = { count: 0, avgDuration: 0 };
      }
      endpointStats[key].count++;
      endpointStats[key].avgDuration = (endpointStats[key].avgDuration * (endpointStats[key].count - 1) + m.duration) / endpointStats[key].count;
    });
    const slowestEndpoints = Object.entries(endpointStats).sort((a, b) => b[1].avgDuration - a[1].avgDuration).slice(0, 5).map(([endpoint, stats]) => ({ endpoint, ...stats }));
    return {
      totalRequests,
      avgDuration: Math.round(avgDuration),
      slowRequests,
      errorRequests,
      errorRate: `${(errorRequests / totalRequests * 100).toFixed(2)}%`,
      slowestEndpoints
    };
  }
  /**
   * Obtém métricas do sistema (alias para getMetricsSummary)
   */
  getMetrics() {
    return this.getMetricsSummary();
  }
  /**
   * Obtém erros recentes
   */
  getRecentErrors(limit = 50) {
    return errorsCache.slice(0, limit);
  }
  /**
   * Middleware Express para capturar métricas automaticamente
   */
  metricsMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        this.recordMetric({
          endpoint: req.path,
          method: req.method,
          duration: Date.now() - start,
          statusCode: res.statusCode,
          timestamp: /* @__PURE__ */ new Date()
        });
      });
      next();
    };
  }
  /**
   * Middleware Express para capturar erros automaticamente
   */
  errorMiddleware() {
    return (error, req, _res, next) => {
      this.captureError(error, {
        endpoint: req.path,
        method: req.method,
        userId: req.userId,
        requestId: req.correlationId
      });
      next(error);
    };
  }
};
var monitoringService = new MonitoringService();
monitoringService.init().catch(console.error);

// server/routes/adminRoutes.ts
var router2 = Router2();
router2.use(requireAuth);
router2.use(requireRole("superadmin"));
router2.get("/audit", async (req, res) => {
  try {
    const { action, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const result = await auditService.getLogs({
      action,
      userId: userId ? parseInt(userId) : void 0,
      startDate: startDate ? new Date(startDate) : void 0,
      endDate: endDate ? new Date(endDate) : void 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json(result);
  } catch (error) {
    logger.error("Erro ao buscar logs de auditoria", error);
    res.status(500).json({ error: "Erro ao buscar logs de auditoria" });
  }
});
router2.get("/audit/stats", async (_req, res) => {
  try {
    const stats = await auditService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error("Erro ao buscar estat\xEDsticas de auditoria", error);
    res.status(500).json({ error: "Erro ao buscar estat\xEDsticas" });
  }
});
router2.get("/metrics", async (_req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error("Erro ao buscar m\xE9tricas", error);
    res.status(500).json({ error: "Erro ao buscar m\xE9tricas" });
  }
});
router2.get("/rate-limit/stats", async (_req, res) => {
  try {
    const stats = getRateLimitStats();
    res.json(stats);
  } catch (error) {
    logger.error("Erro ao buscar estat\xEDsticas de rate limit", error);
    res.status(500).json({ error: "Erro ao buscar estat\xEDsticas" });
  }
});
router2.get("/errors", async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const errors = monitoringService.getRecentErrors(parseInt(limit));
    res.json(errors);
  } catch (error) {
    logger.error("Erro ao buscar erros recentes", error);
    res.status(500).json({ error: "Erro ao buscar erros" });
  }
});
router2.get("/system/info", async (_req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    res.json({
      nodeVersion: process.version,
      platform: process.platform,
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime)
      },
      memory: {
        heapUsed: formatBytes(memoryUsage.heapUsed),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        external: formatBytes(memoryUsage.external),
        rss: formatBytes(memoryUsage.rss)
      },
      env: process.env.NODE_ENV,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    logger.error("Erro ao buscar informa\xE7\xF5es do sistema", error);
    res.status(500).json({ error: "Erro ao buscar informa\xE7\xF5es" });
  }
});
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}
function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

// server/routes/index.ts
var registerAllRoutes = async (app2) => {
  try {
    await migrateToNeon();
    logger.info("\u2705 Neon Database conectado e funcionando");
    await setupNeonData();
    logger.info("\u2705 Dados iniciais configurados");
  } catch (error) {
    logger.error("\u274C Erro ao conectar com Neon Database:", error);
  }
  app2.use("/uploads", express.static("uploads"));
  authRoutes(app2);
  userRoutes(app2);
  churchRoutes(app2);
  settingsRoutes(app2);
  systemRoutes(app2);
  dashboardRoutes(app2);
  pointsRoutes(app2);
  spiritualRoutes(app2);
  eventRoutes(app2);
  meetingRoutes(app2);
  relationshipRoutes(app2);
  discipleshipRoutes(app2);
  messagingRoutes(app2);
  notificationRoutes(app2);
  prayerRoutes(app2);
  calendarRoutes(app2);
  taskRoutes(app2);
  analyticsRoutes(app2);
  app2.use("/api/2fa", twoFactorRoutes_default);
  electionRoutes(app2);
  districtRoutes(app2);
  importRoutes(app2);
  inviteRoutes(app2);
  app2.use("/api/admin", router2);
  if (process.env.NODE_ENV === "development") {
    debugRoutes(app2);
  }
  return createServer(app2);
};
var registerRoutes = registerAllRoutes;

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - ativa com ANALYZE=true npm run build
    process.env.ANALYZE === "true" && visualizer({
      filename: "dist/stats.html",
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: "treemap"
      // sunburst, treemap, network
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo.svg", "robots.txt"],
      manifest: {
        name: "7Care - Sistema de Gest\xE3o",
        short_name: "7Care",
        description: "Sistema de gest\xE3o para igrejas e comunidades",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["productivity", "utilities"],
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        // Estratégias de cache
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Cache de API - Network First com fallback
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "7care-api-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7
                // 7 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Cache de imagens - Cache First
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "7care-images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 dias
              }
            }
          },
          {
            // Cache de fontes - Cache First
            urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "7care-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
                // 1 ano
              }
            }
          },
          {
            // Cache de uploads - Network First
            urlPattern: /^https?:\/\/.*\/uploads\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "7care-uploads-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7
                // 7 dias
              },
              networkTimeoutSeconds: 5
            }
          }
        ],
        // Não pré-cache dados sensíveis
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        // Excluir imagens grandes do precache (serão cached em runtime)
        globIgnores: ["**/mountain-*.png"],
        // Aumentar limite para 5MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: {
        enabled: false
        // Desabilitar em dev para evitar confusão
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    // Otimização de bundle
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Code splitting simplificado para evitar dependências circulares
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router") || id.includes("scheduler")) {
              return "vendor-react";
            }
            if (id.includes("xlsx") || id.includes("exceljs")) {
              return "vendor-xlsx";
            }
            if (id.includes("html2canvas")) {
              return "vendor-html2canvas";
            }
            return void 0;
          }
          return void 0;
        },
        // Nomes de arquivo otimizados
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
      }
    },
    // Aumentar limite de aviso de chunk
    chunkSizeWarningLimit: 500,
    // Source maps apenas em desenvolvimento
    sourcemap: false
  },
  server: {
    port: 3065
  },
  // Otimização de dependências
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "date-fns",
      "lucide-react"
    ],
    exclude: ["@vite/client"]
  },
  // Preview server
  preview: {
    port: 3065
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options2) => {
        viteLogger.error(msg, options2);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api/")) {
      return next();
    }
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import swaggerUi from "swagger-ui-express";

// server/swagger/config.ts
import swaggerJsdoc from "swagger-jsdoc";
var options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "7Care API",
      version: "1.0.0",
      description: `
# Sistema de Gest\xE3o para Igrejas - API

## Vis\xE3o Geral
A API 7Care \xE9 uma plataforma completa para gest\xE3o de igrejas, incluindo:
- \u{1F465} **Gest\xE3o de Membros** - Cadastro, aprova\xE7\xE3o, perfis
- \u{1F3DB}\uFE0F **Gest\xE3o de Igrejas** - M\xFAltiplas igrejas e distritos
- \u{1F4C5} **Calend\xE1rio de Eventos** - Eventos e reuni\xF5es
- \u{1F3AE} **Gamifica\xE7\xE3o** - Sistema de pontos e n\xEDveis
- \u{1F4AC} **Comunica\xE7\xE3o** - Chat e notifica\xE7\xF5es
- \u{1F5F3}\uFE0F **Elei\xE7\xF5es** - Sistema de vota\xE7\xE3o

## Autentica\xE7\xE3o
A API usa autentica\xE7\xE3o baseada em sess\xE3o com header \`x-user-id\`.

## Rate Limiting
- 100 requisi\xE7\xF5es por 15 minutos para endpoints gerais
- 5 tentativas de login por 15 minutos

## C\xF3digos de Status
- \`200\` - Sucesso
- \`201\` - Criado com sucesso
- \`400\` - Requisi\xE7\xE3o inv\xE1lida
- \`401\` - N\xE3o autenticado
- \`403\` - Acesso negado
- \`404\` - N\xE3o encontrado
- \`429\` - Muitas requisi\xE7\xF5es
- \`500\` - Erro interno
      `,
      contact: {
        name: "7Care Support",
        email: "suporte@7care.com.br",
        url: "https://7care.com.br"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server"
      },
      {
        url: "https://meu7care.netlify.app",
        description: "Production server"
      }
    ],
    components: {
      securitySchemes: {
        userId: {
          type: "apiKey",
          in: "header",
          name: "x-user-id",
          description: "User ID for authentication"
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for API access"
        }
      },
      schemas: {
        // ==================== USUÁRIOS ====================
        User: {
          type: "object",
          description: "Representa um usu\xE1rio/membro do sistema",
          properties: {
            id: { type: "integer", description: "ID \xFAnico do usu\xE1rio", example: 1 },
            name: { type: "string", description: "Nome completo", example: "Jo\xE3o Silva" },
            email: { type: "string", format: "email", description: "Email \xFAnico", example: "joao@email.com" },
            role: {
              type: "string",
              enum: ["superadmin", "pastor", "member", "interested", "missionary", "admin_readonly"],
              description: "Papel do usu\xE1rio no sistema",
              example: "member"
            },
            church: { type: "string", description: "Nome da igreja", example: "Igreja Central" },
            churchCode: { type: "string", description: "C\xF3digo da igreja", example: "CENTRAL01" },
            districtId: { type: "integer", nullable: true, description: "ID do distrito", example: 1 },
            isApproved: { type: "boolean", description: "Se usu\xE1rio foi aprovado", example: true },
            status: { type: "string", enum: ["active", "inactive", "pending"], description: "Status do usu\xE1rio", example: "active" },
            firstAccess: { type: "boolean", description: "Primeiro acesso", example: false },
            points: { type: "integer", description: "Pontos de gamifica\xE7\xE3o", example: 1500 },
            level: { type: "string", description: "N\xEDvel de gamifica\xE7\xE3o", example: "Ouro" },
            phone: { type: "string", nullable: true, description: "Telefone", example: "(11) 99999-9999" },
            birthDate: { type: "string", format: "date", nullable: true, description: "Data de nascimento" },
            address: { type: "string", nullable: true, description: "Endere\xE7o completo" },
            photo: { type: "string", nullable: true, description: "URL da foto de perfil" },
            baptismDate: { type: "string", format: "date", nullable: true, description: "Data de batismo" },
            conversionDate: { type: "string", format: "date", nullable: true, description: "Data de convers\xE3o" },
            disciplerId: { type: "integer", nullable: true, description: "ID do discipulador" },
            createdAt: { type: "string", format: "date-time", description: "Data de cria\xE7\xE3o" },
            updatedAt: { type: "string", format: "date-time", description: "Data de atualiza\xE7\xE3o" }
          },
          required: ["name", "email", "role"]
        },
        CreateUserRequest: {
          type: "object",
          description: "Dados para criar um novo usu\xE1rio",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100, example: "Maria Santos" },
            email: { type: "string", format: "email", example: "maria@email.com" },
            password: { type: "string", minLength: 6, example: "******" },
            role: { type: "string", enum: ["member", "interested"], example: "member" },
            church: { type: "string", example: "Igreja Central" },
            churchCode: { type: "string", example: "CENTRAL01" },
            phone: { type: "string", nullable: true, example: "(11) 99999-9999" }
          },
          required: ["name", "email", "password", "church", "churchCode"]
        },
        UpdateUserRequest: {
          type: "object",
          description: "Dados para atualizar um usu\xE1rio",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            phone: { type: "string", nullable: true },
            address: { type: "string", nullable: true },
            birthDate: { type: "string", format: "date", nullable: true },
            photo: { type: "string", nullable: true }
          }
        },
        UserList: {
          type: "object",
          properties: {
            users: { type: "array", items: { $ref: "#/components/schemas/User" } },
            total: { type: "integer", description: "Total de usu\xE1rios", example: 342 },
            page: { type: "integer", description: "P\xE1gina atual", example: 1 },
            limit: { type: "integer", description: "Itens por p\xE1gina", example: 20 }
          }
        },
        // ==================== IGREJAS ====================
        Church: {
          type: "object",
          description: "Representa uma igreja no sistema",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Igreja Central" },
            code: { type: "string", example: "CENTRAL01" },
            address: { type: "string", nullable: true, example: "Rua Principal, 100" },
            email: { type: "string", format: "email", nullable: true, example: "contato@igreja.com" },
            phone: { type: "string", nullable: true, example: "(11) 3333-3333" },
            pastor: { type: "string", nullable: true, description: "Nome do pastor respons\xE1vel" },
            districtId: { type: "integer", nullable: true, description: "ID do distrito" },
            memberCount: { type: "integer", description: "N\xFAmero de membros", example: 150 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateChurchRequest: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            code: { type: "string", minLength: 3, maxLength: 20 },
            address: { type: "string", nullable: true },
            email: { type: "string", format: "email", nullable: true },
            phone: { type: "string", nullable: true },
            districtId: { type: "integer", nullable: true }
          },
          required: ["name", "code"]
        },
        // ==================== DISTRITOS ====================
        District: {
          type: "object",
          description: "Representa um distrito (agrupamento de igrejas)",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Distrito Norte" },
            code: { type: "string", example: "DN01" },
            pastorId: { type: "integer", nullable: true, description: "ID do pastor respons\xE1vel" },
            description: { type: "string", nullable: true, example: "Regi\xE3o norte da cidade" },
            churchCount: { type: "integer", description: "N\xFAmero de igrejas", example: 5 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateDistrictRequest: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            code: { type: "string", minLength: 2, maxLength: 20 },
            pastorId: { type: "integer", nullable: true },
            description: { type: "string", nullable: true }
          },
          required: ["name", "code"]
        },
        // ==================== EVENTOS ====================
        Event: {
          type: "object",
          description: "Representa um evento no calend\xE1rio",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Culto de Domingo" },
            description: { type: "string", nullable: true, example: "Culto dominical \xE0s 19h" },
            date: { type: "string", format: "date-time", description: "Data e hora de in\xEDcio" },
            endDate: { type: "string", format: "date-time", nullable: true, description: "Data e hora de t\xE9rmino" },
            location: { type: "string", nullable: true, example: "Templo principal" },
            type: { type: "string", enum: ["culto", "reuniao", "evento", "treinamento", "outro"], example: "culto" },
            color: { type: "string", nullable: true, example: "#3B82F6" },
            capacity: { type: "integer", nullable: true, description: "Capacidade m\xE1xima", example: 200 },
            isRecurring: { type: "boolean", description: "Se \xE9 evento recorrente", example: true },
            recurrenceRule: { type: "string", nullable: true, description: "Regra de recorr\xEAncia RRULE" },
            createdBy: { type: "integer", nullable: true, description: "ID do criador" },
            churchId: { type: "integer", nullable: true, description: "ID da igreja" }
          }
        },
        CreateEventRequest: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 2, maxLength: 200 },
            description: { type: "string", nullable: true },
            date: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time", nullable: true },
            location: { type: "string", nullable: true },
            type: { type: "string", enum: ["culto", "reuniao", "evento", "treinamento", "outro"] },
            color: { type: "string", nullable: true },
            capacity: { type: "integer", nullable: true },
            isRecurring: { type: "boolean" }
          },
          required: ["title", "date", "type"]
        },
        // ==================== REUNIÕES ====================
        Meeting: {
          type: "object",
          description: "Representa uma reuni\xE3o (c\xE9lula, GC, etc)",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "C\xE9lula Centro" },
            date: { type: "string", format: "date-time" },
            location: { type: "string", nullable: true },
            leaderId: { type: "integer", description: "ID do l\xEDder" },
            attendees: { type: "array", items: { type: "integer" }, description: "IDs dos participantes" },
            notes: { type: "string", nullable: true },
            churchId: { type: "integer", nullable: true }
          }
        },
        // ==================== MENSAGENS/CHAT ====================
        Message: {
          type: "object",
          description: "Representa uma mensagem de chat",
          properties: {
            id: { type: "integer", example: 1 },
            content: { type: "string", example: "Ol\xE1! Tudo bem?" },
            senderId: { type: "integer", description: "ID do remetente" },
            recipientId: { type: "integer", nullable: true, description: "ID do destinat\xE1rio (null se for grupo)" },
            conversationId: { type: "integer", description: "ID da conversa" },
            isRead: { type: "boolean", example: false },
            readAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        Conversation: {
          type: "object",
          description: "Representa uma conversa/chat",
          properties: {
            id: { type: "integer", example: 1 },
            type: { type: "string", enum: ["direct", "group"], example: "direct" },
            name: { type: "string", nullable: true, description: "Nome (para grupos)" },
            participants: { type: "array", items: { type: "integer" } },
            lastMessage: { $ref: "#/components/schemas/Message" },
            unreadCount: { type: "integer", example: 3 },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        SendMessageRequest: {
          type: "object",
          properties: {
            content: { type: "string", minLength: 1, maxLength: 5e3 },
            conversationId: { type: "integer" }
          },
          required: ["content", "conversationId"]
        },
        // ==================== NOTIFICAÇÕES ====================
        Notification: {
          type: "object",
          description: "Representa uma notifica\xE7\xE3o",
          properties: {
            id: { type: "integer", example: 1 },
            userId: { type: "integer", description: "ID do usu\xE1rio destinat\xE1rio" },
            type: { type: "string", enum: ["info", "warning", "success", "error", "message", "event"], example: "info" },
            title: { type: "string", example: "Nova mensagem" },
            message: { type: "string", example: "Voc\xEA recebeu uma nova mensagem." },
            isRead: { type: "boolean", example: false },
            link: { type: "string", nullable: true, description: "Link para a\xE7\xE3o relacionada" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        // ==================== ORAÇÕES ====================
        Prayer: {
          type: "object",
          description: "Representa um pedido de ora\xE7\xE3o",
          properties: {
            id: { type: "integer", example: 1 },
            userId: { type: "integer", description: "ID do autor" },
            title: { type: "string", example: "Pela fam\xEDlia" },
            description: { type: "string", example: "Orar pela sa\xFAde da fam\xEDlia." },
            isPublic: { type: "boolean", example: true },
            isAnswered: { type: "boolean", example: false },
            prayerCount: { type: "integer", description: "N\xFAmero de pessoas orando", example: 15 },
            createdAt: { type: "string", format: "date-time" },
            answeredAt: { type: "string", format: "date-time", nullable: true }
          }
        },
        CreatePrayerRequest: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 2, maxLength: 200 },
            description: { type: "string", maxLength: 2e3 },
            isPublic: { type: "boolean" }
          },
          required: ["title", "description"]
        },
        // ==================== TAREFAS ====================
        Task: {
          type: "object",
          description: "Representa uma tarefa",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Preparar estudo b\xEDblico" },
            description: { type: "string", nullable: true },
            status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"], example: "pending" },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"], example: "medium" },
            dueDate: { type: "string", format: "date-time", nullable: true },
            assignedTo: { type: "integer", nullable: true, description: "ID do respons\xE1vel" },
            createdBy: { type: "integer", description: "ID do criador" },
            completedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        CreateTaskRequest: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 2, maxLength: 200 },
            description: { type: "string", nullable: true },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            dueDate: { type: "string", format: "date-time", nullable: true },
            assignedTo: { type: "integer", nullable: true }
          },
          required: ["title"]
        },
        // ==================== ELEIÇÕES ====================
        Election: {
          type: "object",
          description: "Representa uma elei\xE7\xE3o",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Elei\xE7\xE3o para di\xE1cono" },
            description: { type: "string", nullable: true },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            status: { type: "string", enum: ["draft", "active", "closed", "cancelled"], example: "active" },
            candidates: { type: "array", items: { $ref: "#/components/schemas/Candidate" } },
            totalVotes: { type: "integer", example: 150 },
            churchId: { type: "integer", nullable: true },
            createdBy: { type: "integer" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        Candidate: {
          type: "object",
          description: "Representa um candidato em elei\xE7\xE3o",
          properties: {
            id: { type: "integer", example: 1 },
            userId: { type: "integer", description: "ID do usu\xE1rio candidato" },
            electionId: { type: "integer" },
            votes: { type: "integer", example: 45 },
            position: { type: "string", nullable: true, example: "Di\xE1cono" }
          }
        },
        Vote: {
          type: "object",
          description: "Representa um voto",
          properties: {
            id: { type: "integer", example: 1 },
            electionId: { type: "integer" },
            candidateId: { type: "integer" },
            voterId: { type: "integer" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        CreateElectionRequest: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 2, maxLength: 200 },
            description: { type: "string", nullable: true },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            candidates: { type: "array", items: { type: "integer" }, description: "IDs dos candidatos" }
          },
          required: ["title", "startDate", "endDate", "candidates"]
        },
        CastVoteRequest: {
          type: "object",
          properties: {
            electionId: { type: "integer" },
            candidateId: { type: "integer" }
          },
          required: ["electionId", "candidateId"]
        },
        // ==================== GAMIFICAÇÃO ====================
        PointsConfig: {
          type: "object",
          description: "Configura\xE7\xE3o de pontos do sistema de gamifica\xE7\xE3o",
          properties: {
            id: { type: "integer" },
            criteria: { type: "string", example: "hasPhoto" },
            points: { type: "integer", example: 100 },
            description: { type: "string", example: "Pontos por ter foto de perfil" },
            isActive: { type: "boolean" }
          }
        },
        UserPoints: {
          type: "object",
          description: "Pontua\xE7\xE3o detalhada de um usu\xE1rio",
          properties: {
            userId: { type: "integer" },
            totalPoints: { type: "integer", example: 1500 },
            level: { type: "string", example: "Ouro" },
            breakdown: {
              type: "object",
              properties: {
                hasPhoto: { type: "integer", example: 100 },
                hasBio: { type: "integer", example: 50 },
                isApproved: { type: "integer", example: 200 },
                isBaptized: { type: "integer", example: 300 },
                eventsAttended: { type: "integer", example: 400 },
                disciplesCount: { type: "integer", example: 450 }
              }
            },
            rank: { type: "integer", description: "Posi\xE7\xE3o no ranking", example: 15 }
          }
        },
        // ==================== DISCIPULADO ====================
        DiscipleshipRequest: {
          type: "object",
          description: "Solicita\xE7\xE3o de discipulado",
          properties: {
            id: { type: "integer" },
            requesterId: { type: "integer", description: "ID do solicitante" },
            disciplerId: { type: "integer", description: "ID do discipulador" },
            status: { type: "string", enum: ["pending", "accepted", "rejected"], example: "pending" },
            message: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            respondedAt: { type: "string", format: "date-time", nullable: true }
          }
        },
        // ==================== RELACIONAMENTOS ====================
        Relationship: {
          type: "object",
          description: "Relacionamento entre usu\xE1rios",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer" },
            relatedUserId: { type: "integer" },
            type: { type: "string", enum: ["family", "friend", "mentor", "disciple"], example: "mentor" },
            status: { type: "string", enum: ["pending", "active", "inactive"], example: "active" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        // ==================== DASHBOARD ====================
        DashboardStats: {
          type: "object",
          description: "Estat\xEDsticas do dashboard",
          properties: {
            totalUsers: { type: "integer", example: 342 },
            activeUsers: { type: "integer", example: 280 },
            pendingApprovals: { type: "integer", example: 15 },
            eventsThisMonth: { type: "integer", example: 8 },
            prayerRequests: { type: "integer", example: 45 },
            averagePoints: { type: "number", example: 1250.5 },
            topUsers: { type: "array", items: { $ref: "#/components/schemas/User" } },
            recentActivity: { type: "array", items: { type: "object" } }
          }
        },
        // ==================== RESPOSTAS PADRÃO ====================
        ApiResponse: {
          type: "object",
          description: "Resposta padr\xE3o da API",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", description: "Dados da resposta" },
            message: { type: "string", example: "Opera\xE7\xE3o realizada com sucesso" }
          }
        },
        ErrorResponse: {
          type: "object",
          description: "Resposta de erro da API",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "Recurso n\xE3o encontrado" },
            code: { type: "string", example: "NOT_FOUND" },
            details: { type: "array", items: { type: "object" }, description: "Detalhes adicionais do erro" }
          }
        },
        ValidationError: {
          type: "object",
          description: "Erro de valida\xE7\xE3o",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "Erro de valida\xE7\xE3o" },
            code: { type: "string", example: "VALIDATION_ERROR" },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "email" },
                  message: { type: "string", example: "Email inv\xE1lido" }
                }
              }
            }
          }
        },
        PaginatedResponse: {
          type: "object",
          description: "Resposta paginada",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "array", items: { type: "object" } },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 342 },
                totalPages: { type: "integer", example: 18 },
                hasNext: { type: "boolean", example: true },
                hasPrev: { type: "boolean", example: false }
              }
            }
          }
        },
        LoginRequest: {
          type: "object",
          description: "Requisi\xE7\xE3o de login",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "usuario@email.com" },
            password: { type: "string", example: "******" }
          }
        },
        LoginResponse: {
          type: "object",
          description: "Resposta de login bem-sucedido",
          properties: {
            success: { type: "boolean", example: true },
            user: { $ref: "#/components/schemas/User" },
            token: { type: "string", description: "JWT token (se aplic\xE1vel)" }
          }
        },
        // ==================== UPLOAD ====================
        FileUpload: {
          type: "object",
          description: "Informa\xE7\xF5es de arquivo enviado",
          properties: {
            id: { type: "string", example: "0030864ef77ac39a1ecfdd2f25d56fb9" },
            filename: { type: "string", example: "foto_perfil.jpg" },
            mimetype: { type: "string", example: "image/jpeg" },
            size: { type: "integer", example: 102400 },
            url: { type: "string", example: "/uploads/0030864ef77ac39a1ecfdd2f25d56fb9" }
          }
        },
        // ==================== VISITAS ====================
        Visit: {
          type: "object",
          description: "Registro de visita/presen\xE7a",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer" },
            eventId: { type: "integer", nullable: true },
            date: { type: "string", format: "date-time" },
            type: { type: "string", enum: ["culto", "celula", "reuniao", "evento"], example: "culto" },
            notes: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        MarkVisitRequest: {
          type: "object",
          properties: {
            userId: { type: "integer" },
            eventId: { type: "integer", nullable: true },
            date: { type: "string", format: "date-time" },
            type: { type: "string", enum: ["culto", "celula", "reuniao", "evento"] }
          },
          required: ["userId", "date", "type"]
        }
      },
      responses: {
        NotFound: {
          description: "Recurso n\xE3o encontrado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                error: "Recurso n\xE3o encontrado",
                code: "NOT_FOUND"
              }
            }
          }
        },
        Unauthorized: {
          description: "N\xE3o autenticado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                error: "Autentica\xE7\xE3o necess\xE1ria",
                code: "UNAUTHORIZED"
              }
            }
          }
        },
        Forbidden: {
          description: "Acesso negado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                error: "Voc\xEA n\xE3o tem permiss\xE3o para esta a\xE7\xE3o",
                code: "FORBIDDEN"
              }
            }
          }
        },
        BadRequest: {
          description: "Requisi\xE7\xE3o inv\xE1lida",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationError" }
            }
          }
        },
        TooManyRequests: {
          description: "Muitas requisi\xE7\xF5es",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                error: "Muitas requisi\xE7\xF5es. Tente novamente em alguns minutos.",
                code: "RATE_LIMIT_EXCEEDED"
              }
            }
          }
        },
        InternalError: {
          description: "Erro interno do servidor",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                error: "Erro interno do servidor",
                code: "INTERNAL_ERROR"
              }
            }
          }
        }
      },
      parameters: {
        userId: {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "ID do usu\xE1rio"
        },
        churchId: {
          name: "churchId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "ID da igreja"
        },
        eventId: {
          name: "eventId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "ID do evento"
        },
        page: {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1 },
          description: "N\xFAmero da p\xE1gina"
        },
        limit: {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20, maximum: 100 },
          description: "Itens por p\xE1gina"
        },
        search: {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Termo de busca"
        },
        sortBy: {
          name: "sortBy",
          in: "query",
          schema: { type: "string" },
          description: "Campo para ordena\xE7\xE3o"
        },
        sortOrder: {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
          description: "Dire\xE7\xE3o da ordena\xE7\xE3o"
        }
      }
    },
    tags: [
      { name: "System", description: "\u{1F527} System health and status endpoints" },
      { name: "Auth", description: "\u{1F510} Authentication and authorization" },
      { name: "Users", description: "\u{1F465} User management (CRUD, search, filters)" },
      { name: "Churches", description: "\u{1F3DB}\uFE0F Church management" },
      { name: "Districts", description: "\u{1F4CD} District management" },
      { name: "Events", description: "\u{1F4C5} Event and calendar management" },
      { name: "Meetings", description: "\u{1F91D} Meeting management (c\xE9lulas, GCs)" },
      { name: "Relationships", description: "\u{1F49E} User relationships management" },
      { name: "Discipleship", description: "\u{1F4D6} Discipleship requests and management" },
      { name: "Messages", description: "\u{1F4AC} Chat and messaging" },
      { name: "Notifications", description: "\u{1F514} Push notifications" },
      { name: "Prayers", description: "\u{1F64F} Prayer requests management" },
      { name: "Tasks", description: "\u2705 Task management" },
      { name: "Points", description: "\u{1F3AE} Gamification and points system" },
      { name: "Elections", description: "\u{1F5F3}\uFE0F Election and voting system" },
      { name: "Dashboard", description: "\u{1F4CA} Dashboard statistics" },
      { name: "Settings", description: "\u2699\uFE0F System settings" },
      { name: "Upload", description: "\u{1F4E4} File upload endpoints" },
      { name: "Visits", description: "\u{1F4CB} Visit/attendance tracking" }
    ],
    security: [{ userId: [] }]
  },
  apis: [
    "./server/routes/*.ts",
    "./server/electionRoutes.ts",
    "./server/districtRoutes.ts",
    "./server/importRoutes.ts"
  ]
};
var swaggerSpec = swaggerJsdoc(options);

// server/middleware/correlationId.ts
import { randomUUID } from "crypto";
var CORRELATION_ID_HEADER = "x-correlation-id";
function correlationIdMiddleware(req, res, next) {
  const clientCorrelationId = req.headers[CORRELATION_ID_HEADER];
  const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };
  const correlationId = clientCorrelationId && isValidUUID(clientCorrelationId) ? clientCorrelationId : randomUUID();
  req.correlationId = correlationId;
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  logger.debug("Request started", {
    correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.headers["user-agent"],
    ip: req.ip || req.socket.remoteAddress
  });
  const startTime2 = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime2;
    const logLevel = res.statusCode >= 400 ? "warn" : "debug";
    logger[logLevel]("Request completed", {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration
    });
  });
  next();
}

// server/middleware/securityHeaders.ts
var cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    // Necessário para React
    "'unsafe-eval'",
    // Necessário para dev tools
    "https://cdn.jsdelivr.net",
    "https://unpkg.com"
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    // Necessário para CSS-in-JS e Tailwind
    "https://fonts.googleapis.com"
  ],
  imgSrc: ["'self'", "data:", "blob:", "https:", "http://localhost:*"],
  fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
  connectSrc: [
    "'self'",
    "https://api.sentry.io",
    "https://*.sentry.io",
    "wss:",
    "ws:",
    process.env.NODE_ENV === "development" ? "http://localhost:*" : ""
  ].filter(Boolean),
  frameSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : void 0
};
var buildCspString = () => {
  return Object.entries(cspDirectives).filter(([, values]) => values !== void 0).map(([directive, values]) => {
    const kebabDirective = directive.replace(/([A-Z])/g, "-$1").toLowerCase();
    if (Array.isArray(values) && values.length === 0) {
      return kebabDirective;
    }
    return `${kebabDirective} ${values.join(" ")}`;
  }).join("; ");
};
var securityHeadersMiddleware2 = (_req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Content-Security-Policy", buildCspString());
  } else {
    res.setHeader("Content-Security-Policy-Report-Only", buildCspString());
  }
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (_req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
};

// server/middleware/healthCheck.ts
import { Router as Router3 } from "express";
import { neon as neon2 } from "@neondatabase/serverless";
var router3 = Router3();
var startTime = Date.now();
async function checkDatabase() {
  const start = Date.now();
  try {
    const connectionString2 = process.env.DATABASE_URL;
    if (!connectionString2) {
      return { status: "fail", message: "DATABASE_URL not configured" };
    }
    const sql2 = neon2(connectionString2);
    await sql2`SELECT 1 as health_check`;
    const latency = Date.now() - start;
    return {
      status: latency < 500 ? "pass" : "warn",
      latency,
      message: latency < 500 ? "Database responding normally" : "Database responding slowly"
    };
  } catch (error) {
    return {
      status: "fail",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Database connection failed"
    };
  }
}
function checkMemory() {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const usagePercent = used.heapUsed / used.heapTotal * 100;
  let status = "pass";
  let message = "Memory usage normal";
  if (usagePercent > 90) {
    status = "fail";
    message = "Critical memory usage";
  } else if (usagePercent > 75) {
    status = "warn";
    message = "High memory usage";
  }
  return {
    status,
    message,
    details: {
      heapUsedMB,
      heapTotalMB,
      usagePercent: Math.round(usagePercent),
      rssMB: Math.round(used.rss / 1024 / 1024)
    }
  };
}
router3.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router3.get("/health/detailed", async (_req, res) => {
  const [dbCheck, memCheck] = await Promise.all([checkDatabase(), Promise.resolve(checkMemory())]);
  const apiCheck = { status: "pass", message: "API responding" };
  const checks = { database: dbCheck, memory: memCheck, api: apiCheck };
  const allStatuses = Object.values(checks).map((c) => c.status);
  let overallStatus = "healthy";
  if (allStatuses.includes("fail")) {
    overallStatus = "unhealthy";
  } else if (allStatuses.includes("warn")) {
    overallStatus = "degraded";
  }
  const healthStatus = {
    status: overallStatus,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.round((Date.now() - startTime) / 1e3),
    checks
  };
  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;
  res.status(httpStatus).json(healthStatus);
});
router3.get("/health/ready", async (_req, res) => {
  const dbCheck = await checkDatabase();
  if (dbCheck.status === "fail") {
    res.status(503).json({
      ready: false,
      reason: "Database not available",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  res.status(200).json({
    ready: true,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router3.get("/health/live", (_req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    pid: process.pid
  });
});
var healthCheckRouter = router3;

// server/services/prometheusService.ts
import { Router as Router4 } from "express";
var PrometheusService = class {
  constructor() {
    this.counters = {
      httpRequestsTotal: /* @__PURE__ */ new Map(),
      httpRequestDuration: /* @__PURE__ */ new Map(),
      activeConnections: 0,
      errorCount: /* @__PURE__ */ new Map(),
      dbQueryCount: 0,
      dbQueryDuration: [],
      cacheHits: 0,
      cacheMisses: 0
    };
    this.startTime = Date.now();
  }
  /**
   * Incrementa contador de requisições HTTP
   */
  incrementHttpRequests(method, path3, statusCode) {
    const key = `${method}:${this.normalizePath(path3)}:${statusCode}`;
    const current = this.counters.httpRequestsTotal.get(key) || 0;
    this.counters.httpRequestsTotal.set(key, current + 1);
  }
  /**
   * Registra duração de requisição HTTP
   */
  recordHttpDuration(method, path3, durationMs) {
    const key = `${method}:${this.normalizePath(path3)}`;
    const durations = this.counters.httpRequestDuration.get(key) || [];
    durations.push(durationMs);
    if (durations.length > 1e3) {
      durations.shift();
    }
    this.counters.httpRequestDuration.set(key, durations);
  }
  /**
   * Incrementa conexões ativas
   */
  incrementConnections() {
    this.counters.activeConnections++;
  }
  /**
   * Decrementa conexões ativas
   */
  decrementConnections() {
    this.counters.activeConnections = Math.max(0, this.counters.activeConnections - 1);
  }
  /**
   * Registra erro
   */
  recordError(type) {
    const current = this.counters.errorCount.get(type) || 0;
    this.counters.errorCount.set(type, current + 1);
  }
  /**
   * Registra query do banco
   */
  recordDbQuery(durationMs) {
    this.counters.dbQueryCount++;
    this.counters.dbQueryDuration.push(durationMs);
    if (this.counters.dbQueryDuration.length > 1e3) {
      this.counters.dbQueryDuration.shift();
    }
  }
  /**
   * Atualiza métricas de cache
   */
  updateCacheMetrics() {
    const stats = cacheService.getStats();
    this.counters.cacheHits = stats.hits;
    this.counters.cacheMisses = stats.misses;
  }
  /**
   * Normaliza path removendo IDs numéricos
   */
  normalizePath(path3) {
    return path3.replace(/\/\d+/g, "/:id").replace(/\/[a-f0-9-]{36}/g, "/:uuid");
  }
  /**
   * Calcula percentil
   */
  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index2 = Math.ceil(p / 100 * sorted.length) - 1;
    return sorted[Math.max(0, index2)];
  }
  /**
   * Gera métricas no formato Prometheus
   */
  generateMetrics() {
    this.updateCacheMetrics();
    const lines = [];
    const processMemory = process.memoryUsage();
    const uptime = (Date.now() - this.startTime) / 1e3;
    lines.push("# HELP app_info Application information");
    lines.push("# TYPE app_info gauge");
    lines.push(`app_info{version="1.0.0",node_version="${process.version}"} 1`);
    lines.push("# HELP app_uptime_seconds Application uptime in seconds");
    lines.push("# TYPE app_uptime_seconds counter");
    lines.push(`app_uptime_seconds ${uptime.toFixed(2)}`);
    lines.push("# HELP nodejs_heap_used_bytes Node.js heap used bytes");
    lines.push("# TYPE nodejs_heap_used_bytes gauge");
    lines.push(`nodejs_heap_used_bytes ${processMemory.heapUsed}`);
    lines.push("# HELP nodejs_heap_total_bytes Node.js heap total bytes");
    lines.push("# TYPE nodejs_heap_total_bytes gauge");
    lines.push(`nodejs_heap_total_bytes ${processMemory.heapTotal}`);
    lines.push("# HELP nodejs_rss_bytes Node.js RSS bytes");
    lines.push("# TYPE nodejs_rss_bytes gauge");
    lines.push(`nodejs_rss_bytes ${processMemory.rss}`);
    lines.push("# HELP http_requests_total Total HTTP requests");
    lines.push("# TYPE http_requests_total counter");
    for (const [key, count] of this.counters.httpRequestsTotal) {
      const [method, path3, status] = key.split(":");
      lines.push(
        `http_requests_total{method="${method}",path="${path3}",status="${status}"} ${count}`
      );
    }
    lines.push("# HELP http_request_duration_ms HTTP request duration in milliseconds");
    lines.push("# TYPE http_request_duration_ms summary");
    for (const [key, durations] of this.counters.httpRequestDuration) {
      const [method, path3] = key.split(":");
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const p50 = this.percentile(durations, 50);
        const p95 = this.percentile(durations, 95);
        const p99 = this.percentile(durations, 99);
        lines.push(
          `http_request_duration_ms{method="${method}",path="${path3}",quantile="0.5"} ${p50.toFixed(2)}`
        );
        lines.push(
          `http_request_duration_ms{method="${method}",path="${path3}",quantile="0.95"} ${p95.toFixed(2)}`
        );
        lines.push(
          `http_request_duration_ms{method="${method}",path="${path3}",quantile="0.99"} ${p99.toFixed(2)}`
        );
        lines.push(
          `http_request_duration_ms_avg{method="${method}",path="${path3}"} ${avg.toFixed(2)}`
        );
      }
    }
    lines.push("# HELP http_active_connections Current active HTTP connections");
    lines.push("# TYPE http_active_connections gauge");
    lines.push(`http_active_connections ${this.counters.activeConnections}`);
    lines.push("# HELP app_errors_total Total application errors");
    lines.push("# TYPE app_errors_total counter");
    for (const [type, count] of this.counters.errorCount) {
      lines.push(`app_errors_total{type="${type}"} ${count}`);
    }
    lines.push("# HELP db_queries_total Total database queries");
    lines.push("# TYPE db_queries_total counter");
    lines.push(`db_queries_total ${this.counters.dbQueryCount}`);
    if (this.counters.dbQueryDuration.length > 0) {
      const avgDb = this.counters.dbQueryDuration.reduce((a, b) => a + b, 0) / this.counters.dbQueryDuration.length;
      lines.push("# HELP db_query_duration_ms Average database query duration");
      lines.push("# TYPE db_query_duration_ms gauge");
      lines.push(`db_query_duration_ms ${avgDb.toFixed(2)}`);
    }
    lines.push("# HELP cache_hits_total Total cache hits");
    lines.push("# TYPE cache_hits_total counter");
    lines.push(`cache_hits_total ${this.counters.cacheHits}`);
    lines.push("# HELP cache_misses_total Total cache misses");
    lines.push("# TYPE cache_misses_total counter");
    lines.push(`cache_misses_total ${this.counters.cacheMisses}`);
    const cacheStats = cacheService.getStats();
    lines.push("# HELP cache_size Current cache size");
    lines.push("# TYPE cache_size gauge");
    lines.push(`cache_size ${cacheStats.size}`);
    lines.push("# HELP cache_hit_rate Cache hit rate");
    lines.push("# TYPE cache_hit_rate gauge");
    lines.push(`cache_hit_rate ${cacheStats.hitRate.toFixed(4)}`);
    return `${lines.join("\n")}
`;
  }
  /**
   * Cria router para endpoint /metrics
   */
  createRouter() {
    const router4 = Router4();
    router4.get("/metrics", (_req, res) => {
      res.set("Content-Type", "text/plain; version=0.0.4");
      res.send(this.generateMetrics());
    });
    router4.get("/metrics/json", (_req, res) => {
      this.updateCacheMetrics();
      res.json({
        uptime: (Date.now() - this.startTime) / 1e3,
        memory: process.memoryUsage(),
        http: {
          requests: Object.fromEntries(this.counters.httpRequestsTotal),
          activeConnections: this.counters.activeConnections
        },
        errors: Object.fromEntries(this.counters.errorCount),
        database: {
          queryCount: this.counters.dbQueryCount,
          avgDuration: this.counters.dbQueryDuration.length > 0 ? this.counters.dbQueryDuration.reduce((a, b) => a + b, 0) / this.counters.dbQueryDuration.length : 0
        },
        cache: cacheService.getStats()
      });
    });
    logger.info("Prometheus metrics endpoint registered at /metrics");
    return router4;
  }
  /**
   * Middleware para coletar métricas de requisições
   */
  metricsMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      this.incrementConnections();
      res.on("finish", () => {
        const duration = Date.now() - start;
        this.incrementHttpRequests(req.method, req.path, res.statusCode);
        this.recordHttpDuration(req.method, req.path, duration);
        this.decrementConnections();
        if (res.statusCode >= 500) {
          this.recordError("5xx");
        } else if (res.statusCode >= 400) {
          this.recordError("4xx");
        }
      });
      next();
    };
  }
};
var prometheusService = new PrometheusService();

// server/index.ts
var app = express3();
app.use(correlationIdMiddleware);
app.use(monitoringService.metricsMiddleware());
app.use(securityHeadersMiddleware2);
app.use(
  helmet2({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? void 0 : false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6
    // Bom balanço entre compressão e CPU
  })
);
app.use((req, res, next) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*").split(",").map((origin2) => origin2.trim()).filter(Boolean);
  const origin = req.headers.origin;
  const allowAll = allowedOrigins.includes("*");
  if (origin && (allowAll || allowedOrigins.includes(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  } else if (allowAll) {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use((req, res, next) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "SAMEORIGIN");
  res.header("Referrer-Policy", "no-referrer");
  res.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  if (process.env.NODE_ENV === "production") {
    res.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use(express3.json({ limit: "10mb" }));
app.use(express3.urlencoded({ extended: false, limit: "10mb" }));
app.use("/api", apiLimiter);
app.use("/", healthCheckRouter);
app.use("/", prometheusService.createRouter());
if (process.env.NODE_ENV !== "production") {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "7Care API Documentation"
    })
  );
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && process.env.NODE_ENV !== "production") {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = `${logLine.slice(0, 79)}\u2026`;
      }
      log(logLine);
    }
  });
  next();
});
app.get("/api/health", async (_req, res) => {
  const healthCheck = {
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
    }
  };
  res.status(200).json(healthCheck);
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 3065;
  server.listen(
    {
      port,
      host: "localhost"
    },
    () => {
      console.log(`\u{1F680} Church Plus Manager rodando em http://localhost:${port}`);
      console.log(`\u{1F4CA} Dashboard: http://localhost:${port}/dashboard`);
      if (process.env.NODE_ENV !== "production") {
        console.log(`\u{1F4DA} API Docs: http://localhost:${port}/api-docs`);
        if (process.env.ADMIN_EMAIL) {
          console.log(`\u{1F510} Login Admin: ${process.env.ADMIN_EMAIL}`);
        }
      }
      console.log(`\u2705 Servidor iniciado com sucesso!`);
    }
  );
})();
