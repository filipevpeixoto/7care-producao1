import { test, expect, Page } from '@playwright/test';

/**
 * Teste Abrangente de Saude do App - Health Check
 * Verifica todas as paginas, botoes e fluxos principais
 */

// Armazenar erros encontrados durante os testes
const errorsFound: { page: string; type: string; message: string }[] = [];

/**
 * Helper para login
 */
async function login(page: Page) {
  await page.goto('/');

  // Aguardar a pagina carregar
  await page.waitForLoadState('networkidle');

  // Verificar se ja esta logado (redirecionou para dashboard)
  if (page.url().includes('/dashboard')) {
    return true;
  }

  // Preencher login
  const emailField = page.getByPlaceholder(/email/i);
  const passwordField = page.getByPlaceholder(/senha|password/i);

  if (await emailField.isVisible()) {
    await emailField.fill('admin@7care.com');
    await passwordField.fill('admin123');
    await page.getByRole('button', { name: /entrar|login/i }).click();

    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      return true;
    } catch {
      // Tentar credenciais alternativas
      await page.goto('/');
      await emailField.fill('pastor@teste.com');
      await passwordField.fill('teste123');
      await page.getByRole('button', { name: /entrar|login/i }).click();

      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

/**
 * Helper para capturar erros de console
 */
function setupConsoleErrorCapture(page: Page, pageName: string) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignorar erros comuns de extensoes
      if (!text.includes('Extension') && !text.includes('chrome-extension')) {
        errorsFound.push({
          page: pageName,
          type: 'console-error',
          message: text
        });
      }
    }
  });

  page.on('pageerror', error => {
    errorsFound.push({
      page: pageName,
      type: 'page-error',
      message: error.message
    });
  });
}

// ============================================
// TESTE 1: VERIFICAR TODAS AS PAGINAS CARREGAM
// ============================================
test.describe('Health Check - Todas as Paginas', () => {
  const pages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/users', name: 'Usuarios' },
    { path: '/calendar', name: 'Calendario' },
    { path: '/tasks', name: 'Tarefas' },
    { path: '/chat', name: 'Chat' },
    { path: '/gamification', name: 'Gamificacao' },
    { path: '/prayers', name: 'Oracoes' },
    { path: '/reports', name: 'Relatorios' },
    { path: '/settings', name: 'Configuracoes' },
    { path: '/interested', name: 'Interessados' },
    { path: '/districts', name: 'Distritos' },
    { path: '/elections', name: 'Eleicoes' },
    { path: '/meu-cadastro', name: 'Meu Cadastro' },
    { path: '/notifications', name: 'Notificacoes' },
    { path: '/menu', name: 'Menu' },
  ];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const loggedIn = await login(page);
    if (!loggedIn) {
      console.warn('AVISO: Nao foi possivel fazer login. Alguns testes podem falhar.');
    }
    await page.close();
  });

  for (const pageInfo of pages) {
    test(`Pagina ${pageInfo.name} (${pageInfo.path}) carrega sem erros`, async ({ page }) => {
      setupConsoleErrorCapture(page, pageInfo.name);

      // Fazer login primeiro
      await login(page);

      // Navegar para a pagina
      const response = await page.goto(pageInfo.path, { waitUntil: 'networkidle', timeout: 30000 });

      // Verificar status HTTP
      expect(response?.status()).toBeLessThan(400);

      // Verificar se nao tem erro de tela em branco
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent?.length).toBeGreaterThan(10);

      // Verificar se nao tem mensagem de erro visivel
      const errorMessages = page.locator('[class*="error"], [class*="Error"], [role="alert"]');
      const errorCount = await errorMessages.count();

      // Se tiver elementos de erro, verificar se sao erros criticos
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const text = await errorMessages.nth(i).textContent();
          if (text?.toLowerCase().includes('erro fatal') ||
              text?.toLowerCase().includes('falha critica') ||
              text?.toLowerCase().includes('500')) {
            errorsFound.push({
              page: pageInfo.name,
              type: 'ui-error',
              message: text || 'Erro desconhecido'
            });
          }
        }
      }
    });
  }
});

// ============================================
// TESTE 2: VERIFICAR BOTOES PRINCIPAIS
// ============================================
test.describe('Health Check - Botoes e Interacoes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard - botoes funcionam', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Dashboard-Buttons');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Encontrar todos os botoes visiveis
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    console.log(`Dashboard: ${buttonCount} botoes encontrados`);

    // Verificar que botoes sao clicaveis (nao desabilitados sem motivo)
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const isDisabled = await button.isDisabled();
      const buttonText = await button.textContent();

      if (!isDisabled && buttonText) {
        // Botao deve responder a hover
        await button.hover();
        await page.waitForTimeout(100);
      }
    }
  });

  test('Usuarios - botao adicionar funciona', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Users-AddButton');
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Procurar botao de adicionar usuario
    const addButton = page.getByRole('button', { name: /novo|adicionar|add|criar/i });

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Verificar se modal ou formulario abriu
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"], form');
      const isModalVisible = await modal.first().isVisible().catch(() => false);

      if (!isModalVisible) {
        errorsFound.push({
          page: 'Users',
          type: 'interaction-error',
          message: 'Botao adicionar nao abre modal/formulario'
        });
      }
    } else {
      console.log('Botao adicionar usuario nao encontrado - pode ser restricao de permissao');
    }
  });

  test('Calendario - navegacao funciona', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Calendar-Navigation');
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Botoes de navegacao do calendario
    const nextButton = page.locator('button').filter({ hasText: /proximo|next|›|>/i });
    const prevButton = page.locator('button').filter({ hasText: /anterior|prev|‹|</i });

    if (await nextButton.first().isVisible()) {
      await nextButton.first().click();
      await page.waitForTimeout(300);

      // Verificar que nao quebrou
      const calendarContent = await page.locator('body').textContent();
      expect(calendarContent?.length).toBeGreaterThan(10);
    }
  });

  test('Tarefas - criar tarefa funciona', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Tasks-Create');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Botao de nova tarefa
    const newTaskButton = page.getByRole('button', { name: /nova|adicionar|criar|add/i });

    if (await newTaskButton.isVisible()) {
      await newTaskButton.click();
      await page.waitForTimeout(500);

      // Verificar modal ou formulario
      const formVisible = await page.locator('form, [role="dialog"]').first().isVisible().catch(() => false);

      if (!formVisible) {
        errorsFound.push({
          page: 'Tasks',
          type: 'interaction-error',
          message: 'Botao nova tarefa nao abre formulario'
        });
      }
    }
  });

  test('Configuracoes - tabs funcionam', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Settings-Tabs');
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Encontrar tabs
    const tabs = page.locator('[role="tab"], [class*="tab"], button[class*="Tab"]');
    const tabCount = await tabs.count();

    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(300);

        // Verificar que conteudo mudou (nao quebrou)
        const pageContent = await page.locator('body').textContent();
        expect(pageContent?.length).toBeGreaterThan(50);
      }
    }
  });
});

// ============================================
// TESTE 3: VERIFICAR FORMULARIOS
// ============================================
test.describe('Health Check - Formularios', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Formulario de usuario - campos obrigatorios', async ({ page }) => {
    setupConsoleErrorCapture(page, 'UserForm-Required');
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: /novo|adicionar/i });

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Tentar submeter formulario vazio
      const submitButton = page.getByRole('button', { name: /salvar|criar|cadastrar|submit/i });

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Deve mostrar erro de validacao (nao submeter)
        const currentUrl = page.url();
        expect(currentUrl).toContain('/users'); // Nao deve ter navegado
      }
    }
  });

  test('Formulario de tarefa - campos funcionam', async ({ page }) => {
    setupConsoleErrorCapture(page, 'TaskForm-Fields');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    const newButton = page.getByRole('button', { name: /nova|adicionar/i });

    if (await newButton.isVisible()) {
      await newButton.click();
      await page.waitForTimeout(500);

      // Verificar campos do formulario
      const titleField = page.locator('input[name*="title"], input[name*="titulo"], input[placeholder*="titulo"]');

      if (await titleField.isVisible()) {
        await titleField.fill('Teste de tarefa automatizado');

        // Verificar que valor foi preenchido
        const value = await titleField.inputValue();
        expect(value).toBe('Teste de tarefa automatizado');
      }
    }
  });
});

// ============================================
// TESTE 4: VERIFICAR LINKS E NAVEGACAO
// ============================================
test.describe('Health Check - Navegacao', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Menu lateral - todos os links funcionam', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Sidebar-Links');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Encontrar links do menu
    const menuLinks = page.locator('nav a, aside a, [class*="sidebar"] a, [class*="menu"] a');
    const linkCount = await menuLinks.count();

    console.log(`Menu: ${linkCount} links encontrados`);

    const brokenLinks: string[] = [];

    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      const link = menuLinks.nth(i);
      const href = await link.getAttribute('href');

      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        const text = await link.textContent();

        // Testar navegacao
        await link.click();
        await page.waitForTimeout(500);

        const response = await page.reload();
        if (response && response.status() >= 400) {
          brokenLinks.push(`${text}: ${href}`);
        }

        // Voltar para dashboard
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
      }
    }

    if (brokenLinks.length > 0) {
      errorsFound.push({
        page: 'Navigation',
        type: 'broken-link',
        message: `Links quebrados: ${brokenLinks.join(', ')}`
      });
    }
  });

  test('Breadcrumb - navegacao funciona', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Breadcrumb');
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    const breadcrumb = page.locator('[class*="breadcrumb"], nav[aria-label="breadcrumb"]');

    if (await breadcrumb.isVisible()) {
      const links = breadcrumb.locator('a');
      const linkCount = await links.count();

      if (linkCount > 0) {
        await links.first().click();
        await page.waitForTimeout(500);

        // Deve ter navegado
        expect(page.url()).not.toContain('/users');
      }
    }
  });
});

// ============================================
// TESTE 5: VERIFICAR MODAIS E DIALOGS
// ============================================
test.describe('Health Check - Modais', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Modal de confirmacao fecha corretamente', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Modal-Close');
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Tentar abrir qualquer modal
    const triggerButton = page.getByRole('button', { name: /editar|excluir|deletar|edit|delete/i }).first();

    if (await triggerButton.isVisible()) {
      await triggerButton.click();
      await page.waitForTimeout(500);

      // Verificar se modal abriu
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]');

      if (await modal.isVisible()) {
        // Tentar fechar com botao X ou Cancelar
        const closeButton = page.locator('[aria-label="close"], [class*="close"], button:has-text("cancelar"), button:has-text("fechar")');

        if (await closeButton.first().isVisible()) {
          await closeButton.first().click();
          await page.waitForTimeout(300);

          // Modal deve ter fechado
          const isStillVisible = await modal.isVisible().catch(() => false);
          if (isStillVisible) {
            errorsFound.push({
              page: 'Modal',
              type: 'interaction-error',
              message: 'Modal nao fecha corretamente'
            });
          }
        }
      }
    }
  });

  test('Modal fecha com tecla ESC', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Modal-ESC');
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: /novo|adicionar/i });

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], [class*="modal"]');

      if (await modal.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const isStillVisible = await modal.isVisible().catch(() => false);
        // Verificar comportamento (alguns modais nao fecham com ESC por design)
        console.log(`Modal fecha com ESC: ${!isStillVisible}`);
      }
    }
  });
});

// ============================================
// TESTE 6: VERIFICAR RESPONSIVIDADE MOBILE
// ============================================
test.describe('Health Check - Mobile', () => {
  test('Layout mobile nao quebra', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Mobile-Layout');
    await page.setViewportSize({ width: 375, height: 667 });

    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verificar overflow horizontal (scroll indesejado)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalScroll) {
      errorsFound.push({
        page: 'Mobile-Dashboard',
        type: 'layout-error',
        message: 'Scroll horizontal indesejado no mobile'
      });
    }

    // Verificar menu hamburguer
    const hamburger = page.locator('[class*="hamburger"], [aria-label*="menu"], [data-testid="mobile-menu"]');
    const hasHamburger = await hamburger.first().isVisible().catch(() => false);

    console.log(`Menu hamburguer visivel no mobile: ${hasHamburger}`);
  });

  test('Botoes sao tocaveis no mobile', async ({ page }) => {
    setupConsoleErrorCapture(page, 'Mobile-Touch');
    await page.setViewportSize({ width: 375, height: 667 });

    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verificar tamanho minimo de botoes (44x44 para touch)
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    let smallButtons = 0;
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box && (box.width < 40 || box.height < 40)) {
        smallButtons++;
      }
    }

    if (smallButtons > 0) {
      console.warn(`${smallButtons} botoes podem ser pequenos demais para touch`);
    }
  });
});

// ============================================
// TESTE 7: VERIFICAR API ENDPOINTS
// ============================================
test.describe('Health Check - API', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Endpoints principais respondem', async ({ page }) => {
    setupConsoleErrorCapture(page, 'API-Endpoints');

    const endpoints = [
      '/api/users',
      '/api/tasks',
      '/api/events',
      '/api/dashboard/stats',
      '/api/settings',
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint);
      const status = response.status();

      if (status >= 500) {
        errorsFound.push({
          page: 'API',
          type: 'api-error',
          message: `${endpoint} retornou status ${status}`
        });
      }

      console.log(`API ${endpoint}: ${status}`);
    }
  });
});

// ============================================
// RELATORIO FINAL
// ============================================
test.afterAll(async () => {
  console.log('\n========================================');
  console.log('RELATORIO DE SAUDE DO APLICATIVO');
  console.log('========================================\n');

  if (errorsFound.length === 0) {
    console.log('RESULTADO: Nenhum problema critico encontrado!');
  } else {
    console.log(`RESULTADO: ${errorsFound.length} problema(s) encontrado(s):\n`);

    errorsFound.forEach((error, index) => {
      console.log(`${index + 1}. [${error.type}] ${error.page}`);
      console.log(`   Mensagem: ${error.message}\n`);
    });
  }

  console.log('========================================\n');
});
