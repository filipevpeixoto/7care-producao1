/**
 * useDashboardData — Custom hook for Dashboard page
 *
 * Extracted from Dashboard.tsx (1809 lines) to separate:
 * - Data fetching (14 useQuery)
 * - Computed values (3 useMemo)
 * - Side effects (3 useEffect)
 * - Helper functions (getNextBirthday, formatBirthdayDate)
 *
 * The Dashboard component keeps only render functions + JSX.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSpiritualCheckIn } from '@/hooks/useSpiritualCheckIn';
import { useToast } from '@/components/ui/use-toast';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/api';
import type {
  SheetTask,
  DashboardUser,
  Task,
  Event,
  BirthdayUser,
} from '@/types/domain';

export function useDashboardData() {
  const { user, realUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { shouldShowCheckIn: _shouldShowCheckIn, markCheckInComplete } = useSpiritualCheckIn();
  const { toast: _toast } = useToast();
  const [showCheckIn, setShowCheckIn] = useState(false);

  const isAuthReady = !authLoading && !!user?.id;

  // ── Queries ─────────────────────────────────────────────────

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

  const usersData = Array.isArray(usersDataRaw) ? usersDataRaw : (usersDataRaw as any)?.data || [];

  const GOOGLE_SHEETS_CONFIG = {
    proxyUrl: '/api/google-sheets/proxy',
    spreadsheetId: '1i-x-0KiciwACRztoKX-YHlXT4FsrAzaKwuH-hHkD8go',
    sheetName: 'tarefas',
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
        status:
          sheetTask.status === 'Concluída'
            ? 'completed'
            : sheetTask.status === 'Em Progresso'
              ? 'in_progress'
              : 'pending',
        priority:
          sheetTask.prioridade === 'Alta'
            ? 'high'
            : sheetTask.prioridade === 'Baixa'
              ? 'low'
              : 'medium',
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

  const dashboardStats = useMemo(() => {
    if (unifiedData?.stats) {
      return {
        totalUsers: unifiedData.stats.totalUsers || 0,
        totalMembers: unifiedData.stats.totalMembers || 0,
        totalMissionaries: unifiedData.stats.totalMissionaries || 0,
        totalInterested: unifiedData.stats.totalInterested || 0,
        approvedUsers: unifiedData.stats.approvedUsers || 0,
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        totalPrayers: 0,
        totalVisits: 0,
        totalActivities: 0,
        totalPoints: 0,
        interestedBeingDiscipled: unifiedData.stats.interestedBeingDiscipled || 0,
      };
    }

    const tasksArray = Array.isArray(tasksData) ? tasksData : [];
    const totalUsers = dashboardStatsRaw?.totalUsers || usersData.length;
    const totalMembers =
      dashboardStatsRaw?.totalMembers ||
      usersData.filter(
        (u: DashboardUser) => u.role === 'member' || u.role === 'pastor' || u.role === 'superadmin'
      ).length;
    const totalMissionaries =
      dashboardStatsRaw?.totalMissionaries ||
      usersData.filter((u: DashboardUser) => u.role?.includes('missionary')).length;
    const totalInterested =
      dashboardStatsRaw?.totalInterested ||
      usersData.filter((u: DashboardUser) => u.role === 'interested').length;
    const approvedUsers =
      dashboardStatsRaw?.approvedUsers ||
      usersData.filter((u: DashboardUser) => u.status === 'approved').length;

    let totalTasks = 0, pendingTasks = 0, completedTasks = 0;
    if (tasksArray.length > 0) {
      const validTasks = tasksArray.filter(
        (task: Task, index: number, array: Task[]) =>
          array.findIndex((t) => t.id === task.id) === index
      );
      totalTasks = validTasks.length;
      pendingTasks = validTasks.filter(
        (t: Task) => t.status === 'pending' || t.status === 'in_progress'
      ).length;
      completedTasks = validTasks.filter((t: Task) => t.status === 'completed').length;
    }

    return {
      totalUsers,
      totalMembers,
      totalMissionaries,
      totalInterested,
      approvedUsers,
      totalTasks,
      pendingTasks,
      completedTasks,
      totalPrayers: dashboardStatsRaw?.totalPrayers || 0,
      totalVisits: dashboardStatsRaw?.totalVisits || 0,
      totalActivities: dashboardStatsRaw?.totalActivities || 0,
      totalPoints: dashboardStatsRaw?.totalPoints || 0,
      interestedBeingDiscipled: dashboardStatsRaw?.interestedBeingDiscipled || 0,
    };
  }, [dashboardStatsRaw, tasksData, usersData, unifiedData]);

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

  const { data: _missionaryRelationships, isLoading: _relationshipsLoading } = useQuery({
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

  const eventsThisMonthCount = useMemo(() => {
    if (!userEvents || !Array.isArray(userEvents) || userEvents.length === 0) return 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const parse = (v: unknown) => {
      if (!v) return null;
      const d = new Date(v as string | number | Date);
      return isNaN(d.getTime()) ? null : d;
    };

    const intersects = (start: Date | null, end: Date | null, a: Date, b: Date) => {
      if (!start && !end) return false;
      const s = start ?? end ?? a;
      const e = end ?? start ?? s;
      return s < b && e >= a;
    };

    return userEvents.filter((e: Event) => {
      if (!e || typeof e !== 'object') return false;
      const startDate = e.startDate || e.date;
      const endDate = e.endDate || e.end_date || e.date;
      return intersects(parse(startDate), parse(endDate), monthStart, nextMonthStart);
    }).length;
  }, [userEvents]);

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

  const { data: userDetailedData, isLoading: _userDetailedDataLoading } = useQuery({
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

  // ── Computed Stats ──────────────────────────────────────────

  const stats = useMemo(() => ({
    totalUsers: dashboardStats?.totalUsers || 0,
    totalInterested: dashboardStats?.totalInterested || 0,
    totalMembers: dashboardStats?.totalMembers || 0,
    totalMissionaries: dashboardStats?.totalMissionaries || 0,
    approvedUsers: dashboardStats?.approvedUsers || 0,
    totalTasks: dashboardStats?.totalTasks || 0,
    pendingTasks: dashboardStats?.pendingTasks || 0,
    completedTasks: dashboardStats?.completedTasks || 0,
    interestedBeingDiscipled: dashboardStatsRaw?.interestedBeingDiscipled || 0,
    totalChurches: dashboardStatsRaw?.totalChurches || 0,
    pendingApprovals: dashboardStatsRaw?.pendingApprovals || 0,
    thisWeekEvents: dashboardStatsRaw?.thisWeekEvents || 0,
    totalEvents: dashboardStatsRaw?.totalEvents || 0,
    totalPrayers: dashboardStats?.totalPrayers || 0,
    totalVisits: dashboardStats?.totalVisits || 0,
    totalActivities: dashboardStats?.totalActivities || 0,
    totalPoints: dashboardStats?.totalPoints || 0,
  }), [dashboardStats, dashboardStatsRaw]);

  // ── Effects ─────────────────────────────────────────────────

  // Custom event listeners for user updates
  React.useEffect(() => {
    let isMounted = true;

    const handleUserUpdate = (event: CustomEvent) => {
      try {
        if (!isMounted) return;
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/visits'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });

        if (
          event.detail?.type === 'missionary-assigned' ||
          event.detail?.type === 'missionary-removed'
        ) {
          queryClient.invalidateQueries({ queryKey: ['/api/relationships'] });
          queryClient.invalidateQueries({ queryKey: ['/api/relationships/missionary'] });
        }
        if (event.detail?.type === 'role-reverted') {
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        }
        if (event.detail?.type === 'missionary-profile-deactivated') {
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          queryClient.invalidateQueries({ queryKey: ['/api/missionary-profiles'] });
        }
      } catch {
        // silently ignore
      }
    };

    const events = [
      'user-updated', 'user-approved', 'user-rejected', 'user-imported',
      'relationship-updated', 'relationship-created', 'relationship-deleted',
    ];
    events.forEach((e) => window.addEventListener(e, handleUserUpdate as EventListener));

    return () => {
      isMounted = false;
      events.forEach((e) => window.removeEventListener(e, handleUserUpdate as EventListener));
    };
  }, [queryClient, refetchVisits]);

  // Auto-refresh stats every 30 seconds
  React.useEffect(() => {
    if (!user || !dashboardStats) return;

    const updateStats = async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      } catch {
        // silently ignore
      }
    };

    const interval = setInterval(updateStats, 30000);
    const handleFocus = () => updateStats();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, dashboardStats, queryClient]);

  // Admin: check missionary profiles
  React.useEffect(() => {
    if (!hasAdminAccess(user) || !dashboardStats) return () => {};

    const checkMissionaryProfiles = async () => {
      try {
        const response = await fetch('/api/system/check-missionary-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.correctedCount > 0) {
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/users'] });
            queryClient.invalidateQueries({ queryKey: ['/api/missionary-profiles'] });
          }
        }
      } catch {
        // silently ignore
      }
    };

    const timer = setTimeout(checkMissionaryProfiles, 2000);
    return () => clearTimeout(timer);
  }, [user?.role, dashboardStats, queryClient]);

  // ── Helper functions ────────────────────────────────────────

  const getNextBirthday = (birthdays: { today?: BirthdayUser[]; all?: BirthdayUser[] }) => {
    if (!birthdays?.all || !Array.isArray(birthdays.all) || birthdays.all.length === 0) return null;

    const today = new Date();
    const currentYear = today.getFullYear();

    const birthdaysThisYear = birthdays.all
      .filter((u: BirthdayUser) => u && typeof u === 'object' && u.birthDate)
      .map((u: BirthdayUser) => {
        let datePart = u.birthDate;
        if (u.birthDate.includes('T')) datePart = u.birthDate.split('T')[0];
        const [_year, month, day] = datePart.split('-');
        const birthMonth = parseInt(month) - 1;
        const birthDay = parseInt(day);
        const birthdayThisYear = new Date(currentYear, birthMonth, birthDay);
        if (birthdayThisYear < today) birthdayThisYear.setFullYear(currentYear + 1);
        return { ...u, nextBirthday: birthdayThisYear };
      });

    birthdaysThisYear.sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());
    return birthdaysThisYear[0];
  };

  const formatBirthdayDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const isUnifiedLoading = isSuperAdmin(user) && unifiedLoading;

  // ── Return ──────────────────────────────────────────────────

  return {
    // Auth
    user,
    realUser,
    authLoading,
    isAuthReady,

    // State
    showCheckIn,
    setShowCheckIn,
    markCheckInComplete,

    // Stats
    stats,
    isLoading,
    tasksLoading,
    isUnifiedLoading,

    // Query data
    birthdayData,
    birthdayLoading,
    visitData,
    visitsLoading,
    refetchVisits,
    userEvents,
    userEventsLoading,
    eventsThisMonthCount,
    spiritualCheckIns,
    spiritualCheckInsLoading,
    districtsCount,
    pastorsCount,
    churchInterested,
    churchInterestedLoading,
    userRelationships,
    userRelationshipsLoading,
    userDetailedData,

    // Helpers
    getNextBirthday,
    formatBirthdayDate,

    // Utilities
    queryClient,
  };
}
