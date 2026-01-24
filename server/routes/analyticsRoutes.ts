/**
 * Analytics Routes Module
 * Endpoints para coleta de métricas de performance e Web Vitals
 */

import { Express, Request, Response } from 'express';
import { logger } from '../utils/logger';

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

interface VitalsPayload {
  vitals: WebVital[];
  url: string;
  userAgent: string;
  timestamp: number;
}

/**
 * Rotas de Analytics
 */
export const analyticsRoutes = (app: Express): void => {
  
  /**
   * @swagger
   * /api/analytics/vitals:
   *   post:
   *     summary: Envia métricas de Web Vitals
   *     tags: [Analytics]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               vitals:
   *                 type: array
   *                 items:
   *                   type: object
   *               url:
   *                 type: string
   *               userAgent:
   *                 type: string
   *     responses:
   *       200:
   *         description: Vitals registrados com sucesso
   */
  app.post("/api/analytics/vitals", async (req: Request, res: Response) => {
    try {
      const { vitals, url, userAgent, timestamp }: VitalsPayload = req.body;
      
      // Validação básica
      if (!vitals || !Array.isArray(vitals)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Payload inválido' 
        });
      }

      // Em produção, você pode querer armazenar isso em um banco de dados
      // ou enviar para um serviço de analytics (DataDog, New Relic, etc)
      logger.info('📊 Web Vitals recebidos:', {
        url,
        userAgent: userAgent?.substring(0, 50), // Truncar para não poluir logs
        vitalsCount: vitals.length,
        vitals: vitals.map(v => ({
          name: v.name,
          value: v.value,
          rating: v.rating
        }))
      });

      // Identificar vitals problemáticos
      const poorVitals = vitals.filter(v => v.rating === 'poor');
      if (poorVitals.length > 0) {
        logger.warn('⚠️ Vitals com performance ruim detectados:', {
          url,
          poorVitals: poorVitals.map(v => `${v.name}: ${v.value}`)
        });
      }

      res.json({ 
        success: true, 
        message: 'Vitals registrados',
        received: vitals.length
      });
    } catch (error) {
      logger.error('❌ Erro ao processar vitals:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao processar vitals' 
      });
    }
  });

  /**
   * @swagger
   * /api/analytics/error:
   *   post:
   *     summary: Registra erros do frontend
   *     tags: [Analytics]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               message:
   *                 type: string
   *               stack:
   *                 type: string
   *               componentStack:
   *                 type: string
   *     responses:
   *       200:
   *         description: Erro registrado
   */
  app.post("/api/analytics/error", async (req: Request, res: Response) => {
    try {
      const { message, stack, componentStack, url } = req.body;
      
      logger.error('🔴 Erro capturado do frontend:', {
        message,
        url,
        stack: stack?.substring(0, 200), // Limitar tamanho
        component: componentStack?.split('\n')[0]
      });

      res.json({ success: true });
    } catch (error) {
      // Não fazer nada se falhar - evitar loop infinito
      res.status(200).json({ success: false });
    }
  });

  /**
   * @swagger
   * /api/analytics/performance:
   *   get:
   *     summary: Retorna métricas de performance do servidor
   *     tags: [Analytics]
   *     responses:
   *       200:
   *         description: Métricas de performance
   */
  app.get("/api/analytics/performance", async (_req: Request, res: Response) => {
    try {
      const metrics = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      };

      res.json(metrics);
    } catch (error) {
      logger.error('❌ Erro ao buscar métricas:', error);
      res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
  });
};
