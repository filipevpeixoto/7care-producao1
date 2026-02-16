import { useQuery } from '@tanstack/react-query';
import { hasAdminAccess, isSuperAdmin, type UserLike } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/api';
import type { DashboardUser, SheetTask } from '@/types/domain';

type UseDashboardQueriesProps = {
  user: UserLike;
  isAuthReady: boolean;
};

export const useDashboardQueries = ({ user, isAuthReady }: UseDashboardQueriesProps) => {
  const { data: unifiedData, isLoading: unifiedLoading } = useQuery({
    queryKey: ['/api/dashboard/unified', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/dashboard/unified');
      if (!response.ok) throw new Error('Failed to fetch unified dashboard');
      return response.json();
    },
    enabled: isAuthReady && isSuperAdmin(user),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: usersDataRaw } = useQuery({
    queryKey: ['/api/users', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/users?limit=5000');
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: isAuthReady,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const usersData = Array.isArray(usersDataRaw)
    ? usersDataRaw
    : (usersDataRaw as { data?: DashboardUser[] })?.data || [];

  const GOOGLE_SHEETS_CONFIG = {
    proxyUrl: '/api/google-sheets/proxy',
    spreadsheetId: '1i-x-0KiciwACRztoKX-YHlXT4FsrAzaKwuH-hHkD8go',
    sheetName: 'tarefas',
  };

  const resolveTaskStatus = (status?: string) => {
    if (status === 'Concluída') return 'completed';
    if (status === 'Em Progresso') return 'in_progress';
    return 'pending';
  };

  const resolveTaskPriority = (priority?: string) => {
    if (priority === 'Alta') return 'high';
    if (priority === 'Baixa') return 'low';
    return 'medium';
  };

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetchWithAuth(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getTasks',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
        }),
      });
      if (!response.ok) throw new Error('Erro ao buscar tarefas do Google Sheets');
      const data = await response.json();
      const tasks = data.tasks || [];

      return tasks.map((sheetTask: SheetTask) => ({
        id: sheetTask.id,
        title: sheetTask.titulo || '',
        description: sheetTask.descricao || '',
        status: resolveTaskStatus(sheetTask.status),
        priority: resolveTaskPriority(sheetTask.prioridade),
        assigned_to_name: sheetTask.responsavel || '',
        created_by_name: sheetTask.criador || '',
        church: sheetTask.igreja || '',
        created_at: sheetTask.data_criacao
          ? new Date(sheetTask.data_criacao.split('/').reverse().join('-')).toISOString()
          : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        due_date: sheetTask.data_vencimento || '',
        completed_at: sheetTask.data_conclusao || '',
        tags: sheetTask.tags ? sheetTask.tags.split(',').filter(Boolean) : [],
      }));
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: isAuthReady && !isSuperAdmin(user),
  });

  const { data: dashboardStatsRaw, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats', user?.id],
    queryFn: async () => {
      if (unifiedData?.stats) return unifiedData.stats;
      const response = await fetchWithAuth('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    enabled: isAuthReady,
    initialData: unifiedData?.stats,
  });

  const { data: birthdayData, isLoading: birthdayLoading } = useQuery({
    queryKey: ['/api/users/birthdays', user?.id, user?.role],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/users/birthdays');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled: isAuthReady,
    refetchInterval: 300000,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const {
    data: visitData,
    refetch: refetchVisits,
    isLoading: visitsLoading,
  } = useQuery({
    queryKey: ['/api/dashboard/visits', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/dashboard/visits');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled: isAuthReady,
    refetchInterval: 300000,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });

  useQuery({
    queryKey: ['/api/relationships/missionary', user?.id],
    queryFn: async () => {
      if (!user?.id || user.role !== 'missionary') return [];
      const response = await fetchWithAuth(`/api/relationships/missionary/${user.id}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled: isAuthReady && user?.role?.includes('missionary'),
    refetchInterval: 300000,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });

  const { data: userEvents, isLoading: userEventsLoading } = useQuery({
    queryKey: ['/api/events', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.role) return [];
      const response = await fetchWithAuth(`/api/events?role=${user.role}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled: isAuthReady && !!user?.role,
    refetchInterval: 300000,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });

  const { data: spiritualCheckIns, isLoading: spiritualCheckInsLoading } = useQuery({
    queryKey: ['/api/emotional-checkins/admin', user?.id],
    queryFn: async () => {
      if (!hasAdminAccess(user)) return [];
      const response = await fetchWithAuth('/api/emotional-checkins/admin');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled: isAuthReady && hasAdminAccess(user),
    refetchInterval: 300000,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });

  const { data: districtsCount } = useQuery({
    queryKey: ['/api/districts', 'count', user?.id],
    queryFn: async () => {
      if (unifiedData?.districtsCount !== undefined) return unifiedData.districtsCount;
      const response = await fetchWithAuth('/api/districts');
      if (!response.ok) return 0;
      const data = await response.json();
      return Array.isArray(data) ? data.length : 0;
    },
    enabled: isAuthReady && isSuperAdmin(user),
    staleTime: 60 * 1000,
    refetchOnMount: true,
    initialData: unifiedData?.districtsCount,
  });

  const { data: pastorsCount } = useQuery({
    queryKey: ['/api/pastors', 'count', user?.id],
    queryFn: async () => {
      if (unifiedData?.pastorsCount !== undefined) return unifiedData.pastorsCount;
      const response = await fetchWithAuth('/api/pastors');
      if (!response.ok) return 0;
      const data = await response.json();
      return Array.isArray(data) ? data.length : 0;
    },
    enabled: isAuthReady && isSuperAdmin(user),
    staleTime: 60 * 1000,
    refetchOnMount: true,
    initialData: unifiedData?.pastorsCount,
  });

  const { data: churchInterested, isLoading: churchInterestedLoading } = useQuery({
    queryKey: ['church-interested', user?.id],
    queryFn: async () => {
      if (!user?.id || (user.role !== 'member' && user.role !== 'missionary')) return [];
      const response = await fetchWithAuth('/api/my-interested');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled: isAuthReady && (user?.role === 'member' || user?.role === 'missionary'),
    refetchInterval: 300000,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });

  const { data: userRelationships, isLoading: userRelationshipsLoading } = useQuery({
    queryKey: ['my-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id || (user.role !== 'member' && user.role !== 'missionary')) return [];
      const response = await fetchWithAuth(`/api/relationships/missionary/${user.id}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled: isAuthReady && (user?.role === 'member' || user?.role === 'missionary'),
    refetchInterval: 300000,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });

  const { data: userDetailedData } = useQuery({
    queryKey: ['/api/users', user?.id, 'points-details'],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetchWithAuth(`/api/users/${user.id}/points-details`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled: isAuthReady,
    refetchInterval: 300000,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    unifiedData,
    unifiedLoading,
    usersData,
    tasksData,
    tasksLoading,
    dashboardStatsRaw,
    isLoading,
    birthdayData,
    birthdayLoading,
    visitData,
    refetchVisits,
    visitsLoading,
    userEvents,
    userEventsLoading,
    spiritualCheckIns,
    spiritualCheckInsLoading,
    districtsCount,
    pastorsCount,
    churchInterested,
    churchInterestedLoading,
    userRelationships,
    userRelationshipsLoading,
    userDetailedData,
  };
};
