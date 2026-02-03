# 🔍 Como Extrair Seletores CSS do Dracma

Este guia te ensina a extrair automaticamente todos os seletores CSS do formulário do Dracma usando um script no Console do navegador.

---

## 📋 Passo a Passo

### 1. **Fazer Login no Dracma**

Acesse e faça login:

```
https://dracma.sdasystems.org/login
```

### 2. **Navegar para a Página de Criação**

Vá para a página de criar conta a pagar:

```
https://dracma.sdasystems.org/accounts-payable/create
```

Ou navegue manualmente:

- Menu → Contas a Pagar → Nova Conta a Pagar

### 3. **Abrir o Console do Navegador**

Pressione **F12** (Windows/Linux) ou **Cmd+Option+I** (Mac)

Clique na aba **"Console"**

### 4. **Executar o Script de Extração**

Copie TODO o conteúdo do arquivo:

```
docs/extract-dracma-selectors.js
```

Cole no Console e pressione **Enter**

### 5. **Resultado**

O script vai:

1. ✅ Analisar todos os campos do formulário
2. ✅ Extrair seletores CSS (id, name, class)
3. ✅ Identificar labels de cada campo
4. ✅ Listar opções de dropdowns
5. ✅ Encontrar botão de submit
6. ✅ Gerar JSON completo
7. ✅ Copiar automaticamente para clipboard

### 6. **Copiar o JSON**

O JSON será automaticamente copiado para sua área de transferência.

Se não copiar automaticamente, você verá algo assim no console:

```json
{
  "pageUrl": "https://dracma.sdasystems.org/accounts-payable/create",
  "extractedAt": "2026-02-01T...",
  "formSelectors": {
    "id": "#payment-form",
    "tag": "form"
  },
  "fields": [
    {
      "type": "input",
      "inputType": "text",
      "name": "merchant_name",
      "id": "merchant",
      "label": "Nome do Estabelecimento",
      "selectors": [
        "#merchant",
        "input[name='merchant_name']"
      ]
    },
    {
      "type": "input",
      "inputType": "date",
      "name": "expense_date",
      "id": "date",
      "label": "Data da Despesa",
      "selectors": [
        "#date",
        "input[name='expense_date']"
      ]
    },
    ...
  ]
}
```

Copie TUDO e me envie!

---

## 🎯 O Que o Script Extrai

### Campos de Input

- Nome (name)
- ID (id)
- Tipo (text, number, date, etc.)
- Placeholder
- Label associado
- Classes CSS

### Dropdowns (Select)

- Nome, ID, Classes
- **Todas as opções** (value + text)
- Label

### Upload de Arquivo

- Seletor do input[type="file"]
- Tipos de arquivo aceitos (accept)

### Botão de Submit

- Seletor do botão
- Texto do botão

---

## 🚀 Depois de Extrair

Me envie o JSON completo e eu vou:

1. ✅ Criar o código Puppeteer com os seletores corretos
2. ✅ Implementar a automação completa
3. ✅ Testar o preenchimento do formulário
4. ✅ Adicionar tratamento de erros

---

## 🛠️ Alternativa Manual (Se o Script Falhar)

Se o script não funcionar, você pode extrair manualmente:

### Para Cada Campo:

1. Clique com botão direito no campo
2. Selecione "Inspecionar" (Inspect)
3. Copie os atributos do HTML:

```html
<!-- Exemplo -->
<input
  id="merchant"
  name="merchant_name"
  type="text"
  class="form-control"
  placeholder="Nome do estabelecimento"
/>
```

Me informe:

- **Campo:** Nome do Estabelecimento
- **Seletor ID:** `#merchant`
- **Seletor Name:** `input[name="merchant_name"]`

Repita para TODOS os campos do formulário.

---

## 📸 Capturas de Tela (Opcional)

Se possível, tire screenshots de:

1. Formulário completo
2. Console após executar o script
3. Qualquer mensagem de erro (se houver)

---

## ❓ Problemas Comuns

### Script não executa

- Verifique se copiou TODO o código
- Certifique-se de estar na página correta
- Tente atualizar a página (F5) e executar novamente

### JSON não aparece

- Role o console até o final
- Procure por "📋 JSON COMPLETO"

### Clipboard não copia

- É normal em alguns navegadores
- Copie manualmente o JSON do console

---

## ✅ Pronto!

Assim que me enviar o JSON, implemento a automação completa do Puppeteer! 🚀
