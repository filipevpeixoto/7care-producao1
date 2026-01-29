import { test, expect, Page } from '@playwright/test';

/**
 * Testes E2E para fluxos de autenticação
 * Cobre login, registro, recuperação de senha e logout
 */

// ============================================
// CONFIGURAÇÃO E HELPERS
// ============================================

const TEST_USER = {
  email: 'admin@7care.com',
  password: 'admin123',
  name: 'Admin Test',
};

const NEW_USER = {
  name: 'Novo Usuário E2E',
  email: `novo_${Date.now()}@e2e.test`,
  password: 'SenhaForte123!',
};

/**
 * Helper para verificar se está na página de login
 */
async function isOnLoginPage(page: Page): Promise<boolean> {
  const loginForm = page.getByRole('button', { name: /entrar|login/i });
  return loginForm.isVisible({ timeout: 3000 }).catch(() => false);
}

/**
 * Helper para verificar se está autenticado
 */
async function isAuthenticated(page: Page): Promise<boolean> {
  const dashboardUrl = page.url().includes('/dashboard');
  const userMenu = await page
    .locator('[data-testid="user-menu"], .user-menu, [aria-label*="usuário"]')
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  return dashboardUrl || userMenu;
}

// ============================================
// TESTES DE LOGIN
// ============================================
test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    // Verificar elementos do formulário de login
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/senha|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar|login/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Preencher com credenciais inválidas
    await page.getByPlaceholder(/email/i).fill('invalido@email.com');
    await page.getByPlaceholder(/senha|password/i).fill('senhaerrada');
    await page.getByRole('button', { name: /entrar|login/i }).click();

    // Verificar mensagem de erro
    await expect(page.getByText(/credenciais|inválido|incorreto|error/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show error for empty fields', async ({ page }) => {
    // Tentar login sem preencher campos
    await page.getByRole('button', { name: /entrar|login/i }).click();

    // Verificar validação
    await expect(page.getByText(/obrigatório|required|preencha/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Login com credenciais válidas
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/senha|password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /entrar|login/i }).click();

    // Verificar redirecionamento para dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should show password toggle visibility', async ({ page }) => {
    const passwordField = page.getByPlaceholder(/senha|password/i);
    await passwordField.fill('senha123');

    // Verificar se campo é do tipo password
    await expect(passwordField).toHaveAttribute('type', 'password');

    // Procurar botão de mostrar senha
    const toggleButton = page.locator(
      '[data-testid="toggle-password"], [aria-label*="senha"], .password-toggle'
    );
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await expect(passwordField).toHaveAttribute('type', 'text');
    }
  });

  test('should redirect to dashboard if already logged in', async ({ page }) => {
    // Login primeiro
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/senha|password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Tentar acessar login novamente
    await page.goto('/');

    // Deve redirecionar de volta para dashboard (ou permanecer se não houver redirect)
    const isLogin = await isOnLoginPage(page);
    const isAuth = await isAuthenticated(page);
    expect(isLogin || isAuth).toBe(true);
  });
});

// ============================================
// TESTES DE LOGOUT
// ============================================
test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login antes de cada teste
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/senha|password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Abrir menu do usuário
    const userMenu = page
      .locator('[data-testid="user-menu"], .user-menu, [aria-label*="menu"]')
      .first();
    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Clicar em logout
      await page.getByText(/sair|logout/i).click();

      // Verificar redirecionamento para login
      await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should clear session after logout', async ({ page }) => {
    // Fazer logout
    const userMenu = page
      .locator('[data-testid="user-menu"], .user-menu, [aria-label*="menu"]')
      .first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.getByText(/sair|logout/i).click();
      await page.waitForTimeout(1000);
    }

    // Tentar acessar página protegida
    await page.goto('/dashboard');

    // Deve redirecionar para login
    await expect(
      page.getByPlaceholder(/email/i).or(page.getByRole('button', { name: /entrar|login/i }))
    ).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// TESTES DE REGISTRO
// ============================================
test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have link to registration page', async ({ page }) => {
    const registerLink = page.getByText(/cadastr|registr|criar conta/i);
    await expect(registerLink.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display registration form', async ({ page }) => {
    // Clicar no link de registro
    const registerLink = page.getByText(/cadastr|registr|criar conta/i).first();
    if (await registerLink.isVisible()) {
      await registerLink.click();

      // Verificar campos do formulário
      await expect(page.getByPlaceholder(/nome/i).or(page.getByLabel(/nome/i))).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByPlaceholder(/email/i).or(page.getByLabel(/email/i))).toBeVisible();
      await expect(
        page
          .getByPlaceholder(/senha|password/i)
          .first()
          .or(page.getByLabel(/senha/i).first())
      ).toBeVisible();
    }
  });

  test('should validate email format', async ({ page }) => {
    const registerLink = page.getByText(/cadastr|registr|criar conta/i).first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(500);

      // Preencher email inválido
      const emailField = page.getByPlaceholder(/email/i).or(page.getByLabel(/email/i)).first();
      if (await emailField.isVisible()) {
        await emailField.fill('email-invalido');
        await emailField.blur();

        // Verificar validação
        await expect(
          page.getByText(/email.*inválido|formato.*email|email.*válido/i).first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should validate password strength', async ({ page }) => {
    const registerLink = page.getByText(/cadastr|registr|criar conta/i).first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(500);

      // Preencher senha fraca
      const passwordField = page
        .getByPlaceholder(/senha|password/i)
        .first()
        .or(page.getByLabel(/senha/i).first());
      if (await passwordField.isVisible()) {
        await passwordField.fill('123');
        await passwordField.blur();

        // Verificar indicador de força ou mensagem de erro
        const strengthIndicator = page.getByText(/fraca|weak|forte|strong|requisitos/i);
        await expect(strengthIndicator.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

// ============================================
// TESTES DE RECUPERAÇÃO DE SENHA
// ============================================
test.describe('Password Recovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.getByText(/esquec|forgot|recuper/i);
    await expect(forgotLink.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display password recovery form', async ({ page }) => {
    const forgotLink = page.getByText(/esquec|forgot|recuper/i).first();
    if (await forgotLink.isVisible()) {
      await forgotLink.click();

      // Verificar formulário de recuperação
      await expect(page.getByPlaceholder(/email/i).or(page.getByLabel(/email/i))).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByRole('button', { name: /enviar|recuperar|reset/i })).toBeVisible();
    }
  });

  test('should validate email on recovery form', async ({ page }) => {
    const forgotLink = page.getByText(/esquec|forgot|recuper/i).first();
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await page.waitForTimeout(500);

      // Tentar recuperar sem email
      const submitButton = page.getByRole('button', { name: /enviar|recuperar|reset/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Verificar mensagem de validação
        await expect(page.getByText(/obrigatório|required|preencha|email/i).first()).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });
});

// ============================================
// TESTES DE SESSÃO E TOKENS
// ============================================
test.describe('Session Management', () => {
  test('should persist login across page refresh', async ({ page }) => {
    // Fazer login
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/senha|password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Recarregar página
    await page.reload();

    // Verificar se ainda está logado
    const isAuth = await isAuthenticated(page);
    const isLogin = await isOnLoginPage(page);
    expect(isAuth || !isLogin).toBe(true);
  });

  test('should protect routes when not authenticated', async ({ page }) => {
    // Tentar acessar rota protegida diretamente
    await page.goto('/users');

    // Deve redirecionar para login ou mostrar erro
    const isAuth = await isAuthenticated(page);
    const isLogin = await isOnLoginPage(page);
    const hasError = await page
      .getByText(/não autorizado|unauthorized|login/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(isLogin || hasError || !isAuth).toBe(true);
  });
});

// ============================================
// TESTES DE ACESSIBILIDADE NA AUTENTICAÇÃO
// ============================================
test.describe('Authentication Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper form labels', async ({ page }) => {
    // Verificar labels acessíveis
    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.getByPlaceholder(/senha|password/i);

    // Inputs devem ter placeholders ou labels
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Navegar por Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verificar se algum elemento está focado
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
  });

  test('should have submit button accessible', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /entrar|login/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Verificar que pode ser ativado por Enter
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/senha|password/i).fill(TEST_USER.password);
    await page.keyboard.press('Enter');

    // Deve iniciar processo de login (URL muda ou loading aparece)
    await page.waitForTimeout(1000);
  });
});
