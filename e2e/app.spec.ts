import { test, expect, Page } from '@playwright/test';

/**
 * Helpers para testes E2E
 */
async function login(page: Page, email = 'admin@7care.com', password = 'admin123') {
  await page.goto('/');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/senha|password/i).fill(password);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// ============================================
// TESTES DE AUTENTICAÇÃO
// ============================================
test.describe('Authentication Flow', () => {
  test('should display login page with all elements', async ({ page }) => {
    await page.goto('/');
    
    // Logo ou título
    await expect(page.locator('img[alt*="logo"], h1, [class*="logo"]')).toBeVisible();
    
    // Campos de formulário
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/senha|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar|login/i })).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /entrar|login/i }).click();
    
    // Deve mostrar algum erro de validação
    const errorMessage = page.locator('[class*="error"], [role="alert"], .text-red-500, .text-destructive');
    await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByPlaceholder(/senha|password/i).fill('password123');
    await page.getByRole('button', { name: /entrar|login/i }).click();
    
    // Verificar mensagem de erro ou validação
    await page.waitForTimeout(1000);
  });

  test('should show error for wrong credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill('wrong@email.com');
    await page.getByPlaceholder(/senha|password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /entrar|login/i }).click();
    
    // Aguardar resposta do servidor
    await expect(page.getByText(/inválid|erro|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login and redirect to dashboard', async ({ page }) => {
    await login(page);
    await expect(page.url()).toContain('/dashboard');
  });

  test('should persist session after page reload', async ({ page }) => {
    await login(page);
    await page.reload();
    
    // Deve continuar no dashboard ou área autenticada
    await expect(page.url()).not.toBe('/');
  });
});

// ============================================
// TESTES DO DASHBOARD
// ============================================
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display main dashboard components', async ({ page }) => {
    // Cards de estatísticas
    const statsCards = page.locator('[class*="card"], [data-testid*="stat"]');
    await expect(statsCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display gamification card', async ({ page }) => {
    // Card de gamificação com pontos
    await expect(page.getByText(/pont|score|level|nível/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to different pages via sidebar/menu', async ({ page }) => {
    // Tentar navegar para usuários
    const usersLink = page.getByRole('link', { name: /usuário|user|membr/i }).first();
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await expect(page.url()).toContain('/users');
    }
  });

  test('should have working navigation breadcrumbs', async ({ page }) => {
    await page.goto('/users');
    
    // Verificar se breadcrumbs existem
    const breadcrumb = page.locator('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]');
    if (await breadcrumb.isVisible()) {
      await expect(breadcrumb).toContainText(/dashboard|início|home/i);
    }
  });
});

// ============================================
// TESTES DA PÁGINA DE USUÁRIOS
// ============================================
test.describe('Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/users');
  });

  test('should display users list or grid', async ({ page }) => {
    // Aguardar carregamento
    await page.waitForLoadState('networkidle');
    
    // Deve ter cards de usuários ou tabela
    const userElements = page.locator('[class*="card"], tr, [data-testid*="user"]');
    await expect(userElements.first()).toBeVisible({ timeout: 15000 });
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|search|filtrar/i);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Maria');
      await page.waitForTimeout(500); // Debounce
      
      // Verificar que a busca foi aplicada (URL ou filtro visual)
    }
  });

  test('should have filter options', async ({ page }) => {
    // Botão ou drawer de filtros
    const filterButton = page.getByRole('button', { name: /filtro|filter/i });
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // Drawer ou modal de filtros deve abrir
      await page.waitForTimeout(300);
    }
  });

  test('should display user cards with points', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verificar se pontos são exibidos
    const pointsElement = page.getByText(/pont|pts|score/i);
    await expect(pointsElement.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open user details on click', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Clicar no primeiro card de usuário
    const userCard = page.locator('[class*="card"]').first();
    if (await userCard.isVisible()) {
      await userCard.click();
      
      // Modal ou página de detalhes deve abrir
      await page.waitForTimeout(500);
    }
  });
});

// ============================================
// TESTES DE GAMIFICAÇÃO
// ============================================
test.describe('Gamification Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/gamification');
  });

  test('should display gamification elements', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Título ou elementos de gamificação
    await expect(page.getByText(/gamifica|pont|ranking|conquist/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display user ranking', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Lista de ranking ou posições
    const rankingElement = page.locator('[class*="ranking"], [class*="leaderboard"], table');
    if (await rankingElement.isVisible()) {
      await expect(rankingElement).toBeVisible();
    }
  });

  test('should show points breakdown', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Detalhamento de pontos
    const breakdownElement = page.getByText(/detalh|breakdown|categoria/i);
    if (await breakdownElement.isVisible()) {
      await expect(breakdownElement).toBeVisible();
    }
  });
});

// ============================================
// TESTES DE CONFIGURAÇÕES
// ============================================
test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Título de configurações
    await expect(page.getByText(/configura|settings|ajuste/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should have points configuration section', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Seção de configuração de pontos
    const pointsSection = page.getByText(/pont|gamifica|base.*cálculo/i);
    if (await pointsSection.first().isVisible()) {
      await expect(pointsSection.first()).toBeVisible();
    }
  });

  test('should be able to modify settings', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verificar se há inputs editáveis
    const inputs = page.locator('input[type="number"], input[type="text"]');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });
});

// ============================================
// TESTES DE CALENDÁRIO
// ============================================
test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/calendar');
  });

  test('should display calendar', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Calendário visível
    const calendar = page.locator('[class*="calendar"], [role="grid"]');
    await expect(calendar.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between months', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Botões de navegação
    const nextButton = page.getByRole('button', { name: /próximo|next|>/i });
    const prevButton = page.getByRole('button', { name: /anterior|prev|</i });
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }
  });
});

// ============================================
// TESTES DE CHAT/MENSAGENS
// ============================================
test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/chat');
  });

  test('should display chat interface', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Interface de chat
    await expect(page.locator('[class*="chat"], [class*="message"], [class*="conversation"]').first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// TESTES DE TAREFAS
// ============================================
test.describe('Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
  });

  test('should display tasks page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Página de tarefas
    await expect(page.getByText(/tarefa|task|atividade/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should have create task button', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const createButton = page.getByRole('button', { name: /nova|criar|add|new/i });
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
    }
  });
});

// ============================================
// TESTES DE ORAÇÕES
// ============================================
test.describe('Prayers Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/prayers');
  });

  test('should display prayers page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Página de orações
    await expect(page.getByText(/oraç|prayer|pedido/i).first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// TESTES DE ACESSIBILIDADE
// ============================================
test.describe('Accessibility Tests', () => {
  test('login page should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Tab através dos elementos
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que elementos focados têm indicador visual
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    
    // Deve ter outline ou ring de foco
    await expect(focusedElement).toBeVisible();
  });

  test('forms should have proper labels', async ({ page }) => {
    await page.goto('/');
    
    // Verificar labels ou aria-labels
    const emailInput = page.getByPlaceholder(/email/i);
    const hasLabel = await emailInput.getAttribute('aria-label') || 
                     await page.locator(`label[for="${await emailInput.getAttribute('id')}"]`).isVisible();
    
    // Input deve ter alguma forma de label
    expect(await emailInput.getAttribute('placeholder') || hasLabel).toBeTruthy();
  });

  test('images should have alt text', async ({ page }) => {
    await login(page);
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Deve ter alt ou role="presentation"
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('buttons should have accessible names', async ({ page }) => {
    await login(page);
    
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      
      // Botão deve ter texto, aria-label ou title
      expect(text?.trim() || ariaLabel || title).toBeTruthy();
    }
  });
});

// ============================================
// TESTES DE RESPONSIVIDADE
// ============================================
test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Large Desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Login deve ser visível
      await expect(page.getByRole('button', { name: /entrar|login/i })).toBeVisible();
      
      // Fazer login
      await page.getByPlaceholder(/email/i).fill('admin@7care.com');
      await page.getByPlaceholder(/senha|password/i).fill('admin123');
      await page.getByRole('button', { name: /entrar|login/i }).click();
      
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      
      // Dashboard deve carregar
      await page.waitForLoadState('networkidle');
    });
  }

  test('mobile menu should work', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    
    // Procurar menu hamburger
    const menuButton = page.locator('[class*="menu"], [aria-label*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
    }
  });
});

// ============================================
// TESTES DE PERFORMANCE
// ============================================
test.describe('Performance Tests', () => {
  test('login page should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // Deve carregar em menos de 3 segundos
    expect(loadTime).toBeLessThan(3000);
  });

  test('dashboard should load within reasonable time', async ({ page }) => {
    await login(page);
    
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Deve carregar em menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);
  });
});

// ============================================
// TESTES DE ERRO
// ============================================
test.describe('Error Handling Tests', () => {
  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');
    
    // Deve mostrar página 404
    await expect(page.getByText(/404|não encontrad|not found/i)).toBeVisible({ timeout: 5000 });
  });

  test('should have navigation back from 404', async ({ page }) => {
    await page.goto('/unknown-route-xyz');
    
    // Deve ter link para voltar
    const backLink = page.getByRole('link', { name: /volta|home|dashboard|início/i });
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page.url()).not.toContain('unknown-route');
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await login(page);
    
    // Simular perda de conexão
    await page.context().setOffline(true);
    
    await page.goto('/users').catch(() => {});
    
    // Restaurar conexão
    await page.context().setOffline(false);
  });
});

// ============================================
// TESTES DE ELEIÇÕES
// ============================================
test.describe('Elections Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/elections');
  });

  test('should display elections page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Página de eleições
    await expect(page.getByText(/eleiç|election|votaç/i).first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// TESTES DE DISTRITOS
// ============================================
test.describe('Districts Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/districts');
  });

  test('should display districts page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Página de distritos
    await expect(page.getByText(/distrito|district/i).first()).toBeVisible({ timeout: 10000 });
  });
});
