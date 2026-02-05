import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin, isPastor } from '@/lib/permissions';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Church,
  Target,
  Lightbulb,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Calendar,
  MapPin,
  Award,
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  BookOpen,
  UserPlus,
} from 'lucide-react';

// Types
interface OverviewData {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  totalChurches: number;
  totalMissionaries: number;
  averageAttendance: number;
  baptismsThisYear: number;
  studiesInProgress: number;
  growthRate: number;
  retentionRate: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

interface ChurchMetric {
  churchId: string;
  churchName: string;
  members: number;
  attendance: number;
  baptisms: number;
  studies: number;
  growthRate: number;
}

interface EngagementData {
  category: string;
  value: number;
  change: number;
}

interface GrowthTrend {
  month: string;
  members: number;
  baptisms: number;
  studies: number;
  attendance: number;
}

interface MissionaryPerformance {
  missionaryId: string;
  name: string;
  church: string;
  studies: number;
  baptisms: number;
  visits: number;
  activeContacts: number;
  conversionRate: number;
}

interface DistrictData {
  districtId: string;
  districtName: string;
  churches: number;
  members: number;
  baptisms: number;
  growthRate: number;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  deadline: string;
  category: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'action';
  title: string;
  description: string;
  metric?: string;
  recommendation?: string;
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

// Reserved for future funnel visualization
const _FUNNEL_COLORS = {
  visitor: '#94a3b8',
  interested: '#60a5fa',
  studying: '#34d399',
  baptized: '#fbbf24',
  member: '#a78bfa',
  leader: '#f472b6',
};

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const isAdmin = isSuperAdmin(user);
  const isPastorUser = isPastor(user);
  const hasAccess = isAdmin || isPastorUser;

  // Queries - IMPORTANTE: user?.id na queryKey para cache separado por usuário
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

  const { data: funnelData, isLoading: loadingFunnel } = useQuery<FunnelStage[]>({
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

  const { data: engagementData, isLoading: loadingEngagement } = useQuery<EngagementData[]>({
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

  const { data: missionaryData, isLoading: loadingMissionary } = useQuery<MissionaryPerformance[]>({
    queryKey: ['/api/reports/missionary-performance', selectedPeriod, user?.id],
    enabled: !!user?.id && isPastorUser && activeTab === 'missionaries',
    staleTime: 0,
    refetchOnMount: 'always',
  });

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

  if (!hasAccess) {
    return (
      <MobileLayout title="Relatórios">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground text-center">
            Você não tem permissão para acessar os relatórios.
          </p>
        </div>
      </MobileLayout>
    );
  }

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    loading,
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ElementType;
    loading?: boolean;
  }) => (
    <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground dark:text-gray-400">{title}</span>
              <Icon className="h-4 w-4 text-muted-foreground dark:text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-foreground dark:text-white">{value}</div>
            {change !== undefined && (
              <div className="flex items-center mt-1">
                {change >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(change)}% vs mês anterior
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total de Membros"
          value={overviewData?.totalMembers ?? 0}
          change={overviewData?.growthRate}
          icon={Users}
          loading={loadingOverview}
        />
        <StatCard
          title="Membros Ativos"
          value={overviewData?.activeMembers ?? 0}
          change={overviewData?.retentionRate}
          icon={Activity}
          loading={loadingOverview}
        />
        <StatCard
          title="Novos este Mês"
          value={overviewData?.newMembersThisMonth ?? 0}
          icon={UserPlus}
          loading={loadingOverview}
        />
        <StatCard
          title="Batismos no Ano"
          value={overviewData?.baptismsThisYear ?? 0}
          icon={Heart}
          loading={loadingOverview}
        />
        <StatCard
          title="Estudos em Andamento"
          value={overviewData?.studiesInProgress ?? 0}
          icon={BookOpen}
          loading={loadingOverview}
        />
        <StatCard
          title="Média de Presença"
          value={`${overviewData?.averageAttendance ?? 0}%`}
          icon={BarChart3}
          loading={loadingOverview}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4">
        <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground dark:text-white flex items-center gap-2">
              <Church className="h-5 w-5" />
              Visão Geral das Igrejas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground dark:text-gray-400">Total de Igrejas</span>
                  <span className="font-semibold text-foreground dark:text-white">
                    {overviewData?.totalChurches ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground dark:text-gray-400">
                    Total de Missionários
                  </span>
                  <span className="font-semibold text-foreground dark:text-white">
                    {overviewData?.totalMissionaries ?? 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Taxa de Crescimento
                </p>
                <p className="text-2xl font-bold text-foreground dark:text-white">
                  {overviewData?.growthRate ?? 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const FunnelTab = () => (
    <div className="space-y-6">
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Funil Espiritual
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Jornada de conversão dos interessados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFunnel ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(funnelData ?? []).map((stage, index) => (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground dark:text-white capitalize">
                      {stage.stage}
                    </span>
                    <span className="text-sm text-muted-foreground dark:text-gray-400">
                      {stage.count} ({stage.percentage}%)
                    </span>
                  </div>
                  <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${stage.percentage}%`,
                        backgroundColor: stage.color || COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Visualização do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFunnel ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="stage" type="category" width={100} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f9fafb' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {(funnelData ?? []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const EngagementTab = () => (
    <div className="space-y-6">
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Análise de Engajamento
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Métricas de participação e envolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingEngagement ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementData ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="category"
                  label={({ category, value }) => `${category}: ${value}`}
                >
                  {(engagementData ?? []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <div className="grid gap-4">
        {loadingEngagement
          ? [1, 2, 3].map(i => (
              <Card
                key={i}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          : (engagementData ?? []).map((item, index) => (
              <Card
                key={item.category}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium text-foreground dark:text-white">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-foreground dark:text-white">
                        {item.value}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.change >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span
                          className={`text-xs ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {Math.abs(item.change)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );

  const GrowthTab = () => (
    <div className="space-y-6">
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Tendências de Crescimento
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Evolução ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGrowth ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData ?? []}>
                <defs>
                  <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBaptisms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f9fafb' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="members"
                  name="Membros"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorMembers)"
                />
                <Area
                  type="monotone"
                  dataKey="baptisms"
                  name="Batismos"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorBaptisms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Additional Growth Metrics */}
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Estudos e Presença
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingGrowth ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growthData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f9fafb' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="studies"
                  name="Estudos"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  name="Presença"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const ChurchesTab = () => (
    <div className="space-y-6">
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Comparativo de Igrejas
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Performance por congregação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingChurches ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={churchData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="churchName"
                  stroke="#9ca3af"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f9fafb' }}
                />
                <Legend />
                <Bar dataKey="members" name="Membros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="baptisms" name="Batismos" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Church Cards */}
      <div className="space-y-4">
        {loadingChurches
          ? [1, 2, 3].map(i => (
              <Card
                key={i}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          : (churchData ?? []).map(church => (
              <Card
                key={church.churchId}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Church className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold text-foreground dark:text-white">
                        {church.churchName}
                      </span>
                    </div>
                    <Badge
                      variant={church.growthRate >= 0 ? 'default' : 'destructive'}
                      className={church.growthRate >= 0 ? 'bg-green-500/20 text-green-500' : ''}
                    >
                      {church.growthRate >= 0 ? '+' : ''}
                      {church.growthRate}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Membros</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {church.members}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Presença</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {church.attendance}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Batismos</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {church.baptisms}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Estudos</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {church.studies}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );

  const MissionariesTab = () => (
    <div className="space-y-6">
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Performance dos Missionários
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Métricas individuais de desempenho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMissionary ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(missionaryData ?? []).map((missionary, index) => (
                <div
                  key={missionary.missionaryId}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-500">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground dark:text-white">
                            {missionary.name}
                          </p>
                          <p className="text-xs text-muted-foreground dark:text-gray-400">
                            {missionary.church}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-500">
                      {missionary.conversionRate}% conversão
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Estudos</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {missionary.studies}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Batismos</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {missionary.baptisms}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Visitas</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {missionary.visits}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Contatos</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {missionary.activeContacts}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const DistrictsTab = () => (
    <div className="space-y-6">
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Comparativo de Distritos
          </CardTitle>
          <CardDescription className="dark:text-gray-400">Visão geral por distrito</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDistrict ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={districtData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="districtName" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f9fafb' }}
                />
                <Legend />
                <Bar dataKey="churches" name="Igrejas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="members" name="Membros" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="baptisms" name="Batismos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* District Cards */}
      <div className="space-y-4">
        {loadingDistrict
          ? [1, 2, 3].map(i => (
              <Card
                key={i}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          : (districtData ?? []).map(district => (
              <Card
                key={district.districtId}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-500" />
                      <span className="font-semibold text-foreground dark:text-white">
                        {district.districtName}
                      </span>
                    </div>
                    <Badge
                      variant={district.growthRate >= 0 ? 'default' : 'destructive'}
                      className={district.growthRate >= 0 ? 'bg-green-500/20 text-green-500' : ''}
                    >
                      {district.growthRate >= 0 ? '+' : ''}
                      {district.growthRate}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Igrejas</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {district.churches}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Membros</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {district.members}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Batismos</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {district.baptisms}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );

  const GoalsTab = () => {
    const getStatusIcon = (status: Goal['status']) => {
      switch (status) {
        case 'completed':
          return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'on-track':
          return <TrendingUp className="h-4 w-4 text-blue-500" />;
        case 'at-risk':
          return <Clock className="h-4 w-4 text-yellow-500" />;
        case 'behind':
          return <AlertCircle className="h-4 w-4 text-red-500" />;
        default:
          return null;
      }
    };

    const getStatusBadge = (status: Goal['status']) => {
      const statusConfig = {
        completed: { label: 'Concluída', className: 'bg-green-500/20 text-green-500' },
        'on-track': { label: 'No Prazo', className: 'bg-blue-500/20 text-blue-500' },
        'at-risk': { label: 'Em Risco', className: 'bg-yellow-500/20 text-yellow-500' },
        behind: { label: 'Atrasada', className: 'bg-red-500/20 text-red-500' },
      };
      const config = statusConfig[status];
      return <Badge className={config.className}>{config.label}</Badge>;
    };

    return (
      <div className="space-y-6">
        <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-foreground dark:text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas e Objetivos
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Acompanhamento do progresso das metas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGoals ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(goalsData ?? []).map(goal => {
                  const progress = Math.min((goal.current / goal.target) * 100, 100);
                  return (
                    <div
                      key={goal.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(goal.status)}
                          <span className="font-medium text-foreground dark:text-white">
                            {goal.title}
                          </span>
                        </div>
                        {getStatusBadge(goal.status)}
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground dark:text-gray-400">
                            {goal.current} / {goal.target}
                          </span>
                          <span className="text-muted-foreground dark:text-gray-400">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <Badge
                          variant="outline"
                          className="dark:border-gray-600 dark:text-gray-400"
                        >
                          {goal.category}
                        </Badge>
                        <span className="text-muted-foreground dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const InsightsTab = () => {
    const getInsightIcon = (type: Insight['type']) => {
      switch (type) {
        case 'success':
          return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        case 'warning':
          return <AlertCircle className="h-5 w-5 text-yellow-500" />;
        case 'info':
          return <Lightbulb className="h-5 w-5 text-blue-500" />;
        case 'action':
          return <Flame className="h-5 w-5 text-orange-500" />;
        default:
          return <Lightbulb className="h-5 w-5 text-gray-500" />;
      }
    };

    const getInsightBorderColor = (type: Insight['type']) => {
      switch (type) {
        case 'success':
          return 'border-l-green-500';
        case 'warning':
          return 'border-l-yellow-500';
        case 'info':
          return 'border-l-blue-500';
        case 'action':
          return 'border-l-orange-500';
        default:
          return 'border-l-gray-500';
      }
    };

    return (
      <div className="space-y-6">
        <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-foreground dark:text-white flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Insights Automáticos
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Análises e recomendações baseadas nos dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInsights ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(insightsData ?? []).map(insight => (
                  <div
                    key={insight.id}
                    className={`p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 ${getInsightBorderColor(insight.type)} border border-gray-200 dark:border-gray-600`}
                  >
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground dark:text-white mb-1">
                          {insight.title}
                        </h4>
                        <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                          {insight.description}
                        </p>
                        {insight.metric && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-xs font-medium text-foreground dark:text-white">
                            <BarChart3 className="h-3 w-3" />
                            {insight.metric}
                          </div>
                        )}
                        {insight.recommendation && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                              <Award className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {insight.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <MobileLayout title="Relatórios">
      <div className="p-4 space-y-4">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-white">Relatórios</h1>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Análise de dados e métricas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchOverview()}
              className="dark:border-gray-600 dark:text-gray-300"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="dark:border-gray-600 dark:text-gray-300"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mês' },
            { value: 'quarter', label: 'Trimestre' },
            { value: 'year', label: 'Ano' },
          ].map(period => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
              className={
                selectedPeriod === period.value
                  ? 'bg-primary'
                  : 'dark:border-gray-600 dark:text-gray-300'
              }
            >
              {period.label}
            </Button>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex overflow-x-auto bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex-1 min-w-fit text-xs">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="funnel" className="flex-1 min-w-fit text-xs">
              Funil
            </TabsTrigger>
            <TabsTrigger value="engagement" className="flex-1 min-w-fit text-xs">
              Engajamento
            </TabsTrigger>
            <TabsTrigger value="growth" className="flex-1 min-w-fit text-xs">
              Crescimento
            </TabsTrigger>
            <TabsTrigger value="churches" className="flex-1 min-w-fit text-xs">
              Igrejas
            </TabsTrigger>
            {isPastorUser && (
              <TabsTrigger value="missionaries" className="flex-1 min-w-fit text-xs">
                Missionários
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="districts" className="flex-1 min-w-fit text-xs">
                Distritos
              </TabsTrigger>
            )}
            <TabsTrigger value="goals" className="flex-1 min-w-fit text-xs">
              Metas
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex-1 min-w-fit text-xs">
              Insights
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="overview" className="m-0">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="funnel" className="m-0">
              <FunnelTab />
            </TabsContent>
            <TabsContent value="engagement" className="m-0">
              <EngagementTab />
            </TabsContent>
            <TabsContent value="growth" className="m-0">
              <GrowthTab />
            </TabsContent>
            <TabsContent value="churches" className="m-0">
              <ChurchesTab />
            </TabsContent>
            {isPastorUser && (
              <TabsContent value="missionaries" className="m-0">
                <MissionariesTab />
              </TabsContent>
            )}
            {isAdmin && (
              <TabsContent value="districts" className="m-0">
                <DistrictsTab />
              </TabsContent>
            )}
            <TabsContent value="goals" className="m-0">
              <GoalsTab />
            </TabsContent>
            <TabsContent value="insights" className="m-0">
              <InsightsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
