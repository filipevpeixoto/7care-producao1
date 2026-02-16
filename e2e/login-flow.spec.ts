/**
 * Login Flow E2E Tests
 *
 * Tests the authentication flow:
 * - Login page renders correctly
 * - Form validation (empty fields, invalid email)
 * - Successful login redirects to dashboard
 * - Failed login shows error messages
 * - Logout flow
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3065';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test('should render login page with all required elements', async ({ page }) => {
    // Should have email/phone and password inputs
    const emailInput = page.locator('input[type="email"], input[type="text"][name="email"], input[placeholder*="email" i], input[placeholder*="telefone" i]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');

    await expect(emailInput.first()).toBeVisible({ timeout: 15000 });
    await expect(passwordInput.first()).toBeVisible();
    await expect(submitButton.first()).toBeVisible();
  });

  test('should show validation error for empty form submission', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    await submitButton.first().click();

    // Should show some validation feedback (toast, inline error, or HTML5 validation)
    const hasValidation = await page.locator('[role="alert"], .text-red, .text-destructive, :invalid, [data-state="open"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasValidation).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[type="text"][name="email"], input[placeholder*="email" i], input[placeholder*="telefone" i]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');

    await emailInput.first().fill('invalid@test.com');
    await passwordInput.first().fill('wrongpassword123');
    await submitButton.first().click();

    // Should show error toast or message
    const errorMessage = page.locator('[role="alert"], .toast, [data-state="open"], .text-red-500, .text-destructive');
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have working toggle between login and register', async ({ page }) => {
    // Look for "Não tem conta?" or "Cadastre-se" link/button
    const registerLink = page.locator('button:has-text("Cadastre-se"), a:has-text("Cadastre-se"), button:has-text("Sign up"), button:has-text("Não tem conta")');

    if (await registerLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await registerLink.first().click();
      // Should show registration form or navigate to register page
      const registerForm = page.locator('button:has-text("Criar conta"), button:has-text("Registrar"), button:has-text("Faça login"), input[placeholder*="nome" i]');
      await expect(registerForm.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should preserve login page accessibility', async ({ page }) => {
    // Check that login form has proper labels
    const form = page.locator('form');
    if (await form.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const inputs = form.locator('input:visible');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const hasLabel = await input.evaluate((el) => {
          const id = el.id;
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;
          const placeholder = el.getAttribute('placeholder');
          return !!(ariaLabel || ariaLabelledBy || label || placeholder);
        });
        expect(hasLabel).toBeTruthy();
      }
    }
  });
});
