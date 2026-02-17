import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess, isPastor } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getLevelIcon } from '@/lib/gamification';
import { fetchWithAuth } from '@/lib/api';
import { useSituationLevels } from '@/hooks/useSituationLevels';
import type { UserMember, ActiveRelationship } from '@/types/domain';
import { createLogger } from '@/lib/logger';
import type { DiscipleshipRequest, InterestedPerson, Relationship } from './myInterestedTypes';
import { useMyInterestedQueries } from './useMyInterestedQueries';
import { useMyInterestedMutations } from './useMyInterestedMutations';
import {
  formatDate as formatDateHelper,
  getDiscipleStatus as getDiscipleStatusHelper,
  getMissionaryFirstNames as getMissionaryFirstNamesHelper,
  getStatusColor as getStatusColorHelper,
  getStatusLabel as getStatusLabelHelper,
  getUserInfo as getUserInfoHelper,
  hasAnyActiveRelationship as hasAnyActiveRelationshipHelper,
  hasAnyApprovedRequest as hasAnyApprovedRequestHelper,
} from './myInterestedHelpers';

const myInterestedLogger = createLogger('MyInterested');

type UseMyInterestedComputedInput = {
  isAdmin: boolean;
  userId?: number;
  searchTerm: string;
  selectedStatus: string;
  selectedChurch: string;
  selectedTab: 'my' | 'church';
  currentPage: number;
  itemsPerPage: number;
  churchInterested?: InterestedPerson[];
  myRelationships: Relationship[];
  myRequests: DiscipleshipRequest[];
  allRequests: DiscipleshipRequest[];
  allRelationships: ActiveRelationship[];
  allUsers?: InterestedPerson[];
  allMembersForInvite?: UserMember[];
};

const useMyInterestedComputed = ({
  isAdmin,
  userId,
  searchTerm,
  selectedStatus,
  selectedChurch,
  selectedTab,
  currentPage,
  itemsPerPage,
  churchInterested,
  myRelationships,
  myRequests,
  allRequests,
  allRelationships,
  allUsers,
  allMembersForInvite,
}: UseMyInterestedComputedInput) => {
  const interestedBase: InterestedPerson[] = useMemo(() => {
    try {
      return isAdmin ? allUsers || [] : churchInterested || [];
    } catch (error) {
      myInterestedLogger.error('Error in interestedBase:', error);
      return [];
    }
  }, [isAdmin, allUsers, churchInterested]);

  const availableChurches: string[] = useMemo(
    () =>
      Array.from(
        new Set(
          (interestedBase || [])
            .map((p: InterestedPerson) => p?.church)
            .filter((church): church is string => Boolean(church))
        )
      ).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' })),
    [interestedBase]
  );

  const filteredChurchInterested = useMemo(
    () =>
      (interestedBase || []).filter((person: InterestedPerson) => {
        if (!person) return false;
        const matchesSearch =
          person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || person.status === selectedStatus;
        const matchesChurch =
          !isAdmin || selectedChurch === 'all' || person.church === selectedChurch;
        return matchesSearch && matchesStatus && matchesChurch;
      }),
    [interestedBase, searchTerm, selectedStatus, selectedChurch, isAdmin]
  );

  const myInterested = useMemo<InterestedPerson[]>(
    () =>
      isAdmin
        ? []
        : (myRelationships || [])
            .map((rel: Relationship): InterestedPerson | null => {
              if (!rel?.interestedId) return null;
              const interested = (interestedBase || []).find(
                (p: InterestedPerson) => p?.id === rel.interestedId
              );
              return interested ? { ...interested, relationship: rel } : null;
            })
            .filter((person): person is InterestedPerson => Boolean(person)),
    [isAdmin, myRelationships, interestedBase]
  );

  const sortedMyInterested = useMemo(
    () =>
      [...(myInterested || [])].sort((a: InterestedPerson, b: InterestedPerson) => {
        const nameA = a?.name || '';
        const nameB = b?.name || '';
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      }),
    [myInterested]
  );

  const sortedFilteredChurchInterested = useMemo(
    () =>
      [...(filteredChurchInterested || [])].sort((a: InterestedPerson, b: InterestedPerson) => {
        const nameA = a?.name || '';
        const nameB = b?.name || '';
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      }),
    [filteredChurchInterested]
  );

  const availableMissionaries: UserMember[] = useMemo(
    () =>
      (allMembersForInvite || [])
        .filter(
          (u: UserMember) => u.role !== 'interested' && u.role !== 'superadmin' && u.id !== userId
        )
        .sort((a: UserMember, b: UserMember) =>
          (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
        ),
    [allMembersForInvite, userId]
  );

  const activeRelationshipsMap = useMemo(() => {
    const map = new Map<number, ActiveRelationship[]>();
    if (!allRelationships || !Array.isArray(allRelationships)) return map;
    allRelationships.forEach((rel: ActiveRelationship) => {
      if (rel?.status === 'active' && rel?.interestedId) {
        const existing = map.get(rel.interestedId) || [];
        map.set(rel.interestedId, [...existing, rel]);
      }
    });
    return map;
  }, [allRelationships]);

  const approvedRequestsSet = useMemo(() => {
    const set = new Set<number>();
    if (!allRequests || !Array.isArray(allRequests)) return set;
    allRequests.forEach((req: DiscipleshipRequest) => {
      if (req?.status === 'approved' && req?.interestedId) set.add(req.interestedId);
    });
    return set;
  }, [allRequests]);

  const pendingRequestsSet = useMemo(() => {
    const set = new Set<number>();
    if (!allRequests || !Array.isArray(allRequests)) return set;
    allRequests.forEach((req: DiscipleshipRequest) => {
      if (req?.status === 'pending' && req?.interestedId) set.add(req.interestedId);
    });
    return set;
  }, [allRequests]);

  const missionaryNamesMap = useMemo(() => {
    const map = new Map<number, string[]>();
    if (!allRelationships || !Array.isArray(allRelationships)) return map;
    allRelationships.forEach((rel: ActiveRelationship) => {
      if (rel?.status === 'active' && rel?.missionaryName && rel?.interestedId) {
        const existing = map.get(rel.interestedId) || [];
        const firstName = rel.missionaryName.split(' ')[0];
        if (!existing.includes(firstName)) {
          map.set(rel.interestedId, [...existing, firstName]);
        }
      }
    });
    return map;
  }, [allRelationships]);

  const myPendingInvites: DiscipleshipRequest[] = useMemo(
    () =>
      (allRequests || []).filter(
        (req: DiscipleshipRequest) =>
          req?.missionaryId === Number(userId) &&
          req?.type === 'pastor-invite' &&
          req?.status === 'pending'
      ),
    [allRequests, userId]
  );

  const paginatedMyInterested = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedMyInterested.slice(startIndex, endIndex);
  }, [sortedMyInterested, currentPage, itemsPerPage]);

  const paginatedChurchInterested = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedFilteredChurchInterested.slice(startIndex, endIndex);
  }, [sortedFilteredChurchInterested, currentPage, itemsPerPage]);

  const statsData = {
    totalMy: sortedMyInterested.length,
    totalChurch: sortedFilteredChurchInterested.length,
    pendingRequests: (myRequests || []).filter(
      (req: DiscipleshipRequest) => req.status === 'pending'
    ).length,
    approvedRequests: (myRequests || []).filter(
      (req: DiscipleshipRequest) => req.status === 'approved'
    ).length,
  };

  const totalPagesMyInterested = Math.ceil(sortedMyInterested.length / itemsPerPage);
  const totalPagesChurch = Math.ceil(sortedFilteredChurchInterested.length / itemsPerPage);
  const totalPages = selectedTab === 'my' ? totalPagesMyInterested : totalPagesChurch;
  const currentList = selectedTab === 'my' ? paginatedMyInterested : paginatedChurchInterested;

  return {
    interestedBase,
    availableChurches,
    myInterested,
    sortedMyInterested,
    sortedFilteredChurchInterested,
    availableMissionaries,
    activeRelationshipsMap,
    approvedRequestsSet,
    pendingRequestsSet,
    missionaryNamesMap,
    myPendingInvites,
    paginatedMyInterested,
    paginatedChurchInterested,
    statsData,
    totalPages,
    currentList,
  };
};

type UseMyInterestedEffectsInput = {
  isAdmin: boolean;
  selectedTab: 'my' | 'church';
  setSelectedTab: (value: 'my' | 'church') => void;
  searchTerm: string;
  selectedStatus: string;
  selectedChurch: string;
  setCurrentPage: (value: number) => void;
  isPastorUser: boolean;
  situationLevels: { value: string }[];
  currentList: InterestedPerson[];
  queryClient: ReturnType<typeof useQueryClient>;
};

const useMyInterestedEffects = ({
  isAdmin,
  selectedTab,
  setSelectedTab,
  searchTerm,
  selectedStatus,
  selectedChurch,
  setCurrentPage,
  isPastorUser,
  situationLevels,
  currentList,
  queryClient,
}: UseMyInterestedEffectsInput) => {
  useEffect(() => {
    if (isAdmin && selectedTab !== 'church') {
      setSelectedTab('church');
    }
  }, [isAdmin, selectedTab, setSelectedTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedChurch, selectedTab, setCurrentPage]);

  useEffect(() => {
    myInterestedLogger.debug('Estado MyInterested:', {
      isPastorUser,
      isAdmin,
      selectedTab,
      situationLevelsCount: situationLevels.length,
      situationLevels: situationLevels.map((l) => l.value),
      currentList: currentList.length,
    });
  }, [isPastorUser, isAdmin, selectedTab, situationLevels, currentList]);

  useEffect(() => {
    const handleSituationLevelsUpdate = () => {
      myInterestedLogger.debug('Configurações de situação atualizadas, forçando refresh...');
      queryClient.invalidateQueries({ queryKey: ['situation-levels'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
    };

    window.addEventListener('situation-levels-updated', handleSituationLevelsUpdate);
    return () => {
      window.removeEventListener('situation-levels-updated', handleSituationLevelsUpdate);
    };
  }, [queryClient]);
};

type UseMyInterestedActionsInput = {
  user: ReturnType<typeof useAuth>['user'];
  isPastorUser: boolean;
  selectedTab: 'my' | 'church';
  interestedBase: InterestedPerson[];
  allUsers?: InterestedPerson[];
  allMembersForInvite?: UserMember[];
  missionaryNamesMap: Map<number, string[]>;
  pendingRequestsSet: Set<number>;
  approvedRequestsSet: Set<number>;
  activeRelationshipsMap: Map<number, ActiveRelationship[]>;
  myRelationships: Relationship[];
  allRequests: DiscipleshipRequest[];
  getLevelByValue: (value?: string) => { value: string; label: string; color: string } | undefined;
  updateSituationMutation: ReturnType<typeof useMyInterestedMutations>['updateSituationMutation'];
  updateRequestMutation: ReturnType<typeof useMyInterestedMutations>['updateRequestMutation'];
  pastorInviteMutation: ReturnType<typeof useMyInterestedMutations>['pastorInviteMutation'];
  createDiscipleRequestMutation: ReturnType<
    typeof useMyInterestedMutations
  >['createDiscipleRequestMutation'];
  setUpdatingSituation: (value: number | null) => void;
  setInviteInterested: (value: InterestedPerson | null) => void;
  setSelectedMissionaryId: (value: string) => void;
  setShowInviteModal: (value: boolean) => void;
  inviteInterested: InterestedPerson | null;
  selectedMissionaryId: string;
  setSelectedInterested: (value: InterestedPerson | null) => void;
  setShowDiscipleDialog: (value: boolean) => void;
  setSelectedRequest: (value: DiscipleshipRequest | null) => void;
  setAdminNotes: (value: string) => void;
  setShowAuthorizationModal: (value: boolean) => void;
  selectedRequest: DiscipleshipRequest | null;
  adminNotes: string;
  toast: ReturnType<typeof useToast>['toast'];
  queryClient: ReturnType<typeof useQueryClient>;
  navigate: ReturnType<typeof useNavigate>;
  discipleMessage: string;
  selectedInterested: InterestedPerson | null;
};

const useMyInterestedActions = ({
  user,
  isPastorUser,
  selectedTab,
  interestedBase,
  allUsers,
  allMembersForInvite,
  missionaryNamesMap,
  pendingRequestsSet,
  approvedRequestsSet,
  activeRelationshipsMap,
  myRelationships,
  allRequests,
  getLevelByValue,
  updateSituationMutation,
  updateRequestMutation,
  pastorInviteMutation,
  createDiscipleRequestMutation,
  setUpdatingSituation,
  setInviteInterested,
  setSelectedMissionaryId,
  setShowInviteModal,
  inviteInterested,
  selectedMissionaryId,
  setSelectedInterested,
  setShowDiscipleDialog,
  setSelectedRequest,
  setAdminNotes,
  setShowAuthorizationModal,
  selectedRequest,
  adminNotes,
  toast,
  queryClient,
  navigate,
  discipleMessage,
  selectedInterested,
}: UseMyInterestedActionsInput) => {
  const safeAllUsers = allUsers || [];
  const safeAllMembersForInvite = allMembersForInvite || [];

  const getSituationOption = (situation?: string) => getLevelByValue(situation) ?? null;

  const handleSituationChange = (userId: number, situation: string) => {
    myInterestedLogger.debug('Atualizando situação:', {
      userId,
      situation,
      isPastorUser,
      selectedTab,
    });
    setUpdatingSituation(userId);
    updateSituationMutation.mutate({ userId, situation });
  };

  const handleOpenInvite = (person: InterestedPerson) => {
    setInviteInterested(person);
    setSelectedMissionaryId('');
    setShowInviteModal(true);
  };

  const handleConfirmInvite = () => {
    if (!inviteInterested || !selectedMissionaryId) return;
    pastorInviteMutation.mutate({
      interestedId: inviteInterested.id,
      missionaryId: parseInt(selectedMissionaryId),
    });
  };

  const handleRespondInvite = (requestId: number, status: 'approved' | 'rejected') => {
    updateRequestMutation.mutate({
      requestId,
      status,
      adminNotes: status === 'approved' ? 'Aceito pelo membro' : 'Recusado pelo membro',
    });
  };

  const hasPendingRequestForAdmin = (interestedId: number) => {
    return pendingRequestsSet.has(interestedId);
  };

  const handleDiscipleRequest = (person: InterestedPerson) => {
    setSelectedInterested(person);
    setShowDiscipleDialog(true);
  };

  const openAuthorizationModal = (request: DiscipleshipRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || '');
    setShowAuthorizationModal(true);
  };

  const handleProcessRequest = (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    updateRequestMutation.mutate({
      requestId: selectedRequest.id,
      status,
      adminNotes: adminNotes.trim(),
    });
  };

  const getUserInfo = (userId: number) =>
    getUserInfoHelper({
      userId,
      interestedBase,
      allUsers: safeAllUsers,
      allMembersForInvite: safeAllMembersForInvite,
    });

  const getMissionaryFirstNames = (interestedId: number): string[] =>
    getMissionaryFirstNamesHelper(missionaryNamesMap, interestedId);

  const handleUnlinkDisciple = async (interestedId: number) => {
    try {
      const activeRelationship = myRelationships.find(
        (rel: Relationship) => rel.interestedId === interestedId && rel.status === 'active'
      );

      if (!activeRelationship) {
        toast({
          title: '❌ Erro',
          description: 'Relacionamento não encontrado.',
          variant: 'destructive',
        });
        return;
      }

      if (
        !confirm('Tem certeza que deseja desvincular este amigo? Esta ação não pode ser desfeita.')
      ) {
        return;
      }

      const response = await fetchWithAuth(`/api/relationships/${activeRelationship.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao desvincular relacionamento');
      }

      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['my-interested'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });

      toast({
        title: '✅ Desvinculado com sucesso!',
        description: 'O amigo foi desvinculado do seu discipulado.',
      });
    } catch (error) {
      toast({
        title: '❌ Erro ao desvincular',
        description:
          error instanceof Error ? error.message : 'Não foi possível desvincular o relacionamento.',
        variant: 'destructive',
      });
    }
  };

  const confirmDiscipleRequest = () => {
    if (!selectedInterested || !user?.id || !discipleMessage.trim()) return;
    createDiscipleRequestMutation.mutate({
      missionaryId: Number(user.id),
      interestedId: selectedInterested.id,
      status: 'pending',
      notes: discipleMessage,
    });
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=Olá ${name}! Tudo bem?`;
    window.open(whatsappUrl, '_blank');
  };

  const handleOpenChat = (interestedId: number, interestedName: string) => {
    navigate(`/chat?user=${interestedId}&name=${encodeURIComponent(interestedName)}`);
  };

  const getStatusColor = (status: string) => getStatusColorHelper(status);
  const getStatusLabel = (status: string) => getStatusLabelHelper(status);
  const getDiscipleStatus = (interestedId: number) =>
    getDiscipleStatusHelper({
      interestedId,
      myRelationships,
      allRequests,
      userId: user?.id ? Number(user.id) : undefined,
    });
  const hasAnyActiveRelationship = (interestedId: number) =>
    hasAnyActiveRelationshipHelper(activeRelationshipsMap, interestedId);
  const hasAnyApprovedRequest = (interestedId: number) =>
    hasAnyApprovedRequestHelper(approvedRequestsSet, interestedId);
  const formatDate = (dateString: string) => formatDateHelper(dateString);

  return {
    getSituationOption,
    handleSituationChange,
    handleOpenInvite,
    handleConfirmInvite,
    handleRespondInvite,
    hasPendingRequestForAdmin,
    handleDiscipleRequest,
    openAuthorizationModal,
    handleProcessRequest,
    getUserInfo,
    getMissionaryFirstNames,
    handleUnlinkDisciple,
    confirmDiscipleRequest,
    handleWhatsApp,
    handleOpenChat,
    getStatusColor,
    getStatusLabel,
    getDiscipleStatus,
    hasAnyActiveRelationship,
    hasAnyApprovedRequest,
    formatDate,
  };
};

// ── Hook ──────────────────────────────────────────────────────

export function useMyInterestedState() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { levels: situationLevels, getLevelByValue } = useSituationLevels();

  // ── State ─────────────────────────────────────────────────

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTab, setSelectedTab] = useState<'my' | 'church'>('my');
  const [showDiscipleDialog, setShowDiscipleDialog] = useState(false);
  const [selectedInterested, setSelectedInterested] = useState<InterestedPerson | null>(null);
  const [discipleMessage, setDiscipleMessage] = useState('');
  const [selectedChurch, setSelectedChurch] = useState<string>('all');

  // Paginação
  const [itemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Admin authorization
  const [showAuthorizationModal, setShowAuthorizationModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscipleshipRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Pastor invite
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteInterested, setInviteInterested] = useState<InterestedPerson | null>(null);
  const [selectedMissionaryId, setSelectedMissionaryId] = useState<string>('');

  // Situation update
  const [updatingSituation, setUpdatingSituation] = useState<number | null>(null);

  // Permissions
  const isPastorUser = isPastor(user);
  const isAdmin = hasAdminAccess(user);

  // ── Queries ───────────────────────────────────────────────

  const {
    churchInterested,
    loadingChurch,
    myRelationships,
    loadingRelationships,
    myRequests,
    loadingRequests,
    allRequests,
    allRelationships,
    allUsers,
    allMembersForInvite,
  } = useMyInterestedQueries(user, isAdmin, isPastorUser);

  const {
    interestedBase,
    availableChurches,
    myInterested,
    sortedMyInterested,
    sortedFilteredChurchInterested,
    availableMissionaries,
    activeRelationshipsMap,
    approvedRequestsSet,
    pendingRequestsSet,
    missionaryNamesMap,
    myPendingInvites,
    statsData,
    totalPages,
    currentList,
  } = useMyInterestedComputed({
    isAdmin,
    userId: user?.id ? Number(user.id) : undefined,
    searchTerm: deferredSearchTerm,
    selectedStatus,
    selectedChurch,
    selectedTab,
    currentPage,
    itemsPerPage,
    churchInterested,
    myRelationships,
    myRequests,
    allRequests,
    allRelationships,
    allUsers,
    allMembersForInvite,
  });

  const {
    createDiscipleRequestMutation,
    updateRequestMutation,
    updateSituationMutation,
    directDiscipleMutation,
    pastorInviteMutation,
  } = useMyInterestedMutations({
    userId: user?.id ? Number(user.id) : undefined,
    isAdmin,
    queryClient,
    toast,
    logger: myInterestedLogger,
    setShowDiscipleDialog,
    setSelectedInterested,
    setDiscipleMessage,
    setShowAuthorizationModal,
    setSelectedRequest,
    setAdminNotes,
    setUpdatingSituation,
    setShowInviteModal,
    setInviteInterested,
    setSelectedMissionaryId,
  });

  // Disabled query - kept for reference
  const { data: interestedPoints = {}, isLoading: loadingPoints } = useQuery({
    queryKey: [
      'interested-points',
      myInterested.map((p: InterestedPerson) => p?.id).filter(Boolean),
    ],
    queryFn: async () => {
      const pointsMap: Record<number, number> = {};
      for (const interested of myInterested) {
        if (interested) {
          try {
            const response = await fetchWithAuth(`/api/users/${interested.id}/points-details`);
            if (response.ok) {
              const data = await response.json();
              pointsMap[interested.id] = data.points || 0;
            }
          } catch {
            // silently ignore
          }
        }
      }
      return pointsMap;
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  useMyInterestedEffects({
    isAdmin,
    selectedTab,
    setSelectedTab,
    searchTerm,
    selectedStatus,
    selectedChurch,
    setCurrentPage,
    isPastorUser,
    situationLevels,
    currentList,
    queryClient,
  });

  const {
    getSituationOption,
    handleSituationChange,
    handleOpenInvite,
    handleConfirmInvite,
    handleRespondInvite,
    hasPendingRequestForAdmin,
    handleDiscipleRequest,
    openAuthorizationModal,
    handleProcessRequest,
    getUserInfo,
    getMissionaryFirstNames,
    handleUnlinkDisciple,
    confirmDiscipleRequest,
    handleWhatsApp,
    handleOpenChat,
    getStatusColor,
    getStatusLabel,
    getDiscipleStatus,
    hasAnyActiveRelationship,
    hasAnyApprovedRequest,
    formatDate,
  } = useMyInterestedActions({
    user,
    isPastorUser,
    selectedTab,
    interestedBase,
    allUsers,
    allMembersForInvite,
    missionaryNamesMap,
    pendingRequestsSet,
    approvedRequestsSet,
    activeRelationshipsMap,
    myRelationships,
    allRequests,
    getLevelByValue,
    updateSituationMutation,
    updateRequestMutation,
    pastorInviteMutation,
    createDiscipleRequestMutation,
    setUpdatingSituation,
    setInviteInterested,
    setSelectedMissionaryId,
    setShowInviteModal,
    inviteInterested,
    selectedMissionaryId,
    setSelectedInterested,
    setShowDiscipleDialog,
    setSelectedRequest,
    setAdminNotes,
    setShowAuthorizationModal,
    selectedRequest,
    adminNotes,
    toast,
    queryClient,
    navigate,
    discipleMessage,
    selectedInterested,
  });

  // ── Return ────────────────────────────────────────────────

  return {
    // Auth / permissions
    user,
    isPastorUser,
    isAdmin,

    // State
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    selectedTab,
    setSelectedTab,
    showDiscipleDialog,
    setShowDiscipleDialog,
    selectedInterested,
    setSelectedInterested,
    discipleMessage,
    setDiscipleMessage,
    selectedChurch,
    setSelectedChurch,
    currentPage,
    setCurrentPage,
    showAuthorizationModal,
    setShowAuthorizationModal,
    selectedRequest,
    adminNotes,
    setAdminNotes,
    showInviteModal,
    setShowInviteModal,
    inviteInterested,
    selectedMissionaryId,
    setSelectedMissionaryId,
    updatingSituation,

    // Loading states
    loadingChurch,
    loadingRelationships,
    loadingRequests,
    loadingPoints,

    // Data
    interestedBase,
    availableChurches,
    myInterested,
    sortedMyInterested,
    sortedFilteredChurchInterested,
    availableMissionaries,
    myPendingInvites,
    allRequests,
    interestedPoints,
    statsData,
    totalPages,
    currentList,
    situationLevels,
    queryClient,
    pendingRequestsSet,
    itemsPerPage,

    // Mutations
    createDiscipleRequestMutation,
    updateRequestMutation,
    directDiscipleMutation,
    pastorInviteMutation,

    // Handlers
    getSituationOption,
    handleSituationChange,
    handleOpenInvite,
    handleConfirmInvite,
    handleRespondInvite,
    hasPendingRequestForAdmin,
    handleDiscipleRequest,
    openAuthorizationModal,
    handleProcessRequest,
    getUserInfo,
    getMissionaryFirstNames,
    handleUnlinkDisciple,
    confirmDiscipleRequest,
    handleWhatsApp,
    handleOpenChat,

    // Helpers
    getStatusColor,
    getStatusLabel,
    getDiscipleStatus,
    hasAnyActiveRelationship,
    hasAnyApprovedRequest,
    formatDate,
    getLevelIcon,
  };
}
