/**
 * Analysis Routes
 * Routes: /api/reports/spiritual-funnel, /api/reports/engagement-analysis, /api/reports/insights
 */

import { type Express, type Request, type Response } from 'express';
import { getRepository } from '../../container';
import { isSuperAdmin, isPastor } from '../../utils/permissions';
import { asyncHandler } from '../../utils';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { getAuthUserId, getEffectiveDistrictId } from '../../utils/authHelpers';
import { getUsersForReport, getEngagementScore } from './reportsHelpers';

export const analysisRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');

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
      const { users: usersToInclude } = await getUsersForReport(
        user,
        getEffectiveDistrictId(req, user)
      );

      // Calculate funnel stages
      const interested = usersToInclude.filter((u) => u.role === 'interested');
      const classificacaoC = interested.filter(
        (u) => !u.classificacao || u.classificacao.toUpperCase() === 'C'
      ).length;
      const classificacaoB = interested.filter(
        (u) => u.classificacao?.toUpperCase() === 'B'
      ).length;
      const classificacaoA = interested.filter(
        (u) => u.classificacao?.toUpperCase() === 'A'
      ).length;
      const baptized = usersToInclude.filter((u) => u.baptismDate).length;
      const members = usersToInclude.filter((u) => u.role === 'member' && !u.baptismDate).length;
      const missionaries = usersToInclude.filter((u) => u.role === 'missionary').length;

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
      const { users: usersToInclude } = await getUsersForReport(
        user,
        getEffectiveDistrictId(req, user)
      );

      // Engagement by category
      const engagementCategories = {
        attendance: { label: 'Frequência', value: 0, max: 30 },
        tithe: { label: 'Dízimo', value: 0, max: 15 },
        offering: { label: 'Oferta', value: 0, max: 10 },
        lesson: { label: 'Lição', value: 0, max: 10 },
        gamification: { label: 'Gamificação', value: 0, max: 20 },
        streak: { label: 'Sequência', value: 0, max: 15 },
      };

      usersToInclude.forEach((user) => {
        engagementCategories.attendance.value += Math.min((user.attendance || 0) * 3, 30);
        engagementCategories.tithe.value += user.isTither ? 15 : 0;
        engagementCategories.offering.value += user.isDonor ? 10 : 0;
        engagementCategories.lesson.value += user.hasLesson ? 10 : 0;
        engagementCategories.gamification.value += Math.min((user.points || 0) / 50, 20);
        engagementCategories.streak.value += Math.min((user.streak || 0) * 3, 15);
      });

      // Calculate averages
      const userCount = usersToInclude.length || 1;
      Object.keys(engagementCategories).forEach((key) => {
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

      usersToInclude.forEach((user) => {
        const score = getEngagementScore(user);
        if (score <= 20) distribution[0].count++;
        else if (score <= 40) distribution[1].count++;
        else if (score <= 60) distribution[2].count++;
        else if (score <= 80) distribution[3].count++;
        else distribution[4].count++;
      });

      // Top engaged users
      const topEngaged = usersToInclude
        .map((u) => ({
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
        .filter((u) => getEngagementScore(u) < 30)
        .map((u) => ({
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
      const { users: usersToInclude } = await getUsersForReport(
        user,
        getEffectiveDistrictId(req, user)
      );

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
      const lowEngagement = usersToInclude.filter((u) => getEngagementScore(u) < 30).length;
      const lowEngagementPct = totalUsers > 0 ? (lowEngagement / totalUsers) * 100 : 0;

      const interested = usersToInclude.filter((u) => u.role === 'interested');
      const interestedC = interested.filter(
        (u) => !u.classificacao || u.classificacao.toUpperCase() === 'C'
      ).length;
      const interestedWithoutMentor = interested.filter((u) => !u.biblicalInstructor).length;

      const tithers = usersToInclude.filter((u) => u.isTither).length;
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
      const newThisMonth = usersToInclude.filter((u) => {
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
          highPriority: insights.filter((i) => i.priority === 'high').length,
          actions: insights.filter((i) => i.type === 'action').length,
        },
      });
    })
  );
};
