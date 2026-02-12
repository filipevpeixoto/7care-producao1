import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Church } from 'lucide-react';
import type { ChurchMetric } from '@/types/reports';

interface ChurchesTabProps {
  data?: ChurchMetric[];
  loading: boolean;
}

export function ChurchesTab({ data, loading }: ChurchesTabProps) {
  return (
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
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
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
                <Bar dataKey="baptized" name="Batizados" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading
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
          : (data ?? []).map(church => (
              <Card
                key={church.id}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Church className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold text-foreground dark:text-white">
                        {church.name}
                      </span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-500">
                      {church.tithersPercentage}% dizimistas
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Total</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {church.totalUsers}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Membros</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {church.members}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Batizados</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {church.baptized}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Engajam.</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {church.avgEngagement}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
