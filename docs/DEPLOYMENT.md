# Guia de Deployment para Produção

Este guia detalha os passos necessários para fazer deploy do 7Care em ambiente de produção.

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do Ambiente](#configuração-do-ambiente)
3. [Deploy no Netlify](#deploy-no-netlify)
4. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Monitoramento](#monitoramento)
7. [Rollback e Recovery](#rollback-e-recovery)
8. [Checklist de Segurança](#checklist-de-segurança)

---

## Pré-requisitos

### Infraestrutura
- Conta no [Netlify](https://netlify.com) para hosting
- Conta no [Neon](https://neon.tech) para banco de dados PostgreSQL
- Conta no [Sentry](https://sentry.io) para monitoramento de erros
- Domínio personalizado (opcional)

### Ferramentas Locais
- Node.js 20.x ou superior
- npm 10.x ou superior
- Git configurado
- Netlify CLI (`npm install -g netlify-cli`)

---

## Configuração do Ambiente

### 1. Preparação do Código

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/7care-producao1.git
cd 7care-producao1

# Instale as dependências
npm install

# Execute os testes
npm test

# Build de produção
npm run build
```

### 2. Verificação de Qualidade

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Testes E2E
npm run test:e2e
```

---

## Deploy no Netlify

### 1. Configuração Inicial

```bash
# Login no Netlify
netlify login

# Inicializar projeto
netlify init

# Linkar a um site existente ou criar novo
netlify link
```

### 2. Configuração do Build

O arquivo `netlify.toml` já está configurado:

```toml
[build]
  command = "npm run build"
  publish = "dist/client"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. Deploy

```bash
# Deploy de preview
netlify deploy

# Deploy de produção
netlify deploy --prod
```

### 4. Deploy Contínuo

Configure no painel do Netlify:
1. Vá em **Site settings** > **Build & deploy**
2. Conecte seu repositório GitHub
3. Configure:
   - Branch to deploy: `main`
   - Build command: `npm run build`
   - Publish directory: `dist/client`

---

## Configuração do Banco de Dados

### 1. Criar Banco no Neon

1. Acesse [console.neon.tech](https://console.neon.tech)
2. Crie um novo projeto
3. Copie a string de conexão

### 2. Executar Migrações

```bash
# Configure a variável de ambiente
export DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb"

# Execute as migrações
npm run db:migrate

# (Opcional) Seed dados iniciais
npm run db:seed

# Criar superadmin
npm run create-superadmin
```

### 3. Backup e Restore

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_file.sql
```

---

## Variáveis de Ambiente

### Variáveis Obrigatórias

```env
# Banco de Dados
DATABASE_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...

# Autenticação
JWT_SECRET=chave-secreta-muito-longa-e-segura
SESSION_SECRET=outra-chave-secreta

# Sentry (Monitoramento)
SENTRY_DSN=https://xxx@sentry.io/xxx

# Ambiente
NODE_ENV=production
```

### Variáveis Opcionais

```env
# Redis (para cache e rate limiting)
REDIS_URL=redis://...

# Email (Nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=senha-smtp

# Two-Factor Auth
TOTP_SECRET_KEY=chave-totp

# Feature Flags
FEATURE_FLAGS_ENABLED=true

# APM
APM_ENABLED=true
APM_SAMPLE_RATE=0.1
```

### Configurar no Netlify

1. Vá em **Site settings** > **Build & deploy** > **Environment**
2. Adicione cada variável
3. Marque como "Sensitive" as variáveis secretas

---

## Monitoramento

### Sentry

O projeto já está configurado com Sentry para:
- Captura automática de erros
- Performance monitoring
- Breadcrumbs para debugging

```typescript
// Configuração em server/services/sentryService.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### APM Service

O serviço de APM customizado registra:
- Métricas de performance
- Contadores de requisições
- Histogramas de latência

```typescript
// Uso
import { apmService } from './services/apmService';

apmService.incrementCounter('api_requests', { endpoint: '/users' });
apmService.recordTiming('db_query', 150, { table: 'users' });
```

### Health Checks

```bash
# Verificar saúde da aplicação
curl https://seu-site.netlify.app/api/health

# Resposta esperada
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

## Rollback e Recovery

### Rollback no Netlify

1. Vá em **Deploys**
2. Encontre o deploy anterior funcionando
3. Clique em **Publish deploy**

### Rollback via CLI

```bash
# Listar deploys
netlify deploy --list

# Publicar deploy específico
netlify deploy --prod --id=<deploy-id>
```

### Recovery de Banco

```bash
# Restaurar backup
psql $DATABASE_URL < backup_file.sql

# Ou usar point-in-time recovery do Neon
# (disponível no painel do Neon)
```

---

## Checklist de Segurança

### Antes do Deploy

- [ ] Todas as variáveis sensíveis estão no Netlify (não no código)
- [ ] JWT_SECRET tem pelo menos 32 caracteres
- [ ] Rate limiting está configurado
- [ ] CORS está restrito aos domínios corretos
- [ ] Headers de segurança estão ativos (CSP, HSTS, etc.)
- [ ] Dependências estão atualizadas (`npm audit`)
- [ ] Testes de segurança passaram

### Configurações de Segurança

```typescript
// Headers de segurança (já configurado em cspHeaders.ts)
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- Permissions-Policy
```

### Rate Limiting

```typescript
// Configurado em rateLimiters.ts
- Login: 5 tentativas por 15 minutos
- API geral: 100 requisições por minuto
- Upload: 10 por 5 minutos
- Operações sensíveis: 20 por hora
```

---

## Troubleshooting

### Erro: "Function timeout"

O limite de tempo para Netlify Functions é 10 segundos. Soluções:
1. Otimize queries do banco
2. Use background functions para tarefas longas
3. Implemente paginação

### Erro: "Build failed"

```bash
# Verifique o build localmente
npm run build

# Limpe cache do Netlify
netlify build --context production
```

### Erro: "Database connection"

1. Verifique se `DATABASE_URL` está correto
2. Confirme que o IP está na whitelist do Neon
3. Teste a conexão localmente

---

## Comandos Úteis

```bash
# Status do deploy
netlify status

# Logs de produção
netlify logs

# Abrir site
netlify open

# Executar função localmente
netlify functions:invoke api --no-identity
```

---

## Suporte

Para problemas ou dúvidas:
1. Consulte a documentação em `/docs`
2. Verifique issues no GitHub
3. Contate a equipe de desenvolvimento
