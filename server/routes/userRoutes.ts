/**
 * User Routes Module
 * Endpoints relacionados ao gerenciamento de usuários
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { sql } from '../neonConfig';
import { handleError } from '../utils/errorHandler';
import { checkReadOnlyAccess, extractUserId } from '../middleware';
import { User, insertUserSchema } from '../../shared/schema';
import { parseDate, parseBirthDate, parseCargos, parseBoolean, parseNumber } from '../utils/parsers';
import { hasAdminAccess, isSuperAdmin } from '../utils/permissions';
import * as bcrypt from 'bcryptjs';
import { validateBody, validateParams, ValidatedRequest } from '../middleware/validation';
import { createUserSchema, updateUserSchema, userIdParamSchema } from '../schemas';
import { logger } from '../utils/logger';

export const userRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Lista todos os usuários (com paginação)
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *         description: Filtrar por role
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *         description: Filtrar por status
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Número da página (começa em 1)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Limite de resultados por página (máximo 500)
   *     responses:
   *       200:
   *         description: Lista paginada de usuários
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     total:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   */
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      console.log('🔍 [GET /api/users] Iniciando busca de usuários');
      const { role, status, church } = req.query;
      
      // Paginação
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50)); // Máximo 500
      const offset = (page - 1) * limit;
      
      const requestingUserId = parseInt(req.headers['x-user-id'] as string || '0');
      
      console.log('📋 Parâmetros:', { role, status, church, page, limit, requestingUserId });
      
      // Buscar dados do usuário que está fazendo a requisição
      let requestingUser = null;
      if (requestingUserId) {
        requestingUser = await storage.getUserById(requestingUserId);
      }
      
      let users = await storage.getAllUsers();
      console.log(`✅ ${users.length} usuários encontrados no banco`);

      if (role) {
        users = users.filter(u => u.role === role);
      }
      if (status) {
        users = users.filter(u => u.status === status);
      }
      
      // Filtrar por igreja se especificado ou se o usuário não for super admin
      if (church) {
        users = users.filter(u => u.church === church);
      } else if (requestingUser && !isSuperAdmin(requestingUser)) {
        // Se não for super admin, filtrar pela igreja do usuário
        const userChurch = requestingUser.church;
        if (userChurch) {
          users = users.filter(u => u.church === userChurch);
        }
      }

      const totalUsers = users.length;
      const totalPages = Math.ceil(totalUsers / limit);

      // Lógica especial para missionários
      if (req.headers['x-user-role'] === 'missionary' || req.headers['x-user-id']) {
        const missionaryId = parseInt(req.headers['x-user-id'] as string || '0');
        const missionary = users.find(u => u.id === missionaryId);

        if (missionary && missionary.role === 'missionary') {
          const churchInterested = users.filter(u =>
            u.role === 'interested' &&
            u.church === missionary.church &&
            u.churchCode === missionary.churchCode
          );

          const relationships = await storage.getRelationshipsByMissionary(missionaryId);
          const linkedInterestedIds = relationships.map(r => r.interestedId);

          const processedUsers = churchInterested.map(user => {
            const isLinked = linkedInterestedIds.includes(user.id);

            if (isLinked) {
              return user;
            } else {
              return {
                ...user,
                id: user.id,
                name: user.name,
                role: user.role,
                status: user.status,
                church: user.church,
                churchCode: user.churchCode,
                email: user.email ? '***@***.***' : null,
                phone: user.phone ? '***-***-****' : null,
                address: user.address ? '*** *** ***' : null,
                birthDate: user.birthDate ? '**/**/****' : null,
                cpf: user.cpf ? '***.***.***-**' : null,
                occupation: user.occupation ? '***' : null,
                education: user.education ? '***' : null,
                previousReligion: user.previousReligion ? '***' : null,
                interestedSituation: user.interestedSituation ? '***' : null,
                points: 0,
                level: '***',
                attendance: 0,
                biblicalInstructor: null,
                isLinked: false,
                canRequestDiscipleship: true
              };
            }
          });

          const otherUsers = users.filter(u =>
            u.role !== 'interested' ||
            (u.church !== missionary.church || u.churchCode !== missionary.churchCode)
          );

          const finalUsers = [...processedUsers, ...otherUsers];
          
          // Aplicar paginação
          const paginatedUsers = finalUsers.slice(offset, offset + limit);
          
          const safeUsers = paginatedUsers.map(({ password, ...user }) => user);
          res.json({
            data: safeUsers,
            pagination: {
              page,
              limit,
              total: finalUsers.length,
              totalPages: Math.ceil(finalUsers.length / limit)
            }
          });
          return;
        }
      }

      // Calcular pontuação apenas para os usuários da página atual (otimização)
      const paginatedUsers = users.slice(offset, offset + limit);
      const pointsMap = await storage.calculateUserPointsBatch(paginatedUsers);
      const usersWithPoints = paginatedUsers.map(user => ({
        ...user,
        calculatedPoints: pointsMap.get(user.id) ?? 0
      }));

      const safeUsers = usersWithPoints.map(({ password, ...user }) => user);
      console.log(`📤 Enviando página ${page}/${totalPages} com ${safeUsers.length} usuários`);
      
      res.json({
        data: safeUsers,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages
        }
      });
    } catch (error) {
      console.error('❌ Erro na rota GET /api/users:', error);
      handleError(res, error, "Get users");
    }
  });

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Busca usuário por ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Dados do usuário
   *       404:
   *         description: Usuário não encontrado
   */
  app.get("/api/users/:id(\\d+)", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }
      const user = await storage.getUserById(id);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      handleError(res, error, "Get user");
    }
  });

  /**
   * @swagger
   * /api/users:
   *   post:
   *     summary: Cria novo usuário
   *     tags: [Users]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/User'
   *     responses:
   *       201:
   *         description: Usuário criado
   */
  app.post("/api/users", checkReadOnlyAccess, validateBody(createUserSchema), async (req: Request, res: Response) => {
    try {
      const userData = (req as ValidatedRequest<typeof createUserSchema._type>).validatedBody;
      logger.info(`Creating new user: ${userData.email}`);

      const hashedPassword = userData.password ?
        await bcrypt.hash(userData.password, 10) :
        await bcrypt.hash('meu7care', 10);

      let processedChurch: string | null = null;
      if (userData.church && userData.church.trim() !== '') {
        try {
          const church = await storage.getOrCreateChurch(userData.church.trim());
          processedChurch = church.name;
        } catch (error) {
          logger.error(`Erro ao processar igreja "${userData.church}":`, error);
          processedChurch = 'Igreja Principal';
        }
      }

      const processedUserData = {
        ...userData,
        password: hashedPassword,
        firstAccess: true,
        status: "pending",
        isApproved: userData.isApproved || false,
        role: userData.role || "interested",
        points: 0,
        level: 'Bronze',
        attendance: 0
      };

      const newUser = await storage.createUser({
        ...processedUserData,
        biblicalInstructor: processedUserData.biblicalInstructor ?? null
      } as Parameters<typeof storage.createUser>[0]);

      res.status(201).json(newUser);
    } catch (error) {
      handleError(res, error, "Create user");
    }
  });

  /**
   * @swagger
   * /api/users/{id}:
   *   put:
   *     summary: Atualiza usuário
   *     tags: [Users]
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
   *             $ref: '#/components/schemas/User'
   *     responses:
   *       200:
   *         description: Usuário atualizado
   */
  app.put("/api/users/:id(\\d+)", checkReadOnlyAccess, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (updateData.biblicalInstructor !== undefined) {
        if (updateData.biblicalInstructor) {
          const existingRelationship = await storage.getRelationshipsByInterested(id);
          if (!existingRelationship || existingRelationship.length === 0) {
            await storage.createRelationship({
              missionaryId: parseInt(updateData.biblicalInstructor),
              interestedId: id,
              status: 'active',
              notes: "Vinculado pelo admin"
            });
          }
        }
      }

      const user = await storage.updateUser(id, updateData);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      handleError(res, error, "Update user");
    }
  });

  /**
   * @swagger
   * /api/users/{id}:
   *   delete:
   *     summary: Remove usuário
   *     tags: [Users]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Usuário removido
   */
  app.delete("/api/users/:id(\\d+)", checkReadOnlyAccess, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const user = await storage.getUserById(id);
      if (!user) {
        res.status(404).json({ error: "User not found" }); return;
      }

      if (user.email === 'admin@7care.com') {
        res.status(403).json({
          error: "Não é possível excluir o Super Administrador do sistema"
        });
        return;
      }

      if (hasAdminAccess(user)) {
        res.status(403).json({
          error: "Não é possível excluir usuários administradores do sistema"
        });
        return;
      }

      const success = await storage.deleteUser(id);

      if (!success) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      handleError(res, error, "Delete user");
    }
  });

  /**
   * @swagger
   * /api/users/{id}/approve:
   *   post:
   *     summary: Aprova usuário
   *     tags: [Users]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Usuário aprovado
   */
  app.post("/api/users/:id(\\d+)/approve", checkReadOnlyAccess, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.approveUser(id);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      handleError(res, error, "Approve user");
    }
  });

  /**
   * @swagger
   * /api/users/{id}/reject:
   *   post:
   *     summary: Rejeita usuário
   *     tags: [Users]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Usuário rejeitado
   */
  app.post("/api/users/:id(\\d+)/reject", checkReadOnlyAccess, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.rejectUser(id);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      handleError(res, error, "Reject user");
    }
  });

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
  app.get("/api/users/:id(\\d+)/calculate-points", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      const result = await storage.calculateUserPoints(userId);

      if (result && result.success) {
        res.json(result);
      } else {
        res.status(404).json(result || { error: "Usuário não encontrado" });
      }
    } catch (error) {
      handleError(res, error, "Calculate user points");
    }
  });

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
  app.get("/api/users/:id(\\d+)/points-details", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      const user = await storage.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }

      const result = await storage.calculateUserPoints(userId);

      if (result && result.success) {
        res.json({
          success: true,
          userId: user.id,
          userName: user.name,
          currentPoints: user.points,
          calculatedPoints: result.points,
          level: result.level || user.level,
          breakdown: result.breakdown || {},
          details: result.details || {},
          userData: result.userData || {}
        });
      } else {
        res.json({
          success: false,
          userId: user.id,
          userName: user.name,
          currentPoints: user.points,
          calculatedPoints: 0,
          level: user.level,
          breakdown: {},
          details: {},
          error: result?.error || "Erro ao calcular pontos"
        });
      }
    } catch (error) {
      handleError(res, error, "Get user points details");
    }
  });

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
  app.get("/api/users/birthdays", async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const userRole = req.headers['x-user-role'] as string;

      let userChurch: string | null = null;

      if (!hasAdminAccess({ role: userRole as User['role'] }) && userId) {
        try {
          const currentUser = await storage.getUserById(parseInt(userId));
          if (currentUser && currentUser.church) {
            userChurch = currentUser.church;
          }
        } catch (error) {
          logger.error('Erro ao buscar usuário para filtro de igreja:', error);
        }
      }

      const allUsers = await storage.getAllUsers();
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();

      let filteredUsers = allUsers;
      if (userChurch && userRole !== 'admin') {
        filteredUsers = allUsers.filter(user => user.church === userChurch);
      }

      const usersWithBirthDates = filteredUsers.filter(user => {
        if (!user.birthDate) return false;
        const birthDate = parseDate(user.birthDate);
        return birthDate && !isNaN(birthDate.getTime()) && birthDate.getFullYear() !== 1969;
      });

      const birthdaysToday = usersWithBirthDates.filter(user => {
        const birthDate = parseDate(user.birthDate);
        return birthDate && birthDate.getMonth() === currentMonth && birthDate.getDate() === currentDay;
      });

      const birthdaysThisMonth = usersWithBirthDates.filter(user => {
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

      const formatBirthdayUser = (user: User) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        birthDate: user.birthDate || '',
        profilePhoto: user.profilePhoto,
        church: user.church || null
      });

      const allBirthdays = usersWithBirthDates.sort((a, b) => {
        const dateA = parseDate(a.birthDate);
        const dateB = parseDate(b.birthDate);
        if (!dateA || !dateB) return 0;

        const monthDiff = dateA.getMonth() - dateB.getMonth();
        if (monthDiff !== 0) return monthDiff;
        return dateA.getDate() - dateB.getDate();
      });

      res.json({
        today: birthdaysToday.map(formatBirthdayUser),
        thisMonth: birthdaysThisMonth.map(formatBirthdayUser),
        all: allBirthdays.map(formatBirthdayUser),
        filteredByChurch: userChurch || null
      });

    } catch (error) {
      handleError(res, error, "Get birthdays");
    }
  });

  /**
   * @swagger
   * /api/my-interested:
   *   get:
   *     summary: Lista interessados vinculados ao missionário
   *     tags: [Users, Relationships]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Lista de interessados
   */
  app.get("/api/my-interested", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      if (!userId) {
        res.status(401).json({ error: "Usuário não autenticado" }); return;
      }

      const user = await storage.getUserById(userId);
      if (!user || (user.role !== 'missionary' && user.role !== 'member')) {
        res.status(403).json({ error: "Apenas missionários e membros podem acessar esta rota" }); return;
      }

      const allUsers = await storage.getAllUsers();

      const churchInterested = allUsers.filter(u =>
        u.role === 'interested' &&
        u.church === user.church
      );

      const relationships = await storage.getRelationshipsByMissionary(userId);
      const linkedInterestedIds = relationships.map(r => r.interestedId);

      const processedUsers = churchInterested.map(user => {
        const isLinked = linkedInterestedIds.includes(user.id);

        if (isLinked) {
          return {
            ...user,
            isLinked: true,
            relationshipId: relationships.find(r => r.interestedId === user.id)?.id
          };
        } else {
          return {
            ...user,
            id: user.id,
            name: user.name,
            role: user.role,
            status: user.status,
            church: user.church,
            churchCode: user.churchCode,
            email: user.email ? '***@***.***' : null,
            phone: user.phone ? '***-***-****' : null,
            address: user.address ? '*** *** ***' : null,
            birthDate: user.birthDate ? '**/**/****' : null,
            cpf: user.cpf ? '***.***.***-**' : null,
            occupation: user.occupation ? '***' : null,
            education: user.education ? '***' : null,
            previousReligion: user.previousReligion ? '***' : null,
            interestedSituation: user.interestedSituation ? '***' : null,
            points: 0,
            level: '***',
            attendance: 0,
            biblicalInstructor: null,
            isLinked: false,
            canRequestDiscipleship: true
          };
        }
      });

      const safeUsers = processedUsers.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      handleError(res, error, "Get my interested");
    }
  });

  /**
   * @swagger
   * /api/users/bulk-import:
   *   post:
   *     summary: Importação em massa de usuários
   *     tags: [Users]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               users:
   *                 type: array
   *                 items:
   *                   $ref: '#/components/schemas/User'
   *     responses:
   *       200:
   *         description: Usuários importados
   */
  app.post("/api/users/bulk-import", async (req: Request, res: Response) => {
    try {
      const { users } = req.body;

      if (!Array.isArray(users) || users.length === 0) {
        res.status(400).json({ error: "Users array is required and must not be empty" }); return;
      }

      const processedUsers: Record<string, unknown>[] = [];
      const errors: Array<{ userId: string | number; userName: string; error: string }> = [];

      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        try {
          const existingUser = await storage.getUserByEmail(userData.email);
          if (existingUser) {
            errors.push({ userId: userData.email, userName: userData.name, error: `User with email ${userData.email} already exists` });
            continue;
          }

          const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const nameParts = userData.name.trim().split(' ');
          let baseUsername = '';
          if (nameParts.length === 1) {
            baseUsername = normalize(nameParts[0]);
          } else {
            const firstName = normalize(nameParts[0]);
            const lastName = normalize(nameParts[nameParts.length - 1]);
            baseUsername = `${firstName}.${lastName}`;
          }

          let finalUsername = baseUsername;
          let counter = 1;
          const allUsers = await storage.getAllUsers();
          while (allUsers.some(u => {
            const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const nameParts = u.name.trim().split(' ');
            let generatedUsername = '';
            if (nameParts.length === 1) {
              generatedUsername = normalize(nameParts[0]);
            } else {
              const firstName = normalize(nameParts[0]);
              const lastName = normalize(nameParts[nameParts.length - 1]);
              generatedUsername = `${firstName}.${lastName}`;
            }
            return generatedUsername === finalUsername;
          })) {
            finalUsername = `${baseUsername}${counter}`;
            counter++;
          }

          const hashedPassword = await bcrypt.hash('meu7care', 10);

          const processedBirthDate = userData.birthDate ? parseBirthDate(userData.birthDate) : null;
          const processedBaptismDate = userData.baptismDate ? parseBirthDate(userData.baptismDate) : null;

          let processedChurch: string | null = null;
          if (userData.church && userData.church.trim() !== '') {
            try {
              const church = await storage.getOrCreateChurch(userData.church.trim());
              processedChurch = church.name;
            } catch (error) {
              logger.error(`Erro ao processar igreja "${userData.church}":`, error);
              processedChurch = 'Igreja Principal';
            }
          }

          const processedUserData = {
            ...userData,
            birthDate: processedBirthDate,
            baptismDate: processedBaptismDate,
            church: processedChurch,
            password: hashedPassword,
            firstAccess: true,
            status: "pending",
            isApproved: false
          };

          const newUser = await storage.createUser({
        ...processedUserData,
        biblicalInstructor: processedUserData.biblicalInstructor ?? null
      } as Parameters<typeof storage.createUser>[0]);

          processedUsers.push({
            ...newUser,
            generatedUsername: finalUsername,
            defaultPassword: 'meu7care'
          });

        } catch (error) {
          logger.error(`Error processing user ${i + 1}:`, error);
          errors.push({ userId: userData.email, userName: userData.name, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({
        success: true,
        message: `Successfully processed ${processedUsers.length} users`,
        users: processedUsers,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      handleError(res, error, "Bulk import");
    }
  });

  /**
   * @swagger
   * /api/users/update-from-powerbi:
   *   post:
   *     summary: Atualiza usuários a partir de dados do Power BI
   *     tags: [Users]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               users:
   *                 type: array
   *     responses:
   *       200:
   *         description: Usuários atualizados
   */
  app.post("/api/users/update-from-powerbi", async (req: Request, res: Response) => {
    try {
      const { users: usersData } = req.body;

      if (!Array.isArray(usersData) || usersData.length === 0) {
        res.status(400).json({ error: "Users array is required and must not be empty" }); return;
      }

      let updatedCount = 0;
      let notFoundCount = 0;
      const errors: Array<{ userName: string; error: string }> = [];

      for (const userData of usersData) {
        try {
          if (!userData.nome && !userData.Nome && !userData.name) {
            continue;
          }

          const userName = userData.nome || userData.Nome || userData.name;

          const users = await sql`
            SELECT id, extra_data FROM users
            WHERE LOWER(name) = LOWER(${userName})
            LIMIT 1
          `;

          if (users.length === 0) {
            notFoundCount++;
            continue;
          }

          const user = users[0];

          let currentExtraData = {};
          if (user.extra_data) {
            currentExtraData = typeof user.extra_data === 'string'
              ? JSON.parse(user.extra_data)
              : user.extra_data;
          }

          const updatedExtraData = {
            ...currentExtraData,
            engajamento: userData.engajamento || userData.Engajamento,
            classificacao: userData.classificacao || userData.Classificacao || userData.Classificação,
            dizimistaType: userData.dizimista || userData.Dizimista,
            ofertanteType: userData.ofertante || userData.Ofertante,
            tempoBatismoAnos: userData.tempoBatismo || userData.TempoBatismo || userData['Tempo Batismo'],
            cargos: parseCargos(userData.cargos || userData.Cargos),
            nomeUnidade: userData.nomeUnidade || userData.NomeUnidade || userData['Nome Unidade'],
            temLicao: parseBoolean(userData.temLicao || userData.TemLicao || userData['Tem Licao'] || userData['Tem Lição']),
            comunhao: parseNumber(userData.comunhao || userData.Comunhao || userData.Comunhão),
            missao: userData.missao || userData.Missao || userData.Missão,
            estudoBiblico: parseNumber(userData.estudoBiblico || userData.EstudoBiblico || userData['Estudo Biblico'] || userData['Estudo Bíblico']),
            totalPresenca: parseNumber(userData.totalPresenca || userData.TotalPresenca || userData['Total Presenca'] || userData['Total Presença']),
            batizouAlguem: parseBoolean(userData.batizouAlguem || userData.BatizouAlguem || userData['Batizou Alguem'] || userData['Batizou Alguém']),
            discPosBatismal: parseNumber(userData.discipuladoPosBatismo || userData.DiscipuladoPosBatismo || userData['Discipulado Pos-Batismo']),
            cpfValido: userData.cpfValido || userData.CPFValido || userData['CPF Valido'] || userData['CPF Válido'],
            camposVaziosACMS: parseBoolean(userData.camposVaziosACMS || userData.CamposVaziosACMS || userData['Campos Vazios']),
            lastPowerBIUpdate: new Date().toISOString()
          };

          await sql`
            UPDATE users
            SET extra_data = ${JSON.stringify(updatedExtraData)}
            WHERE id = ${user.id}
          `;

          updatedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ userName: userData.nome || userData.Nome || userData.name, error: errorMessage });
        }
      }

      try {
        await storage.calculateAdvancedUserPoints();
      } catch (error) {
        logger.error('Erro ao recalcular pontos:', error);
      }

      res.json({
        success: true,
        message: `${updatedCount} usuários atualizados com sucesso`,
        updated: updatedCount,
        notFound: notFoundCount,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      handleError(res, error, "Update from Power BI");
    }
  });
};
