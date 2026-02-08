/**
 * Reports Routes Module
 * Endpoints relacionados a relatórios e analytics avançados
 */

import { Express, Request, Response } from 'express';
import { getRepository } from '../container';
import { sql } from '../neonConfig';
import { logger } from '../utils/logger';
import { isSuperAdmin, isPastor } from '../utils/permissions';
import { User, Church, Event, District } from '../../shared/schema';
import { asyncHandler } from '../utils';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { getAuthUserId } from '../utils/authHelpers';

export const reportsRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const eventRepo = getRepository('eventRepository');
  const churchRepo = getRepository('churchRepository');
  const relationshipRepo = getRepository('relationshipRepository');

  /**
   * Helper function para buscar usuários com isolamento de distrito
   * PERFORMANCE & ISOLATION FIX: Usa query direta por distrito quando aplicável
   */
  const getUsersForReport = async (
    user: User | null
  ): Promise<{ users: User[]; churches: Church[]; events: Event[] }> => {
    const allEvents = await eventRepo.getAllEvents();

    if (isPastor(user) && user?.districtId) {
      // Pastor: query otimizada direto do banco por district_id
      logger.info(`🏛️ Reports Helper - Query direta por distrito: ${user.districtId}`);
      const users = await userRepo.getUsersByDistrictId(user.districtId);
      const filteredUsers = users.filter((u: User) => u.email !== 'admin@7care.com');
      const churches = await churchRepo.getChurchesByDistrict(user.districtId);
      const events = allEvents.filter((e: Event) => e.districtId === user.districtId);
      return { users: filteredUsers, churches, events };
    } else if (isSuperAdmin(user)) {
      if (user?.districtId) {
        // Superadmin com distrito específico
        const users = await userRepo.getUsersByDistrictId(user.districtId);
        const filteredUsers = users.filter((u: User) => u.email !== 'admin@7care.com');
        const churches = await churchRepo.getChurchesByDistrict(user.districtId);
        const events = allEvents.filter((e: Event) => e.districtId === user.districtId);
        return { users: filteredUsers, churches, events };
      } else {
        // Superadmin sem distrito (vê tudo)
        const allUsers = await userRepo.getAllUsers();
        const filteredUsers = allUsers.filter((u: User) => u.email !== 'admin@7care.com');
        const allChurches = await churchRepo.getAllChurches();
        return { users: filteredUsers, churches: allChurches, events: allEvents };
      }
    }

    // Fallback: sem acesso
    return { users: [], churches: [], events: [] };
  };

  /**
   * Helper function to calculate engagement level
   */
  const getEngagementScore = (user: User): number => {
    let score = 0;

    // Attendance score (0-30)
    score += Math.min((user.attendance || 0) * 3, 30);

    // Tither bonus (15 points)
    if (user.isTither) score += 15;

    // Donor bonus (10 points)
    if (user.isDonor) score += 10;

    // Has lesson bonus (10 points)
    if (user.hasLesson) score += 10;

    // Points/gamification (0-20)
    score += Math.min((user.points || 0) / 50, 20);

    // Streak bonus (0-15)
    score += Math.min((user.streak || 0) * 3, 15);

    return Math.min(score, 100);
  };

  /**
   * Helper function to classify users by spiritual stage
   */
  const getSpiritualStage = (user: User): string => {
    if (user.role === 'interested') {
      const classificacao = user.classificacao?.toUpperCase() || 'C';
      if (classificacao === 'A') return 'Interessado A';
      if (classificacao === 'B') return 'Interessado B';
      return 'Interessado C';
    }
    if (user.baptismDate) return 'Batizado';
    if (user.role === 'member') return 'Membro';
    if (user.role === 'missionary') return 'Missionário';
    return 'Outro';
  };

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

      const allChurches = await churchRepo.getAllChurches();
      const allEvents = await eventRepo.getAllEvents();
      const allDistricts = await sql`SELECT * FROM districts`;

      let usersToInclude: User[] = [];
      let churchesToInclude: Church[] = [];
      let eventsToInclude: Event[] = [];

      // PERFORMANCE & ISOLATION FIX: Usar query direta por distrito
      if (isPastor(user) && user?.districtId) {
        // Pastor: query otimizada direto do banco por district_id
        logger.info(`🏛️ PASTOR em Reports - Query direta por distrito: ${user.districtId}`);
        usersToInclude = await userRepo.getUsersByDistrictId(user.districtId);
        usersToInclude = usersToInclude.filter((u: User) => u.email !== 'admin@7care.com');
        logger.info(`✅ Reports: ${usersToInclude.length} usuários carregados diretamente`);
        churchesToInclude = await churchRepo.getChurchesByDistrict(user.districtId);
        eventsToInclude = allEvents.filter((e: Event) => e.districtId === user.districtId);
      } else if (isSuperAdmin(user)) {
        if (user?.districtId) {
          // Superadmin com distrito específico
          usersToInclude = await userRepo.getUsersByDistrictId(user.districtId);
          usersToInclude = usersToInclude.filter((u: User) => u.email !== 'admin@7care.com');
          churchesToInclude = await churchRepo.getChurchesByDistrict(user.districtId);
          eventsToInclude = allEvents.filter((e: Event) => e.districtId === user.districtId);
        } else {
          // Superadmin sem distrito (vê tudo)
          const allUsers = await userRepo.getAllUsers();
          usersToInclude = allUsers.filter((u: User) => u.email !== 'admin@7care.com');
          churchesToInclude = allChurches;
          eventsToInclude = allEvents;
        }
      }

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
      regularUsers.forEach(user => {
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
      const tithers = regularUsers.filter(u => u.isTither).length;
      const donors = regularUsers.filter(u => u.isDonor).length;
      const withLesson = regularUsers.filter(u => u.hasLesson).length;
      const baptized = regularUsers.filter(u => u.baptismDate).length;

      // Events this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const eventsThisMonth = eventsToInclude.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      }).length;

      // Growth trend (users created this month vs last month)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const usersThisMonth = regularUsers.filter(u => {
        const createdAt = u.createdAt ? new Date(u.createdAt) : null;
        return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      const usersLastMonth = regularUsers.filter(u => {
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
   * /api/reports/spiritual-funnel:
   *   get:
   *     summary: Funil de conversão espiritual (C→B→A→Batizado)
   *     tags: [Reports]
   */
  app.get(
    '/api/reports/spiritual-funnel',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user) && !isPastor(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      // PERFORMANCE FIX: Usar helper otimizado
      const { users: usersToInclude } = await getUsersForReport(user);

      // Calculate funnel stages
      const interested = usersToInclude.filter(u => u.role === 'interested');
      const classificacaoC = interested.filter(
        u => !u.classificacao || u.classificacao.toUpperCase() === 'C'
      ).length;
      const classificacaoB = interested.filter(u => u.classificacao?.toUpperCase() === 'B').length;
      const classificacaoA = interested.filter(u => u.classificacao?.toUpperCase() === 'A').length;
      const baptized = usersToInclude.filter(u => u.baptismDate).length;
      const members = usersToInclude.filter(u => u.role === 'member' && !u.baptismDate).length;
      const missionaries = usersToInclude.filter(u => u.role === 'missionary').length;

      // Conversion rates
      const totalInterested = interested.length;
      const conversionCtoB =
        classificacaoC > 0
          ? Math.round((classificacaoB / (classificacaoC + classificacaoB + classificacaoA)) * 100)
          : 0;
      const conversionBtoA =
        classificacaoB > 0
          ? Math.round((classificacaoA / (classificacaoB + classificacaoA)) * 100)
          : 0;
      const conversionAtoBaptism =
        classificacaoA > 0 ? Math.round((baptized / (classificacaoA + baptized)) * 100) : 0;

      sendSuccess(res, {
        funnel: [
          { stage: 'Interessado C', count: classificacaoC, color: '#94a3b8' },
          { stage: 'Interessado B', count: classificacaoB, color: '#60a5fa' },
          { stage: 'Interessado A', count: classificacaoA, color: '#3b82f6' },
          { stage: 'Batizado', count: baptized, color: '#1d4ed8' },
          { stage: 'Membro', count: members, color: '#1e40af' },
          { stage: 'Missionário', count: missionaries, color: '#7c3aed' },
        ],
        conversions: {
          CtoB: conversionCtoB,
          BtoA: conversionBtoA,
          AtoBaptism: conversionAtoBaptism,
        },
        totals: {
          totalInterested,
          totalBaptized: baptized,
          totalMembers: members,
          totalMissionaries: missionaries,
        },
      });
    })
  );

  /**
   * @swagger
   * /api/reports/church-comparison:
   *   get:
   *     summary: Comparativo entre igrejas
   *     tags: [Reports]
   */
  app.get(
    '/api/reports/church-comparison',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user) && !isPastor(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      // PERFORMANCE FIX: Usar helper otimizado
      const { users: allUsersFiltered, churches: churchesToInclude } =
        await getUsersForReport(user);

      const churchStats = churchesToInclude
        .map(church => {
          const churchUsers = allUsersFiltered.filter((u: User) => u.church === church.name);

          const interested = churchUsers.filter(u => u.role === 'interested').length;
          const members = churchUsers.filter(u => u.role === 'member').length;
          const missionaries = churchUsers.filter(u => u.role === 'missionary').length;
          const baptized = churchUsers.filter(u => u.baptismDate).length;
          const tithers = churchUsers.filter(u => u.isTither).length;
          const avgEngagement =
            churchUsers.length > 0
              ? Math.round(
                  churchUsers.reduce((sum, u) => sum + getEngagementScore(u), 0) /
                    churchUsers.length
                )
              : 0;

          return {
            name: church.name,
            id: church.id,
            totalUsers: churchUsers.length,
            interested,
            members,
            missionaries,
            baptized,
            tithers,
            avgEngagement,
            tithersPercentage:
              churchUsers.length > 0 ? Math.round((tithers / churchUsers.length) * 100) : 0,
          };
        })
        .sort((a, b) => b.totalUsers - a.totalUsers);

      sendSuccess(res, {
        churches: churchStats,
        summary: {
          totalChurches: churchStats.length,
          avgUsersPerChurch:
            churchStats.length > 0
              ? Math.round(
                  churchStats.reduce((sum, c) => sum + c.totalUsers, 0) / churchStats.length
                )
              : 0,
          avgEngagementOverall:
            churchStats.length > 0
              ? Math.round(
                  churchStats.reduce((sum, c) => sum + c.avgEngagement, 0) / churchStats.length
                )
              : 0,
        },
      });
    })
  );

  /**
   * @swagger
   * /api/reports/engagement-analysis:
   *   get:
   *     summary: Análise detalhada de engajamento
   *     tags: [Reports]
   */
  app.get(
    '/api/reports/engagement-analysis',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user) && !isPastor(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      // PERFORMANCE FIX: Usar helper otimizado
      const { users: usersToInclude } = await getUsersForReport(user);

      // Engagement by category
      const engagementCategories = {
        attendance: { label: 'Frequência', value: 0, max: 30 },
        tithe: { label: 'Dízimo', value: 0, max: 15 },
        offering: { label: 'Oferta', value: 0, max: 10 },
        lesson: { label: 'Lição', value: 0, max: 10 },
        gamification: { label: 'Gamificação', value: 0, max: 20 },
        streak: { label: 'Sequência', value: 0, max: 15 },
      };

      usersToInclude.forEach(user => {
        engagementCategories.attendance.value += Math.min((user.attendance || 0) * 3, 30);
        engagementCategories.tithe.value += user.isTither ? 15 : 0;
        engagementCategories.offering.value += user.isDonor ? 10 : 0;
        engagementCategories.lesson.value += user.hasLesson ? 10 : 0;
        engagementCategories.gamification.value += Math.min((user.points || 0) / 50, 20);
        engagementCategories.streak.value += Math.min((user.streak || 0) * 3, 15);
      });

      // Calculate averages
      const userCount = usersToInclude.length || 1;
      Object.keys(engagementCategories).forEach(key => {
        const k = key as keyof typeof engagementCategories;
        engagementCategories[k].value = Math.round(engagementCategories[k].value / userCount);
      });

      // Engagement distribution
      const distribution = [
        { range: '0-20', count: 0, label: 'Muito Baixo' },
        { range: '21-40', count: 0, label: 'Baixo' },
        { range: '41-60', count: 0, label: 'Médio' },
        { range: '61-80', count: 0, label: 'Alto' },
        { range: '81-100', count: 0, label: 'Muito Alto' },
      ];

      usersToInclude.forEach(user => {
        const score = getEngagementScore(user);
        if (score <= 20) distribution[0].count++;
        else if (score <= 40) distribution[1].count++;
        else if (score <= 60) distribution[2].count++;
        else if (score <= 80) distribution[3].count++;
        else distribution[4].count++;
      });

      // Top engaged users
      const topEngaged = usersToInclude
        .map(u => ({
          id: u.id,
          name: u.name,
          church: u.church,
          role: u.role,
          score: getEngagementScore(u),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Users needing attention (low engagement)
      const needingAttention = usersToInclude
        .filter(u => getEngagementScore(u) < 30)
        .map(u => ({
          id: u.id,
          name: u.name,
          church: u.church,
          role: u.role,
          score: getEngagementScore(u),
        }))
        .slice(0, 10);

      sendSuccess(res, {
        categories: engagementCategories,
        distribution,
        topEngaged,
        needingAttention,
        averageScore: Math.round(
          usersToInclude.reduce((sum, u) => sum + getEngagementScore(u), 0) / userCount
        ),
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
      const { users: usersToInclude } = await getUsersForReport(user);

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

        const newUsers = usersToInclude.filter(u => {
          const createdAt = u.createdAt ? new Date(u.createdAt) : null;
          return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
        }).length;

        const newInterested = usersToInclude.filter(u => {
          const createdAt = u.createdAt ? new Date(u.createdAt) : null;
          return (
            createdAt && createdAt >= monthStart && createdAt <= monthEnd && u.role === 'interested'
          );
        }).length;

        const newBaptized = usersToInclude.filter(u => {
          const baptismDate = u.baptismDate ? new Date(u.baptismDate) : null;
          return baptismDate && baptismDate >= monthStart && baptismDate <= monthEnd;
        }).length;

        const newMembers = usersToInclude.filter(u => {
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
   * /api/reports/missionary-performance:
   *   get:
   *     summary: Performance dos missionários (para Pastor)
   *     tags: [Reports]
   */
  app.get(
    '/api/reports/missionary-performance',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user) && !isPastor(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      // PERFORMANCE FIX: Usar helper otimizado
      const { users: usersToInclude } = await getUsersForReport(user);
      const allRelationships = await relationshipRepo.getAll();

      // Get missionaries
      const missionaries = usersToInclude.filter(u => u.role === 'missionary');
      const userIds = new Set(usersToInclude.map(u => u.id));

      // Calculate performance for each missionary
      const missionaryStats = missionaries
        .map(missionary => {
          // Get relationships where this missionary is mentoring
          const mentoring = allRelationships.filter(
            rel =>
              rel.missionaryId === missionary.id &&
              rel.interestedId &&
              userIds.has(rel.interestedId)
          );

          const activeRelationships = mentoring.filter(rel => rel.status === 'active');

          // Get the interested people they're mentoring
          const interestedIds = new Set(activeRelationships.map(r => r.interestedId));
          const mentoredUsers = usersToInclude.filter(u => interestedIds.has(u.id));

          // Count conversions (interested who became members or got baptized)
          const conversions = mentoredUsers.filter(
            u => u.role === 'member' || u.baptismDate
          ).length;

          // Calculate missionary engagement
          const engagement = getEngagementScore(missionary);

          return {
            id: missionary.id,
            name: missionary.name,
            church: missionary.church,
            activeRelationships: activeRelationships.length,
            totalMentored: mentoring.length,
            conversions,
            engagement,
            points: missionary.points || 0,
            level: missionary.level,
          };
        })
        .sort((a, b) => b.activeRelationships - a.activeRelationships);

      sendSuccess(res, {
        missionaries: missionaryStats,
        summary: {
          totalMissionaries: missionaries.length,
          totalActiveRelationships: missionaryStats.reduce(
            (sum, m) => sum + m.activeRelationships,
            0
          ),
          totalConversions: missionaryStats.reduce((sum, m) => sum + m.conversions, 0),
          avgEngagement:
            missionaries.length > 0
              ? Math.round(
                  missionaryStats.reduce((sum, m) => sum + m.engagement, 0) / missionaries.length
                )
              : 0,
        },
      });
    })
  );

  /**
   * @swagger
   * /api/reports/district-comparison:
   *   get:
   *     summary: Comparativo entre distritos (para SuperAdmin)
   *     tags: [Reports]
   */
  app.get(
    '/api/reports/district-comparison',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      const allUsers = await userRepo.getAllUsers();
      const allChurches = await churchRepo.getAllChurches();
      const allDistricts =
        await sql`SELECT d.*, u.name as pastor_name FROM districts d LEFT JOIN users u ON d.pastor_id = u.id`;

      const districtStats: Array<{
        id: number;
        name: string;
        code: string;
        pastorName: string;
        churchCount: number;
        totalUsers: number;
        interested: number;
        members: number;
        missionaries: number;
        baptized: number;
        tithers: number;
        avgEngagement: number;
        tithersPercentage: number;
      }> = [];

      for (const districtRow of allDistricts) {
        const district = districtRow as unknown as District & { pastor_name?: string };
        const districtChurches = allChurches.filter((c: Church) => c.districtId === district.id);
        const districtChurchNames = districtChurches.map((ch: Church) => ch.name);

        const districtUsers = allUsers.filter((u: User) => {
          const churchName = u.church ?? '';
          return (
            u.email !== 'admin@7care.com' &&
            (districtChurchNames.includes(churchName) || u.districtId === district.id)
          );
        });

        const interested = districtUsers.filter(u => u.role === 'interested').length;
        const members = districtUsers.filter(u => u.role === 'member').length;
        const missionaries = districtUsers.filter(u => u.role === 'missionary').length;
        const baptized = districtUsers.filter(u => u.baptismDate).length;
        const tithers = districtUsers.filter(u => u.isTither).length;
        const avgEngagement =
          districtUsers.length > 0
            ? Math.round(
                districtUsers.reduce((sum, u) => sum + getEngagementScore(u), 0) /
                  districtUsers.length
              )
            : 0;

        districtStats.push({
          id: district.id,
          name: district.name,
          code: district.code || '',
          pastorName: district.pastor_name || 'Não atribuído',
          churchCount: districtChurches.length,
          totalUsers: districtUsers.length,
          interested,
          members,
          missionaries,
          baptized,
          tithers,
          avgEngagement,
          tithersPercentage:
            districtUsers.length > 0 ? Math.round((tithers / districtUsers.length) * 100) : 0,
        });
      }

      // Sort by total users
      districtStats.sort((a, b) => b.totalUsers - a.totalUsers);

      sendSuccess(res, {
        districts: districtStats,
        summary: {
          totalDistricts: districtStats.length,
          avgUsersPerDistrict:
            districtStats.length > 0
              ? Math.round(
                  districtStats.reduce((sum, d) => sum + d.totalUsers, 0) / districtStats.length
                )
              : 0,
          avgEngagementOverall:
            districtStats.length > 0
              ? Math.round(
                  districtStats.reduce((sum, d) => sum + d.avgEngagement, 0) / districtStats.length
                )
              : 0,
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
      const { users: usersToInclude } = await getUsersForReport(user);

      // Calculate current values
      const totalMembers = usersToInclude.filter(
        u => u.role === 'member' || u.role === 'missionary'
      ).length;
      const totalInterested = usersToInclude.filter(u => u.role === 'interested').length;
      const baptizedThisYear = usersToInclude.filter(u => {
        if (!u.baptismDate) return false;
        const date = new Date(u.baptismDate);
        return date.getFullYear() === new Date().getFullYear();
      }).length;
      const tithers = usersToInclude.filter(u => u.isTither).length;
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
          achieved: goals.filter(g => g.progress >= 100).length,
          inProgress: goals.filter(g => g.progress > 0 && g.progress < 100).length,
          avgProgress: Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length),
        },
      });
    })
  );

  /**
   * @swagger
   * /api/reports/insights:
   *   get:
   *     summary: Insights e recomendações automáticas
   *     tags: [Reports]
   */
  app.get(
    '/api/reports/insights',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user) && !isPastor(user)) {
        return sendError(res, 'Acesso não autorizado', 403);
      }

      // PERFORMANCE FIX: Usar helper otimizado
      const { users: usersToInclude } = await getUsersForReport(user);

      const insights: Array<{
        id: number;
        type: 'success' | 'warning' | 'info' | 'action';
        title: string;
        description: string;
        metric?: string;
        priority: 'high' | 'medium' | 'low';
      }> = [];

      // Calculate metrics for insights
      const totalUsers = usersToInclude.length;
      const lowEngagement = usersToInclude.filter(u => getEngagementScore(u) < 30).length;
      const lowEngagementPct = totalUsers > 0 ? (lowEngagement / totalUsers) * 100 : 0;

      const interested = usersToInclude.filter(u => u.role === 'interested');
      const interestedC = interested.filter(
        u => !u.classificacao || u.classificacao.toUpperCase() === 'C'
      ).length;
      const interestedWithoutMentor = interested.filter(u => !u.biblicalInstructor).length;

      const tithers = usersToInclude.filter(u => u.isTither).length;
      const tithersRate = totalUsers > 0 ? (tithers / totalUsers) * 100 : 0;

      // Generate insights based on data
      if (lowEngagementPct > 30) {
        insights.push({
          id: 1,
          type: 'warning',
          title: 'Alto índice de baixo engajamento',
          description: `${lowEngagement} pessoas (${Math.round(lowEngagementPct)}%) têm engajamento abaixo de 30 pontos. Considere criar programas de reativação.`,
          metric: `${Math.round(lowEngagementPct)}%`,
          priority: 'high',
        });
      }

      if (interestedWithoutMentor > 5) {
        insights.push({
          id: 2,
          type: 'action',
          title: 'Interessados sem instrutor bíblico',
          description: `${interestedWithoutMentor} interessados ainda não têm instrutor bíblico atribuído. Atribua missionários para acompanhá-los.`,
          metric: String(interestedWithoutMentor),
          priority: 'high',
        });
      }

      if (interestedC > 10) {
        insights.push({
          id: 3,
          type: 'info',
          title: 'Oportunidade de conversão',
          description: `${interestedC} interessados estão na classificação C. Foque em estudos bíblicos para movê-los para B e A.`,
          metric: String(interestedC),
          priority: 'medium',
        });
      }

      if (tithersRate < 20) {
        insights.push({
          id: 4,
          type: 'warning',
          title: 'Taxa de dizimistas baixa',
          description: `Apenas ${Math.round(tithersRate)}% dos membros são dizimistas. Considere uma campanha de mordomia cristã.`,
          metric: `${Math.round(tithersRate)}%`,
          priority: 'medium',
        });
      } else if (tithersRate > 40) {
        insights.push({
          id: 5,
          type: 'success',
          title: 'Excelente taxa de dizimistas',
          description: `${Math.round(tithersRate)}% dos membros são dizimistas fiéis. Parabéns pelo trabalho de mordomia!`,
          metric: `${Math.round(tithersRate)}%`,
          priority: 'low',
        });
      }

      // Check for recent growth
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const newThisMonth = usersToInclude.filter(u => {
        const createdAt = u.createdAt ? new Date(u.createdAt) : null;
        return createdAt && createdAt >= monthStart;
      }).length;

      if (newThisMonth > 10) {
        insights.push({
          id: 6,
          type: 'success',
          title: 'Ótimo crescimento mensal',
          description: `${newThisMonth} novas pessoas foram adicionadas este mês. Continue com o bom trabalho de evangelismo!`,
          metric: `+${newThisMonth}`,
          priority: 'low',
        });
      }

      sendSuccess(res, {
        insights: insights.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }),
        summary: {
          total: insights.length,
          highPriority: insights.filter(i => i.priority === 'high').length,
          actions: insights.filter(i => i.type === 'action').length,
        },
      });
    })
  );

  logger.info('📊 Routes de relatórios registradas');
};
