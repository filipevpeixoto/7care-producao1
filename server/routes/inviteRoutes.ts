/**
 * Rotas de Convite de Pastores
 * Sistema self-service para onboarding de pastores
 */

import { Express, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq, and, desc } from 'drizzle-orm';
import multer from 'multer';
import { db } from '../neonConfig';
import { pastorInvites, users, districts, churches } from '../schema';
import { requireAuth } from '../middleware';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';
import { asyncHandler, sendSuccess, sendError, sendNotFound } from '../utils';
import { readExcelFile, cleanupTempFile } from '../utils/excelUtils';
import {
  CreateInviteDTO,
  SubmitOnboardingDTO,
  RejectInviteDTO,
  OnboardingData,
  ExcelRow,
  CreateInviteResponse,
  ValidateTokenResponse,
  ApproveInviteResponse,
  ChurchValidation,
} from '../types/pastor-invite.types';
import { extractChurchesFromExcel, validateExcelChurches } from '../utils/church-validation';

const upload = multer({ dest: 'uploads/' });

export const inviteRoutes = (app: Express): void => {
  /**
   * POST /api/invites - Criar novo convite (Superadmin)
   */
  app.post(
    '/api/invites',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      // Verificar se é superadmin
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado. Apenas superadmin pode criar convites.', 403);
        return;
      }

      const { email, expiresInDays = 7 }: CreateInviteDTO = req.body;

      if (!email) {
        sendError(res, 'Email é obrigatório', 400);
        return;
      }

      // Verificar se já existe convite pendente para este email
      const existingInvites = await db
        .select()
        .from(pastorInvites)
        .where(and(eq(pastorInvites.email, email), eq(pastorInvites.status, 'pending')))
        .limit(1);

      if (existingInvites.length > 0) {
        sendError(res, 'Já existe um convite pendente para este email', 400);
        return;
      }

      // Gerar token seguro
      const token = crypto.randomBytes(32).toString('hex');

      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Criar convite
      const [invite] = await db
        .insert(pastorInvites)
        .values({
          token,
          email,
          createdBy: req.user.id,
          expiresAt,
          status: 'pending',
        })
        .returning();

      const link = `${process.env.APP_URL || 'http://localhost:5000'}/pastor-onboarding/${token}`;

      logger.info(`Convite criado para ${email} por ${req.user.email}`);

      const response: CreateInviteResponse = {
        token: invite.token,
        link,
        expiresAt: invite.expiresAt.toISOString(),
      };

      res.json(response);
    })
  );

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

      res.json(response);
    })
  );

  /**
   * GET /api/churches/registered - Buscar igrejas cadastradas
   */
  app.get(
    '/api/churches/registered',
    asyncHandler(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      const allChurches = await db
        .select({
          id: churches.id,
          name: churches.name,
          code: churches.code,
        })
        .from(churches);

      res.json({ churches: allChurches });
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

      res.json(response);
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

      res.json({ validations });
    })
  );

  /**
   * POST /api/invites/:token/submit - Submeter onboarding completo
   */
  app.post(
    '/api/invites/:token/submit',
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Montar dados do onboarding
      const onboardingData: OnboardingData = {
        personal: data.personal,
        district: data.district,
        churches: data.churches,
        excelData: data.excelData,
        churchValidation: data.churchValidation,
        passwordHash,
        completedSteps: [1, 2, 3, 4, 5, 6],
        lastStepAt: new Date().toISOString(),
      };

      // Atualizar convite para submitted
      await db
        .update(pastorInvites)
        .set({
          status: 'submitted',
          submittedAt: new Date(),
          onboardingData,
          updatedAt: new Date(),
        })
        .where(eq(pastorInvites.id, invite.id));

      logger.info(`Onboarding submetido para ${invite.email}`);

      res.json({
        success: true,
        message: 'Cadastro enviado para aprovação. Você receberá um email em breve.',
      });
    })
  );

  /**
   * GET /api/invites - Listar convites (Superadmin)
   */
  app.get(
    '/api/invites',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado', 403);
        return;
      }

      const { status } = req.query;

      let invitesList;
      if (status) {
        invitesList = await db
          .select()
          .from(pastorInvites)
          .where(eq(pastorInvites.status, status as string))
          .orderBy(desc(pastorInvites.createdAt));
      } else {
        invitesList = await db.select().from(pastorInvites).orderBy(desc(pastorInvites.createdAt));
      }

      res.json({ invites: invitesList });
    })
  );

  /**
   * GET /api/invites/:id - Detalhes de um convite (Superadmin)
   */
  app.get(
    '/api/invites/:id',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado', 403);
        return;
      }

      const inviteId = parseInt(req.params.id);

      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.id, inviteId))
        .limit(1);

      const invite = invites[0];

      if (!invite) {
        sendNotFound(res, 'Convite não encontrado');
        return;
      }

      res.json({ invite });
    })
  );

  /**
   * POST /api/invites/:id/approve - Aprovar convite (Superadmin)
   */
  app.post(
    '/api/invites/:id/approve',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado', 403);
        return;
      }

      const inviteId = parseInt(req.params.id);

      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.id, inviteId))
        .limit(1);

      const invite = invites[0];

      if (!invite || invite.status !== 'submitted') {
        sendError(res, 'Convite inválido ou não submetido', 400);
        return;
      }

      const data = invite.onboardingData as OnboardingData;

      // 1. Criar usuário
      const [user] = await db
        .insert(users)
        .values({
          name: data.personal.name,
          email: data.personal.email,
          password: data.passwordHash!,
          role: 'pastor',
          church: '',
          status: 'approved',
        })
        .returning();

      // 2. Criar distrito
      const [district] = await db
        .insert(districts)
        .values({
          name: data.district.name,
          code: `DIST-${Date.now()}`,
          pastorId: user.id,
          description: data.district.description,
        })
        .returning();

      // 3. Atualizar usuário com district_id
      await db.update(users).set({ districtId: district.id }).where(eq(users.id, user.id));

      // 4. Criar igrejas
      const churchIds: Record<string, number> = {};

      for (const church of data.churches) {
        const [createdChurch] = await db
          .insert(churches)
          .values({
            name: church.name,
            code: `IGR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            address: church.address,
            districtId: district.id,
          })
          .returning();

        churchIds[church.name] = createdChurch.id;
      }

      // 5. Importar membros (se houver)
      if (data.excelData && data.churchValidation) {
        for (const member of data.excelData.data) {
          const foundValidation: ChurchValidation | undefined = data.churchValidation.find(
            (v: ChurchValidation) => v.excelChurchName === member.igreja
          );

          if (!foundValidation || foundValidation.action === 'ignore') continue;

          let churchId = foundValidation.matchedChurchId;

          // Se escolheu criar nova igreja
          if (foundValidation.action === 'create_new') {
            const churchName = foundValidation.excelChurchName;
            if (!churchIds[churchName]) {
              const [newChurch] = await db
                .insert(churches)
                .values({
                  name: churchName,
                  code: `IGR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  address: '',
                  districtId: district.id,
                })
                .returning();
              churchIds[churchName] = newChurch.id;
            }
            churchId = churchIds[churchName];
          }

          if (!churchId) continue;

          // Criar membro
          await db.insert(users).values({
            name: member.nome,
            email: member.email || `${Date.now()}@temp.com`,
            password: await bcrypt.hash('changeme123', 10),
            role: 'member',
            church: member.igreja,
            districtId: district.id,
            status: 'pending',
            firstAccess: true,
          });
        }
      }

      // 6. Atualizar convite
      await db
        .update(pastorInvites)
        .set({
          status: 'approved',
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          userId: user.id,
          districtId: district.id,
          updatedAt: new Date(),
        })
        .where(eq(pastorInvites.id, invite.id));

      logger.info(`Convite aprovado: ${invite.email} -> user ${user.id}, district ${district.id}`);

      const response: ApproveInviteResponse = {
        success: true,
        userId: user.id,
        districtId: district.id,
      };

      res.json(response);
    })
  );

  /**
   * POST /api/invites/:id/reject - Rejeitar convite (Superadmin)
   */
  app.post(
    '/api/invites/:id/reject',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado', 403);
        return;
      }

      const inviteId = parseInt(req.params.id);
      const { reason, details }: RejectInviteDTO = req.body;

      if (!reason) {
        sendError(res, 'Motivo da rejeição é obrigatório', 400);
        return;
      }

      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.id, inviteId))
        .limit(1);

      const invite = invites[0];

      if (!invite || invite.status !== 'submitted') {
        sendError(res, 'Convite inválido ou não submetido', 400);
        return;
      }

      // Atualizar para rejeitado
      await db
        .update(pastorInvites)
        .set({
          status: 'rejected',
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          rejectionReason: details || reason,
          updatedAt: new Date(),
        })
        .where(eq(pastorInvites.id, invite.id));

      logger.info(`Convite rejeitado: ${invite.email} - Motivo: ${reason}`);

      sendSuccess(res, { message: 'Convite rejeitado com sucesso' });
    })
  );
};
