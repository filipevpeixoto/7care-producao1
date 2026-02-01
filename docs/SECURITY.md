# Guia de Segurança - 7care

## Visão Geral

Este documento descreve as práticas de segurança implementadas no sistema 7care e orientações para manter a aplicação segura.

## Índice

1. [Autenticação](#autenticação)
2. [Autorização](#autorização)
3. [Rate Limiting](#rate-limiting)
4. [Validação de Dados](#validação-de-dados)
5. [Headers de Segurança](#headers-de-segurança)
6. [Proteção contra Ataques](#proteção-contra-ataques)
7. [Variáveis de Ambiente](#variáveis-de-ambiente)
8. [Logging e Auditoria](#logging-e-auditoria)
9. [Checklist de Segurança](#checklist-de-segurança)

---

## Autenticação

### JWT (JSON Web Tokens)

O sistema utiliza JWT para autenticação stateless.

```javascript
// Módulo: netlify/functions/modules/auth.js

// Gerar token (login)
const token = generateToken({
  id: user.id,
  role: user.role,
  email: user.email,
});

// Verificar token (middleware)
const decoded = verifyToken(token);

// Middleware de autenticação
const user = await requireAuth(event);
if (!user) {
  return unauthorizedResponse();
}
```

**Configurações:**

- **Algoritmo:** HS256
- **Expiração:** 24 horas (configurável)
- **Armazenamento:** localStorage no cliente

### Senhas

Senhas são hasheadas com bcrypt:

```javascript
// Hash de senha (cadastro)
const hashedPassword = await hashPassword(plainPassword);

// Verificação (login)
const isValid = await comparePassword(plainPassword, hashedPassword);
```

**Configurações:**

- **Salt Rounds:** 12 (ajustável via BCRYPT_ROUNDS)
- **Mínimo:** 6 caracteres

### Boas Práticas

1. **Nunca** armazene senhas em texto plano
2. **Sempre** valide tokens no servidor
3. Implemente logout adequado (invalidação de token)
4. Use HTTPS em produção

---

## Autorização

### Níveis de Acesso (Roles)

| Role         | Permissões                  |
| ------------ | --------------------------- |
| `superadmin` | Acesso total ao sistema     |
| `pastor`     | Gerencia distrito e igrejas |
| `admin`      | Gerencia sua igreja         |
| `member`     | Acesso básico               |
| `missionary` | Funcionalidades de missão   |
| `interested` | Acesso limitado             |

### Verificação de Permissões

```javascript
const { isSuperAdmin, hasAdminAccess, requireRole } = require('./modules/auth');

// Verificar superadmin
if (!isSuperAdmin(user)) {
  return forbiddenResponse('Apenas superadmins');
}

// Verificar acesso admin
if (!hasAdminAccess(user)) {
  return forbiddenResponse('Acesso negado');
}

// Verificar role específica
if (!requireRole(user, ['pastor', 'superadmin'])) {
  return forbiddenResponse();
}
```

### Verificação de Propriedade

```javascript
// Verificar se usuário pertence ao distrito
if (user.role !== 'superadmin' && user.district_id !== resourceDistrictId) {
  return forbiddenResponse('Você não tem acesso a este recurso');
}
```

---

## Rate Limiting

### Configuração

```javascript
// netlify/functions/modules/rateLimit.js

const RATE_LIMIT_CONFIG = {
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // Login
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // Geral
  write: { maxRequests: 30, windowMs: 60 * 1000 }, // Escrita
  bulk: { maxRequests: 5, windowMs: 5 * 60 * 1000 }, // Operações em massa
};
```

### Uso

```javascript
const { checkRateLimit, rateLimitResponse } = require('./modules/rateLimit');

// No início do handler
const clientIp = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
const limited = checkRateLimit(clientIp, 'api');

if (limited) {
  return rateLimitResponse(limited.retryAfter);
}
```

### Endpoints Protegidos

| Endpoint        | Tipo  | Limite   |
| --------------- | ----- | -------- |
| `/api/auth/*`   | auth  | 10/15min |
| `/api/users/*`  | write | 30/min   |
| `/api/import/*` | bulk  | 5/5min   |
| Outros          | api   | 100/min  |

---

## Validação de Dados

### Sanitização

```javascript
const { sanitizeObject, sanitizeString } = require('./modules/validation');

// Sanitizar input do usuário
const safeData = sanitizeObject(req.body);

// Remove:
// - Tags HTML (<script>, etc)
// - Protocolos perigosos (javascript:)
// - Event handlers (onclick=, etc)
```

### Validação

```javascript
const { validateUserData, isValidEmail, isValidPhone } = require('./modules/validation');

// Validar dados completos
const validation = validateUserData(userData);
if (!validation.valid) {
  return validationErrorResponse(validation.errors);
}

// Validações individuais
if (!isValidEmail(email)) {
  return errorResponse('Email inválido');
}
```

### SQL Injection

**Sempre** use prepared statements:

```javascript
// ✅ CORRETO - Prepared statement
await sql('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ ERRADO - String concatenation
await sql(`SELECT * FROM users WHERE id = ${userId}`);
```

---

## Headers de Segurança

### Implementados (Netlify)

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

### Headers da API

```javascript
function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Ajustar para domínio específico em produção
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };
}
```

---

## Proteção contra Ataques

### XSS (Cross-Site Scripting)

1. Sanitização de inputs
2. Escape de outputs no React (automático)
3. CSP headers

### CSRF (Cross-Site Request Forgery)

1. Verificação de Origin
2. Tokens JWT no header Authorization
3. SameSite cookies

### Brute Force

1. Rate limiting no login
2. Bloqueio temporário após tentativas
3. Logging de tentativas falhas

### Path Traversal

```javascript
// Validar caminhos de arquivo
const safePath = path.normalize(userPath);
if (!safePath.startsWith(allowedDirectory)) {
  return forbiddenResponse('Acesso negado');
}
```

---

## Variáveis de Ambiente

### Obrigatórias

```env
# Banco de dados (NUNCA expor publicamente)
DATABASE_URL=postgresql://user:pass@host/db

# JWT Secret (gerar com: openssl rand -base64 32)
JWT_SECRET=sua_chave_secreta_muito_longa

# Ambiente
NODE_ENV=production
```

### Opcionais

```env
# bcrypt rounds (padrão: 12)
BCRYPT_ROUNDS=12

# JWT expiração (padrão: 24h)
JWT_EXPIRES_IN=24h

# Log level (debug, info, warn, error)
LOG_LEVEL=info
```

### Boas Práticas

1. **Nunca** comite .env no repositório
2. Use `.env.example` como template
3. Rotacione secrets regularmente
4. Use secrets manager em produção (ex: Netlify Environment Variables)

---

## Logging e Auditoria

### Eventos Logados

```javascript
const logger = require('./modules/logger');

// Login bem-sucedido
logger.auth('login_success', userId, { ip, userAgent });

// Login falho
logger.auth('login_failed', email, { ip, reason: 'wrong_password' });

// Ações administrativas
logger.businessEvent('user_deleted', {
  deletedBy: adminId,
  deletedUser: userId,
});

// Erros
logger.error('Database error', error, { endpoint, userId });
```

### Informações Sensíveis

O logger automaticamente redacta campos sensíveis:

```javascript
logger.info('User data', {
  email: 'test@test.com',
  password: 'secret123', // Será logado como '[REDACTED]'
});
```

### Campos Redactados

- password, senha
- token, secret
- api_key, apiKey
- authorization

---

## Checklist de Segurança

### Antes do Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] JWT_SECRET é único e seguro (mín. 32 caracteres)
- [ ] DATABASE_URL não está exposta
- [ ] NODE_ENV=production
- [ ] HTTPS habilitado
- [ ] Rate limiting ativo
- [ ] Headers de segurança configurados

### Code Review

- [ ] Inputs são validados
- [ ] Queries usam prepared statements
- [ ] Dados sensíveis não são logados
- [ ] Permissões são verificadas
- [ ] Erros não expõem informações sensíveis

### Monitoramento

- [ ] Logging de erros configurado
- [ ] Alertas para tentativas de brute force
- [ ] Monitoramento de rate limit
- [ ] Backup de banco de dados

### Periódico

- [ ] Atualizar dependências (npm audit)
- [ ] Rotacionar secrets
- [ ] Revisar logs de acesso
- [ ] Testar recuperação de backup

---

## Reportando Vulnerabilidades

Se você encontrar uma vulnerabilidade de segurança:

1. **NÃO** abra uma issue pública
2. Envie email para: filipe.peixoto@educadventista.org.br
3. Inclua detalhes da vulnerabilidade
4. Aguarde confirmação antes de divulgar

---

## Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

**Última atualização:** Janeiro/2026  
**Versão do documento:** 1.0
