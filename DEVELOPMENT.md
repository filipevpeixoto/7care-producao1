# 7Care - Guia de Desenvolvimento

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** 20+ (use `nvm use` para garantir a versão correta)
- **npm** 9+
- **Docker** e **Docker Compose** (opcional, mas recomendado)
- **Git**

### Setup Local (sem Docker)

1. **Clone o repositório**
   ```bash
   git clone <repo-url>
   cd 7care-producao-sem-offline-main
   ```

2. **Instale as dependências**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Edite .env com suas credenciais
   ```

4. **Execute as migrations**
   ```bash
   npm run migrate-to-neon
   ```

5. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev          # Backend (porta 3064)
   npm run dev:web      # Frontend (porta 5173)
   ```

### Setup Local (com Docker)

```bash
# Inicia todos os serviços (PostgreSQL + Redis + Adminer + Redis Commander)
docker-compose up -d

# Acesse:
# - App: http://localhost:5000
# - Adminer (PostgreSQL UI): http://localhost:8080
# - Redis Commander: http://localhost:8081
```

---

## 📦 Scripts Disponíveis

### Desenvolvimento

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o backend em modo desenvolvimento (porta 3064) |
| `npm run dev:web` | Inicia o frontend com Vite (porta 5173) |
| `npm run dev:tauri` | Inicia o app desktop Tauri |

### Build

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Build do frontend para produção |
| `npm run build:tauri` | Build do app desktop |
| `npm run build:server` | Build do backend para produção |

### Testes

| Comando | Descrição |
|---------|-----------|
| `npm test` | Roda testes do **client** (526 testes) |
| `npm run test:server` | Roda testes do **server** (150 testes) |
| `npm run test:all` | Roda **todos** os testes (client + server + e2e) |
| `npm run test:coverage` | Cobertura de testes do client |
| `npm run test:server:coverage` | Cobertura de testes do server |
| `npm run test:e2e` | Testes end-to-end com Playwright |

### Qualidade de Código

| Comando | Descrição |
|---------|-----------|
| `npm run lint` | Verifica erros de lint (ESLint) |
| `npm run lint:fix` | Corrige erros de lint automaticamente |
| `npm run format` | Formata código com Prettier |
| `npm run format:check` | Verifica formatação sem modificar |
| `npm run check` | Type-checking com TypeScript |

### Migrations

| Comando | Descrição |
|---------|-----------|
| `npm run migrate-to-neon` | Roda migrations do banco de dados |
| `npm run migrate-google-calendar` | Adiciona integração Google Calendar |

---

## 🧪 Testes

### Rodando Testes Específicos

```bash
# Client tests
npm test                                  # Todos os testes client
npm test -- useAuth                       # Testes que contenham "useAuth"

# Server tests
npm run test:server                       # Todos os testes server
npm run test:server -- auth              # Testes de auth

# E2E tests
npm run test:e2e                         # Todos os E2E
npm run test:e2e:ui                      # E2E com interface Playwright
```

### Cobertura de Testes

Thresholds atuais:
- **Client**: 40% statements, 30% branches
- **Server**: 35% statements, 25% branches

```bash
npm run test:coverage          # Client coverage
npm run test:server:coverage   # Server coverage
```

---

## 🐳 Docker

### Serviços Disponíveis

| Serviço | Porta | Credenciais |
|---------|-------|-------------|
| **PostgreSQL** | 5432 | user: `sevencare`, password: `sevencare`, db: `sevencare` |
| **Redis** | 6379 | Sem autenticação |
| **Adminer** | 8080 | Use as credenciais do PostgreSQL |
| **Redis Commander** | 8081 | - |
| **App** | 5000, 3064 | - |

### Comandos Úteis

```bash
# Iniciar serviços
docker-compose up -d

# Ver logs
docker-compose logs -f app
docker-compose logs -f postgres

# Parar serviços
docker-compose stop

# Remover tudo (incluindo volumes)
docker-compose down -v

# Rebuild após mudanças no Dockerfile
docker-compose up -d --build
```

---

## 🔧 Estrutura do Projeto

```
7care/
├── client/                 # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Páginas/rotas
│   │   ├── stores/        # Zustand stores
│   │   └── lib/           # Utilities
├── server/                 # Backend (Express + TypeScript)
│   ├── routes/            # Express routes
│   ├── repositories/      # Data access layer (21 repositories)
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── migrations/        # Database migrations
│   └── __tests__/         # Server tests
├── shared/                 # Código compartilhado
│   ├── schema.ts          # Drizzle ORM schema
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities compartilhadas
├── e2e/                    # Testes end-to-end (Playwright)
└── netlify/functions/      # LEGADO (será depreciado)
```

---

## 📝 Convenções de Código

### Git Commit Messages

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona botão de logout
fix: corrige bug de autenticação
refactor: extrai componente UserCard
test: adiciona testes para useAuth
docs: atualiza README
chore: atualiza dependências
```

### TypeScript

- **Strict mode** habilitado
- Use **tipos explícitos** para parâmetros de função
- Evite `any` — use `unknown` se necessário
- Prefira **interfaces** para objetos públicos, **types** para unions/intersections

### React

- **Functional components** + hooks
- Use `React.memo` para componentes pesados
- Lazy loading para páginas: `const Page = lazy(() => import('./Page'))`
- Custom hooks devem começar com `use` (ex: `useAuth`, `useTasks`)

### Formatação

- **2 espaços** para indentação
- **Single quotes** para strings
- **Trailing comma** em objetos/arrays multilinha
- **Ponto e vírgula** obrigatório

---

## 🔐 Segurança

### Secrets

- **NUNCA** commite secrets (`.env`, credenciais, tokens)
- Use `.env.example` como template
- Em produção, use variáveis de ambiente do Vercel/Netlify

### Autenticação

- **JWT** com 15min de expiração
- **Refresh token** em httpOnly cookie
- **CSRF protection** disponível (ative com `ENABLE_CSRF=true`)

### Rate Limiting

- Auth: 5 requisições/15min
- Upload: 10 requisições/hora
- API geral: 100 requisições/15min

---

## 🚨 Troubleshooting

### "Out of memory" ao rodar testes

```bash
# Use --max-old-space-size
NODE_OPTIONS='--max-old-space-size=4096' npm test
```

### Erro de peer dependencies

```bash
# Use --legacy-peer-deps
npm install --legacy-peer-deps
```

### Porta 5432 já em uso

```bash
# Verifique se PostgreSQL está rodando localmente
lsof -i :5432

# Pare o processo ou use Docker em porta diferente
```

### Build do Vite falha

```bash
# Limpe cache e node_modules
rm -rf node_modules dist .vite
npm install --legacy-peer-deps
npm run build
```

---

## 📚 Recursos

- [Documentação React Query](https://tanstack.com/query/latest)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

---

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feature/minha-feature`
2. Faça suas alterações e commit: `git commit -m "feat: adiciona minha feature"`
3. Rode os testes: `npm run test:all`
4. Rode o lint: `npm run lint`
5. Push: `git push origin feature/minha-feature`
6. Abra um Pull Request

---

**Última atualização:** Fevereiro 2026
