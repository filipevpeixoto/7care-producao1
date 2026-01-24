export type UserRole = 'superadmin' | 'pastor' | 'missionary' | 'member' | 'interested';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  church?: string;
  avatar?: string;
  phone?: string;
  profilePhoto?: string;
  birthDate?: string;
  isApproved: boolean;
  status?: string;
  firstAccess?: boolean;
  usingDefaultPassword?: boolean;
  districtId?: number | null;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}