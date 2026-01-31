import { test, expect } from '@playwright/test';

/**
 * Teste E2E Completo - Pastor Onboarding
 * Simula todo o fluxo do frontend do pastor-onboarding
 */

test.describe('Pastor Onboarding - Fluxo Completo', () => {
  const BASE_URL = 'http://localhost:3065';
  const EXCEL_FILE = '/Users/filipevpeixoto/Downloads/data (5).xlsx';
  let inviteToken: string;

  // Setup: Criar convite via API antes dos testes
  test.beforeAll(async ({ browser }) => {
    // Login como admin e criar convite
    const context = await browser.newContext();
    const page = await context.newPage();

    // Fetch token de admin
    const loginResponse = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3065/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@7care.com',
          password: 'meu7care',
        }),
      });
      return res.json();
    });

    const adminToken = loginResponse.token;

    // Criar convite
    const inviteResponse = await page.evaluate(async token => {
      const res = await fetch('http://localhost:3065/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: 'pastor-e2e-teste@example.com',
          expiresInDays: 7,
        }),
      });
      return res.json();
    }, adminToken);

    inviteToken = inviteResponse.token;
    console.log(`✅ Convite criado: ${inviteToken.substring(0, 20)}...`);

    await context.close();
  });

  // ============================================================================
  // TESTE 1: Validar Token
  // ============================================================================
  test('1️⃣ Validar token do convite', async ({ page }) => {
    console.log('\n📝 [PASSO 1] Acessando página de onboarding...');

    await page.goto(`${BASE_URL}/pastor-onboarding/${inviteToken}`);

    // Esperar validação
    await expect(page.locator('text=Passo 1 de 6')).toBeVisible({ timeout: 10000 });

    console.log('✅ Token validado, página carregada');
  });

  // ============================================================================
  // TESTE 2: Preenchimento Passo 1 (Dados Pessoais)
  // ============================================================================
  test('2️⃣ Passo 1 - Dados Pessoais', async ({ page }) => {
    console.log('\n📝 [PASSO 2] Preenchendo dados pessoais...');

    await page.goto(`${BASE_URL}/pastor-onboarding/${inviteToken}`);
    await page.waitForLoadState('networkidle');

    // Preencher formulário
    await page.fill('input[placeholder*="Nome"]', 'Pastor Teste E2E');
    await page.fill('input[type="email"]', 'pastor-e2e@example.com');
    await page.fill('input[type="tel"]', '11999999999');

    // Clicar próximo
    await page.click('button:has-text("Próximo")');

    await expect(page.locator('text=Passo 2 de 6')).toBeVisible({ timeout: 5000 });
    console.log('✅ Passo 1 completo');
  });

  // ============================================================================
  // TESTE 3: Preenchimento Passo 2 (Distrito)
  // ============================================================================
  test('3️⃣ Passo 2 - Dados do Distrito', async ({ page }) => {
    console.log('\n📝 [PASSO 3] Preenchendo distrito...');

    await page.goto(`${BASE_URL}/pastor-onboarding/${inviteToken}`);
    await page.waitForLoadState('networkidle');

    // Ir para passo 2
    await page.click('button:has-text("Próximo")');
    await page.waitForLoadState('networkidle');

    // Preencher distrito
    await page.fill('input[placeholder*="Distrito"]', 'Distrito Teste E2E');
    await page.fill('textarea', 'Descrição do distrito de teste');

    // Próximo
    await page.click('button:has-text("Próximo")');

    await expect(page.locator('text=Passo 3 de 6')).toBeVisible({ timeout: 5000 });
    console.log('✅ Passo 2 completo');
  });

  // ============================================================================
  // TESTE 4: Preenchimento Passo 3 (Igrejas)
  // ============================================================================
  test('4️⃣ Passo 3 - Cadastro de Igrejas', async ({ page }) => {
    console.log('\n📝 [PASSO 4] Cadastrando igrejas...');

    await page.goto(`${BASE_URL}/pastor-onboarding/${inviteToken}`);
    await page.waitForLoadState('networkidle');

    // Navegar para passo 3
    for (let i = 0; i < 2; i++) {
      await page.click('button:has-text("Próximo")');
      await page.waitForLoadState('networkidle');
    }

    // Adicionar primeira igreja
    await page.click('button:has-text("Adicionar Igreja")');
    await page.fill('input[placeholder*="Nome"]', 'Igreja Principal Teste');
    await page.fill('input[placeholder*="Endereço"]', 'Rua Teste, 123');

    // Próximo
    await page.click('button:has-text("Próximo")');

    await expect(page.locator('text=Passo 4 de 6')).toBeVisible({ timeout: 5000 });
    console.log('✅ Passo 3 completo');
  });

  // ============================================================================
  // TESTE 5: Upload Excel (Passo 4)
  // ============================================================================
  test('5️⃣ Passo 4 - Upload de Excel', async ({ page }) => {
    console.log('\n📝 [PASSO 5] Fazendo upload do Excel...');

    await page.goto(`${BASE_URL}/pastor-onboarding/${inviteToken}`);
    await page.waitForLoadState('networkidle');

    // Navegar para passo 4
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Próximo")');
      await page.waitForLoadState('networkidle');
    }

    // Fazer upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_FILE);

    // Esperar processamento
    await expect(page.locator('text=316 membros')).toBeVisible({ timeout: 15000 });

    console.log('✅ Excel importado (316 membros)');

    // Próximo
    await page.click('button:has-text("Próximo")');

    await expect(page.locator('text=Passo 5 de 6')).toBeVisible({ timeout: 5000 });
    console.log('✅ Passo 4 completo');
  });

  // ============================================================================
  // TESTE 6: Validação de Igrejas (Passo 5)
  // ============================================================================
  test('6️⃣ Passo 5 - Validação de Igrejas', async ({ page }) => {
    console.log('\n📝 [PASSO 6] Validando igrejas...');

    await page.goto(`${BASE_URL}/pastor-onboarding/${inviteToken}`);
    await page.waitForLoadState('networkidle');

    // Navegar para passo 5
    for (let i = 0; i < 4; i++) {
      await page.click('button:has-text("Próximo")');
      await page.waitForLoadState('networkidle');
    }

    // Esperar validações carregarem
    await expect(page.locator('text=Validação de Igrejas')).toBeVisible({ timeout: 10000 });

    // Verificar se igrejas foram listadas
    const churchElements = await page.locator('text=Dom Pedrito, Quaraí, Santana').count();
    expect(churchElements).toBeGreaterThan(0);

    console.log('✅ Igrejas validadas');

    // Próximo
    await page.click('button:has-text("Próximo")');

    await expect(page.locator('text=Passo 6 de 6')).toBeVisible({ timeout: 5000 });
    console.log('✅ Passo 5 completo');
  });

  // ============================================================================
  // TESTE 7: Definir Senha (Passo 6)
  // ============================================================================
  test('7️⃣ Passo 6 - Definir Senha', async ({ page }) => {
    console.log('\n📝 [PASSO 7] Definindo senha...');

    await page.goto(`${BASE_URL}/pastor-onboarding/${inviteToken}`);
    await page.waitForLoadState('networkidle');

    // Navegar para passo 6
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Próximo")');
      await page.waitForLoadState('networkidle');
    }

    // Preencher senha
    await page.fill('input[type="password"]:first-of-type', 'Senha@123');
    await page.fill('input[type="password"]:nth-of-type(2)', 'Senha@123');

    console.log('✅ Senha definida');
  });

  // ============================================================================
  // TESTE 8: Submissão Final
  // ============================================================================
  test('8️⃣ Submissão Final - Completar Onboarding', async ({ page }) => {
    console.log('\n📝 [PASSO 8] Submetendo formulário final...');

    await page.goto(`${BASE_URL}/pastor-onboarding/${inviteToken}`);
    await page.waitForLoadState('networkidle');

    // Completar todos os passos
    for (let i = 0; i < 6; i++) {
      // Preencher dados mínimos em cada passo
      const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();
      for (const input of inputs) {
        const value = await input.inputValue();
        if (!value) {
          await input.fill('Teste automático E2E');
        }
      }

      // Selecionar opções se houver
      const selects = await page.locator('select').all();
      for (const select of selects) {
        const firstOption = await select.locator('option').first();
        if (firstOption) {
          await select.selectOption((await firstOption.getAttribute('value')) || '0');
        }
      }

      // Próximo (exceto no último)
      if (i < 5) {
        const nextBtn = page.locator('button:has-text("Próximo")').first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }
    }

    // Enviar formulário
    await page.click('button:has-text("Enviar")');

    // Esperar confirmação
    await expect(page.locator('text=Cadastro enviado para aprovação')).toBeVisible({
      timeout: 10000,
    });

    console.log('✅ Onboarding submetido com sucesso!');
  });

  // ============================================================================
  // TESTE 9: Verificação de Status
  // ============================================================================
  test('9️⃣ Verificação Final - Status no Banco de Dados', async ({ page }) => {
    console.log('\n📝 [VERIFICAÇÃO] Verificando status no banco...');

    // Fazer requisição para verificar status
    const statusResponse = await page.evaluate(async _token => {
      const loginRes = await fetch('http://localhost:3065/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@7care.com',
          password: 'meu7care',
        }),
      });
      const loginData = await loginRes.json();

      const invitesRes = await fetch('http://localhost:3065/api/invites?status=submitted', {
        headers: {
          Authorization: `Bearer ${loginData.token}`,
        },
      });
      return invitesRes.json();
    }, inviteToken);

    expect(statusResponse.invites).toBeDefined();
    const submitted = statusResponse.invites.some((inv: any) => inv.status === 'submitted');
    expect(submitted).toBeTruthy();

    console.log('✅ Status verificado no banco de dados');
  });
});

/*
 * ============================================================================
 * RESUMO DOS TESTES E2E
 * ============================================================================
 *
 * Este arquivo testa todo o fluxo visual do pastor-onboarding:
 *
 * 1. ✅ Validação de token
 * 2. ✅ Passo 1: Dados pessoais
 * 3. ✅ Passo 2: Distrito
 * 4. ✅ Passo 3: Igrejas
 * 5. ✅ Passo 4: Upload Excel (316 membros)
 * 6. ✅ Passo 5: Validação de igrejas
 * 7. ✅ Passo 6: Senha
 * 8. ✅ Submissão final
 * 9. ✅ Verificação de status
 *
 * EXECUÇÃO:
 * npx playwright test test-pastor-onboarding-e2e.spec.ts
 *
 * ============================================================================
 */
