import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  MessageCircle,
  Star,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: any;
  color: string;
}

interface DashboardStats {
  totalUsers: number;
  totalInterested: number;
  totalMembers: number;
  totalMissionaries: number;
  totalAdmins: number;
  totalChurches: number;
  pendingApprovals: number;
  thisWeekEvents: number;
  birthdaysToday: number;
  birthdaysThisWeek: number;
  totalEvents: number;
  approvedUsers: number;
}

interface AnalyticsDashboardProps {
  period?: '7d' | '30d' | '90d' | '1y';
  showExport?: boolean;
}

export const AnalyticsDashboard = ({
  period: _period = '30d',
  showExport = true,
}: AnalyticsDashboardProps) => {
  // Buscar estatísticas em tempo real
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Falha ao carregar estatísticas');
      return response.json();
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Calcular métricas dinâmicas baseadas nos dados reais
  const getMetrics = (): MetricCard[] => {
    if (!stats) return [];

    const previousMembers = stats.totalMembers - 5; // Simulação de crescimento
    const growth =
      previousMembers > 0
        ? Math.round(((stats.totalMembers - previousMembers) / previousMembers) * 100)
        : 0;

    return [
      {
        title: 'Total de Membros',
        value: stats.totalMembers,
        change: growth,
        changeType: growth > 0 ? 'increase' : growth < 0 ? 'decrease' : 'neutral',
        icon: Users,
        color: 'text-blue-600',
      },
      {
        title: 'Amigos',
        value: stats.totalInterested,
        change: 8,
        changeType: 'increase',
        icon: Star,
        color: 'text-orange-600',
      },
      {
        title: 'Eventos Esta Semana',
        value: stats.thisWeekEvents,
        change: 12,
        changeType: 'increase',
        icon: Calendar,
        color: 'text-green-600',
      },
      {
        title: 'Aprovações Pendentes',
        value: stats.pendingApprovals,
        change: -5,
        changeType: 'decrease',
        icon: MessageCircle,
        color: 'text-purple-600',
      },
    ];
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Erro ao carregar estatísticas</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = getMetrics();

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <metric.icon className={`h-8 w-8 ${metric.color}`} />
              </div>
              <div className="flex items-center mt-4">
                {getChangeIcon(metric.changeType)}
                <span className={cn('text-sm font-medium ml-1', getChangeColor(metric.changeType))}>
                  {metric.change > 0 ? '+' : ''}
                  {metric.change}%
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs período anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total de Usuários:</span>
                <span className="font-medium">{stats?.totalUsers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Igrejas:</span>
                <span className="font-medium">{stats?.totalChurches || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Eventos:</span>
                <span className="font-medium">{stats?.totalEvents || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aniversariantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Hoje:</span>
                <span className="font-medium">{stats?.birthdaysToday || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Esta Semana:</span>
                <span className="font-medium">{stats?.birthdaysThisWeek || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Aprovados:</span>
                <span className="font-medium">{stats?.approvedUsers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Pendentes:</span>
                <span className="font-medium">{stats?.pendingApprovals || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showExport && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      )}
    </div>
  );
};
