# ADR-004: CSRF com double-submit cookie

## Status: Aceito

## Contexto

Necessidade de proteção contra Cross-Site Request Forgery (CSRF) em requests mutativas.

## Decisão

Implementar padrão **double-submit cookie**:

1. **Server** define cookie `csrf-token` (httpOnly=false) com token aleatório
2. **Client** lê o cookie e envia como header `x-csrf-token` em requests mutativos
3. **Server** valida que header == cookie

## Implementação

- Server: `server/middleware/csrf.ts`
- Client: `getCsrfToken()` em `client/src/lib/api.ts`
- Automático via `fetchWithAuth()` e `getAuthHeaders()`

## Consequências

- **Positivo**: Proteção CSRF sem setup complexo
- **Positivo**: Transparente — `fetchWithAuth()` inclui automaticamente
- **Negativo**: Cookie precisa ser acessível por JS (não httpOnly)
