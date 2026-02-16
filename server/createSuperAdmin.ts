/**
 * Script para criar super admin
 *
 * Uso: DEFAULT_ADMIN_PASSWORD=sua_senha npx tsx server/createSuperAdmin.ts
 */

import 'dotenv/config';
import { NeonAdapter } from './neonAdapter';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS, DEFAULT_RESET_PASSWORD } from './config/security';
import { logger } from './utils/logger';

// Senha padrão do admin - usar variável de ambiente em produção
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || DEFAULT_RESET_PASSWORD;

async function createSuperAdmin() {
  const storage = new NeonAdapter();

  // Aviso de segurança
  if (!process.env.DEFAULT_ADMIN_PASSWORD) {
    logger.warn('⚠️  AVISO: Usando senha padrão. Em produção, defina DEFAULT_ADMIN_PASSWORD.');
  }

  logger.info('👑 Criando super admin...');

  try {
    // Verificar se admin já existe
    const existingAdmin = await storage.getUserByEmail('admin@7care.com');
    if (existingAdmin) {
      logger.info('⚠️ Super admin já existe!');
      logger.info(`📧 Email: ${existingAdmin.email}`);
      logger.info(`👤 Nome: ${existingAdmin.name}`);
      process.exit(0);
    }

    // Criar novo super admin
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

    const admin = await storage.createUser({
      name: 'Super Administrador',
      email: 'admin@7care.com',
      password: hashedPassword,
      role: 'superadmin',
      church: 'Sistema',
      churchCode: 'SYS',
      departments: 'Administração',
      birthDate: '1990-01-01',
      civilStatus: 'Solteiro',
      occupation: 'Administrador',
      education: 'Superior',
      address: 'Rua Principal, 123',
      baptismDate: '2000-01-01',
      previousReligion: 'Nenhuma',
      biblicalInstructor: 'Sistema',
      interestedSituation: 'Aprovado',
      isDonor: true,
      isTither: true,
      isApproved: true,
      points: 1000,
      level: 'Ouro',
      attendance: 100,
      extraData: JSON.stringify({
        engajamento: 'Alto',
        classificacao: 'Frequente',
        dizimista: 'Pontual',
        ofertante: 'Recorrente',
        tempoBatismo: 20,
        cargos: ['Administrador'],
        nomeUnidade: 'Sistema',
        temLicao: true,
        totalPresenca: 100,
        batizouAlguem: true,
        discipuladoPosBatismo: 5,
        cpfValido: true,
        camposVaziosACMS: false,
      }),
      observations: 'Super administrador do sistema',
      firstAccess: false,
      status: 'active',
    });

    logger.info('✅ Super admin criado com sucesso!');
    logger.info('📋 Dados do super admin:');
    logger.info(`Nome: ${admin.name}`);
    logger.info(`Email: ${admin.email}`);
    logger.info(
      `Senha: ${process.env.DEFAULT_ADMIN_PASSWORD ? '(definida via env)' : 'meu7care (padrão)'}`
    );
    logger.info(`Role: ${admin.role}`);
    logger.info(`ID: ${admin.id}`);
  } catch (error) {
    logger.error('❌ Erro ao criar super admin', error);
    process.exit(1);
  }

  process.exit(0);
}

createSuperAdmin();
