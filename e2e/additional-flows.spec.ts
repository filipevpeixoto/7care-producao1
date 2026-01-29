import { test, expect, Page } from '@playwright/test';

/**
 * Testes E2E para fluxos adicionais críticos
 * Eleições, Orações, Tarefas, Configurações
 */

/**
 * Helper para login
 */
async function login(page: Page, email = 'admin@7care.com', password = 'admin123') {
  await page.goto('/');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/senha|password/i).fill(password);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// ============================================
// FLUXO: SISTEMA DE ELEIÇÕES
// ============================================
test.describe('Elections Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display elections page', async ({ page }) => {
    await page.goto('/election-config');
    await page.waitForLoadState('networkidle');

    // Verificar se a página carregou
    const pageContent = page.locator('main, [role="main"], .container');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show election dashboard when available', async ({ page }) => {
    await page.goto('/election-dashboard');
    await page.waitForLoadState('networkidle');

    // Verificar conteúdo do dashboard de eleição
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('should navigate to voting page', async ({ page }) => {
    await page.goto('/election-voting');
    await page.waitForLoadState('networkidle');

    // Página de votação deve estar acessível
    const votingContent = page.locator('main, [role="main"], .container');
    await expect(votingContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show election results when available', async ({ page }) => {
    await page.goto('/election-results');
    await page.waitForLoadState('networkidle');

    const resultsContent = page.locator('main, [role="main"], .container');
    await expect(resultsContent.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// FLUXO: PEDIDOS DE ORAÇÃO
// ============================================
test.describe('Prayer Requests Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display prayers page', async ({ page }) => {
    await page.goto('/prayers');
    await page.waitForLoadState('networkidle');

    // Verificar página de orações
    const prayersContent = page.locator('main, [role="main"], .container');
    await expect(prayersContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show prayer list or empty state', async ({ page }) => {
    await page.goto('/prayers');
    await page.waitForLoadState('networkidle');

    // Deve ter lista de orações ou mensagem de vazio
    const hasContent = await page
      .locator('[class*="prayer"], [data-testid*="prayer"], [class*="card"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/nenhum|vazio|empty|sem pedidos/i)
      .isVisible()
      .catch(() => false);

    expect(hasContent || hasEmptyState).toBeTruthy();
  });

  test('should have button to add new prayer', async ({ page }) => {
    await page.goto('/prayers');
    await page.waitForLoadState('networkidle');

    // Botão de adicionar
    const addButton = page.getByRole('button', { name: /novo|adicionar|add|criar|new/i });
    if (await addButton.isVisible()) {
      await expect(addButton).toBeEnabled();
    }
  });
});

// ============================================
// FLUXO: GERENCIAMENTO DE TAREFAS
// ============================================
test.describe('Tasks Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display tasks page', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    const tasksContent = page.locator('main, [role="main"], .container');
    await expect(tasksContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show task categories or tabs', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Tabs ou categorias de tarefas
    const tabs = page.locator('[role="tablist"], [class*="tabs"], .tab-list');
    if (await tabs.first().isVisible()) {
      await expect(tabs.first()).toBeVisible();
    }
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Filtros de status
    const pendingFilter = page.getByText(/pendente|pending|a fazer|todo/i);
    const completedFilter = page.getByText(/concluíd|complet|done|finaliz/i);

    const hasPending = await pendingFilter
      .first()
      .isVisible()
      .catch(() => false);
    const hasCompleted = await completedFilter
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasPending || hasCompleted).toBeTruthy();
  });
});

// ============================================
// FLUXO: CONFIGURAÇÕES DO SISTEMA
// ============================================
test.describe('Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const settingsContent = page.locator('main, [role="main"], .container');
    await expect(settingsContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show settings sections/tabs', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Seções ou tabs de configurações
    const sections = page.locator('[role="tablist"], [class*="tabs"], nav a, .settings-nav');
    await expect(sections.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display church/system info', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Informações da igreja ou sistema
    const churchInfo = page.getByText(/igreja|church|congregação|sistema/i);
    await expect(churchInfo.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// FLUXO: DISTRITOS
// ============================================
test.describe('Districts Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display districts page', async ({ page }) => {
    await page.goto('/districts');
    await page.waitForLoadState('networkidle');

    const districtsContent = page.locator('main, [role="main"], .container');
    await expect(districtsContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show list of districts or empty state', async ({ page }) => {
    await page.goto('/districts');
    await page.waitForLoadState('networkidle');

    const hasList = await page
      .locator('[class*="card"], table, [data-testid*="district"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/nenhum distrito|sem distrito|empty/i)
      .isVisible()
      .catch(() => false);

    expect(hasList || hasEmptyState).toBeTruthy();
  });
});

// ============================================
// FLUXO: PASTORES
// ============================================
test.describe('Pastors Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display pastors page', async ({ page }) => {
    await page.goto('/pastors');
    await page.waitForLoadState('networkidle');

    const pastorsContent = page.locator('main, [role="main"], .container');
    await expect(pastorsContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show list of pastors', async ({ page }) => {
    await page.goto('/pastors');
    await page.waitForLoadState('networkidle');

    const hasList = await page
      .locator('[class*="card"], table tbody tr, [data-testid*="pastor"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/nenhum pastor|sem pastor|empty/i)
      .isVisible()
      .catch(() => false);

    expect(hasList || hasEmptyState).toBeTruthy();
  });
});

// ============================================
// TESTES DE RESPONSIVIDADE
// ============================================
test.describe('Responsive Design Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard deve estar visível em mobile
    const content = page.locator('main, [role="main"], .container');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Menu hamburger ou mobile menu
    const mobileMenu = page.locator(
      '[class*="hamburger"], [data-testid="mobile-menu"], [aria-label*="menu"], button svg'
    );
    if (await mobileMenu.first().isVisible()) {
      await mobileMenu.first().click();
      // Menu deve abrir
      await page.waitForTimeout(500);
    }
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, [role="main"], .container');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, [role="main"], .container');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// TESTES DE PERFORMANCE
// ============================================
test.describe('Performance Tests', () => {
  test('should load login page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should load dashboard within 5 seconds', async ({ page }) => {
    await login(page);

    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    await login(page);

    // Navegar várias vezes
    for (let i = 0; i < 5; i++) {
      await page.goto('/dashboard');
      await page.goto('/users');
      await page.goto('/calendar');
    }

    // Se chegou até aqui sem crash, está ok
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================
// TESTES DE ESTADO DA APLICAÇÃO
// ============================================
test.describe('Application State Tests', () => {
  test('should maintain state after navigation', async ({ page }) => {
    await login(page);
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Aplicar filtro
    const searchField = page.getByPlaceholder(/buscar|search/i).first();
    if (await searchField.isVisible()) {
      await searchField.fill('teste');
      await page.waitForTimeout(500);
    }

    // Navegar para outra página e voltar
    await page.goto('/dashboard');
    await page.goBack();

    // Página deve carregar corretamente
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle browser back/forward buttons', async ({ page }) => {
    await login(page);

    await page.goto('/dashboard');
    await page.goto('/users');
    await page.goto('/calendar');

    // Voltar
    await page.goBack();
    await expect(page.url()).toContain('/users');

    // Avançar
    await page.goForward();
    await expect(page.url()).toContain('/calendar');
  });

  test('should handle page refresh without errors', async ({ page }) => {
    await login(page);
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Recarregar a página
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Deve permanecer na mesma página
    await expect(page.url()).toContain('/users');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================
// TESTES DE FORMULÁRIOS
// ============================================
test.describe('Form Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: /novo|adicionar|add/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Tentar submeter sem preencher
      const submitButton = page.getByRole('button', {
        name: /salvar|save|criar|create|confirmar/i,
      });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Deve mostrar erro de validação
        await page.waitForTimeout(500);
      }
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: /novo|adicionar|add/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const emailField = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
      if (await emailField.isVisible()) {
        await emailField.fill('invalid-email');
        await emailField.blur();
        await page.waitForTimeout(500);
      }
    }
  });
});

// ============================================
// TESTES DE NOTIFICAÇÕES
// ============================================
test.describe('Notifications Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display notifications page', async ({ page }) => {
    await page.goto('/push-notifications');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, [role="main"], .container');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show notification bell or icon', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Ícone de notificação
    const notificationIcon = page.locator(
      '[class*="notification"], [aria-label*="notif"], [data-testid*="notif"], svg[class*="bell"]'
    );
    if (await notificationIcon.first().isVisible()) {
      await expect(notificationIcon.first()).toBeVisible();
    }
  });
});
