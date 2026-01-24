import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Users, 
  TrendingUp, 
  Award,
  Mountain,
  Crown,
  Star
} from 'lucide-react';
import { usePointsCalculation } from '@/hooks/usePointsCalculation';
import { GAMIFICATION_LEVELS } from '@/lib/gamification';

export const GamificationStats = () => {
  const { getStatistics, getTopUsers, isLoading } = usePointsCalculation();
  const stats = getStatistics() as any;
  const topUsers = getTopUsers(10);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-sm text-muted-foreground">Total de Membros</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Pontos Totais</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.averagePoints}</div>
                <div className="text-sm text-muted-foreground">Média por Membro</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{topUsers.length}</div>
                <div className="text-sm text-muted-foreground">Top Performers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Níveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
            Distribuição por Montes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GAMIFICATION_LEVELS.map((level) => {
              const userCount = (stats.levelDistribution && (stats.levelDistribution as Record<string, number>)[level.mount]) || 0;
              const percentage = stats.totalUsers > 0 ? Math.round((userCount / stats.totalUsers) * 100) : 0;
              
              return (
                <div key={level.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-2xl">{level.icon}</div>
                    <div>
                      <div className="font-medium">{level.mount}</div>
                      <div className="text-sm text-muted-foreground">{level.name}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Membros</span>
                      <span className="font-medium">{userCount}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground text-center">
                      {percentage}% dos membros
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topUsers.map((user: any, index: number) => (
              <div key={user.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{user.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {user.calculatedPoints} pts
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {user.pointsBreakdown?.total ? Math.round((user.calculatedPoints / user.pointsBreakdown.total) * 100) : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Insights da Gamificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Pontuação Média por Categoria</h4>
              <div className="space-y-2">
                {topUsers.length > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Engajamento</span>
                      <span className="font-medium">
                        {Math.round(topUsers.reduce((sum: number, user: any) => sum + (user.pointsBreakdown?.breakdown.engajamento || 0), 0) / topUsers.length)} pts
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fidelidade regular com dízimo</span>
                      <span className="font-semibold">
                        {Math.round(topUsers.reduce((sum: number, user: any) => sum + (user.pointsBreakdown?.breakdown.dizimista || 0), 0) / topUsers.length)} pts
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cargos</span>
                      <span className="font-medium">
                        {Math.round(topUsers.reduce((sum: number, user: any) => sum + (user.pointsBreakdown?.breakdown.cargos || 0), 0) / topUsers.length)} pts
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Metas Sugeridas</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Aumentar engajamento médio</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Incentivar participação em departamentos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Melhorar frequência nos cultos</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 