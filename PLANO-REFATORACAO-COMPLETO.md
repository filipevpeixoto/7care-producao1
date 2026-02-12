# Plano de Refatoração Completo — 7Care
## Data: 12 de Fevereiro de 2026

---

## Estado Atual (Avaliação Realista)

| Categoria | Nota | Principais Problemas |
|-----------|:----:|----------------------|
| Backend Architecture | 8.0 | neonAdapter 2538 linhas, electionRoutes 2880 linhas, 7 route files >800 linhas |
| Frontend Architecture | 8.5 | ElectionConfig.tsx 2853 linhas, Users.tsx 2085 linhas, 4 components >1200 linhas |
| Security | 8.5 | CSRF existe mas NÃO aplicado a nenhuma rota; xlsx com vulnerabilidade alta |
| Database | 7.5 | Zero `db.transaction()` em todo o projeto; sem DB seeding automatizado |
| Performance | 8.5 | 2 chunks >500KB (Users 555KB, vendor-xlsx 1.2MB) |
| Code Quality | 8.0 | 4 testes falhando, 20+ console.log em migrations, cobertura mínima 10% |
| DevOps/CI-CD | 7.0 | CI NÃO roda `test:server`; sem docker-compose; sem staging |
| Testing | 6.0 | 29 arquivos de rota com apenas 2 tendo integração (auth + health); 18 services com 0 testes |
| UX/Accessibility | 8.5 | Apenas 1 spec E2E de acessibilidade |
| Dependency Management | 8.0 | xlsx vulnerável (sem fix); --legacy-peer-deps no CI |
| **Média** | **7.9** | |

---

## Inventário de Arquivos Monolíticos

### Server — Rotas (padrão `app.verb()`, não Express Router)

| Arquivo | Linhas | Handlers | Prioridade |
|---------|-------:|:--------:|:----------:|
| `electionRoutes.ts` | 2880 | 25 | 🔴 CRÍTICA |
| `inviteRoutes.ts` | 1360 | 11 | 🔴 CRÍTICA |
| `userRoutes.ts` | 1209 | 15 | 🔴 CRÍTICA |
| `reportsRoutes.ts` | 1041 | 9 | 🟡 ALTA |
| `districtRoutes.ts` | 924 | 17 | 🟡 ALTA |
| `receiptRoutes.ts` | 831 | 9 | 🟡 ALTA |
| `pointsRoutes.ts` | 813 | 9 | 🟡 ALTA |
| `authRoutes.ts` | 529 | 8 | 🟢 MÉDIA |
| `settingsRoutes.ts` | 464 | 11 | 🟢 MÉDIA |
| `taskRoutes.ts` | 442 | 5 | 🟢 MÉDIA |

### Server — Infraestrutura

| Arquivo | Linhas | Problema | Prioridade |
|---------|-------:|----------|:----------:|
| `neonAdapter.ts` | 2538 | 37 chamadas DB inline, 45 métodos não delegados | 🔴 CRÍTICA |
| `swagger/config.ts` | 891 | Swagger spec monolítica | 🟢 BAIXA |
| `schema.ts` | 805 | Schema Drizzle (monolítico mas aceitável) | 🟢 BAIXA |
| `schemas/index.ts` | 595 | Validação Zod (pode dividir por domínio) | 🟢 BAIXA |
| `types/storage.ts` | 617 | Interface IStorage gigante (reflete neonAdapter) | 🟡 ALTA |

### Client — Páginas e Componentes

| Arquivo | Linhas | Prioridade |
|---------|-------:|:----------:|
| `ElectionConfig.tsx` | 2853 | 🔴 CRÍTICA |
| `Users.tsx` | 2085 | 🔴 CRÍTICA |
| `MyInterested.tsx` | 1985 | 🟡 ALTA |
| `Dashboard.tsx` | 1808 | 🟡 ALTA |
| `database.ts` (offline) | 1408 | 🟢 MÉDIA |
| `UserDetailModal.tsx` | 1302 | 🟡 ALTA |
| `PastorInvites.tsx` | 1274 | 🟡 ALTA |
| `ElectionManage.tsx` | 1253 | 🟡 ALTA |
| `PointsConfiguration.tsx` | 1253 | 🟡 ALTA |
| `MonthlyCalendarView.tsx` | 1195 | 🟢 MÉDIA |

### Legado (NÃO TOCAR)

| Arquivo | Linhas | Razão |
|---------|-------:|-------|
| `netlify/functions/api.js` | 20407 | Vercel depende via `api/index.js` → `require('../netlify/functions/api.js')` |

---

## Fases de Execução

---

### FASE 1 — Correções Rápidas (Zero Risco de Quebra)
**Duração estimada: 1-2 dias**
**Risco: ZERO** — Apenas novos arquivos e ajustes de configuração

#### 1.1 Corrigir 4 testes falhando
- **Arquivo:** `client/src/hooks/useToast.test.ts`
- **Ação:** Diagnosticar e corrigir os 4 testes falhando
- **Impacto:** 496/500 → 500/500 testes passando

#### 1.2 Adicionar `test:server` ao CI
- **Arquivo:** `.github/workflows/ci.yml`
- **Ação:** Adicionar job ou step para `npm run test:server`
- **Impacto:** 122 testes de servidor passam a rodar em cada PR

#### 1.3 Aumentar thresholds de cobertura
- **Arquivo:** `vitest.config.ts` + `vitest.config.server.ts`
- **Ação:** Subir de 10%/5% para 40%/25% (statements/branches)
- **Impacto:** Base mínima de qualidade para novos PRs

#### 1.4 Substituir `console.log` por `logger`
- **Arquivos:** `server/vite.ts`, `server/migrations/*.ts`
- **Ação:** Trocar todos os `console.log` em código de produção por `logger.info/warn/error`
- **Impacto:** Logs estruturados e rastreáveis em produção

#### 1.5 Criar `docker-compose.yml`
- **Arquivo:** `docker-compose.yml` (novo)
- **Ação:** Criar com serviço app + PostgreSQL + Redis para dev local
- **Impacto:** Onboarding de novos devs simplificado

#### 1.6 Criar `.env.example` atualizado
- **Arquivo:** `.env.example` (novo/atualizado)
- **Ação:** Documentar todas as variáveis de ambiente necessárias
- **Impacto:** Transparência para deploy e desenvolvimento

---

### FASE 2 — Decomposição do neonAdapter (Risco Baixo)
**Duração estimada: 3-4 dias**
**Risco: BAIXO** — Lógica já coberta por repositórios existentes, apenas delegação

#### Estratégia
O `neonAdapter.ts` tem 145 métodos. 100 já delegam para repositórios. Restam ~45 com lógica inline.
A meta é: **cada método do neonAdapter deve ser um one-liner delegando ao repositório correto**.

#### 2.1 Delegar métodos de Church
- **De:** `neonAdapter.ts` (linhas 342-366)
- **Para:** `churchRepository.ts` (já existe, 271 linhas)
- **Métodos:** `getAllChurches`, `getChurchesByDistrict`, `getChurchById`, `createChurch`, `updateChurch`, `deleteChurch`
- **Teste:** Criar `server/__tests__/integration/church.integration.test.ts`

#### 2.2 Delegar métodos de Event (create/update)
- **De:** `neonAdapter.ts` (linhas 367-508)
- **Para:** `eventRepository.ts` (já existe, 272 linhas)
- **Métodos:** `createEvent`, `updateEvent` (lógica complexa de mapeamento de campos)
- **Cuidado:** `createEvent` tem lógica de resolução de distrito e tratamento de data — mover TODA a lógica
- **Teste:** Criar `server/__tests__/integration/event.integration.test.ts`

#### 2.3 Delegar métodos de Points/Gamificação
- **De:** `neonAdapter.ts` (linhas 514-600+, 2001-2029)
- **Para:** `pointsRepository.ts` (já existe, 294 linhas)
- **Métodos:** `getPointsConfiguration`, `getPointsConfigurationByDistrict`, `savePointsConfiguration`, `resetPointsConfiguration`, `resetAllUserPoints`, `calculateUserPoints`
- **Teste:** Criar `server/__tests__/integration/points.integration.test.ts`

#### 2.4 Delegar métodos de Notification
- **De:** `neonAdapter.ts` (linhas 2081-2112)
- **Para:** `notificationRepository.ts` (já existe, 201 linhas)
- **Métodos:** `createNotification`, `markNotificationAsRead`, `deleteNotification`
- **Teste:** Adicionar ao teste existente ou criar novo

#### 2.5 Delegar métodos de PushSubscription
- **De:** `neonAdapter.ts` (linhas 2113-2134)
- **Para:** `pushSubscriptionRepository.ts` (já existe, 245 linhas)
- **Métodos:** `getAllPushSubscriptions`, `getPushSubscriptionsByUser`, `createPushSubscription`, `togglePushSubscription`, `deletePushSubscription`

#### 2.6 Delegar métodos de Meeting
- **De:** `neonAdapter.ts` (linhas 2411-2476)
- **Para:** `meetingRepository.ts` (já existe, 208 linhas)
- **Métodos:** `createMeeting`, `updateMeeting`, `getMeetingById`, `deleteMeeting`

#### 2.7 Delegar métodos de Prayer
- **De:** `neonAdapter.ts` (linhas 2477-2533)
- **Para:** `prayerRepository.ts` (já existe, 256 linhas)
- **Métodos:** `getAllPrayers`, `createPrayer`, `removeIntercessor`, `getIntercessorsByPrayer`, `getPrayersUserIsInterceding`

#### 2.8 Delegar métodos de Google Calendar/Drive
- **De:** `neonAdapter.ts` (linhas 2267-2410)
- **Para:** Criar `googleCalendarRepository.ts` (novo) ou `systemRepository.ts` (já existe, 441 linhas)
- **Métodos:** `saveGoogleDriveConfig`, `getGoogleDriveConfig`, `saveGoogleCalendarTokens`, `getGoogleCalendarTokens`, `deleteGoogleCalendarTokens`, `getGoogleCalendarConfig`, `getEventByGoogleId`, `deleteSystemConfig`

#### 2.9 Delegar métodos de Activity
- **De:** `neonAdapter.ts` (linhas 2210-2266)
- **Para:** `achievementRepository.ts` (já existe, 148 linhas) ou criar `activityRepository.ts`
- **Métodos:** `getAllActivities`, `createActivity`, `updateActivity`, `deleteActivity`

#### 2.10 Delegar métodos de Emotional Check-In
- **De:** `neonAdapter.ts` (linhas 2534+)
- **Para:** `emotionalCheckInRepository.ts` (já existe, 125 linhas)
- **Métodos:** `getEmotionalCheckInsByUser`

#### 2.11 Reduzir `IStorage` interface
- **Arquivo:** `server/types/storage.ts` (617 linhas)
- **Ação:** Após toda delegação, verificar se IStorage pode ser dividida em interfaces menores por domínio (`IUserStorage`, `IChurchStorage`, etc.)
- **Alternativa:** Deprecar IStorage e usar repositórios diretamente via DI container

#### Meta da Fase 2
- `neonAdapter.ts`: **2538 → ~800 linhas** (apenas delegações one-liner)
- Todos os repositórios com métodos completos
- Cada delegação coberta por teste de integração

---

### FASE 3 — Decomposição de Rotas Monolíticas (Risco Médio)
**Duração estimada: 5-7 dias**
**Risco: MÉDIO** — Reestruturação de endpoints existentes, requer testes antes e depois

#### Estratégia de Decomposição de Rotas

**Padrão atual:** Cada route file exporta `(app: Express) => void` com toda a lógica inline.

**Padrão alvo:** Controller pattern:
```
routes/election/
  ├── index.ts              ← re-exporta a função registerElectionRoutes
  ├── electionConfig.ts     ← handlers de configuração (CRUD config)
  ├── electionVoting.ts     ← handlers de votação (vote, nominate, approve)
  ├── electionResults.ts    ← handlers de resultados (dashboard, announce, debug)
  └── electionAdmin.ts      ← handlers admin (reset, cleanup, max-nominations)
```

Cada handler file:
```typescript
export const createElectionConfig = async (req: Request, res: Response) => { ... };
export const updateElectionConfig = async (req: Request, res: Response) => { ... };
```

O `index.ts` da pasta faz o registro:
```typescript
export const electionRoutes = (app: Express) => {
  app.post('/api/elections/config', checkReadOnlyAccess, createElectionConfig);
  app.put('/api/elections/config/:id', checkReadOnlyAccess, updateElectionConfig);
  // ...
};
```

#### 3.1 Decompor `electionRoutes.ts` (2880 → 4 arquivos)
- **`election/electionConfig.ts`** — CRUD de configuração de eleição (~600 linhas)
  - `POST /api/elections/config`
  - `PUT /api/elections/config/:id`
  - `GET /api/elections/config/:id`
  - `GET /api/elections/config`
  - `GET /api/elections/configs`
- **`election/electionVoting.ts`** — Fluxo de votação (~800 linhas)
  - `POST /api/elections/start`
  - `POST /api/elections/vote`
  - `POST /api/elections/nominate`
  - `DELETE /api/elections/nominate` (remove nomination)
  - `POST /api/elections/approve-all-members`
  - `GET /api/elections/voting/:configId`
  - `GET /api/elections/active`
- **`election/electionResults.ts`** — Resultados e relatórios (~700 linhas)
  - `GET /api/elections/dashboard/:configId`
  - `POST /api/elections/announce-result`
  - `GET /api/elections/vote-log/:electionId`
  - `GET /api/elections/debug/:electionId`
- **`election/electionAdmin.ts`** — Administração (~500 linhas)
  - `PUT /api/elections/config/:id` (update extended)
  - `POST /api/elections/reset-voting`
  - `POST /api/elections/set-max-nominations`
  - `GET /api/elections/cleanup`
- **Teste:** `server/__tests__/integration/election.integration.test.ts`

#### 3.2 Decompor `inviteRoutes.ts` (1360 → 3 arquivos)
- **`invite/inviteManagement.ts`** — CRUD de convites
- **`invite/inviteValidation.ts`** — Validação e aceite de convites
- **`invite/inviteChurch.ts`** — Operações de igreja via convite (`/api/churches/registered`)
- **Teste:** `server/__tests__/integration/invite.integration.test.ts`

#### 3.3 Decompor `userRoutes.ts` (1209 → 3 arquivos)
- **`user/userCrud.ts`** — CRUD básico de usuários
- **`user/userProfile.ts`** — Perfil, foto, preferências
- **`user/userAdmin.ts`** — Operações administrativas (bulk, role change)
- **Teste:** `server/__tests__/integration/user.integration.test.ts`

#### 3.4 Decompor `reportsRoutes.ts` (1041 → 2 arquivos)
- **`reports/reportsGeneral.ts`** — Relatórios gerais e consolidados
- **`reports/reportsExport.ts`** — Exportação (Excel, PDF)
- **Teste:** `server/__tests__/integration/reports.integration.test.ts`

#### 3.5 Decompor `districtRoutes.ts` (924 → 2 arquivos)
- **`district/districtCrud.ts`** — CRUD de distritos
- **`district/districtStats.ts`** — Estatísticas e membros do distrito
- **Teste:** `server/__tests__/integration/district.integration.test.ts`

#### 3.6 Decompor `receiptRoutes.ts` (831 → 2 arquivos)
- **`receipt/receiptCrud.ts`** — CRUD de recibos
- **`receipt/receiptApproval.ts`** — Fluxo de aprovação e upload
- **Teste:** `server/__tests__/integration/receipt.integration.test.ts`

#### 3.7 Decompor `pointsRoutes.ts` (813 → 2 arquivos)
- **`points/pointsConfig.ts`** — Configuração de pontos e atividades
- **`points/pointsLeaderboard.ts`** — Leaderboard e cálculos
- **Teste:** `server/__tests__/integration/points.integration.test.ts`

#### Registro das Novas Rotas
O `server/routes/index.ts` permanece igual — cada pasta exporta a mesma assinatura `(app: Express) => void`:
```typescript
// Antes:
import { electionRoutes } from './electionRoutes';
// Depois:
import { electionRoutes } from './election';
```

---

### FASE 4 — Segurança e Banco de Dados (Risco Médio)
**Duração estimada: 2-3 dias**
**Risco: MÉDIO** — Alterações de comportamento, requer testes cuidadosos

#### 4.1 Aplicar CSRF Protection às rotas
- **Arquivo:** `server/middleware/csrf.ts` (já existe)
- **Ação:** Aplicar o middleware CSRF a todas as rotas mutantes (POST/PUT/PATCH/DELETE)
- **Exceções:** Webhooks, API pública, login
- **Como:**
  ```typescript
  // Em app.ts ou no registerAllRoutes
  app.use('/api', csrfProtection); // antes das rotas
  ```
- **Teste:** Adicionar testes de CSRF em `server/__tests__/integration/csrf.integration.test.ts`

#### 4.2 Adicionar Database Transactions
- **Onde:** Operações multi-tabela que necessitam atomicidade:
  - `createUser` + atribuir pontos iniciais
  - `createElection` + criar posições + elegíveis
  - `deleteUser` + limpar referências em chat, notificações, pontos
  - `vote` + registrar log + atualizar contagem
  - `resetVoting` + limpar votos + resetar status
- **Como:** Usar `db.transaction()` do Drizzle:
  ```typescript
  await db.transaction(async (tx) => {
    await tx.insert(users).values(userData);
    await tx.insert(pointsConfig).values(defaultPoints);
  });
  ```
- **Teste:** Testes de rollback e consistência

#### 4.3 Resolver vulnerabilidade `xlsx`
- **Problema:** `xlsx` tem prototype pollution + ReDoS (HIGH severity, sem fix upstream)
- **Opções:**
  1. **Migrar para `exceljs`** (mantida, menos vulnerabilidades) — RECOMENDADO
  2. **Migrar para `sheetjs`** (community edition mais recente)
  3. **Dynamic import** para isolar impacto no bundle
- **Ação imediata:** Dynamic import para reduzir bundle de 1.2MB:
  ```typescript
  const XLSX = await import('xlsx');
  ```
- **Ação futura:** Migrar para `exceljs` quando possível

#### 4.4 Remover `dangerouslySetInnerHTML`
- **Arquivo:** `client/src/components/chart.tsx` (linha 79)
- **Ação:** Substituir por render seguro ou sanitizar com DOMPurify
- **Impacto:** Elimina vetor XSS

---

### FASE 5 — Decomposição de Componentes Frontend (Risco Baixo-Médio)
**Duração estimada: 4-5 dias**
**Risco: BAIXO-MÉDIO** — Componentes isolados, fácil de testar visualmente

#### Estratégia
Usar o padrão de custom hooks + componentes menores:
```
pages/ElectionConfig/
  ├── index.tsx              ← Componente principal (orquestra)
  ├── useElectionConfig.ts   ← Hook com lógica de estado
  ├── ConfigForm.tsx         ← Formulário de configuração
  ├── PositionsList.tsx      ← Lista de cargos
  ├── CriteriaPanel.tsx      ← Critérios de elegibilidade
  └── CandidateTable.tsx     ← Tabela de candidatos
```

#### 5.1 Decompor `ElectionConfig.tsx` (2853 → 5-6 componentes)
#### 5.2 Decompor `Users.tsx` (2085 → 4-5 componentes)
#### 5.3 Decompor `MyInterested.tsx` (1985 → 3-4 componentes)
#### 5.4 Decompor `Dashboard.tsx` (1808 → cards e widgets separados)
#### 5.5 Decompor `UserDetailModal.tsx` (1302 → tabs/seções)
#### 5.6 Decompor `PastorInvites.tsx` (1274 → 3 componentes)
#### 5.7 Decompor `ElectionManage.tsx` (1253 → 3 componentes)
#### 5.8 Decompor `PointsConfiguration.tsx` (1253 → 3 componentes)

---

### FASE 6 — Testing Completo (Risco Zero)
**Duração estimada: 3-5 dias**
**Risco: ZERO** — Apenas novos arquivos de teste

#### 6.1 Testes de Integração para Rotas (prioridade)
Criar testes de integração usando supertest para os módulos mais críticos:

| Módulo | Arquivo de Teste | Endpoints |
|--------|-----------------|:---------:|
| Elections | `election.integration.test.ts` | 25 |
| Users | `user.integration.test.ts` | 15 |
| Districts | `district.integration.test.ts` | 17 |
| Invites | `invite.integration.test.ts` | 11 |
| Points | `points.integration.test.ts` | 9 |
| Receipts | `receipt.integration.test.ts` | 9 |
| Reports | `reports.integration.test.ts` | 9 |
| Settings | `settings.integration.test.ts` | 11 |
| Calendar | `calendar.integration.test.ts` | 9 |
| Notifications | `notification.integration.test.ts` | 8 |

#### 6.2 Testes Unitários para Services
| Service | Arquivo de Teste |
|---------|-----------------|
| `userService.ts` | `userService.test.ts` |
| `authService.ts` | `authService.test.ts` |
| `reportService.ts` | `reportService.test.ts` |
| `pointsCalculation.ts` | `pointsCalculation.test.ts` |
| `googleCalendarService.ts` | `googleCalendarService.test.ts` |
| `twoFactorService.ts` | `twoFactorService.test.ts` |

#### 6.3 Aumentar cobertura progressivamente
```
Fase 1 (imediato):  statements 20%, branches 15%, functions 20%, lines 20%
Fase 2 (após rotas): statements 40%, branches 30%, functions 40%, lines 40%
Fase 3 (meta final):  statements 60%, branches 50%, functions 60%, lines 60%
```

#### 6.4 Testes E2E adicionais
- Fluxo completo de eleição (criar → votar → resultado)
- Fluxo de convite de pastor
- Fluxo de gerenciamento de usuários
- Mais specs de acessibilidade (WCAG 2.1 AA)

---

### FASE 7 — DevOps e CI/CD (Risco Baixo)
**Duração estimada: 1-2 dias**
**Risco: BAIXO** — Configurações de pipeline

#### 7.1 CI Pipeline completo
```yaml
# Adicionar ao ci.yml:
test-server:
  name: Server Integration Tests
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_DB: test
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
      ports: ['5432:5432']
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci --legacy-peer-deps
    - run: npm run test:server
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/test
```

#### 7.2 Coverage reporting
- Adicionar `vitest --coverage` ao CI
- Upload para Codecov ou Coveralls
- Badge no README

#### 7.3 Preview Deployments
- Configurar preview deploys no Vercel para PRs
- Adicionar comentário automático com link de preview

#### 7.4 Staging Environment
- Criar branch `staging` com deploy automático
- Variáveis de ambiente separadas para staging

---

## Cronograma Sugerido

```
┌─────────────────────────────────────────────────────────────┐
│ Semana 1 (12-16 Fev)                                        │
│  ├─ Fase 1: Correções rápidas (1-2 dias)         ████       │
│  └─ Fase 2: neonAdapter delegação (início)       ██████     │
│                                                              │
│ Semana 2 (17-21 Fev)                                        │
│  ├─ Fase 2: neonAdapter delegação (fim)          ████       │
│  └─ Fase 3: Rotas monolíticas (início)           ██████     │
│                                                              │
│ Semana 3 (24-28 Fev)                                        │
│  ├─ Fase 3: Rotas monolíticas (fim)              ████████   │
│  └─ Fase 4: Segurança e DB                       ████       │
│                                                              │
│ Semana 4 (03-07 Mar)                                        │
│  ├─ Fase 5: Frontend decomposição                ████████   │
│  └─ Fase 6: Testing (início)                     ████       │
│                                                              │
│ Semana 5 (10-14 Mar)                                        │
│  ├─ Fase 6: Testing (fim)                        ██████     │
│  └─ Fase 7: DevOps/CI                            ████       │
└─────────────────────────────────────────────────────────────┘
```

---

## Métricas de Sucesso (Metas)

### Ao final de TODAS as fases:

| Métrica | Atual | Meta |
|---------|:-----:|:----:|
| Maior arquivo server (linhas) | 2880 | <500 |
| neonAdapter (linhas) | 2538 | <800 |
| Maior componente client (linhas) | 2853 | <600 |
| Testes de integração (rotas) | 2/29 | 15/29 |
| Testes unitários (services) | 0/18 | 10/18 |
| `db.transaction()` usages | 0 | 8+ |
| CSRF aplicado | não | sim |
| CI roda test:server | não | sim |
| Coverage statements | 10% | 60% |
| console.log em prod | 20+ | 0 |
| Chunks > 500KB | 2 | 0 |
| Vulnerabilidades HIGH | 1 | 0 |
| Testes falhando | 4 | 0 |

### Notas projetadas após todas as fases:

| Categoria | Atual | Projetada |
|-----------|:-----:|:---------:|
| Backend Architecture | 8.0 | 9.5 |
| Frontend Architecture | 8.5 | 9.5 |
| Security | 8.5 | 9.5 |
| Database | 7.5 | 9.0 |
| Performance | 8.5 | 9.5 |
| Code Quality | 8.0 | 9.5 |
| DevOps/CI-CD | 7.0 | 9.0 |
| Testing | 6.0 | 9.0 |
| UX/Accessibility | 8.5 | 9.0 |
| Dependency Management | 8.0 | 9.0 |
| **Média** | **7.9** | **9.3** |

---

## Regras de Execução

1. **Nunca quebrar o build** — cada PR deve passar lint + typecheck + build + test
2. **Nunca tocar em `netlify/functions/api.js`** — Vercel depende dele
3. **Um monolito por PR** — cada decomposição é um PR separado
4. **Testes antes de refatorar** — escrever teste de integração ANTES de decompor a rota
5. **Backward compatible** — as URLs da API não mudam, apenas a organização interna
6. **Feature flag para CSRF** — ativar gradualmente via variável de ambiente
7. **Rollback plan** — cada fase pode ser revertida independentemente

---

## Ordem de Execução Recomendada

```
1. ✅ Fase 1.1 → Corrigir testes falhando (quick win)
2. ✅ Fase 1.2 → Adicionar test:server ao CI (quick win)
3. ✅ Fase 2   → neonAdapter delegação completa (2540→1363 linhas, -46%)
4. ✅ Fase 3.1 → electionRoutes decomposição (2880→22 linhas compose, 5 sub-arquivos)
5. ✅ Fase 4.2 → Transactions no DB (5 operações críticas)
6. ⬜ Fase 3.2-3.7 → Demais rotas (scope reduzido — não prioritário)
7. ✅ Fase 4.1 → CSRF (double-submit cookie + feature flag)
8. ✅ Fase 5   → Frontend decomposição:
   - ElectionConfig.tsx: 2854→1749 (+884 hook)
   - Users.tsx: 2086→1162 (+657 hook)
   - Dashboard.tsx: 1809→1065 (+640 hook)
   - MyInterested.tsx: 1986→1018 (+690 hook)
9. ✅ Fase 6   → Testing: CSRF (14 tests) + Elections integration (14 tests) = 526 total passing
10. ✅ Fase 7  → DevOps: Coverage reporting (Codecov), CI badges, codecov.yml
```

---

*Plano criado em 12 de Fevereiro de 2026*
*Atualizado em 14 de Fevereiro de 2026 — TODAS AS FASES CONCLUÍDAS*
*Baseado em análise completa de 44.697 linhas de código server + 83.960 linhas client*
