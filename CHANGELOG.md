# 📝 CHANGELOG - Melhorias de Qualidade

## [Unreleased] - 2026-02-01

### 🏗️ Arquitetura - Modularização da API

#### Novos Módulos (netlify/functions/modules/)

Criados **13 módulos** para substituir o monolítico `api.js` (18.600 linhas):

| Módulo               | Descrição                            | Linhas |
| -------------------- | ------------------------------------ | ------ |
| `auth.cjs`           | Autenticação JWT, bcrypt, permissões | ~130   |
| `rateLimit.cjs`      | Rate limiting por IP/tipo            | ~250   |
| `validation.cjs`     | Validação e sanitização de dados     | ~220   |
| `responses.cjs`      | Respostas HTTP padronizadas          | ~200   |
| `logger.cjs`         | Logging estruturado JSON             | ~200   |
| `database.cjs`       | Operações PostgreSQL/Neon            | ~200   |
| `points.cjs`         | Cálculo de pontuação                 | ~280   |
| `users.cjs`          | CRUD de usuários                     | ~300   |
| `churches.cjs`       | CRUD de igrejas                      | ~280   |
| `districts.cjs`      | CRUD de distritos                    | ~300   |
| `invites.cjs`        | Convites para pastores               | ~280   |
| `excelProcessor.cjs` | Processamento de Excel               | ~350   |
| `index.cjs`          | Exportador de módulos                | ~50    |

**Total: ~3.000 linhas de código modular, bem documentado e testável**

### 🔌 Integração no api.js

- ✅ Rate limiting integrado no handler principal
- ✅ Logging estruturado com request IDs
- ✅ Sanitização automática de body em POST/PUT/PATCH
- ✅ Headers X-Request-ID para rastreamento

### 🧪 Novos Testes

Criados testes unitários para os novos módulos:

- `tests/modules/validation.test.cjs` - 32 testes
- `tests/modules/points.test.cjs` - 19 testes
- `tests/modules/responses.test.cjs` - 24 testes
- `tests/modules/excelProcessor.test.cjs` - 38 testes
- `tests/modules/rateLimit.test.cjs` - 14 testes
- `tests/modules/logger.test.cjs` - 17 testes

**Total: 144 novos testes unitários - TODOS PASSANDO ✅**

### 📚 Documentação

#### Novos Documentos

- `docs/API_MODULES.md` - Guia completo da arquitetura de módulos
- `docs/SECURITY.md` - Guia de segurança detalhado (atualizado)
- `shared/types/api.ts` - Tipos TypeScript para toda a API

#### Conteúdo do API_MODULES.md

- Visão geral da arquitetura
- Documentação de cada módulo com exemplos
- Guia de migração
- Boas práticas

### 🔒 Segurança

#### Rate Limiting Implementado

```javascript
// Configuração por tipo de rota
auth: 10 requisições / 15 minutos
api: 100 requisições / minuto
write: 30 requisições / minuto
bulk: 5 requisições / 5 minutos
```

#### Sanitização de Inputs

- Remove tags HTML
- Remove protocolos perigosos (javascript:)
- Remove event handlers (onclick=)
- Sanitização recursiva de objetos

#### Logging Seguro

- Redação automática de campos sensíveis
- password, token, secret → [REDACTED]

### 📊 Tipos TypeScript

Novo arquivo `shared/types/api.ts` com:

- Tipos para todas as entidades (User, Church, District, etc.)
- Tipos de request/response
- Tipos de erro padronizados
- Tipos de paginação
- Tipos de rate limiting

---

## [Unreleased] - 2026-01-22

### 🔒 Segurança (Critical)

#### JWT Authentication Hardening

- **Removido fallback de `JWT_SECRET`** - Servidor agora falha fast se não configurado em produção
- **Removido fallback de `JWT_REFRESH_SECRET`** - Mesma proteção aplicada
- **Validação em tempo de inicialização** - Erros claros se variáveis ausentes
- Arquivos modificados:
  - [server/middleware/jwtAuth.ts](server/middleware/jwtAuth.ts)
  - [server/routes/authRoutes.ts](server/routes/authRoutes.ts)

#### Validação de Senha Forte

- **Novo schema `strongPasswordSchema`** com validação completa:
  - Mínimo 8 caracteres
  - Pelo menos uma letra maiúscula
  - Pelo menos uma letra minúscula
  - Pelo menos um número
  - Pelo menos um caractere especial (@$!%\*?&)
- Aplicado em:
  - Registro de novos usuários
  - Alteração de senha
- Arquivo: [server/schemas/index.ts](server/schemas/index.ts)

### 🏗️ Arquitetura

#### Repository Pattern (Já existente)

- ✅ `UserRepository` - Operações de usuário
- ✅ `ChurchRepository` - Operações de igreja
- ✅ `EventRepository` - Operações de evento
- Helpers de paginação: [server/repositories/BaseRepository.ts](server/repositories/BaseRepository.ts)

#### Utilitários de Paginação

- Novo módulo: [server/utils/pagination.ts](server/utils/pagination.ts)
- Features:
  - `extractPaginationParams()` - Extrai parâmetros do request
  - `createPaginatedResponse()` - Cria resposta padronizada
  - `paginateArray()` - Pagina arrays em memória
  - `validatePaginationParams()` - Validação de limites
  - `generatePaginationLinks()` - Links HATEOAS

### 🚀 DevOps/CI/CD (Já existente)

- ✅ GitHub Actions em [.github/workflows/ci.yml](.github/workflows/ci.yml)
- Pipeline com:
  - Lint & Type Check
  - Testes Unitários
  - Security Audit
  - Build
  - Deploy (Staging/Production)

### 📚 Documentação

#### ARCHITECTURE.md

- Novo arquivo: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Conteúdo:
  - Visão geral do sistema
  - Stack tecnológico completo
  - Diagrama de arquitetura ASCII
  - Estrutura de diretórios
  - Camadas da aplicação
  - Estratégias de segurança
  - Performance e cache
  - ADRs (Architecture Decision Records)

### 🧪 Testes

#### Novos Testes de Hooks

- [client/src/hooks/**tests**/auth.test.ts](client/src/hooks/__tests__/auth.test.ts)
  - Testes de estado inicial
  - Login com credenciais válidas/inválidas
  - Logout e limpeza de dados
  - Verificação de permissões
  - Gestão de tokens

- [client/src/hooks/**tests**/points.test.ts](client/src/hooks/__tests__/points.test.ts)
  - Cálculo de pontos
  - Cálculo de níveis
  - Fetch de pontos da API
  - Breakdown por categoria
  - Ranking de usuários

### 🔧 Manutenibilidade

#### Commitlint

- Novo arquivo: [commitlint.config.js](commitlint.config.js)
- Tipos permitidos:
  - `feat`, `fix`, `docs`, `style`, `refactor`
  - `perf`, `test`, `build`, `ci`, `chore`, `revert`, `wip`
- Regras de formatação para subject e body

#### Novas Dependências (package.json)

```json
"@commitlint/cli": "^19.0.0",
"@commitlint/config-conventional": "^19.0.0",
"@testing-library/react": "^14.0.0",
"@testing-library/jest-dom": "^6.0.0"
```

### 🎨 UX/Acessibilidade

#### Dark Mode

- **ThemeContext**: [client/src/contexts/ThemeContext.tsx](client/src/contexts/ThemeContext.tsx)
  - Suporte a temas: light, dark, system
  - Persistência em localStorage
  - Listener para preferência do sistema
  - Hook `useTheme()`

- **ThemeToggle**: [client/src/components/ui/theme-toggle.tsx](client/src/components/ui/theme-toggle.tsx)
  - Variante icon (toggle simples)
  - Variante dropdown (light/dark/system)

- **Integração no App.tsx**
  - ThemeProvider adicionado ao root
  - Classes Tailwind dark já configuradas

---

## Resumo de Impacto

| Área               | Antes              | Depois            | Melhoria    |
| ------------------ | ------------------ | ----------------- | ----------- |
| Segurança JWT      | Fallback hardcoded | Fail-fast         | ✅ Critical |
| Validação de Senha | min 6 chars        | Strong password   | ✅ High     |
| Documentação       | README básico      | ARCHITECTURE.md   | ✅ Medium   |
| Testes Frontend    | 0% hooks           | Testes básicos    | ✅ Medium   |
| Commitlint         | Nenhum             | Conventional      | ✅ Low      |
| Dark Mode          | Não existia        | Completo          | ✅ Low      |
| Paginação Utils    | Básico             | Helpers completos | ✅ Medium   |

---

## Como usar as novas features

### 1. Configurar variáveis de ambiente (obrigatório em produção)

```bash
export JWT_SECRET="$(openssl rand -base64 32)"
export JWT_REFRESH_SECRET="$(openssl rand -base64 32)"
```

### 2. Commitlint

```bash
# Instalar hooks
npm run prepare

# Commits devem seguir o formato:
git commit -m "feat: adiciona nova funcionalidade"
git commit -m "fix(auth): corrige validação de token"
```

### 3. Dark Mode

```tsx
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';

function MyComponent() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div>
      <ThemeToggle variant="dropdown" />
      <p>Tema atual: {isDark ? 'Escuro' : 'Claro'}</p>
    </div>
  );
}
```

### 4. Paginação no Backend

```typescript
import { extractPaginationParams, createPaginatedResponse } from '../utils/pagination';

app.get('/api/items', async (req, res) => {
  const { page, limit, offset } = extractPaginationParams(req);

  const items = await db.select().from(schema.items).limit(limit).offset(offset);
  const total = await db.count().from(schema.items);

  res.json(createPaginatedResponse(items, page, limit, total));
});
```

### 5. Validação de Senha Forte

```typescript
import { strongPasswordSchema } from '../schemas';

// Valida senha
const result = strongPasswordSchema.safeParse('MinhaSenh@123');
if (!result.success) {
  console.log(result.error.errors); // Lista de erros
}
```
