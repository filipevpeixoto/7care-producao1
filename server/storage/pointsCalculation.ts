import type { User } from '../../shared/schema';
import {
  getRequiredPointsConfig,
  type PointsCalculationResult,
  type PointsConfiguration,
  type PointsRecalculationResult,
} from '../types/storage';
import type { db as dbType } from '../neonConfig';
import type { schema as schemaType } from '../schema';
import type { eq as eqType } from 'drizzle-orm';
import type { logger as loggerType } from '../utils/logger';
import type { isSuperAdmin as isSuperAdminType } from '../utils/permissions';

type PointsCalculationDeps = {
  db: typeof dbType;
  schema: typeof schemaType;
  eq: typeof eqType;
  logger: typeof loggerType;
  isSuperAdmin: typeof isSuperAdminType;
  toPermissionUser: (user: {
    id?: number;
    role?: string;
    email?: string;
    districtId?: number | null;
    church?: string | null;
  }) => Partial<User>;
  getPointsConfigurationByDistrict: (districtId: number | null) => Promise<PointsConfiguration>;
  getPointsConfiguration: () => Promise<PointsConfiguration>;
  getAllUsers: () => Promise<User[]>;
};

export const calculateUserPoints = async (
  deps: PointsCalculationDeps,
  userId: number
): Promise<PointsCalculationResult> => {
  try {
    const userResult = await deps.db
      .select()
      .from(deps.schema.users)
      .where(deps.eq(deps.schema.users.id, userId))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return { success: false, message: 'Usuário não encontrado' };
    }

    const userData = userResult[0];

    if (!userData) {
      deps.logger.warn('Usuário não encontrado no banco de dados', { userId });
      return { success: false, message: 'Usuário não encontrado' };
    }

    if (deps.isSuperAdmin(deps.toPermissionUser(userData))) {
      return { success: true, points: 0, breakdown: {}, message: 'Admin não possui pontos' };
    }

    let userDistrictId: number | null = userData.districtId || null;

    if (!userDistrictId && userData.churchCode) {
      const churchResult = await deps.db
        .select({ districtId: deps.schema.churches.districtId })
        .from(deps.schema.churches)
        .where(deps.eq(deps.schema.churches.code, userData.churchCode))
        .limit(1);

      if (churchResult && churchResult.length > 0) {
        userDistrictId = churchResult[0].districtId;
      }
    }

    const rawConfig = await deps.getPointsConfigurationByDistrict(userDistrictId);
    const pointsConfig = getRequiredPointsConfig(rawConfig);

    let extraData: Record<string, unknown> = {};
    if (typeof userData.extraData === 'string') {
      try {
        extraData = JSON.parse(userData.extraData);
      } catch (error) {
        deps.logger.warn('Erro ao parsear extraData', { userId, error });
        extraData = {};
      }
    } else if (userData.extraData && typeof userData.extraData === 'object') {
      extraData = userData.extraData as Record<string, unknown>;
    }

    let totalPoints = 0;
    const pointsBreakdown: Record<string, number> = {};

    const engajamentoValue = userData.engajamento || extraData?.engajamento;
    if (engajamentoValue) {
      const engajamento = String(engajamentoValue).toLowerCase();
      if (engajamento.includes('baixo')) {
        pointsBreakdown.engajamento = pointsConfig.engajamento.baixo;
        totalPoints += pointsConfig.engajamento.baixo;
      } else if (engajamento.includes('médio') || engajamento.includes('medio')) {
        pointsBreakdown.engajamento = pointsConfig.engajamento.medio;
        totalPoints += pointsConfig.engajamento.medio;
      } else if (engajamento.includes('alto')) {
        pointsBreakdown.engajamento = pointsConfig.engajamento.alto;
        totalPoints += pointsConfig.engajamento.alto;
      }
    }

    const classificacaoValue = userData.classificacao || extraData?.classificacao;
    if (classificacaoValue) {
      const classificacao = String(classificacaoValue).toLowerCase();
      if (classificacao.includes('frequente') && !classificacao.includes('não')) {
        pointsBreakdown.classificacao = pointsConfig.classificacao.frequente;
        totalPoints += pointsConfig.classificacao.frequente;
      } else {
        pointsBreakdown.classificacao = pointsConfig.classificacao.naoFrequente;
        totalPoints += pointsConfig.classificacao.naoFrequente;
      }
    }

    const dizimistaValue = userData.dizimistaType || extraData?.dizimistaType;
    if (dizimistaValue) {
      const dizimista = String(dizimistaValue).toLowerCase();
      if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
        pointsBreakdown.dizimista = pointsConfig.dizimista.naoDizimista;
        totalPoints += pointsConfig.dizimista.naoDizimista;
      } else if (dizimista.includes('pontual')) {
        pointsBreakdown.dizimista = pointsConfig.dizimista.pontual;
        totalPoints += pointsConfig.dizimista.pontual;
      } else if (dizimista.includes('sazonal')) {
        pointsBreakdown.dizimista = pointsConfig.dizimista.sazonal;
        totalPoints += pointsConfig.dizimista.sazonal;
      } else if (dizimista.includes('recorrente')) {
        pointsBreakdown.dizimista = pointsConfig.dizimista.recorrente;
        totalPoints += pointsConfig.dizimista.recorrente;
      }
    }

    const ofertanteValue = userData.ofertanteType || extraData?.ofertanteType;
    if (ofertanteValue) {
      const ofertante = String(ofertanteValue).toLowerCase();
      if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
        pointsBreakdown.ofertante = pointsConfig.ofertante.naoOfertante;
        totalPoints += pointsConfig.ofertante.naoOfertante;
      } else if (ofertante.includes('pontual')) {
        pointsBreakdown.ofertante = pointsConfig.ofertante.pontual;
        totalPoints += pointsConfig.ofertante.pontual;
      } else if (ofertante.includes('sazonal')) {
        pointsBreakdown.ofertante = pointsConfig.ofertante.sazonal;
        totalPoints += pointsConfig.ofertante.sazonal;
      } else if (ofertante.includes('recorrente')) {
        pointsBreakdown.ofertante = pointsConfig.ofertante.recorrente;
        totalPoints += pointsConfig.ofertante.recorrente;
      }
    }

    const tempoBatismoValue = userData.tempoBatismoAnos || extraData?.tempoBatismoAnos;
    if (tempoBatismoValue && typeof tempoBatismoValue === 'number' && tempoBatismoValue > 0) {
      const tempo = tempoBatismoValue;
      if (tempo >= 2 && tempo < 5) {
        pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.doisAnos;
        totalPoints += pointsConfig.tempoBatismo.doisAnos;
      } else if (tempo >= 5 && tempo < 10) {
        pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.cincoAnos;
        totalPoints += pointsConfig.tempoBatismo.cincoAnos;
      } else if (tempo >= 10 && tempo < 20) {
        pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.dezAnos;
        totalPoints += pointsConfig.tempoBatismo.dezAnos;
      } else if (tempo >= 20 && tempo < 30) {
        pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.vinteAnos;
        totalPoints += pointsConfig.tempoBatismo.vinteAnos;
      } else if (tempo >= 30) {
        pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.maisVinte;
        totalPoints += pointsConfig.tempoBatismo.maisVinte;
      }
    }

    const departamentosCargos = String(
      userData.departamentosCargos || extraData?.departamentosCargos || ''
    ).trim();
    if (departamentosCargos && departamentosCargos.length > 0) {
      const numCargos = departamentosCargos.split(';').filter((c) => c.trim()).length;
      if (numCargos === 1) {
        pointsBreakdown.cargos = pointsConfig.cargos.umCargo;
        totalPoints += pointsConfig.cargos.umCargo;
      } else if (numCargos === 2) {
        pointsBreakdown.cargos = pointsConfig.cargos.doisCargos;
        totalPoints += pointsConfig.cargos.doisCargos;
      } else if (numCargos >= 3) {
        pointsBreakdown.cargos = pointsConfig.cargos.tresOuMais;
        totalPoints += pointsConfig.cargos.tresOuMais;
      }
    }

    const nomeUnidade = String(userData.nomeUnidade || extraData?.nomeUnidade || '').trim();
    if (nomeUnidade && nomeUnidade.length > 0) {
      pointsBreakdown.nomeUnidade = pointsConfig.nomeUnidade.comUnidade;
      totalPoints += pointsConfig.nomeUnidade.comUnidade;
    }

    const temLicaoValue = userData.temLicao ?? extraData?.temLicao;
    if (temLicaoValue === true || temLicaoValue === 'true' || temLicaoValue === 1) {
      pointsBreakdown.temLicao = pointsConfig.temLicao.comLicao;
      totalPoints += pointsConfig.temLicao.comLicao;
    }

    const totalPresencaValue = userData.totalPresenca ?? extraData?.totalPresenca;
    if (totalPresencaValue !== undefined && totalPresencaValue !== null) {
      const presenca = Number(totalPresencaValue);
      if (!isNaN(presenca)) {
        if (presenca >= 0 && presenca <= 3) {
          pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.zeroATres;
          totalPoints += pointsConfig.totalPresenca.zeroATres;
        } else if (presenca >= 4 && presenca <= 7) {
          pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.quatroASete;
          totalPoints += pointsConfig.totalPresenca.quatroASete;
        } else if (presenca >= 8 && presenca <= 13) {
          pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.oitoATreze;
          totalPoints += pointsConfig.totalPresenca.oitoATreze;
        }
      }
    }

    const comunhaoValue = Number(userData.comunhao ?? extraData?.comunhao ?? 0);
    if (comunhaoValue > 0) {
      const pontosComunhao = comunhaoValue * pointsConfig.escolaSabatina.comunhao;
      pointsBreakdown.comunhao = pontosComunhao;
      totalPoints += pontosComunhao;
    }

    const missaoValue = Number(userData.missao ?? extraData?.missao ?? 0);
    if (missaoValue > 0) {
      const pontosMissao = missaoValue * pointsConfig.escolaSabatina.missao;
      pointsBreakdown.missao = pontosMissao;
      totalPoints += pontosMissao;
    }

    const estudoBiblicoValue = Number(userData.estudoBiblico ?? extraData?.estudoBiblico ?? 0);
    if (estudoBiblicoValue > 0) {
      const pontosEstudoBiblico = estudoBiblicoValue * pointsConfig.escolaSabatina.estudoBiblico;
      pointsBreakdown.estudoBiblico = pontosEstudoBiblico;
      totalPoints += pontosEstudoBiblico;
    }

    const batizouAlguemValue = userData.batizouAlguem ?? extraData?.batizouAlguem;
    if (
      batizouAlguemValue === 'Sim' ||
      batizouAlguemValue === true ||
      batizouAlguemValue === 'true'
    ) {
      pointsBreakdown.batizouAlguem = pointsConfig.escolaSabatina.batizouAlguem;
      totalPoints += pointsConfig.escolaSabatina.batizouAlguem;
    }

    const discipuladoPosBatismoValue = Number(
      userData.discPosBatismal ?? extraData?.discPosBatismal ?? 0
    );
    if (discipuladoPosBatismoValue > 0) {
      const pontosDiscipulado =
        discipuladoPosBatismoValue * pointsConfig.escolaSabatina.discipuladoPosBatismo;
      pointsBreakdown.discipuladoPosBatismo = pontosDiscipulado;
      totalPoints += pontosDiscipulado;
    }

    const cpfValidoValue = userData.cpfValido ?? extraData?.cpfValido;
    if (cpfValidoValue === 'Sim' || cpfValidoValue === true || cpfValidoValue === 'true') {
      pointsBreakdown.cpfValido = pointsConfig.cpfValido.valido;
      totalPoints += pointsConfig.cpfValido.valido;
    }

    const camposVaziosValue = userData.camposVazios ?? extraData?.camposVaziosACMS;
    if (camposVaziosValue === false || camposVaziosValue === 0 || camposVaziosValue === '0') {
      pointsBreakdown.camposVaziosACMS = pointsConfig.camposVaziosACMS.completos;
      totalPoints += pointsConfig.camposVaziosACMS.completos;
    }

    const roundedTotalPoints = Math.round(totalPoints);

    return {
      success: true,
      points: roundedTotalPoints,
      breakdown: pointsBreakdown,
      userData: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        extraData,
      },
    };
  } catch (error) {
    deps.logger.error('❌ Erro ao calcular pontos:', error);
    return {
      success: false,
      message: 'Erro ao calcular pontos',
      error: (error as Error).message,
    };
  }
};

export const calculateUserPointsBatch = async (
  deps: PointsCalculationDeps,
  users: User[]
): Promise<Map<number, number>> => {
  const pointsMap = new Map<number, number>();

  try {
    const rawConfig = await deps.getPointsConfiguration();
    const pointsConfig = getRequiredPointsConfig(rawConfig);

    for (const userData of users) {
      if (deps.isSuperAdmin(deps.toPermissionUser(userData))) {
        pointsMap.set(userData.id, 0);
        continue;
      }

      let extraData: Record<string, unknown> = {};
      if (typeof userData.extraData === 'string') {
        try {
          extraData = JSON.parse(userData.extraData);
        } catch {
          extraData = {};
        }
      } else if (userData.extraData && typeof userData.extraData === 'object') {
        extraData = userData.extraData as Record<string, unknown>;
      }

      let totalPoints = 0;

      const getField = <T>(field: keyof User | string, defaultValue?: T): T | undefined => {
        const directValue = (userData as unknown as Record<string, unknown>)[field];
        if (directValue !== undefined && directValue !== null) {
          return directValue as T;
        }
        return (extraData?.[field] ?? defaultValue) as T | undefined;
      };

      const engajamentoValue = getField<string>('engajamento');
      if (engajamentoValue) {
        const engajamento = String(engajamentoValue).toLowerCase();
        if (engajamento.includes('baixo')) {
          totalPoints += pointsConfig.engajamento?.baixo ?? 0;
        } else if (engajamento.includes('médio') || engajamento.includes('medio')) {
          totalPoints += pointsConfig.engajamento?.medio ?? 0;
        } else if (engajamento.includes('alto')) {
          totalPoints += pointsConfig.engajamento?.alto ?? 0;
        }
      }

      const classificacaoValue = getField<string>('classificacao');
      if (classificacaoValue) {
        const classificacao = String(classificacaoValue).toLowerCase();
        if (classificacao.includes('frequente') && !classificacao.includes('não')) {
          totalPoints += pointsConfig.classificacao?.frequente ?? 0;
        } else {
          totalPoints += pointsConfig.classificacao?.naoFrequente ?? 0;
        }
      }

      const dizimistaValue = getField<string>('dizimistaType');
      if (dizimistaValue) {
        const dizimista = String(dizimistaValue).toLowerCase();
        if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
          totalPoints += pointsConfig.dizimista?.naoDizimista ?? 0;
        } else if (dizimista.includes('pontual')) {
          totalPoints += pointsConfig.dizimista?.pontual ?? 0;
        } else if (dizimista.includes('sazonal')) {
          totalPoints += pointsConfig.dizimista?.sazonal ?? 0;
        } else if (dizimista.includes('recorrente')) {
          totalPoints += pointsConfig.dizimista?.recorrente ?? 0;
        }
      }

      const ofertanteValue = getField<string>('ofertanteType');
      if (ofertanteValue) {
        const ofertante = String(ofertanteValue).toLowerCase();
        if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
          totalPoints += pointsConfig.ofertante?.naoOfertante ?? 0;
        } else if (ofertante.includes('pontual')) {
          totalPoints += pointsConfig.ofertante?.pontual ?? 0;
        } else if (ofertante.includes('sazonal')) {
          totalPoints += pointsConfig.ofertante?.sazonal ?? 0;
        } else if (ofertante.includes('recorrente')) {
          totalPoints += pointsConfig.ofertante?.recorrente ?? 0;
        }
      }

      const tempoBatismo = getField<number>('tempoBatismoAnos');
      if (tempoBatismo !== null && tempoBatismo !== undefined) {
        const anos = Number(tempoBatismo);
        if (!isNaN(anos) && pointsConfig.tempoBatismo) {
          if (anos <= 2) {
            totalPoints += pointsConfig.tempoBatismo.doisAnos ?? 0;
          } else if (anos <= 5) {
            totalPoints += pointsConfig.tempoBatismo.cincoAnos ?? 0;
          } else if (anos <= 10) {
            totalPoints += pointsConfig.tempoBatismo.dezAnos ?? 0;
          } else if (anos <= 20) {
            totalPoints += pointsConfig.tempoBatismo.vinteAnos ?? 0;
          } else {
            totalPoints += pointsConfig.tempoBatismo.maisVinte ?? 0;
          }
        }
      }

      const temLicao = getField<boolean>('temLicao');
      if (temLicao === true && pointsConfig.temLicao) {
        totalPoints += pointsConfig.temLicao.comLicao ?? 0;
      }

      const totalPresenca = getField<number>('totalPresenca');
      if (totalPresenca !== null && totalPresenca !== undefined) {
        const presencas = Number(totalPresenca);
        if (!isNaN(presencas) && pointsConfig.presenca) {
          totalPoints += presencas * (pointsConfig.presenca.multiplicador ?? 0);
        }
      }

      const cpfValido = getField<boolean>('cpfValido');
      if (cpfValido !== undefined && pointsConfig.cpfValido) {
        if (cpfValido === true) {
          totalPoints += pointsConfig.cpfValido.valido ?? 0;
        } else {
          totalPoints += pointsConfig.cpfValido.invalido ?? 0;
        }
      }

      const camposVazios = getField<boolean>('camposVazios');
      if (camposVazios !== undefined && pointsConfig.camposVaziosACMS) {
        if (camposVazios === false) {
          totalPoints += pointsConfig.camposVaziosACMS.completos ?? 0;
        } else {
          totalPoints += pointsConfig.camposVaziosACMS.incompletos ?? 0;
        }
      }

      const batizouAlguem = getField<boolean>('batizouAlguem');
      if (batizouAlguem === true && pointsConfig.batizouAlguem) {
        totalPoints += pointsConfig.batizouAlguem.sim ?? 0;
      }

      pointsMap.set(userData.id, Math.round(totalPoints));
    }
  } catch (error) {
    deps.logger.error('❌ Erro ao calcular pontos em batch:', error);
  }

  return pointsMap;
};

export const calculateAdvancedUserPoints = async (
  deps: PointsCalculationDeps,
  districtId?: number | null
): Promise<PointsRecalculationResult> => {
  try {
    let users = await deps.getAllUsers();

    if (districtId !== undefined && districtId !== null) {
      const beforeCount = users.length;
      users = users.filter((u) => u.districtId === districtId);
      deps.logger.info(
        `🏛️ Recálculo filtrado por distrito ${districtId}: ${users.length} usuários (de ${beforeCount} total)`
      );
    }

    let updatedCount = 0;
    let errorCount = 0;
    const results: Record<string, unknown>[] = [];

    for (const user of users) {
      try {
        if (deps.isSuperAdmin(deps.toPermissionUser(user))) {
          continue;
        }

        const calculation = await calculateUserPoints(deps, user.id);

        if (calculation && calculation.success) {
          if (user.points !== calculation.points) {
            await deps.db
              .update(deps.schema.users)
              .set({ points: calculation.points })
              .where(deps.eq(deps.schema.users.id, user.id));

            updatedCount++;
          }

          results.push({
            userId: user.id,
            name: user.name,
            points: calculation.points,
            updated: user.points !== calculation.points,
          });
        } else {
          errorCount++;
        }
      } catch (_userError) {
        errorCount++;
      }
    }

    const scopeMessage =
      districtId !== undefined && districtId !== null ? `do distrito` : `do sistema`;

    return {
      success: true,
      message: `Pontos recalculados para ${users.length} usuários ${scopeMessage}. ${updatedCount} atualizados.`,
      updatedUsers: updatedCount,
      totalUsers: users.length,
      errors: errorCount,
      results,
    };
  } catch (error) {
    deps.logger.error('❌ Erro ao recalcular pontos:', error);
    return {
      success: false,
      message: 'Erro ao recalcular pontos',
      error: (error as Error).message,
    };
  }
};
