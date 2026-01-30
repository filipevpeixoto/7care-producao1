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
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Verificar se é superadmin
        if (req.user?.role !== 'superadmin') {
          res.status(403).json({
            error: 'Acesso negado. Apenas superadmin pode criar convites.',
          });
          return;
        }

        const { email, expiresInDays = 7 }: CreateInviteDTO = req.body;

        if (!email) {
          res.status(400).json({ error: 'Email é obrigatório' });
          return;
        }

        // Verificar se já existe convite pendente para este email
        const existingInvites = await db
          .select()
          .from(pastorInvites)
          .where(and(eq(pastorInvites.email, email), eq(pastorInvites.status, 'pending')))
          .limit(1);

        if (existingInvites.length > 0) {
          res.status(400).json({
            error: 'Já existe um convite pendente para este email',
          });
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
      } catch (error) {
        logger.error('Erro ao criar convite:', error);
        res.status(500).json({ error: 'Erro ao criar convite' });
      }
    }
  );

  /**
   * GET /api/invites/validate/:token - Validar token de convite
   */
  app.get(
    '/api/invites/validate/:token',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const { token } = req.params;

        const invites = await db
          .select()
          .from(pastorInvites)
          .where(eq(pastorInvites.token, token))
          .limit(1);

        const invite = invites[0];

        if (!invite) {
          res.status(404).json({
            valid: false,
            error: 'Convite não encontrado',
          });
          return;
        }

        // Verificar se expirou
        if (new Date() > invite.expiresAt) {
          res.status(400).json({
            valid: false,
            error: 'Convite expirado',
          });
          return;
        }

        // Verificar se já foi usado
        if (invite.status !== 'pending' && invite.status !== 'submitted') {
          res.status(400).json({
            valid: false,
            error: 'Convite já foi processado',
          });
          return;
        }

        const response: ValidateTokenResponse = {
          valid: true,
          email: invite.email,
          expiresAt: invite.expiresAt.toISOString(),
        };

        res.json(response);
      } catch (error) {
        logger.error('Erro ao validar token:', error);
        res.status(500).json({ error: 'Erro ao validar token' });
      }
    }
  );

  /**
   * GET /api/churches/registered - Buscar igrejas cadastradas
   */
  app.get(
    '/api/churches/registered',
    async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const allChurches = await db
          .select({
            id: churches.id,
            name: churches.name,
            code: churches.code,
          })
          .from(churches);

        res.json({ churches: allChurches });
      } catch (error) {
        logger.error('Erro ao buscar igrejas:', error);
        res.status(500).json({ error: 'Erro ao buscar igrejas' });
      }
    }
  );

  /**
   * POST /api/invites/:token/upload-excel - Upload e preview do Excel
   */
  app.post(
    '/api/invites/:token/upload-excel',
    upload.single('file'),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const { token } = req.params;

        // Validar arquivo
        if (!req.file) {
          res.status(400).json({ error: 'Nenhum arquivo enviado' });
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
          res.status(400).json({ error: 'Convite inválido' });
          return;
        }

        // Validar extensão do arquivo
        if (
          !req.file.originalname.endsWith('.xlsx') &&
          !req.file.originalname.endsWith('.xls') &&
          !req.file.originalname.endsWith('.csv')
        ) {
          cleanupTempFile(req.file.path);
          res.status(400).json({ error: 'Apenas arquivos Excel (.xlsx, .xls) ou CSV são aceitos' });
          return;
        }

        // Processar arquivo Excel
        const { rows: excelData } = await readExcelFile(req.file.path);

        if (!excelData || excelData.length === 0) {
          cleanupTempFile(req.file.path);
          res.status(400).json({ error: 'Nenhum dado encontrado no arquivo' });
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
      } catch (error) {
        // Limpar arquivo em caso de erro
        if ((req as any).file?.path) {
          cleanupTempFile((req as any).file.path);
        }
        logger.error('Erro ao processar Excel:', error);
        res.status(500).json({ error: 'Erro ao processar arquivo Excel' });
      }
    }
  );

  /**
   * POST /api/invites/:token/validate-churches - Validar correspondência de igrejas
   */
  app.post(
    '/api/invites/:token/validate-churches',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
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
          res.status(400).json({ error: 'Convite inválido' });
          return;
        }

        if (!excelData || !excelData.data || excelData.data.length === 0) {
          res.status(400).json({ error: 'Dados de Excel não fornecidos' });
          return;
        }

        // Extrair igrejas únicas e contar membros
        const { churches: excelChurchNames, memberCount } = extractChurchesFromExcel(
          excelData.data
        );

        // Buscar igrejas cadastradas no sistema
        const registeredChurches = await db
          .select({
            id: churches.id,
            name: churches.name,
          })
          .from(churches);

        // Validar cada igreja da Excel contra igrejas cadastradas
        const validations = validateExcelChurches(
          excelChurchNames,
          registeredChurches,
          memberCount
        );

        logger.info(`Validação de igrejas para convite ${token}: ${validations.length} igrejas`);

        res.json({ validations });
      } catch (error) {
        logger.error('Erro ao validar igrejas:', error);
        res.status(500).json({ error: 'Erro ao validar igrejas' });
      }
    }
  );

  /**
   * POST /api/invites/:token/submit - Submeter onboarding completo
   */
  app.post(
    '/api/invites/:token/submit',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
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
          res.status(404).json({ error: 'Convite não encontrado' });
          return;
        }

        if (invite.status !== 'pending') {
          res.status(400).json({ error: 'Convite já foi processado' });
          return;
        }

        if (new Date() > invite.expiresAt) {
          res.status(400).json({ error: 'Convite expirado' });
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
      } catch (error) {
        logger.error('Erro ao submeter onboarding:', error);
        res.status(500).json({ error: 'Erro ao submeter cadastro' });
      }
    }
  );

  /**
   * GET /api/invites - Listar convites (Superadmin)
   */
  app.get(
    '/api/invites',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        if (req.user?.role !== 'superadmin') {
          res.status(403).json({ error: 'Acesso negado' });
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
          invitesList = await db
            .select()
            .from(pastorInvites)
            .orderBy(desc(pastorInvites.createdAt));
        }

        res.json({ invites: invitesList });
      } catch (error) {
        logger.error('Erro ao listar convites:', error);
        res.status(500).json({ error: 'Erro ao listar convites' });
      }
    }
  );

  /**
   * GET /api/invites/:id - Detalhes de um convite (Superadmin)
   */
  app.get(
    '/api/invites/:id',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        if (req.user?.role !== 'superadmin') {
          res.status(403).json({ error: 'Acesso negado' });
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
          res.status(404).json({ error: 'Convite não encontrado' });
          return;
        }

        res.json({ invite });
      } catch (error) {
        logger.error('Erro ao buscar convite:', error);
        res.status(500).json({ error: 'Erro ao buscar convite' });
      }
    }
  );

  /**
   * POST /api/invites/:id/approve - Aprovar convite (Superadmin)
   */
  app.post(
    '/api/invites/:id/approve',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        if (req.user?.role !== 'superadmin') {
          res.status(403).json({ error: 'Acesso negado' });
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
          res.status(400).json({ error: 'Convite inválido ou não submetido' });
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

        logger.info(
          `Convite aprovado: ${invite.email} -> user ${user.id}, district ${district.id}`
        );

        const response: ApproveInviteResponse = {
          success: true,
          userId: user.id,
          districtId: district.id,
        };

        res.json(response);
      } catch (error) {
        logger.error('Erro ao aprovar convite:', error);
        res.status(500).json({ error: 'Erro ao aprovar convite' });
      }
    }
  );

  /**
   * POST /api/invites/:id/reject - Rejeitar convite (Superadmin)
   */
  app.post(
    '/api/invites/:id/reject',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        if (req.user?.role !== 'superadmin') {
          res.status(403).json({ error: 'Acesso negado' });
          return;
        }

        const inviteId = parseInt(req.params.id);
        const { reason, details }: RejectInviteDTO = req.body;

        if (!reason) {
          res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
          return;
        }

        const invites = await db
          .select()
          .from(pastorInvites)
          .where(eq(pastorInvites.id, inviteId))
          .limit(1);

        const invite = invites[0];

        if (!invite || invite.status !== 'submitted') {
          res.status(400).json({ error: 'Convite inválido ou não submetido' });
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

        res.json({ success: true, message: 'Convite rejeitado com sucesso' });
      } catch (error) {
        logger.error('Erro ao rejeitar convite:', error);
        res.status(500).json({ error: 'Erro ao rejeitar convite' });
      }
    }
  );
};
