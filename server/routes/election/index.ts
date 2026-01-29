/**
 * Election Routes - Módulo Principal
 * Agrupa todos os sub-módulos de eleição
 * @module routes/election
 */

import { Router } from 'express';
import { configRoutes } from './configRoutes';
import { votingRoutes } from './votingRoutes';
import { resultsRoutes } from './resultsRoutes';
import { candidateRoutes } from './candidateRoutes';
import { managementRoutes } from './managementRoutes';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Elections
 *     description: Gerenciamento completo de eleições
 *   - name: Election Config
 *     description: Configuração de eleições
 *   - name: Election Voting
 *     description: Sistema de votação
 *   - name: Election Results
 *     description: Resultados e estatísticas
 *   - name: Election Candidates
 *     description: Gerenciamento de candidatos
 */

// Montar sub-rotas
router.use('/config', configRoutes);
router.use('/voting', votingRoutes);
router.use('/results', resultsRoutes);
router.use('/candidates', candidateRoutes);
router.use('/management', managementRoutes);

export { router as electionModularRoutes };
export default router;
