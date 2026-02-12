import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Flame,
  BarChart3,
  Award,
} from 'lucide-react';
import type { Insight } from '@/types/reports';

interface InsightsTabProps {
  data?: Insight[];
  loading: boolean;
}

function getInsightIcon(type: Insight['type']) {
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
}

function getInsightBorderColor(type: Insight['type']) {
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
}

export function InsightsTab({ data, loading }: InsightsTabProps) {
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
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(data ?? []).map(insight => (
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
}
