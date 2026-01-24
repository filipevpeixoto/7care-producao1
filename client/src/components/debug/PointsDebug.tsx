import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePointsCalculation } from '@/hooks/usePointsCalculation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const PointsDebug = () => {
  const { users, isLoading, getStatistics } = usePointsCalculation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRecalculate = async () => {
    try {
      await fetch('/api/system/calculate-advanced-points', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['users-with-points'] });
      toast({
        title: "Pontuação Atualizada",
        description: "Os pontos foram recalculados com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao recalcular pontuação.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p>Carregando dados de pontuação...</p>
        </CardContent>
      </Card>
    );
  }

  const stats = getStatistics();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Debug de Pontuação
            <Button onClick={handleRecalculate} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalcular
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Estatísticas Gerais</h4>
              <div className="space-y-1 text-sm">
                <div>Total de usuários: {stats.totalUsers}</div>
                <div>Pontos totais: {stats.totalPoints}</div>
                <div>Média de pontos: {stats.averagePoints}</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Distribuição por Montes</h4>
              <div className="space-y-1 text-sm">
                {Object.entries(stats.levelDistribution).map(([mount, count]) => (
                  <div key={mount} className="flex justify-between">
                    <span>{mount}:</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários com Pontos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users?.slice(0, 20).map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.role}</div>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{user.points || 0} pts</Badge>
                  <div className="text-xs text-muted-foreground">
                    {user.points ? `Nível: ${user.level || 'N/A'}` : 'Sem pontos'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
