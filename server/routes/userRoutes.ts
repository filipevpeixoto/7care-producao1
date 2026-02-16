/**
 * User Routes - Compose Module
 * Original monolithic file (1209 lines) decomposed into:
 * - users/userHelpers.ts: Shared helpers (formatBirthdayUser, redactUserPII)
 * - users/userCrudRoutes.ts: CRUD + approval
 * - users/userPointsRoutes.ts: Points & birthdays
 * - users/userSpecialRoutes.ts: Chat, interested, bulk import
 */
import { type Express } from 'express';
import { userCrudRoutes } from './users/userCrudRoutes';
import { userPointsRoutes } from './users/userPointsRoutes';
import { userSpecialRoutes } from './users/userSpecialRoutes';

/** Registers user management routes (CRUD, points, chat, bulk import) */
export const userRoutes = (app: Express): void => {
  // userSpecialRoutes registered first to ensure /api/users/chat-list
  // is defined before /api/users/:id param routes in userCrudRoutes
  userSpecialRoutes(app);
  userCrudRoutes(app);
  userPointsRoutes(app);
};
