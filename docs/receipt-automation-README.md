# 📱 Automação de Notas Fiscais via WhatsApp → Dracma

Sistema completo de processamento automatizado de notas fiscais através de fotos enviadas pelo WhatsApp, com submissão automática para o sistema Dracma (SDA Systems).

---

## 🎯 Como Funciona

```
📸 Usuário tira foto da nota fiscal
          ↓
📱 Envia para WhatsApp conectado
          ↓
🤖 Evolution API recebe webhook
          ↓
🔄 n8n processa imagem com OCR
          ↓
💾 7Care salva no banco de dados
          ↓
⏰ Job executa a cada 5 minutos
          ↓
🚀 Puppeteer preenche formulário no Dracma
          ↓
✅ Confirmação armazenada
```

---

## 📋 Status da Implementação

### ✅ Código Backend (Completo)

- [x] Tabelas no banco de dados (`expense_receipts`, `automation_config`)
- [x] Migration criada (`003_create_expense_receipts_and_automation_config.ts`)
- [x] Rotas da API (`/api/receipts/*`)
- [x] Serviço Puppeteer (`DracmaSubmitter`)
- [x] Background job (executa a cada 5 minutos)
- [x] Cron job registrado no `server/index.ts`

### ⚠️ Configuração Externa (Pendente)

- [ ] **Evolution API** (WhatsApp) - precisa ser instalado
- [ ] **n8n** (Orquestração) - precisa ser configurado
- [ ] **Seletores do Dracma** - precisam ser atualizados
- [ ] **API Keys** - precisam ser configuradas

---

## 🚀 Guia de Deploy

### Passo 1: Executar Migration

```bash
# No diretório do projeto
npx tsx server/utils/migrationRunner.ts up
```

Isso criará as tabelas `expense_receipts` e `automation_config` no banco de dados.

### Passo 2: Configurar Credenciais no Banco

Execute no banco de dados (Neon Database):

```sql
-- Atualizar API keys e credenciais
UPDATE automation_config SET value = 'SUA_CHAVE_AQUI' WHERE key = 'n8n_api_key';
UPDATE automation_config SET value = 'SEU_USUARIO_DRACMA' WHERE key = 'dracma_username';
UPDATE automation_config SET value = 'SUA_SENHA_DRACMA' WHERE key = 'dracma_password';
UPDATE automation_config SET value = 'SUA_CHAVE_OCR_SPACE' WHERE key = 'ocr_space_api_key';
```

**Como obter as chaves:**

- **n8n_api_key**: Gere uma chave aleatória segura (ex: `openssl rand -hex 32`)
- **dracma_username/password**: Suas credenciais de acesso ao Dracma
- **ocr_space_api_key**: Registre-se em https://ocr.space/ocrapi (500 req/dia gratuito)

### Passo 3: Instalar Evolution API (WhatsApp)

**Opção A: DigitalOcean Droplet ($6/mês)**

1. Criar droplet Ubuntu 22.04 (2GB RAM)
2. Conectar via SSH
3. Instalar Docker e Docker Compose
4. Criar arquivo `docker-compose.yml`:

```yaml
version: '3.8'
services:
  evolution-api:
    image: atendai/evolution-api:latest
    ports:
      - '8080:8080'
    environment:
      - SERVER_URL=http://SEU_IP_PUBLICO:8080
      - AUTHENTICATION_API_KEY=SUA_CHAVE_SEGURA
      - WEBHOOK_GLOBAL_URL=http://SEU_IP_N8N:5678/webhook/whatsapp-receipt
    restart: unless-stopped
```

5. Executar: `docker-compose up -d`
6. Acessar `http://SEU_IP:8080` e escanear QR code do WhatsApp

**Documentação completa**: _Ver `/docs/evolution-api-setup.md` (a criar)_

### Passo 4: Instalar n8n (Orquestração)

No mesmo servidor do Evolution API:

```yaml
# Adicionar ao docker-compose.yml
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=SENHA_SEGURA
      - WEBHOOK_URL=http://SEU_IP:5678
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
```

Executar: `docker-compose up -d n8n`

**Documentação completa**: _Ver `/docs/n8n-workflow-guide.md` (a criar)_

### Passo 5: Atualizar Seletores do Dracma

**⚠️ CRÍTICO**: Os seletores CSS do Puppeteer são PLACEHOLDERS e PRECISAM ser atualizados.

1. Acesse o Dracma: https://dracma.sdasystems.org/
2. Inspecione os campos do formulário (F12)
3. Anote os seletores reais (`id`, `name`, `class`)
4. Edite `/server/services/dracmaSubmitter.ts` com os seletores corretos

**Guia detalhado**: `/docs/dracma-selectors.md`

### Passo 6: Testar Manualmente

```bash
# Executar job manualmente para testar
npx tsx server/jobs/dracmaSubmissionJob.ts run

# Ver estatísticas
npx tsx server/jobs/dracmaSubmissionJob.ts stats

# Retry de recibos com erro
npx tsx server/jobs/dracmaSubmissionJob.ts retry
```

### Passo 7: Deploy do 7Care

```bash
# Build e deploy para Netlify
npm run build
npm run deploy

# Ou push para main (se tiver CI/CD configurado)
git add .
git commit -m "feat: adicionar automação de notas fiscais"
git push origin main
```

---

## 🧪 Como Testar

### 1. Testar Webhook do n8n

```bash
curl -X POST http://SEU_IP_N8N:5678/webhook-test/whatsapp-receipt \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "messageType": "imageMessage",
      "key": {"remoteJid": "5511999999999@s.whatsapp.net"},
      "message": {
        "imageMessage": {
          "url": "https://example.com/sample-receipt.jpg"
        }
      }
    }
  }'
```

### 2. Testar Ingestão no 7Care

```bash
curl -X POST https://meu7care.netlify.app/api/receipts/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "whatsappNumber": "5511999999999",
    "imageUrl": "https://example.com/receipt.jpg",
    "ocrProvider": "ocrspace",
    "ocrRawData": {},
    "merchantName": "Posto Shell",
    "receiptDate": "31/01/2026",
    "totalAmount": "150.00",
    "category": "transport"
  }'
```

### 3. Testar Job de Submissão

```bash
# Criar recibo de teste no banco
psql $DATABASE_URL <<EOF
INSERT INTO expense_receipts (user_id, image_url, merchant_name, receipt_date, total_amount, status)
VALUES (1, 'https://picsum.photos/400/600', 'Teste', '2026-01-31', '50.00', 'pending');
EOF

# Executar job manualmente
npx tsx server/jobs/dracmaSubmissionJob.ts run

# Verificar resultado
npx tsx server/jobs/dracmaSubmissionJob.ts stats
```

---

## 📊 Monitoramento

### Endpoints da API

| Endpoint                      | Método | Descrição                       |
| ----------------------------- | ------ | ------------------------------- |
| `/api/receipts/ingest`        | POST   | Webhook do n8n (requer API key) |
| `/api/receipts/my-receipts`   | GET    | Recibos do usuário logado       |
| `/api/receipts/admin/pending` | GET    | Recibos pendentes (admin)       |
| `/api/receipts/admin/all`     | GET    | Todos os recibos (admin)        |
| `/api/receipts/stats`         | GET    | Estatísticas                    |

### Verificar Status

```bash
# Stats do job
npx tsx server/jobs/dracmaSubmissionJob.ts stats

# Logs do job (se usando PM2 ou similar)
tail -f /var/log/7care-job.log

# Query direto no banco
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM expense_receipts GROUP BY status;"
```

### Alertas

Se > 10 recibos com erro:

```sql
SELECT COUNT(*) FROM expense_receipts WHERE status = 'error';
```

Se job não rodou nas últimas 10 min:

```sql
SELECT MAX(created_at) FROM expense_receipts WHERE status = 'submitted';
```

---

## 🐛 Troubleshooting

### Problema: WhatsApp desconectou

**Solução:**

1. Acesse Evolution API: `http://SEU_IP:8080`
2. Re-escaneie o QR code
3. Verifique status: `connected`

### Problema: OCR retornando dados errados

**Solução:**

1. Verificar qualidade da foto (mínimo 800x600px)
2. Verificar se API key do OCR.space está válida
3. Testar com outro provedor (Mindee, Tesseract)

### Problema: Puppeteer não consegue fazer login no Dracma

**Solução:**

1. Atualizar seletores CSS (ver `/docs/dracma-selectors.md`)
2. Rodar com `headless: false` para ver o navegador
3. Verificar screenshots em `/tmp/dracma_error_*.png`
4. Validar credenciais no banco de dados

### Problema: Job não está executando

**Solução:**

1. Verificar se o servidor está rodando: `curl http://localhost:3065/api/health`
2. Verificar logs do servidor: `tail -f /var/log/7care.log`
3. Executar manualmente: `npx tsx server/jobs/dracmaSubmissionJob.ts run`

---

## 💰 Custos Estimados

| Item                           | Custo      | Observação         |
| ------------------------------ | ---------- | ------------------ |
| DigitalOcean (Evolution + n8n) | $6/mês     | 2GB RAM droplet    |
| OCR.space API                  | **$0**     | 500 req/dia grátis |
| Netlify (7Care)                | **$0**     | Já existente       |
| Neon Database                  | **$0**     | Já existente       |
| **TOTAL**                      | **$6/mês** | ~R$ 33/mês         |

**ROI:** Se processar 50 notas/mês e economizar 5 min/nota = **4h/mês economizadas**

---

## 📚 Documentação Complementar

- [ ] **Evolution API Setup** → `/docs/evolution-api-setup.md` _(a criar)_
- [ ] **n8n Workflow Guide** → `/docs/n8n-workflow-guide.md` _(a criar)_
- [x] **Dracma Selectors** → `/docs/dracma-selectors.md` ✅

---

## 🔐 Segurança

- ✅ API keys armazenadas no banco de dados (não no código)
- ✅ Webhook protegido por API key
- ✅ Credenciais do Dracma NÃO expostas em logs
- ✅ Screenshots de erro salvos em `/tmp` (não acessíveis publicamente)
- ⚠️ **TODO**: Implementar criptografia para `dracma_password` no banco

---

## 🛠️ Manutenção

### Atualizar n8n

```bash
docker-compose pull n8n
docker-compose up -d n8n
```

### Atualizar Evolution API

```bash
docker-compose pull evolution-api
docker-compose up -d evolution-api
```

### Backup do Banco

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## 📞 Suporte

- **Issues do GitHub**: https://github.com/seu-usuario/7care/issues
- **Email**: suporte@exemplo.com
- **Telegram**: @seu_usuario

---

**Criado em**: Janeiro 2026
**Versão**: 1.0.0
**Status**: ✅ Backend implementado | ⚠️ Aguardando configuração externa
