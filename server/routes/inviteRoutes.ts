/**
 * Invite Routes - Compose Module
 *
 * Original monolithic file (1361 lines) decomposed into:
 * - invite/inviteHelpers.ts: Shared imports, multer setup, re-exports (~40 lines)
 * - invite/inviteCrudRoutes.ts: CRUD/management routes - superadmin (~135 lines)
 * - invite/onboardingRoutes.ts: Public token-gated onboarding flow (~580 lines)
 * - invite/inviteReviewRoutes.ts: Superadmin review routes - approve/reject (~475 lines)
 */
import { type Express } from 'express';
import { inviteCrudRoutes } from './invite/inviteCrudRoutes';
import { onboardingRoutes } from './invite/onboardingRoutes';
import { inviteReviewRoutes } from './invite/inviteReviewRoutes';

export const inviteRoutes = (app: Express): void => {
  inviteCrudRoutes(app);
  onboardingRoutes(app);
  inviteReviewRoutes(app);
};
