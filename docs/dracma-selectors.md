# Dracma - Seletores CSS para RPA (Puppeteer)

**⚠️ IMPORTANTE**: Os seletores neste documento são **PLACEHOLDERS** e precisam ser atualizados com os seletores reais do sistema Dracma.

**Última atualização**: _Nunca (aguardando configuração)_

---

## Como Atualizar os Seletores

### Passo 1: Acessar o Dracma

1. Abra o navegador (Chrome ou Firefox)
2. Acesse: https://dracma.sdasystems.org/
3. Faça login com suas credenciais

### Passo 2: Inspecionar Elementos

1. Pressione **F12** para abrir o DevTools
2. Clique no ícone de **inspetor** (seta no canto superior esquerdo)
3. Passe o mouse sobre os campos do formulário
4. Anote os seletores CSS (`id`, `name`, `class`)

### Passo 3: Testar Seletores no Console

No console do DevTools, teste os seletores:

```javascript
// Exemplo: testar se o seletor funciona
document.querySelector('input#username');
// Deve retornar o elemento ou null se não encontrar
```

### Passo 4: Atualizar o Código

Edite o arquivo `/server/services/dracmaSubmitter.ts` com os seletores corretos.

---

## 📝 Seletores a Serem Configurados

### 1. Página de Login

**URL**: `https://dracma.sdasystems.org/login` (ou similar)

| Campo          | Seletor Atual (PLACEHOLDER) | Seletor Real | Status                 |
| -------------- | --------------------------- | ------------ | ---------------------- |
| Username/Email | `input[name="username"]`    | `???`        | ⚠️ **NÃO CONFIGURADO** |
| Password       | `input[name="password"]`    | `???`        | ⚠️ **NÃO CONFIGURADO** |
| Botão Login    | `button[type="submit"]`     | `???`        | ⚠️ **NÃO CONFIGURADO** |

**Exemplo de código (linha ~157 em `dracmaSubmitter.ts`):**

```typescript
await page.type('input[name="username"]', credentials.username);
await page.type('input[name="password"]', credentials.password);
await page.click('button[type="submit"]');
```

---

### 2. Página de Nova Despesa

**URL**: `https://dracma.sdasystems.org/expenses/new` (ou similar)

| Campo                   | Seletor Atual (PLACEHOLDER) | Seletor Real | Status                 |
| ----------------------- | --------------------------- | ------------ | ---------------------- |
| Nome do Estabelecimento | `input#merchant_name`       | `???`        | ⚠️ **NÃO CONFIGURADO** |
| Data da Despesa         | `input#expense_date`        | `???`        | ⚠️ **NÃO CONFIGURADO** |
| Valor Total             | `input#amount`              | `???`        | ⚠️ **NÃO CONFIGURADO** |
| Categoria (dropdown)    | `select#category`           | `???`        | ⚠️ **NÃO CONFIGURADO** |
| Upload de Arquivo       | `input[type="file"]`        | `???`        | ⚠️ **NÃO CONFIGURADO** |
| Botão Enviar            | `button[type="submit"]`     | `???`        | ⚠️ **NÃO CONFIGURADO** |

**Exemplo de código (linha ~190-230 em `dracmaSubmitter.ts`):**

```typescript
await page.type('input#merchant_name', receipt.merchantName);
await page.type('input#expense_date', formattedDate);
await page.type('input#amount', cleanAmount);
await page.select('select#category', receipt.category);
await fileInput.uploadFile(imagePath);
await page.click('button[type="submit"]');
```

---

### 3. Página de Confirmação

**URL**: Pode redirecionar após submit

| Elemento            | Seletor Atual (PLACEHOLDER) | Seletor Real | Status                 |
| ------------------- | --------------------------- | ------------ | ---------------------- |
| Mensagem de Sucesso | `.success-message`          | `???`        | ⚠️ **NÃO CONFIGURADO** |
| ID de Confirmação   | `.confirmation-number`      | `???`        | ⚠️ **NÃO CONFIGURADO** |

**Exemplo de código (linha ~270-280 em `dracmaSubmitter.ts`):**

```typescript
confirmationId = await page.$eval('.confirmation-number', el => el.textContent?.trim());
```

---

## 🔍 Dicas para Encontrar Seletores

### 1. Por ID (Preferencial)

IDs são únicos e mais confiáveis:

```css
#username
#merchant_name
#expense_date
```

### 2. Por Name

Se não tiver ID, use o atributo `name`:

```css
input[name="username"]
input[name="merchant"]
select[name="category"]
```

### 3. Por Class

Menos confiável (classes podem mudar):

```css
.form-control
.btn-primary
```

### 4. Por Tipo

Para elementos genéricos:

```css
input[type="text"]
input[type="file"]
button[type="submit"]
```

### 5. Seletores Compostos

Combine para ser mais específico:

```css
form#loginForm input[name="username"]
div.expense-form input#amount
```

---

## 🧪 Como Testar os Seletores

### Opção 1: Console do DevTools

```javascript
// No console do Dracma (F12 → Console)
document.querySelector('input#username'); // Deve retornar o elemento
document.querySelectorAll('button[type="submit"]').length; // Quantos botões?
```

### Opção 2: Puppeteer Headless = false

Edite `/server/services/dracmaSubmitter.ts` linha ~44:

```typescript
this.browser = await puppeteer.launch({
  headless: false, // MUDAR PARA false PARA VER O NAVEGADOR
  // ...
});
```

Execute o job manualmente e observe o navegador:

```bash
npx tsx server/jobs/dracmaSubmissionJob.ts run
```

---

## 📸 Screenshots de Erro

Se o Puppeteer falhar, ele salva screenshots automáticos em `/tmp/`:

```bash
# Listar screenshots de erro
ls -lh /tmp/dracma_error_*.png
ls -lh /tmp/dracma_no_login_*.png

# Abrir último screenshot
open $(ls -t /tmp/dracma_error_*.png | head -1)
```

Use esses screenshots para identificar onde o script está falhando.

---

## 🚨 Checklist de Atualização

Antes de colocar em produção:

- [ ] Acessei o Dracma e inspecionei os campos
- [ ] Anotei os seletores reais (ID, name, class)
- [ ] Atualizei os seletores em `/server/services/dracmaSubmitter.ts`
- [ ] Testei com `headless: false` e vi o navegador funcionando
- [ ] O login está funcionando corretamente
- [ ] O formulário de despesa é preenchido corretamente
- [ ] O upload de arquivo funciona
- [ ] A confirmação é capturada corretamente
- [ ] Atualizei este documento (`docs/dracma-selectors.md`) com os seletores reais
- [ ] Testei com um recibo real do início ao fim

---

## 📞 Suporte

Se o Dracma mudar a estrutura do site:

1. **Pare o job**: Comente o setInterval em `/server/index.ts` linha ~211
2. **Atualize os seletores**: Siga este guia novamente
3. **Teste manualmente**: `npx tsx server/jobs/dracmaSubmissionJob.ts run`
4. **Reative o job**: Descomente o setInterval

---

## 📖 Recursos Úteis

- [Puppeteer Selectors Documentation](https://pptr.dev/guides/page-interactions#selectors)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)

---

**Última revisão**: Aguardando primeira configuração
**Próxima revisão**: Após primeiro deploy bem-sucedido
