/**
 * Invite Review Routes - Superadmin review endpoints
 *
 * - POST /api/invites/:id/approve (approve invite)
 * - POST /api/invites/:id/reject (reject invite)
 */

import { type Express, type Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../neonConfig';
import { pastorInvites, users, districts, churches } from '../../schema';
import { requireAuth } from '../../middleware';
import { type AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';
import { BCRYPT_SALT_ROUNDS, DEFAULT_RESET_PASSWORD } from '../../config/security';
import { asyncHandler } from '../../utils';
import {
  type OnboardingData,
  type ChurchValidation,
  type RejectInviteDTO,
  type ApproveInviteResponse,
} from '../../types/pastor-invite.types';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export const inviteReviewRoutes = (app: Express): void => {
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
            password: await bcrypt.hash(DEFAULT_RESET_PASSWORD, BCRYPT_SALT_ROUNDS),
            role: 'member',
            church: member.igreja,
            districtId: district.id,
            status: 'pending',
            firstAccess: true,
            // Dados completos do Excel para cálculo de pontos
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
            tempoBatismoAnos,
            camposVazios,
            // Dados adicionais
            birthDate: member.dataNascimento || null,
            baptismDate: member.dataBatismo || null,
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
        const { sql } = await import('../../neonConfig');

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
        const { sql } = await import('../../neonConfig');

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
