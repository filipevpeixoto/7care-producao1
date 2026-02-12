import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { MissionaryPerformance } from '@/types/reports';

interface MissionariesTabProps {
  data?: MissionaryPerformance[];
  loading: boolean;
}

export function MissionariesTab({ data, loading }: MissionariesTabProps) {
  return (
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
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(data ?? []).map((missionary, index) => (
                <div
                  key={missionary.id}
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
                    <Badge className="bg-purple-500/20 text-purple-500">{missionary.level}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Relacion.</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {missionary.activeRelationships}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        Mentoriados
                      </p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {missionary.totalMentored}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Conversões</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {missionary.conversions}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Pontos</p>
                      <p className="font-semibold text-foreground dark:text-white">
                        {missionary.points}
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
}
