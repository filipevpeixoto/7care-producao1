/**
 * Script para criar super admin
 *
 * Uso: DEFAULT_ADMIN_PASSWORD=sua_senha npx tsx server/createSuperAdmin.ts
 */

import 'dotenv/config';
import { NeonAdapter } from './neonAdapter';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS, DEFAULT_RESET_PASSWORD } from './config/security';

// Senha padrão do admin - usar variável de ambiente em produção
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || DEFAULT_RESET_PASSWORD;

async function createSuperAdmin() {
  const storage = new NeonAdapter();

  // Aviso de segurança
  if (!process.env.DEFAULT_ADMIN_PASSWORD) {
    console.warn('⚠️  AVISO: Usando senha padrão. Em produção, defina DEFAULT_ADMIN_PASSWORD.');
  }

  console.log('👑 Criando super admin...\n');

  try {
    // Verificar se admin já existe
    const existingAdmin = await storage.getUserByEmail('admin@7care.com');
    if (existingAdmin) {
      console.log('⚠️ Super admin já existe!');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`👤 Nome: ${existingAdmin.name}`);
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

    console.log('✅ Super admin criado com sucesso!');
    console.log(`\n📋 Dados do super admin:`);
    console.log(`   Nome: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(
      `   Senha: ${process.env.DEFAULT_ADMIN_PASSWORD ? '(definida via env)' : 'meu7care (padrão)'}`
    );
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin.id}`);
  } catch (error) {
    console.error('❌ Erro ao criar super admin:', error);
    process.exit(1);
  }

  process.exit(0);
}

createSuperAdmin();
