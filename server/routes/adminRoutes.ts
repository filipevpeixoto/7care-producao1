/**
 * Admin Routes
 * Rotas administrativas para monitoramento e gestão do sistema
 * @module routes/adminRoutes
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware';
import { auditService } from '../services/auditService';
import { monitoringService } from '../services/monitoringService';
import { getRateLimitStats } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

// Todas as rotas admin requerem autenticação e role super_admin
router.use(requireAuth);
router.use(requireRole('superadmin'));

/**
 * @swagger
 * /api/admin/audit:
 *   get:
 *     summary: Lista logs de auditoria
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtrar por ação
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filtrar por usuário
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de logs de auditoria
 *       403:
 *         description: Sem permissão
 */
router.get(
  '/audit',
  asyncHandler(async (req: Request, res: Response) => {
    const { action, userId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const result = await auditService.getLogs({
      action: action as
        | 'CREATE'
        | 'READ'
        | 'UPDATE'
        | 'DELETE'
        | 'LOGIN'
        | 'LOGOUT'
        | 'LOGIN_FAILED'
        | 'PASSWORD_CHANGE'
        | 'PERMISSION_CHANGE'
        | 'EXPORT'
        | 'IMPORT'
        | 'BULK_UPDATE'
        | 'BULK_DELETE'
        | undefined,
      userId: userId ? parseInt(userId as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    sendSuccess(res, result);
  })
);

/**
 * @swagger
 * /api/admin/audit/stats:
 *   get:
 *     summary: Obtém estatísticas de auditoria
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de auditoria
 */
router.get(
  '/audit/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await auditService.getStats();
    sendSuccess(res, stats);
  })
);

/**
 * @swagger
 * /api/admin/metrics:
 *   get:
 *     summary: Obtém métricas do sistema
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas do sistema
 */
router.get(
  '/metrics',
  asyncHandler(async (_req: Request, res: Response) => {
    const metrics = monitoringService.getMetrics();
    sendSuccess(res, metrics);
  })
);

/**
 * @swagger
 * /api/admin/rate-limit/stats:
 *   get:
 *     summary: Obtém estatísticas do rate limiter
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas do rate limiter
 */
router.get(
  '/rate-limit/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = getRateLimitStats();
    sendSuccess(res, stats);
  })
);

/**
 * @swagger
 * /api/admin/errors:
 *   get:
 *     summary: Lista erros recentes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de erros recentes
 */
router.get(
  '/errors',
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 50 } = req.query;
    const errors = monitoringService.getRecentErrors(parseInt(limit as string));
    sendSuccess(res, errors);
  })
);

/**
 * @swagger
 * /api/admin/system/info:
 *   get:
 *     summary: Informações do sistema
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informações do sistema
 */
router.get(
  '/system/info',
  asyncHandler(async (_req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    sendSuccess(res, {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime),
      },
      memory: {
        heapUsed: formatBytes(memoryUsage.heapUsed),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        external: formatBytes(memoryUsage.external),
        rss: formatBytes(memoryUsage.rss),
      },
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  })
);

// Helpers
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

export { router as adminRoutes };
export default router;
