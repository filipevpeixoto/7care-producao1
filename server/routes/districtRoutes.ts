/**
 * District Routes - Compose Module
 * Original monolithic file (925 lines) decomposed into:
 * - districts/districtHelpers.ts: Shared helpers (generateUniqueDistrictCode)
 * - districts/districtCrudRoutes.ts: Core district CRUD (list, get, create, update, delete)
 * - districts/districtPastorRoutes.ts: Pastor CRUD (list, get, create, update, delete)
 * - districts/districtChurchRoutes.ts: Church-district associations + data cleanup
 */
import { type Express } from 'express';
import { districtCrudRoutes } from './districts/districtCrudRoutes';
import { districtPastorRoutes } from './districts/districtPastorRoutes';
import { districtChurchRoutes } from './districts/districtChurchRoutes';

export const districtRoutes = (app: Express): void => {
  // districtChurchRoutes registered first to ensure /api/churches/unassigned
  // and /api/districts/:id/churches are defined before param-based routes
  districtChurchRoutes(app);
  districtCrudRoutes(app);
  districtPastorRoutes(app);
};
