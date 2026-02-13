# Contribuindo para o 7Care

Obrigado por querer contribuir! Este guia descreve como configurar o ambiente de desenvolvimento e as convenções do projeto.

## Pré-requisitos

- **Node.js** 18+ (recomendado: 20 LTS)
- **npm** 9+
- **Git**

## Setup rápido

```bash
# Clonar repositório
git clone https://github.com/filipevpeixoto/7care-producao1.git
cd 7care-producao1

# Instalar dependências
npm install

# Iniciar em desenvolvimento
npm run dev
```

## Estrutura do projeto

```
client/           → Frontend React + TypeScript + Vite
  src/
    components/   → Componentes React reutilizáveis
    pages/        → Páginas/rotas da aplicação
    hooks/        → Custom hooks
    lib/          → Utilitários (api, logger, queryKeys, etc.)
    stores/       → Estado global (Zustand)
    i18n/         → Internacionalização

server/           → Backend Express + TypeScript
  routes/         → Rotas da API (organizadas por domínio)
  services/       → Lógica de negócio
  repositories/   → Acesso a dados (Drizzle ORM)
  middleware/     → Middlewares Express (auth, CSRF, rate limit, etc.)

shared/           → Tipos e schemas compartilhados client/server
```

## Convenções de código

### TypeScript
- **Strict mode** habilitado
- Prefixar parâmetros não utilizados com `_` (e.g., `_req`)
- Usar `type` imports para tipos: `import type { User } from '...'`

### React
- Componentes funcionais com hooks
- Estado local → `useState` / `useReducer`
- Estado servidor → React Query (`useQuery` / `useMutation`)
- Estado global → Zustand (`appStore`)
- Formulários → React Hook Form + Zod

### Logging
- **Nunca** usar `console.log/warn/error` diretamente
- Importar loggers do `@/lib/logger`:
  ```typescript
  import { authLogger, createLogger } from '@/lib/logger';
  authLogger.error('Falha no login', error);
  ```

### API calls
- Usar `fetchWithAuth()` do `@/lib/api` (adiciona JWT + CSRF automaticamente)
- **Nunca** enviar headers `x-user-id` / `x-user-role` manualmente
- Query keys centralizadas em `@/lib/queryKeys`

### Segurança
- CSRF habilitado (double-submit cookie)
- DOMPurify disponível em `@/lib/sanitize` para conteúdo dinâmico
- Input validation com Zod nos endpoints

## Scripts úteis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia dev server (client + server) |
| `npm run build` | Build de produção |
| `npm run test` | Roda todos os testes |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm run lint` | ESLint |

## Fluxo de trabalho

1. Crie uma branch a partir de `main`
2. Faça as alterações
3. Rode `npm run typecheck && npm run test`
4. Envie um Pull Request

## Commit messages

Prefixos recomendados:
- `feat:` — Nova funcionalidade
- `fix:` — Correção de bug
- `refactor:` — Refatoração sem mudança de comportamento
- `docs:` — Apenas documentação
- `test:` — Adição/alteração de testes
- `chore:` — Manutenção (dependências, config, etc.)

## Testes

- **Server**: Vitest + Supertest (`vitest.config.server.ts`)
- **Client**: Vitest + Testing Library (`vitest.config.ts`)
- Criar testes em `__tests__/` ou com sufixo `.test.ts(x)`

## Arquitetura de decisões

Decisões importantes estão documentadas em `/docs/adr/`. Consulte antes de fazer mudanças arquiteturais.
