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
import { asyncHandler } from '../utils';
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
import { isSuperAdmin } from '../utils/permissions';
import { NeonAdapter } from '../neonAdapter';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendInternalError,
} from '../utils/apiResponse';

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

      sendSuccess(res, response);
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

      sendSuccess(res, response);
    })
  );

  /**
   * GET /api/churches/registered - Buscar igrejas cadastradas
   */
  app.get(
    '/api/churches/registered',
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.headers['x-user-id'] as string;
      const storage = new NeonAdapter();

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
        const requestingUser = await storage.getUserById(parseInt(userId));

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
      const passwordHash = await bcrypt.hash(data.password, 10);

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
        dracmaConfig: data.dracmaConfig,
        gamificationConfig: data.gamificationConfig,
        passwordHash,
        completedSteps: [1, 2, 3, 4, 5, 6, 7, 8],
        lastStepAt: new Date().toISOString(),
      };

      logger.info(`🚀 Iniciando aprovação automática para ${invite.email}`);

      try {
        // ============================================
        // APROVAÇÃO AUTOMÁTICA - Igual ao fluxo do superadmin
        // ============================================

        // 1. Criar usuário pastor
        const [user] = await db
          .insert(users)
          .values({
            name: normalizedPersonal.name,
            email: normalizedPersonal.email,
            password: passwordHash,
            role: 'pastor',
            church: '',
            status: 'approved',
          })
          .returning();

        logger.info(`✅ Usuário pastor criado: ${user.id} - ${user.email}`);

        // 2. Criar distrito
        const [district] = await db
          .insert(districts)
          .values({
            name: data.district?.name || `Distrito - ${invite.email}`,
            code: `DIST-${Date.now()}`,
            pastorId: user.id,
            description: data.district?.description || '',
          })
          .returning();

        logger.info(`✅ Distrito criado: ${district.id} - ${district.name}`);

        // 3. Atualizar usuário com district_id
        await db.update(users).set({ districtId: district.id }).where(eq(users.id, user.id));

        // 4. Criar igrejas
        const churchIds: Record<string, number> = {};
        let churchesCreated = 0;

        const churchesToCreate = data.churches || [];
        for (const church of churchesToCreate) {
          const [createdChurch] = await db
            .insert(churches)
            .values({
              name: church.name,
              code: `IGR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              address: church.address || '',
              districtId: district.id,
            })
            .returning();

          churchIds[church.name] = createdChurch.id;
          churchesCreated++;
          logger.info(`✅ Igreja criada: ${createdChurch.id} - ${createdChurch.name}`);
        }

        // 5. Importar membros (se houver)
        let membersImported = 0;
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

            // Calcular tempo de batismo em anos
            let tempoBatismoAnos: number | null = null;
            if (member.dataBatismo) {
              const batismoDate = new Date(member.dataBatismo);
              const now = new Date();
              tempoBatismoAnos = Math.floor(
                (now.getTime() - batismoDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
              );
              if (tempoBatismoAnos < 0) tempoBatismoAnos = 0;
            }

            // Verificar se há campos vazios importantes
            const camposObrigatorios = [
              member.cpf,
              member.telefone,
              member.endereco,
              member.dataNascimento,
            ];
            const camposVazios = camposObrigatorios.some(
              c => !c || c === '' || c === 'Sem informação'
            );

            // Criar membro com todos os dados do Excel
            await db.insert(users).values({
              name: member.nome,
              email:
                member.email || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}@temp.com`,
              password: await bcrypt.hash('changeme123', 10),
              role: 'member',
              church: member.igreja,
              districtId: district.id,
              status: 'pending',
              firstAccess: true,
              // Dados completos do Excel para cálculo de pontos
              phone: member.telefone || null,
              cpf: member.cpf || null,
              engajamento: member.engajamento || null,
              classificacao: member.classificacao || null,
              dizimistaType: member.dizimista || null,
              ofertanteType: member.ofertante || null,
              nomeUnidade: member.nomeUnidade || null,
              temLicao: member.temLicao || false,
              totalPresenca: member.totalPresenca || 0,
              comunhao: member.comunhao || 0,
              missao: member.missao || 0,
              estudoBiblico: member.estudoBiblico || 0,
              batizouAlguem: member.batizouAlguem || false,
              cpfValido: member.valid || false,
              tempoBatismoAnos: tempoBatismoAnos,
              camposVazios: camposVazios,
              // Dados adicionais
              birthDate: member.dataNascimento ? new Date(member.dataNascimento) : null,
              baptismDate: member.dataBatismo ? new Date(member.dataBatismo) : null,
              civilStatus: member.estadoCivil || null,
              occupation: member.profissao || null,
              education: member.escolaridade || null,
              address: member.endereco || null,
              previousReligion: member.religiaoAnterior || null,
              departamentosCargos: member.departamentosCargos || null,
            });
            membersImported++;
          }
          logger.info(`✅ ${membersImported} membros importados`);
        }

        // 5.1. Salvar credenciais do Dracma (se configurado)
        if (data.dracmaConfig?.enableAutomation) {
          const dracma = data.dracmaConfig;
          const n8nApiKey = crypto.randomBytes(32).toString('hex');

          logger.info(`Configurando credenciais Dracma para pastor ${user.id}`);

          const { sql } = await import('../neonConfig');

          await sql`
            INSERT INTO automation_config (key, value, user_id, district_id, encrypted, updated_at)
            VALUES
              ('n8n_api_key', ${n8nApiKey}, ${user.id}, ${district.id}, false, NOW()),
              ('dracma_username', ${dracma.dracmaUsername || ''}, ${user.id}, ${district.id}, false, NOW()),
              ('dracma_password', ${dracma.dracmaPassword || ''}, ${user.id}, ${district.id}, true, NOW()),
              ('ocr_space_api_key', ${dracma.ocrApiKey || ''}, ${user.id}, ${district.id}, false, NOW())
            ON CONFLICT (key, user_id)
            DO UPDATE SET
              value = EXCLUDED.value,
              district_id = EXCLUDED.district_id,
              updated_at = NOW()
          `;

          logger.info(`✅ Credenciais Dracma configuradas para pastor ${user.id}`);
        }

        // 5.2. Salvar configuração de Gamificação (se habilitado)
        if (data.gamificationConfig?.enableGamification) {
          const gamification = data.gamificationConfig;

          logger.info(`Configurando gamificação para distrito ${district.id}`);

          const { sql } = await import('../neonConfig');

          const targetAvg = gamification.targetAverage || 595;
          const adjustmentFactor = targetAvg / 595;

          const adjustedPointsConfig = {
            engajamento: {
              baixo: Math.round(200 * adjustmentFactor),
              medio: Math.round(400 * adjustmentFactor),
              alto: Math.round(600 * adjustmentFactor),
            },
            classificacao: {
              frequente: Math.round(300 * adjustmentFactor),
              naoFrequente: Math.round(150 * adjustmentFactor),
            },
            dizimista: {
              naoDizimista: 0,
              pontual: Math.round(100 * adjustmentFactor),
              sazonal: Math.round(200 * adjustmentFactor),
              recorrente: Math.round(300 * adjustmentFactor),
            },
            ofertante: {
              naoOfertante: 0,
              pontual: Math.round(60 * adjustmentFactor),
              sazonal: Math.round(120 * adjustmentFactor),
              recorrente: Math.round(180 * adjustmentFactor),
            },
            tempoBatismo: {
              doisAnos: Math.round(100 * adjustmentFactor),
              cincoAnos: Math.round(200 * adjustmentFactor),
              dezAnos: Math.round(400 * adjustmentFactor),
              vinteAnos: Math.round(600 * adjustmentFactor),
              maisVinte: Math.round(800 * adjustmentFactor),
            },
            cargos: {
              umCargo: Math.round(200 * adjustmentFactor),
              doisCargos: Math.round(400 * adjustmentFactor),
              tresOuMais: Math.round(600 * adjustmentFactor),
            },
            nomeUnidade: {
              comUnidade: Math.round(100 * adjustmentFactor),
            },
            temLicao: {
              comLicao: Math.round(120 * adjustmentFactor),
            },
            pontuacaoDinamica: {
              multiplicador: Math.round(25 * adjustmentFactor),
            },
            totalPresenca: {
              zeroATres: 0,
              quatroASete: Math.round(200 * adjustmentFactor),
              oitoATreze: Math.round(400 * adjustmentFactor),
            },
            escolaSabatina: {
              comunhao: Math.round(40 * adjustmentFactor),
              missao: Math.round(60 * adjustmentFactor),
              estudoBiblico: Math.round(20 * adjustmentFactor),
              batizouAlguem: Math.round(400 * adjustmentFactor),
              discipuladoPosBatismo: Math.round(80 * adjustmentFactor),
            },
            cpfValido: {
              valido: Math.round(100 * adjustmentFactor),
            },
            camposVaziosACMS: {
              semCamposVazios: Math.round(200 * adjustmentFactor),
            },
          };

          await sql`
            INSERT INTO system_settings (key, value, district_id, updated_at)
            VALUES (
              'points_config',
              ${JSON.stringify(adjustedPointsConfig)}::jsonb,
              ${district.id},
              NOW()
            )
            ON CONFLICT (key, district_id)
            DO UPDATE SET
              value = ${JSON.stringify(adjustedPointsConfig)}::jsonb,
              updated_at = NOW()
          `;

          logger.info(
            `✅ Configuração de gamificação salva para distrito ${district.id} (média: ${targetAvg})`
          );

          // Se calculateOnApproval está habilitado, recalcular pontos dos membros importados
          if (gamification.calculateOnApproval) {
            logger.info(`Recalculando pontos para membros do distrito ${district.id}...`);

            const districtUsers = await db
              .select()
              .from(users)
              .where(eq(users.districtId, district.id));

            for (const member of districtUsers) {
              if (member.role === 'pastor') continue; // Não calcular pontos para pastor

              let points = 0;

              // 1. ENGAJAMENTO
              const engajamento = (member.engajamento || '').toLowerCase();
              if (engajamento === 'alto') points += adjustedPointsConfig.engajamento.alto;
              else if (engajamento === 'medio' || engajamento === 'médio') {
                points += adjustedPointsConfig.engajamento.medio;
              } else points += adjustedPointsConfig.engajamento.baixo;

              // 2. CLASSIFICAÇÃO
              const classificacao = (member.classificacao || '').toLowerCase();
              if (classificacao === 'frequente') {
                points += adjustedPointsConfig.classificacao.frequente;
              } else points += adjustedPointsConfig.classificacao.naoFrequente;

              // 3. DIZIMISTA
              const dizimista = (member.dizimistaType || '').toLowerCase();
              if (dizimista.includes('recorrente')) {
                points += adjustedPointsConfig.dizimista.recorrente;
              } else if (dizimista.includes('sazonal')) {
                points += adjustedPointsConfig.dizimista.sazonal;
              } else if (dizimista.includes('pontual')) {
                points += adjustedPointsConfig.dizimista.pontual;
              }

              // 4. OFERTANTE
              const ofertante = (member.ofertanteType || '').toLowerCase();
              if (ofertante.includes('recorrente')) {
                points += adjustedPointsConfig.ofertante.recorrente;
              } else if (ofertante.includes('sazonal')) {
                points += adjustedPointsConfig.ofertante.sazonal;
              } else if (ofertante.includes('pontual')) {
                points += adjustedPointsConfig.ofertante.pontual;
              }

              // 5. TEMPO DE BATISMO
              const tempoBatismo = member.tempoBatismoAnos || 0;
              if (tempoBatismo >= 30) points += adjustedPointsConfig.tempoBatismo.maisVinte;
              else if (tempoBatismo >= 20) points += adjustedPointsConfig.tempoBatismo.vinteAnos;
              else if (tempoBatismo >= 10) points += adjustedPointsConfig.tempoBatismo.dezAnos;
              else if (tempoBatismo >= 5) points += adjustedPointsConfig.tempoBatismo.cincoAnos;
              else if (tempoBatismo >= 2) points += adjustedPointsConfig.tempoBatismo.doisAnos;

              // 6. CARGOS
              const departamentosCargos = (member.departamentosCargos || '').trim();
              if (departamentosCargos.length > 0) {
                const numCargos = departamentosCargos.split(';').filter(c => c.trim()).length;
                if (numCargos >= 3) points += adjustedPointsConfig.cargos.tresOuMais;
                else if (numCargos === 2) points += adjustedPointsConfig.cargos.doisCargos;
                else if (numCargos === 1) points += adjustedPointsConfig.cargos.umCargo;
              }

              // 7. NOME DA UNIDADE
              const nomeUnidade = (member.nomeUnidade || '').trim();
              if (nomeUnidade.length > 0) points += adjustedPointsConfig.nomeUnidade.comUnidade;

              // 8. TEM LIÇÃO
              if (member.temLicao === true) points += adjustedPointsConfig.temLicao.comLicao;

              // 9. TOTAL DE PRESENÇA
              const totalPresenca = member.totalPresenca || 0;
              if (totalPresenca >= 8) points += adjustedPointsConfig.totalPresenca.oitoATreze;
              else if (totalPresenca >= 4) points += adjustedPointsConfig.totalPresenca.quatroASete;

              // 10. COMUNHÃO (pontuação dinâmica)
              const comunhao = member.comunhao || 0;
              points += comunhao * adjustedPointsConfig.escolaSabatina.comunhao;

              // 11. MISSÃO (pontuação dinâmica)
              const missao = member.missao || 0;
              points += missao * adjustedPointsConfig.escolaSabatina.missao;

              // 12. ESTUDO BÍBLICO (pontuação dinâmica)
              const estudoBiblico = member.estudoBiblico || 0;
              points += estudoBiblico * adjustedPointsConfig.escolaSabatina.estudoBiblico;

              // 13. BATIZOU ALGUÉM
              if (member.batizouAlguem === true) {
                points += adjustedPointsConfig.escolaSabatina.batizouAlguem;
              }

              // 14. CPF VÁLIDO
              if (member.cpfValido === true) points += adjustedPointsConfig.cpfValido.valido;

              // 15. CAMPOS VAZIOS (se NÃO tem campos vazios, ganha pontos)
              if (member.camposVazios === false) {
                points += adjustedPointsConfig.camposVaziosACMS.semCamposVazios;
              }

              // Atualizar pontos do membro
              const roundedPoints = Math.round(points);
              await db.update(users).set({ points: roundedPoints }).where(eq(users.id, member.id));
            }

            logger.info(
              `✅ Pontos calculados para ${districtUsers.length} membros do distrito ${district.id}`
            );
          }
        }

        // 6. Atualizar convite como aprovado
        await db
          .update(pastorInvites)
          .set({
            status: 'approved',
            submittedAt: new Date(),
            reviewedAt: new Date(),
            onboardingData,
            userId: user.id,
            districtId: district.id,
            updatedAt: new Date(),
          })
          .where(eq(pastorInvites.id, invite.id));

        logger.info(
          `🎉 Onboarding completo e aprovado automaticamente: ${invite.email} -> user ${user.id}, district ${district.id}`
        );

        sendSuccess(res, {
          success: true,
          message: 'Cadastro concluído com sucesso! Você já pode fazer login.',
          userId: user.id,
          districtId: district.id,
          churchesCreated,
          membersImported,
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

      sendSuccess(res, { invites: invitesList });
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

      sendSuccess(res, { invite });
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

          // Calcular tempo de batismo em anos
          let tempoBatismoAnos: number | null = null;
          if (member.dataBatismo) {
            const batismoDate = new Date(member.dataBatismo);
            const now = new Date();
            tempoBatismoAnos = Math.floor(
              (now.getTime() - batismoDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            );
            if (tempoBatismoAnos < 0) tempoBatismoAnos = 0;
          }

          // Verificar se há campos vazios importantes
          const camposObrigatorios = [
            member.cpf,
            member.telefone,
            member.endereco,
            member.dataNascimento,
          ];
          const camposVazios = camposObrigatorios.some(
            c => !c || c === '' || c === 'Sem informação'
          );

          // Criar membro com todos os dados do Excel
          await db.insert(users).values({
            name: member.nome,
            email:
              member.email || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}@temp.com`,
            password: await bcrypt.hash('changeme123', 10),
            role: 'member',
            church: member.igreja,
            districtId: district.id,
            status: 'pending',
            firstAccess: true,
            // Dados completos do Excel para cálculo de pontos
            phone: member.telefone || null,
            cpf: member.cpf || null,
            engajamento: member.engajamento || null,
            classificacao: member.classificacao || null,
            dizimistaType: member.dizimista || null,
            ofertanteType: member.ofertante || null,
            nomeUnidade: member.nomeUnidade || null,
            temLicao: member.temLicao || false,
            totalPresenca: member.totalPresenca || 0,
            comunhao: member.comunhao || 0,
            missao: member.missao || 0,
            estudoBiblico: member.estudoBiblico || 0,
            batizouAlguem: member.batizouAlguem || false,
            cpfValido: member.valid || false,
            tempoBatismoAnos: tempoBatismoAnos,
            camposVazios: camposVazios,
            // Dados adicionais
            birthDate: member.dataNascimento ? new Date(member.dataNascimento) : null,
            baptismDate: member.dataBatismo ? new Date(member.dataBatismo) : null,
            civilStatus: member.estadoCivil || null,
            occupation: member.profissao || null,
            education: member.escolaridade || null,
            address: member.endereco || null,
            previousReligion: member.religiaoAnterior || null,
            departamentosCargos: member.departamentosCargos || null,
          });
        }
      }

      // 5.1. Salvar credenciais do Dracma (se configurado)
      if (data.dracmaConfig?.enableAutomation) {
        const dracma = data.dracmaConfig;

        // Gerar n8n API key
        const n8nApiKey = crypto.randomBytes(32).toString('hex');

        logger.info(`Configurando credenciais Dracma para pastor ${user.id}`);

        // Usar raw SQL para UPSERT (INSERT ... ON CONFLICT)
        const { sql } = await import('../neonConfig');

        await sql`
          INSERT INTO automation_config (key, value, user_id, district_id, encrypted, updated_at)
          VALUES
            ('n8n_api_key', ${n8nApiKey}, ${user.id}, ${district.id}, false, NOW()),
            ('dracma_username', ${dracma.dracmaUsername || ''}, ${user.id}, ${district.id}, false, NOW()),
            ('dracma_password', ${dracma.dracmaPassword || ''}, ${user.id}, ${district.id}, true, NOW()),
            ('ocr_space_api_key', ${dracma.ocrApiKey || ''}, ${user.id}, ${district.id}, false, NOW())
          ON CONFLICT (key, user_id)
          DO UPDATE SET
            value = EXCLUDED.value,
            district_id = EXCLUDED.district_id,
            updated_at = NOW()
        `;

        logger.info(
          `✅ Credenciais Dracma configuradas para pastor ${user.id} (distrito ${district.id})`
        );
      }

      // 5.2. Salvar configuração de Gamificação (se habilitado)
      if (data.gamificationConfig?.enableGamification) {
        const gamification = data.gamificationConfig;

        logger.info(`Configurando gamificação para distrito ${district.id}`);

        // Usar raw SQL para UPSERT
        const { sql } = await import('../neonConfig');

        // Salvar configuração de pontos do distrito com a média desejada
        // Primeiro, obter a configuração padrão e ajustar com base na média desejada
        const targetAvg = gamification.targetAverage || 595;

        // Calcular fator de ajuste baseado na média padrão (595)
        const adjustmentFactor = targetAvg / 595;

        // Configuração de pontos ajustada
        const adjustedPointsConfig = {
          engajamento: {
            baixo: Math.round(200 * adjustmentFactor),
            medio: Math.round(400 * adjustmentFactor),
            alto: Math.round(600 * adjustmentFactor),
          },
          classificacao: {
            frequente: Math.round(300 * adjustmentFactor),
            naoFrequente: Math.round(150 * adjustmentFactor),
          },
          dizimista: {
            naoDizimista: 0,
            pontual: Math.round(100 * adjustmentFactor),
            sazonal: Math.round(200 * adjustmentFactor),
            recorrente: Math.round(300 * adjustmentFactor),
          },
          ofertante: {
            naoOfertante: 0,
            pontual: Math.round(60 * adjustmentFactor),
            sazonal: Math.round(120 * adjustmentFactor),
            recorrente: Math.round(180 * adjustmentFactor),
          },
          tempoBatismo: {
            doisAnos: Math.round(100 * adjustmentFactor),
            cincoAnos: Math.round(200 * adjustmentFactor),
            dezAnos: Math.round(400 * adjustmentFactor),
            vinteAnos: Math.round(600 * adjustmentFactor),
            maisVinte: Math.round(800 * adjustmentFactor),
          },
          cargos: {
            umCargo: Math.round(200 * adjustmentFactor),
            doisCargos: Math.round(400 * adjustmentFactor),
            tresOuMais: Math.round(600 * adjustmentFactor),
          },
          nomeUnidade: {
            comUnidade: Math.round(100 * adjustmentFactor),
          },
          temLicao: {
            comLicao: Math.round(120 * adjustmentFactor),
          },
          pontuacaoDinamica: {
            multiplicador: Math.round(25 * adjustmentFactor),
          },
          totalPresenca: {
            zeroATres: 0,
            quatroASete: Math.round(200 * adjustmentFactor),
            oitoATreze: Math.round(400 * adjustmentFactor),
          },
          escolaSabatina: {
            comunhao: Math.round(40 * adjustmentFactor),
            missao: Math.round(60 * adjustmentFactor),
            estudoBiblico: Math.round(20 * adjustmentFactor),
            batizouAlguem: Math.round(400 * adjustmentFactor),
            discipuladoPosBatismo: Math.round(80 * adjustmentFactor),
          },
          cpfValido: {
            valido: Math.round(100 * adjustmentFactor),
          },
          camposVaziosACMS: {
            semCamposVazios: Math.round(200 * adjustmentFactor),
          },
        };

        // Salvar configuração de pontos no sistema_settings por distrito
        await sql`
          INSERT INTO system_settings (key, value, district_id, updated_at)
          VALUES (
            'points_config',
            ${JSON.stringify(adjustedPointsConfig)}::jsonb,
            ${district.id},
            NOW()
          )
          ON CONFLICT (key, district_id)
          DO UPDATE SET
            value = ${JSON.stringify(adjustedPointsConfig)}::jsonb,
            updated_at = NOW()
        `;

        logger.info(
          `✅ Configuração de gamificação salva para distrito ${district.id} (média: ${targetAvg})`
        );

        // Se calculateOnApproval está habilitado, recalcular pontos dos membros importados
        if (gamification.calculateOnApproval) {
          logger.info(`Recalculando pontos para membros do distrito ${district.id}...`);

          // Buscar membros do distrito e calcular pontos básicos
          const districtUsers = await db
            .select()
            .from(users)
            .where(eq(users.districtId, district.id));

          for (const member of districtUsers) {
            if (member.role === 'pastor') continue; // Não calcular pontos para pastor

            let points = 0;

            // 1. ENGAJAMENTO
            const engajamento = (member.engajamento || '').toLowerCase();
            if (engajamento === 'alto') points += adjustedPointsConfig.engajamento.alto;
            else if (engajamento === 'medio' || engajamento === 'médio') {
              points += adjustedPointsConfig.engajamento.medio;
            } else points += adjustedPointsConfig.engajamento.baixo;

            // 2. CLASSIFICAÇÃO
            const classificacao = (member.classificacao || '').toLowerCase();
            if (classificacao === 'frequente') {
              points += adjustedPointsConfig.classificacao.frequente;
            } else points += adjustedPointsConfig.classificacao.naoFrequente;

            // 3. DIZIMISTA
            const dizimista = (member.dizimistaType || '').toLowerCase();
            if (dizimista.includes('recorrente')) {
              points += adjustedPointsConfig.dizimista.recorrente;
            } else if (dizimista.includes('sazonal')) {
              points += adjustedPointsConfig.dizimista.sazonal;
            } else if (dizimista.includes('pontual')) {
              points += adjustedPointsConfig.dizimista.pontual;
            }

            // 4. OFERTANTE
            const ofertante = (member.ofertanteType || '').toLowerCase();
            if (ofertante.includes('recorrente')) {
              points += adjustedPointsConfig.ofertante.recorrente;
            } else if (ofertante.includes('sazonal')) {
              points += adjustedPointsConfig.ofertante.sazonal;
            } else if (ofertante.includes('pontual')) {
              points += adjustedPointsConfig.ofertante.pontual;
            }

            // 5. TEMPO DE BATISMO
            const tempoBatismo = member.tempoBatismoAnos || 0;
            if (tempoBatismo >= 30) points += adjustedPointsConfig.tempoBatismo.maisVinte;
            else if (tempoBatismo >= 20) points += adjustedPointsConfig.tempoBatismo.vinteAnos;
            else if (tempoBatismo >= 10) points += adjustedPointsConfig.tempoBatismo.dezAnos;
            else if (tempoBatismo >= 5) points += adjustedPointsConfig.tempoBatismo.cincoAnos;
            else if (tempoBatismo >= 2) points += adjustedPointsConfig.tempoBatismo.doisAnos;

            // 6. CARGOS
            const departamentosCargos = (member.departamentosCargos || '').trim();
            if (departamentosCargos.length > 0) {
              const numCargos = departamentosCargos.split(';').filter(c => c.trim()).length;
              if (numCargos >= 3) points += adjustedPointsConfig.cargos.tresOuMais;
              else if (numCargos === 2) points += adjustedPointsConfig.cargos.doisCargos;
              else if (numCargos === 1) points += adjustedPointsConfig.cargos.umCargo;
            }

            // 7. NOME DA UNIDADE
            const nomeUnidade = (member.nomeUnidade || '').trim();
            if (nomeUnidade.length > 0) points += adjustedPointsConfig.nomeUnidade.comUnidade;

            // 8. TEM LIÇÃO
            if (member.temLicao === true) points += adjustedPointsConfig.temLicao.comLicao;

            // 9. TOTAL DE PRESENÇA
            const totalPresenca = member.totalPresenca || 0;
            if (totalPresenca >= 8) points += adjustedPointsConfig.totalPresenca.oitoATreze;
            else if (totalPresenca >= 4) points += adjustedPointsConfig.totalPresenca.quatroASete;

            // 10. COMUNHÃO (pontuação dinâmica)
            const comunhao = member.comunhao || 0;
            points += comunhao * adjustedPointsConfig.escolaSabatina.comunhao;

            // 11. MISSÃO (pontuação dinâmica)
            const missao = member.missao || 0;
            points += missao * adjustedPointsConfig.escolaSabatina.missao;

            // 12. ESTUDO BÍBLICO (pontuação dinâmica)
            const estudoBiblico = member.estudoBiblico || 0;
            points += estudoBiblico * adjustedPointsConfig.escolaSabatina.estudoBiblico;

            // 13. BATIZOU ALGUÉM
            if (member.batizouAlguem === true) {
              points += adjustedPointsConfig.escolaSabatina.batizouAlguem;
            }

            // 14. CPF VÁLIDO
            if (member.cpfValido === true) points += adjustedPointsConfig.cpfValido.valido;

            // 15. CAMPOS VAZIOS (se NÃO tem campos vazios, ganha pontos)
            if (member.camposVazios === false) {
              points += adjustedPointsConfig.camposVaziosACMS.semCamposVazios;
            }

            // Atualizar pontos do membro
            const roundedPoints = Math.round(points);
            await db.update(users).set({ points: roundedPoints }).where(eq(users.id, member.id));
          }

          logger.info(
            `✅ Pontos calculados para ${districtUsers.length} membros do distrito ${district.id}`
          );
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

      sendSuccess(res, response);
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
