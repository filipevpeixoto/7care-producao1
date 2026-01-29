# ADR-002: Arquitetura de Autenticação JWT

**Status:** Aceito  
**Data:** 2026-01-28  
**Decisores:** Equipe de Desenvolvimento

## Contexto

O sistema 7Care precisa de autenticação para controlar acesso de usuários com diferentes níveis de permissão (SuperAdmin, Pastor, Membro, etc.). A aplicação é uma SPA (Single Page Application) com backend API REST.

Requisitos:

- Autenticação stateless para serverless
- Suporte a múltiplos níveis de acesso
- Segurança adequada para dados sensíveis
- Renovação de tokens sem re-login frequente

## Decisão

Implementamos autenticação baseada em **JWT (JSON Web Tokens)** com:

1. **Access Token:** Curta duração (1 hora)
2. **Armazenamento:** localStorage (com cuidados de XSS)
3. **Payload:** ID, email, role do usuário
4. **Validação:** Middleware em todas as rotas protegidas

```typescript
// Estrutura do token
{
  id: number,
  email: string,
  role: UserRole,
  iat: number,
  exp: number
}
```

## Alternativas Consideradas

### Session-based (cookies)

- **Prós:** Mais seguro contra XSS, gerenciamento automático
- **Contras:** Requer estado no servidor, complexo em serverless

### OAuth2 com provider externo (Auth0, Clerk)

- **Prós:** Segurança enterprise, menos código
- **Contras:** Custo adicional, dependência externa

### Refresh Tokens

- **Prós:** Melhor UX, tokens mais curtos
- **Contras:** Complexidade adicional, storage seguro

## Consequências

### Positivas

- Stateless, perfeito para serverless
- Fácil de implementar e debugar
- Payload contém info necessária (menos queries)
- Suporte a múltiplos clients

### Negativas

- Vulnerável a XSS se não tratado
- Não é possível invalidar token antes da expiração
- Token exposto em localStorage

### Mitigações Implementadas

- CSP headers para prevenir XSS
- Validação de input em todos endpoints
- JWT_SECRET forte e único por ambiente
- HTTPS obrigatório em produção

## Referências

- [JWT Best Practices](https://auth0.com/blog/jwt-security-best-practices/)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
