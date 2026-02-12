/**
 * User Special Routes
 * Chat list, my-interested, bulk import, and PowerBI update
 */

import { type Express, type Request, type Response } from 'express';
import { sql } from '../../neonConfig';
import { type User } from '../../../shared/schema';
import {
  parseBirthDate,
  parseCargos,
  parseBoolean,
  parseNumber,
} from '../../utils/parsers';
import * as bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';
import { BCRYPT_SALT_ROUNDS } from '../../config/security';
import { asyncHandler } from '../../utils';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { getRepository, getService } from '../../container';
import { getAuthUserId, getAuthUserRole } from '../../utils/authHelpers';
import {
  calculateUserPointsFromConfig,
  type PointsConfig,
} from '../../services/pointsCalculation';
import { redactUserPII } from './userHelpers';

export const userSpecialRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const churchRepo = getRepository('churchRepository');
  const relationshipRepo = getRepository('relationshipRepository');
  const pointsRepo = getRepository('pointsRepository');
  const pointsCalcService = getService('pointsCalculationService');

  /**
   * @swagger
   * /api/users/chat-list:
   *   get:
   *     summary: Lista simplificada de usuários para chat
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: Lista de usuários para chat
   */
  app.get(
    '/api/users/chat-list',
    asyncHandler(async (req: Request, res: Response) => {
      logger.debug('🔍 [GET /api/users/chat-list] Buscando lista de usuários para chat');

      const requestingUserId = getAuthUserId(req);

      // Buscar dados do usuário que está fazendo a requisição
      let requestingUser = null;
      if (requestingUserId) {
        requestingUser = await userRepo.getUserById(requestingUserId);
      }

      // PERFORMANCE: Buscar usuários aprovados filtrados no banco (evita carregar todos na memória)
      let users: User[];
      if (requestingUser?.role === 'pastor' && requestingUser?.districtId) {
        // Pastor: buscar apenas aprovados do seu distrito
        users = await userRepo.getUsersByDistrictIdWithFilters(requestingUser.districtId, {
          status: 'approved',
        });
      } else {
        // Outros: buscar todos os aprovados com limite razoável
        const result = await userRepo.getUsersPaginated({
          page: 1,
          limit: 5000,
          status: 'approved',
        });
        users = result.data;
      }

      // Retornar apenas campos necessários para chat
      const chatList = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profilePhoto: u.profilePhoto,
      }));

      sendSuccess(res, chatList);
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
      const userId = getAuthUserId(req);
      if (!userId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const user = await userRepo.getUserById(userId);
      if (!user || (user.role !== 'missionary' && user.role !== 'member')) {
        return sendError(res, 'Apenas missionários e membros podem acessar esta rota', 403);
      }

      const allUsers = await userRepo.getAllUsers();

      const churchInterested = allUsers.filter(
        (u) => u.role === 'interested' && u.church === user.church
      );

      const relationships = await relationshipRepo.getByMissionary(userId);
      const linkedInterestedIds = relationships.map((r) => r.interestedId);

      const processedUsers = churchInterested.map((user) => {
        const isLinked = linkedInterestedIds.includes(user.id);

        if (isLinked) {
          return {
            ...user,
            isLinked: true,
            relationshipId: relationships.find((r) => r.interestedId === user.id)?.id,
          };
        }
        return redactUserPII(user);
      });

      const safeUsers = processedUsers.map(({ password: _password5, ...user }) => user);
      sendSuccess(res, safeUsers);
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
        const configData = await pointsRepo.getConfiguration();
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
          const existingUser = await userRepo.getUserByEmail(userData.email);
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
          const allUsers = await userRepo.getAllUsers();
          while (
            allUsers.some((u) => {
              const normalize = (str: string) =>
                str
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .toLowerCase();
              const nameParts = u.name.trim().split(' ');
              const generatedUsername =
                nameParts.length === 1
                  ? normalize(nameParts[0])
                  : `${normalize(nameParts[0])}.${normalize(nameParts[nameParts.length - 1])}`;
              return generatedUsername === finalUsername;
            })
          ) {
            finalUsername = `${baseUsername}${counter}`;
            counter++;
          }

          const { generateTemporaryPassword: genTempPwd } = await import('../../config/security');
          const importTempPassword = genTempPwd();
          const hashedPassword = await bcrypt.hash(importTempPassword, BCRYPT_SALT_ROUNDS);

          const processedBirthDate = userData.birthDate ? parseBirthDate(userData.birthDate) : null;
          const processedBaptismDate = userData.baptismDate
            ? parseBirthDate(userData.baptismDate)
            : null;

          let processedChurch: string | null = null;
          if (userData.church && userData.church.trim() !== '') {
            try {
              const church = await churchRepo.getOrCreateChurch(userData.church.trim());
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

          const newUser = await userRepo.createUser({
            ...processedUserData,
            biblicalInstructor: processedUserData.biblicalInstructor ?? null,
          } as Parameters<typeof userRepo.createUser>[0]);

          // Calcular e atualizar pontos do usuário recém-criado
          let calculatedPoints = 0;
          if (Object.keys(pointsConfig).length > 0) {
            try {
              calculatedPoints = calculateUserPointsFromConfig(newUser as User, pointsConfig);
              if (calculatedPoints > 0) {
                await userRepo.updateUser(newUser.id, { points: calculatedPoints });
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
            defaultPassword: importTempPassword,
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

      sendSuccess(res, {
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

      // Obter usuário que está fazendo a requisição para filtro por distrito
      const requestingUserId = getAuthUserId(req);
      let districtFilter: number | null = null;

      if (requestingUserId) {
        const requestingUser = await userRepo.getUserById(requestingUserId);
        if (requestingUser && requestingUser.role === 'pastor' && requestingUser.districtId) {
          districtFilter = requestingUser.districtId;
          logger.info(`🏛️ Recálculo pós-PowerBI filtrado por distrito: ${districtFilter}`);
        }
      }

      try {
        await pointsCalcService.calculateAdvancedUserPoints(districtFilter);
      } catch (error) {
        logger.error('Erro ao recalcular pontos:', error);
      }

      sendSuccess(res, {
        success: true,
        message: `${updatedCount} usuários atualizados com sucesso`,
        updated: updatedCount,
        notFound: notFoundCount,
        errors: errors.length > 0 ? errors : undefined,
        districtFiltered: districtFilter !== null,
      });
    })
  );
};
