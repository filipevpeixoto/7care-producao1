/**
 * Receipt Routes - Compose Module
 * Original monolithic file (832 lines) decomposed into:
 * - receipts/receiptHelpers.ts: Shared schemas, types, and utility functions
 * - receipts/receiptCrudRoutes.ts: Ingest webhook, my-receipts, stats
 * - receipts/receiptAdminRoutes.ts: Admin pending & all receipts listing
 * - receipts/receiptConfigRoutes.ts: Dracma credential configuration (CRUD)
 */
import { type Express } from 'express';
import { receiptCrudRoutes } from './receipts/receiptCrudRoutes';
import { receiptAdminRoutes } from './receipts/receiptAdminRoutes';
import { receiptConfigRoutes } from './receipts/receiptConfigRoutes';

export const receiptRoutes = (app: Express): void => {
  // Config routes registered first so /api/receipts/dracma-config/status
  // is defined before any potential param-based routes
  receiptConfigRoutes(app);
  receiptCrudRoutes(app);
  receiptAdminRoutes(app);
};
