import { CheckCircle, Clock } from 'lucide-react';
import type { UserMember } from '@/types/domain';
import type { DiscipleshipRequest, InterestedPerson, Relationship } from './myInterestedTypes';

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'novo':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'contato-inicial':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'estudando':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'batizado':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'inativo':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'novo':
      return 'Novo';
    case 'contato-inicial':
      return 'Contato Inicial';
    case 'estudando':
      return 'Estudando';
    case 'batizado':
      return 'Batizado';
    case 'inativo':
      return 'Inativo';
    default:
      return status;
  }
};

export const getDiscipleStatus = ({
  interestedId,
  myRelationships,
  allRequests,
  userId,
}: {
  interestedId: number;
  myRelationships: Relationship[];
  allRequests: DiscipleshipRequest[];
  userId: number | undefined;
}) => {
  const myActiveRelationship = (myRelationships || []).find(
    rel => rel.interestedId === interestedId && rel.status === 'active'
  );

  if (myActiveRelationship) {
    return {
      label: 'Discipulando',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: CheckCircle,
      missionaryId: myActiveRelationship.missionaryId,
      type: 'active',
      isMyRelationship: true,
    };
  }

  const myApprovedRequest = (allRequests || []).find(
    req =>
      req.interestedId === interestedId &&
      req.status === 'approved' &&
      req.missionaryId === Number(userId)
  );

  if (myApprovedRequest) {
    return {
      label: 'Aprovado',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      icon: CheckCircle,
      missionaryId: myApprovedRequest.missionaryId,
      type: 'approved',
      isMyRelationship: true,
    };
  }

  const myPendingRequest = (allRequests || []).find(
    req =>
      req.interestedId === interestedId &&
      req.status === 'pending' &&
      req.missionaryId === Number(userId)
  );

  if (myPendingRequest) {
    return {
      label: 'Solicitado',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: Clock,
      missionaryId: myPendingRequest.missionaryId,
      type: 'pending',
      isMyRelationship: true,
    };
  }

  return null;
};

export const hasAnyActiveRelationship = (
  activeRelationshipsMap: Map<number, unknown>,
  interestedId: number
) => {
  return activeRelationshipsMap.has(interestedId);
};

export const hasAnyApprovedRequest = (
  approvedRequestsSet: Set<number>,
  interestedId: number
) => {
  return approvedRequestsSet.has(interestedId);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export const getUserInfo = ({
  userId,
  interestedBase,
  allUsers,
  allMembersForInvite,
}: {
  userId: number;
  interestedBase: InterestedPerson[];
  allUsers: Array<UserMember | InterestedPerson>;
  allMembersForInvite: UserMember[];
}) => {
  if (!userId) return 'Usuário desconhecido';
  const interested = interestedBase?.find(u => u.id === userId);
  if (interested) return interested.name;
  const fromAllUsers = allUsers?.find(u => u.id === userId);
  if (fromAllUsers) return fromAllUsers.name;
  const fromMembers = allMembersForInvite?.find(u => u.id === userId);
  if (fromMembers) return fromMembers.name;
  return `Usuário ${userId}`;
};

export const getMissionaryFirstNames = (
  missionaryNamesMap: Map<number, string[]>,
  interestedId: number
): string[] => {
  return missionaryNamesMap.get(interestedId) || [];
};
