# ADR-005: fetchWithAuth como padrão de API

## Status: Aceito

## Contexto

Chamadas de API eram feitas com `fetch()` nativo com headers manuais (`x-user-id`, `x-user-role`, etc.), criando:
- Duplicação de código de autenticação em 22+ arquivos
- Risco de segurança (headers de identidade falsificáveis)
- Inconsistência na proteção CSRF

## Decisão

Usar `fetchWithAuth()` do módulo `client/src/lib/api.ts` para TODAS as chamadas API.

A função adiciona automaticamente:
- `Authorization: Bearer {jwt}` — autenticação via JWT
- `x-csrf-token: {token}` — proteção CSRF
- `Content-Type: application/json` — tipo de conteúdo padrão

## Consequências

- **Positivo**: Autenticação centralizada em um único módulo
- **Positivo**: CSRF automático em todas as requests
- **Positivo**: Retry com backoff via `fetchWithRetry()`
- **Regra**: Nunca enviar `x-user-id` ou `x-user-role` manualmente
- **Regra**: Server extrai identidade do JWT, nunca de headers manuais
