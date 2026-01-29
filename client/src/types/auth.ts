export type UserRole =
  | 'superadmin'
  | 'pastor'
  | 'missionary'
  | 'member'
  | 'interested'
  | 'admin_readonly';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  church?: string | null;
  churchCode?: string | null;
  districtId?: number | null;
  avatar?: string;
  phone?: string;
  profilePhoto?: string;
  birthDate?: string;
  isApproved: boolean;
  status?: string;
  firstAccess?: boolean;
  usingDefaultPassword?: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
