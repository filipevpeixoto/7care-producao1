import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin, isPastor } from '@/lib/permissions';
import type {
  OverviewData,
  FunnelData,
  ChurchMetric,
  EngagementData,
  GrowthTrend,
  MissionaryPerformance,
  DistrictData,
  Goal,
  Insight,
} from '@/types/reports';

export function useReportsData() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const isAdmin = isSuperAdmin(user);
  const isPastorUser = isPastor(user);
  const hasAccess = isAdmin || isPastorUser;

  const {
    data: overviewData,
    isLoading: loadingOverview,
    refetch: refetchOverview,
  } = useQuery<OverviewData>({
    queryKey: ['/api/reports/overview', selectedPeriod, user?.id],
    enabled: !!user?.id && hasAccess,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: funnelData, isLoading: loadingFunnel } = useQuery<FunnelData>({
    queryKey: ['/api/reports/spiritual-funnel', selectedPeriod, user?.id],
    enabled: !!user?.id && hasAccess && activeTab === 'funnel',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: churchData, isLoading: loadingChurches } = useQuery<ChurchMetric[]>({
    queryKey: ['/api/reports/church-comparison', selectedPeriod, user?.id],
    enabled: !!user?.id && hasAccess && activeTab === 'churches',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: engagementData, isLoading: loadingEngagement } = useQuery<EngagementData>({
    queryKey: ['/api/reports/engagement-analysis', selectedPeriod, user?.id],
    enabled: !!user?.id && hasAccess && activeTab === 'engagement',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: growthData, isLoading: loadingGrowth } = useQuery<GrowthTrend[]>({
    queryKey: ['/api/reports/growth-trends', selectedPeriod, user?.id],
    enabled: !!user?.id && hasAccess && activeTab === 'growth',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: missionaryData, isLoading: loadingMissionary } = useQuery<MissionaryPerformance[]>(
    {
      queryKey: ['/api/reports/missionary-performance', selectedPeriod, user?.id],
      enabled: !!user?.id && isPastorUser && activeTab === 'missionaries',
      staleTime: 0,
      refetchOnMount: 'always',
    }
  );

  const { data: districtData, isLoading: loadingDistrict } = useQuery<DistrictData[]>({
    queryKey: ['/api/reports/district-comparison', selectedPeriod, user?.id],
    enabled: !!user?.id && isAdmin && activeTab === 'districts',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: goalsData, isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/reports/goals', selectedPeriod, user?.id],
    enabled: !!user?.id && hasAccess && activeTab === 'goals',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: insightsData, isLoading: loadingInsights } = useQuery<Insight[]>({
    queryKey: ['/api/reports/insights', selectedPeriod, user?.id],
    enabled: !!user?.id && hasAccess && activeTab === 'insights',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return {
    // State
    activeTab,
    setActiveTab,
    selectedPeriod,
    setSelectedPeriod,
    // Permissions
    isAdmin,
    isPastorUser,
    hasAccess,
    // Data
    overviewData,
    loadingOverview,
    refetchOverview,
    funnelData,
    loadingFunnel,
    churchData,
    loadingChurches,
    engagementData,
    loadingEngagement,
    growthData,
    loadingGrowth,
    missionaryData,
    loadingMissionary,
    districtData,
    loadingDistrict,
    goalsData,
    loadingGoals,
    insightsData,
    loadingInsights,
  };
}
