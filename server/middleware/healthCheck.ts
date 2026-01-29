/**
 * Health Check Middleware
 * Endpoints para monitoramento de saúde da aplicação
 * @module middleware/healthCheck
 */

import { Router, Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    memory: CheckResult;
    api: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

const startTime = Date.now();

/**
 * Verifica conexão com banco de dados
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return { status: 'fail', message: 'DATABASE_URL not configured' };
    }

    const sql = neon(connectionString);
    await sql`SELECT 1 as health_check`;

    const latency = Date.now() - start;
    return {
      status: latency < 500 ? 'pass' : 'warn',
      latency,
      message: latency < 500 ? 'Database responding normally' : 'Database responding slowly',
    };
  } catch (error) {
    return {
      status: 'fail',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Verifica uso de memória
 */
function checkMemory(): CheckResult {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const usagePercent = (used.heapUsed / used.heapTotal) * 100;

  let status: 'pass' | 'warn' | 'fail' = 'pass';
  let message = 'Memory usage normal';

  if (usagePercent > 90) {
    status = 'fail';
    message = 'Critical memory usage';
  } else if (usagePercent > 75) {
    status = 'warn';
    message = 'High memory usage';
  }

  return {
    status,
    message,
    details: {
      heapUsedMB,
      heapTotalMB,
      usagePercent: Math.round(usagePercent),
      rssMB: Math.round(used.rss / 1024 / 1024),
    },
  };
}

/**
 * Health check simples - para load balancers
 * GET /health
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health check completo - para monitoramento detalhado
 * GET /health/detailed
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const [dbCheck, memCheck] = await Promise.all([checkDatabase(), Promise.resolve(checkMemory())]);

  const apiCheck: CheckResult = { status: 'pass', message: 'API responding' };

  // Determina status geral
  const checks = { database: dbCheck, memory: memCheck, api: apiCheck };
  const allStatuses = Object.values(checks).map(c => c.status);

  let overallStatus: HealthStatus['status'] = 'healthy';
  if (allStatuses.includes('fail')) {
    overallStatus = 'unhealthy';
  } else if (allStatuses.includes('warn')) {
    overallStatus = 'degraded';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  };

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  res.status(httpStatus).json(healthStatus);
});

/**
 * Readiness check - indica se a aplicação está pronta para receber tráfego
 * GET /health/ready
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  const dbCheck = await checkDatabase();

  if (dbCheck.status === 'fail') {
    res.status(503).json({
      ready: false,
      reason: 'Database not available',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness check - indica se a aplicação está viva
 * GET /health/live
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
});

export const healthCheckRouter = router;
export default healthCheckRouter;
