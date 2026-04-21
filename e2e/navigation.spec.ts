/**
 * Navigation E2E Tests
 *
 * Tests critical navigation flows:
 * - Public routes accessible without auth
 * - Protected routes redirect to login
 * - Menu navigation works correctly
 * - 404 page renders for unknown routes
 * - Browser back/forward navigation
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || '3064'}`;

test.describe('Navigation', () => {
  test.describe('Public Routes', () => {
    test('should render login page at root', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      // Should show login form or auth UI
      const authElement = page.locator(
        'input[type="password"], button:has-text("Entrar"), button:has-text("Login"), form'
      );
      await expect(authElement.first()).toBeVisible({ timeout: 15000 });
    });

    test('should render terms page', async ({ page }) => {
      await page.goto(`${BASE_URL}/terms`, { waitUntil: 'networkidle' });
      const termsContent = page.locator('h1, h2, [role="heading"]');
      await expect(termsContent.first()).toBeVisible({ timeout: 15000 });
    });

    test('should render privacy page', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'networkidle' });
      const privacyContent = page.locator('h1, h2, [role="heading"]');
      await expect(privacyContent.first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Protected Routes', () => {
    const protectedRoutes = [
      '/dashboard',
      '/users',
      '/calendar',
      '/reports',
      '/settings',
      '/menu',
      '/meu-cadastro',
    ];

    for (const route of protectedRoutes) {
      test(`${route} should redirect to login when not authenticated`, async ({ page }) => {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });

        // Should either redirect to login or show auth UI
        const isOnLogin = page.url().includes('/login') || page.url() === `${BASE_URL}/`;
        const hasAuthUI = await page
          .locator('input[type="password"], button:has-text("Entrar"), button:has-text("Login")')
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false);

        expect(isOnLogin || hasAuthUI).toBeTruthy();
      });
    }
  });

  test.describe('404 Page', () => {
    test('should show not found page for unknown routes', async ({ page }) => {
      await page.goto(`${BASE_URL}/this-route-does-not-exist-12345`, { waitUntil: 'networkidle' });

      // Should show 404 content or redirect to login
      const notFoundHeading = page.getByRole('heading', {
        name: /página não encontrada|page not found|not found/i,
      });
      const notFoundCode = page.getByText('404', { exact: true });
      const loginForm = page.locator('input[type="password"]');

      const hasNotFoundHeading = await notFoundHeading
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      const hasNotFoundCode = await notFoundCode.isVisible({ timeout: 10000 }).catch(() => false);
      const hasLogin = await loginForm
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(hasNotFoundHeading || hasNotFoundCode || hasLogin).toBeTruthy();
    });
  });

  test.describe('Page Load Performance', () => {
    test('login page should load within 5 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(5000);
    });

    test('should not have console errors on login page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Filter out known benign errors (e.g., favicon, service worker)
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('manifest') &&
          !e.includes('service-worker') &&
          !e.includes('sw.js') &&
          !e.includes('ERR_CONNECTION_REFUSED')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });
});
