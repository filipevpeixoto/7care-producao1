/**
 * Script para verificar dados no banco
 */

import 'dotenv/config';
import { NeonAdapter } from './neonAdapter';

async function checkDatabase() {
  const storage = new NeonAdapter();
  
  console.log('🔍 Verificando dados no banco de dados...\n');
  
  try {
    const users = await storage.getAllUsers();
    console.log(`👥 Total de usuários: ${users.length}`);
    
    if (users.length > 0) {
      console.log('\n📋 Usuários encontrados:');
      users.forEach(u => {
        console.log(`  - ${u.name} (${u.email}) - Role: ${u.role}`);
      });
    } else {
      console.log('❌ Nenhum usuário encontrado no banco!');
    }
    
    // Verificar eventos
    const events = await storage.getAllEvents();
    console.log(`\n📅 Total de eventos: ${events.length}`);
    
    if (events.length > 0) {
      console.log('Eventos encontrados:');
      events.forEach(e => {
        console.log(`  - ${e.title} (${e.date})`);
      });
    }
    
    // Verificar igrejas
    const churches = await storage.getAllChurches();
    console.log(`\n⛪ Total de igrejas: ${churches.length}`);
    
    if (churches.length > 0) {
      console.log('Igrejas encontradas:');
      churches.forEach(c => {
        console.log(`  - ${c.name} (${c.code})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
  }
  
  process.exit(0);
}

checkDatabase();
