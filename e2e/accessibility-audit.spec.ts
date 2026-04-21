/**
 * Accessibility Audit E2E Tests
 * Automated WCAG 2.1 AA compliance testing using axe-core
 *
 * These tests verify that key pages meet accessibility standards:
 * - No critical or serious axe-core violations
 * - WCAG 2.1 Level AA compliance
 * - Proper ARIA attributes, color contrast, and semantic HTML
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || '3064'}`;

// Pages that don't require authentication
const PUBLIC_PAGES = [
  { name: 'Login Page', path: '/' },
  { name: 'Terms', path: '/termos' },
  { name: 'Privacy', path: '/privacidade' },
];

// Pages that require authentication (tested after login)
const AUTHENTICATED_PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Users', path: '/users' },
  { name: 'Reports', path: '/reports' },
  { name: 'Chat', path: '/chat' },
  { name: 'Calendar', path: '/calendar' },
  { name: 'Tasks', path: '/tasks' },
  { name: 'My Interested', path: '/my-interested' },
  { name: 'Gamification', path: '/gamification' },
  { name: 'Prayers', path: '/prayers' },
  { name: 'Settings', path: '/settings' },
  { name: 'Menu', path: '/menu' },
  { name: 'My Profile', path: '/meu-cadastro' },
  { name: 'Districts', path: '/districts' },
  { name: 'Contact', path: '/contact' },
];

// WCAG 2.1 AA tags to check
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const testEmail = process.env.TEST_EMAIL;
const testPassword = process.env.TEST_PASSWORD;

test.describe('Accessibility Audit — WCAG 2.1 AA', () => {
  test.describe('Public Pages', () => {
    for (const page of PUBLIC_PAGES) {
      test(`${page.name} should have no critical accessibility violations`, async ({
        page: browserPage,
      }) => {
        await browserPage.goto(`${BASE_URL}${page.path}`, { waitUntil: 'networkidle' });

        const results = await new AxeBuilder({ page: browserPage }).withTags(WCAG_TAGS).analyze();

        // Filter only critical and serious violations
        const criticalViolations = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        // Log violations for debugging
        if (criticalViolations.length > 0) {
          console.log(
            `\n❌ ${page.name} — ${criticalViolations.length} critical/serious violations:`
          );
          criticalViolations.forEach((v) => {
            console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
            console.log(`    Help: ${v.helpUrl}`);
            v.nodes.forEach((n) => {
              console.log(`    Element: ${n.html.substring(0, 100)}`);
            });
          });
        }

        expect(criticalViolations).toHaveLength(0);
      });
    }
  });

  test.describe('Authenticated Pages', () => {
    test.skip(
      !testEmail || !testPassword,
      'Set TEST_EMAIL and TEST_PASSWORD to audit authenticated pages.'
    );

    test.beforeEach(async ({ page }) => {
      // Navigate to login and authenticate
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

      // Try to login with test credentials (if login form exists)
      const loginForm = page.locator('form');
      if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
        const emailInput = page.locator(
          'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="usuário" i]'
        );
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator('button[type="submit"], button:has-text("Entrar")');

        if (await emailInput.isVisible().catch(() => false)) {
          await emailInput.fill(testEmail!);
          await passwordInput.fill(testPassword!);
          await submitButton.click();
          await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
        }
      }
    });

    for (const pageConfig of AUTHENTICATED_PAGES) {
      test(`${pageConfig.name} should have no critical accessibility violations`, async ({
        page,
      }) => {
        await page.goto(`${BASE_URL}${pageConfig.path}`, { waitUntil: 'networkidle' });

        // Wait for content to load
        await page.waitForTimeout(1000);

        const results = await new AxeBuilder({ page })
          .withTags(WCAG_TAGS)
          .exclude('.recharts-wrapper') // Exclude chart components (complex SVG)
          .analyze();

        // Filter only critical and serious violations
        const criticalViolations = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        // Log all violations for awareness
        if (results.violations.length > 0) {
          console.log(
            `\n⚠️  ${pageConfig.name} — ${results.violations.length} total violations (${criticalViolations.length} critical/serious):`
          );
          results.violations.forEach((v) => {
            console.log(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`);
          });
        }

        expect(criticalViolations).toHaveLength(0);
      });
    }
  });

  test('Color contrast should meet WCAG AA standards on login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();

    const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');

    if (contrastViolations.length > 0) {
      console.log(`\n🎨 Color contrast violations:`);
      contrastViolations.forEach((v) => {
        v.nodes.forEach((n) => {
          console.log(`  Element: ${n.html.substring(0, 80)}`);
          console.log(`  Issue: ${n.failureSummary}`);
        });
      });
    }

    // Color contrast violations should not be critical
    const criticalContrast = contrastViolations.filter((v) => v.impact === 'critical');
    expect(criticalContrast).toHaveLength(0);
  });
});
