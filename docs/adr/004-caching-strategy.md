# ADR-004: Estratégia de Cache

**Status:** Aceito  
**Data:** 2026-01-28  
**Decisores:** Equipe de Desenvolvimento

## Contexto

O 7Care faz diversas queries ao banco de dados que poderiam ser cacheadas para melhorar performance:

- Lista de distritos (raramente muda)
- Lista de igrejas (raramente muda)
- Dashboard stats (pode ter alguns minutos de delay)
- Lista de membros (muda com frequência média)

O sistema roda em ambiente serverless onde não há estado persistente entre invocações.

## Decisão

Implementamos uma **estratégia de cache em camadas**:

### Camada 1: Cache HTTP (Browser)

```typescript
// Headers para assets estáticos
'Cache-Control': 'public, max-age=31536000, immutable'

// Headers para API
'Cache-Control': 'private, max-age=60'
```

### Camada 2: Cache em Memória (Server)

```typescript
// server/services/cacheService.ts
class CacheService {
  private cache: Map<string, CacheEntry>;

  get(key: string): T | null;
  set(key: string, value: T, ttl: number): void;
  invalidate(pattern: string): void;
}
```

### TTLs por Tipo de Dado

| Recurso        | TTL    | Justificativa             |
| -------------- | ------ | ------------------------- |
| Distritos      | 10 min | Raramente mudam           |
| Igrejas        | 10 min | Raramente mudam           |
| Dashboard      | 5 min  | Tolera delay              |
| Users list     | 2 min  | Muda com frequência média |
| Membros        | 2 min  | Muda com frequência média |
| Perfil próprio | 30 seg | Precisa ser atual         |

### Invalidação

- **Por padrão:** TTL expira automaticamente
- **Por ação:** CRUD invalida cache relacionado
- **Manual:** Endpoint de invalidação para admin

## Alternativas Consideradas

### Redis (externo)

- **Prós:** Persistente, compartilhado entre instâncias
- **Contras:** Custo adicional, latência de rede

### CDN Cache (Netlify)

- **Prós:** Distribuído, automático
- **Contras:** Difícil invalidar, não funciona para dados autenticados

### Sem cache

- **Prós:** Sempre atual
- **Contras:** Performance ruim, custos de banco

## Consequências

### Positivas

- Redução de queries ao banco (~60%)
- Resposta mais rápida para usuário
- Menor custo de banco

### Negativas

- Dados podem ter até TTL de delay
- Memória consumida em cada instância
- Cache não compartilhado entre functions

### Mitigações

- TTLs curtos para dados sensíveis
- Invalidação explícita em mutations
- Headers de cache para browser

## Referências

- [server/services/cacheService.ts](../../server/services/cacheService.ts)
- [HTTP Caching - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
