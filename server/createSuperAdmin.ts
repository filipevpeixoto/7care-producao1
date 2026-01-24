/**
 * Script para criar super admin
 */

import 'dotenv/config';
import { NeonAdapter } from './neonAdapter';
import * as bcrypt from 'bcryptjs';

async function createSuperAdmin() {
  const storage = new NeonAdapter();
  
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
    const hashedPassword = await bcrypt.hash('meu7care', 10);
    
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
        camposVaziosACMS: false
      }),
      observations: 'Super administrador do sistema',
      firstAccess: false,
      status: 'active'
    } as any);
    
    console.log('✅ Super admin criado com sucesso!');
    console.log(`\n📋 Dados do super admin:`);
    console.log(`   Nome: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Senha: meu7care`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin.id}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar super admin:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

createSuperAdmin();
