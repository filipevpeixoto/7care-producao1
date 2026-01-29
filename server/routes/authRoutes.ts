/**
 * Rotas de Autenticação
 * Login, registro, logout, reset e alteração de senha
 */

import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NeonAdapter } from '../neonAdapter';
import { insertUserSchema } from '../../shared/schema';
import {
  handleError,
  handleBadRequest,
  handleNotFound,
  handleUnauthorized,
} from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { authLimiter, registerLimiter, sensitiveLimiter } from '../middleware/rateLimiter';
import { ApiSuccessResponse } from '../types';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { loginSchema, changePasswordSchema, resetPasswordSchema } from '../schemas';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwtConfig';
import { requireStrongPassword, getPasswordSuggestions } from '../utils/passwordValidator';

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
    async (req: Request, res: Response) => {
      try {
        const { email, password } = (req as ValidatedRequest<typeof loginSchema._type>)
          .validatedBody;

        // Try to find user by email first
        let user = await storage.getUserByEmail(email);

        // If not found by email, try to find by username (generated from name)
        if (!user) {
          const allUsers = await storage.getAllUsers();
          const normalize = (str: string) =>
            str
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9.]/g, '')
              .toLowerCase();

          const normalizedInput = normalize(email);

          const foundUser = allUsers.find(u => {
            const nameParts = u.name.trim().split(' ');
            let generatedUsername = '';
            if (nameParts.length === 1) {
              generatedUsername = normalize(nameParts[0]);
            } else {
              const firstName = normalize(nameParts[0]);
              const lastName = normalize(nameParts[nameParts.length - 1]);
              generatedUsername = `${firstName}.${lastName}`;
            }
            return generatedUsername === normalizedInput;
          });

          user = foundUser || null;
        }

        // Verify password - garantir que password existe
        const userPassword = user?.password || '';
        if (user && userPassword && (await bcrypt.compare(password, userPassword))) {
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

          const response: ApiSuccessResponse = {
            success: true,
            data: {
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
            },
          };

          res.json({
            success: true,
            token,
            user: (response.data as { user: unknown })?.user,
          });
        } else {
          logger.authFailure('Invalid credentials', email);
          handleUnauthorized(res, 'Invalid credentials');
        }
      } catch (error) {
        handleError(res, error, 'Login');
      }
    }
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
  app.post('/api/auth/register', registerLimiter, async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email || '');
      if (existingUser) {
        handleBadRequest(res, 'User already exists');
        return;
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
        isApproved: userRole === 'interested', // Auto-approve interested users
        status: userRole === 'interested' ? 'approved' : 'pending',
      } as Parameters<typeof storage.createUser>[0]);

      logger.info(`New user registered: ${user.email}`);

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          firstAccess: user.firstAccess,
        },
      });
    } catch (error) {
      handleError(res, error, 'Registration');
      return;
    }
  });

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
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
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
        handleBadRequest(res, 'User ID is required');
        return;
      }

      if (isNaN(id)) {
        handleBadRequest(res, 'Invalid user ID');
        return;
      }

      const user = await storage.getUserById(id);

      if (!user) {
        handleNotFound(res, 'User');
        return;
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
    } catch (error) {
      handleError(res, error, 'Get current user');
    }
  });

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
  app.get('/api/user/church', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId;

      if (!userId) {
        handleBadRequest(res, 'User ID is required');
        return;
      }

      const id = parseInt(userId as string);
      if (isNaN(id)) {
        handleBadRequest(res, 'Invalid user ID');
        return;
      }

      const user = await storage.getUserById(id);

      if (!user) {
        handleNotFound(res, 'User');
        return;
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

      res.json({
        success: true,
        church: churchName || 'Igreja não disponível',
        userId: id,
      });
    } catch (error) {
      handleError(res, error, 'Get user church');
    }
  });

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
    async (req: Request, res: Response) => {
      try {
        const { email } = (req as ValidatedRequest<typeof resetPasswordSchema._type>).validatedBody;

        const user = await storage.getUserByEmail(email);
        if (!user) {
          handleNotFound(res, 'User');
          return;
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

          res.json({
            success: true,
            message: 'Password reset successfully',
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              isApproved: updatedUser.isApproved,
              status: updatedUser.status,
              firstAccess: updatedUser.firstAccess,
            },
          });
        } else {
          handleError(res, new Error('Failed to reset password'), 'Reset password');
        }
      } catch (error) {
        handleError(res, error, 'Reset password');
      }
    }
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
    async (req: Request, res: Response) => {
      try {
        const { userId, currentPassword, newPassword } = (
          req as ValidatedRequest<typeof changePasswordSchema._type>
        ).validatedBody;

        const user = await storage.getUserById(userId);
        if (!user) {
          handleNotFound(res, 'User');
          return;
        }

        // Verify current password - garantir que password existe
        const userPassword = user.password || '';
        if (!userPassword || !(await bcrypt.compare(currentPassword, userPassword))) {
          handleUnauthorized(res, 'Current password is incorrect');
          return;
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

          return res.json({
            success: true,
            message: 'Password changed successfully',
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              isApproved: updatedUser.isApproved,
              status: updatedUser.status,
              firstAccess: updatedUser.firstAccess,
            },
          });
        } else {
          handleError(res, new Error('Failed to update password'), 'Change password');
          return;
        }
      } catch (error) {
        handleError(res, error, 'Change password');
        return;
      }
    }
  );
};
