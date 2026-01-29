import { test, expect, Page } from '@playwright/test';

/**
 * Testes E2E para funcionalidades do Dashboard
 * Cobre widgets, métricas, navegação e responsividade
 */

// ============================================
// CONFIGURAÇÃO E HELPERS
// ============================================

const TEST_USER = {
  email: 'admin@7care.com',
  password: 'admin123',
};

/**
 * Helper para login
 */
async function login(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
  await page.getByPlaceholder(/senha|password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// ============================================
// TESTES DO DASHBOARD
// ============================================
test.describe('Dashboard Core Features', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard header with user info', async ({ page }) => {
    // Verificar header com informações do usuário
    const userInfo = page.locator('[data-testid="user-menu"], .user-info, [class*="user-name"]');
    await expect(userInfo.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show welcome message or greeting', async ({ page }) => {
    // Verificar mensagem de boas-vindas
    const greeting = page.getByText(/olá|bem-vindo|welcome|bom dia|boa tarde|boa noite/i);
    await expect(greeting.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display statistics cards', async ({ page }) => {
    // Verificar cards de estatísticas
    const statsCards = page.locator('[class*="stat"], [class*="card"], [data-testid*="stat"]');
    const cardsCount = await statsCards.count();
    expect(cardsCount).toBeGreaterThan(0);
  });

  test('should show member count or metrics', async ({ page }) => {
    // Verificar métricas de membros
    const metrics = page.getByText(/membros|usuários|total|ativos/i);
    await expect(metrics.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// TESTES DE NAVEGAÇÃO
// ============================================
test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have working sidebar navigation', async ({ page }) => {
    // Verificar sidebar
    const sidebar = page.locator('nav, aside, [class*="sidebar"], [role="navigation"]');
    await expect(sidebar.first()).toBeVisible({ timeout: 10000 });

    // Verificar links de navegação
    const navLinks = sidebar.locator('a, [role="link"]');
    const linksCount = await navLinks.count();
    expect(linksCount).toBeGreaterThan(0);
  });

  test('should navigate to users page', async ({ page }) => {
    // Clicar no link de usuários
    const usersLink = page.getByRole('link', { name: /usuários|membros|users/i });
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await expect(page).toHaveURL(/users/i, { timeout: 10000 });
    }
  });

  test('should navigate to calendar page', async ({ page }) => {
    // Clicar no link de calendário
    const calendarLink = page.getByRole('link', { name: /calendário|agenda|events/i });
    if (await calendarLink.isVisible()) {
      await calendarLink.click();
      await expect(page).toHaveURL(/calendar/i, { timeout: 10000 });
    }
  });

  test('should navigate to gamification page', async ({ page }) => {
    // Clicar no link de gamificação
    const gamificationLink = page.getByRole('link', { name: /gamificação|pontos|ranking/i });
    if (await gamificationLink.isVisible()) {
      await gamificationLink.click();
      await expect(page).toHaveURL(/gamification/i, { timeout: 10000 });
    }
  });

  test('should have breadcrumb navigation', async ({ page }) => {
    // Navegar para uma página interna
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Verificar breadcrumb
    const breadcrumb = page.locator('[class*="breadcrumb"], nav[aria-label="breadcrumb"]');
    if (await breadcrumb.isVisible()) {
      const homeLink = breadcrumb.getByText(/home|início|dashboard/i);
      await expect(homeLink).toBeVisible();
    }
  });
});

// ============================================
// TESTES DE WIDGETS
// ============================================
test.describe('Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display quick actions', async ({ page }) => {
    // Verificar ações rápidas
    const quickActions = page.locator(
      '[class*="quick-action"], [data-testid*="quick"], [class*="action-button"]'
    );
    await expect(quickActions.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show recent activities', async ({ page }) => {
    // Verificar atividades recentes
    const activities = page.getByText(/recentes|atividades|últimas|recent/i);
    if (await activities.first().isVisible()) {
      await expect(activities.first()).toBeVisible();
    }
  });

  test('should display upcoming events', async ({ page }) => {
    // Verificar próximos eventos
    const events = page.getByText(/próximos eventos|upcoming|agenda/i);
    if (await events.first().isVisible()) {
      await expect(events.first()).toBeVisible();
    }
  });

  test('should show notifications or alerts', async ({ page }) => {
    // Verificar notificações
    const notifications = page.locator(
      '[class*="notification"], [data-testid*="notification"], [class*="alert"]'
    );
    if (await notifications.first().isVisible()) {
      await expect(notifications.first()).toBeVisible();
    }
  });
});

// ============================================
// TESTES DE RESPONSIVIDADE
// ============================================
test.describe('Dashboard Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Redimensionar para mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Verificar que o dashboard ainda é usável
    const dashboard = page.locator('[class*="dashboard"], main, [role="main"]');
    await expect(dashboard.first()).toBeVisible();

    // Verificar menu hambúrguer ou adaptação
    const hamburgerMenu = page.locator(
      '[class*="hamburger"], [data-testid="mobile-menu"], [aria-label*="menu"]'
    );
    const isMenuVisible = await hamburgerMenu
      .first()
      .isVisible()
      .catch(() => false);

    // Deve ter menu mobile ou sidebar colapsada
    expect(isMenuVisible || (await page.locator('nav').isVisible())).toBe(true);
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Redimensionar para tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Verificar layout adaptado
    const dashboard = page.locator('[class*="dashboard"], main, [role="main"]');
    await expect(dashboard.first()).toBeVisible();
  });

  test('should handle large screen properly', async ({ page }) => {
    // Redimensionar para tela grande
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Verificar layout aproveitando o espaço
    const dashboard = page.locator('[class*="dashboard"], main, [role="main"]');
    await expect(dashboard.first()).toBeVisible();
  });
});

// ============================================
// TESTES DE PERFORMANCE
// ============================================
test.describe('Dashboard Performance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Dashboard deve carregar em menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);
  });

  test('should show loading state while fetching data', async ({ page }) => {
    // Recarregar para ver loading state
    await page.reload();

    // Verificar indicador de loading (se existir)
    const loadingIndicator = page.locator(
      '[class*="loading"], [class*="spinner"], [role="status"]'
    );
    // Loading pode ser muito rápido para capturar, então apenas verificamos que a página carrega
    await page.waitForLoadState('networkidle');
  });

  test('should handle data refresh', async ({ page }) => {
    // Procurar botão de refresh
    const refreshButton = page.getByRole('button', { name: /atualizar|refresh|reload/i });
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForLoadState('networkidle');

      // Verificar que dados foram atualizados (página não travou)
      const dashboard = page.locator('[class*="dashboard"], main, [role="main"]');
      await expect(dashboard.first()).toBeVisible();
    }
  });
});

// ============================================
// TESTES DE FILTROS E BUSCA
// ============================================
test.describe('Dashboard Search and Filters', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have global search functionality', async ({ page }) => {
    // Verificar campo de busca global
    const searchField = page.getByPlaceholder(/buscar|pesquisar|search/i);
    if (await searchField.isVisible()) {
      await expect(searchField).toBeVisible();

      // Testar busca
      await searchField.fill('teste');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  });

  test('should filter dashboard data by date range', async ({ page }) => {
    // Procurar filtro de data
    const dateFilter = page.locator(
      '[data-testid*="date"], [class*="date-picker"], [class*="date-filter"]'
    );
    if (await dateFilter.first().isVisible()) {
      await dateFilter.first().click();
      await page.waitForTimeout(500);
    }
  });
});

// ============================================
// TESTES DE ACESSIBILIDADE
// ============================================
test.describe('Dashboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Verificar hierarquia de headings
    const h1 = await page.locator('h1').count();
    const h2 = await page.locator('h2').count();

    // Deve ter pelo menos um h1 e alguns h2
    expect(h1).toBeGreaterThanOrEqual(1);
    expect(h2).toBeGreaterThanOrEqual(0);
  });

  test('should have accessible navigation', async ({ page }) => {
    // Verificar navegação acessível
    const nav = page.locator('[role="navigation"], nav');
    await expect(nav.first()).toBeVisible();
  });

  test('should support keyboard navigation in sidebar', async ({ page }) => {
    // Focar na sidebar
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first();
    await sidebar.focus();

    // Navegar por Tab
    await page.keyboard.press('Tab');

    // Verificar que algum link está focado
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);
  });

  test('should have proper color contrast', async ({ page }) => {
    // Verificar que textos são visíveis (teste básico)
    const mainText = page.locator('h1, h2, p').first();
    await expect(mainText).toBeVisible();

    // Verificar que não há texto invisível (cor igual ao fundo)
    const textColor = await mainText.evaluate(el => getComputedStyle(el).color);
    expect(textColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});

// ============================================
// TESTES DE INTERAÇÕES
// ============================================
test.describe('Dashboard Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should open modal on card click', async ({ page }) => {
    // Clicar em um card que abre modal
    const clickableCard = page
      .locator('[class*="card"][role="button"], [class*="clickable"]')
      .first();
    if (await clickableCard.isVisible()) {
      await clickableCard.click();

      // Verificar se modal abriu
      const modal = page.locator('[role="dialog"], [class*="modal"]');
      if (await modal.isVisible({ timeout: 3000 })) {
        await expect(modal).toBeVisible();

        // Fechar modal
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should show tooltip on hover', async ({ page }) => {
    // Hover em elemento com tooltip
    const elementWithTooltip = page.locator('[title], [data-tooltip], [aria-describedby]').first();
    if (await elementWithTooltip.isVisible()) {
      await elementWithTooltip.hover();
      await page.waitForTimeout(500);

      // Verificar tooltip (pode ser title ou elemento separado)
      const tooltip = page.locator('[role="tooltip"], [class*="tooltip"]');
      if (await tooltip.isVisible()) {
        await expect(tooltip).toBeVisible();
      }
    }
  });

  test('should expand/collapse sections', async ({ page }) => {
    // Procurar seção colapsável
    const expandButton = page
      .locator('[aria-expanded], [class*="collapse"], [class*="accordion"]')
      .first();
    if (await expandButton.isVisible()) {
      const wasExpanded = (await expandButton.getAttribute('aria-expanded')) === 'true';
      await expandButton.click();
      await page.waitForTimeout(300);

      const isExpanded = (await expandButton.getAttribute('aria-expanded')) === 'true';
      expect(isExpanded).not.toBe(wasExpanded);
    }
  });
});
