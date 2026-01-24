/**
 * Points Routes Module
 * Endpoints relacionados à gamificação e pontos
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { handleError } from '../utils/errorHandler';
import { isSuperAdmin } from '../utils/permissions';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { pointsConfigSchema } from '../schemas';
import { User } from '../../shared/schema';
import { PointsConfiguration } from '../types/storage';

// Tipo para dados extras do usuário
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

// Tipo para configuração de pontos com campos opcionais
interface PointsConfig {
  basicPoints?: number;
  attendancePoints?: number;
  eventPoints?: number;
  donationPoints?: number;
  engajamento?: { alto?: number; medio?: number; baixo?: number };
  classificacao?: { frequente?: number; naoFrequente?: number };
  dizimista?: { naoDizimista?: number; recorrente?: number; sazonal?: number; pontual?: number };
  ofertante?: { naoOfertante?: number; recorrente?: number; sazonal?: number; pontual?: number };
  tempobatismo?: { maisVinte?: number; dezAnos?: number; cincoAnos?: number; doisAnos?: number };
  tempoBatismo?: { maisVinte?: number; dezAnos?: number; cincoAnos?: number; doisAnos?: number };
  cargos?: { tresOuMais?: number; doisCargos?: number; umCargo?: number };
  nomeunidade?: { comUnidade?: number };
  nomeUnidade?: { comUnidade?: number };
  temlicao?: { comLicao?: number };
  temLicao?: { comLicao?: number };
  totalpresenca?: { oitoATreze?: number; quatroASete?: number };
  totalPresenca?: { oitoATreze?: number; quatroASete?: number };
  escolasabatina?: { comunhao?: number; missao?: number; estudoBiblico?: number; discipuladoPosBatismo?: number; batizouAlguem?: number };
  escolaSabatina?: { comunhao?: number; missao?: number; estudoBiblico?: number; discipuladoPosBatismo?: number; batizouAlguem?: number };
  batizouAlguem?: { sim?: number };
  discipuladoPosBatismo?: { multiplicador?: number };
  pontuacaoDinamica?: { multiplicador?: number };
  presenca?: { multiplicador?: number };
  cpfvalido?: { valido?: number };
  cpfValido?: { valido?: number };
  camposvaziosacms?: { completos?: number };
  camposVaziosACMS?: { completos?: number };
}

export const pointsRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

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
      const presenca = typeof extraData.totalPresenca === 'string'
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

  // Helper to calculate parameter average
  const calculateParameterAverage = (config: PointsConfig): number => {
    const values: number[] = [];

    if (config.basicPoints && config.basicPoints > 0) values.push(config.basicPoints);
    if (config.attendancePoints && config.attendancePoints > 0) values.push(config.attendancePoints);
    if (config.eventPoints && config.eventPoints > 0) values.push(config.eventPoints);
    if (config.donationPoints && config.donationPoints > 0) values.push(config.donationPoints);

    const categories: Array<keyof PointsConfig> = [
      'engajamento', 'classificacao', 'dizimista', 'ofertante',
      'tempoBatismo', 'cargos', 'nomeUnidade', 'temLicao',
      'totalPresenca', 'escolaSabatina', 'batizouAlguem',
      'cpfValido', 'camposVaziosACMS'
    ];

    categories.forEach(category => {
      const section = config[category];
      if (section && typeof section === 'object') {
        Object.values(section as Record<string, number>).forEach(value => {
          const numValue = Number(value);
          if (numValue > 0) values.push(numValue);
        });
      }
    });

    if (values.length === 0) return 0;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  };

  // Helper to apply adjustment factor
  const applyAdjustmentFactorToParameters = (config: PointsConfig, factor: number): PointsConfig => {
    const newConfig = JSON.parse(JSON.stringify(config));

    if (newConfig.basicPoints) newConfig.basicPoints = Math.round(newConfig.basicPoints * factor);
    if (newConfig.attendancePoints) newConfig.attendancePoints = Math.round(newConfig.attendancePoints * factor);
    if (newConfig.eventPoints) newConfig.eventPoints = Math.round(newConfig.eventPoints * factor);
    if (newConfig.donationPoints) newConfig.donationPoints = Math.round(newConfig.donationPoints * factor);

    const pointCategories: Array<keyof PointsConfig> = [
      'engajamento', 'classificacao', 'dizimista', 'ofertante',
      'tempoBatismo', 'cargos', 'nomeUnidade', 'temLicao',
      'totalPresenca', 'escolaSabatina', 'batizouAlguem',
      'cpfValido', 'camposVaziosACMS'
    ];

    pointCategories.forEach(category => {
      const section = newConfig[category];
      if (section && typeof section === 'object') {
        Object.keys(section as Record<string, number>).forEach(fieldKey => {
          if (typeof (section as Record<string, number>)[fieldKey] === 'number') {
            (section as Record<string, number>)[fieldKey] = Math.round((section as Record<string, number>)[fieldKey] * factor);
          }
        });
      }
    });

    if (newConfig.pontuacaoDinamica) {
      newConfig.pontuacaoDinamica.multiplicador = 1;
    }
    if (newConfig.presenca) {
      newConfig.presenca.multiplicador = 1;
    }
    if (newConfig.discipuladoPosBatismo) {
      newConfig.discipuladoPosBatismo.multiplicador = 1;
    }

    return newConfig;
  };

  const mergePointsConfiguration = (base: PointsConfiguration, partial: PointsConfig): PointsConfiguration => {
    const tempoBatismo = partial.tempoBatismo ?? partial.tempobatismo ?? {};
    const nomeUnidade = partial.nomeUnidade ?? partial.nomeunidade ?? {};
    const temLicao = partial.temLicao ?? partial.temlicao ?? {};
    const totalPresenca = partial.totalPresenca ?? partial.totalpresenca ?? {};
    const escolaSabatina = partial.escolaSabatina ?? partial.escolasabatina ?? {};
    const batizouAlguem = partial.batizouAlguem ?? {};
    const cpfValido = partial.cpfValido ?? partial.cpfvalido ?? {};
    const camposVaziosACMS = partial.camposVaziosACMS ?? partial.camposvaziosacms ?? {};

    return {
      basicPoints: partial.basicPoints ?? base.basicPoints,
      attendancePoints: partial.attendancePoints ?? base.attendancePoints,
      eventPoints: partial.eventPoints ?? base.eventPoints,
      donationPoints: partial.donationPoints ?? base.donationPoints,
      engajamento: {
        baixo: partial.engajamento?.baixo ?? base.engajamento.baixo,
        medio: partial.engajamento?.medio ?? base.engajamento.medio,
        alto: partial.engajamento?.alto ?? base.engajamento.alto
      },
      classificacao: {
        frequente: partial.classificacao?.frequente ?? base.classificacao.frequente,
        naoFrequente: partial.classificacao?.naoFrequente ?? base.classificacao.naoFrequente
      },
      dizimista: {
        naoDizimista: partial.dizimista?.naoDizimista ?? base.dizimista.naoDizimista,
        pontual: partial.dizimista?.pontual ?? base.dizimista.pontual,
        sazonal: partial.dizimista?.sazonal ?? base.dizimista.sazonal,
        recorrente: partial.dizimista?.recorrente ?? base.dizimista.recorrente
      },
      ofertante: {
        naoOfertante: partial.ofertante?.naoOfertante ?? base.ofertante.naoOfertante,
        pontual: partial.ofertante?.pontual ?? base.ofertante.pontual,
        sazonal: partial.ofertante?.sazonal ?? base.ofertante.sazonal,
        recorrente: partial.ofertante?.recorrente ?? base.ofertante.recorrente
      },
      tempoBatismo: {
        doisAnos: tempoBatismo.doisAnos ?? base.tempoBatismo.doisAnos,
        cincoAnos: tempoBatismo.cincoAnos ?? base.tempoBatismo.cincoAnos,
        dezAnos: tempoBatismo.dezAnos ?? base.tempoBatismo.dezAnos,
        vinteAnos: base.tempoBatismo.vinteAnos,
        maisVinte: tempoBatismo.maisVinte ?? base.tempoBatismo.maisVinte
      },
      cargos: {
        umCargo: partial.cargos?.umCargo ?? base.cargos.umCargo,
        doisCargos: partial.cargos?.doisCargos ?? base.cargos.doisCargos,
        tresOuMais: partial.cargos?.tresOuMais ?? base.cargos.tresOuMais
      },
      nomeUnidade: {
        comUnidade: nomeUnidade.comUnidade ?? base.nomeUnidade.comUnidade,
        semUnidade: base.nomeUnidade.semUnidade
      },
      temLicao: {
        comLicao: temLicao.comLicao ?? base.temLicao.comLicao
      },
      pontuacaoDinamica: {
        multiplicador: partial.pontuacaoDinamica?.multiplicador ?? base.pontuacaoDinamica.multiplicador
      },
      totalPresenca: {
        zeroATres: base.totalPresenca.zeroATres,
        quatroASete: totalPresenca.quatroASete ?? base.totalPresenca.quatroASete,
        oitoATreze: totalPresenca.oitoATreze ?? base.totalPresenca.oitoATreze
      },
      presenca: {
        multiplicador: partial.presenca?.multiplicador ?? base.presenca.multiplicador
      },
      escolaSabatina: {
        comunhao: escolaSabatina.comunhao ?? base.escolaSabatina.comunhao,
        missao: escolaSabatina.missao ?? base.escolaSabatina.missao,
        estudoBiblico: escolaSabatina.estudoBiblico ?? base.escolaSabatina.estudoBiblico,
        batizouAlguem: escolaSabatina.batizouAlguem ?? base.escolaSabatina.batizouAlguem,
        discipuladoPosBatismo: escolaSabatina.discipuladoPosBatismo ?? base.escolaSabatina.discipuladoPosBatismo
      },
      batizouAlguem: {
        sim: batizouAlguem.sim ?? base.batizouAlguem.sim,
        nao: base.batizouAlguem.nao
      },
      discipuladoPosBatismo: {
        multiplicador: partial.discipuladoPosBatismo?.multiplicador ?? base.discipuladoPosBatismo.multiplicador
      },
      cpfValido: {
        valido: cpfValido.valido ?? base.cpfValido.valido,
        invalido: base.cpfValido.invalido
      },
      camposVaziosACMS: {
        completos: camposVaziosACMS.completos ?? base.camposVaziosACMS.completos,
        incompletos: base.camposVaziosACMS.incompletos
      }
    };
  };

  /**
   * @swagger
   * /api/system/points-config:
   *   get:
   *     summary: Obtém configuração de pontos
   *     tags: [Points]
   *     responses:
   *       200:
   *         description: Configuração de pontos
   */
  app.get('/api/system/points-config', async (req: Request, res: Response) => {
    try {
      const config = await storage.getPointsConfiguration();
      res.json(config);
    } catch (error) {
      handleError(res, error, "Get points config");
    }
  });

  /**
   * @swagger
   * /api/system/points-config:
   *   post:
   *     summary: Salva configuração de pontos
   *     tags: [Points]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Configuração salva e pontos recalculados
   */
  app.post('/api/system/points-config', validateBody(pointsConfigSchema), async (req: Request, res: Response) => {
    try {
      const config = (req as ValidatedRequest<typeof pointsConfigSchema._type>).validatedBody;

      await storage.savePointsConfiguration(config as unknown as Parameters<typeof storage.savePointsConfiguration>[0]);

      const result = await storage.calculateAdvancedUserPoints();

      if (result.success) {
        res.json({
          success: true,
          message: `Configuração salva e pontos recalculados automaticamente! ${result.updatedUsers || 0} usuários atualizados.`,
          updatedUsers: result.updatedUsers || 0,
          errors: result.errors || 0,
          details: result.message
        });
      } else {
        res.status(500).json({
          error: 'Erro ao recalcular pontos automaticamente',
          details: result.message
        });
      }
    } catch (error) {
      handleError(res, error, "Save points config");
    }
  });

  /**
   * @swagger
   * /api/system/points-config/reset:
   *   post:
   *     summary: Reseta configuração de pontos para valores padrão
   *     tags: [Points]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Configuração resetada
   */
  app.post('/api/system/points-config/reset', async (req: Request, res: Response) => {
    try {
      await db.delete(schema.pointConfigs);

      const result = await storage.calculateAdvancedUserPoints();

      if (result.success) {
        res.json({
          success: true,
          message: `Configuração resetada e pontos recalculados automaticamente! ${result.updatedUsers || 0} usuários atualizados.`,
          updatedUsers: result.updatedUsers || 0,
          errors: result.errors || 0,
          details: result.message
        });
      } else {
        res.status(500).json({
          error: 'Erro ao recalcular pontos automaticamente após reset',
          details: result.message
        });
      }
    } catch (error) {
      handleError(res, error, "Reset points config");
    }
  });

  /**
   * @swagger
   * /api/users/recalculate-all-points:
   *   post:
   *     summary: Recalcula pontos de todos os usuários
   *     tags: [Points, Users]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Pontos recalculados
   */
  app.post("/api/users/recalculate-all-points", async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();

      let updatedCount = 0;
      let errorCount = 0;
      const results: Array<{ userId: number; name: string; points: number | undefined; updated: boolean }> = [];

      for (const user of users) {
        try {
          if (isSuperAdmin({ role: user.role, email: user.email })) {
            continue;
          }

          const calculation = await storage.calculateUserPoints(user.id);

          if (calculation && typeof calculation === 'object' && calculation.success) {
            if (user.points !== calculation.points) {
              await storage.updateUser(user.id, { points: calculation.points });
              updatedCount++;
            }

            results.push({
              userId: user.id,
              name: user.name,
              points: calculation.points,
              updated: user.points !== calculation.points
            });
          } else {
            errorCount++;
          }
        } catch (userError) {
          logger.error(`Erro ao processar usuário ${user.name}:`, userError);
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: `Pontos recalculados para ${users.length} usuários. ${updatedCount} atualizados.`,
        updatedCount,
        totalUsers: users.length,
        errors: errorCount,
        results
      });

    } catch (error) {
      handleError(res, error, "Recalculate all points");
    }
  });

  /**
   * @swagger
   * /api/system/parameter-average:
   *   get:
   *     summary: Obtém média atual dos parâmetros
   *     tags: [Points]
   *     responses:
   *       200:
   *         description: Média dos parâmetros
   */
  app.get('/api/system/parameter-average', async (req: Request, res: Response) => {
    try {
      const currentConfig = await storage.getPointsConfiguration();
      const currentAverage = calculateParameterAverage(currentConfig);

      res.json({
        success: true,
        currentAverage: currentAverage.toFixed(2),
        message: `Média atual dos parâmetros: ${currentAverage.toFixed(2)}`
      });
    } catch (error) {
      handleError(res, error, "Get parameter average");
    }
  });

  /**
   * @swagger
   * /api/system/district-average:
   *   post:
   *     summary: Ajusta configuração baseado na média desejada do distrito
   *     tags: [Points]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - targetAverage
   *             properties:
   *               targetAverage:
   *                 type: number
   *     responses:
   *       200:
   *         description: Configuração ajustada
   */
  app.post('/api/system/district-average', async (req: Request, res: Response) => {
    try {
      const { targetAverage } = req.body;

      if (!targetAverage || typeof targetAverage !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Média desejada é obrigatória e deve ser um número'
        });
        return;
      }

      const currentConfig = await storage.getPointsConfiguration();
      const allUsers = await storage.getAllUsers();
      const regularUsers = allUsers.filter(user => user.email !== 'admin@7care.com');

      if (regularUsers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Não há usuários para calcular a média'
        });
        return;
      }

      let totalCurrentPoints = 0;
      for (const user of regularUsers) {
        const points = calculateUserPointsFromConfig(user, currentConfig);
        totalCurrentPoints += Math.round(points);
      }

      const currentUserAverage = totalCurrentPoints / regularUsers.length;
      const adjustmentFactor = targetAverage / currentUserAverage;
      const newConfig = applyAdjustmentFactorToParameters(currentConfig, adjustmentFactor);
      const mergedConfig = mergePointsConfiguration(currentConfig, newConfig);

      await storage.savePointsConfiguration(mergedConfig);

      const result = await storage.calculateAdvancedUserPoints();

      if (!result.success) {
        throw new Error(`Erro no recálculo automático: ${result.message}`);
      }

      res.json({
        success: true,
        currentUserAverage: currentUserAverage.toFixed(2),
        targetAverage,
        adjustmentFactor: adjustmentFactor.toFixed(2),
        updatedUsers: result.updatedUsers || 0,
        errors: result.errors || 0,
        message: `Configuração ajustada e pontos recalculados automaticamente! ${result.updatedUsers || 0} usuários atualizados.`,
        details: result.message
      });

    } catch (error) {
      handleError(res, error, "District average");
    }
  });

  /**
   * @swagger
   * /api/system/event-permissions:
   *   get:
   *     summary: Obtém permissões de eventos
   *     tags: [Points, Settings]
   *     responses:
   *       200:
   *         description: Permissões de eventos
   */
  app.get('/api/system/event-permissions', async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getEventPermissions();
      res.json({ success: true, permissions });
    } catch (error) {
      handleError(res, error, "Get event permissions");
    }
  });

  /**
   * @swagger
   * /api/system/event-permissions:
   *   post:
   *     summary: Salva permissões de eventos
   *     tags: [Points, Settings]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               permissions:
   *                 type: object
   *     responses:
   *       200:
   *         description: Permissões salvas
   */
  app.post('/api/system/event-permissions', async (req: Request, res: Response) => {
    try {
      const { permissions } = req.body;

      if (!permissions || typeof permissions !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Permissões são obrigatórias e devem ser um objeto'
        });
        return;
      }

      await storage.saveEventPermissions(permissions);

      res.json({
        success: true,
        message: 'Permissões de eventos salvas com sucesso'
      });
    } catch (error) {
      handleError(res, error, "Save event permissions");
    }
  });
};
