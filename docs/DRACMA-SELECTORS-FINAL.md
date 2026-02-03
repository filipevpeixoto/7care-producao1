# Seletores CSS do Dracma (Formulário de Contas a Pagar)

**Última atualização:** 01/02/2026
**URL do formulário:** https://dracma.sdasystems.org/accounts-payable/create
**Método de extração:** Script v3 executado com formulário preenchido

---

## 📋 Resumo Executivo

O formulário de criação de contas a pagar do Dracma utiliza:

- **Semantic UI** para dropdowns (.ui.dropdown)
- **Flatpickr** para campo de data (.flatpickr-input)
- **Campos de texto** padrão HTML5
- **Textarea** para finalidade

Total de **8 campos principais** identificados.

---

## 🔍 Campos Extraídos

### 1. Dropdown: Entidade

**Tipo:** Semantic UI Dropdown
**Label:** "Entidade"
**Seletor:** `.field label:contains("Entidade") + .ui.dropdown`
**Valor exemplo:** "1211 - ASRS - Associação Sul do Rio Grande do Sul"

**Estrutura HTML:**

```html
<div class="field">
  <label>Entidade</label>
  <div class="ui dropdown">
    <div class="text">1211 - ASRS - Associação Sul do Rio Grande do Sul</div>
    <input type="hidden" name="entity_id" value="1211" />
    <div class="menu">
      <div class="item" data-value="1211">1211 - ASRS - Associação Sul...</div>
      <!-- Mais opções -->
    </div>
  </div>
</div>
```

**Como selecionar via Puppeteer:**

```typescript
await selectSemanticDropdown(page, 'Entidade', '1211');
```

---

### 2. Dropdown: Tipo de Documento

**Tipo:** Semantic UI Dropdown
**Label:** "Tipo de Documento"
**Seletor:** `.field label:contains("Tipo de Documento") + .ui.dropdown`
**Valor exemplo:** "NFCe - Nota Fiscal Consumidor Eletrônica"
**Total de opções:** 72

**Opções principais extraídas:**

- NFCe - Nota Fiscal Consumidor Eletrônica
- NFe - Nota Fiscal Eletrônica
- Cupom Fiscal
- Recibo
- Fatura
- Boleto
- Nota Fiscal de Serviço
- Ordem de Pagamento
- (+ 64 outras)

**Como selecionar via Puppeteer:**

```typescript
await selectSemanticDropdown(page, 'Tipo de Documento', 'NFCe');
```

---

### 3. Dropdown: Emitente

**Tipo:** Semantic UI Dropdown (com busca)
**Label:** "Emitente" (pode ser dinâmico - exibe nome selecionado)
**Seletor:** `.field:nth-child(3) .ui.dropdown` (posição relativa)
**Valor exemplo:** "SIM REDE DE POSTOS LTDA"

**Características especiais:**

- Dropdown com campo de busca (search)
- Lista grande de estabelecimentos cadastrados
- Permite criar novo emitente se não existir

**Como selecionar via Puppeteer:**

```typescript
await selectSemanticDropdown(page, 'SIM REDE DE POSTOS LTDA', 'SIM REDE DE POSTOS LTDA');
// Ou procurar pelo label "Emitente" se estiver sempre presente
```

---

### 4. Input: Chave de Acesso

**Tipo:** Input de texto
**Label:** "Chave de Acesso"
**Seletor:** `input[placeholder*="SEFAZ"]` ou `input[id^="1a"]`
**ID dinâmico:** `id="1a912a"` (pode mudar a cada sessão)
**Placeholder:** (vazio ou texto sobre validação SEFAZ)
**Valor exemplo:** (vazio no formulário extraído)

**Características:**

- Campo opcional
- Aceita 44 dígitos (chave SEFAZ)
- Validação automática se preenchido

**Como preencher via Puppeteer:**

```typescript
await fillInputByLabel(page, 'Chave de Acesso', '12345678901234567890123456789012345678901234');
```

---

### 5. Input: Data de Emissão

**Tipo:** Input com Flatpickr (date picker)
**Label:** "Data de Emissão"
**Seletor:** `input.flatpickr-input[id^="1a"]`
**ID dinâmico:** `id="1a912a"` (pode mudar)
**Classe principal:** `flatpickr-input`
**Valor exemplo:** "22/01/2026"
**Formato:** dd/mm/yyyy

**Características:**

- Campo obrigatório
- Flatpickr inicializa calendário ao clicar
- Aceita digitação direta no formato brasileiro

**Como preencher via Puppeteer:**

```typescript
await fillInputByLabel(page, 'Data de Emissão', '22/01/2026');
```

---

### 6. Input: Número

**Tipo:** Input de texto/número
**Label:** "Número"
**Seletor:** `input[value="3112278"]` (exemplo) ou buscar por label
**Valor exemplo:** "3112278"

**Características:**

- Número da nota fiscal
- Campo numérico
- Pode ser extraído do OCR

**Como preencher via Puppeteer:**

```typescript
await fillInputByLabel(page, 'Número', '3112278');
```

---

### 7. Input: Valor

**Tipo:** Input de texto (currency)
**Label:** "Valor"
**Seletor:** `input[placeholder="R$ 0,00"]`
**Placeholder:** "R$ 0,00"
**Valor exemplo:** "R$ 270,44"
**Formato:** Moeda brasileira (R$ xxx,xx)

**Características:**

- Campo obrigatório
- Formato com vírgula para centavos
- Máscara de moeda aplicada automaticamente

**Como preencher via Puppeteer:**

```typescript
await fillInputByLabel(page, 'Valor', 'R$ 270,44');
```

---

### 8. Textarea: Finalidade

**Tipo:** Textarea
**Label:** "Finalidade"
**Seletor:** `textarea` dentro do `.field` com label "Finalidade"
**Valor exemplo:** "Viagem para encontro diretores e tesoureiros."

**Características:**

- Campo de texto multilinha
- Aceita descrição detalhada
- Pode ser preenchido com categoria + merchant name

**Como preencher via Puppeteer:**

```typescript
await fillTextareaByLabel(page, 'Finalidade', 'Viagem para encontro diretores e tesoureiros.');
```

---

## 🎯 Estratégia de Automação

### 1. Login (Página Inicial)

**URL:** https://dracma.sdasystems.org/login
**Seletores a descobrir:**

- `input[name="username"]` ou `input[type="email"]`
- `input[name="password"]` ou `input[type="password"]`
- `button[type="submit"]`

### 2. Navegação ao Formulário

**URL direta:** https://dracma.sdasystems.org/accounts-payable/create
**Aguardar:** `.ui.dropdown` (indicador que página carregou)

### 3. Preenchimento Sequencial

**Ordem recomendada:**

1. Tipo de Documento → "NFCe"
2. Emitente → Nome do estabelecimento
3. Data de Emissão → dd/mm/yyyy
4. Número → Número da nota
5. Valor → R$ xxx,xx
6. Chave de Acesso → (se disponível)
7. Finalidade → Descrição

### 4. Upload de Imagem

**Seletor:** `input[type="file"]`
**Método:** `fileInput.uploadFile(imagePath)`

### 5. Submit

**Seletor:** `button[type="submit"]`
**Aguardar:** Mensagem de sucesso ou ID de confirmação

---

## 📊 Tabela Resumida

| Campo             | Tipo              | Label               | Obrigatório | Exemplo                                    |
| ----------------- | ----------------- | ------------------- | ----------- | ------------------------------------------ |
| Entidade          | Dropdown (SUI)    | "Entidade"          | ✅          | "1211 - ASRS - Associação Sul..."          |
| Tipo de Documento | Dropdown (SUI)    | "Tipo de Documento" | ✅          | "NFCe - Nota Fiscal Consumidor..."         |
| Emitente          | Dropdown (SUI)    | (dinâmico)          | ✅          | "SIM REDE DE POSTOS LTDA"                  |
| Chave de Acesso   | Input             | "Chave de Acesso"   | ❌          | "123456789012345678901234..." (44 dígitos) |
| Data de Emissão   | Input (Flatpickr) | "Data de Emissão"   | ✅          | "22/01/2026"                               |
| Número            | Input             | "Número"            | ✅          | "3112278"                                  |
| Valor             | Input (Currency)  | "Valor"             | ✅          | "R$ 270,44"                                |
| Finalidade        | Textarea          | "Finalidade"        | ✅          | "Viagem para encontro diretores..."        |

---

## ⚠️ Observações Importantes

### IDs Dinâmicos

Alguns campos têm IDs gerados dinamicamente (ex: `id="1a912a"`).
**Solução:** Buscar por **label** próximo ou **classe CSS**.

### Semantic UI Dropdowns

**NÃO** usar `page.select()` padrão do Puppeteer.
**USAR:** Método customizado que:

1. Clica no `.ui.dropdown` para abrir
2. Procura `.item[data-value]` com texto desejado
3. Clica no item encontrado

### Flatpickr (Data)

O Flatpickr pode interceptar cliques no input.
**Solução:** Digitar diretamente no input (funciona).

### Tempo de Espera

Aguardar **pelo menos 1 segundo** após:

- Clicar em dropdown (para menu abrir)
- Selecionar item (para valor ser salvo)
- Upload de imagem (para processar)

---

## 🧪 Script de Teste

Para testar manualmente os seletores:

```bash
# Executar job uma vez (sem cron)
npx tsx server/jobs/dracmaSubmissionJob.ts run

# Ver estatísticas
npx tsx server/jobs/dracmaSubmissionJob.ts stats

# Retry de erros
npx tsx server/jobs/dracmaSubmissionJob.ts retry
```

---

## 🔄 Manutenção

Se o Dracma mudar a estrutura:

1. Re-executar script de extração:

   ```javascript
   // Copiar docs/extract-dracma-selectors-v3.js no Console do navegador
   ```

2. Comparar JSON resultante com esta documentação

3. Atualizar seletores em:
   - `/server/services/dracmaSubmitter.ts`
   - Este arquivo (DRACMA-SELECTORS-FINAL.md)

---

## ✅ Checklist de Validação

Antes de cada deploy:

- [ ] Login funciona com credenciais de teste
- [ ] Todos os 8 campos são preenchidos
- [ ] Upload de imagem é processado
- [ ] Formulário é submetido com sucesso
- [ ] ID de confirmação é capturado
- [ ] Screenshot de sucesso foi salvo

---

**Última verificação:** 01/02/2026
**Próxima revisão:** Após primeira execução em produção
