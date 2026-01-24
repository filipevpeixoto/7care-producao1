/**
 * Script de teste para verificar dados offline no IndexedDB
 * Execute no console do navegador
 */

import { db } from './database';
import { getUsersOffline, getEventsOffline, getTasksOffline } from './database';

export async function testOfflineData() {
  console.log('=== TESTE DE DADOS OFFLINE ===\n');

  try {
    // Testar usuários
    console.log('📋 Testando usuários...');
    const usersFromDB = await db.users.toArray();
    console.log(`  - Registros na tabela users: ${usersFromDB.length}`);
    
    if (usersFromDB.length > 0) {
      console.log('  - Primeiro registro:', {
        id: usersFromDB[0].id,
        hasData: !!usersFromDB[0].data,
        dataLength: usersFromDB[0].data?.length || 0,
        syncedAt: new Date(usersFromDB[0].syncedAt).toLocaleString(),
      });
    }

    const users = await getUsersOffline();
    console.log(`  - Usuários descriptografados: ${users.length}`);
    if (users.length > 0) {
      console.log('  - Exemplo:', users[0].name, users[0].email);
    }

    // Testar eventos
    console.log('\n📅 Testando eventos...');
    const eventsFromDB = await db.events.toArray();
    console.log(`  - Registros na tabela events: ${eventsFromDB.length}`);
    
    const events = await getEventsOffline();
    console.log(`  - Eventos parseados: ${events.length}`);
    if (events.length > 0) {
      console.log('  - Exemplo:', events[0].title);
    }

    // Testar tarefas
    console.log('\n✅ Testando tarefas...');
    const tasksFromDB = await db.tasks.toArray();
    console.log(`  - Registros na tabela tasks: ${tasksFromDB.length}`);
    
    const tasks = await getTasksOffline();
    console.log(`  - Tarefas parseadas: ${tasks.length}`);

    // Verificar meta
    console.log('\n⚙️ Metadados de sincronização:');
    const usersLastSync = await db.meta.get('users_last_sync');
    const eventsLastSync = await db.meta.get('events_last_sync');
    const tasksLastSync = await db.meta.get('tasks_last_sync');

    if (usersLastSync) {
      console.log(`  - Usuários: ${new Date(parseInt(usersLastSync.value)).toLocaleString()}`);
    }
    if (eventsLastSync) {
      console.log(`  - Eventos: ${new Date(parseInt(eventsLastSync.value)).toLocaleString()}`);
    }
    if (tasksLastSync) {
      console.log(`  - Tarefas: ${new Date(parseInt(tasksLastSync.value)).toLocaleString()}`);
    }

    // Resumo
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Usuários: ${users.length}`);
    console.log(`  ✅ Eventos: ${events.length}`);
    console.log(`  ✅ Tarefas: ${tasks.length}`);

    return {
      users: users.length,
      events: events.length,
      tasks: tasks.length,
      success: true,
    };
  } catch (error) {
    console.error('❌ Erro ao testar dados offline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Exportar para uso no console
if (typeof window !== 'undefined') {
  (window as any).testOfflineData = testOfflineData;
}
