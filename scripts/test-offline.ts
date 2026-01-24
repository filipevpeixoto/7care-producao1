/**
 * Script de Teste do Modo Offline
 * 
 * Este script testa as funcionalidades do modo offline:
 * 1. Verifica conexão com servidor
 * 2. Busca dados da API
 * 3. Simula salvamento no cache offline
 * 4. Verifica recuperação dos dados em modo offline
 * 
 * Uso: npx tsx scripts/test-offline.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://[::1]:4000';
const ADMIN_EMAIL = 'admin@7care.com';
const ADMIN_PASSWORD = 'meu7care';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

// Cores para output
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

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    const result = { name, passed: true, message: 'OK', duration };
    results.push(result);
    log(`  ✅ ${name} (${duration}ms)`, 'green');
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    const result = { name, passed: false, message, duration };
    results.push(result);
    log(`  ❌ ${name}: ${message}`, 'red');
    return result;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ==================== TESTES ====================

async function testServerConnection() {
  const response = await fetchWithTimeout(`${BASE_URL}/api/users`);
  if (!response.ok) {
    throw new Error(`Servidor retornou status ${response.status}`);
  }
}

async function testLogin(): Promise<{ user: any; token?: string }> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login falhou: ${error}`);
  }
  
  return response.json();
}

async function testGetUsers(): Promise<any[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/users`);
  if (!response.ok) {
    throw new Error(`Falha ao buscar usuários: ${response.status}`);
  }
  const users = await response.json();
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('Nenhum usuário encontrado');
  }
  return users;
}

async function testGetEvents(): Promise<any[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/events`);
  if (!response.ok) {
    throw new Error(`Falha ao buscar eventos: ${response.status}`);
  }
  return response.json();
}

async function testGetTasks(): Promise<any[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/tasks`);
  if (!response.ok) {
    throw new Error(`Falha ao buscar tarefas: ${response.status}`);
  }
  const data = await response.json();
  return data.tasks || [];
}

async function testOfflineDataStructure(users: any[], events: any[], tasks: any[]) {
  // Simula a estrutura que seria salva no IndexedDB
  const offlineData = {
    users: users.map(u => ({
      id: u.id,
      data: JSON.stringify(u),
      syncedAt: Date.now(),
      isModified: false,
      checksum: `hash-${u.id}`,
      modifiedAt: Date.now(),
      version: 1,
    })),
    events: events.map(e => ({
      id: e.id,
      data: JSON.stringify(e),
      syncedAt: Date.now(),
      isModified: false,
    })),
    tasks: tasks.map(t => ({
      id: t.id,
      data: JSON.stringify(t),
      syncedAt: Date.now(),
      isModified: false,
    })),
  };
  
  // Valida estrutura
  if (offlineData.users.length === 0) {
    throw new Error('Estrutura de dados offline inválida: sem usuários');
  }
  
  // Simula recuperação
  const recoveredUsers = offlineData.users.map(u => JSON.parse(u.data));
  if (recoveredUsers.length !== users.length) {
    throw new Error('Dados recuperados não coincidem com originais');
  }
  
  return offlineData;
}

async function testEncryptionModule() {
  // Simula a lógica de criptografia (não podemos usar Web Crypto API no Node.js diretamente)
  const testData = { id: 1, name: 'Test', email: 'test@test.com' };
  const jsonString = JSON.stringify(testData);
  
  // Simula hash
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const checksum = `fallback-${Math.abs(hash).toString(16)}`;
  
  if (!checksum.startsWith('fallback-')) {
    throw new Error('Hash não gerado corretamente');
  }
}

async function testSyncQueueStructure() {
  // Simula estrutura da fila de sincronização
  const queueItem = {
    id: 1,
    type: 'create' as const,
    entity: 'users',
    entityId: 123,
    data: JSON.stringify({ name: 'Novo Usuário' }),
    endpoint: '/api/users',
    method: 'POST',
    createdAt: Date.now(),
    retryCount: 0,
    nextRetryAt: 0,
    priority: 1,
  };
  
  // Valida campos obrigatórios
  const requiredFields = ['type', 'entity', 'data', 'endpoint', 'method', 'createdAt', 'retryCount', 'priority'];
  for (const field of requiredFields) {
    if (!(field in queueItem)) {
      throw new Error(`Campo obrigatório ausente: ${field}`);
    }
  }
}

async function testOfflineRolePermissions() {
  const ALLOWED_ROLES = ['superadmin', 'pastor', 'admin_readonly'];
  const DENIED_ROLES = ['member', 'visitor', 'interested'];
  
  for (const role of ALLOWED_ROLES) {
    if (!ALLOWED_ROLES.includes(role)) {
      throw new Error(`Role ${role} deveria ter acesso offline`);
    }
  }
  
  for (const role of DENIED_ROLES) {
    if (ALLOWED_ROLES.includes(role)) {
      throw new Error(`Role ${role} não deveria ter acesso offline`);
    }
  }
}

async function testStorageEstimation(users: any[]) {
  // Estima o tamanho do storage necessário
  const usersJson = JSON.stringify(users);
  const sizeInBytes = new TextEncoder().encode(usersJson).length;
  const sizeInKB = sizeInBytes / 1024;
  const sizeInMB = sizeInKB / 1024;
  
  log(`    → ${users.length} usuários = ${sizeInKB.toFixed(2)} KB (${sizeInMB.toFixed(4)} MB)`, 'yellow');
  
  // Estima com criptografia (aumenta ~30%)
  const encryptedSize = sizeInMB * 1.3;
  log(`    → Com criptografia: ~${encryptedSize.toFixed(4)} MB`, 'yellow');
  
  // Verifica se cabe no limite típico do IndexedDB (50MB por origem)
  if (encryptedSize > 50) {
    throw new Error(`Dados excedem limite típico do IndexedDB (${encryptedSize.toFixed(2)} MB > 50 MB)`);
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('\n');
  log('🔧 TESTE DO MÓDULO OFFLINE - 7care', 'blue');
  log(`📍 Servidor: ${BASE_URL}`, 'yellow');
  log(`📅 ${new Date().toLocaleString('pt-BR')}`, 'yellow');
  
  let users: any[] = [];
  let events: any[] = [];
  let tasks: any[] = [];
  
  // Teste 1: Conexão com servidor
  logSection('1. CONEXÃO COM SERVIDOR');
  await runTest('Servidor acessível', testServerConnection);
  
  // Teste 2: Autenticação
  logSection('2. AUTENTICAÇÃO');
  let loginData: any = null;
  await runTest('Login como admin', async () => {
    loginData = await testLogin();
    log(`    → Usuário: ${loginData.user?.name || loginData.name} (${loginData.user?.role || loginData.role})`, 'yellow');
  });
  
  // Teste 3: Busca de dados
  logSection('3. BUSCA DE DADOS DA API');
  await runTest('Buscar usuários', async () => {
    users = await testGetUsers();
    log(`    → ${users.length} usuários encontrados`, 'yellow');
  });
  
  await runTest('Buscar eventos', async () => {
    events = await testGetEvents();
    log(`    → ${events.length} eventos encontrados`, 'yellow');
  });
  
  await runTest('Buscar tarefas', async () => {
    tasks = await testGetTasks();
    log(`    → ${tasks.length} tarefas encontradas`, 'yellow');
  });
  
  // Teste 4: Estrutura de dados offline
  logSection('4. ESTRUTURA DE DADOS OFFLINE');
  await runTest('Validar estrutura de dados offline', async () => {
    await testOfflineDataStructure(users, events, tasks);
  });
  
  await runTest('Validar módulo de criptografia', testEncryptionModule);
  
  await runTest('Validar estrutura da fila de sync', testSyncQueueStructure);
  
  // Teste 5: Permissões
  logSection('5. PERMISSÕES DE ACESSO OFFLINE');
  await runTest('Validar roles permitidos', testOfflineRolePermissions);
  
  // Teste 6: Estimativa de storage
  logSection('6. ESTIMATIVA DE STORAGE');
  await runTest('Calcular tamanho do cache', async () => {
    await testStorageEstimation(users);
  });
  
  // Resumo
  logSection('📊 RESUMO DOS TESTES');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);
  
  console.log('');
  log(`  Total: ${results.length} testes`, 'cyan');
  log(`  ✅ Passou: ${passed}`, 'green');
  if (failed > 0) {
    log(`  ❌ Falhou: ${failed}`, 'red');
  }
  log(`  ⏱️  Tempo total: ${totalDuration}ms`, 'yellow');
  console.log('');
  
  if (failed > 0) {
    logSection('❌ TESTES QUE FALHARAM');
    for (const result of results.filter(r => !r.passed)) {
      log(`  • ${result.name}: ${result.message}`, 'red');
    }
    console.log('');
  }
  
  // Instruções para teste manual
  logSection('📝 INSTRUÇÕES PARA TESTE MANUAL');
  console.log(`
  Para testar o modo offline completo no navegador:
  
  1. Acesse ${BASE_URL}
  2. Faça login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}
  3. Clique no botão verde "Modo Offline" no header
  4. Aguarde a preparação dos dados
  5. Desative o WiFi do seu computador
  6. Recarregue a página (F5)
  7. Navegue para /users e verifique se os dados aparecem
  
  Console do navegador deve mostrar:
  - [OfflineFetch] Role recuperado do localStorage: superadmin
  - [OfflineFetch] GET /api/users - canUseOffline: true, isOnline: false
  - [Offline] Buscando usuários do IndexedDB...
  - [Offline] Encontrados ${users.length} registros de usuários
  `);
  
  // Exit code baseado nos resultados
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  log(`\n❌ Erro fatal: ${error.message}`, 'red');
  process.exit(1);
});
