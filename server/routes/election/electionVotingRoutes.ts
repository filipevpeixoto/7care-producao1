import {
  sql,
  parseHeaderUserId,
  toNumber,
  parseCount,
  getErrorMessage,
  getErrorStack,
  logger,
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendValidationError,
  sendInternalError,
  type Express,
  type Request,
  type Response,
  type ElectionRow,
  type CandidateRow,
  type NormalizedCandidate,
  type VoteResultRow,
} from './electionHelpers';

export const electionVotingRoutes = (app: Express): void => {
  // POST /api/elections/nominate - Indicação de candidatos (Fase 1)
  app.post('/api/elections/nominate', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const { electionId, positionId, candidateId } = body;
      const voterId = parseHeaderUserId(req);

      if (voterId === null) {
        return sendUnauthorized(res, 'Usuário não autenticado');
      }

      // Verificar se a eleição está ativa
      const election = await sql`
        SELECT * FROM elections 
        WHERE id = ${electionId}
        AND status = 'active'
      `;

      if (election.length === 0) {
        return sendNotFound(res, 'Eleição não encontrada ou inativa');
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
        return sendValidationError(res, {
          message: 'Você já indicou um candidato para esta posição',
        });
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

      return sendSuccess(res, { message: 'Indicação registrada com sucesso' });
    } catch (error: unknown) {
      logger.error('❌ Erro ao registrar indicação:', error);
      return sendInternalError(res, 'Erro interno do servidor');
    }
  });

  // GET /api/elections/active
  app.get('/api/elections/active', async (req: Request, res: Response) => {
    try {
      const voterId = parseHeaderUserId(req);

      if (voterId === null) {
        return sendUnauthorized(res, 'Usuário não autenticado');
      }

      // Buscar dados do usuário para verificar sua igreja
      const userResult = await sql`
        SELECT id, church FROM users WHERE id = ${voterId}
      `;

      if (userResult.length === 0) {
        return sendNotFound(res, 'Usuário não encontrado');
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
        AND ${voterId}::integer = ANY(ec.voters)
        AND (ec.church_name = ${userChurch}::text OR ${userChurch}::text IS NULL OR ${userChurch}::text = '')
        ORDER BY e.created_at DESC
      `;

      logger.debug(` Eleições ativas encontradas: ${activeElections.length}`);

      if (activeElections.length === 0) {
        return sendNotFound(res, 'Nenhuma eleição ativa encontrada');
      }

      // Retornar a primeira eleição ativa (pode haver apenas uma)
      return sendSuccess(res, {
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
      logger.error('❌ Erro ao buscar eleições ativas:', error);
      return sendInternalError(res, 'Erro interno do servidor');
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
        return sendNotFound(res, 'Configuração de eleição não encontrada');
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
        return sendValidationError(res, {
          message: 'Configuração inválida: nenhuma posição encontrada',
        });
      }

      const currentPositionIndex = toNumber(election[0].current_position);

      if (currentPositionIndex >= positions.length) {
        logger.warn(' Posição atual inválida:', currentPositionIndex, 'de', positions.length);
        return sendValidationError(res, { message: 'Posição atual inválida na eleição' });
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
        if (candidateId === null || candidateId === undefined) {
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
            logger.error('❌ [VOTING] Erro ao parsear removed_candidates:', e);
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
        currentPositionName,
        candidates: normalizedCandidates,
        phase: election[0].current_phase || 'nomination',
        hasVoted: parseCount(hasVoted[0]) > 0,
        hasNominated: hasReachedNominationLimit,
        nominationCount,
        maxNominationsPerVoter,
        totalVoters: effectiveTotalVoters,
        totalVotes: totalVotesCount,
        votersWhoVoted: votedVotersCount,
        allVotesCast,
        resultAnnounced,
        winner: winnerInfo,
        userVote: null,
        votedCandidateName,
      };

      logger.info(
        ` Interface de votação carregada: ${normalizedCandidates.length} candidatos com nomes reais`
      );

      return sendSuccess(res, response);
    } catch (error: unknown) {
      logger.error('❌ Erro na interface de votação:', error);
      return sendInternalError(res, 'Erro interno do servidor');
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
        return sendUnauthorized(res, 'Usuário não autenticado');
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
          return sendNotFound(res, 'Eleição não encontrada ou inativa');
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
          return sendValidationError(res, { message: 'Posição atual inválida na eleição' });
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
            return sendValidationError(res, { message: 'Você já votou para esta posição' });
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
          return sendNotFound(res, 'Eleição não encontrada ou inativa');
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
          return sendValidationError(res, { message: 'Você já votou para esta posição' });
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
      return sendSuccess(res, { message: 'Voto registrado com sucesso' });
    } catch (error: unknown) {
      logger.error('❌ Erro ao registrar voto:', error);
      logger.error('❌ Stack trace:', getErrorStack(error));
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: getErrorMessage(error),
      });
    }
  });
};
