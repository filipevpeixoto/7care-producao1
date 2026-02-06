# Repository Pattern - Roadmap de Implementação

## Status Atual

### ✅ Repositórios Existentes (18)
- ✅ BaseRepository - classe base com métodos comuns
- ✅ achievementRepository
- ✅ auditRepository
- ✅ churchRepository
- ✅ districtRepository
- ✅ electionRepository
- ✅ eventRepository
- ✅ meetingRepository
- ✅ messageRepository
- ✅ notificationRepository
- ✅ pointsRepository
- ✅ prayerRepository
- ✅ pushSubscriptionRepository
- ✅ relationshipRepository
- ✅ systemRepository
- ✅ userRepository

### ❌ Rotas que ainda usam NeonAdapter diretamente (22/35 = 63%)

#### Críticas (alta prioridade)
- ❌ authRoutes.ts - autenticação e sessões
- ❌ userRoutes.ts - CRUD de usuários
- ❌ electionRoutes.ts - eleições

#### Moderadas (média prioridade)
- ❌ churchRoutes.ts - igrejas
- ❌ districtRoutes.ts - distritos
- ❌ pointsRoutes.ts - gamificação
- ❌ reportsRoutes.ts - relatórios
- ❌ dashboardRoutes.ts - dashboard

#### Baixas (baixa prioridade)
- ❌ spiritualRoutes.ts
- ❌ systemRoutes.ts
- ❌ settingsRoutes.ts
- ❌ messagingRoutes.ts
- ❌ inviteRoutes.ts
- ❌ discipleshipRoutes.ts
- ❌ debugRoutes.ts
- ❌ relationshipRoutes.ts
- ❌ notificationRoutes.ts
- ❌ calendarRoutes.ts
- ❌ meetingRoutes.ts
- ❌ prayerRoutes.ts
- ❌ eventRoutes.ts
- ❌ googleCalendarRoutes.ts

## Benefícios do Repository Pattern

### 1. **Separação de Responsabilidades**
- Lógica de acesso a dados isolada
- Rotas focadas apenas em lógica de negócio
- Facilita testes unitários

### 2. **Manutenibilidade**
- Mudanças no banco de dados afetam apenas os repositories
- Código mais organizado e legível
- Reduz duplicação de código

### 3. **Testabilidade**
- Repositories podem ser facilmente mockados
- Testes de rotas sem dependência do banco
- Maior cobertura de testes

## Estratégia de Migração Gradual

### Fase 1: Rotas Críticas (1-2 semanas)
1. **authRoutes.ts** - criar AuthRepository
   - Métodos: login, register, validateSession, logout
   - Impacto: Alto (base do sistema)
   - Risco: Alto (testar muito bem)

2. **userRoutes.ts** - expandir UserRepository
   - Adicionar métodos faltantes
   - Migrar todas as queries diretas
   - Impacto: Alto
   - Risco: Médio

3. **electionRoutes.ts** - usar ElectionRepository existente
   - Repository já existe, apenas migrar as rotas
   - Impacto: Médio
   - Risco: Baixo

### Fase 2: Rotas Moderadas (2-3 semanas)
4. Migrar churchRoutes.ts → ChurchRepository (já existe)
5. Migrar districtRoutes.ts → DistrictRepository (já existe)
6. Migrar pointsRoutes.ts → PointsRepository (já existe)
7. Migrar reportsRoutes.ts → criar ReportsRepository
8. Migrar dashboardRoutes.ts → usar repositories existentes

### Fase 3: Rotas de Baixa Prioridade (conforme necessário)
9. Migrar rotas restantes uma por uma
10. Testar extensivamente cada migração
11. Monitorar erros em produção

## Padrão de Migração

### Antes (usando NeonAdapter diretamente)
```typescript
router.get('/users', async (req, res) => {
  const storage = new NeonAdapter();
  const users = await sql`SELECT * FROM users`;
  res.json(users);
});
```

### Depois (usando Repository)
```typescript
router.get('/users', async (req, res) => {
  const userRepo = new UserRepository();
  const users = await userRepo.findAll();
  sendSuccess(res, users);
});
```

## Checklist por Rota

Para cada rota migrada, seguir:

1. [ ] Identificar todas as queries SQL diretas
2. [ ] Verificar se o repository existe
3. [ ] Se não existir, criar repository com interface
4. [ ] Adicionar métodos necessários ao repository
5. [ ] Substituir queries diretas por chamadas ao repository
6. [ ] Adicionar testes unitários para o repository
7. [ ] Testar a rota manualmente
8. [ ] Executar testes E2E
9. [ ] Fazer commit com mensagem clara
10. [ ] Deploy em staging e testar
11. [ ] Monitorar logs por 24h

## Repositórios a Criar

### AuthRepository (alta prioridade)
```typescript
interface IAuthRepository {
  login(email: string, password: string): Promise<User | null>;
  register(data: RegisterData): Promise<User>;
  validateSession(sessionId: string): Promise<User | null>;
  logout(sessionId: string): Promise<void>;
  updateLastLogin(userId: number): Promise<void>;
}
```

### ReportsRepository (média prioridade)
```typescript
interface IReportsRepository {
  getMembersReport(filters: ReportFilters): Promise<MembersReport>;
  getAttendanceReport(filters: ReportFilters): Promise<AttendanceReport>;
  getFinancialReport(filters: ReportFilters): Promise<FinancialReport>;
  getDashboardStats(districtId?: number): Promise<DashboardStats>;
}
```

## Riscos e Mitigações

### Risco 1: Quebrar funcionalidades existentes
**Mitigação:**
- Testes E2E extensivos antes e depois
- Deploy gradual (staging → produção)
- Rollback plan preparado
- Monitoramento de erros

### Risco 2: Performance degradada
**Mitigação:**
- Benchmarks antes e depois
- Queries otimizadas nos repositories
- Cache onde apropriado
- Monitorar tempos de resposta

### Risco 3: Inconsistências de dados
**Mitigação:**
- Transações onde necessário
- Validação de dados no repository
- Testes de integração
- Logs detalhados

## Métricas de Sucesso

- [ ] 100% das rotas usando repositories
- [ ] 0 queries SQL diretas nas rotas
- [ ] Cobertura de testes >80% nos repositories
- [ ] Tempo de resposta mantido ou melhorado
- [ ] 0 bugs críticos introduzidos

## Timeline Estimado

- **Fase 1:** 1-2 semanas (rotas críticas)
- **Fase 2:** 2-3 semanas (rotas moderadas)
- **Fase 3:** 3-4 semanas (rotas baixa prioridade)
- **Total:** 6-9 semanas para migração completa

## Recomendação

**NÃO migrar tudo de uma vez!** Fazer de forma incremental:

1. Começar com 1 rota por semana
2. Testar muito bem cada migração
3. Monitorar produção após cada deploy
4. Documentar learnings e ajustar processo

Isso garante que nenhuma funcionalidade seja quebrada e permite rollback fácil se necessário.
