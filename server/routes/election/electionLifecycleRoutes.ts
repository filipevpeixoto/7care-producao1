import {
  sql,
  getRepository,
  hasAdminAccess,
  logger,
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendValidationError,
  getErrorMessage,
  getErrorStack,
  parseHeaderUserId,
  toNumber,
  createCheckReadOnlyAccess,
  type UserRepository,
  type Express,
  type Request,
  type Response,
  type ElectionCriteria,
  type MemberRow,
} from './electionHelpers';

export const electionLifecycleRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository') as UserRepository;
  const checkReadOnlyAccess = createCheckReadOnlyAccess(userRepo);

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
        return sendNotFound(res, 'Configuração não encontrada');
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

      if (!positions || positions.length === 0) {
        logger.warn(' Nenhuma posição configurada na eleição');
        return sendValidationError(res, {
          message: 'Configuração inválida: nenhuma posição encontrada',
        });
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

      return sendSuccess(res, {
        electionId: currentElection.id,
        message: 'Nomeação iniciada com sucesso',
      });
    } catch (error: unknown) {
      logger.error('❌ Erro ao iniciar eleição:', error);
      logger.error('❌ Stack trace:', getErrorStack(error));
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
          logger.error(`❌ [TOGGLE-STATUS] configId inválido:`, configId);
          return sendValidationError(res, { message: 'ID da configuração inválido' });
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
          logger.error(`❌ [TOGGLE-STATUS] Config ${configId} não encontrada`);
          return sendNotFound(res, 'Configuração não encontrada');
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

        return sendSuccess(res, {
          message:
            newStatus === 'active'
              ? 'Nomeação retomada com sucesso'
              : 'Nomeação pausada com sucesso',
          status: newStatus,
          configId,
          timestamp: new Date().toISOString(),
        });
      } catch (error: unknown) {
        const errorConfigId = req.params?.id;
        logger.error(`❌ [TOGGLE-STATUS] Erro completo ao processar config ${errorConfigId}:`, {
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
          return sendUnauthorized(res, 'Usuário não autenticado');
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
          return sendNotFound(res, 'Nenhuma eleição ativa para esta configuração');
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

        return sendSuccess(res, {
          message: `Fase avançada para: ${phase}`,
          phase,
          electionId: election[0].id,
        });
      } catch (error: unknown) {
        logger.error('❌ Erro ao avançar fase:', error);
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
          return sendUnauthorized(res, 'Usuário não autenticado');
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
          return sendNotFound(res, 'Nenhuma eleição ativa para esta configuração');
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

        return sendSuccess(res, {
          message: `Posição avançada para: ${position}`,
          currentPosition: position,
          currentPhase: 'nomination',
        });
      } catch (error: unknown) {
        logger.error('❌ Erro ao avançar posição:', error);
        return res
          .status(500)
          .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
      }
    }
  );
};
