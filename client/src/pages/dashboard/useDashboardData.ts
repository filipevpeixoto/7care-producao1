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
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSpiritualCheckIn } from '@/hooks/useSpiritualCheckIn';
import { useToast } from '@/components/ui/use-toast';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';
import type { DashboardUser, Event, BirthdayUser } from '@/types/domain';
import { useDashboardQueries } from './useDashboardQueries';

export function useDashboardData() {
  const { user, realUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { shouldShowCheckIn: _shouldShowCheckIn, markCheckInComplete } = useSpiritualCheckIn();
  const { toast: _toast } = useToast();
  const [showCheckIn, setShowCheckIn] = useState(false);

  const isAuthReady = !authLoading && !!user?.id;

  const {
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
  } = useDashboardQueries({ user, realUser, isAuthReady });

  // ── Computed Stats ──────────────────────────────────────────

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

    let totalTasks = 0;
    let pendingTasks = 0;
    let completedTasks = 0;
    if (tasksArray.length > 0) {
      const validTasks = tasksArray.filter(
        (task, index, array) => array.findIndex((t) => t.id === task.id) === index
      );
      totalTasks = validTasks.length;
      pendingTasks = validTasks.filter(
        (t) => t.status === 'pending' || t.status === 'in_progress'
      ).length;
      completedTasks = validTasks.filter((t) => t.status === 'completed').length;
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

  const stats = useMemo(
    () => ({
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
    }),
    [dashboardStats, dashboardStatsRaw]
  );

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
      'user-updated',
      'user-approved',
      'user-rejected',
      'user-imported',
      'relationship-updated',
      'relationship-created',
      'relationship-deleted',
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
  }, [user, dashboardStats, queryClient]);

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
