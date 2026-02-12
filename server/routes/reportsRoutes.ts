/**
 * Reports Routes - Compose Module
 * Original monolithic file (1041 lines) decomposed into:
 * - reports/reportsHelpers.ts: Shared helpers (~80 lines)
 * - reports/overviewRoutes.ts: Overview, growth, goals
 * - reports/analysisRoutes.ts: Funnel, engagement, insights
 * - reports/comparisonRoutes.ts: Church, district, missionary comparison
 */
import { type Express } from 'express';
import { logger } from '../utils/logger';
import { overviewRoutes } from './reports/overviewRoutes';
import { analysisRoutes } from './reports/analysisRoutes';
import { comparisonRoutes } from './reports/comparisonRoutes';

export const reportsRoutes = (app: Express): void => {
  overviewRoutes(app);
  analysisRoutes(app);
  comparisonRoutes(app);

  logger.info('📊 Routes de relatórios registradas');
};
