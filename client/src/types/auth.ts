/**
 * @fileoverview Authentication types
 * @module types/auth
 * 
 * DEPRECATED: User types moved to shared/types/user.ts
 * Import from there instead. These re-exports are for backwards compatibility.
 */

import type { AuthUser, UserRole } from '@/../../shared/types/user';

// Re-export from shared types for backwards compatibility
export type { UserRole, AuthUser as User };

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
