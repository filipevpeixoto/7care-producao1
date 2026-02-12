/**
 * Election Routes - Compose Module
 * 
 * Original monolithic file (2880 lines) decomposed into:
 * - election/electionHelpers.ts: Shared types, helpers, middleware (~260 lines)
 * - election/electionConfigRoutes.ts: Config CRUD (~640 lines)
 * - election/electionManagementRoutes.ts: Admin management (~830 lines)
 * - election/electionVotingRoutes.ts: Voting endpoints (~690 lines)
 * - election/electionResultsRoutes.ts: Results & dashboard (~300 lines)
 */
import { type Express } from 'express';
import { electionConfigRoutes } from './election/electionConfigRoutes';
import { electionManagementRoutes } from './election/electionManagementRoutes';
import { electionVotingRoutes } from './election/electionVotingRoutes';
import { electionResultsRoutes } from './election/electionResultsRoutes';

export const electionRoutes = (app: Express): void => {
  electionConfigRoutes(app);
  electionManagementRoutes(app);
  electionVotingRoutes(app);
  electionResultsRoutes(app);
};
