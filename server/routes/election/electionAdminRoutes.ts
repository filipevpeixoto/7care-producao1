import {
  sql,
  hasAdminAccess,
  logger,
  sendSuccess,
  sendUnauthorized,
  sendValidationError,
  sendInternalError,
  getErrorMessage,
  parseHeaderUserId,
  parseCount,
  type Express,
  type Request,
  type Response,
} from './electionHelpers';

export const electionAdminRoutes = (app: Express): void => {
  // POST /api/elections/set-max-nominations - Configurar número máximo de indicações por votante
  app.post('/api/elections/set-max-nominations', async (req: Request, res: Response) => {
    try {
      const { configId, maxNominations } = req.body;
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
          .json({ error: 'Acesso negado. Apenas administradores podem alterar configurações' });
      }

      if (!maxNominations || maxNominations < 1) {
        return sendValidationError(res, { message: 'Número de indicações deve ser maior que 0' });
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

      return sendSuccess(res, {
        message: `Máximo de indicações atualizado para ${maxNominations}`,
        maxNominations,
      });
    } catch (error: unknown) {
      logger.error('❌ Erro ao atualizar configuração:', error);
      return res
        .status(500)
        .json({ error: 'Erro interno do servidor', details: getErrorMessage(error) });
    }
  });

  // Rota para aprovar todos os membros
  app.post('/api/elections/approve-all-members', async (req: Request, res: Response) => {
    try {
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
          .json({ error: 'Acesso negado. Apenas administradores podem aprovar membros' });
      }

      logger.info(' Aprovando todos os membros do sistema...');

      // Aprovar todos os membros
      await sql`
        UPDATE users 
        SET status = 'approved', is_approved = true, updated_at = NOW()
        WHERE status <> 'approved' OR is_approved = false
      `;

      // Contar total de membros aprovados
      const totalApproved = await sql`
        SELECT COUNT(*) as count FROM users WHERE is_approved = true
      `;

      const approvedCount = parseCount(totalApproved[0]);
      logger.info(` ${approvedCount} membros aprovados no total!`);

      return sendSuccess(res, {
        message: `Todos os membros foram aprovados! Total: ${approvedCount} membros aprovados.`,
        approved_count: approvedCount,
      });
    } catch (error: unknown) {
      logger.error('❌ Erro ao aprovar membros:', error);
      return sendInternalError(res, 'Erro interno do servidor');
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

      return sendSuccess(res, {
        message: 'Todas as votações foram limpas com sucesso',
        cleaned: {
          election_votes: true,
          election_candidates: true,
          elections: true,
          election_configs: true,
        },
      });
    } catch (error: unknown) {
      logger.error('❌ Erro na limpeza:', error);
      return sendInternalError(res, 'Erro interno do servidor');
    }
  });
};
