/**
 * Receipt Routes - Shared Helpers
 * Common utilities, schemas, and types used across receipt sub-modules
 */

import { z } from 'zod';

/**
 * Zod schema for n8n receipt ingest webhook payload
 */
export const receiptIngestSchema = z.object({
  whatsappNumber: z.string(),
  imageUrl: z.string().url(),
  ocrProvider: z.enum(['ocrspace', 'mindee', 'tesseract']),
  ocrRawData: z.any(),
  ocrConfidence: z.number().optional(),
  merchantName: z.string().optional(),
  receiptDate: z.string().optional(), // dd/mm/yyyy format
  totalAmount: z.string().optional(),
  taxId: z.string().optional(),
  category: z.string().optional(),
});

/**
 * Roles allowed to access admin/pastor endpoints
 */
export const ADMIN_ROLES = ['pastor', 'admin', 'superadmin'] as const;

/**
 * Check if role has admin/pastor access
 */
export const isAdminOrPastor = (role: string | undefined): boolean => {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
};

/**
 * Type for the receipt list query used in admin routes
 */
export type ReceiptAdminRow = {
  id: number;
  user_id: number;
  user_name: string;
  merchant_name: string | null;
  receipt_date: string | null;
  total_amount: string | null;
  status: string;
  image_url: string;
  created_at: string;
  category: string | null;
  ocr_confidence: number | null;
  whatsapp_number: string | null;
};

/**
 * Type for the receipt list with dracma fields
 */
export type ReceiptWithDracmaRow = {
  id: number;
  user_id: number;
  user_name: string;
  merchant_name: string | null;
  receipt_date: string | null;
  total_amount: string | null;
  status: string;
  image_url: string;
  created_at: string;
  dracma_submitted_at: string | null;
  dracma_confirmation_id: string | null;
};

/**
 * Type for receipt stats query result
 */
export type ReceiptStatsRow = {
  total: number;
  pending: number;
  submitted: number;
  error: number;
  total_amount_sum: number;
};
