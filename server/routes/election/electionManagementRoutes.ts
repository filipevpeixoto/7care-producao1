import { electionLifecycleRoutes } from './electionLifecycleRoutes';
import { electionAdminRoutes } from './electionAdminRoutes';
import type { Express } from './electionHelpers';

export const electionManagementRoutes = (app: Express): void => {
  electionLifecycleRoutes(app);
  electionAdminRoutes(app);
};
