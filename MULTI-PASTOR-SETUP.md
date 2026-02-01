# 🔐 Sistema Multi-Pastor - Automação de Recibos

## Visão Geral

O sistema foi adaptado para permitir que **cada pastor configure suas próprias credenciais** do Dracma, mantendo isolamento total entre igrejas diferentes.

---

## Como Funciona

### 1. Configurações por Pastor

Cada pastor pode ter suas próprias configurações salvas no banco de dados:

```sql
-- Estrutura da tabela automation_config
CREATE TABLE automation_config (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),  -- Pastor específico
  church_id INTEGER REFERENCES churches(id),  -- Igreja específica
  encrypted BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Hierarquia de Credenciais

Quando um recibo precisa ser submetido ao Dracma, o sistema busca credenciais nesta ordem:

1. **Credenciais do próprio usuário** (se for pastor e tiver configurado)
2. **Credenciais do pastor da igreja** (busca pelo `church_id` do usuário)
3. **Credenciais globais** (configurações exemplo, geralmente marcadas como `EXEMPLO_*`)

Esta hierarquia garante que:

- Pastores podem configurar suas próprias credenciais
- Membros da igreja usam automaticamente as credenciais do pastor
- Há um fallback seguro caso credenciais não estejam configuradas

### 3. Isolamento por Igreja

#### Rotas de API

**Pastores veem apenas recibos da sua igreja:**

- `GET /api/receipts/admin/pending` → Filtra por `church_id`
- `GET /api/receipts/admin/all` → Filtra por `church_id`
- `GET /api/receipts/stats` → Estatísticas apenas da igreja do pastor

**Admins e Superadmins veem tudo:**

- Todas as rotas retornam dados globais (todas as igrejas)

**Usuários comuns veem apenas seus próprios recibos:**

- `GET /api/receipts/my-receipts` → Filtra por `user_id`

---

## Configuração Inicial

### Passo 1: Executar Migração Multi-Pastor

```bash
npx tsx update-for-multi-pastor.mjs
```

**O que esse script faz:**

- ✅ Adiciona colunas `user_id` e `church_id` na tabela `automation_config`
- ✅ Cria índices para performance
- ✅ Marca configurações globais antigas como `EXEMPLO_*`
- ✅ Prepara sistema para múltiplos pastores

### Passo 2: Configurar Credenciais do Pastor

```bash
npx tsx configure-pastor-credentials.mjs
```

**O script vai:**

1. Listar todos os pastores cadastrados
2. Permitir selecionar um pastor
3. Pedir credenciais do Dracma (usuário e senha)
4. Pedir API key do OCR.space (opcional)
5. Gerar API key única para n8n webhook
6. Salvar tudo no banco associado ao pastor

**Exemplo de uso:**

```
📋 Pastores disponíveis:

   1. João Silva (ID: 5)
      Email: joao@igreja.com
      Igreja ID: 2

   2. Maria Santos (ID: 12)
      Email: maria@igreja.com
      Igreja ID: 7

Digite o número do pastor (ou 0 para sair): 1

✅ Selecionado: João Silva

📝 Configure as credenciais do Dracma:

   Acesse: https://dracma.sdasystems.org/

Usuário do Dracma: joao.silva
Senha do Dracma: ********

📝 Configure a API Key do OCR.space (opcional):

API Key do OCR.space (ou ENTER para pular): abc123...

✅ Configurações salvas com sucesso!

📋 Resumo da configuração:

   Pastor: João Silva
   Igreja ID: 2
   Usuário Dracma: joao.silva
   Senha Dracma: ✅ configurada
   OCR API Key: ✅ configurada
   n8n API Key: 5cb083d734f7e334ad9f...
```

---

## Como o Sistema Processa Recibos

### Fluxo Completo

```
1. Membro envia foto via WhatsApp
   ↓
2. n8n faz OCR e extrai dados
   ↓
3. n8n chama POST /api/receipts/ingest
   ↓
4. Backend salva recibo com user_id do membro
   ↓
5. Background Job (a cada 5 min) busca recibos pendentes
   ↓
6. Para cada recibo:
   - Identifica church_id do usuário
   - Busca credenciais do pastor da igreja
   - Usa Puppeteer para submeter no Dracma
   ↓
7. Recibo marcado como "submitted" ou "error"
```

### Exemplo de Busca de Credenciais

**Cenário:** Maria (ID: 50, membro comum) enviou um recibo.

```typescript
// 1. Buscar dados de Maria
SELECT id, role, church_id FROM users WHERE id = 50;
// Resultado: { id: 50, role: 'member', church_id: 2 }

// 2. Maria não é pastor, então buscar pastor da igreja 2
SELECT id FROM users
WHERE church_id = 2 AND role IN ('pastor', 'admin')
LIMIT 1;
// Resultado: { id: 5 } (João Silva)

// 3. Buscar credenciais do João
SELECT key, value FROM automation_config
WHERE key IN ('dracma_username', 'dracma_password')
AND user_id = 5
AND value != 'CHANGE_ME';
// Resultado: [
//   { key: 'dracma_username', value: 'joao.silva' },
//   { key: 'dracma_password', value: 'senha123' }
// ]

// ✅ Usar credenciais do João para submeter recibo da Maria
```

---

## Segurança

### Isolamento de Dados

- **Pastores** só veem recibos de membros da sua igreja
- **Membros** só veem seus próprios recibos
- **Admins/Superadmins** veem tudo

### Credenciais Protegidas

- Senhas marcadas como `encrypted: true` (para implementação futura de criptografia real)
- API keys nunca expostas em logs
- Valores mascarados no script de configuração (`••••••••`)

### Validação de API Keys

O endpoint `/api/receipts/ingest` aceita qualquer API key de pastor configurada:

```typescript
SELECT key, value, user_id
FROM automation_config
WHERE key = 'n8n_api_key'
AND value = [API_KEY_RECEBIDA]
LIMIT 1;
```

Isso permite que cada pastor tenha seu próprio webhook n8n.

---

## Monitoramento

### Verificar Configurações de um Pastor

```sql
SELECT
  u.name as pastor,
  u.church_id,
  ac.key,
  CASE
    WHEN ac.key LIKE '%password%' THEN '••••••••'
    WHEN ac.key LIKE '%api_key%' THEN '••••••••'
    ELSE ac.value
  END as value,
  ac.updated_at
FROM automation_config ac
JOIN users u ON ac.user_id = u.id
WHERE u.role = 'pastor'
ORDER BY u.name, ac.key;
```

### Ver Recibos por Igreja

```sql
SELECT
  c.name as igreja,
  COUNT(er.id) as total_recibos,
  SUM(CASE WHEN er.status = 'pending' THEN 1 ELSE 0 END) as pendentes,
  SUM(CASE WHEN er.status = 'submitted' THEN 1 ELSE 0 END) as submetidos
FROM churches c
LEFT JOIN users u ON u.church_id = c.id
LEFT JOIN expense_receipts er ON er.user_id = u.id
GROUP BY c.id, c.name
ORDER BY total_recibos DESC;
```

---

## Troubleshooting

### Problema: "Credenciais do Dracma não configuradas"

**Causa:** Pastor não configurou suas credenciais ainda.

**Solução:**

```bash
npx tsx configure-pastor-credentials.mjs
```

### Problema: Pastor vê recibos de outras igrejas

**Causa:** `church_id` não está configurado corretamente.

**Solução:**

```sql
-- Verificar church_id do pastor
SELECT id, name, role, church_id FROM users WHERE role = 'pastor';

-- Atualizar se necessário
UPDATE users SET church_id = 2 WHERE id = 5;
```

### Problema: Recibo fica pendente para sempre

**Causas possíveis:**

1. Credenciais inválidas
2. Seletores CSS do Dracma desatualizados
3. Dracma fora do ar

**Diagnóstico:**

```bash
# Executar job manualmente com logs
npx tsx server/jobs/dracmaSubmissionJob.ts run

# Verificar erros no banco
SELECT id, dracma_error, dracma_retry_count
FROM expense_receipts
WHERE status = 'error'
ORDER BY updated_at DESC;
```

---

## Migração de Sistema Antigo

Se você tinha configurações globais antigas, elas foram automaticamente marcadas como `EXEMPLO_*` pelo script de migração.

**Antes:**

```sql
| id | key              | value        | user_id | church_id |
|----|------------------|--------------|---------|-----------|
| 1  | n8n_api_key      | abc123       | NULL    | NULL      |
| 2  | dracma_username  | admin        | NULL    | NULL      |
| 3  | dracma_password  | pass123      | NULL    | NULL      |
```

**Depois da migração:**

```sql
| id | key              | value           | user_id | church_id |
|----|------------------|-----------------|---------|-----------|
| 1  | n8n_api_key      | EXEMPLO_abc123  | NULL    | NULL      |
| 2  | dracma_username  | EXEMPLO_admin   | NULL    | NULL      |
| 3  | dracma_password  | EXEMPLO_pass123 | NULL    | NULL      |
```

**Novas configurações por pastor:**

```sql
| id | key              | value           | user_id | church_id |
|----|------------------|-----------------|---------|-----------|
| 5  | n8n_api_key      | xyz789...       | 5       | 2         |
| 6  | dracma_username  | joao.silva      | 5       | 2         |
| 7  | dracma_password  | senha123        | 5       | 2         |
| 8  | ocr_space_api_key| ocrkey123       | 5       | 2         |
```

---

## Próximos Passos

1. ✅ **Migração executada** (`update-for-multi-pastor.mjs`)
2. ⏳ **Configurar cada pastor** (`configure-pastor-credentials.mjs`)
3. ⏳ **Testar fluxo completo:**
   - Enviar foto via WhatsApp de um membro
   - Verificar se recibo é processado com credenciais corretas
   - Confirmar isolamento (pastor não vê recibos de outras igrejas)
4. ⏳ **Deploy em produção:**
   - Executar migração no banco de produção
   - Configurar credenciais de cada pastor
   - Atualizar webhooks n8n com API keys individuais

---

## Checklist de Configuração por Igreja

- [ ] Igreja tem `church_id` único no banco
- [ ] Pastor associado à igreja (`church_id` configurado)
- [ ] Credenciais do pastor configuradas (`npx tsx configure-pastor-credentials.mjs`)
- [ ] Membros da igreja têm `church_id` configurado
- [ ] Webhook n8n configurado com API key do pastor
- [ ] Evolution API conectado ao WhatsApp do pastor
- [ ] Teste enviando foto de nota fiscal
- [ ] Verificar no Dracma se foi lançado

---

**Status**: ✅ Sistema multi-pastor implementado e pronto para uso!

**Documentação relacionada:**

- [QUICK-START.md](QUICK-START.md) - Guia rápido de comandos
- [docs/receipt-automation-README.md](docs/receipt-automation-README.md) - Documentação completa
- [docs/dracma-selectors.md](docs/dracma-selectors.md) - Seletores CSS do Dracma
