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
import { MapPin } from 'lucide-react';
import type { DistrictData } from '@/types/reports';

interface DistrictsTabProps {
  data?: DistrictData[];
  loading: boolean;
}

export function DistrictsTab({ data, loading }: DistrictsTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-foreground dark:text-white">
            Comparativo de Distritos
          </CardTitle>
          <CardDescription className="dark:text-gray-400">Visão geral por distrito</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
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
                <Bar dataKey="churchCount" name="Igrejas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="members" name="Membros" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="baptized" name="Batizados" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          : (data ?? []).map(district => (
              <Card
                key={district.id}
                className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-500" />
                      <span className="font-semibold text-foreground dark:text-white">
                        {district.name}
                      </span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-500">
                      {district.tithersPercentage}% dizimistas
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Igrejas</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {district.churchCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Membros</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {district.members}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Batizados</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {district.baptized}
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
