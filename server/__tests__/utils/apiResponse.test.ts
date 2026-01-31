/**
 * Testes para apiResponse utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  success,
  error,
  paginated,
  type SuccessResponse,
  type ErrorResponse,
  type PaginatedResponse,
} from '../../utils/apiResponse';

describe('apiResponse', () => {
  describe('success()', () => {
    it('deve criar resposta de sucesso com dados', () => {
      const data = { id: 1, name: 'Test User' };
      const response: SuccessResponse<typeof data> = success(data);

      expect(response).toEqual({
        success: true,
        data: { id: 1, name: 'Test User' },
      });
    });

    it('deve criar resposta de sucesso com mensagem', () => {
      const data = { id: 1 };
      const response = success(data, 'Operação bem-sucedida');

      expect(response).toEqual({
        success: true,
        data: { id: 1 },
        message: 'Operação bem-sucedida',
      });
    });

    it('deve aceitar qualquer tipo de dados', () => {
      const stringResponse = success('texto');
      const numberResponse = success(42);
      const arrayResponse = success([1, 2, 3]);

      expect(stringResponse.data).toBe('texto');
      expect(numberResponse.data).toBe(42);
      expect(arrayResponse.data).toEqual([1, 2, 3]);
    });
  });

  describe('error()', () => {
    it('deve criar resposta de erro simples', () => {
      const response: ErrorResponse = error('Algo deu errado');

      expect(response).toEqual({
        success: false,
        error: 'Algo deu errado',
      });
    });

    it('deve criar resposta de erro com código', () => {
      const response = error('Não autorizado', 'UNAUTHORIZED');

      expect(response).toEqual({
        success: false,
        error: 'Não autorizado',
        code: 'UNAUTHORIZED',
      });
    });

    it('deve criar resposta de erro com código e detalhes', () => {
      const details = { field: 'email', message: 'Email inválido' };
      const response = error('Validação falhou', 'VALIDATION_ERROR', details);

      expect(response).toEqual({
        success: false,
        error: 'Validação falhou',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', message: 'Email inválido' },
      });
    });
  });

  describe('paginated()', () => {
    it('deve criar resposta paginada correta', () => {
      const data = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ];
      const response: PaginatedResponse<(typeof data)[0]> = paginated(data, 1, 10, 25);

      expect(response).toEqual({
        success: true,
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
      });
    });

    it('deve calcular totalPages corretamente', () => {
      const data: never[] = [];

      // Exatamente divisível
      const response1 = paginated(data, 1, 10, 50);
      expect(response1.pagination.totalPages).toBe(5);

      // Com resto
      const response2 = paginated(data, 1, 10, 55);
      expect(response2.pagination.totalPages).toBe(6);

      // Menos que um página
      const response3 = paginated(data, 1, 10, 5);
      expect(response3.pagination.totalPages).toBe(1);
    });

    it('deve indicar hasNext corretamente', () => {
      const data: never[] = [];

      const firstPage = paginated(data, 1, 10, 50);
      expect(firstPage.pagination.hasNext).toBe(true);

      const lastPage = paginated(data, 5, 10, 50);
      expect(lastPage.pagination.hasNext).toBe(false);
    });

    it('deve indicar hasPrev corretamente', () => {
      const data: never[] = [];

      const firstPage = paginated(data, 1, 10, 50);
      expect(firstPage.pagination.hasPrev).toBe(false);

      const secondPage = paginated(data, 2, 10, 50);
      expect(secondPage.pagination.hasPrev).toBe(true);
    });
  });
});
