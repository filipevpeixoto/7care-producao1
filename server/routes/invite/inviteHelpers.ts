/**
 * Invite Helpers - Shared utilities for invite sub-modules
 *
 * Contains the multer upload setup and re-exports common dependencies
 * used across invite route sub-modules.
 */

import multer from 'multer';

// Multer upload configuration for file handling
export const upload = multer({ dest: 'uploads/' });

// Re-export common dependencies for convenience
// Sub-modules can import directly from source if preferred
export { db } from '../../neonConfig';
export { pastorInvites, users, districts, churches } from '../../schema';
export { requireAuth } from '../../middleware';
export { type AuthenticatedRequest } from '../../types';
export { logger } from '../../utils/logger';
export { getAuthUserId } from '../../utils/authHelpers';
export { BCRYPT_SALT_ROUNDS, DEFAULT_RESET_PASSWORD } from '../../config/security';
export { asyncHandler } from '../../utils';
export { readExcelFile, cleanupTempFile } from '../../utils/excelUtils';
export {
  type CreateInviteDTO,
  type SubmitOnboardingDTO,
  type RejectInviteDTO,
  type OnboardingData,
  type ExcelRow,
  type CreateInviteResponse,
  type ValidateTokenResponse,
  type ApproveInviteResponse,
  type ChurchValidation,
} from '../../types/pastor-invite.types';
export { extractChurchesFromExcel, validateExcelChurches } from '../../utils/church-validation';
export { isSuperAdmin } from '../../utils/permissions';
export { getRepository } from '../../container';
export { sendSuccess, sendError, sendNotFound } from '../../utils/apiResponse';
