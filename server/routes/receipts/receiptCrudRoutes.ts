/**
 * Receipt CRUD Routes
 * Ingest webhook, user receipts listing, and statistics
 */

import { type Express, type Request, type Response } from 'express';
import { sql } from '../../neonConfig';
import { logger } from '../../utils/logger';
import { asyncHandler, sendSuccess, sendError } from '../../utils';
import { receiptIngestSchema, type ReceiptStatsRow } from './receiptHelpers';

export const receiptCrudRoutes = (app: Express): void => {
  /**
   * @swagger
   * /api/receipts/ingest:
   *   post:
   *     summary: Webhook para n8n ingerir recibos processados via OCR
   *     tags: [Receipts]
   *     security:
   *       - apiKey: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - whatsappNumber
   *               - imageUrl
   *               - ocrProvider
   *             properties:
   *               whatsappNumber:
   *                 type: string
   *                 description: Número do WhatsApp do remetente
   *               imageUrl:
   *                 type: string
   *                 description: URL da imagem da nota fiscal
   *               ocrProvider:
   *                 type: string
   *                 enum: [ocrspace, mindee, tesseract]
   *               ocrRawData:
   *                 type: object
   *                 description: Dados brutos do OCR
   *               ocrConfidence:
   *                 type: number
   *                 description: Confiança do OCR (0-100)
   *               merchantName:
   *                 type: string
   *               receiptDate:
   *                 type: string
   *                 format: date
   *               totalAmount:
   *                 type: string
   *               taxId:
   *                 type: string
   *               category:
   *                 type: string
   *     responses:
   *       201:
   *         description: Recibo criado com sucesso
   *       401:
   *         description: API key inválida
   *       404:
   *         description: Usuário não encontrado para o WhatsApp fornecido
   */
  app.post(
    '/api/receipts/ingest',
    asyncHandler(async (req: Request, res: Response) => {
      const apiKey = req.headers['x-api-key'];

      // Validar API key - agora suporta chaves por pastor
      const configResult = await sql<{ key: string; value: string; user_id: number | null }>`
        SELECT key, value, user_id
        FROM automation_config
        WHERE key = 'n8n_api_key'
        AND (value = ${apiKey} OR value = ${apiKey})
        LIMIT 1
      `;

      if (!configResult.length) {
        logger.warn(`❌ Tentativa de acesso com API key inválida: ${apiKey}`);
        return sendError(res, 'Unauthorized: Invalid API key', 401);
      }

      // Validar body
      const validated = receiptIngestSchema.parse(req.body);

      // Encontrar usuário pelo número de WhatsApp (campo phone)
      const userResult = await sql<{ id: number; name: string }>`
        SELECT id, name FROM users
        WHERE phone = ${validated.whatsappNumber}
        LIMIT 1
      `;

      if (!userResult.length) {
        logger.warn(`❌ Usuário não encontrado para WhatsApp: ${validated.whatsappNumber}`);
        return sendError(
          res,
          `User not found for WhatsApp number ${validated.whatsappNumber}`,
          404
        );
      }

      const userId = userResult[0].id;
      const userName = userResult[0].name;

      // Converter data dd/mm/yyyy para yyyy-mm-dd (formato PostgreSQL)
      let receiptDatePg: string | null = null;
      if (validated.receiptDate) {
        const [day, month, year] = validated.receiptDate.split('/');
        receiptDatePg = `${year}-${month}-${day}`;
      }

      // Inserir recibo
      const receiptResult = await sql<{ id: number; status: string; created_at: string }>`
        INSERT INTO expense_receipts (
          user_id, whatsapp_number, image_url, ocr_provider, ocr_raw_data,
          ocr_confidence, merchant_name, receipt_date, total_amount, tax_id,
          category, status, created_at, updated_at
        )
        VALUES (
          ${userId},
          ${validated.whatsappNumber},
          ${validated.imageUrl},
          ${validated.ocrProvider},
          ${JSON.stringify(validated.ocrRawData)},
          ${validated.ocrConfidence || null},
          ${validated.merchantName || null},
          ${receiptDatePg || null},
          ${validated.totalAmount || null},
          ${validated.taxId || null},
          ${validated.category || 'other'},
          'pending',
          NOW(),
          NOW()
        )
        RETURNING id, status, created_at
      `;

      const receipt = receiptResult[0];

      logger.info(`✅ Recibo criado: ID ${receipt.id} para usuário ${userId} (${userName})`);

      // Criar notificação para o usuário
      await sql`
        INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
        VALUES (
          ${userId},
          'Recibo recebido',
          ${`Seu recibo de ${validated.merchantName || 'compra'} no valor de R$ ${validated.totalAmount || '?'} foi recebido e está sendo processado.`},
          'receipt',
          false,
          NOW()
        )
      `;

      sendSuccess(res, {
        success: true,
        receiptId: receipt.id,
        userId,
        userName,
        status: receipt.status,
        message: `Recibo recebido de ${userName}`,
      });
    })
  );

  /**
   * @swagger
   * /api/receipts/my-receipts:
   *   get:
   *     summary: Busca recibos do usuário logado
   *     tags: [Receipts]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Lista de recibos
   *       401:
   *         description: Não autenticado
   */
  app.get(
    '/api/receipts/my-receipts',
    asyncHandler(async (req: Request, res: Response) => {
      // @ts-expect-error userId é injetado pelo middleware de autenticação
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'Unauthorized: User not authenticated', 401);
      }

      const receipts = await sql<
        {
          id: number;
          merchant_name: string | null;
          receipt_date: string | null;
          total_amount: string | null;
          status: string;
          image_url: string;
          created_at: string;
          dracma_submitted_at: string | null;
          dracma_confirmation_id: string | null;
          category: string | null;
          ocr_confidence: number | null;
        }[]
      >`
        SELECT
          id, merchant_name, receipt_date, total_amount, status, image_url,
          created_at, dracma_submitted_at, dracma_confirmation_id, category, ocr_confidence
        FROM expense_receipts
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      logger.info(`📋 Buscando recibos do usuário ${userId}: ${receipts.length} encontrados`);

      sendSuccess(res, receipts);
    })
  );

  /**
   * @swagger
   * /api/receipts/stats:
   *   get:
   *     summary: Estatísticas de recibos (usuário logado ou admin)
   *     tags: [Receipts]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Estatísticas
   */
  app.get(
    '/api/receipts/stats',
    asyncHandler(async (req: Request, res: Response) => {
      // @ts-expect-error user é injetado pelo middleware de autenticação
      const userId = req.user?.id;
      // @ts-expect-error user é injetado pelo middleware de autenticação
      const userRole = req.user?.role;
      // @ts-expect-error user é injetado pelo middleware de autenticação
      const userDistrictId = req.user?.district_id;

      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      const isAdmin = ['admin', 'superadmin'].includes(userRole);
      const isPastor = userRole === 'pastor';

      let stats;

      if (isAdmin) {
        // Admin/Superadmin: estatísticas globais
        stats = await sql<ReceiptStatsRow[]>`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
            SUM(
              CASE
                WHEN total_amount IS NOT NULL AND total_amount <> ''
                THEN CAST(REPLACE(REPLACE(total_amount, '.', ''), ',', '.') AS DECIMAL(10, 2))
                ELSE 0
              END
            ) as total_amount_sum
          FROM expense_receipts
        `;
      } else if (isPastor && userDistrictId) {
        // Pastor: estatísticas da sua igreja
        stats = await sql<ReceiptStatsRow[]>`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN er.status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN er.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN er.status = 'error' THEN 1 ELSE 0 END) as error,
            SUM(
              CASE
                WHEN er.total_amount IS NOT NULL AND er.total_amount <> ''
                THEN CAST(REPLACE(REPLACE(er.total_amount, '.', ''), ',', '.') AS DECIMAL(10, 2))
                ELSE 0
              END
            ) as total_amount_sum
          FROM expense_receipts er
          JOIN users u ON er.user_id = u.id
          WHERE u.district_id = ${userDistrictId}
        `;
      } else {
        // Usuário: estatísticas pessoais
        stats = await sql<ReceiptStatsRow[]>`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
            SUM(
              CASE
                WHEN total_amount IS NOT NULL AND total_amount <> ''
                THEN CAST(REPLACE(REPLACE(total_amount, '.', ''), ',', '.') AS DECIMAL(10, 2))
                ELSE 0
              END
            ) as total_amount_sum
          FROM expense_receipts
          WHERE user_id = ${userId}
        `;
      }

      sendSuccess(
        res,
        stats[0] || { total: 0, pending: 0, submitted: 0, error: 0, total_amount_sum: 0 }
      );
    })
  );
};
