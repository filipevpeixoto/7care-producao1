import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Activity } from 'lucide-react';
import { REPORT_COLORS, type EngagementData } from '@/types/reports';

interface EngagementTabProps {
  data?: EngagementData;
  loading: boolean;
}

export function EngagementTab({ data, loading }: EngagementTabProps) {
  const pieData = data?.engagementLevels
    ? Object.entries(data.engagementLevels).map(([key, value]) => ({
        name: key === 'high' ? 'Alto' : key === 'medium' ? 'Médio' : 'Baixo',
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 dark:from-green-500/20 dark:to-blue-500/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Activity className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground dark:text-gray-400">Engajamento Médio</p>
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {data?.avgEngagement ?? 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Níveis de Engajamento
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Distribuição dos níveis de participação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
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

      <div className="grid gap-4">
        {loading
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
          : (data?.categories ?? []).map((item, index) => (
              <Card
                key={item.label}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: REPORT_COLORS[index % REPORT_COLORS.length] }}
                      />
                      <span className="font-medium text-foreground dark:text-white">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-foreground dark:text-white">
                      {item.value}
                    </span>
                  </div>
                  <Progress value={(item.value / (item.max || 100)) * 100} className="h-2" />
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
