/**
 * Testes do módulo de respostas
 */

const {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  rateLimitResponse,
  toCamelCase,
  toSnakeCase,
  getCorsHeaders
} = require('../../netlify/functions/modules/responses.cjs');

describe('Responses Module', () => {
  describe('successResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = successResponse(data);
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });

    it('should include message when provided', () => {
      const response = successResponse({ id: 1 }, 'Created successfully', 201);
      
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Created successfully');
    });

    it('should include CORS headers', () => {
      const response = successResponse({});
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('errorResponse', () => {
    it('should create an error response', () => {
      const response = errorResponse('Something went wrong', 400);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Something went wrong');
    });

    it('should include error code when provided', () => {
      const response = errorResponse('Invalid data', 400, 'VALIDATION_ERROR');
      
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should include details when provided', () => {
      const response = errorResponse('Error', 400, null, { field: 'email' });
      
      const body = JSON.parse(response.body);
      expect(body.details).toEqual({ field: 'email' });
    });
  });

  describe('paginatedResponse', () => {
    it('should create a paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = paginatedResponse(items, 50, 1, 10);
      
      const body = JSON.parse(response.body);
      expect(body.data.items).toEqual(items);
      expect(body.data.pagination.total).toBe(50);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(10);
      expect(body.data.pagination.totalPages).toBe(5);
      expect(body.data.pagination.hasMore).toBe(true);
    });

    it('should indicate no more pages on last page', () => {
      const response = paginatedResponse([{ id: 1 }], 10, 1, 10);
      
      const body = JSON.parse(response.body);
      expect(body.data.pagination.hasMore).toBe(false);
    });
  });

  describe('validationErrorResponse', () => {
    it('should create a validation error response', () => {
      const errors = ['Nome é obrigatório', 'Email inválido'];
      const response = validationErrorResponse(errors);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details.errors).toEqual(errors);
    });
  });

  describe('notFoundResponse', () => {
    it('should create a not found response', () => {
      const response = notFoundResponse('Usuário');
      
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Usuário não encontrado');
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should use default resource name', () => {
      const response = notFoundResponse();
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Recurso não encontrado');
    });
  });

  describe('unauthorizedResponse', () => {
    it('should create an unauthorized response', () => {
      const response = unauthorizedResponse();
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Não autorizado');
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('should use custom message', () => {
      const response = unauthorizedResponse('Token expirado');
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Token expirado');
    });
  });

  describe('forbiddenResponse', () => {
    it('should create a forbidden response', () => {
      const response = forbiddenResponse();
      
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Acesso negado');
      expect(body.code).toBe('FORBIDDEN');
    });
  });

  describe('serverErrorResponse', () => {
    it('should create a server error response', () => {
      const error = new Error('Database connection failed');
      const response = serverErrorResponse(error);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Erro interno do servidor');
      expect(body.code).toBe('INTERNAL_ERROR');
    });

    it('should not include stack in production', () => {
      const error = new Error('Test error');
      const response = serverErrorResponse(error, false);
      
      const body = JSON.parse(response.body);
      expect(body.stack).toBeUndefined();
    });
  });

  describe('rateLimitResponse', () => {
    it('should create a rate limit response', () => {
      const response = rateLimitResponse(120);
      
      expect(response.statusCode).toBe(429);
      expect(response.headers['Retry-After']).toBe('120');
      
      const body = JSON.parse(response.body);
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.details.retryAfter).toBe(120);
    });
  });

  describe('toCamelCase', () => {
    it('should convert snake_case keys to camelCase', () => {
      const input = {
        user_id: 1,
        first_name: 'John',
        created_at: '2023-01-01'
      };
      const result = toCamelCase(input);
      
      expect(result.userId).toBe(1);
      expect(result.firstName).toBe('John');
      expect(result.createdAt).toBe('2023-01-01');
      expect(result.user_id).toBeUndefined();
    });

    it('should handle nested objects', () => {
      const input = {
        user_data: {
          first_name: 'John',
          last_name: 'Doe'
        }
      };
      const result = toCamelCase(input);
      
      expect(result.userData.firstName).toBe('John');
      expect(result.userData.lastName).toBe('Doe');
    });

    it('should handle arrays', () => {
      const input = [
        { user_id: 1 },
        { user_id: 2 }
      ];
      const result = toCamelCase(input);
      
      expect(result[0].userId).toBe(1);
      expect(result[1].userId).toBe(2);
    });

    it('should handle null/undefined', () => {
      expect(toCamelCase(null)).toBe(null);
      expect(toCamelCase(undefined)).toBe(undefined);
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase keys to snake_case', () => {
      const input = {
        userId: 1,
        firstName: 'John',
        createdAt: '2023-01-01'
      };
      const result = toSnakeCase(input);
      
      expect(result.user_id).toBe(1);
      expect(result.first_name).toBe('John');
      expect(result.created_at).toBe('2023-01-01');
    });

    it('should handle nested objects', () => {
      const input = {
        userData: {
          firstName: 'John'
        }
      };
      const result = toSnakeCase(input);
      
      expect(result.user_data.first_name).toBe('John');
    });
  });

  describe('getCorsHeaders', () => {
    it('should return correct CORS headers', () => {
      const headers = getCorsHeaders();
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
    });
  });
});
