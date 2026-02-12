/**
 * Receipt Config Routes
 * Dracma credential configuration endpoints (status, get, save, delete)
 */

import { type Express, type Request, type Response } from 'express';
import { sql } from '../../neonConfig';
import { logger } from '../../utils/logger';
import { asyncHandler, sendSuccess, sendError } from '../../utils';
import { isAdminOrPastor } from './receiptHelpers';

export const receiptConfigRoutes = (app: Express): void => {
  /**
   * @swagger
   * /api/receipts/dracma-config/status:
   *   get:
   *     summary: Verifica se pastor tem credenciais configuradas
   *     tags: [Receipts]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Status da configuração
   */
  app.get(
    '/api/receipts/dracma-config/status',
    asyncHandler(async (req: Request, res: Response) => {
      // @ts-ignore
      const userId = req.user?.id;
      // @ts-ignore
      const userRole = req.user?.role;

      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      if (!isAdminOrPastor(userRole)) {
        return sendError(res, 'Only pastors can configure Dracma credentials', 403);
      }

      const configs = await sql<{ key: string }>`
        SELECT key FROM automation_config
        WHERE user_id = ${userId}
        AND key IN ('dracma_username', 'dracma_password')
        AND value != 'CHANGE_ME'
      `;

      const isConfigured = configs.length >= 2;

      sendSuccess(res, {
        isConfigured,
        hasUsername: configs.some(c => c.key === 'dracma_username'),
        hasPassword: configs.some(c => c.key === 'dracma_password'),
      });
    })
  );

  /**
   * @swagger
   * /api/receipts/dracma-config:
   *   get:
   *     summary: Busca credenciais do pastor (mascaradas)
   *     tags: [Receipts]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Credenciais mascaradas
   */
  app.get(
    '/api/receipts/dracma-config',
    asyncHandler(async (req: Request, res: Response) => {
      // @ts-ignore
      const userId = req.user?.id;
      // @ts-ignore
      const userRole = req.user?.role;

      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      if (!isAdminOrPastor(userRole)) {
        return sendError(res, 'Only pastors can access Dracma credentials', 403);
      }

      const configs = await sql<{ key: string; value: string }>`
        SELECT key, value FROM automation_config
        WHERE user_id = ${userId}
        AND key IN ('dracma_username', 'dracma_password', 'n8n_api_key', 'ocr_space_api_key')
      `;

      const result: {
        dracmaUsername: string | null;
        dracmaPassword: string | null;
        n8nApiKey: string | null;
        ocrApiKey: string | null;
      } = {
        dracmaUsername: null,
        dracmaPassword: null,
        n8nApiKey: null,
        ocrApiKey: null,
      };

      configs.forEach(c => {
        if (c.key === 'dracma_username') {
          result.dracmaUsername = c.value;
        } else if (c.key === 'dracma_password') {
          // Mascarar senha
          result.dracmaPassword = '••••••••';
        } else if (c.key === 'n8n_api_key') {
          // Mostrar apenas início
          result.n8nApiKey = `${c.value.substring(0, 20)}...`;
        } else if (c.key === 'ocr_space_api_key') {
          // Mostrar apenas início
          result.ocrApiKey = `${c.value.substring(0, 15)}...`;
        }
      });

      sendSuccess(res, result);
    })
  );

  /**
   * @swagger
   * /api/receipts/dracma-config:
   *   post:
   *     summary: Salva/atualiza credenciais do Dracma
   *     tags: [Receipts]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - dracmaUsername
   *               - dracmaPassword
   *             properties:
   *               dracmaUsername:
   *                 type: string
   *               dracmaPassword:
   *                 type: string
   *               ocrApiKey:
   *                 type: string
   *     responses:
   *       200:
   *         description: Credenciais salvas com sucesso
   */
  app.post(
    '/api/receipts/dracma-config',
    asyncHandler(async (req: Request, res: Response) => {
      // @ts-ignore
      const userId = req.user?.id;
      // @ts-ignore
      const userRole = req.user?.role;
      // @ts-ignore
      const userDistrictId = req.user?.district_id;

      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      if (!isAdminOrPastor(userRole)) {
        return sendError(res, 'Only pastors can configure Dracma credentials', 403);
      }

      const { dracmaUsername, dracmaPassword, ocrApiKey } = req.body;

      if (!dracmaUsername || !dracmaPassword) {
        return sendError(res, 'Username and password are required', 400);
      }

      // Gerar API key para n8n se não existir
      const existingN8nKey = await sql<{ value: string }>`
        SELECT value FROM automation_config
        WHERE user_id = ${userId}
        AND key = 'n8n_api_key'
      `;

      let n8nApiKey: string;
      if (existingN8nKey.length > 0) {
        n8nApiKey = existingN8nKey[0].value;
      } else {
        // Gerar nova API key
        const crypto = await import('crypto');
        n8nApiKey = crypto.randomBytes(32).toString('hex');
      }

      // Salvar todas as configurações (UPSERT)
      const configs = [
        { key: 'dracma_username', value: dracmaUsername, encrypted: false },
        { key: 'dracma_password', value: dracmaPassword, encrypted: true },
        { key: 'n8n_api_key', value: n8nApiKey, encrypted: false },
      ];

      if (ocrApiKey && ocrApiKey !== '') {
        configs.push({ key: 'ocr_space_api_key', value: ocrApiKey, encrypted: false });
      }

      for (const config of configs) {
        // Verificar se já existe
        const existing = await sql<{ id: number }>`
          SELECT id FROM automation_config
          WHERE key = ${config.key}
          AND user_id = ${userId}
        `;

        if (existing.length > 0) {
          // UPDATE
          await sql`
            UPDATE automation_config
            SET value = ${config.value}, updated_at = NOW()
            WHERE key = ${config.key}
            AND user_id = ${userId}
          `;
        } else {
          // INSERT
          await sql`
            INSERT INTO automation_config (key, value, user_id, district_id, encrypted)
            VALUES (
              ${config.key},
              ${config.value},
              ${userId},
              ${userDistrictId || null},
              ${config.encrypted}
            )
          `;
        }
      }

      logger.info(`✅ Credenciais do Dracma configuradas para usuário ${userId}`);

      sendSuccess(res, {
        success: true,
        message: 'Credenciais salvas com sucesso',
        n8nApiKey: `${n8nApiKey.substring(0, 20)}...`,
      });
    })
  );

  /**
   * @swagger
   * /api/receipts/dracma-config:
   *   delete:
   *     summary: Remove configuração do Dracma
   *     tags: [Receipts]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Configuração removida
   */
  app.delete(
    '/api/receipts/dracma-config',
    asyncHandler(async (req: Request, res: Response) => {
      // @ts-ignore
      const userId = req.user?.id;
      // @ts-ignore
      const userRole = req.user?.role;

      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      if (!isAdminOrPastor(userRole)) {
        return sendError(res, 'Only pastors can remove Dracma credentials', 403);
      }

      await sql`
        DELETE FROM automation_config
        WHERE user_id = ${userId}
        AND key IN ('dracma_username', 'dracma_password', 'n8n_api_key', 'ocr_space_api_key')
      `;

      logger.info(`🗑️ Credenciais do Dracma removidas para usuário ${userId}`);

      sendSuccess(res, {
        success: true,
        message: 'Configuração removida com sucesso',
      });
    })
  );
};
