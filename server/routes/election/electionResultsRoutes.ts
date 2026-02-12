import { type Express, type Request, type Response } from 'express';
import {
  sql,
  parseHeaderUserId,
  toNumber,
  getErrorMessage,
  logger,
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendInternalError,
  hasAdminAccess,
} from './electionHelpers';
import type { ResultRow, VoteResultRow } from './electionHelpers';

export const electionResultsRoutes = (app: Express): void => {

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
        return sendNotFound(res, 'Nenhuma eleição ativa para esta configuração');
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
          position,
          totalNominations,
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

      return sendSuccess(res, response);
    } catch (error: unknown) {
      logger.error('❌ Erro ao buscar dashboard com configId:', error);
      return sendInternalError(res, 'Erro interno do servidor');
    }
  });

  // POST /api/elections/announce-result - Divulgar resultado atual (Admin)
  app.post('/api/elections/announce-result', async (req: Request, res: Response) => {
    try {
      const { configId } = req.body;
      const adminId = parseHeaderUserId(req);

      if (adminId === null) {
        return sendUnauthorized(res, 'Usuário não autenticado');
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
        return sendNotFound(res, 'Nenhuma eleição ativa para esta configuração');
      }

      const config = await sql`
        SELECT positions, voters
        FROM election_configs
        WHERE id = ${configId}
      `;

      if (config.length === 0) {
        return sendNotFound(res, 'Configuração não encontrada');
      }

      const positions: string[] = Array.isArray(config[0].positions)
        ? config[0].positions
        : JSON.parse(String(config[0].positions || '[]'));

      if (!positions || positions.length === 0) {
        return sendValidationError(res, { message: 'Nenhuma posição configurada nesta eleição' });
      }

      const currentPositionIndex = toNumber(election[0].current_position);
      if (currentPositionIndex >= positions.length) {
        return sendValidationError(res, { message: 'Posição atual inválida' });
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

      return sendSuccess(res, {
        message: 'Resultado divulgado com sucesso',
        position: currentPositionName,
        winner: winnerInfo,
      });
    } catch (error: unknown) {
      logger.error('❌ Erro ao divulgar resultado:', error);
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
        return sendUnauthorized(res, 'Usuário não autenticado');
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
        return sendNotFound(res, 'Nenhuma eleição ativa para esta configuração');
      }

      // Garantir que positions seja um array
      const positions: string[] = Array.isArray(election[0].positions)
        ? election[0].positions
        : JSON.parse(String(election[0].positions || '[]'));

      const currentPositionIndex = toNumber(election[0].current_position);
      if (currentPositionIndex >= positions.length) {
        return sendValidationError(res, { message: 'Posição atual inválida' });
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

      return sendSuccess(res, {
        message: `Votação repetida com sucesso para: ${currentPositionName}`,
        currentPosition: currentPositionName,
        currentPhase: 'voting',
      });
    } catch (error: unknown) {
      logger.error('❌ Erro ao resetar votação:', error);
      return res
        .status(500)
        .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
    }
  });

  // Rota para obter log de votos
  app.get('/api/elections/vote-log/:electionId', async (req: Request, res: Response) => {
    try {
      const { electionId } = req.params;
      const requestingUserId = parseHeaderUserId(req);

      logger.debug(` Buscando log de votos para eleição: ${electionId}`);

      // Verificar autenticação
      if (!requestingUserId) {
        return sendUnauthorized(res, 'Usuário não autenticado');
      }

      // Buscar dados do usuário que está fazendo a requisição
      const userResult = await sql`
        SELECT id, church, role, email, district_id FROM users WHERE id = ${requestingUserId}
      `;

      if (userResult.length === 0) {
        return sendUnauthorized(res, 'Usuário não encontrado');
      }

      const requestingUser = userResult[0];
      const isSuperAdminUser =
        requestingUser.role === 'super_admin' ||
        requestingUser.role === 'superadmin' ||
        requestingUser.email === 'admin@7care.com';

      // Buscar informações da eleição e sua configuração
      const electionInfo = await sql<{ id: number; config_id: number; church_name: string; church_id: number }>`
        SELECT e.id, e.config_id, ec.church_name, ec.church_id
        FROM elections e
        JOIN election_configs ec ON e.config_id = ec.id
        WHERE e.id = ${electionId}
      `;

      if (electionInfo.length === 0) {
        return sendNotFound(res, 'Eleição não encontrada');
      }

      const electionChurchName = electionInfo[0].church_name;

      // Verificar permissão para pastores
      if (!isSuperAdminUser && requestingUser.role === 'pastor') {
        // Buscar igrejas do distrito do pastor
        const districtId = requestingUser.district_id;

        if (!districtId) {
          return sendForbidden(res, 'Pastor sem distrito atribuído');
        }

        // Verificar se a igreja da eleição pertence ao distrito do pastor
        const districtChurches = await sql<{ name: string }>`
          SELECT name FROM churches WHERE district_id = ${districtId}
        `;
        const districtChurchNames = districtChurches.map(ch => ch.name);

        // Também verificar por users da igreja que pertencem ao distrito
        const usersInDistrict = await sql<{ church: string }>`
          SELECT DISTINCT church FROM users WHERE district_id = ${districtId} AND church IS NOT NULL
        `;
        const userChurchNames = usersInDistrict.map(u => u.church);

        const allDistrictChurches = [...new Set([...districtChurchNames, ...userChurchNames])];

        if (!allDistrictChurches.includes(electionChurchName)) {
          logger.warn(
            ` Acesso negado: Pastor ${requestingUserId} tentou acessar log de eleição de ${electionChurchName}`
          );
          return res
            .status(403)
            .json({ error: 'Você não tem permissão para visualizar esta eleição' });
        }
      } else if (!isSuperAdminUser) {
        // Usuário comum - verificar se pertence à mesma igreja
        if (requestingUser.church !== electionChurchName) {
          return res
            .status(403)
            .json({ error: 'Você não tem permissão para visualizar esta eleição' });
        }
      }

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

      logger.info(
        ` Log encontrado: ${votes.length} registro(s) para usuário ${requestingUserId} (role: ${requestingUser.role})`
      );

      return sendSuccess(res, votes);
    } catch (error: unknown) {
      logger.error('❌ Erro ao buscar log de votos:', error);
      return sendInternalError(res, 'Erro interno do servidor');
    }
  });

  // GET /api/elections/debug/:electionId
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

      return sendSuccess(res, {
        electionId,
        candidates,
        votes,
        totalCandidates: candidates.length,
        totalVotes: votes.length,
      });
    } catch (error: unknown) {
      logger.error('❌ Erro no debug:', error);
      return sendInternalError(res, 'Erro interno do servidor');
    }
  });
};
