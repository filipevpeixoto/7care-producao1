# ✅ Sistema Multi-Pastor - Versão Corrigida

## 🎯 Regra Principal

**APENAS PASTORES PODEM ENVIAR NOTAS FISCAIS**

Este não é um sistema para membros da igreja enviarem recibos. É um sistema para **pastores** automatizarem o lançamento de suas próprias notas fiscais no Dracma.

---

## 📊 Como Funciona

### Fluxo Simplificado

```
Pastor tira foto da nota fiscal
  ↓
Envia via WhatsApp Business
  ↓
Evolution API recebe webhook
  ↓
n8n faz OCR e extrai dados
  ↓
n8n envia para 7Care Backend
  ↓
Backend salva recibo com user_id do pastor
  ↓
Background Job (a cada 5min) processa recibos pendentes
  ↓
Para cada recibo:
  - Busca credenciais do próprio pastor (user_id)
  - Usa Puppeteer para submeter no Dracma
  ↓
Recibo marcado como "submitted" ou "error"
```

### Credenciais

- Cada pastor configura **suas próprias credenciais** do Dracma
- As credenciais são salvas com:
  - `user_id` = ID do pastor
  - `district_id` = Distrito do pastor
- Na hora de submeter, o sistema usa as credenciais do **próprio pastor** que enviou a nota

---

## 🔐 Isolamento por Distrito

Pastores veem apenas recibos do **seu próprio distrito** nos endpoints administrativos:

### Endpoints com Filtro

**`GET /api/receipts/admin/pending`**

- Pastor vê: Apenas recibos pendentes do seu distrito
- Admin/Superadmin vê: Todos os recibos pendentes

**`GET /api/receipts/admin/all`**

- Pastor vê: Apenas recibos do seu distrito
- Admin/Superadmin vê: Todos os recibos

**`GET /api/receipts/stats`**

- Pastor vê: Estatísticas do seu distrito
- Admin/Superadmin vê: Estatísticas globais

**`GET /api/receipts/my-receipts`**

- Qualquer usuário vê: Apenas seus próprios recibos

---

## 🚀 Configuração

### 1. Migração (uma vez)

```bash
npx tsx update-for-multi-pastor-fixed.mjs
```

**O que faz:**

- ✅ Adiciona `district_id` na tabela `automation_config`
- ✅ Cria índices para performance

### 2. Configurar Cada Pastor

```bash
npx tsx configure-pastor-credentials.mjs
```

**Interação:**

```
📋 Pastores disponíveis:

   1. João Silva (ID: 5)
      Email: joao@igreja.com
      Distrito ID: 2

Digite o número do pastor: 1

Usuário do Dracma: joao.silva
Senha do Dracma: ********
API Key do OCR.space: abc123...

✅ Configurações salvas!
```

**O que é salvo:**

```sql
INSERT INTO automation_config (key, value, user_id, district_id)
VALUES
  ('n8n_api_key', 'xyz789...', 5, 2),
  ('dracma_username', 'joao.silva', 5, 2),
  ('dracma_password', 'senha123', 5, 2),
  ('ocr_space_api_key', 'abc123', 5, 2);
```

---

## 📝 Lógica de Submissão

### Código Simplificado

**No DracmaSubmitter:**

```typescript
async getCredentials(userId: number): Promise<DracmaCredentials> {
  // 1. Verificar que é pastor
  const user = await sql`SELECT role, name FROM users WHERE id = ${userId}`;

  if (!['pastor', 'admin', 'superadmin'].includes(user.role)) {
    throw new Error('Apenas pastores podem enviar notas fiscais');
  }

  // 2. Buscar credenciais do próprio pastor
  const configs = await sql`
    SELECT key, value FROM automation_config
    WHERE key IN ('dracma_username', 'dracma_password')
    AND user_id = ${userId}
    AND value != 'CHANGE_ME'
  `;

  if (configs.length < 2) {
    throw new Error('Pastor não tem credenciais configuradas');
  }

  return configs; // username e password do próprio pastor
}
```

**No Background Job:**

```typescript
// Busca recibos pendentes
const receipts = await sql`
  SELECT id, user_id, merchant_name, ...
  FROM expense_receipts
  WHERE status = 'pending'
  LIMIT 10
`;

// Para cada recibo
for (const receipt of receipts) {
  // Busca credenciais do PRÓPRIO pastor que enviou
  const credentials = await submitter.getCredentials(receipt.user_id);

  // Submete usando credenciais dele
  await submitter.submitReceipt(receipt);
}
```

---

## 🔍 Diferenças da Implementação Anterior

### ❌ Antes (ERRADO - assumia membros enviando)

```
Membro envia nota
  ↓
Sistema busca pastor do distrito do membro
  ↓
Usa credenciais do pastor para submeter
```

**Problemas:**

- Complexo: buscar pastor do distrito
- Desnecessário: membros não enviam notas
- Confuso: quem enviou vs quem submeteu

### ✅ Agora (CORRETO - apenas pastores)

```
Pastor envia nota
  ↓
Sistema usa credenciais do próprio pastor
  ↓
Submete no Dracma
```

**Vantagens:**

- ✅ Simples: sem busca de pastor
- ✅ Direto: pastor usa suas próprias credenciais
- ✅ Claro: quem envia é quem submete

---

## 📊 Isolamento por Distrito

**Por que usar `district_id`?**

Mesmo que apenas pastores enviem notas, o filtro por distrito é útil para:

1. **Múltiplos pastores no sistema:**
   - Pastor A (Distrito 1) vê apenas seus recibos
   - Pastor B (Distrito 2) vê apenas seus recibos
   - Admin vê todos os recibos

2. **Estatísticas por distrito:**
   - Cada pastor vê estatísticas do seu distrito
   - Útil para relatórios e acompanhamento

3. **Segurança:**
   - Impede que pastor de um distrito veja dados de outro

---

## ✅ Checklist de Validação

### Testes Básicos

**1. Verificar que apenas pastores podem enviar:**

```bash
# Criar recibo com user_id de um membro comum
# Deve falhar com: "Apenas pastores podem enviar notas fiscais"
```

**2. Verificar credenciais por pastor:**

```sql
SELECT u.name, ac.key, ac.value, ac.district_id
FROM automation_config ac
JOIN users u ON ac.user_id = u.id
WHERE u.role = 'pastor'
ORDER BY u.name, ac.key;
```

**3. Verificar isolamento:**

```bash
# Pastor A faz login e acessa /api/receipts/admin/pending
# Deve ver apenas recibos do distrito dele

# Admin faz login e acessa /api/receipts/admin/pending
# Deve ver todos os recibos
```

---

## 🎯 Resumo Final

### O Que o Sistema Faz

1. ✅ Permite que **pastores** enviem fotos de notas fiscais via WhatsApp
2. ✅ Extrai dados automaticamente via OCR
3. ✅ Submete automaticamente no Dracma usando **credenciais do próprio pastor**
4. ✅ Isola visualização por distrito (pastor vê só seu distrito)
5. ✅ Cada pastor tem suas próprias credenciais

### O Que o Sistema NÃO Faz

1. ❌ Membros comuns **não podem** enviar notas
2. ❌ Não busca credenciais de "outro pastor"
3. ❌ Não compartilha credenciais entre pastores
4. ❌ Não tem isolamento por igreja individual (usa distrito)

---

## 🚀 Próximos Passos

1. **Configurar credenciais de cada pastor:**

   ```bash
   npx tsx configure-pastor-credentials.mjs
   ```

2. **Testar envio de nota:**
   - Pastor envia foto via WhatsApp
   - Verificar que recibo foi criado
   - Verificar que foi submetido no Dracma

3. **Testar isolamento:**
   - Fazer login como Pastor A
   - Acessar `/api/receipts/admin/pending`
   - Verificar que vê apenas recibos do distrito A

4. **Deploy em produção:**
   - Executar migração no banco de produção
   - Configurar credenciais de todos os pastores
   - Atualizar webhooks n8n

---

**Status:** ✅ Sistema corrigido e simplificado para uso exclusivo de pastores!

**Arquivos Principais:**

- [server/services/dracmaSubmitter.ts](server/services/dracmaSubmitter.ts) - Lógica simplificada
- [server/routes/receiptRoutes.ts](server/routes/receiptRoutes.ts) - Filtros por distrito
- [configure-pastor-credentials.mjs](configure-pastor-credentials.mjs) - Configurar credenciais

**Documentação:**

- [IMPLEMENTACAO-MULTI-PASTOR-FINAL.md](IMPLEMENTACAO-MULTI-PASTOR-FINAL.md) - Implementação completa
- [QUICK-START.md](QUICK-START.md) - Guia rápido
