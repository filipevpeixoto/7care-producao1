/**
 * Script de teste para verificar dados offline no IndexedDB
 * Execute no console do navegador
 */

import { db, getUsersOffline, getEventsOffline, getTasksOffline } from './database';
import { createLogger } from '@/lib/logger';

const offlineLogger = createLogger('Offline');

export async function testOfflineData() {
  offlineLogger.debug('=== TESTE DE DADOS OFFLINE ===\n');

  try {
    // Testar usuários
    offlineLogger.debug('Testando usuários...');
    const usersFromDB = await db.users.toArray();
    offlineLogger.debug(`  - Registros na tabela users: ${usersFromDB.length}`);

    if (usersFromDB.length > 0) {
      offlineLogger.debug('  - Primeiro registro:', {
        id: usersFromDB[0].id,
        hasData: !!usersFromDB[0].data,
        dataLength: usersFromDB[0].data?.length || 0,
        syncedAt: new Date(usersFromDB[0].syncedAt).toLocaleString(),
      });
    }

    const users = await getUsersOffline();
    offlineLogger.debug(`  - Usuários descriptografados: ${users.length}`);
    if (users.length > 0) {
      offlineLogger.debug('  - Exemplo:', users[0].name, users[0].email);
    }

    // Testar eventos
    offlineLogger.debug('\nTestando eventos...');
    const eventsFromDB = await db.events.toArray();
    offlineLogger.debug(`  - Registros na tabela events: ${eventsFromDB.length}`);

    const events = await getEventsOffline();
    offlineLogger.debug(`  - Eventos parseados: ${events.length}`);
    if (events.length > 0) {
      offlineLogger.debug('  - Exemplo:', events[0].title);
    }

    // Testar tarefas
    offlineLogger.debug('\nTestando tarefas...');
    const tasksFromDB = await db.tasks.toArray();
    offlineLogger.debug(`  - Registros na tabela tasks: ${tasksFromDB.length}`);

    const tasks = await getTasksOffline();
    offlineLogger.debug(`  - Tarefas parseadas: ${tasks.length}`);

    // Verificar meta
    offlineLogger.debug('\nMetadados de sincronização:');
    const usersLastSync = await db.meta.get('users_last_sync');
    const eventsLastSync = await db.meta.get('events_last_sync');
    const tasksLastSync = await db.meta.get('tasks_last_sync');

    if (usersLastSync) {
      offlineLogger.debug(`  - Usuários: ${new Date(parseInt(usersLastSync.value)).toLocaleString()}`);
    }
    if (eventsLastSync) {
      offlineLogger.debug(`  - Eventos: ${new Date(parseInt(eventsLastSync.value)).toLocaleString()}`);
    }
    if (tasksLastSync) {
      offlineLogger.debug(`  - Tarefas: ${new Date(parseInt(tasksLastSync.value)).toLocaleString()}`);
    }

    // Resumo
    offlineLogger.debug('\nRESUMO:');
    offlineLogger.debug(`  Usuários: ${users.length}`);
    offlineLogger.debug(`  Eventos: ${events.length}`);
    offlineLogger.debug(`  Tarefas: ${tasks.length}`);

    return {
      users: users.length,
      events: events.length,
      tasks: tasks.length,
      success: true,
    };
  } catch (error) {
    offlineLogger.error('Erro ao testar dados offline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Exportar para uso no console
if (typeof window !== 'undefined') {
  (window as unknown as { testOfflineData: typeof testOfflineData }).testOfflineData =
    testOfflineData;
}
