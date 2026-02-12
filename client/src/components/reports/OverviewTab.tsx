import { StatCard } from '@/components/reports/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Activity,
  UserPlus,
  Heart,
  BookOpen,
  BarChart3,
  Church,
  TrendingUp,
} from 'lucide-react';
import type { OverviewData } from '@/types/reports';

interface OverviewTabProps {
  data?: OverviewData;
  loading: boolean;
}

export function OverviewTab({ data, loading }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total de Usuários"
          value={data?.totalUsers ?? 0}
          change={data?.growthRate}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Engajamento Médio"
          value={`${data?.avgEngagement ?? 0}%`}
          icon={Activity}
          loading={loading}
        />
        <StatCard
          title="Novos este Mês"
          value={data?.usersThisMonth ?? 0}
          icon={UserPlus}
          loading={loading}
        />
        <StatCard
          title="Batizados"
          value={data?.baptized ?? 0}
          icon={Heart}
          loading={loading}
        />
        <StatCard
          title="Com Lição"
          value={data?.withLesson ?? 0}
          icon={BookOpen}
          loading={loading}
        />
        <StatCard
          title="Dizimistas"
          value={`${data?.tithersPercentage ?? 0}%`}
          icon={BarChart3}
          loading={loading}
        />
      </div>

      <div className="grid gap-4">
        <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground dark:text-white flex items-center gap-2">
              <Church className="h-5 w-5" />
              Visão Geral das Igrejas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground dark:text-gray-400">Total de Igrejas</span>
                  <span className="font-semibold text-foreground dark:text-white">
                    {data?.totalChurches ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground dark:text-gray-400">
                    Total de Missionários
                  </span>
                  <span className="font-semibold text-foreground dark:text-white">
                    {data?.usersByRole?.missionary ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground dark:text-gray-400">
                    Total de Distritos
                  </span>
                  <span className="font-semibold text-foreground dark:text-white">
                    {data?.totalDistricts ?? 0}
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
                  {data?.growthRate ?? 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
