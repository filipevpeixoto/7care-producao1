/**
 * Dashboard Routes Module
 * Endpoints relacionados às estatísticas e dashboard
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { isSuperAdmin, isPastor } from '../utils/permissions';
import { parseDate } from '../utils/parsers';
import { Church, Event, Relationship, User } from '../../shared/schema';

export const dashboardRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

  /**
   * @swagger
   * /api/dashboard/stats:
   *   get:
   *     summary: Obtém estatísticas do dashboard
   *     tags: [Dashboard]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Estatísticas do sistema
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalUsers:
   *                   type: integer
   *                 totalInterested:
   *                   type: integer
   *                 totalMembers:
   *                   type: integer
   *                 totalMissionaries:
   *                   type: integer
   *                 pendingApprovals:
   *                   type: integer
   *                 thisWeekEvents:
   *                   type: integer
   *                 birthdaysToday:
   *                   type: integer
   */
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      const allUsers = await storage.getAllUsers();
      const allEvents = await storage.getAllEvents();

      let usersToInclude: User[] = [];
      let eventsToInclude: Event[] = [];
      let churchesToInclude: Church[] = [];

      if (isSuperAdmin(user)) {
        if (user?.districtId) {
          const districtChurches = await storage.getChurchesByDistrict(user.districtId);
          const districtChurchNames = districtChurches.map((ch: Church) => ch.name);
          usersToInclude = allUsers.filter((u: User) => {
            const churchName = u.church ?? '';
            return u.email !== 'admin@7care.com' &&
              (districtChurchNames.includes(churchName) || u.districtId === user.districtId);
          });
          eventsToInclude = allEvents;
          churchesToInclude = districtChurches;
        } else {
          usersToInclude = allUsers.filter((u: User) => u.email !== 'admin@7care.com');
          eventsToInclude = allEvents;
          churchesToInclude = await storage.getAllChurches();
        }
      } else if (isPastor(user) && user?.districtId) {
        const districtChurches = await storage.getChurchesByDistrict(user.districtId);
        const districtChurchNames = districtChurches.map((ch: Church) => ch.name);
        usersToInclude = allUsers.filter((u: User) => {
          const churchName = u.church ?? '';
          return u.email !== 'admin@7care.com' &&
            (districtChurchNames.includes(churchName) || u.districtId === user.districtId);
        });
        eventsToInclude = allEvents;
        churchesToInclude = districtChurches;
      } else {
        const userChurch = user?.church;
        if (userChurch) {
          usersToInclude = allUsers.filter((u: User) =>
            u.email !== 'admin@7care.com' && u.church === userChurch
          );
          eventsToInclude = allEvents.filter((e: Event) => e.church === userChurch);
          churchesToInclude = await storage.getAllChurches().then(chs =>
            chs.filter((ch: Church) => ch.name === userChurch)
          );
        } else {
          usersToInclude = [];
          eventsToInclude = [];
          churchesToInclude = [];
        }
      }

      const regularUsers = usersToInclude;

      const usersByRole = regularUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const pendingApprovals = regularUsers.filter(user => user.status === 'pending').length;

      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const parseLocalDate = (value: unknown): Date | null => {
        if (!value) return null;
        if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
        if (typeof value === 'string' || typeof value === 'number') {
          const d = new Date(value);
          if (!isNaN(d.getTime())) return d;
          const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (m) {
            const y = Number(m[1]);
            const mo = Number(m[2]) - 1;
            const da = Number(m[3]);
            return new Date(y, mo, da);
          }
        }
        return null;
      };

      const thisWeekEvents = eventsToInclude.filter((event: Event) => {
        const start = parseLocalDate(event.date);
        const end = parseLocalDate(event.endDate) || start;
        if (!start) return false;
        return (start < weekEnd) && (end ? end >= weekStart : true);
      }).length;

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const thisMonthEvents = eventsToInclude.filter((event: Event) => {
        const start = parseLocalDate(event.date);
        const end = parseLocalDate(event.endDate) || start;
        if (!start) return false;
        return (start < nextMonthStart) && (end ? end >= monthStart : true);
      }).length;

      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const birthdaysToday = regularUsers.filter(user => {
        if (!user.birthDate) return false;
        const birthDate = new Date(user.birthDate);
        if (isNaN(birthDate.getTime())) return false;
        const birthStr = `${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`;
        return birthStr === todayStr;
      }).length;

      const birthdaysThisWeek = regularUsers.filter(user => {
        if (!user.birthDate) return false;
        const birthDate = new Date(user.birthDate);
        if (isNaN(birthDate.getTime())) return false;
        const thisYearBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        return thisYearBirthday >= weekStart && thisYearBirthday < weekEnd;
      }).length;

      const churchesCount = churchesToInclude.length;
      const totalMissionaries = regularUsers.filter(u => u.role === 'missionary').length;

      let interestedBeingDiscipled = 0;
      try {
        const allRelationships = await storage.getAllRelationships();
        const includedUserIds = new Set(usersToInclude.map((u: User) => u.id));
        const relationships = allRelationships.filter((rel: Relationship) =>
          rel.interestedId != null && includedUserIds.has(rel.interestedId)
        );

        const activeRelationships = relationships.filter(rel => rel.status === 'active');
        const interestedWithMentors = new Set(
          activeRelationships
            .map(rel => rel.interestedId)
            .filter((id): id is number => id != null)
        );
        interestedBeingDiscipled = interestedWithMentors.size;
      } catch (error) {
        logger.error('Erro ao contar interessados sendo discipulados:', error);
      }

      const stats = {
        totalUsers: regularUsers.length,
        totalInterested: usersByRole.interested || 0,
        interestedBeingDiscipled: interestedBeingDiscipled,
        totalMembers: usersByRole.member || 0,
        totalMissionaries: totalMissionaries,
        totalAdmins: (usersByRole.pastor || 0) + (usersByRole.superadmin || 0),
        totalChurches: churchesCount,
        pendingApprovals,
        thisWeekEvents,
        thisMonthEvents,
        birthdaysToday,
        birthdaysThisWeek,
        totalEvents: eventsToInclude.length,
        approvedUsers: regularUsers.filter(user => user.status === 'approved').length
      };

      res.json(stats);
    } catch (error) {
      handleError(res, error, "Dashboard stats");
    }
  });

  /**
   * @swagger
   * /api/dashboard/visits:
   *   get:
   *     summary: Obtém dados do visitômetro
   *     tags: [Dashboard]
   *     responses:
   *       200:
   *         description: Dados de visitas
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 completed:
   *                   type: integer
   *                 expected:
   *                   type: integer
   *                 totalVisits:
   *                   type: integer
   *                 percentage:
   *                   type: integer
   */
  app.get("/api/dashboard/visits", async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();

      const targetUsers = allUsers.filter(user =>
        user.role === 'member' || user.role === 'missionary'
      );

      let visitedPeople = 0;
      let totalVisits = 0;
      const visitedUsersList: Array<{ id?: number; userId?: number; userName?: string; name?: string; visitCount?: number; lastVisitDate?: string }> = [];

      targetUsers.forEach(user => {
        try {
          if (user.extraData) {
            let extraData;
            if (typeof user.extraData === 'string') {
              extraData = JSON.parse(user.extraData);
            } else {
              extraData = user.extraData || {};
            }

            if (extraData.visited === true) {
              visitedPeople++;
              const visitCount = extraData.visitCount || 1;
              totalVisits += visitCount;

              visitedUsersList.push({
                id: user.id,
                name: user.name,
                visitCount: visitCount,
                lastVisitDate: extraData.lastVisitDate
              });
            }
          }
        } catch (error) {
          logger.error(`Erro ao processar usuário ${user.name}:`, error);
        }
      });

      const expectedVisits = targetUsers.length;
      const percentage = expectedVisits > 0 ? Math.round((visitedPeople / expectedVisits) * 100) : 0;

      res.json({
        completed: visitedPeople,
        expected: expectedVisits,
        totalVisits: totalVisits,
        visitedPeople: visitedPeople,
        percentage: percentage,
        visitedUsersList: visitedUsersList
      });
    } catch (error) {
      handleError(res, error, "Get visits");
    }
  });

  /**
   * @swagger
   * /api/users/{id}/visit:
   *   post:
   *     summary: Marca usuário como visitado
   *     tags: [Dashboard, Users]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - visitDate
   *             properties:
   *               visitDate:
   *                 type: string
   *                 format: date
   *     responses:
   *       200:
   *         description: Visita registrada
   */
  app.post("/api/users/:id(\\d+)/visit", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" }); return;
      }

      const { visitDate } = req.body;
      if (!visitDate) {
        res.status(400).json({ error: "Data da visita é obrigatória" }); return;
      }

      const user = await storage.getUserById(id);
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" }); return;
      }

      let extraData: Record<string, unknown> = {};
      if (user.extraData) {
        if (typeof user.extraData === 'string') {
          try {
            extraData = JSON.parse(user.extraData);
          } catch {
            extraData = {};
          }
        } else if (typeof user.extraData === 'object') {
          extraData = { ...user.extraData };
        }
      }

      const previousVisitCount = typeof extraData.visitCount === 'number' ? extraData.visitCount : 0;
      extraData.visited = true;
      extraData.lastVisitDate = visitDate;
      extraData.visitCount = previousVisitCount + 1;

      const updatedUser = await storage.updateUser(id, {
        extraData: JSON.stringify(extraData)
      });

      if (!updatedUser) {
        res.status(500).json({ error: "Erro ao atualizar usuário" }); return;
      }

      const responseUser = {
        ...updatedUser,
        extraData: extraData
      };

      res.json(responseUser);
    } catch (error) {
      handleError(res, error, "Mark visit");
    }
  });
};
