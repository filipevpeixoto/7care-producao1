import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, AlertCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import type { Goal } from '@/types/reports';

interface GoalsTabProps {
  data?: Goal[];
  loading: boolean;
}

function getStatusIcon(status: Goal['status']) {
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
}

function getStatusBadge(status: Goal['status']) {
  const statusConfig = {
    completed: { label: 'Concluída', className: 'bg-green-500/20 text-green-500' },
    'on-track': { label: 'No Prazo', className: 'bg-blue-500/20 text-blue-500' },
    'at-risk': { label: 'Em Risco', className: 'bg-yellow-500/20 text-yellow-500' },
    behind: { label: 'Atrasada', className: 'bg-red-500/20 text-red-500' },
  };
  const config = statusConfig[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}

export function GoalsTab({ data, loading }: GoalsTabProps) {
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
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(data ?? []).map(goal => {
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
}
