# 🚀 Quick Start - Automação de Notas Fiscais

## Status Atual

✅ **Backend implementado e funcionando!**

- Tabelas criadas no banco de dados
- API endpoints funcionando
- Background job configurado
- 1 recibo de teste já criado

---

## Comandos Úteis

### 1. Iniciar o Servidor

```bash
npm run dev
```

Servidor rodando em: http://localhost:3065

### 2. Testar Endpoints

```bash
# Ver estatísticas
curl http://localhost:3065/api/receipts/stats

# Ver recibos (precisa estar autenticado)
# Use o token JWT do login

# Health check
curl http://localhost:3065/api/health
```

### 3. Scripts de Gerenciamento

```bash
# Verificar setup
npx tsx verify-setup.mjs

# Ver configurações
npx tsx configure-keys.mjs

# Criar recibo de teste
npx tsx test-api.mjs

# Executar job manualmente
npx tsx server/jobs/dracmaSubmissionJob.ts run

# Ver estatísticas do job
npx tsx server/jobs/dracmaSubmissionJob.ts stats
```

---

## 📊 Endpoints da API

| Endpoint                      | Método | Descrição                  | Auth    |
| ----------------------------- | ------ | -------------------------- | ------- |
| `/api/receipts/ingest`        | POST   | Webhook n8n (criar recibo) | API Key |
| `/api/receipts/my-receipts`   | GET    | Ver meus recibos           | JWT     |
| `/api/receipts/admin/pending` | GET    | Recibos pendentes (admin)  | JWT     |
| `/api/receipts/stats`         | GET    | Estatísticas               | JWT     |
| `/api/health`                 | GET    | Health check               | None    |

---

## 🧪 Testar com cURL

### Criar recibo via webhook (simula n8n)

```bash
# Obter API key
API_KEY=$(npx tsx -e "
import 'dotenv/config';
import { sql } from './server/neonConfig.ts';
const r = await sql\\\`SELECT value FROM automation_config WHERE key = 'n8n_api_key'\\\`;
console.log(r[0].value);
")

# Criar recibo
curl -X POST http://localhost:3065/api/receipts/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "whatsappNumber": "5511999999999",
    "imageUrl": "https://picsum.photos/400/600",
    "ocrProvider": "ocrspace",
    "ocrRawData": {},
    "merchantName": "Farmácia São Paulo",
    "receiptDate": "01/02/2026",
    "totalAmount": "45.90",
    "category": "health"
  }'
```

---

## 🔧 Próximos Passos (Opcional)

### Para ter automação COMPLETA (WhatsApp → Dracma):

1. **Configurar Credenciais do Dracma**

   ```sql
   UPDATE automation_config SET value = 'SEU_USUARIO' WHERE key = 'dracma_username';
   UPDATE automation_config SET value = 'SUA_SENHA' WHERE key = 'dracma_password';
   ```

2. **Registrar no OCR.space (Grátis)**
   - https://ocr.space/ocrapi
   - 500 requisições/dia sem cartão

   ```sql
   UPDATE automation_config SET value = 'SUA_KEY' WHERE key = 'ocr_space_api_key';
   ```

3. **Atualizar Seletores do Dracma**
   - Ver `docs/dracma-selectors.md`
   - Inspecionar Dracma e atualizar `server/services/dracmaSubmitter.ts`

4. **Instalar Evolution API + n8n** (externo)
   - Ver `docs/receipt-automation-README.md`
   - DigitalOcean droplet ($6/mês)

---

## 📖 Documentação Completa

- **README Principal**: [docs/receipt-automation-README.md](docs/receipt-automation-README.md)
- **Seletores Dracma**: [docs/dracma-selectors.md](docs/dracma-selectors.md)
- **Plano Original**: `/Users/filipevpeixoto/.claude/plans/happy-crafting-bubble.md`

---

## 🐛 Troubleshooting

### Servidor não inicia

```bash
# Verificar se porta 3065 está livre
lsof -i :3065

# Matar processo se necessário
kill -9 $(lsof -t -i:3065)
```

### Migration não roda

```bash
# Executar script direto
npx tsx run-migration.mjs
```

### Ver logs do banco

```bash
npx tsx verify-setup.mjs
```

---

## ✅ Checklist de Deploy

Antes de fazer deploy para produção:

- [ ] Migration executada no banco de produção
- [ ] Variáveis de ambiente configuradas no Netlify
- [ ] API keys configuradas no banco de produção
- [ ] Seletores do Dracma atualizados e testados
- [ ] Evolution API rodando e conectada
- [ ] n8n workflow configurado e ativo
- [ ] Teste end-to-end completo

---

**Status**: ✅ Backend pronto | ⚠️ Configuração externa opcional
