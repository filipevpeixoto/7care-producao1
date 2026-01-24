# Status da Implementação - Nova Hierarquia de Perfis

## ✅ Concluído

### 1. Estrutura de Dados
- ✅ Tabela `districts` criada no schema
- ✅ Campo `districtId` adicionado em `users` e `churches`
- ✅ Tipos TypeScript atualizados (`UserRole`, `User`, `District`, `Church`)
- ✅ Schemas Zod atualizados

### 2. Funções Helper de Permissão
- ✅ `server/utils/permissions.ts` criado (backend)
- ✅ `client/src/lib/permissions.ts` criado (frontend)
- ✅ Funções: `hasAdminAccess`, `isSuperAdmin`, `isPastor`, `canManagePastors`, etc.

### 3. Script de Migração
- ✅ `server/migrateRoles.ts` criado
- ✅ Converte `admin` → `pastor`
- ✅ Converte `admin@7care.com` → `superadmin`
- ✅ Cria distrito padrão
- ✅ Associa dados existentes

### 4. Backend - Verificações de Permissão
- ✅ `server/routes.ts` - Atualizado (3 ocorrências)
- ✅ `server/neonAdapter.ts` - Atualizado (3 ocorrências)
- ✅ `server/electionRoutes.ts` - Mantido (já verifica readonly)
- ✅ Endpoint `/api/churches` - Filtro por distrito implementado
- ✅ Método `getChurchesByDistrict` adicionado ao `neonAdapter`

### 5. Novos Endpoints
- ✅ `server/districtRoutes.ts` criado
- ✅ Endpoints de distritos (CRUD completo)
- ✅ Endpoints de pastores (CRUD completo)
- ✅ Rotas registradas em `routes.ts`

### 6. Frontend - Verificações de Permissão
- ✅ `client/src/pages/Dashboard.tsx` - Atualizado (4 ocorrências)
- ✅ `client/src/pages/Settings.tsx` - Atualizado (9 ocorrências)
- ✅ `client/src/components/layout/AppSidebar.tsx` - Atualizado (exibição de role)

## ⚠️ Pendente (Arquivos que ainda precisam ser atualizados)

### Frontend - Arquivos com verificações `role === 'admin'`:

1. **client/src/pages/Users.tsx** (2 ocorrências)
   - Linha 906: `user?.role === 'admin'`
   - Linha 1725: `user?.role === 'admin'`

2. **client/src/pages/MeuCadastro.tsx** (1 ocorrência)
   - Linha 308: `user?.role === 'admin'`

3. **client/src/pages/Interested.tsx** (1 ocorrência)
   - Linha 105: `user?.role === 'admin'`

4. **client/src/pages/MyInterested.tsx** (2 ocorrências)
   - Linha 171: `user?.role === 'admin'`
   - Linha 888: `user?.role === 'admin'`

5. **client/src/pages/ElectionConfig.tsx** (1 ocorrência)
   - Linha 1333: `user?.role === 'admin'`

6. **client/src/pages/Prayers.tsx** (3 ocorrências)
   - Linha 311: `user?.role === 'admin'`
   - Linhas 566, 578: `user?.role === 'admin'`

7. **client/src/pages/Calendar.tsx** (1 ocorrência)
   - Linha 40: `user?.role === 'admin'`

8. **client/src/components/layout/MobileLayout.tsx** (1 ocorrência)
   - Linha 21: `user?.role === 'admin'`

9. **client/src/components/layout/MobileBottomNav.tsx** (1 ocorrência)
   - Linha 33: `user?.role === 'admin'`

10. **client/src/components/users/ResponsiveStatsBadges.tsx** (4 ocorrências)
    - Linhas 35, 37, 41, 49: Verificações de `'admin'`

11. **client/src/components/users/UserCardResponsive.tsx** (5 ocorrências)
    - Linhas 120, 372, 389, 522, 749: `currentUser?.role === 'admin'`

12. **client/src/pages/Menu.tsx** (1 ocorrência)
    - Linha 94: `user?.role === 'admin'`

13. **client/src/pages/Chat.tsx** (1 ocorrência)
    - Linha 39: `user?.role === 'admin'`

14. **client/src/hooks/usePointsConfig.ts** (1 ocorrência)
    - Linha 315: `user.role === 'admin'`

15. **client/src/hooks/usePointsCalculation.ts** (1 ocorrência)
    - Linha 50: `user.role === 'admin'`

16. **client/src/components/calendar/EventPermissionsModal.tsx** (2 ocorrências)
    - Linhas 71, 86: `profile.id === 'admin'`

### Backend - Arquivos que ainda precisam ser atualizados:

1. **netlify/functions/api.js** (4 ocorrências)
   - Linhas 701, 1039, 2280, 14361: Verificações de `role === 'admin'`

## 📝 Como Completar as Atualizações Restantes

### Para cada arquivo do frontend:

1. Adicionar import:
```typescript
import { hasAdminAccess, isSuperAdmin, isPastor, getRoleDisplayName } from '@/lib/permissions';
```

2. Substituir verificações:
```typescript
// ANTES:
user?.role === 'admin'

// DEPOIS:
hasAdminAccess(user)
```

3. Para exibição de nomes de roles:
```typescript
// ANTES:
user.role === 'admin' ? 'Administrador' : ...

// DEPOIS:
getRoleDisplayName(user.role)
```

### Para o arquivo do backend (netlify/functions/api.js):

1. Adicionar funções helper no início do arquivo (ou criar um módulo separado)
2. Substituir verificações similares ao que foi feito em `routes.ts`

## 🚀 Próximos Passos

1. **Executar migração:**
   ```bash
   npm run migrate-roles
   # ou
   node server/migrateRoles.ts
   ```

2. **Testar funcionalidades:**
   - Login como superadmin
   - Criar distrito
   - Criar pastor
   - Associar pastor a distrito
   - Verificar filtros de igrejas

3. **Completar atualizações pendentes:**
   - Atualizar arquivos listados acima
   - Testar cada funcionalidade

4. **Criar páginas de gerenciamento:**
   - Página de Distritos (já iniciada)
   - Página de Pastores (já iniciada)

## 📋 Checklist Final

- [ ] Executar script de migração
- [ ] Atualizar todos os arquivos pendentes do frontend
- [ ] Atualizar netlify/functions/api.js
- [ ] Criar páginas de gerenciamento completas
- [ ] Testar todas as funcionalidades
- [ ] Atualizar menu de navegação com links para distritos/pastores
- [ ] Documentar mudanças para usuários

