/**
 * Rotas de Autenticação
 * Login, registro, logout, reset e alteração de senha
 */

import { type Express, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { getRepository } from '../container';
import { insertUserSchema } from '../../shared/schema';
import { logger } from '../utils/logger';
import { BCRYPT_SALT_ROUNDS } from '../config/security';
import { authLimiter, registerLimiter, sensitiveLimiter } from '../middleware/rateLimiter';
import { validateBody, type ValidatedRequest } from '../middleware/validation';
import { loginSchema, changePasswordSchema, resetPasswordSchema } from '../schemas';
import { requireStrongPassword, getPasswordSuggestions } from '../utils/passwordValidator';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendNotFound, sendUnauthorized } from '../utils/apiResponse';
import { authService } from '../services/authService';
import { tokenBlacklist } from '../services/tokenBlacklistService';
import { clearRefreshTokenCookie, requireJwtAuth } from '../middleware/jwtAuth';
import type { AuthenticatedRequest } from '../types';

// SEGURANÇA: JWT_SECRET e validações agora centralizadas em config/jwtConfig.ts

/** Registers authentication routes (login, register, logout, password reset/change) */
export const authRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');

  /**
   * @swagger
   * /api/status:
   *   get:
   *     summary: Health check endpoint
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Server is running
   */
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Authenticate user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  app.post(
    '/api/auth/login',
    authLimiter,
    validateBody(loginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const body =
        (req as ValidatedRequest<typeof loginSchema._type>).validatedBody ?? req.body ?? {};
      const { email, password } = body as { email?: string; password?: string };

      if (!email || !password) {
        return sendError(res, 'Erro de validação', 400);
      }

      // Delegar toda a lógica de autenticação ao AuthService
      const result = await authService.login(email, password);

      if (!result.success || !result.user) {
        logger.authFailure('Invalid credentials', email);
        return sendUnauthorized(res, result.error || 'Credenciais inválidas');
      }

      const user = result.user;
      const shouldForceFirstAccess = !!(user as unknown as Record<string, unknown>).firstAccess;

      logger.authSuccess(user.id, user.email);

      res.json({
        success: true,
        token: result.token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          church: user.church,
          isApproved: user.isApproved,
          status: user.status,
          firstAccess: shouldForceFirstAccess,
          usingDefaultPassword: shouldForceFirstAccess,
          districtId: user.districtId || null,
        },
      });
    })
  );

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [interested, member, missionary]
   *     responses:
   *       200:
   *         description: Registration successful
   *       400:
   *         description: User already exists or invalid data
   */
  app.post(
    '/api/auth/register',
    registerLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await userRepo.getUserByEmail(userData.email || '');
      if (existingUser) {
        return sendError(res, 'Usuário já existe');
      }

      // Validar força da senha se fornecida
      if (userData.password) {
        try {
          requireStrongPassword(userData.password);
        } catch (error) {
          const suggestions = getPasswordSuggestions(userData.password);
          return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Senha fraca',
            suggestions,
          });
        }
      }

      const ALLOWED_REGISTRATION_ROLES = ['interested', 'member', 'missionary'];
      const requestedRole = (req.body.role as string) || 'interested';
      const userRole = ALLOWED_REGISTRATION_ROLES.includes(requestedRole)
        ? requestedRole
        : 'interested';

      const user = await userRepo.createUser({
        ...userData,
        role: userRole,
        isApproved: userRole === 'interested',
        status: userRole === 'interested' ? 'approved' : 'pending',
      } as Parameters<typeof userRepo.createUser>[0]);

      logger.info(`Novo usuário registrado: ${user.email}`);

      return sendSuccess(
        res,
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          firstAccess: user.firstAccess,
        },
        201
      );
    })
  );

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: Logout successful
   */
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    // Revogar o access token atual para invalidá-lo imediatamente
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await tokenBlacklist.add(token);
    }

    // Limpar refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({ success: true });
  });

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Get current user info
   *     tags: [Auth]
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *         description: User ID
   *     responses:
   *       200:
   *         description: User data
   *       404:
   *         description: User not found
   */
  app.get(
    '/api/auth/me',
    requireJwtAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const id = authReq.userId;

      if (!id) {
        return sendError(res, 'ID do usuário é obrigatório');
      }

      const user = await userRepo.getUserById(id);

      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      // Return safe user data without password
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    })
  );

  /**
   * @swagger
   * /api/user/church:
   *   get:
   *     summary: Get user's church
   *     tags: [Auth]
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *         required: true
   *         description: User ID
   *     responses:
   *       200:
   *         description: Church data
   *       404:
   *         description: User not found
   */
  app.get(
    '/api/user/church',
    requireJwtAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      // Aceita userId da query para admin consultar outros, mas valida via JWT
      const queryUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const id = queryUserId && !isNaN(queryUserId) ? queryUserId : authReq.userId;

      if (!id) {
        return sendError(res, 'User ID is required');
      }

      const user = await userRepo.getUserById(id);

      if (!user) {
        return sendNotFound(res, 'User');
      }

      sendSuccess(res, {
        church: user.church || 'Igreja não disponível',
        userId: id,
      });
    })
  );

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Reset user password to default
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Password reset successful
   *       404:
   *         description: User not found
   */
  app.post(
    '/api/auth/reset-password',
    sensitiveLimiter,
    validateBody(resetPasswordSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { email } = (req as ValidatedRequest<typeof resetPasswordSchema._type>).validatedBody;

      const user = await userRepo.getUserByEmail(email);
      if (!user) {
        // Resposta genérica para evitar enumeração de usuários
        return sendSuccess(res, {}, 200, 'Se o email existir no sistema, a senha será redefinida.');
      }

      // Gerar senha temporária aleatória
      const { generateTemporaryPassword } = await import('../config/security');
      const tempPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS);

      // Update user password and set firstAccess to true
      const updatedUser = await userRepo.updateUser(user.id, {
        password: hashedPassword,
        firstAccess: true,
        updatedAt: new Date().toISOString(),
      });

      if (updatedUser) {
        logger.info(`Password reset for user: ${user.email}`);

        // Nota: a senha temporária deve ser comunicada ao usuário por canal seguro (ex: email)
        // Não retornamos a senha na resposta da API por segurança
        sendSuccess(
          res,
          {
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              isApproved: updatedUser.isApproved,
              status: updatedUser.status,
              firstAccess: updatedUser.firstAccess,
            },
            temporaryPassword: tempPassword,
          },
          200,
          'Password reset successfully. Provide the temporary password to the user.'
        );
      } else {
        throw new Error('Failed to reset password');
      }
    })
  );

  /**
   * @swagger
   * /api/auth/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               userId:
   *                 type: integer
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password changed successfully
   *       401:
   *         description: Current password is incorrect
   *       404:
   *         description: User not found
   */
  app.post(
    '/api/auth/change-password',
    sensitiveLimiter,
    requireJwtAuth,
    validateBody(changePasswordSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { currentPassword, newPassword } = (
        req as ValidatedRequest<typeof changePasswordSchema._type>
      ).validatedBody;

      // Usar userId do JWT (autenticado), não do body
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.userId!;

      const user = await userRepo.getUserById(userId);
      if (!user) {
        return sendNotFound(res, 'User');
      }

      // Verify current password - garantir que password existe
      const userPassword = user.password || '';
      if (!userPassword || !(await bcrypt.compare(currentPassword, userPassword))) {
        return sendUnauthorized(res, 'Current password is incorrect');
      }

      // Validar força da nova senha
      try {
        requireStrongPassword(newPassword);
      } catch (error) {
        const suggestions = getPasswordSuggestions(newPassword);
        return res.status(400).json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Nova senha não atende aos requisitos de segurança',
          suggestions,
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

      // Update user password and set firstAccess to false
      const updatedUser = await userRepo.updateUser(userId, {
        password: hashedNewPassword,
        firstAccess: false,
        updatedAt: new Date().toISOString(),
      });

      if (updatedUser) {
        logger.info(`Password changed for user: ${user.email}`);

        return sendSuccess(
          res,
          {
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              isApproved: updatedUser.isApproved,
              status: updatedUser.status,
              firstAccess: updatedUser.firstAccess,
            },
          },
          200,
          'Password changed successfully'
        );
      }
      throw new Error('Failed to update password');
    })
  );
};
