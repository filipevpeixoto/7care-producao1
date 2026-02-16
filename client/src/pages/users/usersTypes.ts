import type { User as UserType, DiscipleshipRequest } from '@shared/schema';

export type UserWithDiscipleRequest = UserType & { hasPendingDiscipleRequest: boolean };

export type DiscipleshipRequestWithAdminNotes = DiscipleshipRequest & {
  adminNotes?: string;
  processedBy?: number;
  processedAt?: string;
  requestedAt?: string;
  missionaryId?: number;
  interestedId?: number;
  notes?: string;
};
