# Arquitetura de Módulos - API Netlify Functions

## Visão Geral

A API do 7 Cuidados foi modularizada para melhorar manutenibilidade, testabilidade e organização do código. Este documento descreve a arquitetura dos módulos e como utilizá-los.

## Estrutura de Diretórios

```
netlify/functions/
├── api.js                  # Handler principal da API
├── modules/
│   ├── index.js           # Exporta todos os módulos
│   ├── auth.js            # Autenticação e autorização
│   ├── rateLimit.js       # Rate limiting
│   ├── validation.js      # Validação e sanitização
│   ├── responses.js       # Respostas padronizadas
│   ├── logger.js          # Logging estruturado
│   ├── database.js        # Operações de banco de dados
│   ├── points.js          # Cálculo de pontuação
│   ├── users.js           # CRUD de usuários
│   ├── churches.js        # CRUD de igrejas
│   ├── districts.js       # CRUD de distritos
│   ├── invites.js         # Gerenciamento de convites
│   └── excelProcessor.js  # Processamento de Excel
```

## Módulos

### 1. Auth (`auth.js`)

Gerencia autenticação JWT e autorização.

```javascript
const { generateToken, verifyToken, requireAuth } = require('./modules/auth');

// Gerar token
const token = generateToken({ id: user.id, role: user.role });

// Verificar token
const decoded = verifyToken(token);

// Middleware de autenticação
const user = await requireAuth(event);
if (!user) return unauthorizedResponse();

// Verificar permissões
if (!isSuperAdmin(user)) return forbiddenResponse();
```

**Funções exportadas:**

- `generateToken(payload, expiresIn)` - Gera JWT
- `verifyToken(token)` - Verifica e decodifica JWT
- `requireAuth(event)` - Middleware de autenticação
- `isSuperAdmin(user)` - Verifica se é super admin
- `hasAdminAccess(user)` - Verifica se tem acesso admin
- `hashPassword(password)` - Hash bcrypt de senha
- `comparePassword(plain, hashed)` - Compara senhas

### 2. Rate Limit (`rateLimit.js`)

Protege contra abuso com limites por IP/usuário.

```javascript
const { checkRateLimit, rateLimitMiddleware } = require('./modules/rateLimit');

// Verificação manual
const limited = await checkRateLimit(identifier, 'api');
if (limited) return rateLimitResponse(limited.retryAfter);

// Middleware
const rateLimitResult = rateLimitMiddleware(event, 'auth');
if (rateLimitResult) return rateLimitResult;
```

**Configuração:**

- `auth`: 10 requisições / 15 minutos
- `api`: 100 requisições / minuto
- `write`: 30 requisições / minuto
- `bulk`: 5 requisições / 5 minutos

### 3. Validation (`validation.js`)

Validação e sanitização de dados.

```javascript
const {
  sanitizeObject,
  validateUserData,
  parseDate,
  isValidEmail,
} = require('./modules/validation');

// Sanitizar input
const safe = sanitizeObject(req.body);

// Validar dados
const validation = validateUserData(userData);
if (!validation.valid) {
  return validationErrorResponse(validation.errors);
}

// Parse de data
const date = parseDate('25/12/2023');
```

**Funções exportadas:**

- `sanitizeString(str)` - Sanitiza string
- `sanitizeObject(obj)` - Sanitiza objeto recursivamente
- `isValidEmail(email)` - Valida email
- `isValidPhone(phone)` - Valida telefone BR
- `validatePassword(password)` - Valida senha
- `validateUserData(data, isUpdate)` - Valida dados de usuário
- `validateChurchData(data)` - Valida dados de igreja
- `validateDistrictData(data)` - Valida dados de distrito
- `parseDate(value)` - Parse de múltiplos formatos de data
- `parseBool(value)` - Parse de boolean
- `parseNumber(value)` - Parse de número

### 4. Responses (`responses.js`)

Respostas HTTP padronizadas.

```javascript
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} = require('./modules/responses');

// Sucesso
return successResponse(data, 'Operação realizada', 201);

// Erro
return errorResponse('Algo deu errado', 400, 'VALIDATION_ERROR');

// Não encontrado
return notFoundResponse('Usuário');

// Erro de validação
return validationErrorResponse(['Nome é obrigatório', 'Email inválido']);
```

**Funções exportadas:**

- `successResponse(data, message, statusCode)`
- `errorResponse(message, statusCode, code, details)`
- `paginatedResponse(items, total, page, limit)`
- `validationErrorResponse(errors)`
- `notFoundResponse(resource)`
- `unauthorizedResponse(message)`
- `forbiddenResponse(message)`
- `serverErrorResponse(error, includeStack)`
- `rateLimitResponse(retryAfter)`
- `toCamelCase(obj)` - Converte snake_case para camelCase
- `toSnakeCase(obj)` - Converte camelCase para snake_case

### 5. Logger (`logger.js`)

Logging estruturado em JSON.

```javascript
const logger = require('./modules/logger');

// Logs básicos
logger.debug('Mensagem de debug', { context: 'adicional' });
logger.info('Operação realizada', { userId: 123 });
logger.warn('Algo suspeito', { ip: '1.2.3.4' });
logger.error('Erro crítico', error, { context: 'adicional' });

// Log de HTTP
logger.httpRequest(event, response, durationMs);

// Log de autenticação
logger.auth('login', userId, { ip: userIp });

// Timer de performance
const endTimer = logger.startTimer('processExcel');
// ... operação ...
const duration = endTimer({ rows: 1000 });
```

### 6. Database (`database.js`)

Operações com PostgreSQL/Neon.

```javascript
const db = require('./modules/database');

// SELECT
const users = await db.select('SELECT * FROM users WHERE church_id = $1', [churchId]);
const user = await db.selectOne('SELECT * FROM users WHERE id = $1', [id]);

// INSERT
const newUser = await db.insert('users', { name: 'João', email: 'joao@test.com' });

// UPDATE
const updated = await db.update('users', { name: 'João Silva' }, { id: userId });

// DELETE
await db.remove('users', { id: userId });

// Helpers
const user = await db.findById('users', 123);
const exists = await db.exists('users', { email: 'test@test.com' });
const total = await db.count('users', { church_id: 5 });

// Transação
await db.transaction(async client => {
  await client.query('UPDATE users SET points = points + 10 WHERE id = $1', [userId]);
  await client.query('INSERT INTO logs (user_id, action) VALUES ($1, $2)', [
    userId,
    'points_added',
  ]);
});
```

### 7. Points (`points.js`)

Cálculo de pontuação do sistema 7 Cuidados.

```javascript
const { calculateUserPoints, calculateLevel, calculateGroupStats } = require('./modules/points');

// Calcular pontos de um usuário
const points = calculateUserPoints(user);

// Calcular nível
const level = calculateLevel(points);
// { level: 3, name: 'Planta', icon: '🌳', progressPercent: 65 }

// Estatísticas de grupo
const stats = calculateGroupStats(users);
// { totalPoints, averagePoints, participationRate, topPerformers, ... }
```

### 8. Users (`users.js`)

Operações CRUD de usuários.

```javascript
const users = require('./modules/users');

// Buscar
const user = await users.findById(123);
const user = await users.findByEmail('test@test.com');
const churchUsers = await users.findByChurch(churchId, { activeOnly: true });

// Criar
const newUser = await users.create({ name: 'João', email: 'joao@test.com' });

// Autenticar
const user = await users.authenticate('email@test.com', 'password123');

// Alterar senha
await users.changePassword(userId, 'oldPass', 'newPass');

// Ranking
const ranking = await users.getRanking({ churchId: 5 }, 10);
```

### 9. Churches (`churches.js`)

Operações CRUD de igrejas.

```javascript
const churches = require('./modules/churches');

// Buscar
const church = await churches.findById(123);
const districtChurches = await churches.findByDistrict(districtId);

// Criar múltiplas
const result = await churches.createMany([{ name: 'Igreja 1' }, { name: 'Igreja 2' }], districtId);

// Estatísticas
const stats = await churches.getStats(churchId);

// Ranking
const ranking = await churches.getRanking(districtId);
```

### 10. Districts (`districts.js`)

Operações CRUD de distritos.

```javascript
const districts = require('./modules/districts');

// Buscar
const district = await districts.findById(123);
const district = await districts.findByPastor(pastorId);

// Configurações
const config = await districts.getPointsConfig(districtId);
await districts.updatePointsConfig(districtId, newConfig);

// Estatísticas
const stats = await districts.getStats(districtId);
```

### 11. Invites (`invites.js`)

Gerenciamento de convites para pastores.

```javascript
const invites = require('./modules/invites');

// Criar convite
const invite = await invites.create({
  email: 'pastor@test.com',
  name: 'Pastor João',
  district_name: 'Distrito Central',
});

// Aprovar/Rejeitar
await invites.approve(inviteId, approvedByUserId);
await invites.reject(inviteId, rejectedByUserId, 'Motivo da rejeição');

// Validar token
const result = await invites.validate(token);
if (!result.valid) return errorResponse(result.error);
```

### 12. Excel Processor (`excelProcessor.js`)

Processamento de arquivos Excel.

```javascript
const { processExcel, extractChurches } = require('./modules/excelProcessor');

// Processar arquivo
const result = processExcel(excelData);
// {
//   success: true,
//   data: [...],
//   errors: [...],
//   warnings: [...],
//   stats: { totalRows, churches, memberTypes, ... }
// }

// Extrair igrejas
const churches = extractChurches(rows);
```

## Uso no Handler Principal

```javascript
// netlify/functions/api.js
const modules = require('./modules');

// Ou imports específicos
const { requireAuth, successResponse, errorResponse, users, churches } = require('./modules');

exports.handler = async event => {
  // Rate limiting
  const rateLimited = modules.checkRateLimit(event.headers['x-forwarded-for'], 'api');
  if (rateLimited) return modules.rateLimitResponse(rateLimited.retryAfter);

  // Autenticação
  const user = await modules.requireAuth(event);
  if (!user) return modules.unauthorizedResponse();

  // Lógica do endpoint
  try {
    const data = await modules.users.findById(user.id);
    return modules.successResponse(data);
  } catch (error) {
    modules.logger.error('Erro no endpoint', error);
    return modules.serverErrorResponse(error);
  }
};
```

## Benefícios da Modularização

1. **Testabilidade**: Cada módulo pode ser testado isoladamente
2. **Manutenibilidade**: Código organizado por domínio
3. **Reutilização**: Funções podem ser usadas em múltiplos endpoints
4. **Legibilidade**: Código mais limpo e compreensível
5. **Escalabilidade**: Fácil adicionar novos módulos
6. **Debugging**: Logs estruturados facilitam troubleshooting

## Próximos Passos

- [ ] Migrar gradualmente endpoints existentes para usar os módulos
- [ ] Adicionar testes unitários para cada módulo
- [ ] Implementar cache com Redis para rate limiting em produção
- [ ] Adicionar métricas e monitoramento
