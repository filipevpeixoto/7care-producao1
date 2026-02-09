# 🚀 Guia de Deploy no Netlify (Nova Conta)

## ✅ Status Atual

- **Conta conectada:** viatrip.viagens@gmail.com
- **Novo domínio:** 7care.netlify.app
- **URLs atualizadas:** ✅ Todas as referências já foram atualizadas no código

---

## 📋 Passo a Passo para Deploy

### 1️⃣ Criar o Site no Netlify (CLI)

```bash
# Criar o site com o nome "7care"
netlify sites:create --name 7care
```

**Selecione:** `viatrip-viagens's team` (use setas ↑↓ e Enter)

O comando irá criar o site e retornar:
- Site ID
- URL: https://7care.netlify.app

### 2️⃣ Build do Projeto

```bash
# Instalar dependências e fazer build
npm install --legacy-peer-deps
npm run build
```

Aguarde o build completar (~2-3 minutos).

### 3️⃣ Deploy para Produção

```bash
# Deploy direto para produção
netlify deploy --prod --dir=dist
```

Ou use o script npm:

```bash
# Deploy com mensagem do último commit
npm run deploy
```

---

## 🔐 Configurar Variáveis de Ambiente

**IMPORTANTE:** Configure as variáveis de ambiente no painel do Netlify:

### No Painel Web (https://app.netlify.com)

1. Acesse: **Site settings** → **Environment variables**
2. Adicione as seguintes variáveis:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=sua-chave-secreta-aqui

# Redis (opcional)
REDIS_URL=redis://...

# Google Calendar (opcional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://7care.netlify.app/api/auth/google/callback

# AWS S3 (upload de arquivos)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=...

# Email (se usar)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# App URL
APP_URL=https://7care.netlify.app
NODE_ENV=production
```

### Ou via CLI:

```bash
# Definir variável individual
netlify env:set DATABASE_URL "postgresql://..."
netlify env:set JWT_SECRET "sua-chave-secreta"
netlify env:set APP_URL "https://7care.netlify.app"
```

---

## 🔍 Verificar Deploy

Após o deploy, teste:

```bash
# Abrir o site no navegador
npm run open:prod
# ou
open https://7care.netlify.app
```

**Endpoints para testar:**
- 🌐 Frontend: https://7care.netlify.app
- 🔌 API Health: https://7care.netlify.app/api/health
- 📊 API Docs: https://7care.netlify.app/api-docs (se Swagger configurado)

---

## 🎯 Domínio Customizado (Opcional)

Se você tiver um domínio próprio (ex: `7care.com.br`):

### No Painel Netlify:

1. **Site settings** → **Domain management**
2. **Add custom domain**
3. Digite seu domínio: `7care.com.br`
4. Configure os DNS records no seu provedor:

```
Type    Name    Value
CNAME   www     7care.netlify.app
A       @       75.2.60.5
```

---

## 🔄 Deploys Automáticos (GitHub)

Para habilitar deploy automático ao fazer `git push`:

### No Painel Netlify:

1. **Site settings** → **Build & deploy** → **Continuous deployment**
2. **Link repository** → Conectar GitHub
3. Selecionar repositório: `filipevpeixoto/7care-producao1`
4. Configurar build:
   - **Branch:** `main`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

**Após configurar:** Cada `git push` irá fazer deploy automático! 🚀

---

## 📝 Scripts NPM Disponíveis

```bash
# Deploy para produção (manual)
npm run deploy

# Deploy preview (para testar antes de produção)
npm run deploy:preview

# Ver status do último deploy
npm run deploy:status

# Abrir site em produção
npm run open:prod

# Build local
npm run build

# Desenvolvimento local
npm run dev
```

---

## ⚠️ Troubleshooting

### ❌ Erro "Failed to connect to database"

**Solução:** Verifique se `DATABASE_URL` está configurado nas variáveis de ambiente.

### ❌ Erro "JWT secret not found"

**Solução:** Configure `JWT_SECRET` nas variáveis de ambiente.

### ❌ Site mostra página em branco

**Solução:**
1. Verifique o console do navegador (F12)
2. Certifique-se que `dist/` foi criado corretamente no build
3. Execute: `npm run build && netlify deploy --prod`

### ❌ API retorna 404

**Solução:**
1. Verifique se as Netlify Functions foram deployadas
2. Confira a pasta `netlify/functions/`
3. Teste diretamente: `https://7care.netlify.app/.netlify/functions/api`

### ❌ CORS error

**Solução:** O CORS já está configurado para `https://7care.netlify.app`. Se usar domínio customizado, adicione nas variáveis:

```bash
netlify env:set ALLOWED_ORIGINS "https://7care.netlify.app,https://seudominio.com.br"
```

---

## 📊 Monitoramento

### Ver Logs em Tempo Real:

```bash
# Logs da aplicação
netlify logs --prod

# Logs das functions
netlify functions:log api
```

### Painel Web:

- **Analytics:** Site overview → Analytics
- **Functions:** Functions → Usage & logs
- **Deploy logs:** Deploys → Ver log do deploy

---

## 🎉 Pronto!

Seu app 7Care está deployado em: **https://7care.netlify.app**

**Conta:** viatrip.viagens@gmail.com  
**Team:** viatrip-viagens's team

### Próximos Passos:

1. ✅ Configurar variáveis de ambiente
2. ✅ Testar login e funcionalidades
3. ✅ Configurar domínio customizado (opcional)
4. ✅ Habilitar deploys automáticos do GitHub
5. ✅ Configurar notifica ções de deploy (opcional)

---

## 📞 Suporte

- **Netlify Docs:** https://docs.netlify.com
- **Netlify Support:** https://www.netlify.com/support/
- **Status Netlify:** https://www.netlifystatus.com/

---

**Última atualização:** 9 de fevereiro de 2026
