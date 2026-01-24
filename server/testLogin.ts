/**
 * Script para testar login
 */

import 'dotenv/config';
import { NeonAdapter } from './neonAdapter';
import * as bcrypt from 'bcryptjs';

async function testLogin() {
  const storage = new NeonAdapter();
  
  console.log('🔐 Testando login do admin...\n');
  
  try {
    // Buscar usuário
    const user = await storage.getUserByEmail('admin@7care.com');
    
    if (!user) {
      console.log('❌ Usuário não encontrado!');
      process.exit(1);
    }
    
    console.log(`✅ Usuário encontrado: ${user.name}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Role: ${user.role}`);
    console.log(`🔒 Senha hash: ${user.password.substring(0, 20)}...`);
    
    // Testar senha
    const password = 'meu7care';
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    console.log(`\n🔑 Testando senha "${password}"...`);
    if (isPasswordCorrect) {
      console.log('✅ Senha correta!');
    } else {
      console.log('❌ Senha incorreta!');
      console.log('\n🔧 Resetando senha para "meu7care"...');
      const newPassword = await bcrypt.hash('meu7care', 10);
      await storage.updateUser(user.id, { password: newPassword });
      console.log('✅ Senha resetada!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar login:', error);
  }
  
  process.exit(0);
}

testLogin();
