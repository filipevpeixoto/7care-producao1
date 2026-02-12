/**
 * User Points Routes
 * Points calculation and birthday endpoints
 */

import { type Express, type Request, type Response } from 'express';
import { type User } from '../../../shared/schema';
import { parseDate } from '../../utils/parsers';
import { hasAdminAccess } from '../../utils/permissions';
import { asyncHandler } from '../../utils';
import { sendSuccess, sendNotFound } from '../../utils/apiResponse';
import { getRepository, getService } from '../../container';
import { getAuthUserId, getAuthUserRole } from '../../utils/authHelpers';
import { formatBirthdayUser } from './userHelpers';

export const userPointsRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const pointsCalcService = getService('pointsCalculationService');

  /**
   * @swagger
   * /api/users/{id}/calculate-points:
   *   get:
   *     summary: Calcula pontos do usuário
   *     tags: [Users, Points]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Pontos calculados
   */
  app.get(
    '/api/users/:id(\\d+)/calculate-points',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt(req.params.id);

      const result = await pointsCalcService.calculateUserPoints(userId);

      if (result && result.success) {
        sendSuccess(res, result);
      } else {
        sendNotFound(res, 'Usuário');
      }
    })
  );

  /**
   * @swagger
   * /api/users/{id}/points-details:
   *   get:
   *     summary: Obtém detalhes de pontos do usuário
   *     tags: [Users, Points]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Detalhes dos pontos
   */
  app.get(
    '/api/users/:id(\\d+)/points-details',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt(req.params.id);

      const user = await userRepo.getUserById(userId);
      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      const result = await pointsCalcService.calculateUserPoints(userId);

      if (result && result.success) {
        sendSuccess(res, {
          success: true,
          userId: user.id,
          userName: user.name,
          currentPoints: user.points,
          calculatedPoints: result.points,
          level: result.level || user.level,
          breakdown: result.breakdown || {},
          details: result.details || {},
          userData: result.userData || {},
        });
      } else {
        sendSuccess(res, {
          success: false,
          userId: user.id,
          userName: user.name,
          currentPoints: user.points,
          calculatedPoints: 0,
          level: user.level,
          breakdown: {},
          details: {},
          error: result?.error || 'Erro ao calcular pontos',
        });
      }
    })
  );

  /**
   * @swagger
   * /api/users/birthdays:
   *   get:
   *     summary: Lista aniversariantes
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: Lista de aniversariantes
   */
  app.get(
    '/api/users/birthdays',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = String(getAuthUserId(req));
      const userRole = getAuthUserRole(req) as string;

      let userChurch: string | null = null;

      if (!hasAdminAccess({ role: userRole as User['role'] }) && userId) {
        const currentUser = await userRepo.getUserById(parseInt(userId));
        if (currentUser && currentUser.church) {
          userChurch = currentUser.church;
        }
      }

      const allUsers = await userRepo.getAllUsers();
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();

      let filteredUsers = allUsers;
      if (userChurch && userRole !== 'admin') {
        filteredUsers = allUsers.filter((user) => user.church === userChurch);
      }

      const usersWithBirthDates = filteredUsers.filter((user) => {
        if (!user.birthDate) return false;
        const birthDate = parseDate(user.birthDate);
        return birthDate && !isNaN(birthDate.getTime()) && birthDate.getFullYear() !== 1969;
      });

      const birthdaysToday = usersWithBirthDates.filter((user) => {
        const birthDate = parseDate(user.birthDate);
        return (
          birthDate && birthDate.getMonth() === currentMonth && birthDate.getDate() === currentDay
        );
      });

      const birthdaysThisMonth = usersWithBirthDates.filter((user) => {
        const birthDate = parseDate(user.birthDate);
        const isThisMonth = birthDate && birthDate.getMonth() === currentMonth;
        const isNotToday = birthDate && !(birthDate.getDate() === currentDay);
        return isThisMonth && isNotToday;
      });

      birthdaysThisMonth.sort((a, b) => {
        const dateA = parseDate(a.birthDate);
        const dateB = parseDate(b.birthDate);
        return (dateA?.getDate() || 0) - (dateB?.getDate() || 0);
      });

      const allBirthdays = usersWithBirthDates.sort((a, b) => {
        const dateA = parseDate(a.birthDate);
        const dateB = parseDate(b.birthDate);
        if (!dateA || !dateB) return 0;

        const monthDiff = dateA.getMonth() - dateB.getMonth();
        if (monthDiff !== 0) return monthDiff;
        return dateA.getDate() - dateB.getDate();
      });

      sendSuccess(res, {
        today: birthdaysToday.map(formatBirthdayUser),
        thisMonth: birthdaysThisMonth.map(formatBirthdayUser),
        all: allBirthdays.map(formatBirthdayUser),
        filteredByChurch: userChurch || null,
      });
    })
  );
};
