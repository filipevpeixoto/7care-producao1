/**
 * Receipt Admin Routes
 * Admin/Pastor endpoints for viewing and managing receipts
 */

import { type Express, type Request, type Response } from 'express';
import { sql } from '../../neonConfig';
import { logger } from '../../utils/logger';
import { asyncHandler, sendSuccess, sendError } from '../../utils';
import { type ReceiptAdminRow, type ReceiptWithDracmaRow } from './receiptHelpers';

export const receiptAdminRoutes = (app: Express): void => {
  /**
   * @swagger
   * /api/receipts/admin/pending:
   *   get:
   *     summary: Busca recibos pendentes (admin/pastor)
   *     tags: [Receipts]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Lista de recibos pendentes
   *       403:
   *         description: Sem permissão
   */
  app.get(
    '/api/receipts/admin/pending',
    asyncHandler(async (req: Request, res: Response) => {
      // @ts-ignore - user é injetado pelo middleware de autenticação
      const userRole = req.user?.role;
      // @ts-ignore
      const userId = req.user?.id;
      // @ts-ignore
      const userDistrictId = req.user?.district_id;

      if (userRole !== 'pastor' && userRole !== 'admin' && userRole !== 'superadmin') {
        return sendError(res, 'Forbidden: Only admins and pastors can access this endpoint', 403);
      }

      let receipts;

      // Pastores veem apenas recibos da sua igreja
      if (userRole === 'pastor' && userDistrictId) {
        receipts = await sql<ReceiptAdminRow[]>`
          SELECT
            er.id, er.user_id, u.name as user_name,
            er.merchant_name, er.receipt_date, er.total_amount, er.status,
            er.image_url, er.created_at, er.category, er.ocr_confidence, er.whatsapp_number
          FROM expense_receipts er
          JOIN users u ON er.user_id = u.id
          WHERE er.status = 'pending'
          AND u.district_id = ${userDistrictId}
          ORDER BY er.created_at DESC
          LIMIT 100
        `;
      } else {
        // Admins e superadmins veem todos os recibos
        receipts = await sql<ReceiptAdminRow[]>`
          SELECT
            er.id, er.user_id, u.name as user_name,
            er.merchant_name, er.receipt_date, er.total_amount, er.status,
            er.image_url, er.created_at, er.category, er.ocr_confidence, er.whatsapp_number
          FROM expense_receipts er
          JOIN users u ON er.user_id = u.id
          WHERE er.status = 'pending'
          ORDER BY er.created_at DESC
          LIMIT 100
        `;
      }

      logger.info(
        `📋 ${userRole} (ID ${userId}) buscando recibos pendentes: ${receipts.length} encontrados`
      );

      sendSuccess(res, receipts);
    })
  );

  /**
   * @swagger
   * /api/receipts/admin/all:
   *   get:
   *     summary: Busca todos os recibos (admin/pastor)
   *     tags: [Receipts]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, processing, submitted, error]
   *         description: Filtrar por status
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *           default: 100
   *         description: Número máximo de recibos
   *     responses:
   *       200:
   *         description: Lista de recibos
   *       403:
   *         description: Sem permissão
   */
  app.get(
    '/api/receipts/admin/all',
    asyncHandler(async (req: Request, res: Response) => {
      // @ts-ignore
      const userRole = req.user?.role;
      // @ts-ignore
      const userDistrictId = req.user?.district_id;

      if (userRole !== 'pastor' && userRole !== 'admin' && userRole !== 'superadmin') {
        return sendError(res, 'Forbidden', 403);
      }

      const { status, limit = 100 } = req.query;
      const limitNum = parseInt(limit as string, 10) || 100;

      let receipts;

      // Filtro de igreja para pastores
      const isPastor = userRole === 'pastor';

      if (status) {
        receipts = await sql<ReceiptWithDracmaRow[]>`
          SELECT
            er.id, er.user_id, u.name as user_name,
            er.merchant_name, er.receipt_date, er.total_amount, er.status,
            er.image_url, er.created_at, er.dracma_submitted_at, er.dracma_confirmation_id
          FROM expense_receipts er
          JOIN users u ON er.user_id = u.id
          WHERE er.status = ${status}
          ${isPastor && userDistrictId ? sql`AND u.district_id = ${userDistrictId}` : sql``}
          ORDER BY er.created_at DESC
          LIMIT ${limitNum}
        `;
      } else {
        receipts = await sql<ReceiptWithDracmaRow[]>`
          SELECT
            er.id, er.user_id, u.name as user_name,
            er.merchant_name, er.receipt_date, er.total_amount, er.status,
            er.image_url, er.created_at, er.dracma_submitted_at, er.dracma_confirmation_id
          FROM expense_receipts er
          JOIN users u ON er.user_id = u.id
          ${isPastor && userDistrictId ? sql`WHERE u.district_id = ${userDistrictId}` : sql``}
          ORDER BY er.created_at DESC
          LIMIT ${limitNum}
        `;
      }

      sendSuccess(res, receipts);
    })
  );
};
