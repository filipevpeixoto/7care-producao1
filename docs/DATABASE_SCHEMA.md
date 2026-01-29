# Documentação do Schema do Banco de Dados

> **7Care - Sistema de Gestão de Igrejas**  
> Data de atualização: 2025-01-18

## Visão Geral

O banco de dados utiliza **PostgreSQL** hospedado na **Neon** com **Drizzle ORM** para o mapeamento objeto-relacional.

## Diagrama de Entidades

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    DISTRICTS    │       │      USERS      │       │    CHURCHES     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ districtId (FK) │       │ id (PK)         │
│ name            │       │ id (PK)         │       │ name            │
│ code            │       │ name            │       │ code            │
│ pastorId        │       │ email           │──────►│ districtId (FK) │
│ description     │       │ role            │       │ address         │
└─────────────────┘       │ churchId        │──────►│ pastor          │
                          │ ...             │       └─────────────────┘
                          └─────────────────┘
                                  │
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌─────────────────┐   ┌─────────────────┐       ┌─────────────────┐
│     EVENTS      │   │  RELATIONSHIPS  │       │   MEETINGS      │
├─────────────────┤   ├─────────────────┤       ├─────────────────┤
│ id (PK)         │   │ id (PK)         │       │ id (PK)         │
│ title           │   │ interestedId(FK)│       │ requesterId(FK) │
│ date            │   │ missionaryId(FK)│       │ assignedToId(FK)│
│ createdBy (FK)  │   │ status          │       │ typeId (FK)     │
│ churchId (FK)   │   │ notes           │       │ status          │
└─────────────────┘   └─────────────────┘       └─────────────────┘
```

---

## Tabelas Principais

### 1. districts

Armazena distritos (regiões eclesiásticas).

| Coluna        | Tipo        | Descrição                 |
| ------------- | ----------- | ------------------------- |
| `id`          | SERIAL      | Chave primária            |
| `name`        | TEXT        | Nome do distrito          |
| `code`        | VARCHAR(20) | Código único (ex: "SP01") |
| `pastorId`    | INTEGER     | ID do pastor responsável  |
| `description` | TEXT        | Descrição opcional        |
| `createdAt`   | TIMESTAMP   | Data de criação           |
| `updatedAt`   | TIMESTAMP   | Última atualização        |

**Índices:**

- `code` - UNIQUE

---

### 2. users

Tabela principal de usuários do sistema.

| Coluna                | Tipo      | Descrição                                                                              |
| --------------------- | --------- | -------------------------------------------------------------------------------------- |
| `id`                  | SERIAL    | Chave primária                                                                         |
| `name`                | TEXT      | Nome completo                                                                          |
| `email`               | TEXT      | Email (único)                                                                          |
| `password`            | TEXT      | Hash bcrypt da senha                                                                   |
| `role`                | TEXT      | Perfil: `superadmin`, `pastor`, `member`, `interested`, `missionary`, `admin_readonly` |
| `church`              | TEXT      | Nome da igreja (legado)                                                                |
| `churchCode`          | TEXT      | Código da igreja                                                                       |
| `districtId`          | INTEGER   | FK para `districts.id`                                                                 |
| `departments`         | TEXT      | Departamentos separados por vírgula                                                    |
| `birthDate`           | DATE      | Data de nascimento                                                                     |
| `civilStatus`         | TEXT      | Estado civil                                                                           |
| `occupation`          | TEXT      | Profissão                                                                              |
| `education`           | TEXT      | Escolaridade                                                                           |
| `address`             | TEXT      | Endereço completo                                                                      |
| `baptismDate`         | DATE      | Data do batismo                                                                        |
| `previousReligion`    | TEXT      | Religião anterior                                                                      |
| `biblicalInstructor`  | TEXT      | Instrutor bíblico                                                                      |
| `interestedSituation` | TEXT      | Situação do interessado                                                                |
| `isDonor`             | BOOLEAN   | É ofertante?                                                                           |
| `isTither`            | BOOLEAN   | É dizimista?                                                                           |
| `isApproved`          | BOOLEAN   | Cadastro aprovado?                                                                     |
| `points`              | INTEGER   | Pontos de gamificação                                                                  |
| `level`               | TEXT      | Nível atual                                                                            |
| `attendance`          | INTEGER   | Total de presenças                                                                     |
| `extraData`           | JSONB     | Dados extras flexíveis                                                                 |
| `status`              | TEXT      | `active`, `inactive`, `pending`, `visited`                                             |
| `firstAccess`         | BOOLEAN   | Primeiro acesso?                                                                       |
| `createdAt`           | TIMESTAMP | Data de criação                                                                        |
| `updatedAt`           | TIMESTAMP | Última atualização                                                                     |

**Campos de Gamificação (movidos de extraData):**

| Coluna                | Tipo    | Descrição                       |
| --------------------- | ------- | ------------------------------- |
| `engajamento`         | TEXT    | Nível: `Baixo`, `Médio`, `Alto` |
| `classificacao`       | TEXT    | `Frequente`, `Não Frequente`    |
| `dizimistaType`       | TEXT    | Tipo de dizimista               |
| `ofertanteType`       | TEXT    | Tipo de ofertante               |
| `tempoBatismoAnos`    | INTEGER | Anos desde o batismo            |
| `departamentosCargos` | TEXT    | Cargos separados por `;`        |
| `nomeUnidade`         | TEXT    | Unidade/grupo pequeno           |
| `temLicao`            | BOOLEAN | Tem lição ES?                   |
| `totalPresenca`       | INTEGER | Presenças (0-13)                |
| `comunhao`            | INTEGER | Pontuação comunhão              |
| `missao`              | INTEGER | Pontuação missão                |
| `estudoBiblico`       | INTEGER | Pontuação estudo                |
| `batizouAlguem`       | BOOLEAN | Batizou alguém?                 |
| `discPosBatismal`     | INTEGER | Discipulados pós-batismo        |
| `cpfValido`           | BOOLEAN | CPF válido?                     |
| `camposVazios`        | BOOLEAN | Tem campos vazios?              |

**Índices:**

- `email` - UNIQUE
- `districtId` - FK

---

### 3. churches

Cadastro de igrejas.

| Coluna       | Tipo        | Descrição              |
| ------------ | ----------- | ---------------------- |
| `id`         | SERIAL      | Chave primária         |
| `name`       | TEXT        | Nome da igreja         |
| `code`       | VARCHAR(10) | Código único           |
| `address`    | TEXT        | Endereço               |
| `email`      | TEXT        | Email de contato       |
| `phone`      | TEXT        | Telefone               |
| `pastor`     | TEXT        | Nome do pastor         |
| `districtId` | INTEGER     | FK para `districts.id` |
| `createdAt`  | TIMESTAMP   | Data de criação        |
| `updatedAt`  | TIMESTAMP   | Última atualização     |

**Índices:**

- `code` - UNIQUE
- `districtId` - FK

---

### 4. events

Eventos e programações.

| Coluna              | Tipo      | Descrição             |
| ------------------- | --------- | --------------------- |
| `id`                | SERIAL    | Chave primária        |
| `title`             | TEXT      | Título do evento      |
| `description`       | TEXT      | Descrição             |
| `date`              | TIMESTAMP | Data/hora de início   |
| `endDate`           | TIMESTAMP | Data/hora de término  |
| `location`          | TEXT      | Local                 |
| `type`              | TEXT      | Tipo do evento        |
| `color`             | TEXT      | Cor para exibição     |
| `capacity`          | INTEGER   | Capacidade máxima     |
| `isRecurring`       | BOOLEAN   | É recorrente?         |
| `recurrencePattern` | TEXT      | Padrão de recorrência |
| `createdBy`         | INTEGER   | FK para `users.id`    |
| `churchId`          | INTEGER   | FK para `churches.id` |
| `createdAt`         | TIMESTAMP | Data de criação       |
| `updatedAt`         | TIMESTAMP | Última atualização    |

---

### 5. relationships

Relacionamentos entre missionários e interessados.

| Coluna         | Tipo      | Descrição                        |
| -------------- | --------- | -------------------------------- |
| `id`           | SERIAL    | Chave primária                   |
| `interestedId` | INTEGER   | FK para `users.id` (interessado) |
| `missionaryId` | INTEGER   | FK para `users.id` (missionário) |
| `status`       | TEXT      | `pending`, `active`, `inactive`  |
| `notes`        | TEXT      | Observações                      |
| `createdAt`    | TIMESTAMP | Data de criação                  |
| `updatedAt`    | TIMESTAMP | Última atualização               |

---

### 6. meetings

Reuniões agendadas.

| Coluna         | Tipo      | Descrição                                        |
| -------------- | --------- | ------------------------------------------------ |
| `id`           | SERIAL    | Chave primária                                   |
| `title`        | TEXT      | Título                                           |
| `description`  | TEXT      | Descrição                                        |
| `scheduledAt`  | TIMESTAMP | Data/hora agendada                               |
| `duration`     | INTEGER   | Duração em minutos                               |
| `location`     | TEXT      | Local                                            |
| `requesterId`  | INTEGER   | FK: quem solicitou                               |
| `assignedToId` | INTEGER   | FK: responsável                                  |
| `typeId`       | INTEGER   | FK para `meeting_types.id`                       |
| `priority`     | TEXT      | `low`, `medium`, `high`                          |
| `isUrgent`     | BOOLEAN   | É urgente?                                       |
| `status`       | TEXT      | `pending`, `confirmed`, `completed`, `cancelled` |
| `notes`        | TEXT      | Notas                                            |
| `createdAt`    | TIMESTAMP | Data de criação                                  |
| `updatedAt`    | TIMESTAMP | Última atualização                               |

---

## Tabelas de Comunicação

### 7. messages

Mensagens do chat interno.

| Coluna           | Tipo      | Descrição                  |
| ---------------- | --------- | -------------------------- |
| `id`             | SERIAL    | Chave primária             |
| `content`        | TEXT      | Conteúdo da mensagem       |
| `senderId`       | INTEGER   | FK: remetente              |
| `conversationId` | INTEGER   | FK para `conversations.id` |
| `createdAt`      | TIMESTAMP | Data de envio              |

### 8. conversations

Conversas/threads de mensagens.

| Coluna      | Tipo      | Descrição          |
| ----------- | --------- | ------------------ |
| `id`        | SERIAL    | Chave primária     |
| `title`     | TEXT      | Título da conversa |
| `type`      | TEXT      | `private`, `group` |
| `createdBy` | INTEGER   | FK: criador        |
| `createdAt` | TIMESTAMP | Data de criação    |
| `updatedAt` | TIMESTAMP | Última atualização |

### 9. notifications

Notificações do sistema.

| Coluna      | Tipo      | Descrição           |
| ----------- | --------- | ------------------- |
| `id`        | SERIAL    | Chave primária      |
| `title`     | TEXT      | Título              |
| `message`   | TEXT      | Mensagem            |
| `userId`    | INTEGER   | FK: destinatário    |
| `type`      | TEXT      | Tipo da notificação |
| `isRead`    | BOOLEAN   | Foi lida?           |
| `createdAt` | TIMESTAMP | Data de criação     |

### 10. push_subscriptions

Inscrições para push notifications.

| Coluna      | Tipo      | Descrição             |
| ----------- | --------- | --------------------- |
| `id`        | SERIAL    | Chave primária        |
| `userId`    | INTEGER   | FK: usuário           |
| `endpoint`  | TEXT      | URL do endpoint push  |
| `p256dh`    | TEXT      | Chave pública         |
| `auth`      | TEXT      | Token de autenticação |
| `isActive`  | BOOLEAN   | Ativa?                |
| `createdAt` | TIMESTAMP | Data de criação       |
| `updatedAt` | TIMESTAMP | Última atualização    |

---

## Tabelas de Gamificação

### 11. point_configs

Configuração de pontos por ação.

| Coluna      | Tipo      | Descrição            |
| ----------- | --------- | -------------------- |
| `id`        | SERIAL    | Chave primária       |
| `name`      | TEXT      | Nome da configuração |
| `value`     | INTEGER   | Valor em pontos      |
| `category`  | TEXT      | Categoria            |
| `createdAt` | TIMESTAMP | Data de criação      |
| `updatedAt` | TIMESTAMP | Última atualização   |

### 12. achievements

Conquistas disponíveis.

| Coluna           | Tipo      | Descrição          |
| ---------------- | --------- | ------------------ |
| `id`             | SERIAL    | Chave primária     |
| `name`           | TEXT      | Nome da conquista  |
| `description`    | TEXT      | Descrição          |
| `pointsRequired` | INTEGER   | Pontos necessários |
| `icon`           | TEXT      | Ícone              |
| `createdAt`      | TIMESTAMP | Data de criação    |

### 13. user_achievements

Conquistas obtidas por usuários.

| Coluna          | Tipo      | Descrição        |
| --------------- | --------- | ---------------- |
| `id`            | SERIAL    | Chave primária   |
| `userId`        | INTEGER   | FK: usuário      |
| `achievementId` | INTEGER   | FK: conquista    |
| `earnedAt`      | TIMESTAMP | Data de obtenção |

### 14. point_activities

Histórico de atividades com pontos.

| Coluna        | Tipo      | Descrição              |
| ------------- | --------- | ---------------------- |
| `id`          | SERIAL    | Chave primária         |
| `userId`      | INTEGER   | FK: usuário            |
| `activity`    | TEXT      | Descrição da atividade |
| `points`      | INTEGER   | Pontos ganhos/perdidos |
| `description` | TEXT      | Detalhes               |
| `createdAt`   | TIMESTAMP | Data                   |

### 15. user_points_history

Histórico detalhado de pontos.

| Coluna      | Tipo      | Descrição      |
| ----------- | --------- | -------------- |
| `id`        | SERIAL    | Chave primária |
| `userId`    | INTEGER   | FK: usuário    |
| `points`    | INTEGER   | Pontos         |
| `reason`    | TEXT      | Motivo         |
| `createdAt` | TIMESTAMP | Data           |

---

## Tabelas de Cuidado Pastoral

### 16. emotional_checkins

Check-ins emocionais dos membros.

| Coluna               | Tipo      | Descrição               |
| -------------------- | --------- | ----------------------- |
| `id`                 | SERIAL    | Chave primária          |
| `userId`             | INTEGER   | FK: usuário             |
| `emotionalScore`     | INTEGER   | Score emocional (1-10)  |
| `mood`               | TEXT      | Estado de humor         |
| `prayerRequest`      | TEXT      | Pedido de oração        |
| `notes`              | TEXT      | Observações             |
| `isPrivate`          | BOOLEAN   | É privado?              |
| `allowChurchMembers` | BOOLEAN   | Permitir membros verem? |
| `createdAt`          | TIMESTAMP | Data                    |
| `updatedAt`          | TIMESTAMP | Última atualização      |

### 17. prayers

Pedidos de oração.

| Coluna        | Tipo      | Descrição                         |
| ------------- | --------- | --------------------------------- |
| `id`          | SERIAL    | Chave primária                    |
| `title`       | TEXT      | Título                            |
| `description` | TEXT      | Descrição                         |
| `requesterId` | INTEGER   | FK: solicitante                   |
| `status`      | TEXT      | `active`, `answered`, `cancelled` |
| `isPrivate`   | BOOLEAN   | É privado?                        |
| `createdAt`   | TIMESTAMP | Data                              |
| `updatedAt`   | TIMESTAMP | Última atualização                |

### 18. prayer_intercessors

Intercessores de pedidos de oração.

| Coluna     | Tipo      | Descrição       |
| ---------- | --------- | --------------- |
| `id`       | SERIAL    | Chave primária  |
| `prayerId` | INTEGER   | FK: oração      |
| `userId`   | INTEGER   | FK: intercessor |
| `joinedAt` | TIMESTAMP | Data de adesão  |

### 19. discipleship_requests

Solicitações de discipulado.

| Coluna         | Tipo      | Descrição             |
| -------------- | --------- | --------------------- |
| `id`           | SERIAL    | Chave primária        |
| `interestedId` | INTEGER   | FK: interessado       |
| `missionaryId` | INTEGER   | FK: missionário       |
| `status`       | TEXT      | Status da solicitação |
| `notes`        | TEXT      | Observações           |
| `createdAt`    | TIMESTAMP | Data                  |
| `updatedAt`    | TIMESTAMP | Última atualização    |

### 20. missionary_profiles

Perfis de missionários.

| Coluna           | Tipo      | Descrição          |
| ---------------- | --------- | ------------------ |
| `id`             | SERIAL    | Chave primária     |
| `userId`         | INTEGER   | FK: usuário        |
| `specialization` | TEXT      | Especialização     |
| `experience`     | TEXT      | Experiência        |
| `isActive`       | BOOLEAN   | Ativo?             |
| `createdAt`      | TIMESTAMP | Data               |
| `updatedAt`      | TIMESTAMP | Última atualização |

---

## Tabelas de Vídeo Chamada

### 21. video_call_sessions

Sessões de vídeo chamada.

| Coluna        | Tipo      | Descrição             |
| ------------- | --------- | --------------------- |
| `id`          | SERIAL    | Chave primária        |
| `title`       | TEXT      | Título                |
| `description` | TEXT      | Descrição             |
| `hostId`      | INTEGER   | FK: host              |
| `startTime`   | TIMESTAMP | Hora de início        |
| `endTime`     | TIMESTAMP | Hora de término       |
| `status`      | TEXT      | Status                |
| `meetingId`   | TEXT      | ID externo da reunião |
| `createdAt`   | TIMESTAMP | Data                  |

### 22. video_call_participants

Participantes de vídeo chamadas.

| Coluna      | Tipo      | Descrição        |
| ----------- | --------- | ---------------- |
| `id`        | SERIAL    | Chave primária   |
| `sessionId` | INTEGER   | FK: sessão       |
| `userId`    | INTEGER   | FK: participante |
| `joinedAt`  | TIMESTAMP | Hora de entrada  |
| `leftAt`    | TIMESTAMP | Hora de saída    |

---

## Tabelas de Configuração

### 23. system_config

Configurações do sistema (chave-valor).

| Coluna        | Tipo      | Descrição          |
| ------------- | --------- | ------------------ |
| `id`          | SERIAL    | Chave primária     |
| `key`         | TEXT      | Chave única        |
| `value`       | JSONB     | Valor (JSON)       |
| `description` | TEXT      | Descrição          |
| `createdAt`   | TIMESTAMP | Data               |
| `updatedAt`   | TIMESTAMP | Última atualização |

### 24. system_settings

Configurações adicionais (alias).

| Coluna        | Tipo      | Descrição          |
| ------------- | --------- | ------------------ |
| `id`          | SERIAL    | Chave primária     |
| `key`         | TEXT      | Chave única        |
| `value`       | JSONB     | Valor              |
| `description` | TEXT      | Descrição          |
| `createdAt`   | TIMESTAMP | Data               |
| `updatedAt`   | TIMESTAMP | Última atualização |

### 25. meeting_types

Tipos de reunião.

| Coluna        | Tipo      | Descrição      |
| ------------- | --------- | -------------- |
| `id`          | SERIAL    | Chave primária |
| `name`        | TEXT      | Nome           |
| `description` | TEXT      | Descrição      |
| `color`       | TEXT      | Cor            |
| `createdAt`   | TIMESTAMP | Data           |

---

## Tabelas de Junção

### 26. event_participants

Participantes de eventos.

| Coluna      | Tipo      | Descrição                             |
| ----------- | --------- | ------------------------------------- |
| `id`        | SERIAL    | Chave primária                        |
| `eventId`   | INTEGER   | FK: evento                            |
| `userId`    | INTEGER   | FK: participante                      |
| `status`    | TEXT      | `registered`, `attended`, `cancelled` |
| `createdAt` | TIMESTAMP | Data                                  |

### 27. conversation_participants

Participantes de conversas.

| Coluna           | Tipo      | Descrição        |
| ---------------- | --------- | ---------------- |
| `id`             | SERIAL    | Chave primária   |
| `conversationId` | INTEGER   | FK: conversa     |
| `userId`         | INTEGER   | FK: participante |
| `joinedAt`       | TIMESTAMP | Data de entrada  |

### 28. event_filter_permissions

Permissões de filtro de eventos.

| Coluna        | Tipo      | Descrição                  |
| ------------- | --------- | -------------------------- |
| `id`          | SERIAL    | Chave primária             |
| `permissions` | JSONB     | Configuração de permissões |
| `createdAt`   | TIMESTAMP | Data                       |
| `updatedAt`   | TIMESTAMP | Última atualização         |

---

## Relacionamentos Principais

```
districts ──1:N──► users
districts ──1:N──► churches
churches  ──1:N──► events
users     ──1:N──► events (createdBy)
users     ──1:N──► meetings (requester/assignee)
users     ──M:N──► users (relationships)
users     ──1:N──► notifications
users     ──1:N──► emotional_checkins
users     ──1:N──► point_activities
users     ──M:N──► achievements (user_achievements)
events    ──M:N──► users (event_participants)
conversations ──M:N──► users (conversation_participants)
```

---

## Convenções

1. **Chaves Primárias**: Sempre `id` com tipo `SERIAL`
2. **Timestamps**: `createdAt` e `updatedAt` em todas as tabelas principais
3. **Foreign Keys**: Sufixo `Id` (ex: `userId`, `churchId`)
4. **Soft Delete**: Usar campo `status` ao invés de deletar registros
5. **JSON**: Usar `JSONB` para dados flexíveis (ex: `extraData`, `value`)

---

## Migrações

As migrações estão localizadas em `server/migrations/` e são executadas via Drizzle Kit.

```bash
# Gerar migração
npm run db:generate

# Aplicar migrações
npm run db:migrate
```

---

## Índices Recomendados

Para otimização de performance, os seguintes índices são recomendados:

```sql
-- Busca de usuários por igreja
CREATE INDEX idx_users_church ON users(church);

-- Busca de usuários por distrito
CREATE INDEX idx_users_district ON users(district_id);

-- Busca de eventos por data
CREATE INDEX idx_events_date ON events(date);

-- Busca de eventos por igreja
CREATE INDEX idx_events_church ON events(church_id);

-- Busca de mensagens por conversa
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Busca de notificações não lidas
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
```
