# ADR-001: React Query para estado do servidor

## Status: Aceito

## Contexto

O app precisa gerenciar dados vindos do servidor (usuários, eventos, eleições, etc.) com cache, revalidação, e loading/error states.

## Decisão

Usar **@tanstack/react-query** como camada de gerenciamento de estado de servidor.

## Consequências

- **Positivo**: Cache automático, deduplicação de requests, prefetching, optimistic updates
- **Positivo**: Elimina `useState` + `useEffect` para data fetching
- **Positivo**: Query keys centralizadas em `@/lib/queryKeys` para invalidação precisa
- **Negativo**: Curva de aprendizado para devs acostumados com Redux

## Query Keys

Todas as query keys devem usar o factory em `client/src/lib/queryKeys.ts`:
```typescript
import { queryKeys } from '@/lib/queryKeys';
useQuery({ queryKey: queryKeys.users.list(), ... });
```
