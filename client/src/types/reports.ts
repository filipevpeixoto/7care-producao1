/**
 * Report types - aligned with backend (reportsRoutes.ts)
 */

export interface OverviewData {
  totalUsers: number;
  totalChurches: number;
  totalEvents: number;
  totalDistricts: number;
  usersByRole: Record<string, number>;
  spiritualStages: Array<{ stage: string; count: number }>;
  engagementLevels: Record<string, number>;
  avgEngagement: number;
  tithers: number;
  donors: number;
  withLesson: number;
  baptized: number;
  tithersPercentage: number;
  donorsPercentage: number;
  eventsThisMonth: number;
  usersThisMonth: number;
  usersLastMonth: number;
  growthRate: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  color: string;
}

export interface FunnelData {
  funnel: FunnelStage[];
  conversions: {
    CtoB: number;
    BtoA: number;
    AtoBaptism: number;
  };
  totals: {
    totalInterested: number;
    totalBaptized: number;
    totalMembers: number;
    totalMissionaries: number;
  };
}

export interface ChurchMetric {
  id: number;
  name: string;
  totalUsers: number;
  interested: number;
  members: number;
  missionaries: number;
  baptized: number;
  tithers: number;
  avgEngagement: number;
  tithersPercentage: number;
}

export interface EngagementData {
  categories: Array<{ label: string; value: number; max: number }>;
  avgEngagement: number;
  engagementLevels: Record<string, number>;
}

export interface GrowthTrend {
  month: string;
  year: number;
  monthNum: number;
  newUsers: number;
  newInterested: number;
  newBaptized: number;
  newMembers: number;
}

export interface MissionaryPerformance {
  id: number;
  name: string;
  church: string;
  activeRelationships: number;
  totalMentored: number;
  conversions: number;
  engagement: number;
  points: number;
  level: string;
}

export interface DistrictData {
  id: number;
  name: string;
  code: string;
  pastorName: string;
  churchCount: number;
  totalUsers: number;
  interested: number;
  members: number;
  missionaries: number;
  baptized: number;
  tithers: number;
  avgEngagement: number;
  tithersPercentage: number;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  deadline: string;
  category: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
}

export interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'action';
  title: string;
  description: string;
  metric?: string;
  recommendation?: string;
}

export const REPORT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];
