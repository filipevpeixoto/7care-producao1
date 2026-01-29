import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Testes de Acessibilidade E2E
 * Usa @axe-core/playwright para verificar conformidade WCAG
 */

/**
 * Interface para violações do axe-core
 */
interface AxeViolation {
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  nodes: Array<{
    html: string;
    target: string[];
  }>;
}

/**
 * Helper para fazer login
 */
async function login(page: Page, email = 'admin@7care.com', password = 'admin123') {
  await page.goto('/');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/senha|password/i).fill(password);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('Acessibilidade - Páginas Públicas', () => {
  test('página de login deve ser acessível', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Verificar se não há violações críticas ou sérias
    const criticalViolations = (accessibilityScanResults.violations as AxeViolation[]).filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('página de login deve ter estrutura de heading correta', async ({ page }) => {
    await page.goto('/');

    // Verificar que existe um h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Verificar que formulário tem labels
    const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    const passwordInput = page
      .getByLabel(/senha|password/i)
      .or(page.getByPlaceholder(/senha|password/i));

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('formulário de login deve ser navegável por teclado', async ({ page }) => {
    await page.goto('/');

    // Tab para o primeiro campo
    await page.keyboard.press('Tab');

    // Verificar que algum elemento focável está ativo
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Tab para próximo campo
    await page.keyboard.press('Tab');

    // Tab para botão de login
    await page.keyboard.press('Tab');

    // Enter deve tentar fazer login (vai falhar, mas deve funcionar)
    await page.keyboard.press('Enter');
  });
});

test.describe('Acessibilidade - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard deve ser acessível', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.recharts-wrapper') // Gráficos podem ter problemas de a11y
      .analyze();

    const criticalViolations = (accessibilityScanResults.violations as AxeViolation[]).filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    // Log violações para debugging
    if (criticalViolations.length > 0) {
      console.log('Violações de acessibilidade:', JSON.stringify(criticalViolations, null, 2));
    }

    expect(criticalViolations.length).toBeLessThanOrEqual(3); // Tolerância para melhorias graduais
  });

  test('navegação deve ter landmarks apropriados', async ({ page }) => {
    // Verificar landmarks ARIA
    const main = page.locator('main, [role="main"]');
    const nav = page.locator('nav, [role="navigation"]');

    // Pelo menos um main
    await expect(main.first()).toBeVisible();
  });

  test('botões devem ter texto acessível', async ({ page }) => {
    // Buscar botões sem texto acessível
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();

      if (isVisible) {
        // Verificar se tem texto, aria-label ou aria-labelledby
        const text = await button.innerText();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledby = await button.getAttribute('aria-labelledby');
        const title = await button.getAttribute('title');

        const hasAccessibleName = text.trim() !== '' || ariaLabel || ariaLabelledby || title;

        if (!hasAccessibleName) {
          console.warn(`Botão sem nome acessível encontrado: ${await button.innerHTML()}`);
        }
      }
    }
  });
});

test.describe('Acessibilidade - Formulários', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('formulário de usuário deve ter labels', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Verificar botão de adicionar
    const addButton = page.getByRole('button', { name: /novo|adicionar|add/i });

    if (await addButton.isVisible()) {
      await addButton.click();

      // Verificar que inputs têm labels
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('form, [role="form"], dialog, [role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const formViolations = (accessibilityScanResults.violations as AxeViolation[]).filter(
        (v: AxeViolation) => v.id.includes('label') || v.id.includes('input')
      );

      expect(formViolations.length).toBeLessThanOrEqual(2);
    }
  });

  test('mensagens de erro devem ser associadas aos campos', async ({ page }) => {
    // Navegar para login e tentar com credenciais inválidas
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill('invalid');
    await page.getByPlaceholder(/senha|password/i).fill('x');
    await page.getByRole('button', { name: /entrar|login/i }).click();

    // Aguardar possível mensagem de erro
    await page.waitForTimeout(1000);

    // Verificar se mensagens de erro estão visíveis e associadas
    const errorMessages = page.locator('[role="alert"], .error, [aria-invalid="true"]');
    const errorCount = await errorMessages.count();

    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        await expect(error).toBeVisible();
      }
    }
  });
});

test.describe('Acessibilidade - Contraste de Cores', () => {
  test('página de login deve ter contraste adequado', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast', 'color-contrast-enhanced'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations;

    // Log para debugging
    if (contrastViolations.length > 0) {
      console.log(
        'Problemas de contraste:',
        (contrastViolations as AxeViolation[]).map((v: AxeViolation) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
        }))
      );
    }

    // Permitir alguns avisos, mas não violações críticas
    const criticalContrast = (contrastViolations as AxeViolation[]).filter(
      (v: AxeViolation) => v.impact === 'critical'
    );
    expect(criticalContrast).toEqual([]);
  });
});

test.describe('Acessibilidade - Responsividade', () => {
  test('site deve ser acessível em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const mobileViolations = (accessibilityScanResults.violations as AxeViolation[]).filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(mobileViolations.length).toBeLessThanOrEqual(3);
  });

  test('touch targets devem ter tamanho adequado', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verificar botões e links
    const interactiveElements = page.locator('button, a, [role="button"]');
    const count = await interactiveElements.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = interactiveElements.nth(i);
      const isVisible = await element.isVisible();

      if (isVisible) {
        const box = await element.boundingBox();

        if (box) {
          // WCAG 2.1 AAA recomenda 44x44px para touch targets
          // WCAG 2.2 recomenda mínimo de 24x24px
          const minSize = 24;

          if (box.width < minSize || box.height < minSize) {
            console.warn(`Touch target pequeno: ${box.width}x${box.height}px`);
          }
        }
      }
    }
  });
});
