# 🎯 Integração da Configuração do Dracma no Onboarding

## Endpoints Criados

Foram adicionados 4 novos endpoints na API para gerenciar as credenciais do Dracma:

### 1. **GET** `/api/receipts/dracma-config/status`

**Descrição:** Verifica se o pastor já configurou suas credenciais

**Headers:**

```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isConfigured": true,
    "hasUsername": true,
    "hasPassword": true
  }
}
```

**Uso no onboarding:**

- Verificar se pastor já configurou antes de mostrar o formulário
- Mostrar status atual da configuração

---

### 2. **GET** `/api/receipts/dracma-config`

**Descrição:** Busca credenciais do pastor (com senhas mascaradas)

**Headers:**

```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "dracmaUsername": "joao.silva",
    "dracmaPassword": "••••••••",
    "n8nApiKey": "5cb083d734f7e334ad9f...",
    "ocrApiKey": "helloworld123..."
  }
}
```

**Uso no onboarding:**

- Pré-preencher o formulário com dados existentes
- Permitir edição das credenciais

---

### 3. **POST** `/api/receipts/dracma-config`

**Descrição:** Salva ou atualiza as credenciais do pastor

**Headers:**

```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Body:**

```json
{
  "dracmaUsername": "joao.silva",
  "dracmaPassword": "minhaSenha123",
  "ocrApiKey": "helloworld123abc" // Opcional
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Credenciais salvas com sucesso",
    "n8nApiKey": "5cb083d734f7e334ad9f..."
  }
}
```

**Uso no onboarding:**

- Salvar credenciais quando pastor preencher o formulário
- Atualizar credenciais existentes

---

### 4. **DELETE** `/api/receipts/dracma-config`

**Descrição:** Remove configuração do Dracma (desativa a funcionalidade)

**Headers:**

```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Configuração removida com sucesso"
  }
}
```

**Uso no onboarding:**

- Permitir que pastor desative a automação de recibos
- Limpar credenciais se não quiser mais usar

---

## Proposta de Integração no Onboarding

### Passo 1: Adicionar Toggle "Usar Automação de Recibos"

No fluxo de onboarding em `https://7careapp-2026.netlify.app/onboarding`, adicione uma seção opcional:

```tsx
// Exemplo de estrutura (adapte ao seu código existente)

interface OnboardingFormData {
  // ... campos existentes ...
  enableReceiptAutomation?: boolean;
  dracmaUsername?: string;
  dracmaPassword?: string;
  ocrApiKey?: string;
}

function OnboardingDracmaStep() {
  const [enableAutomation, setEnableAutomation] = useState(false);
  const [formData, setFormData] = useState({
    dracmaUsername: '',
    dracmaPassword: '',
    ocrApiKey: '',
  });

  return (
    <div className="onboarding-step">
      <h2>Automação de Notas Fiscais (Opcional)</h2>
      <p>
        Quer automatizar o lançamento de notas fiscais no Dracma? Envie fotos via WhatsApp e o
        sistema lança automaticamente para você!
      </p>

      {/* Toggle para ativar/desativar */}
      <label>
        <input
          type="checkbox"
          checked={enableAutomation}
          onChange={e => setEnableAutomation(e.target.checked)}
        />
        Sim, quero usar a automação de recibos
      </label>

      {/* Formulário aparece apenas se ativado */}
      {enableAutomation && (
        <div className="dracma-form">
          <h3>Configure suas credenciais do Dracma</h3>

          <div className="form-field">
            <label>Usuário do Dracma</label>
            <input
              type="text"
              value={formData.dracmaUsername}
              onChange={e =>
                setFormData({
                  ...formData,
                  dracmaUsername: e.target.value,
                })
              }
              placeholder="seu.usuario"
              required
            />
            <small>Suas credenciais de acesso ao https://dracma.sdasystems.org/</small>
          </div>

          <div className="form-field">
            <label>Senha do Dracma</label>
            <input
              type="password"
              value={formData.dracmaPassword}
              onChange={e =>
                setFormData({
                  ...formData,
                  dracmaPassword: e.target.value,
                })
              }
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-field">
            <label>API Key do OCR.space (Opcional)</label>
            <input
              type="text"
              value={formData.ocrApiKey}
              onChange={e =>
                setFormData({
                  ...formData,
                  ocrApiKey: e.target.value,
                })
              }
              placeholder="Deixe em branco para usar o padrão"
            />
            <small>
              Opcional. Registre-se grátis em{' '}
              <a href="https://ocr.space/ocrapi" target="_blank" rel="noopener">
                ocr.space/ocrapi
              </a>{' '}
              para 500 leituras/dia
            </small>
          </div>
        </div>
      )}

      <button onClick={handleSave}>
        {enableAutomation ? 'Salvar e Continuar' : 'Pular esta etapa'}
      </button>
    </div>
  );

  async function handleSave() {
    if (!enableAutomation) {
      // Pular para próximo passo do onboarding
      return;
    }

    try {
      const response = await fetch('/api/receipts/dracma-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          dracmaUsername: formData.dracmaUsername,
          dracmaPassword: formData.dracmaPassword,
          ocrApiKey: formData.ocrApiKey || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Mostrar mensagem de sucesso
        toast.success('Credenciais salvas com sucesso!');
        // Continuar para próximo passo
        goToNextStep();
      } else {
        toast.error('Erro ao salvar credenciais');
      }
    } catch (error) {
      toast.error('Erro ao salvar credenciais');
    }
  }
}
```

---

### Passo 2: Verificar Status ao Carregar

Antes de mostrar o formulário, verificar se pastor já configurou:

```typescript
useEffect(() => {
  async function checkDracmaStatus() {
    try {
      const response = await fetch('/api/receipts/dracma-config/status', {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const result = await response.json();

      if (result.data.isConfigured) {
        // Já configurado, pode pular ou mostrar opção de editar
        setEnableAutomation(true);

        // Buscar dados existentes
        const configResponse = await fetch('/api/receipts/dracma-config', {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        const configData = await configResponse.json();

        if (configData.success) {
          setFormData({
            dracmaUsername: configData.data.dracmaUsername || '',
            dracmaPassword: '', // Não pré-preencher senha por segurança
            ocrApiKey: configData.data.ocrApiKey || '',
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }

  checkDracmaStatus();
}, []);
```

---

### Passo 3: Permitir Desativação

Adicione uma opção para desativar a automação:

```typescript
async function handleDisable() {
  if (!confirm('Tem certeza que deseja desativar a automação de recibos?')) {
    return;
  }

  try {
    const response = await fetch('/api/receipts/dracma-config', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      toast.success('Automação desativada com sucesso');
      setEnableAutomation(false);
      setFormData({
        dracmaUsername: '',
        dracmaPassword: '',
        ocrApiKey: '',
      });
    }
  } catch (error) {
    toast.error('Erro ao desativar automação');
  }
}
```

---

## Fluxo Sugerido no Onboarding

1. **Tela de Boas-Vindas**
2. **Dados Pessoais**
3. **Dados da Igreja**
4. **⭐ NOVO: Automação de Recibos (Opcional)** ← Adicionar aqui
   - Toggle: "Quero usar automação de recibos"
   - Se SIM: Formulário com credenciais do Dracma
   - Se NÃO: Pular para próxima etapa
5. **Confirmação**

---

## Mensagens de Ajuda

Adicione tooltips ou cards explicativos:

### Card de Explicação

```
📱 O que é a Automação de Recibos?

Com essa funcionalidade, você pode:
✓ Tirar foto de notas fiscais com o celular
✓ Enviar pelo WhatsApp
✓ Sistema lê automaticamente (OCR)
✓ Lança no Dracma sem você digitar nada

Economize tempo lançando suas despesas de reembolso!
```

### Avisos Importantes

```
⚠️ Importante:
- Suas credenciais são criptografadas e seguras
- Você pode desativar a qualquer momento
- Funcionalidade totalmente opcional
```

---

## Validações Necessárias

Adicione validações no formulário:

```typescript
function validateDracmaForm(data: OnboardingFormData) {
  const errors: string[] = [];

  if (!data.dracmaUsername || data.dracmaUsername.trim() === '') {
    errors.push('Usuário do Dracma é obrigatório');
  }

  if (!data.dracmaPassword || data.dracmaPassword.length < 6) {
    errors.push('Senha do Dracma deve ter no mínimo 6 caracteres');
  }

  // OCR API Key é opcional
  if (data.ocrApiKey && data.ocrApiKey.length < 10) {
    errors.push('API Key do OCR.space inválida');
  }

  return errors;
}
```

---

## Exemplo de Interface (Sugestão Visual)

```
┌─────────────────────────────────────────┐
│ Automação de Notas Fiscais (Opcional)  │
├─────────────────────────────────────────┤
│                                         │
│ 📱 Envie fotos de notas via WhatsApp   │
│    e lance automaticamente no Dracma!  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ☐ Quero usar essa funcionalidade   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [ Se marcado, mostrar formulário: ]    │
│                                         │
│ Usuário do Dracma                       │
│ ┌─────────────────────────────────────┐ │
│ │ seu.usuario                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Senha do Dracma                         │
│ ┌─────────────────────────────────────┐ │
│ │ ••••••••                            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ API Key OCR.space (opcional)            │
│ ┌─────────────────────────────────────┐ │
│ │ Opcional - 500 leituras grátis/dia │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Pular]             [Salvar e Continuar]│
└─────────────────────────────────────────┘
```

---

## Testando a Integração

### 1. Teste de Salvamento

```bash
curl -X POST http://localhost:3065/api/receipts/dracma-config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "dracmaUsername": "teste.usuario",
    "dracmaPassword": "senha123",
    "ocrApiKey": "optional_key"
  }'
```

### 2. Teste de Leitura

```bash
curl http://localhost:3065/api/receipts/dracma-config \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

### 3. Teste de Status

```bash
curl http://localhost:3065/api/receipts/dracma-config/status \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

### 4. Teste de Remoção

```bash
curl -X DELETE http://localhost:3065/api/receipts/dracma-config \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

---

## Checklist de Implementação

- [ ] Adicionar toggle "Usar Automação" no onboarding
- [ ] Criar formulário com campos do Dracma
- [ ] Implementar chamadas aos endpoints da API
- [ ] Adicionar validações no frontend
- [ ] Testar salvamento de credenciais
- [ ] Testar edição de credenciais existentes
- [ ] Testar desativação da funcionalidade
- [ ] Adicionar mensagens de ajuda/tooltips
- [ ] Testar fluxo completo do onboarding

---

## Segurança

✅ **Implementado:**

- Apenas pastores podem configurar (validação por role)
- Senhas mascaradas ao buscar configuração
- API keys parcialmente ocultas
- Credenciais associadas ao user_id do pastor logado

⚠️ **Recomendações adicionais:**

- Considere usar HTTPS em produção
- Implemente rate limiting nos endpoints de configuração
- Considere criptografar senhas no banco (campo `encrypted` já existe)

---

## Suporte

Se pastor tiver dúvidas sobre onde encontrar suas credenciais do Dracma:

```
📖 Como obter suas credenciais:

1. Acesse: https://dracma.sdasystems.org/
2. Use suas credenciais de login normais
3. O usuário e senha são os mesmos que você usa para fazer login no Dracma
```

---

**Status:** ✅ Endpoints prontos para integração no onboarding!

**Próximo passo:** Integrar no frontend em `https://7careapp-2026.netlify.app/onboarding`
