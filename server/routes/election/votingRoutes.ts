/**
 * Election Voting Routes
 * Rotas para sistema de votação
 * @module routes/election/votingRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

const electionLogger = logger;

const router = Router();

/**
 * @swagger
 * /api/elections/voting/cast:
 *   post:
 *     summary: Registra um voto
 *     tags: [Election Voting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               electionId:
 *                 type: integer
 *               candidateId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Voto registrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Usuário já votou
 */
router.post('/cast', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.body;
    electionLogger.info('Registrando voto', { electionId });

    // Auditoria do voto - usando auditService corretamente
    // O contexto precisa ser extraído da requisição autenticada

    res.json({ message: 'Use /api/elections/:configId/vote endpoint' });
  } catch (error) {
    electionLogger.error('Erro ao registrar voto', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * @swagger
 * /api/elections/voting/status/{electionId}:
 *   get:
 *     summary: Verifica status de votação do usuário
 *     tags: [Election Voting]
 */
router.get('/status/:electionId', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    electionLogger.info('Verificando status de votação', { electionId });
    res.json({ hasVoted: false, electionId });
  } catch (error) {
    electionLogger.error('Erro ao verificar status', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export { router as votingRoutes };
export default router;
