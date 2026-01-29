# ADR-003: Estrutura de Roles e Permissões

**Status:** Aceito  
**Data:** 2026-01-28  
**Decisores:** Equipe de Desenvolvimento

## Contexto

O 7Care gerencia uma hierarquia eclesiástica com diferentes níveis de acesso:

- Administradores do sistema
- Pastores de distritos
- Líderes locais
- Membros comuns

Cada nível precisa de permissões específicas para criar, visualizar, editar e deletar recursos.

## Decisão

Implementamos um sistema de **Roles hierárquicos** com funções de verificação centralizadas:

### Hierarquia de Roles

```
superadmin
    └── admin
        └── admin_readonly
        └── pastor
            └── leader
                └── member
```

### Roles Definidas

| Role             | Descrição                      | Escopo         |
| ---------------- | ------------------------------ | -------------- |
| `superadmin`     | Acesso total ao sistema        | Global         |
| `admin`          | Administrador com acesso amplo | Global         |
| `admin_readonly` | Visualização sem edição        | Global         |
| `pastor`         | Pastor de distrito             | Distrito       |
| `leader`         | Líder local                    | Igreja         |
| `member`         | Membro comum                   | Próprios dados |

### Funções de Verificação

```typescript
// server/utils/permissions.ts
hasAdminAccess(user); // superadmin, admin, admin_readonly
isSuperAdmin(user); // apenas superadmin
isPastor(user); // pastor ou superior
canManagePastors(user); // superadmin apenas
canAccessAllChurches(user); // superadmin, admin
canAccessDistrict(user, districtId); // verifica escopo
```

## Alternativas Consideradas

### RBAC completo com tabela de permissões

- **Prós:** Máxima flexibilidade
- **Contras:** Complexidade excessiva, overhead de queries

### ACL (Access Control Lists)

- **Prós:** Controle granular por recurso
- **Contras:** Difícil de gerenciar em escala

### Claims-based (no JWT)

- **Prós:** Stateless, sem queries
- **Contras:** Token grande, atualização requer re-login

## Consequências

### Positivas

- Simples de entender e manter
- Performance boa (verificações in-memory)
- Hierarquia reflete estrutura organizacional
- Testável (90%+ coverage em permissions.ts)

### Negativas

- Menos flexível que RBAC completo
- Mudanças requerem deploy
- Não suporta permissões dinâmicas

### Neutras

- Role armazenado no banco e no JWT
- Verificação de escopo para pastores

## Referências

- [server/utils/permissions.ts](../../server/utils/permissions.ts)
- [shared/schema.ts](../../shared/schema.ts) - Definição de UserRole
