import type { Relationship, User as UserType } from '@shared/schema';
import type { AuthUser } from '@/../../shared/types/user';
import type { DiscipleshipRequestWithAdminNotes, UserWithDiscipleRequest } from './usersTypes';
import {
  filterAndSortUsers,
  getInterestedSituationCount,
  getMountainCount,
  getMountainFilterName,
  getUsersCountByMountain,
} from './usersFilters';

type UseUsersDerivedProps = {
  users: UserType[];
  discipleshipRequests: DiscipleshipRequestWithAdminNotes[];
  safeRelationshipsData: Relationship[];
  user: AuthUser | null | undefined;
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
  churchFilter: string;
  mountainFilter: string;
  interestedSituationFilter: string;
  missionaryProfileFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

export const useUsersDerived = ({
  users,
  discipleshipRequests,
  safeRelationshipsData,
  user,
  searchTerm,
  roleFilter,
  statusFilter,
  churchFilter,
  mountainFilter,
  interestedSituationFilter,
  missionaryProfileFilter,
  sortBy,
  sortOrder,
}: UseUsersDerivedProps) => {
  const usersWithDiscipleRequests: UserWithDiscipleRequest[] = users.map((u: UserType) => ({
    ...u,
    hasPendingDiscipleRequest: discipleshipRequests.some(
      (req: DiscipleshipRequestWithAdminNotes) =>
        req.interestedId === u.id && req.status === 'pending'
    ),
  }));

  const filteredAndSortedUsers = filterAndSortUsers({
    usersWithDiscipleRequests,
    safeRelationshipsData,
    user,
    searchTerm,
    roleFilter,
    statusFilter,
    churchFilter,
    mountainFilter,
    interestedSituationFilter,
    missionaryProfileFilter,
    sortBy,
    sortOrder,
  });

  const getMountainFilterNameForState = () => getMountainFilterName(mountainFilter);
  const getMountainCountForState = (mountain: string) => getMountainCount(mountain, users);
  const getInterestedSituationCountForState = (situation: string) =>
    getInterestedSituationCount(situation, users);
  const getUsersCountByMountainForState = (mountainKey: string) =>
    getUsersCountByMountain({
      mountainKey,
      usersWithDiscipleRequests,
      safeRelationshipsData,
      user,
    });

  const pendingCount = users.filter((u: UserType) => u.status === 'pending').length;

  return {
    usersWithDiscipleRequests,
    filteredAndSortedUsers,
    getMountainFilterName: getMountainFilterNameForState,
    getMountainCount: getMountainCountForState,
    getInterestedSituationCount: getInterestedSituationCountForState,
    getUsersCountByMountain: getUsersCountByMountainForState,
    pendingCount,
  };
};
