/**
 * Rotas de Autenticação
 * Login, registro, logout, reset e alteração de senha
 */

import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NeonAdapter } from '../neonAdapter';
import { insertUserSchema } from '../../shared/schema';
import { handleBadRequest, handleNotFound, handleUnauthorized } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { authLimiter, registerLimiter, sensitiveLimiter } from '../middleware/rateLimiter';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { loginSchema, changePasswordSchema, resetPasswordSchema } from '../schemas';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwtConfig';
import { requireStrongPassword, getPasswordSuggestions } from '../utils/passwordValidator';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendUnauthorized } from '../utils/apiResponse';

// SEGURANÇA: JWT_SECRET e validações agora centralizadas em config/jwtConfig.ts

type JwtUserPayload = {
  id: number;
  email: string;
  role: string;
  name: string;
};

export const authRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

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
      const { email, password } = (req as ValidatedRequest<typeof loginSchema._type>).validatedBody;

      // Try to find user by email first
      let user = await storage.getUserByEmail(email);

      // If not found by email, try to find by normalized username (O(1) with index)
      if (!user) {
        user = await storage.getUserByNormalizedUsername(email);
      }

      // Verify password
      const userPassword = user?.password || '';
      if (!user || !userPassword || !(await bcrypt.compare(password, userPassword))) {
        logger.authFailure('Invalid credentials', email);
        return sendUnauthorized(res, 'Credenciais inválidas');
      }

      // Check if user is using the default password "meu7care"
      const isUsingDefaultPassword = await bcrypt.compare('meu7care', userPassword);
      const shouldForceFirstAccess = isUsingDefaultPassword;

      logger.authSuccess(user.id, user.email);

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        } satisfies JwtUserPayload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          church: user.church,
          isApproved: user.isApproved,
          status: user.status,
          firstAccess: shouldForceFirstAccess ? true : user.firstAccess,
          usingDefaultPassword: isUsingDefaultPassword,
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
      const existingUser = await storage.getUserByEmail(userData.email || '');
      if (existingUser) {
        return handleBadRequest(res, 'Usuário já existe');
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

      const userRole = (req.body.role as string) || 'interested';

      const user = await storage.createUser({
        ...userData,
        role: userRole,
        isApproved: userRole === 'interested',
        status: userRole === 'interested' ? 'approved' : 'pending',
      } as Parameters<typeof storage.createUser>[0]);

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
  app.post('/api/auth/logout', (_req: Request, res: Response) => {
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
    asyncHandler(async (req: Request, res: Response) => {
      const headerUserId = req.headers['x-user-id'] || req.headers['user-id'];
      const authHeaderValue = req.headers.authorization;
      const rawAuth = Array.isArray(authHeaderValue) ? authHeaderValue[0] : authHeaderValue;
      const authHeader = rawAuth ? String(rawAuth) : '';

      let id: number | null = null;
      const rawUserId =
        (req.query.userId ? String(req.query.userId) : undefined) ||
        (headerUserId
          ? String(Array.isArray(headerUserId) ? headerUserId[0] : headerUserId)
          : undefined);
      if (rawUserId) {
        const parsed = parseInt(rawUserId, 10);
        if (!Number.isNaN(parsed)) id = parsed;
      }

      if (id === null && authHeader.startsWith('Bearer ') && JWT_SECRET) {
        const token = authHeader.slice('Bearer '.length).trim();
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as Partial<JwtUserPayload>;
          if (typeof decoded?.id === 'number') id = decoded.id;
        } catch {
          id = null;
        }
      }

      if (id === null) {
        return handleBadRequest(res, 'ID do usuário é obrigatório');
      }

      if (isNaN(id)) {
        return handleBadRequest(res, 'ID do usuário inválido');
      }

      const user = await storage.getUserById(id);

      if (!user) {
        return handleNotFound(res, 'Usuário');
      }

      // If user doesn't have a church, assign the first available church
      if (!user.church) {
        const churches = await storage.getAllChurches();
        if (churches.length > 0) {
          const firstChurch = churches[0];
          await storage.updateUserChurch(id, firstChurch.name);
          user.church = firstChurch.name;
        }
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
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.query.userId;

      if (!userId) {
        return handleBadRequest(res, 'User ID is required');
      }

      const id = parseInt(userId as string);
      if (isNaN(id)) {
        return handleBadRequest(res, 'Invalid user ID');
      }

      const user = await storage.getUserById(id);

      if (!user) {
        return handleNotFound(res, 'User');
      }

      // If user doesn't have a church, get the first available one
      let churchName = user.church;
      if (!churchName) {
        const churches = await storage.getAllChurches();
        if (churches.length > 0) {
          churchName = churches[0].name;
          try {
            await storage.updateUserChurch(id, churchName || '');
          } catch (updateError) {
            logger.error('Error updating user church:', updateError);
          }
        }
      }

      sendSuccess(res, {
        church: churchName || 'Igreja não disponível',
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

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return handleNotFound(res, 'User');
      }

      // Hash default password
      const hashedPassword = await bcrypt.hash('meu7care', 10);

      // Update user password and set firstAccess to true
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
        firstAccess: true,
        updatedAt: new Date().toISOString(),
      });

      if (updatedUser) {
        logger.info(`Password reset for user: ${user.email}`);

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
          },
          200,
          'Password reset successfully'
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
    validateBody(changePasswordSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, currentPassword, newPassword } = (
        req as ValidatedRequest<typeof changePasswordSchema._type>
      ).validatedBody;

      const user = await storage.getUserById(userId);
      if (!user) {
        return handleNotFound(res, 'User');
      }

      // Verify current password - garantir que password existe
      const userPassword = user.password || '';
      if (!userPassword || !(await bcrypt.compare(currentPassword, userPassword))) {
        return handleUnauthorized(res, 'Current password is incorrect');
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
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and set firstAccess to false
      const updatedUser = await storage.updateUser(userId, {
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
      } else {
        throw new Error('Failed to update password');
      }
    })
  );
};
