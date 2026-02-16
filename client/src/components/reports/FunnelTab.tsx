import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { REPORT_COLORS, type FunnelData } from '@/types/reports';

interface FunnelTabProps {
  data?: FunnelData;
  loading: boolean;
}

export function FunnelTab({ data, loading }: FunnelTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">Funil Espiritual</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Jornada de conversão dos interessados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(data?.funnel ?? []).map((stage, index) => {
                const total = data?.funnel?.reduce((sum, s) => sum + s.count, 0) || 1;
                const percentage = Math.round((stage.count / total) * 100);
                return (
                  <div key={stage.stage} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground dark:text-white capitalize">
                        {stage.stage}
                      </span>
                      <span className="text-sm text-muted-foreground dark:text-gray-400">
                        {stage.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: stage.color || REPORT_COLORS[index % REPORT_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {data?.conversions && (
        <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-foreground dark:text-white">Taxas de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{data.conversions.CtoB}%</p>
                <p className="text-sm text-muted-foreground">C → B</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{data.conversions.BtoA}%</p>
                <p className="text-sm text-muted-foreground">B → A</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-500">{data.conversions.AtoBaptism}%</p>
                <p className="text-sm text-muted-foreground">A → Batismo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Visualização do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.funnel ?? []} layout="vertical">
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
                  {(data?.funnel ?? []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || REPORT_COLORS[index % REPORT_COLORS.length]}
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
}
