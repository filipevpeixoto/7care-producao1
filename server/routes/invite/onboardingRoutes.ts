/**
 * Onboarding Routes - Public token-gated routes for the onboarding flow
 *
 * - GET /api/invites/validate/:token (validate token)
 * - GET /api/churches/registered (list churches)
 * - POST /api/invites/:token/upload-excel (upload Excel)
 * - POST /api/invites/:token/validate-churches (validate churches)
 * - POST /api/invites/onboarding/:token (submit onboarding — alias)
 * - POST /api/invites/:token/submit (submit onboarding)
 */

import { type Express, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../neonConfig';
import { pastorInvites, churches } from '../../schema';
import { type AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';
import { getAuthUserId } from '../../utils/authHelpers';
import { BCRYPT_SALT_ROUNDS } from '../../config/security';
import { asyncHandler } from '../../utils';
import { readExcelFile, cleanupTempFile } from '../../utils/excelUtils';
import {
  type SubmitOnboardingDTO,
  type OnboardingData,
  type ExcelRow,
  type ValidateTokenResponse,
} from '../../types/pastor-invite.types';
import { extractChurchesFromExcel, validateExcelChurches } from '../../utils/church-validation';
import { isSuperAdmin } from '../../utils/permissions';
import { getRepository } from '../../container';
import { sendSuccess, sendError, sendNotFound } from '../../utils/apiResponse';
import { upload } from './inviteHelpers';
import { processOnboarding } from '../../services/onboardingService';

export const onboardingRoutes = (app: Express): void => {
  /**
   * GET /api/invites/validate/:token - Validar token de convite
   */
  app.get(
    '/api/invites/validate/:token',
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { token } = req.params;

      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.token, token))
        .limit(1);

      const invite = invites[0];

      if (!invite) {
        sendNotFound(res, 'Convite não encontrado');
        return;
      }

      // Verificar se expirou
      if (new Date() > invite.expiresAt) {
        sendError(res, 'Convite expirado', 400);
        return;
      }

      // Verificar se já foi usado
      if (invite.status !== 'pending' && invite.status !== 'submitted') {
        sendError(res, 'Convite já foi processado', 400);
        return;
      }

      const response: ValidateTokenResponse = {
        valid: true,
        email: invite.email,
        expiresAt: invite.expiresAt.toISOString(),
      };

      sendSuccess(res, response);
    })
  );

  /**
   * GET /api/churches/registered - Buscar igrejas cadastradas
   */
  app.get(
    '/api/churches/registered',
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = String(getAuthUserId(req));
      const userRepo = getRepository('userRepository');

      let allChurches = await db
        .select({
          id: churches.id,
          name: churches.name,
          code: churches.code,
          districtId: churches.districtId,
        })
        .from(churches);

      // Filtrar por distrito se não for super admin
      if (userId) {
        const requestingUser = await userRepo.getUserById(parseInt(userId));

        if (requestingUser && !isSuperAdmin(requestingUser)) {
          // Se for pastor, filtrar pelo distrito
          if (requestingUser.role === 'pastor' && requestingUser.districtId) {
            logger.debug(
              `🏛️ Pastor detectado em churches/registered, filtrando por distrito: ${requestingUser.districtId}`
            );
            allChurches = allChurches.filter(c => c.districtId === requestingUser.districtId);
          }
          // Para outros usuários (não-pastores e não-superadmins), não filtra
          // pois eles podem precisar ver todas as igrejas disponíveis
        }
      }

      // Remover districtId da resposta (informação interna)
      const churchesResponse = allChurches.map(({ districtId: _districtId, ...church }) => church);

      sendSuccess(res, { churches: churchesResponse });
    })
  );

  /**
   * POST /api/invites/:token/upload-excel - Upload e preview do Excel
   */
  app.post(
    '/api/invites/:token/upload-excel',
    upload.single('file'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { token } = req.params;

      // Validar arquivo
      if (!req.file) {
        sendError(res, 'Nenhum arquivo enviado', 400);
        return;
      }

      // Validar token
      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.token, token))
        .limit(1);

      const invite = invites[0];

      if (!invite || invite.status !== 'pending') {
        cleanupTempFile(req.file.path);
        sendError(res, 'Convite inválido', 400);
        return;
      }

      // Validar extensão do arquivo
      if (
        !req.file.originalname.endsWith('.xlsx') &&
        !req.file.originalname.endsWith('.xls') &&
        !req.file.originalname.endsWith('.csv')
      ) {
        cleanupTempFile(req.file.path);
        sendError(res, 'Apenas arquivos Excel (.xlsx, .xls) ou CSV são aceitos', 400);
        return;
      }

      // Processar arquivo Excel
      const { rows: excelData } = await readExcelFile(req.file.path);

      if (!excelData || excelData.length === 0) {
        cleanupTempFile(req.file.path);
        sendError(res, 'Nenhum dado encontrado no arquivo', 400);
        return;
      }

      // Converter dados do Excel para formato esperado
      const formattedData: ExcelRow[] = excelData.map(row => ({
        nome: String(row.nome || row.Nome || row.name || '').trim(),
        igreja: String(row.igreja || row.Igreja || row.church || '').trim(),
        telefone:
          row.telefone || row.Telefone || row.phone
            ? String(row.telefone || row.Telefone || row.phone).trim()
            : undefined,
        email: row.email || row.Email ? String(row.email || row.Email).trim() : undefined,
        cargo:
          row.cargo || row.Cargo || row.role
            ? String(row.cargo || row.Cargo || row.role).trim()
            : undefined,
      }));

      // Extrair igrejas e contar membros
      const { churches: uniqueChurches } = extractChurchesFromExcel(formattedData);

      const response = {
        fileName: req.file.originalname,
        totalRows: formattedData.length,
        data: formattedData,
        churches: uniqueChurches,
      };

      // Limpar arquivo temporário
      cleanupTempFile(req.file.path);

      sendSuccess(res, response);
    })
  );

  /**
   * POST /api/invites/:token/validate-churches - Validar correspondência de igrejas
   */
  app.post(
    '/api/invites/:token/validate-churches',
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { token } = req.params;
      const { excelData }: { excelData: { data: ExcelRow[] } } = req.body;

      // Validar token
      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.token, token))
        .limit(1);

      const invite = invites[0];

      if (!invite || invite.status !== 'pending') {
        sendError(res, 'Convite inválido', 400);
        return;
      }

      if (!excelData || !excelData.data || excelData.data.length === 0) {
        sendError(res, 'Dados de Excel não fornecidos', 400);
        return;
      }

      // Extrair igrejas únicas e contar membros
      const { churches: excelChurchNames, memberCount } = extractChurchesFromExcel(excelData.data);

      // Buscar igrejas cadastradas no sistema
      const registeredChurches = await db
        .select({
          id: churches.id,
          name: churches.name,
        })
        .from(churches);

      // Validar cada igreja da Excel contra igrejas cadastradas
      const validations = validateExcelChurches(excelChurchNames, registeredChurches, memberCount);

      logger.info(`Validação de igrejas para convite ${token}: ${validations.length} igrejas`);

      sendSuccess(res, { validations });
    })
  );

  /**
   * POST /api/invites/onboarding/:token - Alias para submit (usado pelo frontend)
   * POST /api/invites/:token/submit - Submeter onboarding completo
   *
   * NOVO FLUXO: Convite do superadmin = pré-aprovação
   * Quando o pastor termina o onboarding, tudo é carregado automaticamente
   * (usuário, distrito, igrejas, membros, configurações)
   */
  const submitOnboardingHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { token } = req.params;
      const data: SubmitOnboardingDTO = req.body;

      // Validar token
      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.token, token))
        .limit(1);

      const invite = invites[0];

      if (!invite) {
        sendNotFound(res, 'Convite não encontrado');
        return;
      }

      if (invite.status !== 'pending') {
        sendError(res, 'Convite já foi processado', 400);
        return;
      }

      if (new Date() > invite.expiresAt) {
        sendError(res, 'Convite expirado', 400);
        return;
      }

      // Hash da senha
      const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

      // Normalizar dados do payload (frontend pode enviar em formato diferente)
      const normalizedPersonal = {
        name: data.name || data.personal?.name || 'Pastor',
        email: invite.email,
        phone: data.phone || data.personal?.phone || '',
      };

      // Montar dados do onboarding
      const onboardingData: OnboardingData = {
        personal: normalizedPersonal,
        district: data.district,
        churches: data.churches || [],
        excelData: data.excelData,
        churchValidation: data.churchValidation,
        gamificationConfig: data.gamificationConfig,
        passwordHash,
        completedSteps: [1, 2, 3, 4, 5, 6, 7, 8],
        lastStepAt: new Date().toISOString(),
      };

      logger.info(`🚀 Iniciando aprovação automática para ${invite.email}`);

      try {
        // ============================================
        // APROVAÇÃO AUTOMÁTICA - Via serviço compartilhado
        // ============================================

        const result = await processOnboarding(onboardingData);

        // Atualizar convite como aprovado
        await db
          .update(pastorInvites)
          .set({
            status: 'approved',
            submittedAt: new Date(),
            reviewedAt: new Date(),
            onboardingData,
            userId: result.userId,
            districtId: result.districtId,
            updatedAt: new Date(),
          })
          .where(eq(pastorInvites.id, invite.id));

        logger.info(
          `🎉 Onboarding completo e aprovado automaticamente: ${invite.email} -> user ${result.userId}, district ${result.districtId}`
        );

        sendSuccess(res, {
          success: true,
          message: 'Cadastro concluído com sucesso! Você já pode fazer login.',
          userId: result.userId,
          districtId: result.districtId,
          churchesCreated: result.churchesCreated,
          membersImported: result.membersImported,
        });
      } catch (error) {
        logger.error(`❌ Erro ao processar onboarding automático:`, error);

        // Salvar como submitted para revisão manual em caso de erro
        await db
          .update(pastorInvites)
          .set({
            status: 'submitted',
            submittedAt: new Date(),
            onboardingData,
            updatedAt: new Date(),
          })
          .where(eq(pastorInvites.id, invite.id));

        sendError(
          res,
          'Ocorreu um erro ao processar seu cadastro. Nosso time foi notificado e entrará em contato.',
          500
        );
      }
    }
  );

  // Registrar ambos os endpoints (alias)
  app.post('/api/invites/onboarding/:token', submitOnboardingHandler);
  app.post('/api/invites/:token/submit', submitOnboardingHandler);
};
