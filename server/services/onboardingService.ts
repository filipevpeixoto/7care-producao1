/**
 * Onboarding Service - Shared business logic for pastor onboarding approval
 *
 * Extracted from onboardingRoutes.ts and inviteReviewRoutes.ts to eliminate
 * duplicated code for the approval flow (creating user, district, churches,
 * importing members, configuring gamification, calculating points).
 */

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../neonConfig';
import { users, districts, churches } from '../schema';
import { logger } from '../utils/logger';
import { BCRYPT_SALT_ROUNDS, DEFAULT_RESET_PASSWORD } from '../config/security';
import {
  type OnboardingData,
  type ChurchData,
  type ChurchValidation,
  type GamificationConfigData,
  type ExcelData,
} from '../types/pastor-invite.types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreatePastorUserParams {
  name: string;
  email: string;
  passwordHash: string;
}

export interface CreateDistrictParams {
  name: string;
  description?: string;
  pastorId: number;
}

export interface OnboardingResult {
  userId: number;
  districtId: number;
  churchesCreated: number;
  membersImported: number;
}

// ─── Helper: Build Adjusted Points Config ────────────────────────────────────

function buildAdjustedPointsConfig(targetAvg: number) {
  const adjustmentFactor = targetAvg / 595;

  return {
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
}

type AdjustedPointsConfig = ReturnType<typeof buildAdjustedPointsConfig>;

// ─── Helper: Calculate Points For a Single Member ────────────────────────────

function calculateMemberPoints(
  member: Record<string, unknown>,
  config: AdjustedPointsConfig
): number {
  let points = 0;

  // 1. ENGAJAMENTO
  const engajamento = (String(member.engajamento || '')).toLowerCase();
  if (engajamento === 'alto') points += config.engajamento.alto;
  else if (engajamento === 'medio' || engajamento === 'médio') {
    points += config.engajamento.medio;
  } else points += config.engajamento.baixo;

  // 2. CLASSIFICAÇÃO
  const classificacao = (String(member.classificacao || '')).toLowerCase();
  if (classificacao === 'frequente') {
    points += config.classificacao.frequente;
  } else points += config.classificacao.naoFrequente;

  // 3. DIZIMISTA
  const dizimista = (String(member.dizimistaType || '')).toLowerCase();
  if (dizimista.includes('recorrente')) {
    points += config.dizimista.recorrente;
  } else if (dizimista.includes('sazonal')) {
    points += config.dizimista.sazonal;
  } else if (dizimista.includes('pontual')) {
    points += config.dizimista.pontual;
  }

  // 4. OFERTANTE
  const ofertante = (String(member.ofertanteType || '')).toLowerCase();
  if (ofertante.includes('recorrente')) {
    points += config.ofertante.recorrente;
  } else if (ofertante.includes('sazonal')) {
    points += config.ofertante.sazonal;
  } else if (ofertante.includes('pontual')) {
    points += config.ofertante.pontual;
  }

  // 5. TEMPO DE BATISMO
  const tempoBatismo = Number(member.tempoBatismoAnos || 0);
  if (tempoBatismo >= 30) points += config.tempoBatismo.maisVinte;
  else if (tempoBatismo >= 20) points += config.tempoBatismo.vinteAnos;
  else if (tempoBatismo >= 10) points += config.tempoBatismo.dezAnos;
  else if (tempoBatismo >= 5) points += config.tempoBatismo.cincoAnos;
  else if (tempoBatismo >= 2) points += config.tempoBatismo.doisAnos;

  // 6. CARGOS
  const departamentosCargos = (String(member.departamentosCargos || '')).trim();
  if (departamentosCargos.length > 0) {
    const numCargos = departamentosCargos.split(';').filter((c: string) => c.trim()).length;
    if (numCargos >= 3) points += config.cargos.tresOuMais;
    else if (numCargos === 2) points += config.cargos.doisCargos;
    else if (numCargos === 1) points += config.cargos.umCargo;
  }

  // 7. NOME DA UNIDADE
  const nomeUnidade = (String(member.nomeUnidade || '')).trim();
  if (nomeUnidade.length > 0) points += config.nomeUnidade.comUnidade;

  // 8. TEM LIÇÃO
  if (member.temLicao === true) points += config.temLicao.comLicao;

  // 9. TOTAL DE PRESENÇA
  const totalPresenca = Number(member.totalPresenca || 0);
  if (totalPresenca >= 8) points += config.totalPresenca.oitoATreze;
  else if (totalPresenca >= 4) points += config.totalPresenca.quatroASete;

  // 10. COMUNHÃO (pontuação dinâmica)
  const comunhao = Number(member.comunhao || 0);
  points += comunhao * config.escolaSabatina.comunhao;

  // 11. MISSÃO (pontuação dinâmica)
  const missao = Number(member.missao || 0);
  points += missao * config.escolaSabatina.missao;

  // 12. ESTUDO BÍBLICO (pontuação dinâmica)
  const estudoBiblico = Number(member.estudoBiblico || 0);
  points += estudoBiblico * config.escolaSabatina.estudoBiblico;

  // 13. BATIZOU ALGUÉM
  if (member.batizouAlguem === true) {
    points += config.escolaSabatina.batizouAlguem;
  }

  // 14. CPF VÁLIDO
  if (member.cpfValido === true) points += config.cpfValido.valido;

  // 15. CAMPOS VAZIOS (se NÃO tem campos vazios, ganha pontos)
  if (member.camposVazios === false) {
    points += config.camposVaziosACMS.semCamposVazios;
  }

  return Math.round(points);
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Create the pastor user account.
 */
export async function createPastorUser(params: CreatePastorUserParams) {
  const [user] = await db
    .insert(users)
    .values({
      name: params.name,
      email: params.email,
      password: params.passwordHash,
      role: 'pastor',
      church: '',
      status: 'approved',
    })
    .returning();

  logger.info(`✅ Usuário pastor criado: ${user.id} - ${user.email}`);
  return user;
}

/**
 * Create the district and link it to the pastor user.
 */
export async function createDistrict(params: CreateDistrictParams) {
  const [district] = await db
    .insert(districts)
    .values({
      name: params.name,
      code: `DIST-${Date.now()}`,
      pastorId: params.pastorId,
      description: params.description || '',
    })
    .returning();

  // Update user with district_id
  await db.update(users).set({ districtId: district.id }).where(eq(users.id, params.pastorId));

  logger.info(`✅ Distrito criado: ${district.id} - ${district.name}`);
  return district;
}

/**
 * Create churches from the onboarding data.
 * Returns a map of church name → church id.
 */
export async function createChurches(
  churchList: ChurchData[],
  districtId: number
): Promise<{ churchIds: Record<string, number>; churchesCreated: number }> {
  const churchIds: Record<string, number> = {};
  let churchesCreated = 0;

  for (const church of churchList) {
    const [createdChurch] = await db
      .insert(churches)
      .values({
        name: church.name,
        code: `IGR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        address: church.address || '',
        districtId,
      })
      .returning();

    churchIds[church.name] = createdChurch.id;
    churchesCreated++;
    logger.info(`✅ Igreja criada: ${createdChurch.id} - ${createdChurch.name}`);
  }

  return { churchIds, churchesCreated };
}

/**
 * Import members from Excel data, respecting church validation actions.
 * Mutates `churchIds` when creating new churches via `create_new` action.
 */
export async function importMembers(
  excelData: ExcelData,
  churchValidation: ChurchValidation[],
  districtId: number,
  churchIds: Record<string, number>
): Promise<number> {
  let membersImported = 0;

  for (const member of excelData.data) {
    const foundValidation: ChurchValidation | undefined = churchValidation.find(
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
            districtId,
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
      districtId,
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
    membersImported++;
  }

  if (membersImported > 0) {
    logger.info(`✅ ${membersImported} membros importados`);
  }

  return membersImported;
}

/**
 * Save gamification configuration for the district and optionally recalculate points.
 */
export async function configureGamification(
  gamificationConfig: GamificationConfigData,
  districtId: number
): Promise<void> {
  if (!gamificationConfig.enableGamification) return;

  logger.info(`Configurando gamificação para distrito ${districtId}`);

  const { sql } = await import('../neonConfig');

  const targetAvg = gamificationConfig.targetAverage || 595;
  const adjustedPointsConfig = buildAdjustedPointsConfig(targetAvg);

  // Salvar configuração de pontos no system_settings por distrito
  await sql`
    INSERT INTO system_settings (key, value, district_id, updated_at)
    VALUES (
      'points_config',
      ${JSON.stringify(adjustedPointsConfig)}::jsonb,
      ${districtId},
      NOW()
    )
    ON CONFLICT (key, district_id)
    DO UPDATE SET
      value = ${JSON.stringify(adjustedPointsConfig)}::jsonb,
      updated_at = NOW()
  `;

  logger.info(
    `✅ Configuração de gamificação salva para distrito ${districtId} (média: ${targetAvg})`
  );

  // Se calculateOnApproval está habilitado, recalcular pontos dos membros importados
  if (gamificationConfig.calculateOnApproval) {
    logger.info(`Recalculando pontos para membros do distrito ${districtId}...`);

    const districtUsers = await db
      .select()
      .from(users)
      .where(eq(users.districtId, districtId));

    for (const member of districtUsers) {
      if (member.role === 'pastor') continue; // Não calcular pontos para pastor

      const roundedPoints = calculateMemberPoints(
        member as unknown as Record<string, unknown>,
        adjustedPointsConfig
      );
      await db.update(users).set({ points: roundedPoints }).where(eq(users.id, member.id));
    }

    logger.info(
      `✅ Pontos calculados para ${districtUsers.length} membros do distrito ${districtId}`
    );
  }
}

/**
 * Orchestrate the full onboarding approval flow.
 *
 * Used by both:
 * - onboardingRoutes.ts (auto-approval on pastor submit)
 * - inviteReviewRoutes.ts (superadmin manual approval)
 */
export async function processOnboarding(data: OnboardingData): Promise<OnboardingResult> {
  // 1. Create pastor user
  const user = await createPastorUser({
    name: data.personal.name,
    email: data.personal.email,
    passwordHash: data.passwordHash!,
  });

  // 2. Create district
  const district = await createDistrict({
    name: data.district.name,
    description: data.district.description,
    pastorId: user.id,
  });

  // 3. Create churches
  const { churchIds, churchesCreated } = await createChurches(
    data.churches || [],
    district.id
  );

  // 4. Import members (if any)
  let membersImported = 0;
  if (data.excelData && data.churchValidation) {
    membersImported = await importMembers(
      data.excelData,
      data.churchValidation,
      district.id,
      churchIds
    );
  }

  // 5. Configure Gamification (if enabled)
  if (data.gamificationConfig) {
    await configureGamification(data.gamificationConfig, district.id);
  }

  return {
    userId: user.id,
    districtId: district.id,
    churchesCreated,
    membersImported,
  };
}
