/**
 * Overview Routes
 * Routes: /api/reports/overview, /api/reports/growth-trends, /api/reports/goals
 */

import { type Express, type Request, type Response } from 'express';
import { getRepository } from '../../container';
import { sql } from '../../neonConfig';
import { isSuperAdmin, isPastor } from '../../utils/permissions';
import { asyncHandler } from '../../utils';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { getAuthUserId, getEffectiveDistrictId } from '../../utils/authHelpers';
import { getUsersForReport, getEngagementScore, getSpiritualStage } from './reportsHelpers';

export const overviewRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');

  /**
   * @swagger
   * /api/reports/overview:
   *   get:
   *     summary: Obtém visão geral dos relatórios (para SuperAdmin e Pastor)
   *     tags: [Reports]
   *     security:
   *       - userId: []
   */
  app.get(
    '/api/reports/overview',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user) && !isPastor(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      const allDistricts = await sql`SELECT * FROM districts`;

      // ISOLATION FIX: Usar helper centralizado com filtro de distrito
      const effectiveDistrictId = getEffectiveDistrictId(req, user);
      const {
        users: usersToInclude,
        churches: churchesToInclude,
        events: eventsToInclude,
      } = await getUsersForReport(user, effectiveDistrictId);

      // Calculate metrics
      const regularUsers = usersToInclude;
      const usersByRole = regularUsers.reduce(
        (acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Spiritual stages funnel
      const spiritualStages = regularUsers.reduce(
        (acc, user) => {
          const stage = getSpiritualStage(user);
          acc[stage] = (acc[stage] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Engagement distribution
      const engagementLevels = { alto: 0, medio: 0, baixo: 0 };
      regularUsers.forEach((user) => {
        const score = getEngagementScore(user);
        if (score >= 70) engagementLevels.alto++;
        else if (score >= 40) engagementLevels.medio++;
        else engagementLevels.baixo++;
      });

      // Average engagement score
      const avgEngagement =
        regularUsers.length > 0
          ? regularUsers.reduce((sum, u) => sum + getEngagementScore(u), 0) / regularUsers.length
          : 0;

      // Tithers and donors
      const tithers = regularUsers.filter((u) => u.isTither).length;
      const donors = regularUsers.filter((u) => u.isDonor).length;
      const withLesson = regularUsers.filter((u) => u.hasLesson).length;
      const baptized = regularUsers.filter((u) => u.baptismDate).length;

      // Events this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const eventsThisMonth = eventsToInclude.filter((e) => {
        const eventDate = new Date(e.date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      }).length;

      // Growth trend (users created this month vs last month)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const usersThisMonth = regularUsers.filter((u) => {
        const createdAt = u.createdAt ? new Date(u.createdAt) : null;
        return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      const usersLastMonth = regularUsers.filter((u) => {
        const createdAt = u.createdAt ? new Date(u.createdAt) : null;
        return createdAt && createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
      }).length;

      const growthRate =
        usersLastMonth > 0
          ? ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100
          : usersThisMonth > 0
            ? 100
            : 0;

      sendSuccess(res, {
        // Basic counts
        totalUsers: regularUsers.length,
        totalChurches: churchesToInclude.length,
        totalEvents: eventsToInclude.length,
        totalDistricts: allDistricts.length,

        // By role
        usersByRole,

        // Spiritual stages funnel
        spiritualStages,

        // Engagement
        engagementLevels,
        avgEngagement: Math.round(avgEngagement),

        // Financial/spiritual
        tithers,
        donors,
        withLesson,
        baptized,
        tithersPercentage:
          regularUsers.length > 0 ? Math.round((tithers / regularUsers.length) * 100) : 0,
        donorsPercentage:
          regularUsers.length > 0 ? Math.round((donors / regularUsers.length) * 100) : 0,

        // Events
        eventsThisMonth,

        // Growth
        usersThisMonth,
        usersLastMonth,
        growthRate: Math.round(growthRate),
      });
    })
  );

  /**
   * @swagger
   * /api/reports/growth-trends:
   *   get:
   *     summary: Tendências de crescimento ao longo do tempo
   *     tags: [Reports]
   */
  app.get(
    '/api/reports/growth-trends',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user) && !isPastor(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      // PERFORMANCE FIX: Usar helper otimizado
      const { users: usersToInclude } = await getUsersForReport(
        user,
        getEffectiveDistrictId(req, user)
      );

      // Last 6 months data
      const now = new Date();
      const months: Array<{
        month: string;
        year: number;
        monthNum: number;
        newUsers: number;
        newInterested: number;
        newBaptized: number;
        newMembers: number;
      }> = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const newUsers = usersToInclude.filter((u) => {
          const createdAt = u.createdAt ? new Date(u.createdAt) : null;
          return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
        }).length;

        const newInterested = usersToInclude.filter((u) => {
          const createdAt = u.createdAt ? new Date(u.createdAt) : null;
          return (
            createdAt && createdAt >= monthStart && createdAt <= monthEnd && u.role === 'interested'
          );
        }).length;

        const newBaptized = usersToInclude.filter((u) => {
          const baptismDate = u.baptismDate ? new Date(u.baptismDate) : null;
          return baptismDate && baptismDate >= monthStart && baptismDate <= monthEnd;
        }).length;

        const newMembers = usersToInclude.filter((u) => {
          const createdAt = u.createdAt ? new Date(u.createdAt) : null;
          return (
            createdAt && createdAt >= monthStart && createdAt <= monthEnd && u.role === 'member'
          );
        }).length;

        const monthNames = [
          'Jan',
          'Fev',
          'Mar',
          'Abr',
          'Mai',
          'Jun',
          'Jul',
          'Ago',
          'Set',
          'Out',
          'Nov',
          'Dez',
        ];
        months.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          monthNum: date.getMonth(),
          newUsers,
          newInterested,
          newBaptized,
          newMembers,
        });
      }

      // Calculate growth metrics
      const currentMonth = months[months.length - 1];
      const previousMonth = months[months.length - 2];
      const growthRate =
        previousMonth.newUsers > 0
          ? ((currentMonth.newUsers - previousMonth.newUsers) / previousMonth.newUsers) * 100
          : currentMonth.newUsers > 0
            ? 100
            : 0;

      sendSuccess(res, {
        months,
        summary: {
          totalNewUsers: months.reduce((sum, m) => sum + m.newUsers, 0),
          totalNewInterested: months.reduce((sum, m) => sum + m.newInterested, 0),
          totalNewBaptized: months.reduce((sum, m) => sum + m.newBaptized, 0),
          totalNewMembers: months.reduce((sum, m) => sum + m.newMembers, 0),
          growthRate: Math.round(growthRate),
        },
      });
    })
  );

  /**
   * @swagger
   * /api/reports/goals:
   *   get:
   *     summary: Metas e progresso (para Pastor)
   *     tags: [Reports]
   */
  app.get(
    '/api/reports/goals',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user) && !isPastor(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      // PERFORMANCE FIX: Usar helper otimizado
      const { users: usersToInclude } = await getUsersForReport(
        user,
        getEffectiveDistrictId(req, user)
      );

      // Calculate current values
      const totalMembers = usersToInclude.filter(
        (u) => u.role === 'member' || u.role === 'missionary'
      ).length;
      const totalInterested = usersToInclude.filter((u) => u.role === 'interested').length;
      const baptizedThisYear = usersToInclude.filter((u) => {
        if (!u.baptismDate) return false;
        const date = new Date(u.baptismDate);
        return date.getFullYear() === new Date().getFullYear();
      }).length;
      const tithers = usersToInclude.filter((u) => u.isTither).length;
      const avgEngagement =
        usersToInclude.length > 0
          ? Math.round(
              usersToInclude.reduce((sum, u) => sum + getEngagementScore(u), 0) /
                usersToInclude.length
            )
          : 0;

      // Define goals (these could be stored in DB in the future)
      const goals = [
        {
          id: 1,
          name: 'Batismos no Ano',
          current: baptizedThisYear,
          target: 50,
          unit: 'pessoas',
          progress: Math.min(Math.round((baptizedThisYear / 50) * 100), 100),
          icon: 'droplet',
        },
        {
          id: 2,
          name: 'Novos Interessados',
          current: totalInterested,
          target: 100,
          unit: 'pessoas',
          progress: Math.min(Math.round((totalInterested / 100) * 100), 100),
          icon: 'users',
        },
        {
          id: 3,
          name: 'Taxa de Dizimistas',
          current:
            usersToInclude.length > 0 ? Math.round((tithers / usersToInclude.length) * 100) : 0,
          target: 40,
          unit: '%',
          progress: Math.min(
            Math.round((((tithers / (usersToInclude.length || 1)) * 100) / 40) * 100),
            100
          ),
          icon: 'heart',
        },
        {
          id: 4,
          name: 'Engajamento Médio',
          current: avgEngagement,
          target: 60,
          unit: 'pontos',
          progress: Math.min(Math.round((avgEngagement / 60) * 100), 100),
          icon: 'trending-up',
        },
        {
          id: 5,
          name: 'Crescimento de Membros',
          current: totalMembers,
          target: 200,
          unit: 'membros',
          progress: Math.min(Math.round((totalMembers / 200) * 100), 100),
          icon: 'users',
        },
      ];

      sendSuccess(res, {
        goals,
        summary: {
          totalGoals: goals.length,
          achieved: goals.filter((g) => g.progress >= 100).length,
          inProgress: goals.filter((g) => g.progress > 0 && g.progress < 100).length,
          avgProgress: Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length),
        },
      });
    })
  );
};
