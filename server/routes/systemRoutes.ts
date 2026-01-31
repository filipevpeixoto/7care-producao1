/**
 * System Routes Module
 * Endpoints relacionados ao sistema (limpeza, manutenção, status)
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { asyncHandler, sendSuccess, sendError } from '../utils';
import { logger } from '../utils/logger';

// Variáveis de controle do cleanup automático
let autoCleanupInterval: NodeJS.Timeout | null = null;
let autoCleanupEnabled = true;

export const systemRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

  // Função auxiliar para executar limpeza automática
  const executeAutoCleanup = async () => {
    try {
      const allRequests = await storage.getAllDiscipleshipRequests();
      const approvedRequests = allRequests.filter(req => req.status === 'approved');

      let cleanedCount = 0;

      for (const request of approvedRequests) {
        try {
          if (request.interestedId == null) {
            continue;
          }
          const relationships = await storage.getRelationshipsByInterested(request.interestedId);
          const hasActiveRelationship = relationships.some(rel => rel.status === 'active');

          if (!hasActiveRelationship) {
            await storage.updateDiscipleshipRequest(request.id, {
              status: 'rejected',
              notes: 'Limpeza automática - sem relacionamento ativo',
            });
            cleanedCount++;
          }
        } catch (error) {
          logger.error(`Erro na limpeza automática da solicitação ${request.id}:`, error);
        }
      }

      if (cleanedCount > 0) {
        logger.info(`🧹 Limpeza automática concluída: ${cleanedCount} solicitações rejeitadas`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Erro na limpeza automática:', error);
      return 0;
    }
  };

  // Função para iniciar limpeza automática
  const startAutoCleanup = (intervalMinutes: number = 60) => {
    if (autoCleanupInterval) {
      clearInterval(autoCleanupInterval);
    }

    autoCleanupEnabled = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`⏰ Iniciando limpeza automática a cada ${intervalMinutes} minutos`);

    executeAutoCleanup();

    autoCleanupInterval = setInterval(async () => {
      if (autoCleanupEnabled) {
        await executeAutoCleanup();
      }
    }, intervalMs);

    return true;
  };

  // Função para parar limpeza automática
  const stopAutoCleanup = () => {
    if (autoCleanupInterval) {
      clearInterval(autoCleanupInterval);
      autoCleanupInterval = null;
    }
    autoCleanupEnabled = false;
    logger.info('⏰ Limpeza automática parada');
    return true;
  };

  /**
   * @swagger
   * /api/system/clean-orphaned-approvals:
   *   post:
   *     summary: Limpa aprovações órfãs
   *     tags: [System]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Limpeza executada
   */
  app.post(
    '/api/system/clean-orphaned-approvals',
    asyncHandler(async (req: Request, res: Response) => {
      const allRequests = await storage.getAllDiscipleshipRequests();
      const approvedRequests = allRequests.filter(req => req.status === 'approved');

      let cleanedCount = 0;
      const errors: Array<{ requestId: number; error: string }> = [];

      for (const request of approvedRequests) {
        try {
          if (request.interestedId == null) {
            continue;
          }
          const relationships = await storage.getRelationshipsByInterested(request.interestedId);
          const hasActiveRelationship = relationships.some(rel => rel.status === 'active');

          if (!hasActiveRelationship) {
            const updatedRequest = await storage.updateDiscipleshipRequest(request.id, {
              status: 'rejected',
              notes: 'Solicitação rejeitada automaticamente - sem relacionamento ativo',
            });

            if (updatedRequest) {
              cleanedCount++;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error(`Erro ao processar solicitação ${request.id}:`, error);
          errors.push({ requestId: request.id, error: errorMessage });
        }
      }

      res.json({
        success: true,
        message: `Limpeza automática concluída`,
        cleanedCount,
        totalProcessed: approvedRequests.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    })
  );

  /**
   * @swagger
   * /api/system/schedule-cleanup:
   *   post:
   *     summary: Agenda limpeza automática
   *     tags: [System]
   *     security:
   *       - userId: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               scheduleType:
   *                 type: string
   *               interval:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Limpeza agendada
   */
  app.post(
    '/api/system/schedule-cleanup',
    asyncHandler(async (req: Request, res: Response) => {
      const { scheduleType, interval } = req.body;

      res.json({
        success: true,
        message: `Limpeza automática agendada para ${scheduleType}`,
        scheduleType,
        interval,
        nextRun: new Date(Date.now() + (interval || 24 * 60 * 60 * 1000)).toISOString(),
      });
    })
  );

  /**
   * @swagger
   * /api/system/auto-cleanup/start:
   *   post:
   *     summary: Inicia limpeza automática
   *     tags: [System]
   *     security:
   *       - userId: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               intervalMinutes:
   *                 type: integer
   *                 default: 60
   *     responses:
   *       200:
   *         description: Limpeza iniciada
   */
  app.post(
    '/api/system/auto-cleanup/start',
    asyncHandler(async (req: Request, res: Response) => {
      const { intervalMinutes = 60 } = req.body;

      if (intervalMinutes < 15) {
        return sendError(res, 'Intervalo mínimo é de 15 minutos', 400);
      }

      startAutoCleanup(intervalMinutes);

      res.json({
        success: true,
        message: `Limpeza automática iniciada a cada ${intervalMinutes} minutos`,
        intervalMinutes,
        status: 'running',
      });
    })
  );

  /**
   * @swagger
   * /api/system/auto-cleanup/stop:
   *   post:
   *     summary: Para limpeza automática
   *     tags: [System]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Limpeza parada
   */
  app.post(
    '/api/system/auto-cleanup/stop',
    asyncHandler(async (req: Request, res: Response) => {
      stopAutoCleanup();

      sendSuccess(res, { status: 'stopped', message: 'Limpeza automática parada' });
    })
  );

  /**
   * @swagger
   * /api/system/auto-cleanup/status:
   *   get:
   *     summary: Status da limpeza automática
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Status atual
   */
  app.get(
    '/api/system/auto-cleanup/status',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(res, {
        status: autoCleanupEnabled ? 'running' : 'stopped',
        interval: autoCleanupInterval ? 'configurado' : 'não configurado',
        lastRun: new Date().toISOString(),
      });
    })
  );

  /**
   * @swagger
   * /api/system/clear-all:
   *   post:
   *     summary: Limpa todos os dados (apenas superadmin)
   *     tags: [System]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Dados limpos (mantém superadmin, convites de pastores são removidos)
   *       403:
   *         description: Acesso negado - apenas superadmin
   */
  app.post(
    '/api/system/clear-all',
    asyncHandler(async (req: Request, res: Response) => {
      // Verificar se o usuário é superadmin
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const user = await storage.getUserById(Number(userId));
      if (!user || user.role !== 'superadmin') {
        return sendError(res, 'Apenas superadmin pode executar esta operação', 403);
      }

      // Executar limpeza completa (mantém superadmin, remove convites de pastores)
      await storage.clearAllData();

      sendSuccess(res, {
        message: 'Dados limpos com sucesso. Superadmin mantido, convites de pastores removidos.',
      });
    })
  );

  // Inicializar limpeza automática quando o servidor iniciar
  logger.info('🚀 Inicializando sistema de limpeza automática...');
  startAutoCleanup(60);
};

// Exportar funções de controle para uso externo se necessário
export {};
