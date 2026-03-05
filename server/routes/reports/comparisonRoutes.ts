/**
 * Comparison Routes
 * Routes: /api/reports/church-comparison, /api/reports/district-comparison, /api/reports/missionary-performance
 */

import { type Express, type Request, type Response } from 'express';
import { getRepository } from '../../container';
import { sql } from '../../neonConfig';
import { isSuperAdmin, isPastor } from '../../utils/permissions';
import { type User, type Church, type District } from '../../../shared/schema';
import { asyncHandler } from '../../utils';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { getAuthUserId, getEffectiveDistrictId } from '../../utils/authHelpers';
import { getUsersForReport, getEngagementScore } from './reportsHelpers';

export const comparisonRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const churchRepo = getRepository('churchRepository');
  const relationshipRepo = getRepository('relationshipRepository');

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
      const { users: allUsersFiltered, churches: churchesToInclude } = await getUsersForReport(
        user,
        getEffectiveDistrictId(req, user)
      );

      const churchStats = churchesToInclude
        .map((church) => {
          const churchUsers = allUsersFiltered.filter((u: User) => u.church === church.name);

          const interested = churchUsers.filter((u) => u.role === 'interested').length;
          const members = churchUsers.filter((u) => u.role === 'member').length;
          const missionaries = churchUsers.filter((u) => u.role === 'missionary').length;
          const baptized = churchUsers.filter((u) => u.baptismDate).length;
          const tithers = churchUsers.filter((u) => u.isTither).length;
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

        const interested = districtUsers.filter((u) => u.role === 'interested').length;
        const members = districtUsers.filter((u) => u.role === 'member').length;
        const missionaries = districtUsers.filter((u) => u.role === 'missionary').length;
        const baptized = districtUsers.filter((u) => u.baptismDate).length;
        const tithers = districtUsers.filter((u) => u.isTither).length;
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
      const { users: usersToInclude } = await getUsersForReport(
        user,
        getEffectiveDistrictId(req, user)
      );
      const allRelationships = await relationshipRepo.getAll();

      // Get missionaries
      const missionaries = usersToInclude.filter((u) => u.role === 'missionary');
      const userIds = new Set(usersToInclude.map((u) => u.id));

      // Calculate performance for each missionary
      const missionaryStats = missionaries
        .map((missionary) => {
          // Get relationships where this missionary is mentoring
          const mentoring = allRelationships.filter(
            (rel) =>
              rel.missionaryId === missionary.id &&
              rel.interestedId &&
              userIds.has(rel.interestedId)
          );

          const activeRelationships = mentoring.filter((rel) => rel.status === 'active');

          // Get the interested people they're mentoring
          const interestedIds = new Set(activeRelationships.map((r) => r.interestedId));
          const mentoredUsers = usersToInclude.filter((u) => interestedIds.has(u.id));

          // Count conversions (interested who became members or got baptized)
          const conversions = mentoredUsers.filter(
            (u) => u.role === 'member' || u.baptismDate
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
};
