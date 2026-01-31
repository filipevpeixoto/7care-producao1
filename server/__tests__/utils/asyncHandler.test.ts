/**
 * Testes para asyncHandler utility
 */

import { describe, it, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler, asyncHandlerWithNotFound } from '../../utils/asyncHandler';

// Mock de Request e Response
const createMockRequest = (overrides = {}): Request => {
  return {
    path: '/test',
    method: 'GET',
    ...overrides,
  } as Request;
};

const createMockResponse = (): Response => {
  const res: any = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.headersSent = false;
  return res;
};

const createMockNext = (): NextFunction => jest.fn() as NextFunction;

describe('asyncHandler', () => {
  it('deve executar handler assíncrono sem erros', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ success: true });
    });

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve capturar erros e enviar resposta 500', async () => {
    const testError = new Error('Test error');
    const handler = asyncHandler(async () => {
      throw testError;
    });

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  });

  it('não deve enviar resposta se headersSent = true', async () => {
    const testError = new Error('Test error');
    const handler = asyncHandler(async () => {
      throw testError;
    });

    const req = createMockRequest();
    const res = createMockResponse();
    res.headersSent = true;
    const next = createMockNext();

    await handler(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(testError);
  });

  it('deve permitir que handler retorne Promise<void>', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ data: 'test' });
      return;
    });

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ data: 'test' });
  });
});

describe('asyncHandlerWithNotFound', () => {
  it('deve retornar dados quando recurso existe', async () => {
    const mockData = { id: 1, name: 'Test' };
    const handler = asyncHandlerWithNotFound(async () => mockData, 'Recurso');

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockData,
    });
  });

  it('deve retornar 404 quando recurso é null', async () => {
    const handler = asyncHandlerWithNotFound(async () => null, 'Usuário');

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Usuário não encontrado',
      code: 'NOT_FOUND',
    });
  });

  it('deve usar nome de recurso padrão quando não fornecido', async () => {
    const handler = asyncHandlerWithNotFound(async () => null);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Recurso não encontrado',
      code: 'NOT_FOUND',
    });
  });
});
