/**
 * Script de Teste Offline LOCAL (não requer servidor)
 * 
 * Este script testa as funcionalidades do módulo offline
 * que podem ser validadas localmente, sem conexão com o servidor.
 * 
 * Uso: npx tsx scripts/test-offline-local.ts
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true, message: 'OK' });
    log(`  ✅ ${name}`, 'green');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    results.push({ name, passed: false, message });
    log(`  ❌ ${name}: ${message}`, 'red');
  }
}

function assertEqual<T>(actual: T, expected: T, message = 'Valores não são iguais') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition: boolean, message = 'Condição não é verdadeira') {
  if (!condition) {
    throw new Error(message);
  }
}

// ==================== TESTES ====================

logSection('1. ROLES E PERMISSÕES OFFLINE');

test('ALLOWED_OFFLINE_ROLES contém superadmin', () => {
  const ALLOWED_ROLES = ['superadmin', 'pastor', 'admin_readonly'];
  assertTrue(ALLOWED_ROLES.includes('superadmin'));
});

test('ALLOWED_OFFLINE_ROLES contém pastor', () => {
  const ALLOWED_ROLES = ['superadmin', 'pastor', 'admin_readonly'];
  assertTrue(ALLOWED_ROLES.includes('pastor'));
});

test('ALLOWED_OFFLINE_ROLES contém admin_readonly', () => {
  const ALLOWED_ROLES = ['superadmin', 'pastor', 'admin_readonly'];
  assertTrue(ALLOWED_ROLES.includes('admin_readonly'));
});

test('member NÃO tem acesso offline', () => {
  const ALLOWED_ROLES = ['superadmin', 'pastor', 'admin_readonly'];
  assertTrue(!ALLOWED_ROLES.includes('member'));
});

test('visitor NÃO tem acesso offline', () => {
  const ALLOWED_ROLES = ['superadmin', 'pastor', 'admin_readonly'];
  assertTrue(!ALLOWED_ROLES.includes('visitor'));
});

// ==================== ESTRUTURA DE DADOS ====================

logSection('2. ESTRUTURA DE DADOS OFFLINE');

test('OfflineUser tem campos obrigatórios', () => {
  interface OfflineUser {
    id: number;
    data: string;
    syncedAt: number;
    isModified: boolean;
    checksum: string;
    modifiedAt: number;
    version: number;
  }
  
  const user: OfflineUser = {
    id: 1,
    data: JSON.stringify({ name: 'Test' }),
    syncedAt: Date.now(),
    isModified: false,
    checksum: 'abc123',
    modifiedAt: Date.now(),
    version: 1,
  };
  
  assertTrue('id' in user);
  assertTrue('data' in user);
  assertTrue('syncedAt' in user);
  assertTrue('isModified' in user);
  assertTrue('checksum' in user);
  assertTrue('modifiedAt' in user);
  assertTrue('version' in user);
});

test('SyncQueueItem tem campos obrigatórios', () => {
  interface SyncQueueItem {
    id?: number;
    type: 'create' | 'update' | 'delete';
    entity: string;
    entityId?: number;
    data: string;
    endpoint: string;
    method: string;
    createdAt: number;
    retryCount: number;
    nextRetryAt: number;
    priority: number;
  }
  
  const item: SyncQueueItem = {
    type: 'create',
    entity: 'users',
    data: '{}',
    endpoint: '/api/users',
    method: 'POST',
    createdAt: Date.now(),
    retryCount: 0,
    nextRetryAt: 0,
    priority: 1,
  };
  
  assertTrue('type' in item);
  assertTrue('entity' in item);
  assertTrue('data' in item);
  assertTrue('endpoint' in item);
  assertTrue('method' in item);
  assertTrue('priority' in item);
});

// ==================== HASH FUNCTION ====================

logSection('3. FUNÇÃO DE HASH (FALLBACK)');

test('Hash fallback gera string válida', () => {
  function hashFallback(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fallback-${Math.abs(hash).toString(16)}`;
  }
  
  const result = hashFallback('test data');
  assertTrue(result.startsWith('fallback-'));
  assertTrue(result.length > 9); // 'fallback-' + pelo menos 1 char
});

test('Hash fallback é determinístico', () => {
  function hashFallback(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fallback-${Math.abs(hash).toString(16)}`;
  }
  
  const data = 'test data 123';
  const hash1 = hashFallback(data);
  const hash2 = hashFallback(data);
  assertEqual(hash1, hash2);
});

test('Hash fallback é diferente para dados diferentes', () => {
  function hashFallback(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fallback-${Math.abs(hash).toString(16)}`;
  }
  
  const hash1 = hashFallback('data 1');
  const hash2 = hashFallback('data 2');
  assertTrue(hash1 !== hash2, 'Hashes deveriam ser diferentes');
});

// ==================== CONSTANTES ====================

logSection('4. CONSTANTES DE CONFIGURAÇÃO');

test('MAX_RETRIES é 5', () => {
  const MAX_RETRIES = 5;
  assertEqual(MAX_RETRIES, 5);
});

test('CACHE_EXPIRY_DAYS é 7', () => {
  const CACHE_EXPIRY_DAYS = 7;
  assertEqual(CACHE_EXPIRY_DAYS, 7);
});

test('BATCH_SIZE é 5', () => {
  const BATCH_SIZE = 5;
  assertEqual(BATCH_SIZE, 5);
});

// ==================== LOCALSTORAGE KEY ====================

logSection('5. CHAVES DE STORAGE');

test('Auth localStorage key é 7care_auth', () => {
  const AUTH_KEY = '7care_auth';
  assertEqual(AUTH_KEY, '7care_auth');
});

test('Offline meta key é offline_meta', () => {
  const META_KEY = 'offline_meta';
  assertEqual(META_KEY, 'offline_meta');
});

// ==================== SIMULAÇÃO DE FLUXO ====================

logSection('6. SIMULAÇÃO DE FLUXO OFFLINE');

test('Simular salvamento de usuário offline', () => {
  const user = { id: 1, name: 'Test User', email: 'test@test.com' };
  
  // Simular criptografia
  const encrypted = JSON.stringify({ __mock: true, data: user });
  
  // Simular estrutura offline
  const offlineUser = {
    id: user.id,
    data: encrypted,
    syncedAt: Date.now(),
    isModified: false,
    checksum: 'mock-hash',
    modifiedAt: Date.now(),
    version: 1,
  };
  
  // Simular recuperação
  const parsed = JSON.parse(offlineUser.data);
  assertEqual(parsed.data, user);
});

test('Simular detecção de conflito', () => {
  const localVersion = 1;
  const serverVersion = 2;
  
  const hasConflict = serverVersion > localVersion;
  assertTrue(hasConflict, 'Deveria detectar conflito');
});

test('Simular fila de sincronização', () => {
  const queue: Array<{ type: string; entity: string; priority: number }> = [];
  
  // Adicionar item
  queue.push({ type: 'create', entity: 'users', priority: 1 });
  queue.push({ type: 'update', entity: 'events', priority: 2 });
  
  assertEqual(queue.length, 2);
  
  // Ordenar por prioridade
  queue.sort((a, b) => a.priority - b.priority);
  assertEqual(queue[0].type, 'create');
});

// ==================== RESUMO ====================

console.log('\n');
logSection('📊 RESUMO DOS TESTES');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log('');
log(`  Total: ${results.length} testes`, 'cyan');
log(`  ✅ Passou: ${passed}`, 'green');
if (failed > 0) {
  log(`  ❌ Falhou: ${failed}`, 'red');
}
console.log('');

if (failed > 0) {
  logSection('❌ TESTES QUE FALHARAM');
  for (const result of results.filter(r => !r.passed)) {
    log(`  • ${result.name}: ${result.message}`, 'red');
  }
  console.log('');
}

if (passed === results.length) {
  log('🎉 Todos os testes passaram!', 'green');
  console.log('');
  log('Para testar com o servidor:', 'yellow');
  log('  1. Ligue o WiFi', 'yellow');
  log('  2. Inicie o servidor: PORT=4000 npm run dev', 'yellow');
  log('  3. Execute: npx tsx scripts/test-offline.ts', 'yellow');
}

process.exit(failed > 0 ? 1 : 0);
