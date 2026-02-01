# ✅ Implementação Multi-Pastor Concluída

## 🎯 Resumo da Implementação

O sistema de automação de recibos foi adaptado para suportar **múltiplos pastores**, cada um com suas próprias credenciais do Dracma. O isolamento é feito por **distrito** (`district_id`), não por igreja individual.

---

## 📊 Arquitetura do Sistema

### Esquema Real do Banco de Dados

```
users
├── id (integer)
├── district_id (integer) → districts.id
├── church (text) - nome da igreja
├── church_code (text)
├── role (text) - 'pastor', 'admin', 'member', etc.
└── ... outros campos

districts
├── id (integer)
├── name (text)
└── ... outros campos

automation_config
├── id (integer)
├── key (text) - 'dracma_username', 'dracma_password', etc.
├── value (text)
├── user_id (integer) → users.id
├── district_id (integer) → districts.id  ← NOVO!
├── church_id (integer) → churches.id     ← EXISTE mas não é usado
├── encrypted (boolean)
└── updated_at (timestamp)

expense_receipts
├── id (integer)
├── user_id (integer) → users.id
├── image_url (text)
├── status (text) - 'pending', 'submitted', 'error'
├── dracma_submitted_at (timestamp)
├── dracma_confirmation_id (text)
└── ... outros campos OCR
```

### Como Funciona o Isolamento

**Isolamento por Distrito:**

- Cada pastor pertence a um `district_id`
- Cada membro também pertence a um `district_id`
- Pastores veem apenas recibos de membros do **mesmo distrito**
- Múltiplas igrejas do mesmo distrito compartilham as mesmas credenciais

**Hierarquia de Credenciais:**

1. **Pastor configura suas credenciais** → salvos com `user_id` + `district_id`
2. **Membro envia recibo** → sistema busca pastor do mesmo `district_id`
3. **Submissão ao Dracma** → usa credenciais do pastor do distrito

---

## 🚀 O Que Foi Implementado

### 1. Migração de Banco de Dados ✅

**Executado:**

```bash
npx tsx update-for-multi-pastor-fixed.mjs
```

**Mudanças:**

- ✅ Adicionada coluna `district_id` na tabela `automation_config`
- ✅ Criado índice `idx_automation_config_district_id` para performance
- ✅ Configurações globais marcadas como `EXEMPLO_*`

### 2. Backend Adaptado ✅

**Arquivos modificados:**

#### `/server/routes/receiptRoutes.ts`

- ✅ Filtro por `district_id` em `/api/receipts/admin/pending`
- ✅ Filtro por `district_id` em `/api/receipts/admin/all`
- ✅ Estatísticas por `district_id` em `/api/receipts/stats`

**Lógica:**

```typescript
// Pastores veem apenas recibos do distrito deles
if (userRole === 'pastor' && userDistrictId) {
  receipts = await sql`
    SELECT er.*, u.name as user_name
    FROM expense_receipts er
    JOIN users u ON er.user_id = u.id
    WHERE u.district_id = ${userDistrictId}
    ORDER BY er.created_at DESC
  `;
}
```

#### `/server/services/dracmaSubmitter.ts`

- ✅ Busca credenciais por `district_id` do usuário
- ✅ Fallback: busca pastor do mesmo distrito
- ✅ Fallback secundário: configurações globais (exemplo)

**Lógica de busca de credenciais:**

```typescript
async getCredentials(userId: number): Promise<DracmaCredentials> {
  // 1. Buscar district_id do usuário
  const user = await sql`SELECT district_id FROM users WHERE id = ${userId}`;

  // 2. Buscar credenciais do pastor do distrito
  const pastor = await sql`
    SELECT id FROM users
    WHERE district_id = ${user.district_id}
    AND role IN ('pastor', 'admin')
    LIMIT 1
  `;

  // 3. Buscar credenciais do pastor
  const credentials = await sql`
    SELECT key, value FROM automation_config
    WHERE key IN ('dracma_username', 'dracma_password')
    AND user_id = ${pastor.id}
  `;

  return credentials;
}
```

### 3. Scripts de Configuração ✅

#### `configure-pastor-credentials.mjs`

- ✅ Atualizado para usar `district_id`
- ✅ Lista pastores com seus distritos
- ✅ Permite configurar credenciais individuais
- ✅ Salva `user_id` + `district_id` no banco

**Uso:**

```bash
npx tsx configure-pastor-credentials.mjs
```

### 4. Background Job ✅

**`/server/jobs/dracmaSubmissionJob.ts`**

- ✅ Busca recibos pendentes
- ✅ Para cada recibo, identifica `district_id` do usuário
- ✅ Busca credenciais do pastor do distrito
- ✅ Submete no Dracma usando Puppeteer

---

## 📝 Como Usar

### Passo 1: Verificar Migração

```bash
npx tsx update-for-multi-pastor-fixed.mjs
```

**Saída esperada:**

```
✅ Coluna district_id adicionada
✅ Índice para district_id criado
✅ Sistema adaptado para usar district_id!
```

### Passo 2: Configurar Credenciais de Cada Pastor

```bash
npx tsx configure-pastor-credentials.mjs
```

**Interação:**

```
📋 Pastores disponíveis:

   1. João Silva (ID: 5)
      Email: joao@igreja.com
      Distrito ID: 2

Digite o número do pastor (ou 0 para sair): 1

📝 Configure as credenciais do Dracma:

Usuário do Dracma: joao.silva
Senha do Dracma: ********

📝 Configure a API Key do OCR.space (opcional):

API Key do OCR.space: abc123xyz...

✅ Configurações salvas com sucesso!
```

### Passo 3: Testar o Sistema

```bash
# Criar recibo de teste
npx tsx test-api.mjs

# Executar job manualmente
npx tsx server/jobs/dracmaSubmissionJob.ts run

# Ver estatísticas
curl http://localhost:3065/api/receipts/stats
```

---

## 🔍 Verificação

### Ver Configurações por Pastor

```sql
SELECT
  u.name as pastor,
  u.district_id,
  ac.key,
  CASE
    WHEN ac.key LIKE '%password%' THEN '••••••••'
    WHEN ac.key LIKE '%api_key%' THEN '••••••••'
    ELSE ac.value
  END as value
FROM automation_config ac
JOIN users u ON ac.user_id = u.id
WHERE u.role = 'pastor'
ORDER BY u.name, ac.key;
```

### Ver Recibos por Distrito

```sql
SELECT
  d.name as distrito,
  COUNT(er.id) as total_recibos,
  SUM(CASE WHEN er.status = 'pending' THEN 1 ELSE 0 END) as pendentes,
  SUM(CASE WHEN er.status = 'submitted' THEN 1 ELSE 0 END) as submetidos
FROM districts d
LEFT JOIN users u ON u.district_id = d.id
LEFT JOIN expense_receipts er ON er.user_id = u.id
GROUP BY d.id, d.name
ORDER BY total_recibos DESC;
```

---

## ⚠️ IMPORTANTE: Diferenças do Planejamento Original

### O Que Mudou

**Planejamento Original:**

- Isolamento por `church_id` (igreja individual)
- Cada igreja teria suas próprias credenciais

**Implementação Real:**

- Isolamento por `district_id` (distrito)
- Pastores do mesmo distrito compartilham credenciais
- Múltiplas igrejas do distrito usam as mesmas credenciais

### Por Que Mudou

O esquema real do banco de dados não tem `church_id` nos `users`. A estrutura existente é:

- `users.district_id` → `districts.id`
- `users.church` (texto livre, nome da igreja)
- `users.church_code` (código da igreja, mas não é chave estrangeira)

**Decisão:** Usar `district_id` como chave de isolamento porque:

1. ✅ Já existe nos `users`
2. ✅ Já tem relacionamento com `districts`
3. ✅ Fácil de implementar sem alterar esquema existente
4. ✅ Suficiente para isolamento (1 pastor por distrito geralmente)

### Consequências

**Vantagens:**

- ✅ Menos mudanças no banco de dados
- ✅ Compatível com esquema existente
- ✅ Mais simples de gerenciar (menos configurações)

**Limitações:**

- ⚠️ Igrejas do mesmo distrito compartilham credenciais
- ⚠️ Se 1 distrito tem 2 pastores, precisam combinar credenciais
- ⚠️ Não há isolamento total entre igrejas do mesmo distrito

**Solução Futura (se necessário):**
Se precisar de isolamento por igreja individual:

1. Adicionar `church_id` na tabela `users`
2. Criar chave estrangeira para `churches.id`
3. Atualizar queries para usar `church_id` ao invés de `district_id`
4. Executar migração de dados

---

## 🧪 Testes de Validação

```bash
# Rodar todos os testes
npx tsx test-multi-pastor.mjs
```

**O que é testado:**

1. ✅ Estrutura da tabela `automation_config` (colunas `user_id` e `district_id`)
2. ✅ Configurações por pastor
3. ✅ Configurações globais (marcadas como exemplo)
4. ✅ Lógica de busca de credenciais
5. ✅ Isolamento de recibos por distrito
6. ✅ Índices de performance

---

## 📚 Documentação Relacionada

- [MULTI-PASTOR-SETUP.md](MULTI-PASTOR-SETUP.md) - Guia completo do sistema multi-pastor
- [QUICK-START.md](QUICK-START.md) - Guia rápido de comandos
- [docs/receipt-automation-README.md](docs/receipt-automation-README.md) - Documentação completa da automação
- [docs/dracma-selectors.md](docs/dracma-selectors.md) - Seletores CSS do Dracma

---

## ✅ Checklist de Implementação

### Backend

- [x] Migração executada (`update-for-multi-pastor-fixed.mjs`)
- [x] Coluna `district_id` adicionada em `automation_config`
- [x] Índices criados
- [x] `receiptRoutes.ts` atualizado para filtrar por `district_id`
- [x] `dracmaSubmitter.ts` atualizado para buscar credenciais por `district_id`
- [x] `dracmaSubmissionJob.ts` atualizado para passar `userId`
- [x] Script `configure-pastor-credentials.mjs` criado
- [x] Script `test-multi-pastor.mjs` criado

### Próximos Passos (Para Produção)

- [ ] Executar migração no banco de produção
- [ ] Configurar credenciais de cada pastor
- [ ] Testar fluxo completo com foto real via WhatsApp
- [ ] Verificar isolamento (pastor não vê recibos de outros distritos)
- [ ] Atualizar webhooks n8n com API keys dos pastores
- [ ] Deploy do código atualizado

---

## 🎉 Status Final

**✅ IMPLEMENTAÇÃO MULTI-PASTOR CONCLUÍDA!**

**O sistema agora suporta:**

- ✅ Múltiplos pastores com credenciais individuais
- ✅ Isolamento de recibos por distrito
- ✅ Busca automática de credenciais (usuário → pastor do distrito)
- ✅ Fallback seguro para configurações globais
- ✅ Scripts de configuração e testes

**Pronto para uso em produção após configuração das credenciais dos pastores!**
