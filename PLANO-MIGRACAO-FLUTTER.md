# PLANO COMPLETO DE MIGRAÇÃO: React para Flutter
## 7Care App - Documento de Referência

> Versão: 1.0 | Atualizado: Fevereiro 2026
> Alinhado com: COPILOT_INSTRUCTIONS.md

---

# PARTE 0: PRINCÍPIOS OBRIGATÓRIOS (FLUTTER)

> Estes princípios são equivalentes aos definidos em `COPILOT_INSTRUCTIONS.md` para o projeto React, adaptados para Flutter/Dart.

## 🎯 PAPEL

O desenvolvedor deve atuar como **desenvolvedor full stack sênior**, aplicando os mesmos padrões de qualidade do projeto React original.

---

## ⚡ PRINCÍPIOS DE CÓDIGO DART

### Código

- [ ] **Dart null safety** sempre habilitado (equivalente a TypeScript strict)
- [ ] **Nenhum `dynamic`** em campos de classes - use tipos explícitos ou generics
  - ⚠️ **Exceção**: `Map<String, dynamic>` em métodos `fromJson()` é necessário para json_serializable/freezed
- [ ] **Funções pequenas** (máx 30 linhas)
- [ ] **Nomes em inglês** para código, **PT-BR para UI** (labels, mensagens)
- [ ] **Early return** para evitar nesting
- [ ] **final** por padrão, **var** quando necessário

```dart
// ✅ BOM
Future<Either<Failure, User>> getUser(String id) async {
  if (id.isEmpty) return Left(ValidationFailure('ID inválido'));

  final result = await _repository.findById(id);
  return result;
}

// ❌ RUIM
Future<dynamic> getUser(id) async {
  if (id != null && id != '') {
    var result = await _repository.findById(id);
    if (result != null) {
      return result;
    }
  }
  return null;
}
```

### Segurança

- [ ] Validar TODOS os inputs (usar `formz` ou validators customizados)
- [ ] Sanitizar dados antes de enviar ao backend
- [ ] Tokens em `flutter_secure_storage` (NUNCA SharedPreferences)
- [ ] Nunca logar dados sensíveis
- [ ] Tratar todos os erros com try/catch

### Performance

- [ ] **BLoC** para gerenciamento de estado (cache via state)
- [ ] **Hive** para cache local persistente
- [ ] Evitar rebuilds com `BlocSelector`, `const` widgets
- [ ] Lazy loading de páginas com `go_router`
- [ ] Paginação em listagens (máx 50 itens por página)
- [ ] Imagens com `cached_network_image`

---

## 📐 PADRÕES ARQUITETURAIS (EQUIVALÊNCIAS)

| React (Original) | Flutter (Migração) |
|------------------|-------------------|
| Repository Pattern | Repository Pattern ✅ |
| Service Layer | UseCases + Services ✅ |
| DI (manual) | GetIt + Injectable ✅ |
| Clean Architecture | Clean Architecture ✅ |
| React Query (cache) | BLoC + Hive ✅ |
| Zod (validação) | Formz + Validators ✅ |
| TypeScript strict | Dart null safety ✅ |

---

## 🔄 FLUXO DE TRABALHO

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  ENTENDER   │───▶│  PLANEJAR   │───▶│  VALIDAR    │
│  o problema │    │  solução    │    │  com user   │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
┌─────────────┐    ┌─────────────┐    ┌─────▼───────┐
│  ITERAR     │◀───│  REVISAR    │◀───│ IMPLEMENTAR │
│  melhorias  │    │  código     │    │  código     │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Antes de Codar

1. **Entenda** - Qual problema estamos resolvendo?
2. **Pesquise** - Já existe widget/package similar?
3. **Planeje** - Quais arquivos serão afetados?
4. **Valide** - O plano faz sentido?

### Durante o Código

5. **Implemente** - Código limpo, tipado, testável
6. **Revise** - Bugs? Edge cases? Performance?
7. **Teste** - Widget tests, BLoC tests

### Depois

8. **Documente** - Dartdoc em classes públicas
9. **Sugira** - Próximos passos e melhorias

---

## 🚫 COMPORTAMENTO PROIBIDO

| Não Faça | Faça Isso |
|----------|-----------|
| Código com `dynamic` | Dart null safety sempre |
| `print()` em prod | Use `logger` ou `debugPrint` |
| Ignorar erros | Try/catch com tratamento |
| Tokens em SharedPreferences | `flutter_secure_storage` |
| Secrets no código | Variáveis de ambiente |
| Widgets monolíticos | Componentes pequenos e reutilizáveis |
| setState em tudo | BLoC para estado complexo |

---

## 🧪 TESTES (OBRIGATÓRIO)

### Quando Criar

- [ ] Nova feature → Widget test + BLoC test
- [ ] Bug fix → Teste que reproduz o bug
- [ ] Lógica complexa → Unit tests
- [ ] Fluxo crítico → Integration test

### Estrutura

```
test/
├── fixtures/           → Dados de teste (JSON mocks)
├── mocks/              → Mocks de repositories/services
├── unit/               → Testes unitários (usecases, services)
├── bloc/               → Testes de BLoCs
├── widget/             → Testes de widgets
└── integration/        → Testes de integração
```

### Comandos

```bash
flutter test                    # Todos os testes
flutter test --coverage         # Com coverage
flutter test test/bloc/         # Apenas BLoCs
```

---

## 🔍 CHECKLIST DE REVISÃO FLUTTER

### Funcionalidade

- [ ] Resolve o problema solicitado?
- [ ] Funciona em casos de borda?
- [ ] Funciona offline?
- [ ] Não quebra funcionalidades existentes?

### Qualidade

- [ ] Código tipado sem `dynamic`?
- [ ] Widgets com responsabilidade única?
- [ ] Nomes claros e consistentes?
- [ ] Sem código duplicado?
- [ ] Funções com máx 30 linhas?

### Segurança

- [ ] Inputs validados?
- [ ] Sem dados sensíveis em logs?
- [ ] Tokens em secure storage?

### Performance

- [ ] Evita rebuilds desnecessários?
- [ ] Usa `const` onde possível?
- [ ] Cache implementado (Hive)?
- [ ] Imagens otimizadas?

---

## 📋 FORMATO DE RESPOSTA (Para Tarefas Complexas)

```markdown
### 📌 Entendimento
> Resumo do problema em 1-2 frases

### 🎯 Escopo
> Arquivos afetados e impacto

### 🧠 Plano
> Passos numerados da implementação

### 💻 Implementação
> Código com explicações inline

### 🔍 Revisão
> Trade-offs, riscos e alternativas

### ✅ Validação
> Como testar a mudança

### ➕ Próximos Passos
> Melhorias futuras sugeridas
```

---

## 📖 REFERÊNCIAS DO PROJETO FLUTTER

| Recurso | Localização |
|---------|-------------|
| Entities | `lib/domain/entities/` |
| Repositories | `lib/domain/repositories/` |
| UseCases | `lib/domain/usecases/` |
| BLoCs | `lib/presentation/blocs/` |
| Pages | `lib/presentation/pages/` |
| Widgets | `lib/presentation/widgets/` |
| Models (JSON) | `lib/data/models/` |
| DataSources | `lib/data/datasources/` |
| Core (Network, Storage) | `lib/core/` |
| Services | `lib/services/` |

---

# PARTE 1: ANÁLISE DO PROJETO ATUAL

## 1.1 Estrutura do Frontend React

### Páginas (30 páginas em `/client/src/pages/`)

| Página | Linhas | Complexidade | Funcionalidade |
|--------|--------|--------------|----------------|
| **Settings.tsx** | 3916 | Extrema | 13 abas de configurações |
| **ElectionConfig.tsx** | 3118 | Extrema | Configuração de eleições |
| **Users.tsx** | 2123 | Muito Alta | Gestão de usuários |
| **Dashboard.tsx** | 2020 | Muito Alta | KPIs, aniversários, visitômetro |
| **Tasks.tsx** | 1367 | Alta | Lista de tarefas |
| **MyInterested.tsx** | 1336 | Alta | Relacionamentos/discipulado |
| **Reports.tsx** | 1277 | Alta | Relatórios diversos |
| **PastorInvites.tsx** | 1271 | Alta | Convites de pastores |
| **ElectionManage.tsx** | 1253 | Alta | Gerenciar eleição ativa |
| **ElectionVotingMobile.tsx** | 1069 | Alta | Votação mobile |
| **Districts.tsx** | 901 | Alta | Gestão de distritos |
| **PushNotifications.tsx** | 851 | Média | Notificações push |
| **PastorOnboarding.tsx** | ~700 | Média | Onboarding 8 steps |
| **Pastors.tsx** | ~700 | Média | Gestão de pastores |
| **MeuCadastro.tsx** | ~700 | Média | Editar perfil |
| **Prayers.tsx** | ~700 | Média | Pedidos de oração |
| **Calendar.tsx** | 665 | Média | Calendário mensal |
| **UnifiedElection.tsx** | 654 | Média | Visualização unificada |
| **Gamification.tsx** | ~600 | Média | Sistema de pontos |
| **ElectionResults.tsx** | ~500 | Média | Resultados |
| **NotificationsHistory.tsx** | ~500 | Média | Histórico |
| **Interested.tsx** | ~400 | Média | Interessados |
| **ElectionVoting.tsx** | ~400 | Média | Votação desktop |
| **Menu.tsx** | ~400 | Simples | Menu principal |
| **Appearance.tsx** | ~400 | Simples | Tema |
| **Terms.tsx** | ~400 | Simples | Termos |
| **Privacy.tsx** | ~400 | Simples | Privacidade |
| **Chat.tsx** | ~400 | Média | Chat |
| **Contact.tsx** | ~300 | Simples | Contato |
| **Login.tsx** | ~300 | Simples | Login |
| **NotFound.tsx** | ~100 | Trivial | 404 |

### Componentes (200+ em `/client/src/components/`)

**UI Primitivos (75+ componentes Shadcn/ui):**
- Buttons, Inputs, Cards, Dialogs, Modals
- Tabs, Accordion, Dropdown, Select
- Toast, Sonner, Skeleton, Progress

**Dashboard:**
- BirthdayCard.tsx (27KB)
- Visitometer.tsx
- QuickGamificationCard.tsx
- MountainProgress.tsx
- SpiritualCheckInModal.tsx

**Usuários:**
- UserCardResponsive.tsx (37KB)
- UserDetailModal.tsx (51KB)
- EditUserModal.tsx
- FiltersDrawer.tsx
- ExportMenu.tsx

**Calendário:**
- MonthlyCalendarView.tsx (50KB)
- EventModal.tsx
- GoogleCalendarConfigModal.tsx

**Gamificação:**
- PointsBreakdown.tsx (44KB)
- MountainJourney.tsx
- GamificationStats.tsx

**Settings:**
- PointsConfiguration.tsx (45KB)
- DistrictSettings.tsx
- ActivitiesManager.tsx

**Layout:**
- MobileLayout.tsx
- MobileHeader.tsx
- MobileBottomNav.tsx
- AppSidebar.tsx

### Hooks Customizados (28 em `/client/src/hooks/`)

| Hook | Funcionalidade |
|------|----------------|
| useAuth.ts | Autenticação + impersonação |
| usePointsConfig.ts | Configuração de pontos |
| useOfflineQuery.ts | React Query + offline |
| useOffline.ts | Funcionalidades offline |
| useGoogleCalendarSync.ts | Sync Google Calendar |
| useTasks.ts | Gestão de tarefas |
| useBirthdays.ts | Aniversariantes |
| useVisits.ts | Histórico de visitas |
| useUserPoints.ts | Pontos do usuário |
| usePushNotifications.ts | Push notifications |
| usePullToRefresh.ts | Pull-to-refresh |
| useSpiritualCheckIn.ts | Check-in espiritual |
| useAppTour.ts | Tour inicial |
| usePWAInstall.ts | Instalação PWA |
| usePrefetch.ts | Prefetch de dados |

### Libs e Utils (23 módulos em `/client/src/lib/`)

**API:**
- api.ts - fetchWithAuth, fetchWithRetry
- queryClient.ts - React Query config

**Offline:**
- offline/database.ts - IndexedDB/Dexie
- offline/syncManager.ts - Fila de sync
- offline/crypto.ts - Criptografia
- offline/offlineFetch.ts - Interceptor

**Gamificação:**
- gamification.ts - Cálculo de pontos
- pointsCalculator.ts - Lógica complexa

**Excel:**
- excel/index.ts - Import/Export

---

## 1.2 Backend (Será Mantido)

### Rotas da API

**Autenticação (`/api/auth/`):**
```
POST /api/auth/login          - Autenticar usuário
POST /api/auth/register       - Registrar novo usuário
POST /api/auth/logout         - Logout
GET  /api/auth/me             - Dados do usuário autenticado
POST /api/auth/reset-password - Reset senha
POST /api/auth/change-password - Alterar senha
```

**Usuários (`/api/users/`):**
```
GET    /api/users              - Lista com paginação e filtros
GET    /api/users/:id          - Buscar por ID
POST   /api/users              - Criar usuário
PUT    /api/users/:id          - Atualizar usuário
DELETE /api/users/:id          - Remover usuário
POST   /api/users/:id/approve  - Aprovar pendente
GET    /api/users/birthdays    - Aniversariantes
POST   /api/users/bulk-import  - Importação em massa
```

**Dashboard (`/api/dashboard/`):**
```
GET /api/dashboard/stats      - Estatísticas gerais
GET /api/dashboard/unified    - Dashboard unificado
```

**Eventos (`/api/events/`):**
```
GET    /api/events            - Lista eventos
POST   /api/events            - Criar evento
GET    /api/events/:id        - Buscar por ID
PUT    /api/events/:id        - Atualizar
DELETE /api/events/:id        - Remover
```

**Eleições (`/api/elections/`):**
```
GET  /api/elections              - Lista eleições
POST /api/elections              - Criar eleição
GET  /api/elections/:id          - Buscar por ID
PUT  /api/elections/:id          - Atualizar
POST /api/elections/:id/nominate - Nomear candidato
POST /api/elections/:id/vote     - Registrar voto
GET  /api/elections/:id/results  - Resultados
```

**Relacionamentos (`/api/relationships/`):**
```
GET    /api/relationships                  - Lista
POST   /api/relationships                  - Criar
PUT    /api/relationships/:id              - Atualizar
DELETE /api/relationships/:id              - Remover
GET    /api/relationships/missionary/:id   - Interessados do missionário
```

**Pontos (`/api/points/`):**
```
GET  /api/points/config        - Configuração
POST /api/points/config        - Atualizar config
GET  /api/points/activities    - Atividades
POST /api/points/activities    - Registrar atividade
GET  /api/points/achievements  - Conquistas
```

**Chat (`/api/conversations/` e `/api/messages/`):**
```
GET  /api/conversations/:userId            - Conversas do usuário
POST /api/conversations/direct             - Criar conversa direta
POST /api/conversations/group              - Criar grupo
GET  /api/conversations/:id/messages       - Mensagens
POST /api/conversations/:id/messages       - Enviar mensagem
```

**Notificações (`/api/notifications/`):**
```
GET    /api/notifications       - Lista
POST   /api/notifications       - Criar
PUT    /api/notifications/:id   - Marcar como lida
POST   /api/push-subscriptions  - Registrar push
```

**Orações (`/api/prayers/`):**
```
GET    /api/prayers             - Lista
POST   /api/prayers             - Criar
PUT    /api/prayers/:id         - Atualizar
DELETE /api/prayers/:id         - Remover
```

**Distritos (`/api/districts/`):**
```
GET    /api/districts           - Lista
POST   /api/districts           - Criar
PUT    /api/districts/:id       - Atualizar
DELETE /api/districts/:id       - Remover
```

**Convites de Pastor (`/api/invites/`):**
```
POST /api/invites/pastor           - Criar convite
GET  /api/invites/validate/:token  - Validar token
POST /api/invites/:token/accept    - Aceitar
POST /api/invites/:token/reject    - Rejeitar
```

### Schema do Banco (PostgreSQL)

**Tabelas principais:**
- users (34 campos)
- districts
- churches
- events
- meetings
- relationships
- conversations
- messages
- notifications
- prayers
- point_configs
- point_activities
- achievements
- user_achievements
- pastor_invites
- expense_receipts
- google_calendar_tokens

---

## 1.3 Tipos e Models

### Entidades Principais

```typescript
// User
interface User {
  id: number
  name: string
  email: string
  password: string
  role: 'superadmin' | 'pastor' | 'member' | 'interested' | 'missionary' | 'admin_readonly'
  church: string
  churchCode: string
  districtId: number
  birthDate: date
  phone: string
  address: string
  baptismDate: date
  points: integer
  level: string
  attendance: integer
  isApproved: boolean
  // Campos de gamificação
  engajamento: 'Baixo' | 'Médio' | 'Alto'
  classificacao: 'Frequente' | 'Não Frequente'
  dizimistaType: string
  ofertanteType: string
  tempoBatismoAnos: integer
  departamentosCargos: string
  nomeUnidade: string
  temLicao: boolean
  totalPresenca: integer
  comunhao: integer
  missao: integer
  estudoBiblico: integer
  batizouAlguem: boolean
  discPosBatismal: integer
  cpfValido: boolean
  camposVazios: boolean
  status: string
  firstAccess: boolean
  createdAt: timestamp
  updatedAt: timestamp
}

// Church
interface Church {
  id: number
  name: string
  code: string
  address: string
  email: string
  phone: string
  pastor: string
  districtId: integer
}

// District
interface District {
  id: number
  name: string
  code: string
  pastorId: integer
  description: string
}

// Event
interface Event {
  id: number
  title: string
  description: string
  date: timestamp
  endDate: timestamp
  location: string
  type: 'culto' | 'evento' | 'reuniao'
  color: string
  capacity: integer
  isRecurring: boolean
  recurrencePattern: string
  createdBy: integer
  churchId: integer
  districtId: integer
  googleCalendarEventId: string
}

// Election
interface Election {
  id: number
  churchId: integer
  churchName: string
  title: string
  voters: integer[]
  criteria: ElectionCriteria
  positions: string[]
  status: 'draft' | 'active' | 'completed'
}

// Message
interface Message {
  id: number
  conversationId: integer
  senderId: integer
  content: string
  messageType: 'text' | 'image' | 'file' | 'system'
  fileUrl: string
  isRead: boolean
  createdAt: timestamp
}

// Prayer
interface Prayer {
  id: number
  userId: integer
  title: string
  content: string
  status: 'active' | 'answered' | 'archived'
  isAnswered: boolean
  isPublic: boolean
  anonymous: boolean
  districtId: integer
}

// Relationship
interface Relationship {
  id: number
  interestedId: integer
  missionaryId: integer
  status: 'active' | 'archived'
  notes: string
}
```

---

# PARTE 2: ARQUITETURA FLUTTER

## 2.1 Estrutura de Pastas

```
lib/
├── main.dart
├── app.dart                          # MaterialApp, rotas, tema
├── injection.dart                    # GetIt/Injectable setup
│
├── core/
│   ├── constants/
│   │   ├── api_constants.dart
│   │   ├── app_constants.dart
│   │   └── storage_keys.dart
│   ├── errors/
│   │   ├── exceptions.dart
│   │   └── failures.dart
│   ├── network/
│   │   ├── api_client.dart           # Dio setup
│   │   ├── api_interceptors.dart
│   │   └── network_info.dart
│   ├── storage/
│   │   ├── local_storage.dart        # SharedPreferences
│   │   ├── secure_storage.dart       # flutter_secure_storage
│   │   └── hive_storage.dart         # Hive para offline
│   ├── theme/
│   │   ├── app_colors.dart
│   │   ├── app_theme.dart
│   │   └── app_text_styles.dart
│   └── utils/
│       ├── date_utils.dart
│       ├── validators.dart
│       └── extensions.dart
│
├── data/
│   ├── datasources/
│   │   ├── local/
│   │   │   ├── user_local_datasource.dart
│   │   │   ├── event_local_datasource.dart
│   │   │   ├── message_local_datasource.dart
│   │   │   └── sync_queue_datasource.dart
│   │   └── remote/
│   │       ├── auth_remote_datasource.dart
│   │       ├── user_remote_datasource.dart
│   │       ├── event_remote_datasource.dart
│   │       ├── election_remote_datasource.dart
│   │       ├── chat_remote_datasource.dart
│   │       └── gamification_remote_datasource.dart
│   ├── models/
│   │   ├── user_model.dart
│   │   ├── auth_model.dart
│   │   ├── event_model.dart
│   │   ├── church_model.dart
│   │   ├── district_model.dart
│   │   ├── election_model.dart
│   │   ├── message_model.dart
│   │   ├── notification_model.dart
│   │   ├── prayer_model.dart
│   │   ├── relationship_model.dart
│   │   └── gamification_model.dart
│   └── repositories/
│       ├── auth_repository_impl.dart
│       ├── user_repository_impl.dart
│       ├── event_repository_impl.dart
│       ├── election_repository_impl.dart
│       ├── chat_repository_impl.dart
│       └── gamification_repository_impl.dart
│
├── domain/
│   ├── entities/
│   │   ├── user.dart
│   │   ├── auth.dart
│   │   ├── event.dart
│   │   ├── church.dart
│   │   ├── district.dart
│   │   ├── election.dart
│   │   ├── message.dart
│   │   ├── notification.dart
│   │   ├── prayer.dart
│   │   ├── relationship.dart
│   │   └── gamification.dart
│   ├── repositories/
│   │   ├── auth_repository.dart
│   │   ├── user_repository.dart
│   │   ├── event_repository.dart
│   │   ├── election_repository.dart
│   │   ├── chat_repository.dart
│   │   └── gamification_repository.dart
│   └── usecases/
│       ├── auth/
│       │   ├── login_usecase.dart
│       │   ├── logout_usecase.dart
│       │   └── refresh_token_usecase.dart
│       ├── user/
│       │   ├── get_users_usecase.dart
│       │   ├── update_user_usecase.dart
│       │   └── export_users_usecase.dart
│       ├── election/
│       │   ├── create_election_usecase.dart
│       │   ├── vote_usecase.dart
│       │   └── get_results_usecase.dart
│       └── gamification/
│           ├── calculate_points_usecase.dart
│           └── get_leaderboard_usecase.dart
│
├── presentation/
│   ├── blocs/
│   │   ├── auth/
│   │   │   ├── auth_bloc.dart
│   │   │   ├── auth_event.dart
│   │   │   └── auth_state.dart
│   │   ├── user/
│   │   ├── dashboard/
│   │   ├── election/
│   │   ├── calendar/
│   │   ├── chat/
│   │   ├── gamification/
│   │   ├── settings/
│   │   └── offline/
│   │       ├── sync_bloc.dart
│   │       └── connectivity_bloc.dart
│   │
│   ├── pages/
│   │   ├── splash/
│   │   ├── auth/
│   │   │   ├── login_page.dart
│   │   │   └── first_access_page.dart
│   │   ├── dashboard/
│   │   ├── users/
│   │   │   ├── users_page.dart
│   │   │   ├── user_details_page.dart
│   │   │   └── user_form_page.dart
│   │   ├── election/
│   │   │   ├── election_config_page.dart
│   │   │   ├── election_voting_page.dart
│   │   │   └── election_results_page.dart
│   │   ├── calendar/
│   │   ├── chat/
│   │   ├── gamification/
│   │   ├── prayers/
│   │   ├── tasks/
│   │   ├── districts/
│   │   ├── pastors/
│   │   ├── settings/
│   │   ├── interested/
│   │   └── notifications/
│   │
│   └── widgets/
│       ├── common/
│       │   ├── app_bar_widget.dart
│       │   ├── bottom_nav_widget.dart
│       │   ├── loading_widget.dart
│       │   ├── error_widget.dart
│       │   └── offline_indicator.dart
│       ├── buttons/
│       ├── cards/
│       │   ├── user_card.dart
│       │   ├── event_card.dart
│       │   ├── birthday_card.dart
│       │   ├── kpi_card.dart
│       │   └── gamification_card.dart
│       ├── forms/
│       ├── dialogs/
│       ├── charts/
│       │   ├── mountain_progress.dart
│       │   └── visitometer.dart
│       └── skeletons/
│
└── services/
    ├── notification_service.dart
    ├── push_notification_service.dart
    ├── sync_service.dart
    ├── connectivity_service.dart
    └── excel_export_service.dart
```

## 2.2 Dependências (pubspec.yaml)

```yaml
name: seven_care_app
description: 7Care - Sistema de Gestão para Igrejas
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # ═══════════════════════════════════════════════════════════
  # STATE MANAGEMENT
  # ═══════════════════════════════════════════════════════════
  flutter_bloc: ^8.1.3

  # ═══════════════════════════════════════════════════════════
  # NETWORKING
  # ═══════════════════════════════════════════════════════════
  dio: ^5.4.0
  retrofit: ^4.0.3
  pretty_dio_logger: ^1.3.1

  # ═══════════════════════════════════════════════════════════
  # LOCAL STORAGE
  # ═══════════════════════════════════════════════════════════
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  shared_preferences: ^2.2.2
  flutter_secure_storage: ^9.0.0

  # ═══════════════════════════════════════════════════════════
  # OFFLINE & SYNC
  # ═══════════════════════════════════════════════════════════
  connectivity_plus: ^5.0.2
  workmanager: ^0.5.2

  # ═══════════════════════════════════════════════════════════
  # NAVIGATION
  # ═══════════════════════════════════════════════════════════
  go_router: ^13.0.1

  # ═══════════════════════════════════════════════════════════
  # DEPENDENCY INJECTION
  # ═══════════════════════════════════════════════════════════
  get_it: ^7.6.4
  injectable: ^2.3.2

  # ═══════════════════════════════════════════════════════════
  # FORMS & VALIDATION
  # ═══════════════════════════════════════════════════════════
  formz: ^0.7.0

  # ═══════════════════════════════════════════════════════════
  # UI COMPONENTS
  # ═══════════════════════════════════════════════════════════
  flutter_slidable: ^3.0.1
  shimmer: ^3.0.0
  cached_network_image: ^3.3.1
  flutter_svg: ^2.0.9

  # ═══════════════════════════════════════════════════════════
  # DATE & TIME
  # ═══════════════════════════════════════════════════════════
  intl: ^0.19.0
  table_calendar: ^3.0.9

  # ═══════════════════════════════════════════════════════════
  # CHARTS
  # ═══════════════════════════════════════════════════════════
  fl_chart: ^0.66.0

  # ═══════════════════════════════════════════════════════════
  # EXCEL
  # ═══════════════════════════════════════════════════════════
  excel: ^4.0.2

  # ═══════════════════════════════════════════════════════════
  # NOTIFICATIONS
  # ═══════════════════════════════════════════════════════════
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.10
  flutter_local_notifications: ^16.3.0

  # ═══════════════════════════════════════════════════════════
  # UTILS
  # ═══════════════════════════════════════════════════════════
  equatable: ^2.0.5
  dartz: ^0.10.1
  json_annotation: ^4.8.1
  freezed_annotation: ^2.4.1
  uuid: ^4.2.2

  # ═══════════════════════════════════════════════════════════
  # GOOGLE SERVICES
  # ═══════════════════════════════════════════════════════════
  googleapis: ^12.0.0
  google_sign_in: ^6.2.1

  # ═══════════════════════════════════════════════════════════
  # CAMERA/IMAGE
  # ═══════════════════════════════════════════════════════════
  image_picker: ^1.0.7

dev_dependencies:
  flutter_test:
    sdk: flutter

  # Code Generation
  build_runner: ^2.4.7
  json_serializable: ^6.7.1
  freezed: ^2.4.6
  injectable_generator: ^2.4.1
  retrofit_generator: ^8.0.6
  hive_generator: ^2.0.1

  # Testing
  bloc_test: ^9.1.5
  mocktail: ^1.0.1

  # Linting
  flutter_lints: ^3.0.1
```

## 2.3 Models Dart (Exemplos)

### User Entity

```dart
// lib/domain/entities/user.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

enum UserRole {
  @JsonValue('superadmin')
  superadmin,
  @JsonValue('pastor')
  pastor,
  @JsonValue('missionary')
  missionary,
  @JsonValue('member')
  member,
  @JsonValue('interested')
  interested,
  @JsonValue('admin_readonly')
  adminReadonly,
}

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String name,
    required String email,
    required UserRole role,
    String? church,
    String? churchCode,
    int? districtId,
    String? avatar,
    String? phone,
    String? profilePhoto,
    String? birthDate,
    required bool isApproved,
    String? status,
    bool? firstAccess,
    bool? usingDefaultPassword,
    required String createdAt,
    // Campos de gamificação
    int? points,
    int? calculatedPoints,
    String? level,
    // Campos de pontuação detalhados
    String? engajamento,
    String? classificacao,
    String? dizimistaType,
    String? ofertanteType,
    int? tempoBatismoAnos,
    String? departamentosCargos,
    String? nomeUnidade,
    bool? temLicao,
    int? totalPresenca,
    int? comunhao,
    int? missao,
    int? estudoBiblico,
    bool? batizouAlguem,
    int? discPosBatismal,
    bool? cpfValido,
    bool? camposVazios,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

### Church Entity

```dart
// lib/domain/entities/church.dart
@freezed
class Church with _$Church {
  const factory Church({
    required int id,
    required String name,
    required String code,
    String? address,
    String? phone,
    String? email,
    String? pastor,
    int? districtId,
    bool? isDefault,
    String? createdAt,
  }) = _Church;

  factory Church.fromJson(Map<String, dynamic> json) => _$ChurchFromJson(json);
}
```

### Event Entity

```dart
// lib/domain/entities/event.dart
@freezed
class Event with _$Event {
  const factory Event({
    required int id,
    String? title,
    String? description,
    required DateTime date,
    DateTime? endDate,
    String? location,
    String? type,
    String? color,
    int? capacity,
    int? churchId,
    int? districtId,
    int? createdBy,
    bool? isRecurring,
    String? recurrencePattern,
    String? googleCalendarEventId,
    String? createdAt,
  }) = _Event;

  factory Event.fromJson(Map<String, dynamic> json) => _$EventFromJson(json);
}
```

### Election Entity

```dart
// lib/domain/entities/election.dart
enum ElectionStatus {
  @JsonValue('draft')
  draft,
  @JsonValue('active')
  active,
  @JsonValue('completed')
  completed
}

@freezed
class Election with _$Election {
  const factory Election({
    int? id,
    required int churchId,
    required String churchName,
    String? title,
    required List<int> voters,
    required ElectionCriteria criteria,
    required List<String> positions,
    required ElectionStatus status,
  }) = _Election;

  factory Election.fromJson(Map<String, dynamic> json) => _$ElectionFromJson(json);
}

@freezed
class ElectionCriteria with _$ElectionCriteria {
  const factory ElectionCriteria({
    required FaithfulnessCriteria faithfulness,
    required AttendanceCriteria attendance,
    required ChurchTimeCriteria churchTime,
    required PositionLimitCriteria positionLimit,
    required EldersCountCriteria eldersCount,
    required ClassificationCriteria classification,
  }) = _ElectionCriteria;

  factory ElectionCriteria.fromJson(Map<String, dynamic> json) =>
      _$ElectionCriteriaFromJson(json);
}
```

### Gamification Entities

```dart
// lib/domain/entities/gamification.dart

/// Dados do usuário para cálculo de pontos
/// NOTA: Evitar Map<String, dynamic> - usar tipos explícitos
@freezed
class UserPointsData with _$UserPointsData {
  const factory UserPointsData({
    required String engajamento,
    required String classificacao,
    required String dizimistaType,
    required String ofertanteType,
    required int tempoBatismoAnos,
    String? departamentosCargos,
    String? nomeUnidade,
    @Default(false) bool temLicao,
    @Default(0) int totalPresenca,
    @Default(0) int comunhao,
    @Default(0) int missao,
    @Default(0) int estudoBiblico,
    @Default(false) bool batizouAlguem,
    @Default(0) int discPosBatismal,
    @Default(false) bool cpfValido,
    @Default(false) bool camposVazios,
  }) = _UserPointsData;

  factory UserPointsData.fromJson(Map<String, Object?> json) =>
      _$UserPointsDataFromJson(json);
}

@freezed
class UserPoints with _$UserPoints {
  const factory UserPoints({
    required int total,
    required PointsBreakdown breakdown,
    required UserPointsData userData, // ✅ Tipo explícito, não dynamic
    required String level,
    required String mountName,
    required String mountIcon,
    int? nextLevelPoints,
    double? progressToNextLevel,
  }) = _UserPoints;

  factory UserPoints.fromJson(Map<String, Object?> json) =>
      _$UserPointsFromJson(json);
}

@freezed
class PointsBreakdown with _$PointsBreakdown {
  const factory PointsBreakdown({
    @Default(0) int engajamento,
    @Default(0) int classificacao,
    @Default(0) int dizimista,
    @Default(0) int ofertante,
    @Default(0) int tempoBatismo,
    @Default(0) int cargos,
    @Default(0) int nomeUnidade,
    @Default(0) int temLicao,
    @Default(0) int comunhao,
    @Default(0) int missao,
    @Default(0) int estudoBiblico,
    @Default(0) int totalPresenca,
    @Default(0) int batizouAlguem,
    @Default(0) int discipuladoPosBatismo,
    @Default(0) int cpfValido,
    @Default(0) int camposVaziosACMS,
  }) = _PointsBreakdown;

  factory PointsBreakdown.fromJson(Map<String, dynamic> json) =>
      _$PointsBreakdownFromJson(json);
}
```

### Sync Queue Item

```dart
// lib/domain/entities/sync_queue_item.dart
enum SyncOperationType { create, update, delete }

@freezed
class SyncQueueItem with _$SyncQueueItem {
  const factory SyncQueueItem({
    int? id,
    required SyncOperationType type,
    required String entity,
    int? entityId,
    required String data,
    String? originalChecksum,
    required String endpoint,
    required String method,
    required int createdAt,
    @Default(0) int retryCount,
    int? nextRetryAt,
    String? lastError,
    @Default(0) int priority,
  }) = _SyncQueueItem;

  factory SyncQueueItem.fromJson(Map<String, dynamic> json) =>
      _$SyncQueueItemFromJson(json);
}
```

---

## 2.4 Padrões de Widgets (Equivalente ao React Components)

> Seguindo o mesmo padrão do COPILOT_INSTRUCTIONS.md para React

### Widget com Loading/Error States (BlocBuilder)

```dart
// ✅ BOM - Widget pequeno, tipado, com loading/error states
// Equivalente ao padrão React do COPILOT_INSTRUCTIONS.md

class UserCard extends StatelessWidget {
  final String userId;
  final void Function(User)? onEdit;

  const UserCard({
    super.key,
    required this.userId,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UserBloc, UserState>(
      builder: (context, state) {
        // Early return para loading
        if (state is UserLoading) {
          return const UserCardSkeleton();
        }

        // Early return para erro
        if (state is UserError) {
          return ErrorMessage(error: state.message);
        }

        // Early return para sem dados
        if (state is! UserLoaded) {
          return const SizedBox.shrink();
        }

        final user = state.user;

        return Card(
          child: Column(
            children: [
              Text(user.name, style: Theme.of(context).textTheme.titleMedium),
              if (onEdit != null)
                TextButton(
                  onPressed: () => onEdit!(user),
                  child: const Text('Editar'), // PT-BR para UI
                ),
            ],
          ),
        );
      },
    );
  }
}
```

### Widget Reutilizável com Props Tipadas

```dart
// ✅ BOM - Props tipadas, const constructor, responsabilidade única

class KpiCard extends StatelessWidget {
  final String title;
  final int value;
  final IconData icon;
  final Color? color;
  final VoidCallback? onTap;

  const KpiCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardColor = color ?? theme.colorScheme.primary;

    return GestureDetector(
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: cardColor, size: 32),
              const SizedBox(height: 8),
              Text(
                value.toString(),
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(title, style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}
```

### Widget com BlocSelector (Evita Rebuilds)

```dart
// ✅ BOM - BlocSelector para evitar rebuilds desnecessários
// Equivalente a useMemo/useCallback do React

class UserPointsBadge extends StatelessWidget {
  const UserPointsBadge({super.key});

  @override
  Widget build(BuildContext context) {
    // Só rebuilda quando points mudar, não em qualquer mudança do state
    return BlocSelector<UserBloc, UserState, int?>(
      selector: (state) => state is UserLoaded ? state.user.points : null,
      builder: (context, points) {
        if (points == null) return const SizedBox.shrink();

        return Badge(
          label: Text('$points pts'),
          backgroundColor: _getColorForPoints(points),
        );
      },
    );
  }

  Color _getColorForPoints(int points) {
    if (points >= 500) return Colors.green;
    if (points >= 300) return Colors.orange;
    return Colors.grey;
  }
}
```

---

## 2.5 Padrões de UseCase e BLoC

> Equivalente ao padrão de API Endpoints do COPILOT_INSTRUCTIONS.md

### UseCase com Validação e Either

```dart
// ✅ BOM - Validação, try/catch, response tipada com Either
// Equivalente ao padrão de API do COPILOT_INSTRUCTIONS.md

// lib/domain/usecases/user/create_user_usecase.dart
class CreateUserUseCase {
  final UserRepository _repository;
  final Logger _logger;

  CreateUserUseCase(this._repository, this._logger);

  Future<Either<Failure, User>> call(CreateUserParams params) async {
    // 1. Validação de input (equivalente ao Zod)
    final validation = _validateParams(params);
    if (validation != null) {
      return Left(validation);
    }

    // 2. Try/catch com tratamento
    try {
      final user = await _repository.createUser(params);
      _logger.info('Usuário criado: ${user.id}');
      return Right(user);
    } on ServerException catch (e) {
      _logger.error('Erro ao criar usuário', e);
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      _logger.error('Erro inesperado', e);
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  ValidationFailure? _validateParams(CreateUserParams params) {
    if (params.name.trim().isEmpty) {
      return const ValidationFailure('Nome é obrigatório');
    }
    if (!_isValidEmail(params.email)) {
      return const ValidationFailure('Email inválido');
    }
    if (params.password.length < 6) {
      return const ValidationFailure('Senha deve ter no mínimo 6 caracteres');
    }
    return null; // Válido
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }
}

// Params tipados (equivalente a CreateUserInput do TypeScript)
@freezed
class CreateUserParams with _$CreateUserParams {
  const factory CreateUserParams({
    required String name,
    required String email,
    required String password,
    @Default(UserRole.member) UserRole role,
    String? church,
    int? districtId,
  }) = _CreateUserParams;
}
```

### BLoC com Estados Tipados

```dart
// lib/presentation/blocs/user/user_bloc.dart

// Events
@freezed
class UserEvent with _$UserEvent {
  const factory UserEvent.loadUsers({UserFilters? filters}) = LoadUsers;
  const factory UserEvent.createUser(CreateUserParams params) = CreateUser;
  const factory UserEvent.updateUser(User user) = UpdateUser;
  const factory UserEvent.deleteUser(String id) = DeleteUser;
}

// States
@freezed
class UserState with _$UserState {
  const factory UserState.initial() = UserInitial;
  const factory UserState.loading() = UserLoading;
  const factory UserState.loaded({
    required List<User> users,
    @Default(false) bool hasMore,
    @Default(1) int currentPage,
  }) = UserLoaded;
  const factory UserState.error(String message) = UserError;
}

// BLoC
class UserBloc extends Bloc<UserEvent, UserState> {
  final GetUsersUseCase _getUsers;
  final CreateUserUseCase _createUser;
  final Logger _logger;

  UserBloc(this._getUsers, this._createUser, this._logger)
      : super(const UserState.initial()) {
    on<LoadUsers>(_onLoadUsers);
    on<CreateUser>(_onCreateUser);
  }

  Future<void> _onLoadUsers(LoadUsers event, Emitter<UserState> emit) async {
    emit(const UserState.loading());

    final result = await _getUsers(event.filters);

    result.fold(
      (failure) {
        _logger.error('Falha ao carregar usuários', failure);
        emit(UserState.error(failure.message));
      },
      (users) => emit(UserState.loaded(users: users)),
    );
  }

  Future<void> _onCreateUser(CreateUser event, Emitter<UserState> emit) async {
    // Manter estado atual enquanto cria
    final currentState = state;

    final result = await _createUser(event.params);

    result.fold(
      (failure) => emit(UserState.error(failure.message)),
      (newUser) {
        if (currentState is UserLoaded) {
          emit(currentState.copyWith(
            users: [newUser, ...currentState.users],
          ));
        }
      },
    );
  }
}
```

---

# PARTE 3: IMPLEMENTAÇÃO

## 3.1 Sistema Offline

### Estratégia Offline-First

```dart
// lib/services/sync_service.dart
class SyncService {
  final SyncQueueDatasource _syncQueue;
  final ConnectivityService _connectivity;
  final ApiClient _apiClient;

  final _syncProgressController = StreamController<SyncProgress>.broadcast();
  Stream<SyncProgress> get syncProgressStream => _syncProgressController.stream;

  Future<SyncResult> processQueue() async {
    if (!await _connectivity.isConnected) {
      return SyncResult.offline();
    }

    final items = await _syncQueue.getPendingItems();
    int synced = 0;
    int failed = 0;

    for (final item in items) {
      try {
        _syncProgressController.add(SyncProgress(
          current: synced + failed,
          total: items.length,
          currentItem: item.entity,
        ));

        await _processItem(item);
        await _syncQueue.markCompleted(item.id!);
        synced++;
      } catch (e) {
        await _syncQueue.markFailed(item.id!, e.toString());
        failed++;
      }
    }

    return SyncResult(synced: synced, failed: failed, total: items.length);
  }

  Future<void> _processItem(SyncQueueItem item) async {
    switch (item.method) {
      case 'POST':
        await _apiClient.post(item.endpoint, data: jsonDecode(item.data));
        break;
      case 'PUT':
        await _apiClient.put(item.endpoint, data: jsonDecode(item.data));
        break;
      case 'DELETE':
        await _apiClient.delete(item.endpoint);
        break;
    }
  }
}
```

### Repository com Offline Support

```dart
// lib/data/repositories/user_repository_impl.dart
class UserRepositoryImpl implements UserRepository {
  final UserRemoteDatasource _remote;
  final UserLocalDatasource _local;
  final ConnectivityService _connectivity;
  final SyncQueueDatasource _syncQueue;

  @override
  Future<Either<Failure, List<User>>> getUsers({UserFilters? filters}) async {
    if (await _connectivity.isConnected) {
      try {
        final users = await _remote.getUsers(filters: filters);
        await _local.cacheUsers(users);
        return Right(users);
      } catch (e) {
        // Fallback para cache em caso de erro
        final cached = await _local.getCachedUsers();
        if (cached.isNotEmpty) {
          return Right(cached);
        }
        return Left(ServerFailure(e.toString()));
      }
    } else {
      // Offline: retornar do cache
      final cached = await _local.getCachedUsers();
      return Right(cached);
    }
  }

  @override
  Future<Either<Failure, User>> updateUser(User user) async {
    // Sempre salvar localmente primeiro
    await _local.updateUser(user);

    if (await _connectivity.isConnected) {
      try {
        final updated = await _remote.updateUser(user);
        return Right(updated);
      } catch (e) {
        // Adicionar à fila de sync
        await _addToSyncQueue(user, 'PUT');
        return Right(user);
      }
    } else {
      // Offline: adicionar à fila
      await _addToSyncQueue(user, 'PUT');
      return Right(user);
    }
  }

  Future<void> _addToSyncQueue(User user, String method) async {
    await _syncQueue.addItem(SyncQueueItem(
      type: SyncOperationType.update,
      entity: 'users',
      entityId: int.parse(user.id),
      data: jsonEncode(user.toJson()),
      endpoint: '/api/users/${user.id}',
      method: method,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ));
  }
}
```

### Diagrama de Fluxo Offline

```
┌─────────────────────────────────────────┐
│           AÇÃO DO USUÁRIO               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    1. Salvar localmente (Hive)          │
│       - Sempre primeiro                 │
│       - Feedback instantâneo            │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    2. Verificar conectividade           │
│       Online? → Sync imediato           │
│       Offline? → Adicionar à fila       │
└─────────────────────────────────────────┘
                    │
          ┌────────┴────────┐
          ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│   ONLINE        │ │   OFFLINE       │
│   Enviar API    │ │   Fila de Sync  │
│   Atualizar     │ │   WorkManager   │
│   cache local   │ │   notifica      │
└─────────────────┘ └─────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    3. Quando voltar online:             │
│       - WorkManager dispara             │
│       - Processar fila                  │
│       - Retry com backoff               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    4. Resolução de conflitos:           │
│       - Last-write-wins (padrão)        │
│       - UI manual (se necessário)       │
└─────────────────────────────────────────┘
```

---

# PARTE 4: CRONOGRAMA

## 4.1 Fases do Projeto

### FASE 1: FUNDAÇÃO (Semanas 1-3)

**Semana 1: Setup Inicial**
- [ ] Criar projeto Flutter
- [ ] Configurar estrutura de pastas
- [ ] Setup pubspec.yaml
- [ ] Configurar GetIt + Injectable
- [ ] Criar tema base (cores, fontes)

**Semana 2: Core & Network**
- [ ] Implementar ApiClient (Dio)
- [ ] Criar interceptors (auth, logging, retry)
- [ ] Setup Hive para storage
- [ ] SecureStorage para tokens
- [ ] NetworkInfo para conectividade

**Semana 3: Autenticação**
- [ ] Models de Auth/User
- [ ] AuthRepository (local + remote)
- [ ] AuthBloc
- [ ] Telas: Login, Register, Splash
- [ ] Refresh token flow
- [ ] First access / change password

**✅ MILESTONE 1:** Login funcional, sessão persiste, token refresh

---

### FASE 2: DASHBOARD E USUÁRIOS (Semanas 4-6)

**Semana 4: Dashboard**
- [ ] DashboardRepository
- [ ] DashboardBloc
- [ ] Widgets: KPICard, BirthdayCard, Visitometer
- [ ] Skeleton loading
- [ ] QuickGamificationCard

**Semana 5: Gestão de Usuários**
- [ ] UserRepository
- [ ] UsersBloc com filtros e paginação
- [ ] Tela de listagem
- [ ] UserDetailsPage
- [ ] UserFormPage (create/edit)
- [ ] Busca e filtros avançados

**Semana 6: Export e Permissões**
- [ ] Export Excel
- [ ] Sistema de permissões (roles)
- [ ] Impersonação de usuários
- [ ] PermissionsGuard widget

**✅ MILESTONE 2:** Dashboard funcional, CRUD usuários, export

---

### FASE 3: SISTEMA OFFLINE (Semanas 7-9)

**Semana 7: Storage Local**
- [ ] Hive adapters para todas entidades
- [ ] LocalDatasources
- [ ] Caching strategy
- [ ] SyncQueueDatasource

**Semana 8: Sync Service**
- [ ] SyncService com fila
- [ ] Background sync (WorkManager)
- [ ] Retry com exponential backoff
- [ ] ConnectivityBloc

**Semana 9: Conflict Resolution**
- [ ] Detecção de conflitos
- [ ] UI para resolução manual
- [ ] Checksums para detecção
- [ ] Testes de cenários offline

**✅ MILESTONE 3:** App funciona offline, sync automático

---

### FASE 4: GAMIFICAÇÃO (Semanas 10-11)

**Semana 10: Lógica de Pontos**
- [ ] PointsCalculator em Dart
- [ ] GamificationRepository
- [ ] GamificationBloc
- [ ] Todos os 15+ critérios

**Semana 11: UI de Gamificação**
- [ ] GamificationPage com tabs
- [ ] MountainJourney widget
- [ ] PointsBreakdown detalhado
- [ ] Animações de progresso
- [ ] MountIcon widget

**✅ MILESTONE 4:** Sistema de pontos idêntico ao React

---

### FASE 5: ELEIÇÕES (Semanas 12-14)

**Semana 12: Configuração**
- [ ] ElectionRepository
- [ ] ElectionConfigBloc
- [ ] ElectionConfigPage
- [ ] Seleção de critérios
- [ ] Seleção de cargos

**Semana 13: Votação**
- [ ] ElectionVotingBloc
- [ ] ElectionVotingPage
- [ ] UI de nomeação
- [ ] Fluxo de votação
- [ ] Confirmação de voto

**Semana 14: Resultados**
- [ ] ElectionResultsPage
- [ ] ElectionDashboard
- [ ] Gráficos de resultados
- [ ] UnifiedElectionPage

**✅ MILESTONE 5:** Fluxo completo de eleições

---

### FASE 6: CALENDÁRIO (Semanas 15-17)

**Semana 15: Calendário Base**
- [ ] EventRepository
- [ ] CalendarBloc
- [ ] CalendarPage com table_calendar
- [ ] EventModal
- [ ] CRUD de eventos

**Semana 16: Google Calendar**
- [ ] Google Sign-In
- [ ] OAuth flow
- [ ] GoogleCalendarService
- [ ] Sync bidirecional
- [ ] UI de configuração

**Semana 17: Recorrência**
- [ ] Eventos recorrentes
- [ ] Filtros por tipo/igreja
- [ ] Visualização mensal/semanal

**✅ MILESTONE 6:** Calendário com Google Calendar

---

### FASE 7: CHAT (Semanas 18-20)

**Semana 18: Chat Base**
- [ ] ChatRepository
- [ ] ChatBloc
- [ ] ChatSidebar
- [ ] ConversationsList

**Semana 19: Mensagens**
- [ ] ChatInterface
- [ ] MessageBubble
- [ ] Envio de mensagens
- [ ] Typing indicators
- [ ] Read receipts

**Semana 20: Grupos e Offline**
- [ ] Grupos
- [ ] NewGroupDialog
- [ ] Mensagens offline
- [ ] Sync de mensagens

**✅ MILESTONE 7:** Chat funcional com offline

---

### FASE 8: FEATURES SECUNDÁRIAS (Semanas 21-24)

**Semana 21: Orações e Discipulado**
- [ ] PrayersPage
- [ ] RelationshipsPage
- [ ] MyInterestedPage
- [ ] Fluxo de discipulado

**Semana 22: Tarefas**
- [ ] TasksPage
- [ ] Google Sheets integration
- [ ] Sistema de reuniões

**Semana 23: Notificações**
- [ ] Firebase Messaging
- [ ] Push notifications
- [ ] NotificationsPage
- [ ] Preferências

**Semana 24: Settings e Onboarding**
- [ ] SettingsPage completa
- [ ] PastorOnboardingPage (8 steps)
- [ ] PastorInvites
- [ ] Fluxo de aprovação

**✅ MILESTONE 8:** Todas as features

---

### FASE 9: POLIMENTO (Semanas 25-26)

**Semana 25: Testes**
- [ ] Unit tests para BLoCs
- [ ] Integration tests
- [ ] Testes offline
- [ ] Performance testing

**Semana 26: Polimento**
- [ ] Revisar UX/UI
- [ ] Otimizar performance
- [ ] Fix bugs
- [ ] Preparar deploy

**✅ MILESTONE FINAL:** App pronto para produção

---

## 4.2 Ordem de Implementação (Simples → Complexo)

```
 1. Splash Screen                    ★☆☆☆☆
 2. Login/Register                   ★☆☆☆☆
 3. Dashboard (readonly)             ★☆☆☆☆
 4. Settings (preferências)          ★☆☆☆☆
 5. Lista de Usuários                ★★☆☆☆
 6. Detalhes do Usuário              ★★☆☆☆
 7. Criar/Editar Usuário             ★★☆☆☆
 8. Filtros de Usuário               ★★☆☆☆
 9. Calendário Básico                ★★☆☆☆
10. CRUD de Eventos                  ★★☆☆☆
11. Sistema de Permissões            ★★☆☆☆
12. Gamificação (visualização)       ★★☆☆☆
13. Storage Offline (Hive)           ★★★☆☆
14. Sync Queue                       ★★★★☆
15. Pedidos de Oração                ★★☆☆☆
16. Discipulado/Relacionamentos      ★★☆☆☆
17. Chat (conversas diretas)         ★★★★☆
18. Chat (grupos)                    ★★★★☆
19. Notificações Push                ★★★★☆
20. Eleições - Configuração          ★★★★☆
21. Eleições - Votação               ★★★★☆
22. Eleições - Resultados            ★★★★☆
23. Google Calendar Integration      ★★★★☆
24. Export Excel                     ★★★☆☆
25. Onboarding de Pastores           ★★★★☆
26. OCR de Recibos                   ★★★★★
27. Conflict Resolution              ★★★★★
```

---

# PARTE 5: CHECKLISTS

## 5.1 Checklist por Fase

### FASE 1 - Fundação
```
□ Projeto criado e roda sem erros
□ Estrutura de pastas implementada
□ Todas as dependências instaladas
□ DI configurado e funcionando
□ Tema aplicado corretamente
□ ApiClient fazendo requests com sucesso
□ Storage local funcionando
□ Login/Logout funcionando
□ Sessão persiste após fechar app
□ Token refresh automático funciona
```

### FASE 2 - Dashboard e Usuários
```
□ Dashboard carrega dados da API
□ KPIs mostram valores corretos
□ Aniversariantes aparecem corretamente
□ Lista de usuários carrega com paginação
□ Filtros funcionam (role, church, status)
□ Busca por nome/email funciona
□ Detalhes do usuário mostram todos os campos
□ Criar/Editar usuário funciona
□ Export Excel gera arquivo correto
□ Permissões respeitadas por role
```

### FASE 3 - Sistema Offline
```
□ Dados salvos localmente após fetch
□ App funciona sem conexão
□ Alterações offline vão para fila de sync
□ Sync automático quando volta online
□ Indicador de status offline visível
□ Contador de itens pendentes funciona
□ Retry automático em caso de falha
□ Conflitos detectados e registrados
□ UI para resolver conflitos funciona
□ Dados não se perdem em nenhum cenário
```

### FASE 4 - Gamificação
```
□ Pontos calculados idêntico ao React
□ Todos os 15+ critérios implementados
□ Breakdown detalhado funciona
□ Nível/Monte calculado corretamente
□ Progresso para próximo nível correto
□ MountainJourney mostra todos os montes
□ Ícones dos montes aparecem
□ Animações de progresso funcionam
□ Dados vêm do backend corretamente
□ Funciona offline com cache
```

### FASE 5 - Eleições
```
□ Criar eleição com todos os critérios
□ Selecionar igrejas participantes
□ Selecionar cargos disponíveis
□ Fase de nomeação funciona
□ Votação registra votos corretamente
□ Um voto por usuário por cargo
□ Resultados calculados corretamente
□ Gráficos de resultados aparecem
□ Fluxo completo funciona fim a fim
□ Dashboard de eleição mostra status
```

### FASE 6 - Calendário
```
□ Calendário mostra eventos do mês
□ Criar evento funciona
□ Editar evento funciona
□ Deletar evento funciona
□ Filtros por tipo funcionam
□ Google Sign-In funciona
□ Sync com Google Calendar funciona
□ Eventos recorrentes funcionam
□ Visualizações mês/semana funcionam
□ Eventos offline sincronizam depois
```

### FASE 7 - Chat
```
□ Lista de conversas carrega
□ Abrir conversa mostra mensagens
□ Enviar mensagem funciona
□ Mensagem aparece em tempo real
□ Indicador de leitura funciona
□ Criar grupo funciona
□ Mensagens offline ficam na fila
□ Sync de mensagens funciona
□ Busca de usuários para novo chat
□ Notificação de nova mensagem
```

### FASE 8 - Features Secundárias
```
□ CRUD de pedidos de oração funciona
□ Fluxo interessado-missionário funciona
□ Tarefas integram com Google Sheets
□ Push notifications recebidas
□ Settings salva preferências
□ Onboarding de pastor funciona (8 steps)
□ Convites de pastor funcionam
□ Aprovação de pastores funciona
□ Todas as páginas acessíveis
□ Navegação completa sem erros
```

---

## 5.2 Comandos Úteis

```bash
# Criar projeto
flutter create --org com.sevencare seven_care_app
cd seven_care_app

# Adicionar dependências principais
flutter pub add flutter_bloc dio hive_flutter get_it go_router \
  freezed_annotation json_annotation equatable dartz \
  connectivity_plus flutter_secure_storage shared_preferences \
  table_calendar fl_chart intl cached_network_image shimmer

# Adicionar dev dependencies
flutter pub add --dev build_runner freezed json_serializable \
  injectable_generator hive_generator bloc_test mocktail

# Gerar código (após criar models com @freezed)
flutter pub run build_runner build --delete-conflicting-outputs

# Watch mode para desenvolvimento
flutter pub run build_runner watch --delete-conflicting-outputs

# Rodar testes
flutter test

# Build para release
flutter build apk --release
flutter build ios --release
```

---

# PARTE 6: ARQUIVOS CRÍTICOS

## 6.1 Arquivos React a Converter

| Arquivo React | Converter Para | Prioridade |
|---------------|----------------|------------|
| `client/src/types/domain.ts` | Entities Freezed | Alta |
| `client/src/hooks/useAuth.ts` | AuthBloc | Alta |
| `client/src/lib/offline/database.ts` | Hive Storage | Alta |
| `client/src/lib/pointsCalculator.ts` | PointsCalculator | Alta |
| `client/src/lib/queryClient.ts` | BLoC + Repository | Média |
| `client/src/components/users/UserCardResponsive.tsx` | UserCard Widget | Média |
| `client/src/components/dashboard/BirthdayCard.tsx` | BirthdayCard Widget | Média |
| `client/src/components/gamification/MountainJourney.tsx` | MountainJourney Widget | Média |
| `client/src/pages/Dashboard.tsx` | DashboardPage + Bloc | Média |
| `client/src/pages/Users.tsx` | UsersPage + Bloc | Média |
| `client/src/pages/ElectionConfig.tsx` | ElectionConfigPage + Bloc | Baixa |
| `client/src/pages/Settings.tsx` | SettingsPage + Bloc | Baixa |

## 6.2 Schema do Banco (Referência)

O arquivo `server/schema.ts` define todas as tabelas PostgreSQL. Use como referência para criar os Models Dart correspondentes.

---

# RESUMO EXECUTIVO

**Projeto:** Migração 7Care React → Flutter
**Escopo:** 30 páginas, 200+ componentes, sistema offline
**Duração:** ~26 semanas (9 fases)
**Arquitetura:** Clean Architecture + BLoC
**Backend:** Mantido (Node.js/Express + PostgreSQL)

**Principais Desafios:**
1. Sistema offline com sync queue
2. Gamificação com 15+ critérios
3. Eleições multi-fase
4. Integração Google Calendar

**Próximos Passos:**
1. ✅ Fazer backup do app React
2. ⬜ Criar projeto Flutter
3. ⬜ Implementar Fase 1 (Fundação + Auth)
