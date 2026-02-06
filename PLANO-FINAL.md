# PLANO FINAL - Correções e Melhorias 7Care

> Auditoria realizada em 06/02/2026 por Claude (Senior Developer Review)
> Nota geral do app: **6.2 / 10**

## Avaliação por Categoria

| Categoria | Nota | O que falta para o 10 |
|---|:---:|---|
| Arquitetura/Organização | 6/10 | Quebrar arquivos monolíticos, completar service layer |
| Seguranca | 4/10 | Credenciais hardcoded, JWT no localStorage, rotas sem auth |
| Frontend (Qualidade) | 7/10 | Remover `any`, padronizar toast, quebrar componentes |
| Backend (Qualidade) | 5/10 | N+1 queries, paginacao, error handling |
| Performance | 6/10 | Dashboard com ~15 queries sem cache, N+1, sem paginacao |
| Testes | 3/10 | Jest quebrado (OOM), cobertura < 20% |
| UX/Funcionalidades | 7/10 | Faltam presenca, financeiro, follow-up visitantes |
| DevOps/Infra | 6/10 | Dockerfile sem non-root, rate limit em memoria |
| Acessibilidade | 7/10 | Biblioteca excelente mas nao aplicada em tudo |
| Documentacao | 7/10 | Falta matriz de seguranca por endpoint |

---

## FASE 1 - SEGURANCA CRITICA (Semana 1)

### 1.1 Remover Credenciais Hardcoded
**Arquivo:** `server/neonConfig.ts` (linha 6-8)
- Remover fallback com senha do banco no connectionString
- Substituir por: `const connectionString = process.env.DATABASE_URL;` com throw se undefined
- Rotacionar senha do banco Neon imediatamente apos deploy

**Arquivos:** `server/createSuperAdmin.ts`, `server/setupNeonData.ts`, `server/migrateToNeon.ts`, `server/testLogin.ts`
- Remover todas as referencias a senha padrao hardcoded
- Usar `process.env.DEFAULT_ADMIN_PASSWORD` sem fallback

### 1.2 Corrigir Autenticacao por Header (Auth Bypass)
**Arquivo:** `server/middleware/index.ts` (linhas 24-44)
- Funcao `resolveUserId()` aceita header `x-user-id` SEM validacao JWT
- Qualquer pessoa pode enviar `curl -H "x-user-id: 1" /api/users` e acessar dados
- **Fix:** Remover parsing do header `x-user-id`. Extrair userId SOMENTE do JWT validado
- Remover `X-User-Id` do CORS Allow-Headers em `server/index.ts` (linha 68)

### 1.3 Adicionar requireAuth nas Rotas Desprotegidas
**Arquivos afetados:**
- `server/routes/relationshipRoutes.ts` - sem auth middleware
- `server/routes/importRoutes.ts` (linha 18) - upload sem auth nem rate limit
- `server/routes/electionRoutes.ts` - endpoints de votacao sem auth
- `server/routes/reportsRoutes.ts` (linha 108) - relatorios sensiveis sem auth
- **Fix:** Adicionar `requireJwtAuth` como middleware em TODAS as rotas protegidas

### 1.4 Corrigir Isolamento de Distrito
**Arquivo:** `server/middleware/index.ts` (linhas 346-420)
- `requireDistrictAccess`: se `getDistrictId(req)` retorna `undefined/null`, pastor passa sem validacao
- Pastor pode acessar dados de outros distritos
- **Fix:** Implementar fail-closed: se districtId nao presente, negar acesso (retornar 400)

### 1.5 Validacao de Variaveis de Ambiente
**Novo arquivo:** `server/utils/validateEnv.ts`
- Validar na inicializacao: `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS` (nao pode ser `*` em producao), `ENCRYPTION_KEY`
- Chamar em `server/index.ts` antes de qualquer outra coisa
- Fail fast se variaveis obrigatorias estiverem ausentes

**Checklist de verificacao da Fase 1:**
- [ ] Credenciais removidas do codigo fonte
- [ ] Senha do banco rotacionada
- [ ] `curl -H "x-user-id: 1" /api/users` retorna 401
- [ ] Todas as rotas protegidas com requireAuth
- [ ] Pastor nao acessa distrito de outro
- [ ] App nao inicia sem DATABASE_URL

---

## FASE 2 - PERFORMANCE DO DASHBOARD (Semana 2)

### 2.1 Problema Identificado
**Dashboard.tsx faz ~15 fetch calls** ao montar, quase todos com:
```
staleTime: 0              // NUNCA usa cache
refetchOnMount: 'always'  // SEMPRE refetch
refetchOnWindowFocus: true // refetch a cada foco
```
Alem disso: polling de 30s para stats + multiplos `refetchInterval: 300000` (5min)

### 2.2 Endpoint Unificado Inexistente
**Problema:** Frontend chama `/api/dashboard/unified` mas esse endpoint NAO EXISTE no backend
- `dashboardRoutes.ts` so tem `/api/dashboard/stats` e `/api/dashboard/visits`
- Cada card faz sua propria chamada API separada

### 2.3 Correcao - Backend
**Arquivo:** `server/routes/dashboardRoutes.ts`
- Criar endpoint `GET /api/dashboard/unified` que retorna TUDO em uma unica query:
  - Stats (contagens de usuarios por role, status, monte)
  - Visitas agendadas
  - Tarefas pendentes
  - Aniversariantes do mes
  - Ultimos eventos
- Adicionar cache server-side (cacheService) com TTL de 2 minutos
- Usar `SELECT COUNT(*) ... GROUP BY` ao inves de carregar todos os registros

### 2.4 Correcao - Frontend
**Arquivo:** `client/src/pages/Dashboard.tsx`
- Consolidar ~15 useQuery em 1-3 queries maximo:
  - `useQuery('/api/dashboard/unified')` - dados principais (staleTime: 2min)
  - `useQuery('/api/events')` - eventos se necessario
  - `useQuery('/api/tasks')` - tarefas se necessario
- Aumentar `staleTime` de 0 para `2 * 60 * 1000` (2 min)
- Remover `refetchOnMount: 'always'` - usar `true` padrao
- Remover polling de 30s (`setInterval` na linha 1086)
- Remover `refetchInterval` de 5min - usar invalidation por evento
- Manter apenas 1 `refetchOnWindowFocus: true` no query principal

### 2.5 Resultado Esperado
- De ~15 chamadas API para 1-3
- De staleTime 0 (sem cache) para 2min de cache
- Remocao de polling desnecessario
- Cards carregam instantaneamente com dados do cache

**Checklist de verificacao da Fase 2:**
- [ ] Dashboard carrega em < 2 segundos
- [ ] Network tab mostra 1-3 requests ao inves de ~15
- [ ] Cards aparecem com dados do cache na segunda visita
- [ ] Endpoint `/api/dashboard/unified` existe e retorna dados

---

## FASE 3 - QUERIES N+1 E PAGINACAO (Semana 3)

### 3.1 Corrigir N+1 em Relationships
**Arquivo:** `server/routes/relationshipRoutes.ts` (linhas 61-77)
```typescript
// PROBLEMA ATUAL: 1000 relacionamentos = 2000 queries ao banco!
relationships.map(async (rel) => {
  const interested = await storage.getUserById(rel.interestedId);  // query 1
  const missionary = await storage.getUserById(rel.missionaryId);  // query 2
});
```
- **Fix:** Criar query com JOIN que retorna relationships + user names em UMA query
- Adicionar ao repository: `getRelationshipsWithUsers(districtId)` usando SQL JOIN

### 3.2 Adicionar Paginacao nos Endpoints de Lista
**Arquivo:** `server/utils/pagination.ts` (ja existe!)
- Aplicar em TODOS os endpoints que retornam listas:
  - `GET /api/users` - ja tem mas verificar
  - `GET /api/relationships` - sem paginacao
  - `GET /api/elections/*` - sem paginacao
  - `GET /api/reports/*` - sem paginacao
- Padrao: `page=1&limit=20`, maximo 100 items

### 3.3 Filtrar no Banco, Nao em Memoria
**Arquivos afetados:**
- `server/routes/relationshipRoutes.ts` - `getAllRelationships()` + filter em memoria
- `server/routes/churchRoutes.ts` (linha 57) - `getAllChurches()` + filter em memoria
- **Regra:** Nunca usar `getAll*()` seguido de `.filter()`. Filtrar com WHERE no SQL

**Checklist de verificacao da Fase 3:**
- [ ] Relationships carrega sem queries N+1
- [ ] Todos os endpoints de lista aceitam `?page=1&limit=20`
- [ ] Nenhum endpoint carrega TODOS os registros para filtrar em memoria

---

## FASE 4 - PADRONIZACAO DE CODIGO (Semana 4)

### 4.1 Padronizar Error Handling
**3 padroes diferentes em uso atualmente:**
1. `sendError(res, msg, code)` - usado em ~15 rotas migradas (padrao escolhido)
2. `throw new ApplicationError(msg, code)` - usado em services
3. `res.status(400).json({...})` - legado em ~12 rotas

**Decisao:** Padronizar em `sendError/sendSuccess` (ja existe em `server/utils/apiResponse.ts`)
- Script de migracao ja existe: `scripts/migrate-to-api-response.cjs`
- Executar para as 12 rotas restantes (35 - 23 = 12 faltando)

### 4.2 Padronizar Notificacoes no Frontend
**3 padroes em uso:**
1. `useToast()` hook - usado em Settings, Calendar
2. `toast` de sonner - usado em Tasks, Users (padrao escolhido)
3. `notificationService` - usado em Calendar, Tasks

**Decisao:** Padronizar em `toast` do sonner (mais simples, menos boilerplate)
- Substituir `useToast()` por `toast` do sonner
- Remover `notificationService` onde duplica sonner
- Manter `notificationService` apenas para push notifications reais

### 4.3 Remover getAuthHeaders() Duplicado
**Duplicado em:** Dashboard.tsx, PointsConfiguration.tsx, Settings.tsx
- **Fix:** Usar `getAuthHeaders()` de `client/src/lib/api.ts` (ja existe centralizado)
- Remover copias locais

**Checklist de verificacao da Fase 4:**
- [ ] `grep -r "res.status(" server/routes/` retorna 0 resultados
- [ ] `grep -r "useToast" client/src/` retorna 0 resultados (exceto definicao)
- [ ] `getAuthHeaders` existe apenas em `client/src/lib/api.ts`

---

## FASE 5 - QUEBRAR ARQUIVOS MONOLITICOS (Semanas 5-6)

### 5.1 Settings.tsx (4.002 linhas -> 8 arquivos)
```
client/src/pages/Settings/
  index.tsx              (~100 linhas - wrapper com tabs)
  AccountTab.tsx         (~400 linhas - perfil, avatar, senha)
  PointsTab.tsx          (~300 linhas - usa PointsConfiguration existente)
  NotificationsTab.tsx   (~300 linhas - preferencias de notificacao)
  DistrictsTab.tsx       (~400 linhas - gerenciar distritos)
  PastorsTab.tsx         (~400 linhas - gerenciar pastores, convites)
  ChurchesTab.tsx        (~400 linhas - gerenciar igrejas)
  SystemTab.tsx          (~300 linhas - configuracoes do sistema)
  AppearanceTab.tsx      (~200 linhas - tema)
```

### 5.2 ElectionConfig.tsx (3.155 linhas -> 5 arquivos)
```
client/src/pages/Elections/
  ElectionConfig.tsx     (~200 linhas - wrapper)
  ElectionSetup.tsx      (~500 linhas - configuracao da eleicao)
  PositionManager.tsx    (~500 linhas - gerenciar cargos)
  CandidateManager.tsx   (~500 linhas - gerenciar candidatos)
  VotingConfig.tsx       (~400 linhas - config de votacao)
```

### 5.3 Users.tsx (2.380 linhas -> 5 arquivos)
```
client/src/pages/Users/
  index.tsx              (~200 linhas - wrapper, queries)
  UserFilters.tsx        (~300 linhas - filtros, search, mountain filter)
  UserList.tsx           (~400 linhas - lista, cards)
  UserActions.tsx        (~300 linhas - criar, editar, deletar)
  MountainStats.tsx      (~300 linhas - contagens por monte)
```

### 5.4 Dashboard.tsx (2.045 linhas -> 4 arquivos)
```
client/src/pages/Dashboard/
  index.tsx              (~200 linhas - wrapper, queries consolidadas)
  StatsCards.tsx          (~300 linhas - cards de estatisticas)
  ActivityFeed.tsx       (~300 linhas - feed de atividades)
  QuickActions.tsx       (~200 linhas - acoes rapidas)
```

### 5.5 neonAdapter.ts (3.100+ linhas -> modulos)
- Ja existe plano em `docs/repository-pattern-roadmap.md`
- Continuar migracao gradual para repositories individuais
- Priorizar: userStorage, eventStorage, churchRepository (ja parcialmente migrados)

**Checklist de verificacao da Fase 5:**
- [ ] Nenhum arquivo com mais de 500 linhas
- [ ] `npm run build` compila sem erros
- [ ] Todas as paginas funcionam identicamente apos split
- [ ] Imports atualizados em App.tsx e rotas

---

## FASE 6 - TESTES (Semana 7)

### 6.1 Migrar de Jest para Vitest
- Jest estoura memoria (4GB nao suficiente para este projeto)
- Vitest ja e dependencia do projeto (usado no client)
- Configurar `vitest.config.ts` para server
- Migrar testes existentes de `server/__tests__/`

### 6.2 Adicionar Testes de Seguranca
- Teste: rotas sem auth retornam 401
- Teste: `x-user-id` header nao bypassa JWT
- Teste: pastor nao acessa distrito de outro
- Teste: rate limiting funciona
- Teste: CSRF protection ativa

### 6.3 Adicionar Testes de Performance
- Teste: dashboard unified retorna em < 500ms
- Teste: endpoints com paginacao respeitam limit
- Teste: N+1 queries nao existem (monitorar query count)

**Checklist de verificacao da Fase 6:**
- [ ] `npx vitest run` executa sem erros de memoria
- [ ] Cobertura > 50% nos services
- [ ] Testes de seguranca passando
- [ ] Testes de performance passando

---

## FASE 7 - MELHORIAS DE UX E SEGURANCA RESTANTE (Semanas 8-10)

### 7.1 JWT: localStorage -> HTTP-only Cookie
**Arquivo:** `client/src/hooks/useAuth.ts` (linha 206)
- Remover `localStorage.setItem('7care_token', data.token)`
- Server passa a setar cookie HTTP-only com o token
- Frontend usa `credentials: 'include'` nos fetch
- Access token em memoria (state), refresh token em cookie

### 7.2 Remover Tipos `any`
**Arquivos prioritarios:**
- `UserDetailModal.tsx` (linha 41): `user: any` -> `User`
- `ElectionConfig.tsx` (linha 917, 924): `candidate: any` -> `Candidate`
- Dashboard queries: `useQuery<any[]>` -> tipos especificos

### 7.3 CORS Seguro
**Arquivo:** `server/index.ts` (linha 51)
- Remover default `'*'`: `process.env.ALLOWED_ORIGINS || '*'`
- Substituir por: validacao obrigatoria em producao

### 7.4 Token Expiry
**Arquivo:** `server/config/jwtConfig.ts` (linha 37)
- Reduzir `JWT_EXPIRES_IN` de `24h` para `1h`
- Implementar refresh automatico no frontend

**Checklist de verificacao da Fase 7:**
- [ ] `localStorage.getItem('7care_token')` retorna null (token so em cookie/memoria)
- [ ] `grep -r ": any" client/src/` retorna 0 nos arquivos modificados
- [ ] CORS nao aceita `*` em producao
- [ ] Token expira em 1h e refresh funciona automaticamente

---

## RESUMO DE TODOS OS ARQUIVOS A MODIFICAR

### Fase 1 (Seguranca) - 10 arquivos
- `server/neonConfig.ts`
- `server/middleware/index.ts`
- `server/index.ts`
- `server/routes/relationshipRoutes.ts`
- `server/routes/importRoutes.ts`
- `server/routes/electionRoutes.ts`
- `server/routes/reportsRoutes.ts`
- `server/createSuperAdmin.ts`
- `server/setupNeonData.ts`
- Novo: `server/utils/validateEnv.ts`

### Fase 2 (Dashboard) - 3 arquivos
- `server/routes/dashboardRoutes.ts`
- `client/src/pages/Dashboard.tsx`
- `client/src/lib/queryClient.ts`

### Fase 3 (Performance) - 3+ arquivos
- `server/routes/relationshipRoutes.ts`
- `server/routes/churchRoutes.ts`
- Endpoints de lista diversos

### Fase 4 (Padronizacao) - ~20 arquivos
- ~12 arquivos de rotas (apiResponse migration)
- ~5 arquivos frontend (toast padronizacao)
- 3 arquivos (getAuthHeaders duplicado)

### Fase 5 (Refactoring) - 4 arquivos grandes -> ~22 arquivos menores
- `Settings.tsx` -> 8 arquivos
- `ElectionConfig.tsx` -> 5 arquivos
- `Users.tsx` -> 5 arquivos
- `Dashboard.tsx` -> 4 arquivos

### Fase 6 (Testes) - novos arquivos
- `vitest.config.ts` (server)
- Testes de seguranca e performance

### Fase 7 (UX/Seguranca) - 4+ arquivos
- `client/src/hooks/useAuth.ts`
- `server/config/jwtConfig.ts`
- `server/index.ts`
- Componentes com `any` types

---

## REGRAS PARA EXECUCAO

1. Fazer UMA fase por vez, nunca pular
2. Testar completamente apos cada fase antes de avancar
3. Fazer commit apos cada fase concluida
4. Monitorar producao por 24h apos cada deploy
5. Manter rollback plan pronto (git revert)
6. Nao refatorar mais do que o planejado em cada fase

## COMO TESTAR APOS CADA FASE

1. **Build:** `npm run build` deve compilar sem erros
2. **Testes manuais:** `npx tsx server/__tests__/manual/*.test.ts`
3. **Health check:** `curl http://localhost:5000/health`
4. **Dashboard:** Verificar que cards carregam em < 2 segundos
5. **Seguranca:** `curl -H "x-user-id: 1" /api/users` deve retornar 401
6. **Paginacao:** `curl /api/users?page=1&limit=10` deve respeitar limite
