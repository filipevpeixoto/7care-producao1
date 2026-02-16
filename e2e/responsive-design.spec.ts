/**
 * Responsive Design E2E Tests
 *
 * Tests that the application renders correctly across different viewport sizes:
 * - Mobile (375x667 - iPhone SE)
 * - Tablet (768x1024 - iPad)
 * - Desktop (1920x1080)
 * - Critical UI elements are visible at each breakpoint
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3065';

const viewports = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

test.describe('Responsive Design', () => {
  for (const viewport of viewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test('login page renders correctly', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Core elements should be visible
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput.first()).toBeVisible({ timeout: 15000 });

        // No horizontal scrollbar
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBeFalsy();
      });

      test('terms page renders without horizontal overflow', async ({ page }) => {
        await page.goto(`${BASE_URL}/terms`, { waitUntil: 'networkidle' });

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBeFalsy();
      });

      test('privacy page renders without horizontal overflow', async ({ page }) => {
        await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'networkidle' });

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBeFalsy();
      });
    });
  }

  test.describe('Touch targets', () => {
    test('buttons on mobile should have adequate touch target size', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          // WCAG 2.5.8: minimum 24x24px touch target
          expect(box.width).toBeGreaterThanOrEqual(24);
          expect(box.height).toBeGreaterThanOrEqual(24);
        }
      }
    });
  });
});
