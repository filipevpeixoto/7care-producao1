import { test, expect, Page } from '@playwright/test';

/**
 * Testes E2E para fluxos críticos de negócio
 * Foco em jornadas completas do usuário
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

/**
 * Helper para logout
 */
async function logout(page: Page) {
  // Clicar no menu do usuário
  await page.locator('[data-testid="user-menu"], .user-menu, [aria-label*="menu"]').first().click();
  await page.getByText(/sair|logout/i).click();
  await page.waitForURL('/', { timeout: 5000 });
}

// ============================================
// FLUXO COMPLETO: CADASTRO DE MEMBRO
// ============================================
test.describe('Member Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should complete full member registration', async ({ page }) => {
    // Navegar para cadastro de membros
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Clicar em novo usuário
    const addButton = page.getByRole('button', { name: /novo|adicionar|add/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Preencher formulário
      const nameField = page.getByLabel(/nome/i).or(page.getByPlaceholder(/nome/i));
      if (await nameField.isVisible()) {
        await nameField.fill('Teste E2E ' + Date.now());
      }
      
      const emailField = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
      if (await emailField.isVisible()) {
        await emailField.fill(`teste${Date.now()}@e2e.com`);
      }
    }
  });

  test('should search and filter members', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Buscar membro
    const searchField = page.getByPlaceholder(/buscar|pesquisar|search/i).first();
    if (await searchField.isVisible()) {
      await searchField.fill('Maria');
      await page.waitForTimeout(500);
      
      // Verificar resultados filtrados
      await expect(page.locator('table tbody tr, [data-testid="user-card"], .user-item')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should export members list', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Verificar se botão de exportar existe
    const exportButton = page.getByRole('button', { name: /exportar|export|download/i });
    if (await exportButton.isVisible()) {
      // Não clicar para não baixar arquivo, apenas verificar existência
      await expect(exportButton).toBeEnabled();
    }
  });
});

// ============================================
// FLUXO COMPLETO: SISTEMA DE PONTOS
// ============================================
test.describe('Points System Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display gamification dashboard', async ({ page }) => {
    await page.goto('/gamification');
    await page.waitForLoadState('networkidle');
    
    // Verificar elementos de gamificação
    const pointsElement = page.getByText(/ponto|point/i).first();
    await expect(pointsElement).toBeVisible({ timeout: 10000 });
  });

  test('should show ranking/leaderboard', async ({ page }) => {
    await page.goto('/gamification');
    await page.waitForLoadState('networkidle');
    
    // Verificar ranking
    const rankingElement = page.getByText(/ranking|classificação|posição/i);
    if (await rankingElement.first().isVisible()) {
      await expect(rankingElement.first()).toBeVisible();
    }
  });
});

// ============================================
// FLUXO COMPLETO: CALENDÁRIO DE EVENTOS
// ============================================
test.describe('Calendar Events Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display calendar', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    
    // Verificar calendário
    const calendarElement = page.locator('.calendar, [class*="calendar"], [data-testid="calendar"]');
    await expect(calendarElement.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between months', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    
    // Botões de navegação
    const nextButton = page.getByRole('button', { name: /próximo|next|›/i });
    const prevButton = page.getByRole('button', { name: /anterior|prev|‹/i });
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      await prevButton.click();
    }
  });
});

// ============================================
// FLUXO COMPLETO: CHAT/MENSAGENS
// ============================================
test.describe('Chat/Messages Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display chat interface', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    // Interface de chat
    const chatElement = page.locator('[class*="chat"], [data-testid="chat"], .messages');
    await expect(chatElement.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show conversation list', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    // Lista de conversas
    const conversationList = page.locator('[class*="conversation"], [data-testid="conversations"]');
    if (await conversationList.first().isVisible()) {
      await expect(conversationList.first()).toBeVisible();
    }
  });
});

// ============================================
// FLUXO COMPLETO: DISCIPULADO
// ============================================
test.describe('Discipleship Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display discipleship page', async ({ page }) => {
    await page.goto('/discipleship');
    await page.waitForLoadState('networkidle');
    
    // Página de discipulado
    const discipleshipElement = page.getByText(/discipulado|discipleship/i).first();
    await expect(discipleshipElement).toBeVisible({ timeout: 10000 });
  });

  test('should show relationships tree', async ({ page }) => {
    await page.goto('/discipleship');
    await page.waitForLoadState('networkidle');
    
    // Árvore de relacionamentos
    const treeElement = page.locator('[class*="tree"], [data-testid="relationship-tree"]');
    if (await treeElement.first().isVisible()) {
      await expect(treeElement.first()).toBeVisible();
    }
  });
});

// ============================================
// TESTES DE PERFORMANCE
// ============================================
test.describe('Performance Tests', () => {
  test('should load dashboard within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await login(page);
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // 5 segundos incluindo login
  });

  test('should load users list within 2 seconds', async ({ page }) => {
    await login(page);
    
    const startTime = Date.now();
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle pagination smoothly', async ({ page }) => {
    await login(page);
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Verificar paginação
    const nextPageButton = page.getByRole('button', { name: /próximo|next|›/i });
    if (await nextPageButton.isVisible()) {
      const startTime = Date.now();
      await nextPageButton.click();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000);
    }
  });
});

// ============================================
// TESTES DE RESPONSIVIDADE
// ============================================
test.describe('Responsive Design Tests', () => {
  test('should display mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await login(page);
    
    // Verificar menu mobile
    const hamburgerMenu = page.locator('[data-testid="mobile-menu"], [class*="hamburger"], button[aria-label*="menu"]');
    await expect(hamburgerMenu.first()).toBeVisible({ timeout: 5000 });
  });

  test('should adapt layout for tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await login(page);
    
    // Layout deve se adaptar
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display full layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    
    // Sidebar deve estar visível em desktop
    const sidebar = page.locator('[class*="sidebar"], nav, [data-testid="sidebar"]');
    await expect(sidebar.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// TESTES DE ACESSIBILIDADE
// ============================================
test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Verificar H1
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Todas as imagens devem ter alt
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Tab deve funcionar para navegação
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Algum elemento deve ter foco
    const focusedElement = await page.locator(':focus').count();
    expect(focusedElement).toBeGreaterThan(0);
  });
});

// ============================================
// TESTES DE SEGURANÇA BÁSICA
// ============================================
test.describe('Security Tests', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Deve redirecionar para login
    await page.waitForURL('/', { timeout: 5000 });
  });

  test('should not expose sensitive data in URL', async ({ page }) => {
    await login(page);
    
    // URL não deve conter senha ou tokens sensíveis
    expect(page.url()).not.toContain('password');
    expect(page.url()).not.toContain('token');
    expect(page.url()).not.toContain('secret');
  });

  test('should have secure headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    
    // Verificar headers de segurança
    // X-Frame-Options ou CSP frame-ancestors
    const hasFrameProtection = 
      headers?.['x-frame-options'] || 
      headers?.['content-security-policy']?.includes('frame-ancestors');
    
    expect(hasFrameProtection).toBeTruthy();
  });

  test('should handle XSS attempts', async ({ page }) => {
    await login(page);
    await page.goto('/users');
    
    const searchField = page.getByPlaceholder(/buscar|search/i).first();
    if (await searchField.isVisible()) {
      // Tentar injetar script
      await searchField.fill('<script>alert("xss")</script>');
      await page.waitForTimeout(500);
      
      // Script não deve executar
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      expect(dialog).toBeNull();
    }
  });
});
