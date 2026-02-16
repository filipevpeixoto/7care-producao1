import {
  sql,
  getRepository,
  hasAdminAccess,
  logger,
  getErrorMessage,
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendInternalError,
  parseHeaderUserId,
  parseIdValue,
  getDistrictFilterForUser,
  createCheckReadOnlyAccess,
  type UserRepository,
  type Express,
  type Request,
  type Response,
  type ElectionConfigRow,
} from './electionHelpers';

export const electionConfigRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository') as UserRepository;
  const checkReadOnlyAccess = createCheckReadOnlyAccess(userRepo);

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

      return sendSuccess(res, result[0]);
    } catch (error: unknown) {
      logger.error('❌ Erro ao salvar configuração:', error);
      return sendInternalError(res, 'Erro interno do servidor');
    }
  });

  // Rota para atualizar configuração existente
  app.put('/api/elections/config/:id', checkReadOnlyAccess, async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.id, 10);

      if (!configId) {
        return sendValidationError(res, { message: 'ID da configuração inválido' });
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
        return sendNotFound(res, 'Configuração não encontrada');
      }

      logger.info(' Configuração de eleição atualizada:', configId);

      return sendSuccess(res, {
        message: 'Configuração atualizada com sucesso',
        config: updatedConfig[0],
      });
    } catch (error: unknown) {
      logger.error('❌ Erro ao atualizar configuração:', error);
      return sendInternalError(res, 'Erro interno do servidor');
    }
  });

  // GET /api/elections/config/:id - Buscar uma configuração específica
  app.get('/api/elections/config/:id', async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.id, 10);
      const userId = parseHeaderUserId(req);

      // Verificar filtro de distrito para pastores
      const districtFilter = await getDistrictFilterForUser(userId, userRepo);

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
        return sendNotFound(res, 'Configuração não encontrada');
      }

      // Se pastor com distrito, verificar se a config é de uma igreja do distrito
      const configData = config[0] as ElectionConfigRow;
      if (districtFilter.hasDistrictFilter) {
        const churchName = configData.church_name as string | null;
        if (churchName && !districtFilter.churchNames.includes(churchName)) {
          return sendForbidden(res, 'Acesso não autorizado a esta configuração');
        }
      }

      // Garantir que removed_candidates está parseado corretamente
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

      return sendSuccess(res, configData);
    } catch (error: unknown) {
      logger.error('❌ Erro ao buscar configuração:', error);
      return sendInternalError(res, 'Erro interno do servidor');
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
          return sendNotFound(res, 'Configuração não encontrada');
        }

        const configData = parseRemovedCandidates(config[0]);
        logger.debug(
          ' [GET CONFIG] Retornando config (query):',
          configId,
          'removed_candidates:',
          configData.removed_candidates
        );
        return sendSuccess(res, configData);
      } 
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
          return sendNotFound(res, 'Nenhuma configuração encontrada');
        }

        const configData = parseRemovedCandidates(config[0]);
        return sendSuccess(res, configData);
      
    } catch (error: unknown) {
      logger.error('❌ Erro ao buscar configuração:', error);
      return sendInternalError(res, 'Erro interno do servidor');
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
          SELECT id, church, role, email, district_id FROM users WHERE id = ${requestingUserId}
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

      // Verificar se é pastor com distrito (para filtro por distrito)
      const isPastorWithDistrict =
        requestingUser && requestingUser.role === 'pastor' && requestingUser.district_id;

      let configs: Record<string, unknown>[] = [];

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
      } else if (isPastorWithDistrict) {
        // Pastor vê configurações das igrejas do seu distrito
        const districtChurches = await sql<{ name: string }>`
          SELECT name FROM churches WHERE district_id = ${requestingUser!.district_id}
        `;
        const churchNames = districtChurches.map(c => c.name);

        if (churchNames.length > 0) {
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
            WHERE ec.church_name = ANY(${churchNames})
            ORDER BY ec.id, ec.created_at DESC
          `;
        } else {
          configs = [];
        }
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
        ` [GET CONFIGS] Retornando ${configs.length} configurações para usuário ${requestingUserId} (igreja: ${userChurch || 'todas'}, pastor: ${isPastorWithDistrict ? 'sim' : 'não'})`
      );

      return sendSuccess(res, configs);
    } catch (error: unknown) {
      logger.error('❌ Erro ao buscar configurações:', error);
      return sendInternalError(res, 'Erro interno do servidor');
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
          return sendUnauthorized(res, 'Usuário não autenticado');
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
          return sendNotFound(res, 'Configuração não encontrada');
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

        return sendSuccess(res, { message: 'Configuração excluída com sucesso' });
      } catch (error: unknown) {
        logger.error('❌ Erro ao excluir configuração:', error);
        return sendInternalError(res, 'Erro interno do servidor');
      }
    }
  );
};
