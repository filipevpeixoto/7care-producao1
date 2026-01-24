# Mudanças Necessárias para Nova Hierarquia de Perfis

## Resumo da Mudança

**Situação Atual:**
- `admin` (Superadmin atual)
- `member` / `missionary`
- `interested` (amigo)

**Nova Hierarquia:**
- `superadmin` (novo, superior ao pastor)
- `pastor` (antigo admin, administra apenas suas igrejas/distritos)
- `member` / `missionary`
- `interested` (amigo)

## Estrutura de Dados Necessária

### 1. Schema do Banco de Dados

#### 1.1 Tabela `users` - Campo `role`
**Mudança:** Adicionar novos valores ao campo `role`:
- `superadmin` (novo)
- `pastor` (substitui `admin`)
- `member`, `missionary`, `interested` (mantidos)

**Arquivo:** `server/schema.ts`
```typescript
// Campo role já existe como text, mas precisa validar novos valores
role: text('role').notNull().default('member')
```

#### 1.2 Nova Tabela: `districts` (Distritos)
**Necessário criar:** Tabela para gerenciar distritos (conjuntos de igrejas)

```typescript
export const districts = pgTable('districts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  pastorId: integer('pastor_id').references(() => users.id), // Pastor responsável
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

#### 1.3 Tabela `churches` - Adicionar campo `districtId`
**Mudança:** Adicionar relacionamento com distrito

```typescript
// Adicionar em churches:
districtId: integer('district_id').references(() => districts.id),
```

#### 1.4 Tabela `users` - Adicionar campo `districtId` (opcional)
**Mudança:** Para pastores, associar ao distrito que administram

```typescript
// Adicionar em users:
districtId: integer('district_id').references(() => districts.id),
```

---

## 2. Alterações em Tipos TypeScript

### 2.1 `client/src/types/auth.ts`
**Mudança:** Atualizar tipo `UserRole`

```typescript
// ANTES:
export type UserRole = 'admin' | 'missionary' | 'member' | 'interested';

// DEPOIS:
export type UserRole = 'superadmin' | 'pastor' | 'missionary' | 'member' | 'interested';
```

### 2.2 `shared/schema.ts`
**Mudança:** Atualizar interface `User` e schema Zod

```typescript
// ANTES:
role: 'admin' | 'member' | 'interested' | 'missionary';

// DEPOIS:
role: 'superadmin' | 'pastor' | 'member' | 'interested' | 'missionary';

// E no insertUserSchema:
role: z.enum(['superadmin', 'pastor', 'member', 'interested', 'missionary']),
```

---

## 3. Alterações em Verificações de Permissão

### 3.1 Função Helper para Verificar Permissões

**Criar novo arquivo:** `server/utils/permissions.ts`

```typescript
export const hasAdminAccess = (user: any): boolean => {
  return user?.role === 'superadmin' || user?.role === 'pastor';
};

export const isSuperAdmin = (user: any): boolean => {
  return user?.role === 'superadmin';
};

export const isPastor = (user: any): boolean => {
  return user?.role === 'pastor';
};

export const canManagePastors = (user: any): boolean => {
  return user?.role === 'superadmin';
};

export const canAccessAllChurches = (user: any): boolean => {
  return user?.role === 'superadmin';
};

export const canAccessDistrictChurches = (user: any, churchDistrictId: number | null): boolean => {
  if (user?.role === 'superadmin') return true;
  if (user?.role === 'pastor' && user?.districtId === churchDistrictId) return true;
  return false;
};
```

### 3.2 Arquivos que Precisam Atualizar Verificações de `role === 'admin'`

#### Backend (`server/routes.ts`)
- **Linha 33:** `user.role === 'admin_readonly'` → manter, mas adicionar verificação para `pastor`
- **Linha 894:** `user.email === 'admin@7care.com' || user.role === 'admin'` → `isSuperAdmin(user) || isPastor(user)`
- **Linha 1544:** `user.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 2236:** `user.email === 'admin@7care.com' || user.role === 'admin'` → `isSuperAdmin(user) || isPastor(user)`

#### Backend (`server/electionRoutes.ts`)
- **Linha 13:** Adicionar verificação para `pastor` também

#### Backend (`server/neonAdapter.ts`)
- **Linha 412:** `user.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 985:** `userData.email === 'admin@7care.com' || userData.role === 'admin'` → `isSuperAdmin(userData) || isPastor(userData)`
- **Linha 1250:** `user.email === 'admin@7care.com' || user.role === 'admin'` → `isSuperAdmin(user) || isPastor(user)`

#### Backend (`netlify/functions/api.js`)
- **Linha 701:** `userData[0].role === 'admin'` → verificar `superadmin` ou `pastor`
- **Linha 1039:** `user.email === 'admin@7care.com' || user.role === 'admin'` → `isSuperAdmin(user) || isPastor(user)`
- **Linha 2280:** `userData[0].role === 'admin'` → verificar `superadmin` ou `pastor`
- **Linha 14361:** `role === 'admin'` → `role === 'superadmin' || role === 'pastor'`

#### Frontend (`client/src/pages/Dashboard.tsx`)
- **Linha 162:** `u.role === 'admin'` → `u.role === 'superadmin' || u.role === 'pastor'`
- **Linha 313:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 806:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 1511:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 1534:** `user.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/pages/Users.tsx`)
- **Linha 906:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 1725:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/pages/MeuCadastro.tsx`)
- **Linha 308:** `user?.role === 'admin'` → verificar e mostrar 'Superadmin' ou 'Pastor'

#### Frontend (`client/src/pages/Interested.tsx`)
- **Linha 105:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/pages/MyInterested.tsx`)
- **Linha 171:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 888:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/pages/ElectionConfig.tsx`)
- **Linha 1333:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/pages/Settings.tsx`)
- **Linha 408:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 448:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linha 1424:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Todas as linhas 1857-1896:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linhas 2170, 2387, 2408, 2415, 2609, 2740:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/pages/Prayers.tsx`)
- **Linha 311:** `user?.role === 'admin'` → `hasAdminAccess(user)`
- **Linhas 566, 578:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/pages/Calendar.tsx`)
- **Linha 40:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/components/layout/AppSidebar.tsx`)
- **Linha 151:** `user.role === 'admin'` → mostrar 'Superadmin' ou 'Pastor' conforme role

#### Frontend (`client/src/components/layout/MobileLayout.tsx`)
- **Linha 21:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/components/layout/MobileBottomNav.tsx`)
- **Linha 33:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/components/users/ResponsiveStatsBadges.tsx`)
- **Linhas 35, 37, 41, 49:** Substituir `'admin'` por verificação de `superadmin` ou `pastor`

#### Frontend (`client/src/components/users/UserCardResponsive.tsx`)
- **Linhas 120, 372, 389, 522, 749:** `currentUser?.role === 'admin'` → `hasAdminAccess(currentUser)`

#### Frontend (`client/src/pages/Menu.tsx`)
- **Linha 94:** `user?.role === 'admin'` → mostrar 'Superadmin' ou 'Pastor'

#### Frontend (`client/src/pages/Chat.tsx`)
- **Linha 39:** `user?.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/hooks/usePointsConfig.ts`)
- **Linha 315:** `user.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/hooks/usePointsCalculation.ts`)
- **Linha 50:** `user.role === 'admin'` → `hasAdminAccess(user)`

#### Frontend (`client/src/components/calendar/EventPermissionsModal.tsx`)
- **Linha 71:** `profile.id === 'admin'` → `profile.id === 'superadmin' || profile.id === 'pastor'`
- **Linha 86:** `profile.id === 'admin'` → `profile.id === 'superadmin' || profile.id === 'pastor'`

---

## 4. Filtros de Dados por Permissão

### 4.1 Endpoint `/api/churches` - Filtrar por Distrito

**Arquivo:** `server/routes.ts` (linha 1789)

```typescript
app.get("/api/churches", async (req, res) => {
  try {
    const userId = parseInt(req.headers['x-user-id'] as string || '0');
    const user = userId ? await storage.getUserById(userId) : null;
    
    let churches;
    if (isSuperAdmin(user)) {
      // Superadmin vê todas as igrejas
      churches = await storage.getAllChurches();
    } else if (isPastor(user)) {
      // Pastor vê apenas igrejas do seu distrito
      churches = await storage.getChurchesByDistrict(user.districtId);
    } else {
      // Outros usuários veem apenas sua igreja
      churches = user?.church ? await storage.getChurchesByName(user.church) : [];
    }
    
    res.json(churches);
  } catch (error) {
    console.error("Get churches error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### 4.2 Endpoint `/api/users` - Filtrar por Distrito

**Arquivo:** `server/routes.ts` (linha ~450)

```typescript
// Filtrar usuários baseado no role:
// - Superadmin: vê todos
// - Pastor: vê apenas usuários das igrejas do seu distrito
// - Outros: vê apenas da mesma igreja
```

### 4.3 Endpoint `/api/users/bulk-import` - Restringir Importação

**Arquivo:** `server/routes.ts` (linha 1665)

```typescript
// Verificar se o usuário pode importar:
// - Superadmin: pode importar para qualquer distrito/igreja
// - Pastor: pode importar apenas para igrejas do seu distrito
```

---

## 5. Interface do Usuário

### 5.1 Criar Página de Gerenciamento de Pastores (Superadmin)

**Novo arquivo:** `client/src/pages/Pastors.tsx`

Funcionalidades:
- Listar todos os pastores
- Criar novo pastor
- Associar pastor a distrito
- Editar pastor
- Ver distritos do pastor

### 5.2 Criar Página de Gerenciamento de Distritos (Superadmin)

**Novo arquivo:** `client/src/pages/Districts.tsx`

Funcionalidades:
- Listar todos os distritos
- Criar novo distrito
- Associar igrejas ao distrito
- Editar distrito
- Ver pastores do distrito

### 5.3 Dashboard do Superadmin

**Arquivo:** `client/src/pages/Dashboard.tsx`

Adicionar seções:
- Visão geral de todos os distritos
- Estatísticas globais
- Lista de pastores
- Acesso rápido a distritos

### 5.4 Dashboard do Pastor

**Arquivo:** `client/src/pages/Dashboard.tsx`

Modificar para:
- Mostrar apenas dados do distrito do pastor
- Estatísticas do distrito
- Lista de igrejas do distrito

### 5.5 Menu de Navegação

**Arquivo:** `client/src/components/layout/AppSidebar.tsx`

Adicionar itens condicionais:
- Se `superadmin`: Mostrar "Distritos", "Pastores"
- Se `pastor`: Mostrar "Minhas Igrejas", "Meu Distrito"

---

## 6. Migração de Dados

### 6.1 Script de Migração

**Criar:** `server/migrateRoles.ts`

```typescript
// 1. Criar tabela districts
// 2. Criar distrito padrão
// 3. Converter todos os usuários com role='admin' para role='pastor'
// 4. Associar pastores ao distrito padrão
// 5. Associar igrejas ao distrito padrão
// 6. Criar primeiro superadmin (manualmente ou via script)
```

### 6.2 Atualizar Usuário Admin Existente

```sql
-- Converter admin atual para pastor
UPDATE users SET role = 'pastor' WHERE role = 'admin';

-- Criar primeiro superadmin (ajustar email conforme necessário)
UPDATE users SET role = 'superadmin' WHERE email = 'admin@7care.com';
```

---

## 7. Validações e Regras de Negócio

### 7.1 Criação de Usuários

- **Superadmin** só pode ser criado por outro superadmin
- **Pastor** só pode ser criado por superadmin
- **Member/Missionary/Interested** podem ser criados por superadmin ou pastor

### 7.2 Importação de Igrejas

- **Superadmin:** Pode importar igrejas para qualquer distrito
- **Pastor:** Pode importar igrejas apenas para seu próprio distrito
- **Outros:** Não podem importar igrejas

### 7.3 Visualização de Dados

- **Superadmin:** Vê tudo (todos os distritos, pastores, igrejas, usuários)
- **Pastor:** Vê apenas seu distrito (igrejas do distrito, usuários das igrejas do distrito)
- **Member/Missionary:** Vê apenas sua igreja
- **Interested:** Vê apenas seus próprios dados

---

## 8. Endpoints Novos Necessários

### 8.1 Gerenciamento de Distritos

```
GET    /api/districts              - Listar distritos (filtrado por permissão)
POST   /api/districts              - Criar distrito (apenas superadmin)
GET    /api/districts/:id          - Obter distrito
PUT    /api/districts/:id          - Atualizar distrito (apenas superadmin)
DELETE /api/districts/:id          - Deletar distrito (apenas superadmin)
GET    /api/districts/:id/churches - Listar igrejas do distrito
```

### 8.2 Gerenciamento de Pastores

```
GET    /api/pastors                - Listar pastores (filtrado por permissão)
POST   /api/pastors                - Criar pastor (apenas superadmin)
GET    /api/pastors/:id            - Obter pastor
PUT    /api/pastors/:id            - Atualizar pastor (apenas superadmin)
DELETE /api/pastors/:id            - Deletar pastor (apenas superadmin)
GET    /api/pastors/:id/district   - Obter distrito do pastor
PUT    /api/pastors/:id/district   - Associar pastor a distrito (apenas superadmin)
```

### 8.3 Modificações em Endpoints Existentes

```
GET /api/churches                  - Adicionar filtro por distrito
GET /api/users                     - Adicionar filtro por distrito
POST /api/users                    - Validar permissão para criar roles
POST /api/users/bulk-import        - Validar permissão e distrito
POST /api/churches/bulk-import     - Validar permissão e distrito
```

---

## 9. Ordem de Implementação Recomendada

1. **Fase 1: Estrutura de Dados**
   - Criar tabela `districts`
   - Adicionar campo `districtId` em `churches` e `users`
   - Atualizar schemas TypeScript

2. **Fase 2: Migração de Dados**
   - Criar script de migração
   - Converter `admin` → `pastor`
   - Criar distrito padrão
   - Associar dados existentes

3. **Fase 3: Backend - Permissões**
   - Criar funções helper de permissão
   - Atualizar todas as verificações de `role === 'admin'`
   - Implementar filtros por distrito nos endpoints

4. **Fase 4: Backend - Novos Endpoints**
   - Criar endpoints de distritos
   - Criar endpoints de pastores
   - Atualizar endpoints existentes com filtros

5. **Fase 5: Frontend - Tipos e Helpers**
   - Atualizar tipos TypeScript
   - Criar hooks de permissão
   - Atualizar componentes de UI

6. **Fase 6: Frontend - Páginas**
   - Criar página de Distritos
   - Criar página de Pastores
   - Atualizar Dashboard
   - Atualizar Settings

7. **Fase 7: Testes**
   - Testar criação de superadmin
   - Testar criação de pastor
   - Testar filtros de dados
   - Testar importação de igrejas

---

## 10. Considerações Importantes

### 10.1 Compatibilidade com Dados Existentes
- Garantir que usuários existentes continuem funcionando
- Migração deve ser reversível (backup antes)

### 10.2 Segurança
- Validar permissões em TODOS os endpoints
- Não confiar apenas em validações do frontend
- Implementar rate limiting para criação de pastores

### 10.3 Performance
- Índices no banco para `districtId` e `pastorId`
- Cache de permissões quando possível
- Paginação em listagens grandes

### 10.4 UX
- Mensagens claras sobre permissões
- Feedback visual sobre o que o usuário pode ver/fazer
- Navegação intuitiva entre distritos

---

## 11. Checklist de Implementação

- [ ] Criar tabela `districts` no schema
- [ ] Adicionar `districtId` em `churches` e `users`
- [ ] Atualizar tipos TypeScript (`UserRole`, `User`)
- [ ] Criar funções helper de permissão
- [ ] Atualizar todas as verificações `role === 'admin'` (67 ocorrências)
- [ ] Criar endpoints de distritos
- [ ] Criar endpoints de pastores
- [ ] Atualizar endpoint `/api/churches` com filtros
- [ ] Atualizar endpoint `/api/users` com filtros
- [ ] Criar script de migração
- [ ] Executar migração em ambiente de teste
- [ ] Criar página de Distritos (frontend)
- [ ] Criar página de Pastores (frontend)
- [ ] Atualizar Dashboard para superadmin e pastor
- [ ] Atualizar Settings com gerenciamento de distritos
- [ ] Atualizar menu de navegação
- [ ] Testar todas as funcionalidades
- [ ] Documentar mudanças para usuários

---

## 12. Arquivos que Precisam ser Modificados

### Backend (Server)
- `server/schema.ts` - Adicionar tabela districts e campos
- `server/routes.ts` - Atualizar verificações e adicionar endpoints
- `server/electionRoutes.ts` - Atualizar verificações
- `server/neonAdapter.ts` - Adicionar métodos e atualizar verificações
- `netlify/functions/api.js` - Atualizar verificações
- `server/utils/permissions.ts` - **NOVO** - Funções helper

### Frontend (Client)
- `client/src/types/auth.ts` - Atualizar UserRole
- `shared/schema.ts` - Atualizar tipos e schemas Zod
- `client/src/pages/Dashboard.tsx` - Atualizar verificações
- `client/src/pages/Users.tsx` - Atualizar verificações
- `client/src/pages/Settings.tsx` - Atualizar verificações
- `client/src/pages/Pastors.tsx` - **NOVO** - Gerenciamento de pastores
- `client/src/pages/Districts.tsx` - **NOVO** - Gerenciamento de distritos
- `client/src/components/layout/AppSidebar.tsx` - Atualizar menu
- Todos os outros arquivos listados na seção 3.2

### Migração
- `server/migrateRoles.ts` - **NOVO** - Script de migração

---

**Total estimado de arquivos a modificar:** ~40 arquivos
**Total estimado de linhas a modificar:** ~200-300 linhas
**Complexidade:** Alta (requer testes extensivos)

