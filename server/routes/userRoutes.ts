/**
 * User Routes Module
 * Endpoints relacionados ao gerenciamento de usuários
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { sql } from '../neonConfig';
import { checkReadOnlyAccess } from '../middleware';
import { User } from '../../shared/schema';
import {
  parseDate,
  parseBirthDate,
  parseCargos,
  parseBoolean,
  parseNumber,
} from '../utils/parsers';
import { hasAdminAccess, isSuperAdmin } from '../utils/permissions';
import * as bcrypt from 'bcryptjs';
import { validateBody, validateParams, ValidatedRequest } from '../middleware/validation';
import { createUserSchema } from '../schemas';
import { idParamSchema } from '../utils/paramValidation';
import { logger } from '../utils/logger';
import { cacheMiddleware, invalidateCacheMiddleware } from '../middleware/cache';
import { CACHE_TTL } from '../constants';
import { asyncHandler, sendSuccess, sendNotFound, sendError } from '../utils';

// Tipo para dados extras do usuário (para cálculo de pontos)
interface UserExtraData {
  engajamento?: string;
  classificacao?: string;
  dizimistaType?: string;
  ofertanteType?: string;
  tempoBatismoAnos?: number;
  temCargo?: string;
  departamentosCargos?: string;
  nomeUnidade?: string;
  temLicao?: boolean | string;
  totalPresenca?: number | string;
  comunhao?: number;
  missao?: number;
  estudoBiblico?: number;
  batizouAlguem?: string;
  discipuladoPosBatismo?: number;
  cpfValido?: string;
  camposVaziosACMS?: string;
  [key: string]: unknown;
}

// Tipo para configuração de pontos
interface PointsConfig {
  basicPoints?: number;
  engajamento?: { alto?: number; medio?: number; baixo?: number };
  classificacao?: { frequente?: number; naoFrequente?: number };
  dizimista?: { naoDizimista?: number; recorrente?: number; sazonal?: number; pontual?: number };
  ofertante?: { naoOfertante?: number; recorrente?: number; sazonal?: number; pontual?: number };
  tempobatismo?: { maisVinte?: number; dezAnos?: number; cincoAnos?: number; doisAnos?: number };
  cargos?: { tresOuMais?: number; doisCargos?: number; umCargo?: number };
  nomeunidade?: { comUnidade?: number };
  temlicao?: { comLicao?: number };
  totalpresenca?: { oitoATreze?: number; quatroASete?: number };
  escolasabatina?: { comunhao?: number; missao?: number; estudoBiblico?: number };
  batizouAlguem?: { sim?: number };
  discipuladoPosBatismo?: { multiplicador?: number };
  cpfvalido?: { valido?: number };
  cpfValido?: { valido?: number };
  camposvaziosacms?: { completos?: number };
  camposVaziosACMS?: { completos?: number };
}

// Helper function to parse extraData
const parseExtraData = (user: User): UserExtraData => {
  if (!user.extraData) return {};
  if (typeof user.extraData === 'string') {
    try {
      return JSON.parse(user.extraData) as UserExtraData;
    } catch {
      return {};
    }
  }
  return user.extraData as UserExtraData;
};

// Helper function to calculate user points from configuration
const calculateUserPointsFromConfig = (user: User, config: PointsConfig): number => {
  let points = 0;
  const extraData = parseExtraData(user);

  // 1. ENGAJAMENTO
  const engajamento = extraData.engajamento?.toLowerCase() || '';
  if (engajamento.includes('alto')) {
    points += config.engajamento?.alto || 0;
  } else if (engajamento.includes('medio')) {
    points += config.engajamento?.medio || 0;
  } else if (engajamento.includes('baixo')) {
    points += config.engajamento?.baixo || 0;
  }

  // 2. CLASSIFICAÇÃO
  const classificacao = extraData.classificacao?.toLowerCase() || '';
  if (classificacao.includes('frequente')) {
    points += config.classificacao?.frequente || 0;
  } else if (classificacao.includes('naofrequente')) {
    points += config.classificacao?.naoFrequente || 0;
  }

  // 3. DIZIMISTA
  const dizimistaType = extraData.dizimistaType?.toLowerCase() || '';
  if (dizimistaType.includes('recorrente')) {
    points += config.dizimista?.recorrente || 0;
  } else if (dizimistaType.includes('sazonal')) {
    points += config.dizimista?.sazonal || 0;
  } else if (dizimistaType.includes('pontual')) {
    points += config.dizimista?.pontual || 0;
  }

  // 4. OFERTANTE
  const ofertanteType = extraData.ofertanteType?.toLowerCase() || '';
  if (ofertanteType.includes('recorrente')) {
    points += config.ofertante?.recorrente || 0;
  } else if (ofertanteType.includes('sazonal')) {
    points += config.ofertante?.sazonal || 0;
  } else if (ofertanteType.includes('pontual')) {
    points += config.ofertante?.pontual || 0;
  }

  // 5. TEMPO DE BATISMO
  const tempoBatismoAnos = extraData.tempoBatismoAnos || 0;
  if (tempoBatismoAnos >= 20) {
    points += config.tempobatismo?.maisVinte || 0;
  } else if (tempoBatismoAnos >= 10) {
    points += config.tempobatismo?.dezAnos || 0;
  } else if (tempoBatismoAnos >= 5) {
    points += config.tempobatismo?.cincoAnos || 0;
  } else if (tempoBatismoAnos >= 2) {
    points += config.tempobatismo?.doisAnos || 0;
  }

  // 6. CARGOS
  if (extraData.temCargo === 'Sim' && extraData.departamentosCargos) {
    const numCargos = extraData.departamentosCargos.split(';').length;
    if (numCargos >= 3) {
      points += config.cargos?.tresOuMais || 0;
    } else if (numCargos === 2) {
      points += config.cargos?.doisCargos || 0;
    } else if (numCargos === 1) {
      points += config.cargos?.umCargo || 0;
    }
  }

  // 7. NOME DA UNIDADE
  if (extraData.nomeUnidade?.trim()) {
    points += config.nomeunidade?.comUnidade || 0;
  }

  // 8. TEM LIÇÃO
  if (extraData.temLicao === true || extraData.temLicao === 'true') {
    points += config.temlicao?.comLicao || 0;
  }

  // 9. TOTAL DE PRESENÇA
  if (extraData.totalPresenca !== undefined && extraData.totalPresenca !== null) {
    const presenca =
      typeof extraData.totalPresenca === 'string'
        ? parseInt(extraData.totalPresenca)
        : extraData.totalPresenca;
    if (presenca >= 8 && presenca <= 13) {
      points += config.totalpresenca?.oitoATreze || 0;
    } else if (presenca >= 4 && presenca <= 7) {
      points += config.totalpresenca?.quatroASete || 0;
    }
  }

  // 10. ESCOLA SABATINA - COMUNHÃO
  if (extraData.comunhao && extraData.comunhao > 0) {
    points += extraData.comunhao * (config.escolasabatina?.comunhao || 0);
  }

  // 11. ESCOLA SABATINA - MISSÃO
  if (extraData.missao && extraData.missao > 0) {
    points += extraData.missao * (config.escolasabatina?.missao || 0);
  }

  // 12. ESCOLA SABATINA - ESTUDO BÍBLICO
  if (extraData.estudoBiblico && extraData.estudoBiblico > 0) {
    points += extraData.estudoBiblico * (config.escolasabatina?.estudoBiblico || 0);
  }

  // 13. ESCOLA SABATINA - DISCIPULADO PÓS-BATISMO
  if (extraData.discipuladoPosBatismo && extraData.discipuladoPosBatismo > 0) {
    points += extraData.discipuladoPosBatismo * (config.discipuladoPosBatismo?.multiplicador || 0);
  }

  // 14. CPF VÁLIDO
  if (extraData.cpfValido === 'Sim' || extraData.cpfValido === 'true') {
    points += config.cpfValido?.valido || 0;
  }

  // 15. CAMPOS VAZIOS ACMS
  if (extraData.camposVaziosACMS === 'false') {
    points += config.camposVaziosACMS?.completos || 0;
  }

  return Math.round(points);
};

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
  app.get(
    '/api/users',
    cacheMiddleware('users', CACHE_TTL.USERS),
    asyncHandler(async (req: Request, res: Response) => {
      logger.debug('🔍 [GET /api/users] Iniciando busca de usuários');
      const { role, status, church } = req.query;

      // Paginação
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50)); // Máximo 500
      const offset = (page - 1) * limit;

      const requestingUserId = parseInt((req.headers['x-user-id'] as string) || '0');

      logger.debug('📋 Parâmetros:', { role, status, church, page, limit, requestingUserId });

      // Buscar dados do usuário que está fazendo a requisição
      let requestingUser = null;
      if (requestingUserId) {
        requestingUser = await storage.getUserById(requestingUserId);
      }

      let users = await storage.getAllUsers();
      logger.debug(`✅ ${users.length} usuários encontrados no banco`);

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
        const missionaryId = parseInt((req.headers['x-user-id'] as string) || '0');
        const missionary = users.find(u => u.id === missionaryId);

        if (missionary && missionary.role === 'missionary') {
          const churchInterested = users.filter(
            u =>
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
                canRequestDiscipleship: true,
              };
            }
          });

          const otherUsers = users.filter(
            u =>
              u.role !== 'interested' ||
              u.church !== missionary.church ||
              u.churchCode !== missionary.churchCode
          );

          const finalUsers = [...processedUsers, ...otherUsers];

          // Aplicar paginação
          const paginatedUsers = finalUsers.slice(offset, offset + limit);

          const safeUsers = paginatedUsers.map(({ password: _password, ...user }) => user);
          res.json({
            data: safeUsers,
            pagination: {
              page,
              limit,
              total: finalUsers.length,
              totalPages: Math.ceil(finalUsers.length / limit),
            },
          });
          return;
        }
      }

      // Calcular pontuação apenas para os usuários da página atual (otimização)
      const paginatedUsers = users.slice(offset, offset + limit);
      const pointsMap = await storage.calculateUserPointsBatch(paginatedUsers);
      const usersWithPoints = paginatedUsers.map(user => ({
        ...user,
        calculatedPoints: pointsMap.get(user.id) ?? 0,
      }));

      const safeUsers = usersWithPoints.map(({ password: _password, ...user }) => user);
      logger.debug(`📤 Enviando página ${page}/${totalPages} com ${safeUsers.length} usuários`);

      res.json({
        data: safeUsers,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages,
        },
      });
    })
  );

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
  app.get(
    '/api/users/:id(\\d+)',
    validateParams(idParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const user = await storage.getUserById(id);

      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      const { password: _password, ...safeUser } = user;
      res.json(safeUser);
    })
  );

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
  app.post(
    '/api/users',
    checkReadOnlyAccess,
    invalidateCacheMiddleware('users'),
    validateBody(createUserSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userData = (req as ValidatedRequest<typeof createUserSchema._type>).validatedBody;
      logger.info(`Criando novo usuário: ${userData.email}`);

      const hashedPassword = userData.password
        ? await bcrypt.hash(userData.password, 10)
        : await bcrypt.hash('meu7care', 10);

      let _processedChurch: string | null = null;
      if (userData.church && userData.church.trim() !== '') {
        try {
          const church = await storage.getOrCreateChurch(userData.church.trim());
          _processedChurch = church.name;
        } catch (error) {
          logger.error(`Erro ao processar igreja "${userData.church}":`, error);
          _processedChurch = 'Igreja Principal';
        }
      }

      const processedUserData = {
        ...userData,
        password: hashedPassword,
        firstAccess: true,
        status: 'pending',
        isApproved: userData.isApproved || false,
        role: userData.role || 'interested',
        points: 0,
        level: 'Bronze',
        attendance: 0,
      };

      const newUser = await storage.createUser({
        ...processedUserData,
        biblicalInstructor: processedUserData.biblicalInstructor ?? null,
      } as Parameters<typeof storage.createUser>[0]);

      res.status(201).json(newUser);
    })
  );

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
  app.put(
    '/api/users/:id(\\d+)',
    checkReadOnlyAccess,
    invalidateCacheMiddleware('users'),
    asyncHandler(async (req: Request, res: Response) => {
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
              notes: 'Vinculado pelo admin',
            });
          }
        }
      }

      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      const { password: _password2, ...safeUser } = user;
      res.json(safeUser);
    })
  );

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
  app.delete(
    '/api/users/:id(\\d+)',
    checkReadOnlyAccess,
    invalidateCacheMiddleware('users'),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);

      const user = await storage.getUserById(id);
      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      if (user.email === 'admin@7care.com') {
        return sendError(res, 'Não é possível excluir o Super Administrador do sistema', 403);
      }

      if (hasAdminAccess(user)) {
        return sendError(res, 'Não é possível excluir usuários administradores do sistema', 403);
      }

      const success = await storage.deleteUser(id);

      if (!success) {
        return sendNotFound(res, 'Usuário');
      }

      sendSuccess(res, { success: true });
    })
  );

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
  app.post(
    '/api/users/:id(\\d+)/approve',
    checkReadOnlyAccess,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const user = await storage.approveUser(id);

      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      const { password: _password3, ...safeUser } = user;
      res.json(safeUser);
    })
  );

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
  app.post(
    '/api/users/:id(\\d+)/reject',
    checkReadOnlyAccess,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const user = await storage.rejectUser(id);

      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      const { password: _password4, ...safeUser } = user;
      res.json(safeUser);
    })
  );

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

      const result = await storage.calculateUserPoints(userId);

      if (result && result.success) {
        res.json(result);
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

      const user = await storage.getUserById(userId);
      if (!user) {
        return sendNotFound(res, 'Usuário');
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
          userData: result.userData || {},
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
      const userId = req.headers['x-user-id'] as string;
      const userRole = req.headers['x-user-role'] as string;

      let userChurch: string | null = null;

      if (!hasAdminAccess({ role: userRole as User['role'] }) && userId) {
        const currentUser = await storage.getUserById(parseInt(userId));
        if (currentUser && currentUser.church) {
          userChurch = currentUser.church;
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
        return (
          birthDate && birthDate.getMonth() === currentMonth && birthDate.getDate() === currentDay
        );
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
        church: user.church || null,
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
        filteredByChurch: userChurch || null,
      });
    })
  );

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
  app.get(
    '/api/my-interested',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt((req.headers['x-user-id'] as string) || '0');
      if (!userId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const user = await storage.getUserById(userId);
      if (!user || (user.role !== 'missionary' && user.role !== 'member')) {
        return sendError(res, 'Apenas missionários e membros podem acessar esta rota', 403);
      }

      const allUsers = await storage.getAllUsers();

      const churchInterested = allUsers.filter(
        u => u.role === 'interested' && u.church === user.church
      );

      const relationships = await storage.getRelationshipsByMissionary(userId);
      const linkedInterestedIds = relationships.map(r => r.interestedId);

      const processedUsers = churchInterested.map(user => {
        const isLinked = linkedInterestedIds.includes(user.id);

        if (isLinked) {
          return {
            ...user,
            isLinked: true,
            relationshipId: relationships.find(r => r.interestedId === user.id)?.id,
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
            canRequestDiscipleship: true,
          };
        }
      });

      const safeUsers = processedUsers.map(({ password: _password5, ...user }) => user);
      res.json(safeUsers);
    })
  );

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
  app.post(
    '/api/users/bulk-import',
    asyncHandler(async (req: Request, res: Response) => {
      const { users } = req.body;

      if (!Array.isArray(users) || users.length === 0) {
        return sendError(res, 'Users array is required and must not be empty', 400);
      }

      // Obter configuração de pontos atual
      let pointsConfig: PointsConfig = {};
      try {
        const configData = await storage.getPointsConfiguration();
        pointsConfig = configData || {};
        logger.info('Configuração de pontos carregada para importação em massa');
      } catch (configError) {
        logger.warn(
          'Não foi possível carregar configuração de pontos, importando sem calcular pontos:',
          configError
        );
      }

      const processedUsers: Record<string, unknown>[] = [];
      const errors: Array<{ userId: string | number; userName: string; error: string }> = [];

      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        try {
          const existingUser = await storage.getUserByEmail(userData.email);
          if (existingUser) {
            errors.push({
              userId: userData.email,
              userName: userData.name,
              error: `User with email ${userData.email} already exists`,
            });
            continue;
          }

          const normalize = (str: string) =>
            str
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9]/g, '')
              .toLowerCase();
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
          while (
            allUsers.some(u => {
              const normalize = (str: string) =>
                str
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .toLowerCase();
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
            })
          ) {
            finalUsername = `${baseUsername}${counter}`;
            counter++;
          }

          const hashedPassword = await bcrypt.hash('meu7care', 10);

          const processedBirthDate = userData.birthDate ? parseBirthDate(userData.birthDate) : null;
          const processedBaptismDate = userData.baptismDate
            ? parseBirthDate(userData.baptismDate)
            : null;

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
            status: 'pending',
            isApproved: false,
          };

          const newUser = await storage.createUser({
            ...processedUserData,
            biblicalInstructor: processedUserData.biblicalInstructor ?? null,
          } as Parameters<typeof storage.createUser>[0]);

          // Calcular e atualizar pontos do usuário recém-criado
          let calculatedPoints = 0;
          if (Object.keys(pointsConfig).length > 0) {
            try {
              calculatedPoints = calculateUserPointsFromConfig(newUser as User, pointsConfig);
              if (calculatedPoints > 0) {
                await storage.updateUser(newUser.id, { points: calculatedPoints });
                logger.info(`Pontos calculados para ${newUser.name}: ${calculatedPoints}`);
              }
            } catch (pointsError) {
              logger.warn(`Erro ao calcular pontos para ${newUser.name}:`, pointsError);
            }
          }

          processedUsers.push({
            ...newUser,
            points: calculatedPoints,
            generatedUsername: finalUsername,
            defaultPassword: 'meu7care',
          });
        } catch (error) {
          logger.error(`Error processing user ${i + 1}:`, error);
          errors.push({
            userId: userData.email,
            userName: userData.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        success: true,
        message: `Successfully processed ${processedUsers.length} users`,
        users: processedUsers,
        errors: errors.length > 0 ? errors : undefined,
      });
    })
  );

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
  app.post(
    '/api/users/update-from-powerbi',
    asyncHandler(async (req: Request, res: Response) => {
      const { users: usersData } = req.body;

      if (!Array.isArray(usersData) || usersData.length === 0) {
        return sendError(res, 'Users array is required and must not be empty', 400);
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
            currentExtraData =
              typeof user.extra_data === 'string' ? JSON.parse(user.extra_data) : user.extra_data;
          }

          const updatedExtraData = {
            ...currentExtraData,
            engajamento: userData.engajamento || userData.Engajamento,
            classificacao:
              userData.classificacao || userData.Classificacao || userData.Classificação,
            dizimistaType: userData.dizimista || userData.Dizimista,
            ofertanteType: userData.ofertante || userData.Ofertante,
            tempoBatismoAnos:
              userData.tempoBatismo || userData.TempoBatismo || userData['Tempo Batismo'],
            cargos: parseCargos(userData.cargos || userData.Cargos),
            nomeUnidade: userData.nomeUnidade || userData.NomeUnidade || userData['Nome Unidade'],
            temLicao: parseBoolean(
              userData.temLicao ||
                userData.TemLicao ||
                userData['Tem Licao'] ||
                userData['Tem Lição']
            ),
            comunhao: parseNumber(userData.comunhao || userData.Comunhao || userData.Comunhão),
            missao: userData.missao || userData.Missao || userData.Missão,
            estudoBiblico: parseNumber(
              userData.estudoBiblico ||
                userData.EstudoBiblico ||
                userData['Estudo Biblico'] ||
                userData['Estudo Bíblico']
            ),
            totalPresenca: parseNumber(
              userData.totalPresenca ||
                userData.TotalPresenca ||
                userData['Total Presenca'] ||
                userData['Total Presença']
            ),
            batizouAlguem: parseBoolean(
              userData.batizouAlguem ||
                userData.BatizouAlguem ||
                userData['Batizou Alguem'] ||
                userData['Batizou Alguém']
            ),
            discPosBatismal: parseNumber(
              userData.discipuladoPosBatismo ||
                userData.DiscipuladoPosBatismo ||
                userData['Discipulado Pos-Batismo']
            ),
            cpfValido:
              userData.cpfValido ||
              userData.CPFValido ||
              userData['CPF Valido'] ||
              userData['CPF Válido'],
            camposVaziosACMS: parseBoolean(
              userData.camposVaziosACMS || userData.CamposVaziosACMS || userData['Campos Vazios']
            ),
            lastPowerBIUpdate: new Date().toISOString(),
          };

          await sql`
            UPDATE users
            SET extra_data = ${JSON.stringify(updatedExtraData)}
            WHERE id = ${user.id}
          `;

          updatedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            userName: userData.nome || userData.Nome || userData.name,
            error: errorMessage,
          });
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
        errors: errors.length > 0 ? errors : undefined,
      });
    })
  );
};
