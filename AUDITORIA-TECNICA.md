# 7Care — Auditoria Técnica por Dev Senior

> Análise completa do codebase com notas de 0 a 10 por categoria de desenvolvimento.
> Data: 10/02/2026

---

## Nota Global: 5.0 / 10

O projeto tem uma **base tecnológica moderna e bem escolhida** (React + TypeScript + Vite + Zustand + React Query + Drizzle ORM + Zod + shadcn/ui), com vários sistemas sofisticados implementados (gamificação, RPA, OCR, PWA, Tauri). Porém, sofre de problemas estruturais severos: código duplicado em larga escala, arquivos monolíticos, segurança com falhas críticas, e cobertura de testes quase inexistente no backend.

---

## Notas por Categoria

### 1. Arquitetura do Projeto — 4/10

**O que tem de bom:**
- Separação clara em `client/`, `server/`, `shared/`, `netlify/`
- Container de DI tipado em `server/container.ts`
- Path aliases (`@/`, `@shared/`) configurados
- Middleware layering em ordem sensata (correlation → logger → security → helmet → CORS → body → rate limit → JWT)

**Problemas graves:**
- **Duas bases de código implementando a mesma API**: `server/` (TypeScript, Drizzle ORM, modular) e `netlify/functions/api.js` (JavaScript puro, 20.475 linhas, monolito). Qualquer feature precisa ser implementada duas vezes — drift é inevitável
- `server/neonAdapter.ts` (3.327 linhas) coexiste com repositories individuais — duas camadas de acesso a dados para o mesmo propósito
- Container de DI é na verdade um Service Locator — serviços importam dependências diretamente, não recebem via construtor
- Arquivos `.bak` e `.old` espalhados no código (cleanup não feito)

---

### 2. Qualidade do Código Backend — 5/10

**O que tem de bom:**
- Schemas Zod bem definidos para validação (587 linhas)
- Middleware `asyncHandler` para error handling assíncrono
- Documentação Swagger/JSDoc nos endpoints
- Sistema de erros tipados excelente (`ApplicationError` com hierarquia: ValidationError, AuthenticationError, etc.)

**Problemas graves:**
- **Lógica de negócio dentro de routes**: `userRoutes.ts` tem 1.384 linhas com cálculo de pontos, configuração de gamificação e transformação de dados que deveriam estar em services
- `authRoutes.ts` reimplementa login/bcrypt/JWT ao invés de usar o `AuthService.login()` que já existe
- **Sem paginação a nível de banco**: `getAllUsers()` carrega todos os registros na memória, filtra em JavaScript. Limit default = 5000
- Services engolem erros silenciosamente retornando `{ data: [], total: 0 }` ao invés de usar o sistema tipado de erros
- **3 sistemas de error handling diferentes** coexistindo: `createErrorHandler` (app.ts), `errorHandler` middleware (sofisticado, pouco usado), e `handleBadRequest/handleNotFound` (utils)
- Repositories retornam `null`/`[]` em caso de erro de banco, impossibilitando diferenciar "não encontrado" de "erro de conexão"
- Interface `IRepository` usa `unknown` em todos os parâmetros — anula o propósito de tipagem

---

### 3. Qualidade do Código Frontend — 5/10

**O que tem de bom:**
- 30+ custom hooks extraídos para reuso
- Zustand store bem estruturado com slices, selectors e persist seletivo
- React Query como camada de data fetching
- `lazyWithRetry` — lazy loading inteligente com retry e reload automático
- Componentes otimizados com `React.memo` disponíveis (`OptimizedCard`, `OptimizedListItem`, etc.)

**Problemas graves:**
- **6 páginas com mais de 1.000 linhas** — `Settings.tsx` tem 4.003 linhas (gerencia notificações, privacidade, igrejas, eventos, importação Excel, push, logo, Google Calendar, pontos, tudo junto)
- `ElectionConfig.tsx` = 3.155 linhas, `Users.tsx` = 2.114 linhas
- `useTasks` tem **user-id hardcoded como `'1'`** nos headers — bug crítico em multi-user
- `useVisits` faz chamadas sem autenticação (não usa `fetchWithAuth`)
- **Duas fontes de verdade para auth**: Zustand store tem slice `auth`, mas `useAuth` hook gerencia estado próprio com useState/localStorage
- `fetchWithAuth` existe mas muitos hooks/páginas usam `fetch` raw diretamente — padrão inconsistente
- Dois sistemas de toast coexistem (shadcn toaster + Sonner)

---

### 4. Sistema de Tipos — 5/10

**O que tem de bom:**
- TypeScript strict mode ativado
- `strictNullChecks: true`, `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`
- Tipos de domínio abrangentes no frontend (428 linhas em `domain.ts`)
- Schema Drizzle fortemente tipado

**Problemas graves:**
- **`User` definido em 4+ lugares diferentes** com shapes conflitantes:
  - `shared/schema.ts` (banco)
  - `shared/types/api.ts` (API — `id: string`)
  - `client/src/types/auth.ts` (auth — `id: string`)
  - `client/src/stores/appStore.ts` (store — `id: number`)
- `UserRole` tem `'admin'` em shared/types mas `'admin_readonly'` em server/types — roles divergem
- `noUnusedLocals: false` e `noUnusedParameters: false` desabilitados — código morto não é detectado
- `noUncheckedIndexedAccess: false` — acesso a arrays sem verificação de undefined
- Properties misturando snake_case e camelCase no mesmo tipo (reflexo de API inconsistente)
- Campos opcionais em excesso (`?` e `| null`) sugerem contratos fracos com a API

---

### 5. Segurança — 4/10

**O que tem de bom:**
- JWT com refresh token em httpOnly cookie + SameSite strict
- Device fingerprint (UA + Accept-Language + IP) como verificação adicional
- CSRF double-submit cookie com `crypto.timingSafeEqual`
- Helmet + HSTS + noSniff + xssFilter + referrer-policy
- Detector de requisições suspeitas (sqlmap, nikto, XSS patterns)
- Rate limiting configurado para auth, upload, API geral, endpoints sensíveis
- Sanitização recursiva de input contra XSS

**Problemas CRÍTICOS:**
- 🔴 **Senhas hardcoded em plaintext** no `netlify/functions/api.js` (linhas ~2496 e ~2718): lista `['admin123', '123456', 'admin', 'password', '7care', 'meu7care']` usada como senhas válidas
- 🔴 **Password default `'temp123'`** para usuários criados sem senha (`userStorage.ts`)
- 🔴 **Reset de senha para valor conhecido** `'meu7care'` em múltiplos arquivos — qualquer reset roda para essa senha
- 🔴 **Endpoint `/api/admin/reset-all-passwords`** reseta TODAS as senhas do sistema para `'meu7care'`
- Token de acesso com **24h de validade** (padrão é 15-60 min) — token roubado é válido por um dia inteiro
- **Sem mecanismo de revogação de token** — não há como invalidar tokens comprometidos
- **3 definições de CSP conflitantes** em arquivos diferentes — duas permitem `unsafe-inline` e `unsafe-eval`
- Rate limiting usa **MemoryStore** — não funciona em serverless (cada instance tem contador próprio)
- CSRF middleware definido mas possivelmente não wired no app
- Audit log **apenas em memória** (perdido no restart, máximo 1000 entries)

---

### 6. Testes — 3/10

**O que tem de bom:**
- 28 arquivos de teste existem
- Testes de UI components são bem escritos (Testing Library + userEvent + renderHook)
- E2E de acessibilidade com axe-core/Playwright (WCAG 2.1 AA)
- Vitest configurado com jsdom
- CI roda testes automaticamente

**Problemas graves:**
- 🔴 **ZERO testes no backend** — nenhum teste para routes, services, middleware, repositories, auth, ou database
- Testes existentes são majoritariamente para componentes UI simples (button, card, input, badge)
- **Sem thresholds de cobertura** — cobertura pode cair a 0% sem o CI falhar
- **Sem testes E2E funcionais** — não testa fluxo de login, CRUD, nem fluxos críticos do negócio
- E2E de acessibilidade cobre apenas 6 das 33 páginas
- Nenhum teste de integração (API ↔ banco)
- Credenciais de teste hardcoded no E2E (`admin123`)

---

### 7. Performance & Otimização — 7/10

**O que tem de bom:**
- **Lazy loading** completo — todas as 33+ páginas com code splitting
- `lazyWithRetry` com recovery automático (retry + force reload)
- Bundle splitting manual sensato (vendor-react, vendor-xlsx, vendor-html2canvas)
- Terser em produção com `drop_console` e `drop_debugger`
- PWA com Workbox strategies (NetworkOnly para dados, CacheFirst para assets, NetworkFirst para uploads)
- Componentes `OptimizedCard`, `OptimizedListItem` etc. com React.memo
- Virtual list para listas longas
- Sistema de prefetch para rotas críticas
- Web Vitals monitoring integrado
- Bundle analyzer disponível via `ANALYZE=true`
- Limpeza de cache do React Query a cada 30 min

**Problemas:**
- Páginas monolíticas (4K linhas) causam re-renders pesados
- `React.memo` é subutilizado — apenas 6 componentes memorizados, muitas listas sem otimização
- `staleTime` inconsistente entre hooks (30s, 60s, valores arbitrários)
- Paginação in-memory no backend anula otimizações do frontend
- Sem `React.lazy` para sub-componentes dentro de páginas pesadas

---

### 8. UX & Design System — 7/10

**O que tem de bom:**
- **73 componentes UI** baseados em shadcn/ui + Radix — sistema de design consistente
- Skeleton loaders específicos por rota (`getSkeletonForRoute`)
- Dark mode via next-themes
- Animações com Framer Motion
- PWA instalável com ícones
- Tour guiado para novos usuários (driver.js)
- Pull-to-refresh mobile
- Geração de PDF (jsPDF) e Excel (exceljs/xlsx)
- QR Code generation
- Camera capture para fotos
- Charts com Recharts

**Problemas:**
- Dois sistemas de toast coexistindo (shadcn + Sonner) — UX inconsistente
- Dois sistemas de modal (`custom-modal`, `resizable-modal`, + `dialog`)
- i18n **configurado mas nunca usado** — todo texto hardcoded em português
- `aria-label` escasso — apenas ~10 instâncias no codebase inteiro
- E2E de acessibilidade cobre 6/33 páginas

---

### 9. DevOps & CI/CD — 6/10

**O que tem de bom:**
- CI no GitHub Actions: lint → typecheck → build → test
- Husky + lint-staged no pre-commit (Prettier + ESLint max-warnings 0)
- Migrations numeradas (`001_`, `002_`, etc.)
- Scripts de deploy bem organizados
- Release workflow para Tauri (macOS arm64/x64, Ubuntu, Windows)
- .gitignore correto (exclui .env, .pem, .key, secrets/, credentials/)
- `.env.example` e `.env.vercel.template` com placeholders
- Bundle artifacts uploadados com 7 dias de retenção

**Problemas:**
- **Sem deploy automático da web app** no CI (só release desktop)
- **Sem security scanning** (zero Snyk, npm audit, CodeQL, SAST)
- Sem E2E tests no pipeline
- Sem enforcement de cobertura
- Sem type-checking no pre-commit (só no CI)
- Sem ambiente de staging — deploy direto para produção

---

### 10. Escalabilidade & Manutenibilidade — 4/10

**O que tem de bom:**
- Drizzle ORM com schema tipado
- Padrão repository (mesmo que incompleto)
- Monorepo organizado com shared code

**Problemas graves:**
- 🔴 **Codebase duplicada** — mesma API em 2 linguagens (TS modular + JS monolito de 20K linhas)
- 🔴 **NeonAdapter god class** (3.327 linhas) duplica lógica dos repositories
- 🔴 **Paginação in-memory** — `getAllUsers()` + filter em JS quebrará com 1000+ registros
- Tabela `users` com 40+ colunas (deveria ser normalizada)
- Sem DB-level full-text search
- Rate limiting em MemoryStore (não funciona em serverless)
- Audit log em memória (não persiste)
- 6 páginas > 1000 linhas — impossíveis de manter/testar individualmente
- mapping `toUser()` duplicado em NeonAdapter e UserRepository

---

## Quadro Resumo

| # | Categoria | Nota | Nível |
|---|---|---|---|
| 1 | Arquitetura do Projeto | **4/10** | 🔴 Crítico |
| 2 | Qualidade Backend | **5/10** | 🟡 Abaixo |
| 3 | Qualidade Frontend | **5/10** | 🟡 Abaixo |
| 4 | Sistema de Tipos | **5/10** | 🟡 Abaixo |
| 5 | Segurança | **4/10** | 🔴 Crítico |
| 6 | Testes | **3/10** | 🔴 Crítico |
| 7 | Performance & Otimização | **7/10** | 🟢 Bom |
| 8 | UX & Design System | **7/10** | 🟢 Bom |
| 9 | DevOps & CI/CD | **6/10** | 🟡 Adequado |
| 10 | Escalabilidade & Manutenibilidade | **4/10** | 🔴 Crítico |
| | **MÉDIA GERAL** | **5.0/10** | |

---

## Top 10 Ações Prioritárias

| # | Ação | Impacto | Esforço |
|---|---|---|---|
| 1 | **Remover senhas hardcoded** e endpoint reset-all-passwords | Segurança crítica | 1 dia |
| 2 | **Eliminar `netlify/functions/api.js`** — usar apenas `server/` como fonte única | Arquitetura | 2-3 semanas |
| 3 | **Adicionar testes backend** — auth, routes, services (meta: 60% coverage) | Qualidade | 2 semanas |
| 4 | **Implementar paginação no banco** (LIMIT/OFFSET nas queries) | Escalabilidade | 1 semana |
| 5 | **Reduzir token JWT para 15min** + implementar blacklist com Redis | Segurança | 3 dias |
| 6 | **Quebrar páginas monolíticas** (Settings 4K, ElectionConfig 3K, Users 2K) | Manutenibilidade | 1-2 semanas |
| 7 | **Unificar tipos User** em uma única definição shared | Tipos | 3 dias |
| 8 | **Unificar error handling** — usar o sistema tipado existente em todos os routes/services | Qualidade | 1 semana |
| 9 | **Fixar bugs de auth** — user-id hardcoded em useTasks, fetch sem auth em useVisits | Funcionalidade | 1 dia |
| 10 | **Adicionar security scanning** ao CI (npm audit, CodeQL) | DevOps | 1 dia |

---

## Veredicto Final

O 7Care é um app **ambicioso e rico em features** — tem gamificação, RPA, OCR, PWA, Tauri desktop, Google Calendar sync, i18n infrastructure, accessibility testing, e um design system sólido. A escolha da stack é moderna e adequada.

O principal problema é **crescimento orgânico sem refactoring**: features foram adicionadas rapidamente (validado pelo arquivo JS de 20K linhas), resultando em duplicação, inconsistência e dívida técnica acumulada. A segurança tem falhas que precisam ser corrigidas imediatamente (senhas hardcoded), e o backend não tem um único teste automatizado.

**O app funciona, mas não está pronto para escalar** nem para receber novos desenvolvedores com confiança. As 10 ações acima, executadas nessa ordem, transformariam o projeto de um 5/10 para um 7-8/10 em 6-8 semanas de trabalho focado.

---

*Auditoria realizada em 10/02/2026*

---

## Status das Correções (atualizado em 2025-06)

| # | Ação | Status | Detalhes |
|---|---|---|---|
| 1 | Remover senhas hardcoded | ✅ Concluído | Commits 5f1ab14, 0fff66b |
| 2 | Eliminar api.js | ❌ Pendente | Alto risco, requer planejamento |
| 3 | Testes backend | ❌ Pendente | Baixa prioridade neste ciclo |
| 4 | Paginação no banco | ✅ Concluído | `getUsersPaginated()` com WHERE+LIMIT/OFFSET (commit 80c6c72) |
| 5 | Reduzir token JWT | ✅ Concluído | Commit 5f1ab14 |
| 6 | Quebrar páginas monolíticas | ✅ Concluído | Settings.tsx: 4.004 → 820 linhas (-79.5%). 9 componentes extraídos: importParsers, EditableField, ImportUsersModal, SendNotificationModal, ChurchManagementTab, CalendarManagementTab, DataManagementTab, MobileHeaderLayoutEditor (commits d7c9b5e, 2e7b216, f977d58) |
| 7 | Unificar tipos User | ✅ Concluído | Commit 3029eed |
| 8 | Unificar error handling | ✅ Concluído | Sistema tipado ApplicationError em todos os routes (commit 50a54c9) |
| 9 | Fixar bugs de auth | ✅ Concluído | Commit 3a757e7 |
| 10 | Security scanning CI | ✅ Concluído | CodeQL + dependency-review + npm audit (commit f98226f) |

**Progresso: 8/10 ações concluídas. Nota estimada atualizada: ~7.5/10**
