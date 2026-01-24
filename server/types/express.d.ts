/**
 * Extensão de tipos do Express para autenticação
 */
import { User as SharedUser } from '../../shared/schema';

type UserRole =
  | 'superadmin'
  | 'pastor'
  | 'member'
  | 'interested'
  | 'missionary'
  | 'admin_readonly';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: SharedUser | null;
      userRole?: UserRole;
    }
  }
}

export {};
