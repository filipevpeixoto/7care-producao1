/**
 * Dracma Submitter Service - Versão com Múltiplos Seletores
 * Serviço para submissão automática de recibos no sistema Dracma via Puppeteer (RPA)
 *
 * Baseado na análise do formulário do Dracma (02/02/2026):
 * - URL: https://dracma.sdasystems.org/accounts-payable/create
 * - Usa Semantic UI para dropdowns
 * - Usa flatpickr para datas
 * - Tem "Preenchimento Automático" via OCR nativo
 */

import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import { logger } from '../utils/logger';
import { sql } from '../neonConfig';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// INTERFACES
// ============================================================================

interface ReceiptData {
  id: number;
  userId: number;
  districtId?: number;
  merchantName: string | null;
  receiptDate: string | null;
  totalAmount: string | null;
  category: string | null;
  imageUrl: string;
  taxId: string | null;
  documentNumber?: string | null;
  accessKey?: string | null;
  purpose?: string | null;
}

interface DracmaCredentials {
  username: string;
  password: string;
}

// ============================================================================
// CONFIGURAÇÃO DE SELETORES MÚLTIPLOS
// Cada campo tem uma lista de seletores possíveis ordenados por prioridade
// ============================================================================

const SELECTORS = {
  // === PÁGINA DE LOGIN ===
  login: {
    usernameField: [
      'input[name="email"]',
      'input[name="username"]',
      'input#email',
      'input#username',
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="usuário" i]',
      'input[placeholder*="usuario" i]',
      '.login input[type="text"]:first-of-type',
    ],
    passwordField: [
      'input[name="password"]',
      'input#password',
      'input[type="password"]',
      'input[placeholder*="senha" i]',
      'input[placeholder*="password" i]',
      '.login input[type="password"]',
    ],
    submitButton: [
      'button[type="submit"]',
      'input[type="submit"]',
      'button.btn-login',
      'button.login-btn',
      '.login button',
      'form button',
    ],
  },

  // === PÁGINA DE CADASTRO DE DOCUMENTO ===
  form: {
    // Botão "+ Novo Documento"
    newDocumentButton: [
      'button.new-document',
      '[data-action="new-document"]',
      'a[href*="create"]',
      'a[href*="cadastrar"]',
    ],

    // Dropdown "Entidade" (ex: "1211 - ASRS")
    entityDropdown: [
      '.field:has(label:contains("Entidade")) .ui.dropdown',
      'div[data-field="entity"] .dropdown',
      'select[name="entity"]',
      '#entity',
      '.entity-dropdown',
    ],

    // Tabs/Dropdown "Tipo de Documento" (NFCe, NFe)
    documentTypeSelector: [
      '.field:has(label:contains("Tipo de Documento")) .ui.dropdown',
      '.document-type-tabs',
      'div[data-field="documentType"]',
      '.ui.buttons:has(:contains("NFCe"))',
      '[role="tablist"]:has(:contains("NFCe"))',
    ],

    // Campo "Chave de Acesso" (44 dígitos SEFAZ)
    accessKeyField: [
      'input[name="accessKey"]',
      'input[name="chave_acesso"]',
      'input[placeholder*="Chave de Acesso" i]',
      'input[placeholder*="validação na SEFAZ" i]',
      '.field:has(label:contains("Chave de Acesso")) input',
      '#accessKey',
    ],

    // Dropdown "Emitente" (estabelecimento)
    issuerDropdown: [
      '.field:has(label:contains("Emitente")) .ui.dropdown',
      'div[data-field="issuer"] .dropdown',
      'select[name="issuer"]',
      '#issuer',
      '.issuer-dropdown',
    ],

    // Botão "+ Adicionar pessoa" para novo emitente
    addIssuerButton: ['.add-issuer', '[data-action="add-issuer"]'],

    // Campo "Data de Emissão" (flatpickr)
    emissionDateField: [
      'input[name="emissionDate"]',
      'input[name="data_emissao"]',
      '.field:has(label:contains("Data de Emissão")) input',
      '.field:has(label:contains("Data de Emissão")) .flatpickr-input',
      'input.flatpickr-input[placeholder*="data" i]',
      '#emissionDate',
    ],

    // Campo "Número" da nota fiscal
    documentNumberField: [
      'input[name="number"]',
      'input[name="numero"]',
      '.field:has(label:contains("Número")) input',
      '#documentNumber',
      'input[placeholder*="número" i]',
    ],

    // Campo "Valor" (R$ 270,44)
    valueField: [
      'input[name="value"]',
      'input[name="valor"]',
      '.field:has(label:contains("Valor")) input',
      '#value',
      'input[placeholder*="R$" i]',
      'input[type="text"][inputmode="decimal"]',
    ],

    // Textarea "Finalidade"
    purposeField: [
      'textarea[name="purpose"]',
      'textarea[name="finalidade"]',
      '.field:has(label:contains("Finalidade")) textarea',
      '#purpose',
      'textarea[placeholder*="finalidade" i]',
    ],

    // === SEÇÃO ANEXOS ===
    // Input de upload de arquivo
    fileInput: [
      'input[type="file"]',
      'input[accept*="image"]',
      'input[accept*="pdf"]',
      '.anexos input[type="file"]',
      '.upload-area input[type="file"]',
    ],

    // Botão "Processar" (OCR automático do Dracma)
    processOcrButton: [
      '.btn-process',
      '[data-action="process-ocr"]',
      '.preenchimento-automatico button',
    ],

    // === SEÇÃO CATEGORIAS E CENTROS DE CUSTO ===
    // Dropdown "Categorias de Gasto"
    expenseCategoryDropdown: [
      '.field:has(label:contains("Categorias de Gasto")) .ui.dropdown',
      'div[data-field="expenseCategory"] .dropdown',
      '.expense-category-dropdown',
      '.rateio .categoria-dropdown',
    ],

    // Dropdown "Centros de Custo"
    costCenterDropdown: [
      '.field:has(label:contains("Centros de Custo")) .ui.dropdown',
      'div[data-field="costCenter"] .dropdown',
      '.cost-center-dropdown',
      '.rateio .centro-custo-dropdown',
    ],

    // === SEÇÃO PAGAMENTO ===
    // Dropdown "Forma de Pagamento"
    paymentMethodDropdown: [
      '.field:has(label:contains("Forma de Pagamento")) .ui.dropdown',
      'select[name="paymentMethod"]',
      '#paymentMethod',
      '.pagamento .payment-dropdown',
    ],

    // Dropdown "Beneficiário"
    beneficiaryDropdown: [
      '.field:has(label:contains("Beneficiário")) .ui.dropdown',
      'select[name="beneficiary"]',
      '#beneficiary',
      '.pagamento .beneficiary-dropdown',
    ],

    // Campo "Parcelas"
    installmentsField: [
      'input[name="installments"]',
      'input[name="parcelas"]',
      '.field:has(label:contains("Parcelas")) input',
      '#installments',
    ],

    // Campo "Vencimento"
    dueDateField: [
      'input[name="dueDate"]',
      'input[name="vencimento"]',
      '.field:has(label:contains("Vencimento")) input',
      '.field:has(label:contains("Vencimento")) .flatpickr-input',
      '#dueDate',
    ],

    // === BOTÕES DE AÇÃO ===
    // Botão "Salvar"
    saveButton: ['button.btn-save', '.actions button.primary', 'button[type="submit"]'],

    // Botão "Confirmar"
    confirmButton: ['button.btn-confirm', '[data-action="confirm"]'],

    // Botão "Enviar"
    sendButton: ['button.btn-send', '[data-action="send"]'],
  },

  // === MENSAGENS DE SUCESSO/ERRO ===
  messages: {
    success: [
      '.alert-success',
      '.success-message',
      '.toast-success',
      '.notification-success',
      '.message.positive',
    ],
    error: [
      '.alert-danger',
      '.alert-error',
      '.error-message',
      '.toast-error',
      '.notification-error',
      '.message.negative',
    ],
  },
};

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

export class DracmaSubmitter {
  private browser: Browser | null = null;
  private debug: boolean = false;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  /**
   * Inicializa o browser Puppeteer
   */
  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.debug ? false : true, // false para debug visual
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--window-size=1920,1080',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });
    logger.info('🌐 Puppeteer browser inicializado');
  }

  /**
   * Fecha o browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('🌐 Puppeteer browser fechado');
    }
  }

  /**
   * Tenta encontrar elemento usando múltiplos seletores
   * Retorna o primeiro que funcionar
   */
  private async findElement(
    page: Page,
    selectorList: string[],
    description: string,
    _timeout: number = 5000
  ): Promise<ElementHandle | null> {
    for (const selector of selectorList) {
      try {
        // Tentar seletores com :contains() (pseudo-seletor jQuery-like)
        if (selector.includes(':contains(')) {
          const element = await this.findByTextContent(page, selector);
          if (element) {
            logger.info(`✅ Encontrado "${description}" com seletor: ${selector}`);
            return element;
          }
        } else if (selector.includes(':has(')) {
          // Seletores complexos com :has() - usar evaluate
          const element = await this.findWithHasSelector(page, selector);
          if (element) {
            logger.info(`✅ Encontrado "${description}" com seletor: ${selector}`);
            return element;
          }
        } else {
          const element = await page.waitForSelector(selector, { timeout: 1000 });
          if (element) {
            logger.info(`✅ Encontrado "${description}" com seletor: ${selector}`);
            return element;
          }
        }
      } catch {
        // Tentar próximo seletor
        continue;
      }
    }

    logger.warn(`⚠️ Não encontrado "${description}" com nenhum seletor`);
    return null;
  }

  /**
   * Encontra elemento por texto (para seletores :contains())
   */
  private async findByTextContent(
    page: Page,
    pseudoSelector: string
  ): Promise<ElementHandle | null> {
    // Parse do pseudo-seletor: 'button:contains("Texto")'
    const match = pseudoSelector.match(/^(.+):contains\("(.+)"\)$/);
    if (!match) return null;

    const [, tagOrSelector, searchText] = match;

    const elements = await page.$$(tagOrSelector);
    for (const el of elements) {
      const text = await el.evaluate((node: Element) => node.textContent || '');
      if (text.includes(searchText)) {
        return el;
      }
    }

    return null;
  }

  /**
   * Encontra elemento usando seletor :has()
   */
  private async findWithHasSelector(page: Page, selector: string): Promise<ElementHandle | null> {
    // Parse: '.field:has(label:contains("Texto")) input'
    // Simplificação: buscar por label text e depois encontrar input no mesmo container

    const labelMatch = selector.match(/label:contains\("(.+?)"\)/);
    if (!labelMatch) return null;

    const labelText = labelMatch[1];
    const targetSelector = selector.split(')').pop()?.trim() || 'input';

    // Encontrar todos os labels
    const labels = await page.$$('label');

    for (const label of labels) {
      const text = await label.evaluate((node: Element) => node.textContent || '');
      if (text.includes(labelText)) {
        // Encontrar o container pai (.field)
        const field = await label.evaluateHandle((node: Element) => {
          return node.closest('.field') || node.parentElement;
        });

        if (field) {
          // Buscar o elemento target dentro do field
          const target = await (field as ElementHandle).$(targetSelector);
          if (target) return target;
        }
      }
    }

    return null;
  }

  /**
   * Clica em elemento tentando múltiplos seletores
   */
  private async clickElement(
    page: Page,
    selectorList: string[],
    description: string
  ): Promise<boolean> {
    const element = await this.findElement(page, selectorList, description);
    if (element) {
      await element.click();
      await this.wait(page, 300);
      return true;
    }
    return false;
  }

  /**
   * Preenche input tentando múltiplos seletores
   */
  private async fillInput(
    page: Page,
    selectorList: string[],
    value: string,
    description: string
  ): Promise<boolean> {
    const element = await this.findElement(page, selectorList, description);
    if (element) {
      // Limpar campo
      await element.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');

      // Digitar valor
      await element.type(value, { delay: 30 });
      logger.info(`✍️ Preenchido "${description}": ${value}`);
      return true;
    }
    return false;
  }

  /**
   * Seleciona opção em dropdown Semantic UI
   */
  private async selectSemanticDropdown(
    page: Page,
    selectorList: string[],
    valueToSelect: string,
    description: string
  ): Promise<boolean> {
    const dropdown = await this.findElement(page, selectorList, description);
    if (!dropdown) return false;

    try {
      // Clicar para abrir dropdown
      await dropdown.click();
      await this.wait(page, 500);

      // Procurar no menu
      const menuItems = await page.$$('.menu.visible .item, .menu.transition.visible .item');

      for (const item of menuItems) {
        const text = await item.evaluate((el: Element) => el.textContent?.trim() || '');
        if (text.toLowerCase().includes(valueToSelect.toLowerCase())) {
          await item.click();
          await this.wait(page, 300);
          logger.info(`🔽 Selecionado "${description}": ${text}`);
          return true;
        }
      }

      // Se não encontrou exatamente, tentar digitar para filtrar
      await dropdown.type(valueToSelect, { delay: 50 });
      await this.wait(page, 500);

      // Tentar selecionar primeiro resultado
      const firstItem = await page.$(
        '.menu.visible .item:first-child, .menu.transition.visible .item:first-child'
      );
      if (firstItem) {
        await firstItem.click();
        await this.wait(page, 300);
        logger.info(`🔽 Selecionado "${description}" (primeiro resultado)`);
        return true;
      }

      // Fechar dropdown se não conseguiu selecionar
      await page.keyboard.press('Escape');
      return false;
    } catch (error) {
      logger.warn(`⚠️ Erro ao selecionar dropdown "${description}": ${error}`);
      await page.keyboard.press('Escape');
      return false;
    }
  }

  /**
   * Busca credenciais do Dracma no banco de dados
   */
  async getCredentials(userId: number): Promise<DracmaCredentials> {
    const userResult = await sql<{ id: number; role: string; name: string }[]>`
      SELECT id, role, name FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult.length) {
      throw new Error(`Usuário ${userId} não encontrado`);
    }

    const user = userResult[0] as { id: number; role: string; name: string };

    if (!['pastor', 'admin', 'superadmin'].includes(user.role)) {
      throw new Error(`Usuário ${user.name} não é pastor.`);
    }

    const configs = await sql<{ key: string; value: string }[]>`
      SELECT key, value FROM automation_config
      WHERE key IN ('dracma_username', 'dracma_password')
      AND user_id = ${userId}
      AND value != 'CHANGE_ME'
    `;

    const creds: Record<string, string> = {};
    (configs as { key: string; value: string }[]).forEach(c => {
      creds[c.key.replace('dracma_', '')] = c.value;
    });

    if (!creds.username || !creds.password) {
      throw new Error(`Pastor ${user.name} não tem credenciais do Dracma configuradas.`);
    }

    return creds as unknown as DracmaCredentials;
  }

  /**
   * Helper para aguardar (substitui waitForTimeout deprecated)
   */
  private async wait(page: Page, ms: number): Promise<void> {
    await page.evaluate((delay: number) => new Promise(resolve => setTimeout(resolve, delay)), ms);
  }

  /**
   * Submete um recibo no Dracma
   */
  async submitReceipt(receipt: ReceiptData): Promise<void> {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser!.newPage();

    // Configurar interceptação para debugging
    if (this.debug) {
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    }

    try {
      logger.info(`🚀 Submetendo recibo ${receipt.id} (usuário ${receipt.userId}) no Dracma...`);

      const credentials = await this.getCredentials(receipt.userId);

      // ========================================
      // STEP 1: LOGIN
      // ========================================
      await page.goto('https://dracma.sdasystems.org/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      logger.info('📄 Página do Dracma carregada');

      // Verificar se já está logado
      const isLoggedIn = await page.$('nav, .sidebar, .menu-principal').catch(() => null);

      if (!isLoggedIn) {
        // Preencher login
        const usernameOk = await this.fillInput(
          page,
          SELECTORS.login.usernameField,
          credentials.username,
          'Campo de usuário'
        );

        if (!usernameOk) {
          await this.saveErrorScreenshot(page, receipt.id, 'login_username_not_found');
          throw new Error('Campo de usuário não encontrado na página de login');
        }

        await this.fillInput(
          page,
          SELECTORS.login.passwordField,
          credentials.password,
          'Campo de senha'
        );

        // Submeter login
        await this.clickElement(page, SELECTORS.login.submitButton, 'Botão de login');

        // Aguardar navegação
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
        } catch {
          // Ignorar timeout de navegação
        }

        logger.info(`✅ Login realizado como ${credentials.username}`);
      }

      // ========================================
      // STEP 2: NAVEGAR PARA CADASTRO DE DOCUMENTO
      // ========================================
      // Tentar URLs possíveis
      const possibleUrls = [
        'https://dracma.sdasystems.org/accounts-payable/create',
        'https://dracma.sdasystems.org/contas-a-pagar/cadastrar',
        'https://dracma.sdasystems.org/documents/new',
        'https://dracma.sdasystems.org/expenses/create',
      ];

      let pageLoaded = false;
      for (const url of possibleUrls) {
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

          // Verificar se a página carregou (tem formulário)
          const hasForm = await page.$('form, .ui.form, .documento-form').catch(() => null);
          if (hasForm) {
            logger.info(`📝 Página de cadastro carregada: ${url}`);
            pageLoaded = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!pageLoaded) {
        // Tentar navegar pelo menu
        await page.goto('https://dracma.sdasystems.org/', { waitUntil: 'networkidle2' });

        // Clicar em "Contas a Pagar" no menu
        const menuLinks = await page.$$('a');
        for (const link of menuLinks) {
          const text = await link.evaluate((el: Element) => el.textContent || '');
          if (text.includes('Contas a Pagar')) {
            await link.click();
            await this.wait(page, 1000);
            break;
          }
        }

        // Clicar em "+ Novo Documento"
        await this.clickElement(page, SELECTORS.form.newDocumentButton, 'Botão Novo Documento');
        await this.wait(page, 1000);
      }

      // ========================================
      // STEP 3: UPLOAD DA NOTA FISCAL
      // ========================================
      try {
        const imagePath = await this.downloadImage(receipt.imageUrl, receipt.id);

        const fileInput = await this.findElement(
          page,
          SELECTORS.form.fileInput,
          'Input de arquivo'
        );
        if (fileInput) {
          await (fileInput as ElementHandle<HTMLInputElement>).uploadFile(imagePath);
          logger.info(`📎 Imagem carregada: ${imagePath}`);

          // Aguardar upload
          await this.wait(page, 2000);

          // Tentar usar OCR automático do Dracma (se disponível)
          const processButton = await this.findElement(
            page,
            SELECTORS.form.processOcrButton,
            'Botão Processar OCR'
          );
          if (processButton) {
            await processButton.click();
            logger.info('🔄 OCR automático do Dracma ativado');

            // Aguardar processamento
            await this.wait(page, 5000);
          }
        }
      } catch (error) {
        logger.warn(`⚠️ Erro no upload de imagem: ${error}`);
      }

      // ========================================
      // STEP 4: PREENCHER FORMULÁRIO
      // ========================================

      // Tipo de Documento (NFCe como padrão)
      await this.selectSemanticDropdown(
        page,
        SELECTORS.form.documentTypeSelector,
        'NFCe',
        'Tipo de Documento'
      );

      // Emitente (nome do estabelecimento)
      if (receipt.merchantName) {
        await this.selectSemanticDropdown(
          page,
          SELECTORS.form.issuerDropdown,
          receipt.merchantName,
          'Emitente'
        );
      }

      // Data de Emissão
      if (receipt.receiptDate) {
        const dateValue = this.formatDateToBrazilian(receipt.receiptDate);
        await this.fillInput(page, SELECTORS.form.emissionDateField, dateValue, 'Data de Emissão');
      }

      // Número da nota
      if (receipt.documentNumber) {
        await this.fillInput(
          page,
          SELECTORS.form.documentNumberField,
          receipt.documentNumber,
          'Número'
        );
      }

      // Valor
      if (receipt.totalAmount) {
        const valorFormatado = this.formatCurrencyToBrazilian(receipt.totalAmount);
        await this.fillInput(page, SELECTORS.form.valueField, valorFormatado, 'Valor');
      }

      // Chave de Acesso (se disponível)
      if (receipt.accessKey) {
        await this.fillInput(
          page,
          SELECTORS.form.accessKeyField,
          receipt.accessKey,
          'Chave de Acesso'
        );
      }

      // Finalidade
      const finalidade =
        receipt.purpose ||
        `Despesa: ${receipt.category || 'Geral'} - ${receipt.merchantName || 'Não especificado'}`;

      const purposeElement = await this.findElement(
        page,
        SELECTORS.form.purposeField,
        'Finalidade'
      );
      if (purposeElement) {
        await purposeElement.click();
        await purposeElement.type(finalidade, { delay: 20 });
        logger.info(`📝 Finalidade: ${finalidade}`);
      }

      // ========================================
      // STEP 5: SALVAR/CONFIRMAR
      // ========================================

      // Primeiro salvar
      const saveClicked = await this.clickElement(page, SELECTORS.form.saveButton, 'Botão Salvar');
      if (saveClicked) {
        await this.wait(page, 2000);
      }

      // Depois confirmar (se disponível)
      await this.clickElement(page, SELECTORS.form.confirmButton, 'Botão Confirmar');
      await this.wait(page, 1000);

      // ========================================
      // STEP 6: VERIFICAR SUCESSO
      // ========================================
      let confirmationId: string | null = null;

      // Procurar mensagem de sucesso
      const successElement = await this.findElement(
        page,
        SELECTORS.messages.success,
        'Mensagem de sucesso'
      );

      if (successElement) {
        const successText = await successElement.evaluate((el: Element) => el.textContent || '');
        confirmationId = `SUCCESS_${receipt.id}_${Date.now()}`;
        logger.info(`✅ Sucesso detectado: ${successText.substring(0, 100)}`);
      } else {
        // Verificar se não há erro
        const errorElement = await this.findElement(
          page,
          SELECTORS.messages.error,
          'Mensagem de erro'
        );
        if (errorElement) {
          const errorText = await errorElement.evaluate((el: Element) => el.textContent || '');
          throw new Error(`Erro do Dracma: ${errorText}`);
        }

        // Assumir sucesso se não há erro explícito
        confirmationId = `PENDING_${receipt.id}_${Date.now()}`;
        logger.warn('⚠️ Nenhuma mensagem de sucesso/erro encontrada. Assumindo sucesso.');
      }

      // Screenshot de sucesso para referência
      await this.saveScreenshot(page, receipt.id, 'success');

      // Atualizar banco
      await sql`
        UPDATE expense_receipts
        SET
          status = 'submitted',
          dracma_submitted_at = NOW(),
          dracma_confirmation_id = ${confirmationId},
          updated_at = NOW()
        WHERE id = ${receipt.id}
      `;

      logger.info(`✅ Recibo ${receipt.id} submetido! Confirmação: ${confirmationId}`);

      // Limpar arquivos temporários
      this.cleanupTempFiles(receipt.id);
    } catch (error) {
      logger.error(`❌ Erro ao submeter recibo ${receipt.id}:`, error);

      await this.saveErrorScreenshot(page, receipt.id, 'error');

      await sql`
        UPDATE expense_receipts
        SET
          status = 'error',
          dracma_error = ${(error as Error).message},
          dracma_retry_count = dracma_retry_count + 1,
          updated_at = NOW()
        WHERE id = ${receipt.id}
      `;

      throw error;
    } finally {
      await page.close();
    }
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  private formatDateToBrazilian(dateString: string | null): string {
    if (!dateString) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    try {
      const date = new Date(dateString);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
      return dateString;
    }
  }

  private formatCurrencyToBrazilian(amount: string | null): string {
    if (!amount) return 'R$ 0,00';
    let clean = amount.replace(/R\$\s*/g, '').trim();
    clean = clean.replace('.', ',');
    if (!clean.includes(',')) clean += ',00';
    return `R$ ${clean}`;
  }

  private async downloadImage(url: string, receiptId: number): Promise<string> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (7Care Receipt Bot/1.0)' },
    });

    const buffer = Buffer.from(response.data);
    const tempPath = path.join('/tmp', `receipt_${receiptId}_${Date.now()}.jpg`);
    fs.writeFileSync(tempPath, buffer);
    logger.info(`📥 Imagem baixada: ${tempPath} (${buffer.length} bytes)`);
    return tempPath;
  }

  private async saveScreenshot(page: Page, receiptId: number, suffix: string): Promise<void> {
    const screenshotPath = `/tmp/dracma_${suffix}_${receiptId}_${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    logger.info(`📸 Screenshot: ${screenshotPath}`);
  }

  private async saveErrorScreenshot(page: Page, receiptId: number, suffix: string): Promise<void> {
    await this.saveScreenshot(page, receiptId, suffix);
  }

  private cleanupTempFiles(receiptId: number): void {
    try {
      const files = fs.readdirSync('/tmp').filter(f => f.startsWith(`receipt_${receiptId}_`));
      files.forEach(f => fs.unlinkSync(path.join('/tmp', f)));
    } catch {
      // Ignorar erros de limpeza
    }
  }
}
