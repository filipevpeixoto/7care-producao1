# Documentação da API REST

## Visão Geral

A API do 7Care é uma API RESTful que segue as convenções padrão HTTP. Todas as respostas são em formato JSON.

### Base URL

- **Desenvolvimento**: `http://localhost:5000/api`
- **Produção**: `https://seu-site.netlify.app/api`

### Autenticação

A API usa JWT (JSON Web Tokens) para autenticação. Inclua o token no header:

```http
Authorization: Bearer <seu-token-jwt>
```

---

## Endpoints

### Autenticação

#### POST /api/auth/login

Autentica um usuário e retorna um token JWT.

**Request Body:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "role": "member"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros:**
- `401`: Credenciais inválidas
- `429`: Muitas tentativas (rate limit)

---

#### POST /api/auth/register

Registra um novo usuário.

**Request Body:**
```json
{
  "name": "Nome Completo",
  "email": "novo@exemplo.com",
  "password": "senha123",
  "church": "Nome da Igreja",
  "churchCode": "IGR01"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": 2,
    "name": "Nome Completo",
    "email": "novo@exemplo.com",
    "role": "member"
  }
}
```

---

#### POST /api/auth/logout

Invalida o token atual do usuário.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

### Usuários

#### GET /api/users

Lista usuários com paginação e filtros.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | number | Página atual (default: 1) |
| limit | number | Itens por página (default: 20) |
| search | string | Busca por nome ou email |
| role | string | Filtrar por role |
| status | string | Filtrar por status |
| churchId | number | Filtrar por igreja |

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "role": "member",
      "status": "active",
      "points": 150
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

---

#### GET /api/users/:id

Retorna um usuário específico.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "role": "member",
    "church": "Igreja Central",
    "points": 150,
    "level": "Bronze",
    "streak": 5
  }
}
```

---

#### POST /api/users

Cria um novo usuário (requer permissão de admin).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Maria Santos",
  "email": "maria@exemplo.com",
  "password": "senha123",
  "role": "member",
  "church": "Igreja Central",
  "churchCode": "IGR01"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": 3,
    "name": "Maria Santos",
    "email": "maria@exemplo.com",
    "role": "member"
  }
}
```

---

#### PUT /api/users/:id

Atualiza um usuário existente.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Maria Santos Silva",
  "phone": "11999999999"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 3,
    "name": "Maria Santos Silva",
    "phone": "11999999999"
  }
}
```

---

#### DELETE /api/users/:id

Desativa um usuário (soft delete).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Usuário desativado com sucesso"
}
```

---

### Eventos

#### GET /api/events

Lista eventos com filtros.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| startDate | string | Data inicial (ISO 8601) |
| endDate | string | Data final (ISO 8601) |
| type | string | Tipo do evento |
| churchId | number | Filtrar por igreja |

**Response (200):**
```json
{
  "success": true,
  "events": [
    {
      "id": 1,
      "title": "Culto de Celebração",
      "date": "2024-01-20T19:00:00Z",
      "type": "culto",
      "location": "Templo Principal"
    }
  ]
}
```

---

#### POST /api/events

Cria um novo evento.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Reunião de Oração",
  "date": "2024-01-25T19:00:00Z",
  "type": "reuniao",
  "location": "Sala 01",
  "description": "Reunião semanal de oração"
}
```

**Response (201):**
```json
{
  "success": true,
  "event": {
    "id": 2,
    "title": "Reunião de Oração",
    "date": "2024-01-25T19:00:00Z"
  }
}
```

---

### Gamificação

#### GET /api/gamification/ranking

Retorna o ranking de pontos.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| limit | number | Quantidade de usuários (default: 10) |
| churchId | number | Filtrar por igreja |

**Response (200):**
```json
{
  "success": true,
  "ranking": [
    { "rank": 1, "userId": 5, "name": "Ana Paula", "points": 500 },
    { "rank": 2, "userId": 3, "name": "Carlos", "points": 450 },
    { "rank": 3, "userId": 8, "name": "Julia", "points": 400 }
  ]
}
```

---

#### GET /api/system/points-config

Retorna a configuração de pontos do sistema.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "engajamento": {
    "alto": 100,
    "medio": 50,
    "baixo": 25
  },
  "classificacao": {
    "frequente": 100,
    "naoFrequente": 0
  },
  "dizimista": {
    "recorrente": 100,
    "sazonal": 60,
    "pontual": 30,
    "nao": 0
  }
}
```

---

### Igrejas

#### GET /api/churches

Lista todas as igrejas.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "churches": [
    {
      "id": 1,
      "name": "Igreja Central",
      "code": "IGR01",
      "address": "Rua Principal, 100"
    }
  ]
}
```

---

#### GET /api/churches/:id/members

Lista membros de uma igreja.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "members": [
    {
      "id": 1,
      "name": "João Silva",
      "role": "member",
      "status": "active"
    }
  ],
  "total": 50
}
```

---

### Eleições

#### GET /api/elections/configs

Lista configurações de eleição.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "configs": [
    {
      "id": 1,
      "churchName": "Igreja Central",
      "status": "active",
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  ]
}
```

---

#### POST /api/elections/vote

Registra um voto na eleição.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "electionId": 1,
  "candidateId": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Voto registrado com sucesso"
}
```

---

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |

---

## Rate Limiting

A API implementa rate limiting para proteger contra abusos:

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/api/auth/login` | 5 requisições | 15 minutos |
| `/api/*` (geral) | 100 requisições | 1 minuto |
| `/api/upload/*` | 10 requisições | 5 minutos |
| Operações sensíveis | 20 requisições | 1 hora |

Headers de resposta incluem:
- `X-RateLimit-Limit`: Limite total
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Timestamp de reset

---

## Formato de Erro

Todos os erros seguem o formato:

```json
{
  "success": false,
  "error": "Mensagem de erro legível",
  "code": "ERROR_CODE",
  "details": ["Detalhes adicionais se aplicável"]
}
```

### Códigos de Erro Comuns

| Código | Descrição |
|--------|-----------|
| `INVALID_CREDENTIALS` | Email ou senha incorretos |
| `TOKEN_EXPIRED` | Token JWT expirado |
| `PERMISSION_DENIED` | Sem permissão para a ação |
| `VALIDATION_ERROR` | Dados inválidos |
| `NOT_FOUND` | Recurso não encontrado |
| `RATE_LIMIT_EXCEEDED` | Limite de requisições excedido |

---

## Versionamento

A API usa versionamento via URL path. A versão atual é v1 (implícita).

Futuras versões serão acessíveis via `/api/v2/...`

---

## Webhooks (Futuro)

Webhooks estão planejados para futuras versões para notificar sobre:
- Novos usuários registrados
- Eventos criados
- Votos em eleições
- Atualizações de pontos

---

## SDKs e Bibliotecas

### JavaScript/TypeScript

```typescript
// Exemplo de uso com fetch
const response = await fetch('https://api.7care.com/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### React Query

```typescript
import { useQuery } from '@tanstack/react-query';

const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.get('/users').then(r => r.data)
});
```

---

## Suporte

Para dúvidas sobre a API:
1. Consulte esta documentação
2. Verifique os exemplos no Swagger UI (`/api-docs`)
3. Abra uma issue no GitHub
