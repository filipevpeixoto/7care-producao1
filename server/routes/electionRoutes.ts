import { sql } from '../neonConfig';
import { NeonAdapter } from '../neonAdapter';
import { hasAdminAccess } from '../utils/permissions';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

type SqlRow = Record<string, unknown>;
type ElectionConfigRow = SqlRow & {
  removed_candidates?: unknown;
  current_leaders?: unknown;
  voters?: unknown;
  positions?: unknown;
  criteria?: unknown;
  church_name?: unknown;
  max_nominations_per_voter?: unknown;
};
type ElectionCriteria = {
  dizimistaRecorrente?: boolean;
  mustBeTither?: boolean;
  mustBeDonor?: boolean;
  minAttendance?: number;
  minMonthsInChurch?: number;
  minEngagement?: boolean;
  minClassification?: boolean;
  minBaptismYears?: number;
  classification?: {
    enabled?: boolean;
    frequente?: boolean;
    naoFrequente?: boolean;
    aResgatar?: boolean;
  };
};
type ResultRow = {
  position_id: string;
  candidate_id: number;
  candidate_name?: string | null;
  candidate_email?: string | null;
  nominations?: number | string | null;
  votes?: number | string | null;
  percentage?: number;
};
type VoteResultRow = {
  candidate_id: number;
  votes: number | string | null;
};
type CandidateRow = {
  id?: number;
  candidate_id?: number;
  name?: string | null;
  candidate_name?: string | null;
  unit?: string | null;
  church?: string | null;
  nome_unidade?: string | null;
  nomeUnidade?: string | null;
  birth_date?: string | null;
  birthDate?: string | null;
  extra_data?: unknown;
  points?: number | string | null;
  nominations?: number | string | null;
  votes?: number | string | null;
  percentage?: number | string | null;
};
type ElectionRow = SqlRow & {
  id?: number;
  election_id?: number;
  config_id?: number;
  status?: string;
  current_position?: number | null;
  current_phase?: string | null;
  result_announced?: boolean | null;
  created_at?: unknown;
  updated_at?: unknown;
  positions?: unknown;
  voters?: unknown;
  max_nominations_per_voter?: number | null;
  church_name?: unknown;
};
type NormalizedCandidate = {
  id: number;
  name: string;
  unit: string;
  birthDate: string | null;
  extraData: Record<string, unknown> | null;
  points: number;
  nominations: number;
  votes: number;
  percentage: number;
  nomeUnidade: string | null;
};

type MemberRow = {
  id: number;
  name: string;
  email: string;
  church?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string | null;
  birth_date?: string | null;
  is_tither?: boolean | null;
  is_donor?: boolean | null;
  attendance?: number | null;
  extra_data?: string | null;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const getErrorStack = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
};

const parseHeaderUserId = (req: Request): number | null => {
  const headerValue = req.headers['x-user-id'];
  const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const parsed = rawValue ? parseInt(String(rawValue), 10) : NaN;
  return Number.isNaN(parsed) ? null : parsed;
};

const parseIdValue = (value: unknown): number | null => {
  if (value == null) {
    return null;
  }
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(String(rawValue), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toNumber = (value: unknown): number => {
  if (value == null) {
    return 0;
  }
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Type for count query results
type CountRow = { count: string | number };
const parseCount = (row: unknown): number => {
  if (!row) return 0;
  const countRow = row as CountRow;
  return typeof countRow.count === 'number'
    ? countRow.count
    : parseInt(String(countRow.count), 10) || 0;
};

const parseExtraData = (extraData: unknown): Record<string, unknown> => {
  if (!extraData) {
    return {};
  }
  if (typeof extraData === 'string') {
    try {
      return JSON.parse(extraData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof extraData === 'object') {
    return extraData as Record<string, unknown>;
  }
  return {};
};

export const electionRoutes = (app: Express) => {
  const storage = new NeonAdapter();

  // Middleware para proteger endpoints de eleição contra readonly users
  const checkReadOnlyAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseHeaderUserId(req);
      if (userId !== null) {
        const user = await storage.getUserById(userId);
        const extraData = user ? parseExtraData(user.extraData) : {};
        const readOnlyFlag = (extraData as { readOnly?: boolean }).readOnly;
        if (user && (user.role === 'admin_readonly' || readOnlyFlag === true)) {
          return res.status(403).json({
            success: false,
            message:
              'Usuário de teste possui acesso somente para leitura. Edições não são permitidas.',
            code: 'READONLY_ACCESS',
          });
        }
      }
      return next();
    } catch (error: unknown) {
      console.error('Erro ao verificar acesso read-only:', error);
      return next();
    }
  };

  // Rota para configurar eleição
  app.post('/api/elections/config', checkReadOnlyAccess, async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // Criar tabela de configuração se não existir
      await sql`
        CREATE TABLE IF NOT EXISTS election_configs (
          id SERIAL PRIMARY KEY,
          church_id INTEGER NOT NULL,
          church_name VARCHAR(255) NOT NULL,
          title VARCHAR(255) DEFAULT '',
          description TEXT DEFAULT '',
          voters INTEGER[] NOT NULL,
          criteria JSONB NOT NULL,
          positions TEXT[] NOT NULL,
          position_descriptions JSONB DEFAULT '{}'::jsonb,
          status VARCHAR(50) DEFAULT 'draft',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Garantir que as colunas adicionais existam (para versões antigas da tabela)
      try {
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT ''
        `;
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''
        `;
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS position_descriptions JSONB DEFAULT '{}'::jsonb
        `;
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS removed_candidates JSONB DEFAULT '[]'::jsonb
        `;
        await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS current_leaders JSONB DEFAULT '{}'::jsonb
        `;
      } catch (alterError: unknown) {
        logger.warn(
          '  Erro ao garantir colunas adicionais em election_configs:',
          getErrorMessage(alterError)
        );
      }

      const title =
        body.title && body.title.trim().length > 0
          ? body.title.trim()
          : `Nomeação ${body.churchName || 'Igreja'} - ${new Date().toLocaleDateString('pt-BR')}`;

      // Inserir configuração
      const result = await sql`
        INSERT INTO election_configs (church_id, church_name, title, voters, criteria, positions, position_descriptions, current_leaders, removed_candidates, status)
        VALUES (
          ${body.churchId || 1},
          ${body.churchName || 'Igreja Central'},
          ${title},
          ${body.voters || []},
          ${JSON.stringify(body.criteria || {})},
          ${body.positions || []},
          ${JSON.stringify(body.position_descriptions || {})},
          ${JSON.stringify(body.current_leaders || {})},
          ${JSON.stringify(body.removed_candidates || [])},
          ${body.status || 'draft'}
        )
        RETURNING *
      `;

      logger.info(' Configuração de eleição salva:', result[0].id);

      return res.status(200).json(result[0]);
    } catch (error: unknown) {
      console.error('❌ Erro ao salvar configuração:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para atualizar configuração existente
  app.put('/api/elections/config/:id', checkReadOnlyAccess, async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.id, 10);

      if (!configId) {
        return res.status(400).json({ error: 'ID da configuração inválido' });
      }

      const body = req.body || {};

      logger.debug(' [UPDATE CONFIG] Recebendo atualização para configId:', configId);
      logger.debug(' [UPDATE CONFIG] removed_candidates recebido:', body.removed_candidates);

      try {
        await sql`
          ALTER TABLE election_configs 
          ADD COLUMN IF NOT EXISTS position_descriptions JSONB DEFAULT '{}'::jsonb
        `;
      } catch (alterError: unknown) {
        logger.warn(
          ' Coluna position_descriptions já existe ou erro ao adicionar:',
          getErrorMessage(alterError)
        );
      }

      try {
        await sql`
          ALTER TABLE election_configs 
          ADD COLUMN IF NOT EXISTS removed_candidates JSONB DEFAULT '[]'::jsonb
        `;
      } catch (alterError: unknown) {
        logger.warn(
          ' Coluna removed_candidates já existe ou erro ao adicionar:',
          getErrorMessage(alterError)
        );
      }

      try {
        await sql`
          ALTER TABLE election_configs 
          ADD COLUMN IF NOT EXISTS current_leaders JSONB DEFAULT '{}'::jsonb
        `;
      } catch (alterError: unknown) {
        logger.warn(
          ' Coluna current_leaders já existe ou erro ao adicionar:',
          getErrorMessage(alterError)
        );
      }

      const removedCandidatesJson = JSON.stringify(body.removed_candidates || []);
      const currentLeadersJson = JSON.stringify(body.current_leaders || {});
      logger.debug(' [UPDATE CONFIG] Salvando removed_candidates como:', removedCandidatesJson);
      logger.debug(' [UPDATE CONFIG] Salvando current_leaders como:', currentLeadersJson);

      const updatedConfig = await sql`
        UPDATE election_configs
        SET
          church_id = ${body.churchId || 0},
          church_name = ${body.churchName || ''},
          title = ${body.title || ''},
          voters = ${body.voters || []},
          criteria = ${JSON.stringify(body.criteria || {})},
          positions = ${body.positions || []},
          status = ${body.status || 'draft'},
          position_descriptions = ${JSON.stringify(body.position_descriptions || {})},
          current_leaders = ${currentLeadersJson},
          removed_candidates = ${removedCandidatesJson},
          updated_at = NOW()
        WHERE id = ${configId}
        RETURNING *
      `;

      logger.info(
        ' [UPDATE CONFIG] Config atualizado. removed_candidates salvo:',
        updatedConfig[0].removed_candidates
      );

      if (updatedConfig.length === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      logger.info(' Configuração de eleição atualizada:', configId);

      return res.status(200).json({
        message: 'Configuração atualizada com sucesso',
        config: updatedConfig[0],
      });
    } catch (error: unknown) {
      console.error('❌ Erro ao atualizar configuração:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // GET /api/elections/config/:id - Buscar uma configuração específica
  app.get('/api/elections/config/:id', async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.id, 10);

      const config = await sql`
        SELECT ec.*, e.status as election_status, e.created_at as election_created_at
        FROM election_configs ec
        LEFT JOIN (
          SELECT DISTINCT ON (config_id) config_id, status, created_at
          FROM elections
          ORDER BY config_id, created_at DESC
        ) e ON ec.id = e.config_id
        WHERE ec.id = ${configId}
        ORDER BY ec.created_at DESC
      `;

      if (config.length === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      // Garantir que removed_candidates está parseado corretamente
      const configData = config[0];
      if (configData.removed_candidates) {
        if (typeof configData.removed_candidates === 'string') {
          try {
            configData.removed_candidates = JSON.parse(configData.removed_candidates);
          } catch (_e) {
            configData.removed_candidates = [];
          }
        }
      } else {
        configData.removed_candidates = [];
      }

      // Garantir que current_leaders está parseado corretamente
      if (configData.current_leaders) {
        if (typeof configData.current_leaders === 'string') {
          try {
            configData.current_leaders = JSON.parse(configData.current_leaders);
          } catch (_e2) {
            configData.current_leaders = {};
          }
        }
      } else {
        configData.current_leaders = {};
      }

      logger.debug(
        ' [GET CONFIG] Retornando config:',
        configId,
        'removed_candidates:',
        configData.removed_candidates,
        'current_leaders:',
        configData.current_leaders
      );

      return res.json(configData);
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar configuração:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // GET /api/elections/config - Buscar configuração específica ou última
  app.get('/api/elections/config', async (req: Request, res: Response) => {
    try {
      const configId = parseIdValue(req.query.id);

      // Função auxiliar para parsear removed_candidates
      const parseRemovedCandidates = (configData: ElectionConfigRow) => {
        if (configData.removed_candidates) {
          if (typeof configData.removed_candidates === 'string') {
            try {
              configData.removed_candidates = JSON.parse(configData.removed_candidates);
            } catch (_e3) {
              configData.removed_candidates = [];
            }
          }
        } else {
          configData.removed_candidates = [];
        }
        return configData;
      };

      if (configId !== null) {
        // Buscar configuração específica por ID
        const config = await sql`
          SELECT ec.*, e.status as election_status, e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          WHERE ec.id = ${configId}
          ORDER BY ec.created_at DESC
        `;

        if (config.length === 0) {
          return res.status(404).json({ error: 'Configuração não encontrada' });
        }

        const configData = parseRemovedCandidates(config[0]);
        logger.debug(
          ' [GET CONFIG] Retornando config (query):',
          configId,
          'removed_candidates:',
          configData.removed_candidates
        );
        return res.json(configData);
      } else {
        // Buscar última configuração criada
        const config = await sql`
          SELECT ec.*, e.status as election_status, e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          ORDER BY ec.created_at DESC
          LIMIT 1
        `;

        if (config.length === 0) {
          return res.status(404).json({ error: 'Nenhuma configuração encontrada' });
        }

        const configData = parseRemovedCandidates(config[0]);
        return res.json(configData);
      }
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar configuração:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // GET /api/elections/configs - Listar todas as configurações
  app.get('/api/elections/configs', async (req: Request, res: Response) => {
    try {
      const requestingUserId = parseHeaderUserId(req);

      // Buscar dados do usuário que está fazendo a requisição
      let requestingUser = null;
      let userChurch = null;

      if (requestingUserId) {
        const userResult = await sql`
          SELECT id, church, role, email FROM users WHERE id = ${requestingUserId}
        `;
        if (userResult.length > 0) {
          requestingUser = userResult[0];
          userChurch = userResult[0].church;
        }
      }

      // Verificar se é super admin
      const isSuperAdminUser =
        requestingUser &&
        (requestingUser.role === 'super_admin' || requestingUser.email === 'admin@7care.com');

      let configs;

      if (isSuperAdminUser || !userChurch) {
        // Super admin vê todas as configurações
        configs = await sql`
          SELECT DISTINCT ON (ec.id) 
            ec.*, 
            e.status as election_status, 
            e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          ORDER BY ec.id, ec.created_at DESC
        `;
      } else {
        // Usuário normal vê apenas configurações da sua igreja
        configs = await sql`
          SELECT DISTINCT ON (ec.id) 
            ec.*, 
            e.status as election_status, 
            e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          WHERE ec.church_name = ${userChurch}
          ORDER BY ec.id, ec.created_at DESC
        `;
      }

      logger.debug(
        ` [GET CONFIGS] Retornando ${configs.length} configurações para usuário ${requestingUserId} (igreja: ${userChurch || 'todas'})`
      );

      return res.status(200).json(configs);
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar configurações:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para iniciar eleição
  app.post('/api/elections/start', checkReadOnlyAccess, async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // Buscar configuração
      let config;
      if (body.configId) {
        config = await sql`
          SELECT * FROM election_configs 
          WHERE id = ${body.configId}
        `;
      } else {
        config = await sql`
          SELECT * FROM election_configs 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
      }

      if (config.length === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      // Desativar eleições ativas da MESMA configuração
      logger.debug(' Desativando eleições ativas da configuração atual...');
      await sql`
        UPDATE elections 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active' AND config_id = ${config[0].id}
      `;

      // Criar tabelas se não existirem
      await sql`
        CREATE TABLE IF NOT EXISTS elections (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          current_position INTEGER DEFAULT 0,
          current_phase VARCHAR(20) DEFAULT 'nomination',
          result_announced BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Garantir colunas essenciais em tabelas já existentes
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS current_position INTEGER DEFAULT 0
      `;
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS current_phase VARCHAR(20) DEFAULT 'nomination'
      `;
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `;
      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS result_announced BOOLEAN DEFAULT false
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS election_votes (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          voter_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          vote_type VARCHAR(20) DEFAULT 'nomination',
          voted_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(election_id, voter_id, position_id, candidate_id, vote_type)
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS election_candidates (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          candidate_name VARCHAR(255) NOT NULL,
          faithfulness_punctual BOOLEAN DEFAULT false,
          faithfulness_seasonal BOOLEAN DEFAULT false,
          faithfulness_recurring BOOLEAN DEFAULT false,
          attendance_percentage INTEGER DEFAULT 0,
          months_in_church INTEGER DEFAULT 0,
          nominations INTEGER DEFAULT 0,
          phase VARCHAR(20) DEFAULT 'nomination'
        )
      `;

      logger.debug(' Verificando existência de eleição para esta configuração...');
      const existingElection = await sql`
        SELECT *
        FROM elections
        WHERE config_id = ${config[0].id}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      let currentElection;

      if (existingElection.length > 0) {
        currentElection = existingElection[0];
        logger.info(
          ` Reutilizando eleição existente ${currentElection.id} (config ${config[0].id})`
        );

        await sql`
          UPDATE elections
          SET status = 'active',
              current_position = 0,
              current_phase = 'nomination',
              result_announced = false,
              updated_at = NOW()
          WHERE id = ${currentElection.id}
        `;

        await sql`
          DELETE FROM election_votes
          WHERE election_id = ${currentElection.id}
        `;

        await sql`
          DELETE FROM election_candidates
          WHERE election_id = ${currentElection.id}
        `;

        const refreshed = await sql`
          SELECT * FROM elections WHERE id = ${currentElection.id}
        `;
        currentElection = refreshed[0];
      } else {
        const inserted = await sql`
          INSERT INTO elections (config_id, status, current_position, current_phase)
          VALUES (${config[0].id}, 'active', 0, 'nomination')
          RETURNING *
        `;
        currentElection = inserted[0];
        logger.info(` Nova eleição criada: ${currentElection.id}`);
      }

      // Buscar candidatos elegíveis para cada posição
      logger.debug(' Buscando membros da igreja:', config[0].church_name);
      const churchMembers = (await sql`
        SELECT id, name, email, church, role, status, created_at, birth_date, is_tither, is_donor, attendance, extra_data
        FROM users 
        WHERE church = ${String(config[0].church_name || '')} 
        AND (role LIKE '%member%' OR role LIKE '%admin%')
        AND (status = 'approved' OR status = 'pending')
      `) as MemberRow[];

      // Garantir que positions seja um array
      const positions: string[] = Array.isArray(config[0].positions)
        ? config[0].positions
        : JSON.parse(String(config[0].positions || '[]'));

      // Garantir que voters seja um array
      let votersArray: number[] = [];
      if (Array.isArray(config[0].voters)) {
        votersArray = config[0].voters;
      } else if (typeof config[0].voters === 'string') {
        try {
          const parsed = JSON.parse(config[0].voters);
          if (Array.isArray(parsed)) {
            votersArray = parsed
              .map((value: unknown) => {
                if (typeof value === 'number') {
                  return value;
                }
                if (typeof value === 'string') {
                  const normalized = value.trim().replace(/^['"]+|['"]+$/g, '');
                  return parseInt(normalized, 10);
                }
                return Number.NaN;
              })
              .filter((v: number) => !Number.isNaN(v));
          }
        } catch (_jsonErr) {
          const cleaned = config[0].voters.replace(/[{}]/g, '');
          if (cleaned.trim().length > 0) {
            votersArray = cleaned
              .split(',')
              .map((v: string) => {
                const normalized = v.trim().replace(/^['"]+|['"]+$/g, '');
                return parseInt(normalized, 10);
              })
              .filter((v: number) => !Number.isNaN(v));
          }
        }
      }
      votersArray = Array.from(
        new Set(votersArray.filter(v => typeof v === 'number' && !Number.isNaN(v)))
      );
      const _configuredTotalVoters = votersArray.length;

      if (!positions || positions.length === 0) {
        logger.warn(' Nenhuma posição configurada na eleição');
        return res.status(400).json({ error: 'Configuração inválida: nenhuma posição encontrada' });
      }

      // Inserir candidatos para cada posição
      const candidatesToInsert = [];

      for (const position of positions) {
        for (const member of churchMembers) {
          // Processar dados de gestão do extraData
          let extraData: Record<string, unknown> = {};
          try {
            extraData = member.extra_data ? JSON.parse(member.extra_data) : {};
          } catch (e: unknown) {
            logger.warn(` Erro ao processar extraData para ${member.name}:`, getErrorMessage(e));
          }

          // Extrair dados de gestão do extraData
          const dizimistaType =
            typeof extraData.dizimistaType === 'string' ? extraData.dizimistaType : '';
          const ofertanteType =
            typeof extraData.ofertanteType === 'string' ? extraData.ofertanteType : '';
          const dizimistaRecorrente =
            dizimistaType === 'Recorrente (8-12)' || dizimistaType === 'recorrente';
          const ofertanteRecorrente =
            ofertanteType === 'Recorrente (8-12)' || ofertanteType === 'recorrente';
          const engajamento =
            typeof extraData.engajamento === 'string' ? extraData.engajamento : 'baixo';
          const classificacao =
            typeof extraData.classificacao === 'string' ? extraData.classificacao : 'não frequente';
          const tempoBatismoAnos = toNumber(extraData.tempoBatismoAnos);
          const presencaTotal = toNumber(extraData.totalPresenca);
          const _comunhao = toNumber(extraData.comunhao);
          const _missao = toNumber(extraData.missao);
          const _estudoBiblico = toNumber(extraData.estudoBiblico);
          const _discPosBatismal = toNumber(extraData.discPosBatismal);
          let idade: number | null = null;
          if (member.birth_date) {
            const birthDate = new Date(member.birth_date);
            idade = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          } else if (extraData.idade) {
            const parsedIdade = parseInt(String(extraData.idade), 10);
            idade = Number.isNaN(parsedIdade) ? null : parsedIdade;
          }

          const isTeenPosition =
            typeof position === 'string' && position.toLowerCase().includes('teen');

          // Verificar critérios de elegibilidade
          const criteria: ElectionCriteria =
            typeof config[0].criteria === 'object' && config[0].criteria !== null
              ? (config[0].criteria as ElectionCriteria)
              : (JSON.parse(String(config[0].criteria || '{}')) as ElectionCriteria);
          let isEligible = true;
          const monthsInChurch = member.created_at
            ? Math.floor(
                (Date.now() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
              )
            : 0;

          if (isTeenPosition) {
            isEligible = idade !== null && idade >= 10 && idade <= 15;
            if (!isEligible) {
              logger.debug(
                ` Candidato ${member.name} inelegível para posição Teen (idade=${idade ?? 'N/A'})`
              );
            }
          } else {
            if (criteria.dizimistaRecorrente && !dizimistaRecorrente) {
              isEligible = false;
            }

            if (criteria.mustBeTither && !dizimistaRecorrente) {
              isEligible = false;
            }

            if (criteria.mustBeDonor && !ofertanteRecorrente) {
              isEligible = false;
            }

            if (criteria.minAttendance && presencaTotal < criteria.minAttendance) {
              isEligible = false;
            }

            if (criteria.minMonthsInChurch && monthsInChurch < criteria.minMonthsInChurch) {
              isEligible = false;
            }

            if (criteria.minEngagement && engajamento === 'baixo') {
              isEligible = false;
            }

            if (criteria.minClassification && classificacao === 'não frequente') {
              isEligible = false;
            }

            // Critério de Classificação (novo critério estruturado)
            if (criteria.classification?.enabled) {
              const memberClassification = (classificacao || '').toLowerCase();
              let hasValidClassification = false;

              if (criteria.classification.frequente && memberClassification === 'frequente') {
                hasValidClassification = true;
              }
              if (
                criteria.classification.naoFrequente &&
                memberClassification === 'não frequente'
              ) {
                hasValidClassification = true;
              }
              if (criteria.classification.aResgatar && memberClassification === 'a resgatar') {
                hasValidClassification = true;
              }

              if (!hasValidClassification) {
                isEligible = false;
                logger.warn(
                  ` Candidato ${member.name} inelegível por classificação: ${classificacao}`
                );
              }
            }

            if (criteria.minBaptismYears && tempoBatismoAnos < criteria.minBaptismYears) {
              isEligible = false;
            }

            logger.debug(
              ` Candidato ${member.name}: elegível=${isEligible}, dizimistaRecorrente=${dizimistaRecorrente}, engajamento=${engajamento}, classificacao=${classificacao}, tempoBatismo=${tempoBatismoAnos} anos, presenca=${presencaTotal}, months=${monthsInChurch}`
            );
          }

          if (isEligible) {
            candidatesToInsert.push({
              election_id: currentElection.id,
              position_id: position,
              candidate_id: member.id,
              candidate_name: member.name,
              faithfulness_punctual: dizimistaRecorrente,
              faithfulness_seasonal: ofertanteRecorrente,
              faithfulness_recurring: dizimistaRecorrente && ofertanteRecorrente,
              attendance_percentage: presencaTotal,
              months_in_church: monthsInChurch,
            });
          }
        }
      }

      // Inserir candidatos um por um (mais confiável)
      if (candidatesToInsert.length > 0) {
        for (const candidate of candidatesToInsert) {
          await sql`
            INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, faithfulness_punctual, faithfulness_seasonal, faithfulness_recurring, attendance_percentage, months_in_church, nominations, phase)
            VALUES (${candidate.election_id}, ${candidate.position_id}, ${candidate.candidate_id}, ${candidate.candidate_name}, ${candidate.faithfulness_punctual}, ${candidate.faithfulness_seasonal}, ${candidate.faithfulness_recurring}, ${candidate.attendance_percentage}, ${candidate.months_in_church}, 0, 'nomination')
          `;
        }
        logger.info(` ${candidatesToInsert.length} candidatos inseridos`);
      }

      // Atualizar status da configuração
      await sql`
        UPDATE election_configs 
        SET status = 'active' 
        WHERE id = ${config[0].id}
      `;

      logger.info(' Nomeação pronta:', currentElection.id);

      return res.status(200).json({
        electionId: currentElection.id,
        message: 'Nomeação iniciada com sucesso',
      });
    } catch (error: unknown) {
      console.error('❌ Erro ao iniciar eleição:', error);
      console.error('❌ Stack trace:', getErrorStack(error));
      return res
        .status(500)
        .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
    }
  });

  // Rota para ativar/desativar nomeação (toggle status)
  app.put(
    '/api/elections/config/:id/toggle-status',
    checkReadOnlyAccess,
    async (req: Request, res: Response) => {
      try {
        const configId = parseInt(req.params.id);

        logger.debug(` [TOGGLE-STATUS] Requisição recebida:`, {
          configId,
          timestamp: new Date().toISOString(),
          body: req.body,
          headers: req.headers,
          method: req.method,
          url: req.url,
          userAgent: req.headers['user-agent'],
        });

        // Validação do configId
        if (isNaN(configId) || configId <= 0) {
          console.error(`❌ [TOGGLE-STATUS] configId inválido:`, configId);
          return res.status(400).json({ error: 'ID da configuração inválido' });
        }

        // Garantir que colunas essenciais existam para instalações antigas
        try {
          await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
        `;
          await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        `;
          await sql`
          ALTER TABLE election_configs
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'
        `;
        } catch (alterError: unknown) {
          logger.warn(
            '  Erro ao garantir colunas em election_configs:',
            getErrorMessage(alterError)
          );
        }

        // Buscar config atual
        logger.debug(` [TOGGLE-STATUS] Buscando config ${configId}...`);
        const config = await sql`
        SELECT id, status, church_id, church_name
        FROM election_configs
        WHERE id = ${configId}
        ORDER BY created_at DESC
      `;

        logger.debug(
          ` [TOGGLE-STATUS] Config encontrada:`,
          config.length > 0 ? config[0] : 'Nenhuma'
        );

        if (config.length === 0) {
          console.error(`❌ [TOGGLE-STATUS] Config ${configId} não encontrada`);
          return res.status(404).json({ error: 'Configuração não encontrada' });
        }

        // Garantir tabelas necessárias (independente do status)
        await sql`
        CREATE TABLE IF NOT EXISTS elections (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          current_position INTEGER DEFAULT 0,
          current_phase VARCHAR(20) DEFAULT 'nomination',
          result_announced BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

        await sql`
        CREATE TABLE IF NOT EXISTS election_votes (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          voter_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          vote_type VARCHAR(20) DEFAULT 'nomination',
          voted_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(election_id, voter_id, position_id, candidate_id, vote_type)
        )
      `;

        await sql`
        CREATE TABLE IF NOT EXISTS election_candidates (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          candidate_name VARCHAR(255) NOT NULL,
          faithfulness_punctual BOOLEAN DEFAULT false,
          faithfulness_seasonal BOOLEAN DEFAULT false,
          faithfulness_recurring BOOLEAN DEFAULT false,
          attendance_percentage INTEGER DEFAULT 0,
          months_in_church INTEGER DEFAULT 0,
          nominations INTEGER DEFAULT 0,
          phase VARCHAR(20) DEFAULT 'nomination'
        )
      `;

        await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS result_announced BOOLEAN DEFAULT false
      `;

        const currentStatus = config[0].status || 'draft';
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';

        logger.debug(` [TOGGLE-STATUS] Toggle status da nomeação ${configId}:`, {
          currentStatus,
          newStatus,
          church: config[0].church_name,
          churchId: config[0].church_id,
        });

        // Atualizar status
        logger.debug(` [TOGGLE-STATUS] Atualizando status no banco...`);
        const updateResult = await sql`
        UPDATE election_configs 
        SET status = ${newStatus},
            updated_at = NOW()
        WHERE id = ${configId}
      `;

        logger.info(` [TOGGLE-STATUS] Status atualizado com sucesso:`, updateResult);

        // Se estiver ativando, criar/reativar eleição
        if (newStatus === 'active') {
          const existingElection = await sql`
          SELECT id FROM elections
          WHERE config_id = ${configId}
          ORDER BY created_at DESC
          LIMIT 1
        `;

          if (existingElection.length === 0) {
            // Criar nova eleição
            await sql`
            INSERT INTO elections (config_id, status, created_at)
            VALUES (${configId}, 'active', NOW())
          `;
            logger.info(` Nova eleição criada para config ${configId}`);
          } else {
            // Reativar eleição existente
            await sql`
            UPDATE elections
            SET status = 'active',
                result_announced = false,
                updated_at = NOW()
            WHERE id = ${existingElection[0].id}
          `;
            logger.info(` Eleição ${existingElection[0].id} reativada`);
          }
        } else {
          // Se estiver pausando, apenas marcar status
          await sql`
          UPDATE elections
          SET status = 'paused'
          WHERE id = (
            SELECT id FROM elections
            WHERE config_id = ${configId}
            ORDER BY created_at DESC
            LIMIT 1
          )
        `;
          logger.info(`  Nomeação ${configId} pausada`);
        }

        logger.info(` [TOGGLE-STATUS] Processo concluído com sucesso para config ${configId}`);

        return res.status(200).json({
          message:
            newStatus === 'active'
              ? 'Nomeação retomada com sucesso'
              : 'Nomeação pausada com sucesso',
          status: newStatus,
          configId: configId,
          timestamp: new Date().toISOString(),
        });
      } catch (error: unknown) {
        const errorConfigId = req.params?.id;
        console.error(`❌ [TOGGLE-STATUS] Erro completo ao processar config ${errorConfigId}:`, {
          error: getErrorMessage(error),
          stack: getErrorStack(error),
          name: error instanceof Error ? error.name : undefined,
          timestamp: new Date().toISOString(),
          configId: errorConfigId,
        });

        return res.status(500).json({
          error: 'Erro interno do servidor',
          details: getErrorMessage(error),
          stack: getErrorStack(error),
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Rota para dashboard do admin com configId específico
  app.get('/api/elections/dashboard/:configId', async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId);

      // Buscar eleição ativa para o configId específico
      const election = await sql`
        SELECT e.*, ec.voters, ec.positions, ec.church_name
        FROM elections e
        JOIN election_configs ec ON e.config_id = ec.id
        WHERE e.config_id = ${configId}
        AND e.status = 'active'
        ORDER BY e.created_at DESC
        LIMIT 1
      `;

      if (election.length === 0) {
        return res.status(404).json({ error: 'Nenhuma eleição ativa para esta configuração' });
      }

      // Garantir que voters seja um array
      const voters = Array.isArray(election[0].voters)
        ? election[0].voters
        : JSON.parse(String(election[0].voters || '[]'));

      // Buscar estatísticas
      const totalVoters = voters.length;
      const votedVoters = await sql`
        SELECT COUNT(DISTINCT voter_id) as count
        FROM election_votes
        WHERE election_id = ${election[0].id}
      `;

      // Buscar todos os resultados de uma vez (otimizado)
      const allResults = (await sql`
        SELECT 
          ev.position_id,
          ev.candidate_id,
          COALESCE(u.name, 'Usuário não encontrado') as candidate_name,
          u.email as candidate_email,
          COUNT(CASE WHEN ev.vote_type = 'nomination' THEN 1 END)::int as nominations,
          COUNT(CASE WHEN ev.vote_type = 'vote' THEN 1 END)::int as votes
        FROM election_votes ev
        LEFT JOIN users u ON ev.candidate_id = u.id
        WHERE ev.election_id = ${election[0].id}
        GROUP BY ev.position_id, ev.candidate_id, u.name, u.email
        HAVING COUNT(CASE WHEN ev.vote_type = 'nomination' THEN 1 END) > 0 
           OR COUNT(CASE WHEN ev.vote_type = 'vote' THEN 1 END) > 0
        ORDER BY ev.position_id, votes DESC, nominations DESC
      `) as ResultRow[];

      logger.debug(' [DASHBOARD] Resultados encontrados:', allResults.length);
      allResults.forEach(r => {
        logger.debug(
          `  - Candidato ${r.candidate_id}: ${r.candidate_name} (${r.nominations} indicações, ${r.votes} votos)`
        );
      });

      // Garantir que positions seja um array
      const electionPositions: string[] = Array.isArray(election[0].positions)
        ? election[0].positions
        : JSON.parse(String(election[0].positions || '[]'));

      // Agrupar resultados por posição
      const positions = [];
      const resultsByPosition = new Map<string, ResultRow[]>();

      // Agrupar resultados por posição
      allResults.forEach(result => {
        const existing = resultsByPosition.get(result.position_id);
        if (existing) {
          existing.push(result);
        } else {
          resultsByPosition.set(result.position_id, [result]);
        }
      });

      // Processar cada posição
      for (const position of electionPositions) {
        const results = resultsByPosition.get(position) ?? [];

        // Converter votos para números e calcular percentuais
        results.forEach(r => {
          r.votes = toNumber(r.votes);
          r.nominations = toNumber(r.nominations);
        });

        const totalVotes = results.reduce((sum, r) => sum + toNumber(r.votes), 0);
        results.forEach(r => {
          r.percentage = totalVotes > 0 ? (toNumber(r.votes) / totalVotes) * 100 : 0;
        });

        const winner = results.length > 0 && toNumber(results[0].votes) > 0 ? results[0] : null;
        const totalNominations = results.reduce((sum, r) => sum + toNumber(r.nominations), 0);

        positions.push({
          position: position,
          totalNominations: totalNominations,
          winner: winner
            ? {
                id: winner.candidate_id,
                name: winner.candidate_name,
                votes: winner.votes,
                percentage: winner.percentage,
              }
            : null,
          results: results.map(r => ({
            id: r.candidate_id,
            name: r.candidate_name || `Candidato ${r.candidate_id}`,
            email: r.candidate_email || '',
            nominations: toNumber(r.nominations),
            votes: toNumber(r.votes),
            percentage: r.percentage || 0,
          })),
        });
      }

      const response = {
        election: {
          id: election[0].id,
          config_id: election[0].config_id,
          status: election[0].status,
          current_position: election[0].current_position,
          current_phase: election[0].current_phase || 'nomination',
          church_name: election[0].church_name,
          created_at: election[0].created_at,
        },
        totalVoters,
        votedVoters: votedVoters[0].count,
        currentPosition: election[0].current_position,
        totalPositions: electionPositions.length,
        positions,
      };

      return res.status(200).json(response);
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar dashboard com configId:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // POST /api/elections/advance-phase - Avançar fase (Admin)
  app.post(
    '/api/elections/advance-phase',
    checkReadOnlyAccess,
    async (req: Request, res: Response) => {
      try {
        const body = req.body;
        const { configId, phase } = body;
        const adminId = parseHeaderUserId(req);

        if (adminId === null) {
          return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        // Verificar se é admin
        const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;

        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return res
            .status(403)
            .json({ error: 'Acesso negado. Apenas administradores podem avançar fases' });
        }

        // Buscar eleição ativa para o configId
        const election = await sql`
        SELECT * FROM elections 
        WHERE config_id = ${configId}
        AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;

        if (election.length === 0) {
          return res.status(404).json({ error: 'Nenhuma eleição ativa para esta configuração' });
        }

        logger.debug(` Atualizando fase da eleição ${election[0].id} para: ${phase}`);

        // Garantir que a coluna current_phase existe (migration)
        try {
          await sql`
          ALTER TABLE elections 
          ADD COLUMN IF NOT EXISTS current_phase VARCHAR(20) DEFAULT 'nomination'
        `;
        } catch (alterError: unknown) {
          logger.warn(
            ' Coluna current_phase já existe ou erro ao adicionar:',
            getErrorMessage(alterError)
          );
        }

        if (phase === 'completed') {
          await sql`
          UPDATE elections 
          SET current_phase = ${phase}, updated_at = NOW()
          WHERE id = ${election[0].id}
        `;
        } else {
          await sql`
          UPDATE elections 
          SET current_phase = ${phase},
              result_announced = false,
              updated_at = NOW()
          WHERE id = ${election[0].id}
        `;
        }

        logger.info(` Fase da eleição ${election[0].id} avançada para: ${phase}`);

        return res.status(200).json({
          message: `Fase avançada para: ${phase}`,
          phase: phase,
          electionId: election[0].id,
        });
      } catch (error: unknown) {
        console.error('❌ Erro ao avançar fase:', error);
        return res
          .status(500)
          .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
      }
    }
  );

  // POST /api/elections/advance-position - Avançar posição (Admin)
  app.post(
    '/api/elections/advance-position',
    checkReadOnlyAccess,
    async (req: Request, res: Response) => {
      try {
        const body = req.body;
        const { configId, position } = body;
        const adminId = parseHeaderUserId(req);

        if (adminId === null) {
          return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        // Verificar se é admin
        const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;

        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return res
            .status(403)
            .json({ error: 'Acesso negado. Apenas administradores podem avançar posições' });
        }

        // Buscar eleição ativa para o configId
        const election = await sql`
        SELECT * FROM elections 
        WHERE config_id = ${configId}
        AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;

        if (election.length === 0) {
          return res.status(404).json({ error: 'Nenhuma eleição ativa para esta configuração' });
        }

        // Atualizar posição atual da eleição e resetar fase para nomination
        await sql`
        UPDATE elections 
        SET current_position = ${position}, 
            current_phase = 'nomination',
            result_announced = false,
            updated_at = NOW()
        WHERE id = ${election[0].id}
      `;

        logger.info(` Posição avançada para ${position} e fase resetada para nomination`);

        return res.status(200).json({
          message: `Posição avançada para: ${position}`,
          currentPosition: position,
          currentPhase: 'nomination',
        });
      } catch (error: unknown) {
        console.error('❌ Erro ao avançar posição:', error);
        return res
          .status(500)
          .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
      }
    }
  );

  // POST /api/elections/announce-result - Divulgar resultado atual (Admin)
  app.post('/api/elections/announce-result', async (req: Request, res: Response) => {
    try {
      const { configId } = req.body;
      const adminId = parseHeaderUserId(req);

      if (adminId === null) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;

      if (!admin[0] || !hasAdminAccess(admin[0])) {
        return res
          .status(403)
          .json({ error: 'Acesso negado. Apenas administradores podem divulgar resultados' });
      }

      await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS result_announced BOOLEAN DEFAULT false
      `;

      const election = await sql`
        SELECT * FROM elections 
        WHERE config_id = ${configId}
        AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (election.length === 0) {
        return res.status(404).json({ error: 'Nenhuma eleição ativa para esta configuração' });
      }

      const config = await sql`
        SELECT positions, voters
        FROM election_configs
        WHERE id = ${configId}
      `;

      if (config.length === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      const positions: string[] = Array.isArray(config[0].positions)
        ? config[0].positions
        : JSON.parse(String(config[0].positions || '[]'));

      if (!positions || positions.length === 0) {
        return res.status(400).json({ error: 'Nenhuma posição configurada nesta eleição' });
      }

      const currentPositionIndex = toNumber(election[0].current_position);
      if (currentPositionIndex >= positions.length) {
        return res.status(400).json({ error: 'Posição atual inválida' });
      }

      const currentPositionName: string = String(positions[currentPositionIndex] || '');

      const voteResults = (await sql`
        SELECT 
          ev.candidate_id,
          COUNT(*)::int as votes
        FROM election_votes ev
        WHERE ev.election_id = ${election[0].id}
          AND ev.position_id = ${currentPositionName}
          AND ev.vote_type = 'vote'
        GROUP BY ev.candidate_id
      `) as VoteResultRow[];

      let winnerInfo: { id: number; name: string; votes: number; percentage: number } | null = null;

      if (voteResults.length > 0) {
        const totalVotes = voteResults.reduce((sum, row) => sum + toNumber(row.votes), 0);
        const sorted = voteResults
          .map(row => ({
            candidate_id: row.candidate_id,
            votes: toNumber(row.votes),
          }))
          .sort((a, b) => b.votes - a.votes);

        if (sorted[0] && sorted[0].votes > 0) {
          const candidateData = await sql`
            SELECT name FROM users WHERE id = ${sorted[0].candidate_id} LIMIT 1
          `;
          const candidateName =
            candidateData.length > 0 ? String(candidateData[0].name || 'Candidato') : 'Candidato';
          const percentage = totalVotes > 0 ? (sorted[0].votes / totalVotes) * 100 : 0;
          winnerInfo = {
            id: sorted[0].candidate_id,
            name: candidateName,
            votes: sorted[0].votes,
            percentage,
          };
        }
      }

      await sql`
        UPDATE elections
        SET result_announced = true,
            updated_at = NOW()
        WHERE id = ${election[0].id}
      `;

      return res.status(200).json({
        message: 'Resultado divulgado com sucesso',
        position: currentPositionName,
        winner: winnerInfo,
      });
    } catch (error: unknown) {
      console.error('❌ Erro ao divulgar resultado:', error);
      return res
        .status(500)
        .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
    }
  });

  // POST /api/elections/reset-voting - Repetir votação da posição atual (Admin)
  app.post('/api/elections/reset-voting', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const { configId } = body;
      const adminId = parseHeaderUserId(req);

      if (adminId === null) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se é admin
      const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;

      if (!admin[0] || !hasAdminAccess(admin[0])) {
        return res
          .status(403)
          .json({ error: 'Acesso negado. Apenas administradores podem repetir votações' });
      }

      // Buscar eleição ativa para o configId
      const election = await sql`
        SELECT e.*, ec.positions
        FROM elections e
        JOIN election_configs ec ON e.config_id = ec.id
        WHERE e.config_id = ${configId}
        AND e.status = 'active'
        ORDER BY e.created_at DESC
        LIMIT 1
      `;

      if (election.length === 0) {
        return res.status(404).json({ error: 'Nenhuma eleição ativa para esta configuração' });
      }

      // Garantir que positions seja um array
      const positions: string[] = Array.isArray(election[0].positions)
        ? election[0].positions
        : JSON.parse(String(election[0].positions || '[]'));

      const currentPositionIndex = toNumber(election[0].current_position);
      if (currentPositionIndex >= positions.length) {
        return res.status(400).json({ error: 'Posição atual inválida' });
      }

      const currentPositionName: string = String(positions[currentPositionIndex] || '');

      logger.debug(` Resetando votos para a posição: ${currentPositionName}`);

      // Deletar todos os votos (vote_type = 'vote') da posição atual
      await sql`
        DELETE FROM election_votes
        WHERE election_id = ${election[0].id}
        AND position_id = ${currentPositionName}
        AND vote_type = 'vote'
      `;

      // Resetar a fase para 'voting' (mantém as indicações)
      await sql`
        UPDATE elections 
        SET current_phase = 'voting',
            result_announced = false,
            updated_at = NOW()
        WHERE id = ${election[0].id}
      `;

      logger.info(` Votação resetada para a posição: ${currentPositionName}`);

      return res.status(200).json({
        message: `Votação repetida com sucesso para: ${currentPositionName}`,
        currentPosition: currentPositionName,
        currentPhase: 'voting',
      });
    } catch (error: unknown) {
      console.error('❌ Erro ao resetar votação:', error);
      return res
        .status(500)
        .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
    }
  });

  // POST /api/elections/set-max-nominations - Configurar número máximo de indicações por votante
  app.post('/api/elections/set-max-nominations', async (req: Request, res: Response) => {
    try {
      const { configId, maxNominations } = req.body;
      const adminId = parseHeaderUserId(req);

      if (adminId === null) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se é admin
      const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;

      if (!admin[0] || !hasAdminAccess(admin[0])) {
        return res
          .status(403)
          .json({ error: 'Acesso negado. Apenas administradores podem alterar configurações' });
      }

      if (!maxNominations || maxNominations < 1) {
        return res.status(400).json({ error: 'Número de indicações deve ser maior que 0' });
      }

      // Criar coluna se não existir
      try {
        await sql`
          ALTER TABLE election_configs 
          ADD COLUMN IF NOT EXISTS max_nominations_per_voter INTEGER DEFAULT 1
        `;
      } catch (alterError: unknown) {
        logger.warn(
          ' Coluna max_nominations_per_voter já existe ou erro ao adicionar:',
          getErrorMessage(alterError)
        );
      }

      // Atualizar configuração da eleição
      await sql`
        UPDATE election_configs 
        SET max_nominations_per_voter = ${maxNominations}
        WHERE id = ${configId}
      `;

      logger.info(` Máximo de indicações atualizado para ${maxNominations} na eleição ${configId}`);

      return res.status(200).json({
        message: `Máximo de indicações atualizado para ${maxNominations}`,
        maxNominations,
      });
    } catch (error: unknown) {
      console.error('❌ Erro ao atualizar configuração:', error);
      return res
        .status(500)
        .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
    }
  });

  // POST /api/elections/nominate - Indicação de candidatos (Fase 1)
  app.post('/api/elections/nominate', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const { electionId, positionId, candidateId } = body;
      const voterId = parseHeaderUserId(req);

      if (voterId === null) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a eleição está ativa
      const election = await sql`
        SELECT * FROM elections 
        WHERE id = ${electionId}
        AND status = 'active'
      `;

      if (election.length === 0) {
        return res.status(404).json({ error: 'Eleição não encontrada ou inativa' });
      }

      // Verificar se o usuário já indicou para esta posição
      const existingNomination = await sql`
        SELECT * FROM election_votes
        WHERE election_id = ${electionId}
        AND voter_id = ${voterId}
        AND position_id = ${positionId}
        AND vote_type = 'nomination'
      `;

      if (existingNomination.length > 0) {
        return res.status(400).json({ error: 'Você já indicou um candidato para esta posição' });
      }

      // Registrar indicação
      await sql`
        INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
        VALUES (${electionId}, ${voterId}, ${positionId}, ${candidateId}, 'nomination')
      `;

      // Atualizar contador de indicações
      await sql`
        UPDATE election_candidates 
        SET nominations = nominations + 1
        WHERE election_id = ${electionId}
        AND position_id = ${positionId}
        AND candidate_id = ${candidateId}
      `;

      return res.status(200).json({ message: 'Indicação registrada com sucesso' });
    } catch (error: unknown) {
      console.error('❌ Erro ao registrar indicação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para excluir uma configuração específica
  app.delete(
    '/api/elections/config/:configId',
    checkReadOnlyAccess,
    async (req: Request, res: Response) => {
      try {
        const configId = parseInt(req.params.configId);
        const adminId = parseHeaderUserId(req);

        if (adminId === null) {
          return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        // Verificar se é admin
        const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;

        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return res
            .status(403)
            .json({ error: 'Acesso negado. Apenas administradores podem excluir configurações' });
        }

        // Verificar se a configuração existe
        const config = await sql`
        SELECT * FROM election_configs WHERE id = ${configId}
      `;

        if (config.length === 0) {
          return res.status(404).json({ error: 'Configuração não encontrada' });
        }

        // Finalizar eleições ativas primeiro
        await sql`
        UPDATE elections 
        SET status = 'completed', updated_at = NOW()
        WHERE config_id = ${configId} AND status = 'active'
      `;

        // Excluir todas as eleições relacionadas
        await sql`DELETE FROM election_votes WHERE election_id IN (SELECT id FROM elections WHERE config_id = ${configId})`;
        await sql`DELETE FROM election_candidates WHERE election_id IN (SELECT id FROM elections WHERE config_id = ${configId})`;
        await sql`DELETE FROM elections WHERE config_id = ${configId}`;

        // Excluir a configuração
        await sql`DELETE FROM election_configs WHERE id = ${configId}`;

        logger.info(` Configuração ${configId} excluída com sucesso`);

        return res.status(200).json({ message: 'Configuração excluída com sucesso' });
      } catch (error: unknown) {
        console.error('❌ Erro ao excluir configuração:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );

  // Rota para aprovar todos os membros
  app.post('/api/elections/approve-all-members', async (req: Request, res: Response) => {
    try {
      const adminId = parseHeaderUserId(req);

      if (adminId === null) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se é admin
      const admin = await sql`
        SELECT role FROM users WHERE id = ${adminId}
      `;

      if (!admin[0] || !hasAdminAccess(admin[0])) {
        return res
          .status(403)
          .json({ error: 'Acesso negado. Apenas administradores podem aprovar membros' });
      }

      logger.info(' Aprovando todos os membros do sistema...');

      // Aprovar todos os membros
      await sql`
        UPDATE users 
        SET status = 'approved', is_approved = true, updated_at = NOW()
        WHERE status != 'approved' OR is_approved = false
      `;

      // Contar total de membros aprovados
      const totalApproved = await sql`
        SELECT COUNT(*) as count FROM users WHERE is_approved = true
      `;

      const approvedCount = parseCount(totalApproved[0]);
      logger.info(` ${approvedCount} membros aprovados no total!`);

      return res.json({
        message: `Todos os membros foram aprovados! Total: ${approvedCount} membros aprovados.`,
        approved_count: approvedCount,
      });
    } catch (error: unknown) {
      console.error('❌ Erro ao aprovar membros:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para limpar todas as votações
  app.get('/api/elections/cleanup', async (_req: Request, res: Response) => {
    try {
      logger.debug(' Iniciando limpeza de todas as votações...');

      // Limpar tabelas de eleições
      await sql`DELETE FROM election_votes`;
      logger.info(' Tabela election_votes limpa');

      await sql`DELETE FROM election_candidates`;
      logger.info(' Tabela election_candidates limpa');

      await sql`DELETE FROM elections`;
      logger.info(' Tabela elections limpa');

      await sql`DELETE FROM election_configs`;
      logger.info(' Tabela election_configs limpa');

      logger.info(' Limpeza concluída com sucesso!');

      return res.status(200).json({
        message: 'Todas as votações foram limpas com sucesso',
        cleaned: {
          election_votes: true,
          election_candidates: true,
          elections: true,
          election_configs: true,
        },
      });
    } catch (error: unknown) {
      console.error('❌ Erro na limpeza:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para listar eleições ativas para membros
  app.get('/api/elections/active', async (req: Request, res: Response) => {
    try {
      const voterId = parseHeaderUserId(req);

      if (voterId === null) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar dados do usuário para verificar sua igreja
      const userResult = await sql`
        SELECT id, church FROM users WHERE id = ${voterId}
      `;

      if (userResult.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const userChurch = userResult[0].church;
      logger.debug(` Buscando eleições ativas para usuário ${voterId}, igreja: ${userChurch}`);

      // Buscar eleições ativas onde o usuário é votante E a eleição é da igreja do usuário
      const activeElections = await sql`
        SELECT 
          e.id as election_id,
          e.config_id,
          e.current_position,
          e.current_phase,
          e.created_at,
          ec.church_name,
          ec.title,
          ec.positions,
          ec.voters,
          ec.church_id
        FROM elections e
        JOIN election_configs ec ON e.config_id = ec.id
        WHERE e.status = 'active'
        AND ${voterId} = ANY(ec.voters)
        AND (ec.church_name = ${userChurch} OR ${userChurch} IS NULL OR ${userChurch} = '')
        ORDER BY e.created_at DESC
      `;

      logger.debug(` Eleições ativas encontradas: ${activeElections.length}`);

      if (activeElections.length === 0) {
        return res.status(404).json({ error: 'Nenhuma eleição ativa encontrada' });
      }

      // Retornar a primeira eleição ativa (pode haver apenas uma)
      return res.json({
        elections: activeElections.map(election => ({
          election_id: election.election_id,
          config_id: election.config_id,
          current_position: election.current_position,
          current_phase: election.current_phase,
          church_name: election.church_name,
          title: election.title || '',
          positions: election.positions,
          voters: election.voters,
          created_at: election.created_at,
          status: 'active',
        })),
        hasActiveElection: activeElections.length > 0,
      });
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar eleições ativas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para interface de votação dos membros
  app.get('/api/elections/voting/:configId', async (req: Request, res: Response) => {
    try {
      const { configId } = req.params;
      const voterId = parseHeaderUserId(req);

      logger.debug(` Interface de votação para configId: ${configId}, voterId: ${voterId}`);

      // Buscar eleição ativa real
      const election = await sql`
        SELECT * FROM elections 
        WHERE config_id = ${configId} AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      if (election.length === 0) {
        // Log detalhado para debug
        const allElectionsForConfig = await sql`
          SELECT id, config_id, status, current_phase, created_at 
          FROM elections 
          WHERE config_id = ${configId}
          ORDER BY created_at DESC
        `;
        logger.warn(` Nenhuma eleição ativa encontrada para configId ${configId}`);
        logger.debug(` Eleições existentes para este config:`, allElectionsForConfig);

        return res.status(404).json({
          error: 'Nenhuma eleição ativa encontrada',
          details: {
            configId,
            existingElections: allElectionsForConfig.map(e => ({
              id: e.id,
              status: e.status,
              phase: e.current_phase,
              created: e.created_at,
            })),
          },
        });
      }

      // Buscar configuração para obter posições
      const config = await sql`
        SELECT * FROM election_configs WHERE id = ${configId}
      `;

      if (config.length === 0) {
        return res.status(404).json({ error: 'Configuração de eleição não encontrada' });
      }

      // Log detalhado do removed_candidates
      logger.debug(' [VOTING] Config carregado:', {
        configId,
        removed_candidates_raw: config[0].removed_candidates,
        removed_candidates_type: typeof config[0].removed_candidates,
        removed_candidates_isArray: Array.isArray(config[0].removed_candidates),
      });

      // Garantir que positions seja um array
      const positions: string[] = Array.isArray(config[0].positions)
        ? config[0].positions
        : JSON.parse(String(config[0].positions || '[]'));

      if (!positions || positions.length === 0) {
        logger.warn(' Nenhuma posição configurada na eleição');
        return res.status(400).json({ error: 'Configuração inválida: nenhuma posição encontrada' });
      }

      const currentPositionIndex = toNumber(election[0].current_position);

      if (currentPositionIndex >= positions.length) {
        logger.warn(' Posição atual inválida:', currentPositionIndex, 'de', positions.length);
        return res.status(400).json({ error: 'Posição atual inválida na eleição' });
      }

      const currentPositionName: string = String(positions[currentPositionIndex] || '');
      const currentPhase = election[0].current_phase || 'nomination';

      // Buscar candidatos com base na fase
      let candidates: CandidateRow[] = [];
      let totalVotesCount = 0;
      let votedVotersCount = 0;
      let allVotesCast = false;
      let winnerInfo: { id: number; name: string; votes: number; percentage: number } | null = null;
      let voteResults: VoteResultRow[] = [];
      const votersArray = Array.isArray(config[0].voters)
        ? config[0].voters
        : JSON.parse(String(config[0].voters || '[]'));
      let effectiveTotalVoters = votersArray.length;

      if (currentPhase === 'voting') {
        // Na fase de votação, mostrar apenas os candidatos que foram indicados
        candidates = await sql`
          SELECT DISTINCT
            ev.candidate_id as id,
            u.name,
            u.church as unit,
            u.nome_unidade,
            u.birth_date,
            u.extra_data,
            0 as points,
            COUNT(*) as nominations
          FROM election_votes ev
          LEFT JOIN users u ON ev.candidate_id = u.id
          WHERE ev.election_id = ${election[0].id}
          AND ev.position_id = ${currentPositionName}
          AND ev.vote_type = 'nomination'
          GROUP BY ev.candidate_id, u.name, u.church, u.nome_unidade, u.birth_date, u.extra_data
          ORDER BY u.name
        `;

        voteResults = (await sql`
          SELECT 
            ev.candidate_id,
            COUNT(*)::int as votes
          FROM election_votes ev
          WHERE ev.election_id = ${election[0].id}
            AND ev.position_id = ${currentPositionName}
            AND ev.vote_type = 'vote'
          GROUP BY ev.candidate_id
        `) as VoteResultRow[];

        totalVotesCount = voteResults.reduce(
          (sum, row) => sum + (parseInt(String(row.votes), 10) || 0),
          0
        );

        const distinctVotersResult = await sql`
          SELECT COUNT(DISTINCT voter_id)::int as count
          FROM election_votes
          WHERE election_id = ${election[0].id}
            AND position_id = ${currentPositionName}
            AND vote_type = 'vote'
        `;
        votedVotersCount =
          distinctVotersResult.length > 0 ? parseCount(distinctVotersResult[0]) : 0;

        if (effectiveTotalVoters === 0) {
          effectiveTotalVoters = Math.max(votedVotersCount, totalVotesCount);
        }

        if (
          effectiveTotalVoters > 0 &&
          (votedVotersCount >= effectiveTotalVoters || totalVotesCount >= effectiveTotalVoters)
        ) {
          allVotesCast = true;
        }
      } else {
        // Na fase de indicação, mostrar todos os candidatos elegíveis
        candidates = await sql`
          SELECT 
            ec.candidate_id as id,
            u.name,
            u.church as unit,
            u.nome_unidade,
            COALESCE(u.points, 0) as points
          FROM election_candidates ec
          LEFT JOIN users u ON ec.candidate_id = u.id
          WHERE ec.election_id = ${election[0].id}
          AND ec.position_id = ${currentPositionName}
          ORDER BY u.name
        `;
      }

      // Verificar se o votante já votou para a posição atual
      const hasVoted = await sql`
        SELECT COUNT(*) FROM election_votes
        WHERE election_id = ${election[0].id}
        AND position_id = ${currentPositionName}
        AND voter_id = ${voterId}
        AND vote_type = 'vote'
      `;

      const hasNominated = await sql`
        SELECT COUNT(*) FROM election_votes
        WHERE election_id = ${election[0].id}
        AND position_id = ${currentPositionName}
        AND voter_id = ${voterId}
        AND vote_type = 'nomination'
      `;

      const nominationCount = parseCount(hasNominated[0]);

      // Buscar nome do candidato votado
      let votedCandidateName = null;
      if (parseCount(hasVoted[0]) > 0) {
        const userVote = await sql`
          SELECT ev.candidate_id, u.name
          FROM election_votes ev
          LEFT JOIN users u ON ev.candidate_id = u.id
          WHERE ev.election_id = ${election[0].id}
          AND ev.position_id = ${currentPositionName}
          AND ev.voter_id = ${voterId}
          AND ev.vote_type = 'vote'
          LIMIT 1
        `;
        if (userVote.length > 0) {
          votedCandidateName = userVote[0].name;
        }
      }

      // Normalizar estrutura dos candidatos
      let normalizedCandidates: NormalizedCandidate[] = candidates.flatMap(c => {
        const candidateId = c.id ?? c.candidate_id;
        if (candidateId == null) {
          return [];
        }
        return [
          {
            id: Number(candidateId),
            name: c.name || c.candidate_name || 'Candidato',
            unit: c.unit || c.church || 'N/A',
            birthDate: c.birth_date || c.birthDate || null,
            extraData: (() => {
              try {
                return typeof c.extra_data === 'string'
                  ? JSON.parse(c.extra_data)
                  : c.extra_data || null;
              } catch {
                return null;
              }
            })(),
            nomeUnidade: c.nome_unidade || c.nomeUnidade || null,
            points: toNumber(c.points ?? 0),
            nominations: toNumber(c.nominations ?? 0),
            votes: toNumber(c.votes ?? 0),
            percentage: toNumber(c.percentage ?? 0),
          },
        ];
      });

      if (currentPhase === 'voting') {
        const voteMap = new Map<number, number>();
        voteResults.forEach(row => {
          voteMap.set(row.candidate_id, parseInt(String(row.votes), 10) || 0);
        });

        const votesTotal = Array.from(voteMap.values()).reduce((sum, value) => sum + value, 0);
        normalizedCandidates = normalizedCandidates.map(candidate => {
          const candidateVotes = voteMap.get(candidate.id) || 0;
          return {
            ...candidate,
            votes: candidateVotes,
            percentage: votesTotal > 0 ? (candidateVotes / votesTotal) * 100 : 0,
          };
        });

        if (!winnerInfo && normalizedCandidates.length > 0) {
          const topCandidate = [...normalizedCandidates].sort((a, b) => b.votes - a.votes)[0];
          if (topCandidate && topCandidate.votes > 0) {
            winnerInfo = {
              id: topCandidate.id,
              name: topCandidate.name,
              votes: topCandidate.votes,
              percentage: topCandidate.percentage,
            };
          }
        }

        totalVotesCount = votesTotal;

        if (effectiveTotalVoters === 0) {
          effectiveTotalVoters = Math.max(votedVotersCount, votesTotal);
        }

        if (
          effectiveTotalVoters > 0 &&
          (votesTotal >= effectiveTotalVoters || votedVotersCount >= effectiveTotalVoters)
        ) {
          allVotesCast = true;
        }
      }

      if (currentPhase === 'completed') {
        allVotesCast = true;
        if (effectiveTotalVoters === 0) {
          effectiveTotalVoters = Math.max(votedVotersCount, totalVotesCount);
        }
      }

      const isTeenPosition =
        typeof currentPositionName === 'string' &&
        currentPositionName.toLowerCase().includes('teen');

      if (isTeenPosition) {
        normalizedCandidates = normalizedCandidates.filter(candidate => {
          let age: number | null = null;
          if (candidate.birthDate) {
            const birthDate = new Date(candidate.birthDate);
            if (!Number.isNaN(birthDate.getTime())) {
              age = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
            }
          } else if (candidate.extraData && candidate.extraData.idade) {
            const parsed = parseInt(String(candidate.extraData.idade), 10);
            age = Number.isNaN(parsed) ? null : parsed;
          }
          const eligible = age !== null && age >= 10 && age <= 15;
          if (!eligible) {
            logger.warn(
              ` Removendo candidato ${candidate.name} da lista Teen (idade=${age ?? 'desconhecida'})`
            );
          }
          return eligible;
        });
      }

      // Filtrar candidatos removidos manualmente pelo admin
      logger.debug(' [VOTING] Verificando removed_candidates do config:', {
        raw: config[0].removed_candidates,
        type: typeof config[0].removed_candidates,
        isArray: Array.isArray(config[0].removed_candidates),
      });

      let removedCandidates: number[] = [];
      if (config[0].removed_candidates) {
        if (Array.isArray(config[0].removed_candidates)) {
          removedCandidates = config[0].removed_candidates;
        } else if (typeof config[0].removed_candidates === 'string') {
          try {
            removedCandidates = JSON.parse(config[0].removed_candidates || '[]');
          } catch (e) {
            console.error('❌ [VOTING] Erro ao parsear removed_candidates:', e);
            removedCandidates = [];
          }
        }
      }

      logger.debug(' [VOTING] removed_candidates parseado:', removedCandidates);
      logger.debug(' [VOTING] Total de candidatos antes do filtro:', normalizedCandidates.length);

      if (removedCandidates.length > 0) {
        const beforeCount = normalizedCandidates.length;
        normalizedCandidates = normalizedCandidates.filter(candidate => {
          const isRemoved = removedCandidates.includes(candidate.id);
          if (isRemoved) {
            logger.warn(
              ` [VOTING] Removendo candidato ${candidate.name} (id: ${candidate.id}) - removido manualmente pelo admin`
            );
          }
          return !isRemoved;
        });
        logger.debug(
          ` [VOTING] Filtro de candidatos removidos: ${beforeCount} → ${normalizedCandidates.length} (removidos: ${beforeCount - normalizedCandidates.length})`
        );
      } else {
        logger.debug(' [VOTING] Nenhum candidato removido encontrado no config');
      }

      normalizedCandidates = normalizedCandidates.map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        unit: candidate.unit,
        birthDate: candidate.birthDate,
        extraData: candidate.extraData,
        nomeUnidade: candidate.nomeUnidade || null,
        points: candidate.points,
        nominations: candidate.nominations,
        votes: candidate.votes,
        percentage: candidate.percentage,
      }));

      const resultAnnounced = Boolean(election[0].result_announced);
      if (resultAnnounced) {
        allVotesCast = true;
        if (effectiveTotalVoters === 0) {
          effectiveTotalVoters = Math.max(votedVotersCount, totalVotesCount);
        }
      }

      logger.debug(' Status da votação', {
        configId,
        position: currentPositionName,
        currentPhase,
        effectiveTotalVoters,
        totalVotesCount,
        votedVotersCount,
        allVotesCast,
        winner: winnerInfo
          ? { id: winnerInfo.id, votes: winnerInfo.votes, percentage: winnerInfo.percentage }
          : null,
      });

      const maxNominationsPerVoter = toNumber(config[0].max_nominations_per_voter) || 1;
      const hasReachedNominationLimit = nominationCount >= maxNominationsPerVoter;

      const response = {
        election: {
          id: election[0].id,
          config_id: election[0].config_id,
          status: election[0].status,
          current_phase: election[0].current_phase,
        },
        currentPosition: election[0].current_position,
        totalPositions: positions.length,
        currentPositionName: currentPositionName,
        candidates: normalizedCandidates,
        phase: election[0].current_phase || 'nomination',
        hasVoted: parseCount(hasVoted[0]) > 0,
        hasNominated: hasReachedNominationLimit,
        nominationCount: nominationCount,
        maxNominationsPerVoter: maxNominationsPerVoter,
        totalVoters: effectiveTotalVoters,
        totalVotes: totalVotesCount,
        votersWhoVoted: votedVotersCount,
        allVotesCast,
        resultAnnounced,
        winner: winnerInfo,
        userVote: null,
        votedCandidateName: votedCandidateName,
      };

      logger.info(
        ` Interface de votação carregada: ${normalizedCandidates.length} candidatos com nomes reais`
      );

      return res.json(response);
    } catch (error: unknown) {
      console.error('❌ Erro na interface de votação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para obter log de votos
  app.get('/api/elections/vote-log/:electionId', async (req: Request, res: Response) => {
    try {
      const { electionId } = req.params;

      logger.debug(` Buscando log de votos para eleição: ${electionId}`);

      // Buscar todos os votos E indicações da eleição com informações do votante e candidato
      const votes = await sql`
        SELECT 
          ev.id,
          ev.voter_id,
          ev.candidate_id,
          ev.position_id,
          ev.vote_type,
          ev.voted_at as created_at,
          u_voter.name as voter_name,
          u_candidate.name as candidate_name
        FROM election_votes ev
        LEFT JOIN users u_voter ON ev.voter_id = u_voter.id
        LEFT JOIN users u_candidate ON ev.candidate_id = u_candidate.id
        WHERE ev.election_id = ${electionId}
        ORDER BY ev.voted_at DESC
      `;

      logger.info(` Log encontrado: ${votes.length} registro(s) (votos + indicações)`);

      return res.json(votes);
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar log de votos:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota de debug para verificar candidatos
  app.get('/api/elections/debug/:electionId', async (req: Request, res: Response) => {
    try {
      const electionId = parseInt(req.params.electionId);

      const candidates = await sql`
        SELECT * FROM election_candidates 
        WHERE election_id = ${electionId}
        ORDER BY position_id, candidate_name
      `;

      const votes = await sql`
        SELECT * FROM election_votes 
        WHERE election_id = ${electionId}
        ORDER BY position_id, voter_id
      `;

      return res.status(200).json({
        electionId,
        candidates,
        votes,
        totalCandidates: candidates.length,
        totalVotes: votes.length,
      });
    } catch (error: unknown) {
      console.error('❌ Erro no debug:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // POST /api/elections/vote - Votação (Fase 3)
  app.post('/api/elections/vote', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const { electionId, positionId, candidateId, configId, phase } = body;
      const voterId = parseHeaderUserId(req);

      logger.debug(' Recebendo voto/indicação:', { configId, candidateId, phase, voterId });

      if (voterId === null) {
        logger.warn(' Usuário não autenticado');
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      let election: ElectionRow[] = [];
      let currentPositionName: string;
      let voteType: string;

      // Suportar dois formatos: antigo (electionId+positionId) e novo (configId+phase)
      if (configId && phase) {
        logger.debug(' Formato novo: configId + phase');
        // Formato novo: configId + phase
        election = await sql`
          SELECT 
            e.id as election_id,
            e.config_id,
            e.status,
            e.current_position,
            e.current_phase,
            e.created_at,
            e.updated_at,
            ec.positions,
            ec.max_nominations_per_voter
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.config_id = ${configId}
          AND e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        logger.debug(' Eleição encontrada:', election.length > 0 ? 'SIM' : 'NÃO');
        if (election.length > 0) {
          logger.debug(' Dados brutos da eleição:', JSON.stringify(election[0]));
        }

        if (election.length === 0) {
          logger.warn(' Eleição não encontrada');
          return res.status(404).json({ error: 'Eleição não encontrada ou inativa' });
        }

        // Garantir que positions seja um array
        const positions = Array.isArray(election[0].positions)
          ? election[0].positions
          : JSON.parse(String(election[0].positions || '[]'));

        if (!positions || positions.length === 0) {
          logger.warn(' Nenhuma posição configurada na eleição');
          return res
            .status(400)
            .json({ error: 'Configuração inválida: nenhuma posição encontrada' });
        }

        const currentPos = election[0].current_position || 0;
        if (currentPos >= positions.length) {
          logger.warn(' Posição atual inválida:', currentPos, 'de', positions.length);
          return res.status(400).json({ error: 'Posição atual inválida na eleição' });
        }

        currentPositionName = positions[currentPos];
        voteType = phase === 'nomination' ? 'nomination' : 'vote';

        logger.debug(' Dados da eleição:', {
          electionId: election[0].election_id,
          currentPosition: election[0].current_position,
          currentPositionName,
          voteType,
          maxNominations: election[0].max_nominations_per_voter,
        });

        // Verificar limite de indicações para fase de nomination
        if (phase === 'nomination') {
          const maxNominations = election[0].max_nominations_per_voter || 1;

          const existingNominations = await sql`
            SELECT COUNT(*) as count FROM election_votes
            WHERE election_id = ${election[0].election_id}
            AND voter_id = ${voterId}
            AND position_id = ${currentPositionName}
            AND vote_type = 'nomination'
          `;

          const nominationCount = parseCount(existingNominations[0]);

          logger.debug(` Limite de indicações: ${nominationCount}/${maxNominations}`);

          if (nominationCount >= maxNominations) {
            logger.warn(' Limite de indicações atingido');
            return res.status(400).json({
              error: `Você já atingiu o limite de ${maxNominations} indicação(ões) para esta posição`,
            });
          }
        } else {
          // Verificar se já votou (fase de votação)
          const existingVote = await sql`
            SELECT * FROM election_votes
            WHERE election_id = ${election[0].election_id}
            AND voter_id = ${voterId}
            AND position_id = ${currentPositionName}
            AND vote_type = 'vote'
          `;

          if (existingVote.length > 0) {
            logger.warn(' Já votou para esta posição');
            return res.status(400).json({ error: 'Você já votou para esta posição' });
          }
        }

        logger.info(' Registrando indicação/voto...');

        // Registrar voto ou indicação
        const result = await sql`
          INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
          VALUES (${election[0].election_id}, ${voterId}, ${currentPositionName}, ${candidateId}, ${voteType})
          RETURNING *
        `;

        logger.info(' Indicação/voto registrado com sucesso:', result[0]);

        // Atualizar contagem no election_candidates
        if (voteType === 'nomination') {
          const candidateRecord = await sql`
            SELECT * FROM election_candidates 
            WHERE election_id = ${election[0].election_id}
            AND position_id = ${currentPositionName}
            AND candidate_id = ${candidateId}
          `;

          if (candidateRecord.length === 0) {
            await sql`
              INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, nominations, votes)
              VALUES (${election[0].election_id}, ${currentPositionName}, ${candidateId}, '', 1, 0)
            `;
          } else {
            await sql`
              UPDATE election_candidates 
              SET nominations = nominations + 1
              WHERE election_id = ${election[0].election_id}
              AND position_id = ${currentPositionName}
              AND candidate_id = ${candidateId}
            `;
          }
        } else {
          const candidateRecord = await sql`
            SELECT * FROM election_candidates 
            WHERE election_id = ${election[0].election_id}
            AND position_id = ${currentPositionName}
            AND candidate_id = ${candidateId}
          `;

          if (candidateRecord.length === 0) {
            await sql`
              INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, nominations, votes)
              VALUES (${election[0].election_id}, ${currentPositionName}, ${candidateId}, '', 0, 1)
            `;
          } else {
            await sql`
              UPDATE election_candidates 
              SET votes = votes + 1
              WHERE election_id = ${election[0].election_id}
              AND position_id = ${currentPositionName}
              AND candidate_id = ${candidateId}
            `;
          }
        }
      } else {
        // Formato antigo: electionId + positionId
        election = await sql`
          SELECT * FROM elections 
          WHERE id = ${electionId}
          AND status = 'active'
        `;

        if (election.length === 0) {
          return res.status(404).json({ error: 'Eleição não encontrada ou inativa' });
        }

        // Verificar se o usuário já votou para esta posição
        const existingVote = await sql`
          SELECT * FROM election_votes
          WHERE election_id = ${electionId}
          AND voter_id = ${voterId}
          AND position_id = ${positionId}
          AND vote_type = 'vote'
        `;

        if (existingVote.length > 0) {
          return res.status(400).json({ error: 'Você já votou para esta posição' });
        }

        // Registrar voto
        await sql`
          INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
          VALUES (${electionId}, ${voterId}, ${positionId}, ${candidateId}, 'vote')
        `;

        // Atualizar contador de votos
        await sql`
          UPDATE election_candidates 
          SET votes = votes + 1
          WHERE election_id = ${electionId}
          AND position_id = ${positionId}
          AND candidate_id = ${candidateId}
        `;
      }

      logger.info(' Retornando sucesso');
      return res.status(200).json({ message: 'Voto registrado com sucesso' });
    } catch (error: unknown) {
      console.error('❌ Erro ao registrar voto:', error);
      console.error('❌ Stack trace:', getErrorStack(error));
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: getErrorMessage(error),
      });
    }
  });
};
