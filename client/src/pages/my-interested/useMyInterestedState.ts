import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess, isPastor } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock } from 'lucide-react';
import { getLevelIcon } from '@/lib/gamification';
import { fetchWithAuth } from '@/lib/api';
import { useSituationLevels } from '@/hooks/useSituationLevels';
import type { UserMember, ActiveRelationship } from '@/types/domain';

// ── Types ─────────────────────────────────────────────────────

export interface InterestedPerson {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  church: string;
  status: 'novo' | 'contato-inicial' | 'estudando' | 'batizado' | 'inativo';
  assignedDate?: string;
  lastContact?: string;
  nextStudy?: string;
  studiesCompleted: number;
  totalStudies: number;
  notes: string;
  source: 'evento' | 'indicacao' | 'online' | 'visita' | 'outro';
  interestedSituation?: string;
  interested_situation?: string;
  interests?: string[];
  relationship?: Relationship;
}

export interface Relationship {
  id: number;
  missionaryId: number;
  interestedId: number;
  status: 'active' | 'inactive' | 'completed';
  assignedAt: string;
  notes: string;
}

export interface DiscipleshipRequest {
  id: number;
  missionaryId: number;
  interestedId: number;
  status: 'pending' | 'approved' | 'rejected';
  type?: 'member-request' | 'pastor-invite';
  invitedBy?: number;
  requestedAt: string;
  createdAt?: string;
  notes: string;
  adminNotes?: string;
  interestedName?: string;
  missionaryName?: string;
}

// ── Hook ──────────────────────────────────────────────────────

export function useMyInterestedState() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { levels: situationLevels, getLevelByValue } = useSituationLevels();

  // ── State ─────────────────────────────────────────────────

  const [searchTerm, setSearchTerm] = useState('');
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

  const { data: churchInterested = [], isLoading: loadingChurch } = useQuery({
    queryKey: ['church-interested', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/my-interested');
      if (!response.ok) throw new Error('Erro ao buscar interessados da igreja');
      return response.json();
    },
    enabled: !!user?.id && !hasAdminAccess(user),
  });

  const { data: myRelationships = [], isLoading: loadingRelationships } = useQuery({
    queryKey: ['my-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth(`/api/relationships?missionaryId=${user.id}`);
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: myRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['my-discipleship-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth(`/api/discipleship-requests?missionaryId=${user.id}`);
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['all-discipleship-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/discipleship-requests');
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allRelationships = [] } = useQuery({
    queryKey: ['all-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/relationships');
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users', user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) return [];
      const endpoint = isAdmin ? '/api/users?role=interested' : '/api/users';
      const response = await fetchWithAuth(endpoint);
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allMembersForInvite = [] } = useQuery({
    queryKey: ['all-members-for-invite', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/users');
      if (!response.ok) throw new Error('Erro ao buscar membros');
      return response.json();
    },
    enabled: !!user?.id && isPastorUser,
  });

  // ── Computed (useMemo) ────────────────────────────────────

  const interestedBase: InterestedPerson[] = useMemo(() => {
    try {
      return isAdmin ? allUsers || [] : churchInterested || [];
    } catch (error) {
      console.error('Error in interestedBase:', error);
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

  const myInterested = useMemo(
    () =>
      isAdmin
        ? []
        : (myRelationships || [])
            .map((rel: Relationship) => {
              if (!rel?.interestedId) return null;
              const interested = (interestedBase || []).find(
                (p: InterestedPerson) => p?.id === rel.interestedId
              );
              return interested ? { ...interested, relationship: rel } : null;
            })
            .filter(Boolean),
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
          (u: UserMember) => u.role !== 'interested' && u.role !== 'superadmin' && u.id !== user?.id
        )
        .sort((a: UserMember, b: UserMember) =>
          (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
        ),
    [allMembersForInvite, user?.id]
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
          req?.missionaryId === Number(user?.id) &&
          req?.type === 'pastor-invite' &&
          req?.status === 'pending'
      ),
    [allRequests, user?.id]
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

  // Stats & pagination
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

  // ── Mutations ─────────────────────────────────────────────

  const createDiscipleRequestMutation = useMutation({
    mutationFn: async (data: {
      missionaryId: number;
      interestedId: number;
      status: string;
      notes: string;
      type?: string;
    }) => {
      const response = await fetchWithAuth('/api/discipleship-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao criar solicitação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
      toast({
        title: '✅ Solicitação enviada!',
        description: 'Aguarde a aprovação do administrador.',
      });
      setShowDiscipleDialog(false);
      setSelectedInterested(null);
      setDiscipleMessage('');
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao enviar solicitação',
        description: error.message || 'Não foi possível enviar a solicitação.',
        variant: 'destructive',
      });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
      adminNotes,
    }: {
      requestId: number;
      status: 'approved' | 'rejected';
      adminNotes: string;
    }) => {
      const response = await fetchWithAuth(`/api/discipleship-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          adminNotes,
          processedBy: user?.id || 1,
        }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar solicitação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      queryClient.invalidateQueries({ queryKey: ['my-interested'] });
      toast({
        title: '✅ Solicitação processada!',
        description: 'A solicitação foi processada com sucesso.',
      });
      setShowAuthorizationModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao processar',
        description: error.message || 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    },
  });

  const updateSituationMutation = useMutation({
    mutationFn: async ({ userId, situation }: { userId: number; situation: string }) => {
      const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ interestedSituation: situation }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro PUT situação:', response.status, errorText);
        throw new Error(`Erro ao atualizar situação: ${response.status}`);
      }
      const data = await response.json();
      return {
        ...data,
        _confirmedSituation:
          data?.user?.interestedSituation || data?.user?.interested_situation || situation,
      };
    },
    onMutate: async ({ userId, situation }) => {
      await queryClient.cancelQueries({ queryKey: ['church-interested'] });
      await queryClient.cancelQueries({ queryKey: ['all-users'] });

      const previousChurch = queryClient.getQueryData(['church-interested', user?.id]);
      const previousAll = queryClient.getQueryData(['all-users', user?.id, isAdmin]);

      const updateFn = (old: InterestedPerson[] | undefined) => {
        if (!old) return old;
        return old.map((person) =>
          person.id === userId
            ? { ...person, interestedSituation: situation, interested_situation: situation }
            : person
        );
      };

      queryClient.setQueryData(['church-interested', user?.id], updateFn);
      queryClient.setQueryData(['all-users', user?.id, isAdmin], updateFn);

      return { previousChurch, previousAll };
    },
    onSuccess: (data, variables) => {
      const confirmedSituation = data._confirmedSituation;
      const updateFn = (old: InterestedPerson[] | undefined) => {
        if (!old) return old;
        return old.map((person) =>
          person.id === variables.userId
            ? {
                ...person,
                interestedSituation: confirmedSituation,
                interested_situation: confirmedSituation,
              }
            : person
        );
      };

      queryClient.setQueryData(['church-interested', user?.id], updateFn);
      queryClient.setQueryData(['all-users', user?.id, isAdmin], updateFn);
      queryClient.invalidateQueries({ queryKey: ['/api/users'], refetchType: 'none' });

      setUpdatingSituation(null);
      toast({
        title: '✅ Situação atualizada!',
        description: 'A situação do amigo foi atualizada com sucesso.',
      });
    },
    onError: (error: Error, _variables, context) => {
      console.error('❌ Erro ao atualizar situação:', error);
      if (context?.previousChurch) {
        queryClient.setQueryData(['church-interested', user?.id], context.previousChurch);
      }
      if (context?.previousAll) {
        queryClient.setQueryData(['all-users', user?.id, isAdmin], context.previousAll);
      }
      setUpdatingSituation(null);
      toast({
        title: '❌ Erro ao atualizar situação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const directDiscipleMutation = useMutation({
    mutationFn: async ({
      interestedId,
      missionaryId,
    }: {
      interestedId: number;
      missionaryId: number;
    }) => {
      const response = await fetchWithAuth(`/api/users/${interestedId}/disciple`, {
        method: 'POST',
        body: JSON.stringify({ missionaryId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao vincular discipulador');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      toast({
        title: '✅ Discipulador vinculado!',
        description: 'O discipulador foi vinculado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao vincular',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pastorInviteMutation = useMutation({
    mutationFn: async ({
      interestedId,
      missionaryId,
    }: {
      interestedId: number;
      missionaryId: number;
    }) => {
      const response = await fetchWithAuth('/api/discipleship-requests', {
        method: 'POST',
        body: JSON.stringify({
          interestedId,
          missionaryId,
          type: 'pastor-invite',
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao enviar convite');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      setShowInviteModal(false);
      setInviteInterested(null);
      setSelectedMissionaryId('');
      toast({
        title: '✅ Convite enviado!',
        description: 'O membro receberá o convite para discipular.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Erro ao enviar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
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

  // ── Effects ───────────────────────────────────────────────

  // Force admin to 'church' tab
  useEffect(() => {
    if (isAdmin && selectedTab !== 'church') {
      setSelectedTab('church');
    }
  }, [isAdmin, selectedTab]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedChurch, selectedTab]);

  // Debug logging
  useEffect(() => {
    console.warn('📊 Estado MyInterested:', {
      isPastorUser,
      isAdmin,
      selectedTab,
      situationLevelsCount: situationLevels.length,
      situationLevels: situationLevels.map((l) => l.value),
      currentList: currentList.length,
    });
  }, [isPastorUser, isAdmin, selectedTab, situationLevels, currentList]);

  // Listen for situation-levels config changes
  useEffect(() => {
    const handleSituationLevelsUpdate = () => {
      console.warn('🔄 Configurações de situação atualizadas, forçando refresh...');
      queryClient.invalidateQueries({ queryKey: ['situation-levels'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
    };

    window.addEventListener('situation-levels-updated', handleSituationLevelsUpdate);
    return () => {
      window.removeEventListener('situation-levels-updated', handleSituationLevelsUpdate);
    };
  }, [queryClient]);

  // ── Handlers ──────────────────────────────────────────────

  const getSituationOption = (situation?: string) => getLevelByValue(situation);

  const handleSituationChange = (userId: number, situation: string) => {
    console.warn('🔄 Atualizando situação:', { userId, situation, isPastorUser, selectedTab });
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

  const getUserInfo = (userId: number) => {
    if (!userId) return 'Usuário desconhecido';
    const interested = interestedBase?.find((u: InterestedPerson) => u.id === userId);
    if (interested) return interested.name;
    const fromAllUsers = allUsers?.find((u: UserMember) => u.id === userId);
    if (fromAllUsers) return fromAllUsers.name;
    const fromMembers = allMembersForInvite?.find((u: UserMember) => u.id === userId);
    if (fromMembers) return fromMembers.name;
    return `Usuário ${userId}`;
  };

  const getMissionaryFirstNames = (interestedId: number): string[] => {
    return missionaryNamesMap.get(interestedId) || [];
  };

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

  // ── Helper functions ──────────────────────────────────────

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  const getDiscipleStatus = (interestedId: number) => {
    const myActiveRelationship = (myRelationships || []).find(
      (rel: Relationship) => rel.interestedId === interestedId && rel.status === 'active'
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
      (req: DiscipleshipRequest) =>
        req.interestedId === interestedId &&
        req.status === 'approved' &&
        req.missionaryId === Number(user?.id)
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
      (req: DiscipleshipRequest) =>
        req.interestedId === interestedId &&
        req.status === 'pending' &&
        req.missionaryId === Number(user?.id)
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

  const hasAnyActiveRelationship = (interestedId: number) => {
    return activeRelationshipsMap.has(interestedId);
  };

  const hasAnyApprovedRequest = (interestedId: number) => {
    return approvedRequestsSet.has(interestedId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // ── Return ────────────────────────────────────────────────

  return {
    // Auth / permissions
    user,
    isPastorUser,
    isAdmin,

    // State
    searchTerm, setSearchTerm,
    selectedStatus, setSelectedStatus,
    selectedTab, setSelectedTab,
    showDiscipleDialog, setShowDiscipleDialog,
    selectedInterested, setSelectedInterested,
    discipleMessage, setDiscipleMessage,
    selectedChurch, setSelectedChurch,
    currentPage, setCurrentPage,
    showAuthorizationModal, setShowAuthorizationModal,
    selectedRequest,
    adminNotes, setAdminNotes,
    showInviteModal, setShowInviteModal,
    inviteInterested,
    selectedMissionaryId, setSelectedMissionaryId,
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
