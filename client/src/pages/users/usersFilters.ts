import type { Relationship, User as UserType } from '@shared/schema';
import type { UserWithDiscipleRequest } from './usersTypes';

export const getUserPriority = (u: UserWithDiscipleRequest) => {
  if (u.status === 'pending') return 1;
  if ((u.points || 0) < 300) return 2;
  if ((u.attendance || 0) < 50) return 3;
  if (!u.isApproved) return 4;
  return 5;
};

export const getMountainFilterName = (mountainFilter: string) => {
  if (mountainFilter === 'all') return null;
  const mountainNames: Record<string, string> = {
    vale: 'Vale do Jordão',
    sinai: 'Monte Sinai',
    nebo: 'Monte Nebo',
    moria: 'Monte Moriá',
    carmelo: 'Monte Carmelo',
    hermon: 'Monte Hermon',
    siao: 'Monte Sião',
    oliveiras: 'Monte das Oliveiras',
    topo: 'O Topo',
  };
  return mountainNames[mountainFilter];
};

export const getMountainCount = (mountain: string, users: UserType[]) => {
  if (mountain === 'all') return users.length;
  return users.filter(u => {
    const points = u.points || 0;
    switch (mountain) {
      case 'vale':
        return points >= 0 && points <= 299;
      case 'sinai':
        return points >= 300 && points <= 399;
      case 'nebo':
        return points >= 400 && points <= 499;
      case 'moria':
        return points >= 500 && points <= 599;
      case 'carmelo':
        return points >= 600 && points <= 699;
      case 'hermon':
        return points >= 700 && points <= 799;
      case 'siao':
        return points >= 800 && points <= 899;
      case 'oliveiras':
        return points >= 900 && points <= 999;
      case 'topo':
        return points >= 1000;
      default:
        return false;
    }
  }).length;
};

export const getInterestedSituationCount = (situation: string, users: UserType[]) => {
  if (situation === 'all') return users.filter(u => u.role === 'interested').length;
  if (situation === 'total') return users.filter(u => u.role === 'interested').length;
  if (situation === 'no-situation') {
    return users.filter(
      u => u.role === 'interested' && !(u.interestedSituation || (u as unknown as Record<string, string>).interested_situation)
    ).length;
  }
  return users.filter(
    u =>
      u.role === 'interested' &&
      (u.interestedSituation || (u as unknown as Record<string, string>).interested_situation) === situation
  ).length;
};

const getPointsRange = (key: string) => {
  switch (key) {
    case 'vale':
      return [0, 300];
    case 'sinai':
      return [300, 400];
    case 'nebo':
      return [400, 500];
    case 'moria':
      return [500, 600];
    case 'carmelo':
      return [600, 700];
    case 'hermon':
      return [700, 800];
    case 'siao':
      return [800, 900];
    case 'oliveiras':
      return [900, 1000];
    case 'topo':
      return [1000, Infinity];
    default:
      return null;
  }
};

export const getUsersCountByMountain = ({
  mountainKey,
  usersWithDiscipleRequests,
  safeRelationshipsData,
  user,
}: {
  mountainKey: string;
  usersWithDiscipleRequests: UserWithDiscipleRequest[];
  safeRelationshipsData: Relationship[];
  user: { id?: number | string; role?: string } | null | undefined;
}) => {
  const isUserMissionary = user?.role === 'missionary';
  const isUserDiscipulador =
    user?.role === 'member' &&
    safeRelationshipsData.some(
      rel => rel.missionaryId === Number(user?.id) && rel.status === 'active'
    );

  const range = getPointsRange(mountainKey);
  if (!range) return 0;

  if (isUserMissionary || isUserDiscipulador) {
    return usersWithDiscipleRequests.filter(u => {
      if (u.role !== 'interested') return false;
      const isLinkedToMissionary = safeRelationshipsData.some(
        rel =>
          rel.missionaryId === Number(user?.id) &&
          rel.interestedId === u.id &&
          rel.status === 'active'
      );
      if (!isLinkedToMissionary) return false;
      const userPoints = u.points || 0;
      return userPoints >= range[0] && userPoints < range[1];
    }).length;
  }

  return usersWithDiscipleRequests.filter(u => {
    const userPoints = u.points || 0;
    return userPoints >= range[0] && userPoints < range[1];
  }).length;
};

export const filterAndSortUsers = ({
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
}: {
  usersWithDiscipleRequests: UserWithDiscipleRequest[];
  safeRelationshipsData: Relationship[];
  user: { id?: number | string; role?: string } | null | undefined;
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
  churchFilter: string;
  mountainFilter: string;
  interestedSituationFilter: string;
  missionaryProfileFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) => {
  return usersWithDiscipleRequests
    .filter(u => {
      const matchesSearch =
        (u.name &&
          typeof u.name === 'string' &&
          u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email &&
          typeof u.email === 'string' &&
          u.email.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesRole = !roleFilter || roleFilter === 'all' || u.role === roleFilter;
      if (roleFilter === 'missionary') {
        const isMissionaryRole = u.role === 'missionary';
        const hasMissionaryRelationship = safeRelationshipsData.some(
          rel => rel.missionaryId === u.id && rel.status === 'active'
        );
        matchesRole = isMissionaryRole || hasMissionaryRelationship;
      }
      const matchesStatus = !statusFilter || statusFilter === 'all' || u.status === statusFilter;
      const matchesChurch = churchFilter === 'all' || u.church === churchFilter;

      let matchesMissionaryProfile = true;
      if (missionaryProfileFilter === 'missionary') {
        matchesMissionaryProfile = u.role.includes('missionary');
      } else if (missionaryProfileFilter === 'non-missionary') {
        matchesMissionaryProfile = !u.role.includes('missionary');
      }

      let matchesMountain = true;
      if (mountainFilter !== 'all') {
        const userPoints = u.points || 0;
        switch (mountainFilter) {
          case 'vale':
            matchesMountain = userPoints >= 0 && userPoints < 300;
            break;
          case 'sinai':
            matchesMountain = userPoints >= 300 && userPoints < 400;
            break;
          case 'nebo':
            matchesMountain = userPoints >= 400 && userPoints < 500;
            break;
          case 'moria':
            matchesMountain = userPoints >= 500 && userPoints < 600;
            break;
          case 'carmelo':
            matchesMountain = userPoints >= 600 && userPoints < 700;
            break;
          case 'hermon':
            matchesMountain = userPoints >= 700 && userPoints < 800;
            break;
          case 'siao':
            matchesMountain = userPoints >= 800 && userPoints < 900;
            break;
          case 'oliveiras':
            matchesMountain = userPoints >= 900 && userPoints < 1000;
            break;
          case 'topo':
            matchesMountain = userPoints >= 1000;
            break;
          default:
            matchesMountain = true;
        }
      }

      let matchesInterestedSituation = true;
      if (interestedSituationFilter !== 'all') {
        if (interestedSituationFilter === 'no-situation') {
          matchesInterestedSituation =
            u.role === 'interested' && !(u.interestedSituation || (u as unknown as Record<string, string>).interested_situation);
        } else if (interestedSituationFilter === 'total') {
          matchesInterestedSituation = u.role === 'interested';
        } else {
          matchesInterestedSituation =
            u.role === 'interested' &&
            (u.interestedSituation || (u as unknown as Record<string, string>).interested_situation) ===
              interestedSituationFilter;
        }
      }

      let matchesMissionaryRestriction = true;
      const isUserMissionary = user?.role === 'missionary';
      const isUserDiscipulador =
        user?.role === 'member' &&
        safeRelationshipsData.some(
          rel => rel.missionaryId === Number(user?.id) && rel.status === 'active'
        );

      if (isUserMissionary || isUserDiscipulador) {
        if (u.role === 'interested') {
          matchesMissionaryRestriction = safeRelationshipsData.some(
            rel =>
              rel.missionaryId === Number(user?.id) &&
              rel.interestedId === u.id &&
              rel.status === 'active'
          );
        } else if (user?.id !== null && user?.id !== undefined && u.id === Number(user.id)) {
          matchesMissionaryRestriction = true;
        } else {
          matchesMissionaryRestriction = false;
        }
      }

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesChurch &&
        matchesMountain &&
        matchesInterestedSituation &&
        matchesMissionaryProfile &&
        matchesMissionaryRestriction
      );
    })
    .sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'points':
          aValue = a.points || 0;
          bValue = b.points || 0;
          break;
        case 'attendance':
          aValue = a.attendance || 0;
          bValue = b.attendance || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'priority':
          aValue = getUserPriority(a);
          bValue = getUserPriority(b);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
};
