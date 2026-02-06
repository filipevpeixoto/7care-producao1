/**
 * Script de Health Check - Verifica saude do aplicativo
 * Roda diretamente sem precisar do Playwright
 *
 * Uso: node scripts/health-check.cjs
 */

const http = require('http');
const https = require('https');

// Configuracao
const BASE_URL = process.env.BASE_URL || 'http://localhost:3064';
const TIMEOUT = 10000;

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

// Resultados
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
};

/**
 * Fazer requisicao HTTP
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json, text/html',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        timeout: TIMEOUT,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Testar endpoint
 */
async function testEndpoint(name, path, expectedStatus = 200) {
  try {
    const response = await makeRequest(path);

    if (response.status === expectedStatus) {
      log.success(`${name}: ${response.status}`);
      results.passed++;
      return { success: true, status: response.status };
    } else if (response.status === 401 || response.status === 403) {
      log.warn(`${name}: ${response.status} (requer autenticacao)`);
      results.warnings++;
      return { success: true, status: response.status, needsAuth: true };
    } else if (response.status >= 500) {
      log.error(`${name}: ${response.status} (erro de servidor)`);
      results.failed++;
      results.errors.push({ endpoint: path, status: response.status, type: 'server-error' });
      return { success: false, status: response.status };
    } else {
      log.warn(`${name}: ${response.status} (esperado ${expectedStatus})`);
      results.warnings++;
      return { success: false, status: response.status };
    }
  } catch (error) {
    log.error(`${name}: ${error.message}`);
    results.failed++;
    results.errors.push({ endpoint: path, error: error.message, type: 'connection-error' });
    return { success: false, error: error.message };
  }
}

/**
 * Testar API com autenticacao
 */
async function testAuthenticatedEndpoint(name, path, cookies) {
  try {
    const response = await makeRequest(path, {
      headers: {
        Cookie: cookies,
      },
    });

    if (response.status === 200) {
      log.success(`${name}: ${response.status}`);
      results.passed++;
      return { success: true, data: response.data };
    } else {
      log.warn(`${name}: ${response.status}`);
      results.warnings++;
      return { success: false, status: response.status };
    }
  } catch (error) {
    log.error(`${name}: ${error.message}`);
    results.failed++;
    return { success: false, error: error.message };
  }
}

/**
 * Fazer login e obter cookies
 */
async function login(email, password) {
  try {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (response.status === 200) {
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        return setCookies.map((c) => c.split(';')[0]).join('; ');
      }
    }

    // Tentar extrair token do corpo
    try {
      const data = JSON.parse(response.data);
      if (data.token) {
        return `token=${data.token}`;
      }
    } catch {
      // Ignorar
    }

    return null;
  } catch (error) {
    log.error(`Login falhou: ${error.message}`);
    return null;
  }
}

/**
 * Verificar se HTML contem elementos esperados
 */
async function testPage(name, path) {
  try {
    const response = await makeRequest(path, {
      headers: { Accept: 'text/html' },
    });

    if (response.status === 200) {
      // Verificar se tem conteudo HTML valido
      if (
        response.data.includes('<!DOCTYPE html') ||
        response.data.includes('<html') ||
        response.data.includes('<div id="root"')
      ) {
        log.success(`${name}: Pagina carrega corretamente`);
        results.passed++;

        // Verificar erros de JavaScript inline
        if (response.data.includes('Uncaught') || response.data.includes('is not defined')) {
          log.warn(`${name}: Possivel erro de JavaScript detectado`);
          results.warnings++;
        }

        return { success: true };
      } else {
        log.warn(`${name}: Resposta nao parece HTML valido`);
        results.warnings++;
        return { success: false };
      }
    } else if (response.status === 302 || response.status === 301) {
      log.info(`${name}: Redireciona (${response.status})`);
      results.passed++;
      return { success: true, redirect: true };
    } else {
      log.error(`${name}: Status ${response.status}`);
      results.failed++;
      return { success: false };
    }
  } catch (error) {
    log.error(`${name}: ${error.message}`);
    results.failed++;
    return { success: false };
  }
}

/**
 * Executar todos os testes
 */
async function runHealthCheck() {
  console.log('');
  console.log(colors.bold + '================================================' + colors.reset);
  console.log(colors.bold + '  HEALTH CHECK - 7CARE APLICATIVO' + colors.reset);
  console.log(colors.bold + '================================================' + colors.reset);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  // ==================================
  // 1. VERIFICAR SERVIDOR
  // ==================================
  log.title('1. VERIFICACAO DO SERVIDOR');

  await testEndpoint('Servidor principal', '/');
  await testEndpoint('Health check API', '/api/status', 200);

  // ==================================
  // 2. ENDPOINTS PUBLICOS
  // ==================================
  log.title('2. ENDPOINTS PUBLICOS');

  await testEndpoint('Login page', '/login');
  await testEndpoint('Termos de uso', '/termos');
  await testEndpoint('Privacidade', '/privacidade');

  // ==================================
  // 3. API - AUTENTICACAO
  // ==================================
  log.title('3. API DE AUTENTICACAO');

  // Testar login com credenciais validas (senha padrao: meu7care)
  log.info('Tentando login com credenciais de teste...');
  let authCookies = await login('admin@7care.com', 'meu7care');

  if (authCookies) {
    log.success('Login bem sucedido');
    results.passed++;
  } else {
    log.warn('Nao foi possivel fazer login - alguns testes serao ignorados');
    results.warnings++;
  }

  // ==================================
  // 4. API - ENDPOINTS PROTEGIDOS
  // ==================================
  log.title('4. API - ENDPOINTS PROTEGIDOS');

  const apiEndpoints = [
    { name: 'GET /api/users', path: '/api/users' },
    { name: 'GET /api/tasks', path: '/api/tasks' },
    { name: 'GET /api/events', path: '/api/events' },
    { name: 'GET /api/dashboard/stats', path: '/api/dashboard/stats' },
    { name: 'GET /api/settings/default-church', path: '/api/settings/default-church' },
    { name: 'GET /api/districts', path: '/api/districts' },
    { name: 'GET /api/system/points-config', path: '/api/system/points-config' },
    { name: 'GET /api/elections/configs', path: '/api/elections/configs' },
    { name: 'GET /api/prayers', path: '/api/prayers' },
    { name: 'GET /api/churches', path: '/api/churches' },
  ];

  for (const endpoint of apiEndpoints) {
    if (authCookies) {
      await testAuthenticatedEndpoint(endpoint.name, endpoint.path, authCookies);
    } else {
      await testEndpoint(endpoint.name, endpoint.path);
    }
  }

  // ==================================
  // 5. VERIFICAR ROTAS DO FRONTEND
  // ==================================
  log.title('5. ROTAS DO FRONTEND');

  const frontendRoutes = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Usuarios', path: '/users' },
    { name: 'Calendario', path: '/calendar' },
    { name: 'Tarefas', path: '/tasks' },
    { name: 'Chat', path: '/chat' },
    { name: 'Gamificacao', path: '/gamification' },
    { name: 'Configuracoes', path: '/settings' },
    { name: 'Relatorios', path: '/reports' },
    { name: 'Eleicoes', path: '/elections' },
    { name: 'Distritos', path: '/districts' },
    { name: 'Menu', path: '/menu' },
    { name: 'Meu Cadastro', path: '/meu-cadastro' },
  ];

  for (const route of frontendRoutes) {
    await testPage(route.name, route.path);
  }

  // ==================================
  // 6. VERIFICAR ERROS 500
  // ==================================
  log.title('6. VERIFICACAO DE ERROS DE SERVIDOR (500)');

  const criticalEndpoints = [
    '/api/auth/me',
    '/api/users/me',
    '/api/churches',
    '/api/dashboard/summary',
  ];

  for (const path of criticalEndpoints) {
    const result = await makeRequest(path, {
      headers: authCookies ? { Cookie: authCookies } : {},
    }).catch((e) => ({ status: 0, error: e.message }));

    if (result.status >= 500) {
      log.error(`ERRO 500 em ${path}`);
      results.failed++;
      results.errors.push({ endpoint: path, status: result.status, type: 'server-error' });
    } else if (result.status === 0) {
      log.error(`Falha de conexao em ${path}: ${result.error}`);
      results.failed++;
    } else {
      log.success(`${path}: ${result.status} (sem erro de servidor)`);
      results.passed++;
    }
  }

  // ==================================
  // 7. VERIFICAR HEADERS DE SEGURANCA
  // ==================================
  log.title('7. HEADERS DE SEGURANCA');

  try {
    const response = await makeRequest('/');

    // Verificar headers de seguranca
    const headers = response.headers;

    // X-Frame-Options
    if (headers['x-frame-options']) {
      log.success('X-Frame-Options: presente');
      results.passed++;
    } else {
      log.warn('X-Frame-Options: ausente');
      results.warnings++;
    }

    // X-Content-Type-Options
    if (headers['x-content-type-options']) {
      log.success('X-Content-Type-Options: presente');
      results.passed++;
    } else {
      log.warn('X-Content-Type-Options: ausente');
      results.warnings++;
    }

    // Content-Security-Policy (aceita CSP ou CSP-Report-Only em dev)
    if (headers['content-security-policy'] || headers['content-security-policy-report-only']) {
      const cspType = headers['content-security-policy'] ? 'CSP' : 'CSP-Report-Only';
      log.success(`Content-Security-Policy: presente (${cspType})`);
      results.passed++;
    } else {
      log.warn('Content-Security-Policy: ausente');
      results.warnings++;
    }

    // Strict-Transport-Security (apenas em producao)
    if (headers['strict-transport-security']) {
      log.success('Strict-Transport-Security: presente');
      results.passed++;
    } else {
      log.info('Strict-Transport-Security: ausente (normal em desenvolvimento)');
      results.passed++; // Nao considerar erro em dev
    }
  } catch (error) {
    log.error(`Erro ao verificar headers: ${error.message}`);
    results.failed++;
  }

  // ==================================
  // RELATORIO FINAL
  // ==================================
  console.log('');
  console.log(colors.bold + '================================================' + colors.reset);
  console.log(colors.bold + '  RESULTADO FINAL' + colors.reset);
  console.log(colors.bold + '================================================' + colors.reset);
  console.log('');

  console.log(`${colors.green}Passou:${colors.reset}    ${results.passed}`);
  console.log(`${colors.red}Falhou:${colors.reset}    ${results.failed}`);
  console.log(`${colors.yellow}Avisos:${colors.reset}    ${results.warnings}`);
  console.log('');

  if (results.errors.length > 0) {
    console.log(colors.bold + 'ERROS ENCONTRADOS:' + colors.reset);
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.endpoint}`);
      console.log(`   Tipo: ${error.type}`);
      if (error.status) console.log(`   Status: ${error.status}`);
      if (error.error) console.log(`   Erro: ${error.error}`);
      console.log('');
    });
  }

  const totalTests = results.passed + results.failed;
  const successRate = totalTests > 0 ? ((results.passed / totalTests) * 100).toFixed(1) : 0;

  console.log(`Taxa de sucesso: ${successRate}%`);
  console.log('');

  if (results.failed === 0) {
    console.log(colors.green + colors.bold + 'APLICATIVO SAUDAVEL!' + colors.reset);
  } else if (results.failed <= 3) {
    console.log(
      colors.yellow + colors.bold + 'APLICATIVO COM ALGUNS PROBLEMAS - VERIFICAR ERROS ACIMA' + colors.reset
    );
  } else {
    console.log(colors.red + colors.bold + 'APLICATIVO COM PROBLEMAS CRITICOS!' + colors.reset);
  }

  console.log('');

  // Retornar codigo de saida
  process.exit(results.failed > 0 ? 1 : 0);
}

// Executar
runHealthCheck().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
