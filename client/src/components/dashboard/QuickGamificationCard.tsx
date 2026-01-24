import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp } from 'lucide-react';
import { getLevelByPoints, getMountName, getLevelIcon, getLevelColor, getNextLevel, getProgressToNextLevel, getPointsToNextLevel } from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';
import { PointsCalculator, UserData } from '@/lib/pointsCalculator';

interface QuickGamificationCardProps {
  userData?: UserData;
  showDetails?: boolean;
}

export const QuickGamificationCard = ({ userData, showDetails = false }: QuickGamificationCardProps) => {
  // Dados de exemplo se não fornecidos
  const defaultUserData: UserData = {
    engajamento: 'Alto',
    classificacao: 'Recorrente',
    dizimista: 'Recorrente (8-12 meses)',
    ofertante: 'Sazonal (4-7 meses)',
    tempoBatismo: 15,
    cargos: ['Líder de Jovens', 'Músico'],
    departamentos: ['Jovens', 'Música', 'Evangelismo'],
    nomeUnidade: 'Unidade Central',
    temLicao: true,
    comunhao: 12,
    missao: 10,
    estudoBiblico: 8,
    totalPresenca: 25,
    batizouAlguem: true,
    discipuladoPosBatismo: 5,
    cpfValido: true,
    camposVaziosACMS: false
  };

  // Se não temos userData, usar dados padrão
  const data = userData || defaultUserData;
  
  // Se temos userData real, usar os pontos da API em vez de calcular
  let total: number;
  if (userData && userData.actualPoints !== undefined) {
    total = userData.actualPoints;
  } else {
    // Fallback para cálculo padrão apenas se não tivermos dados reais
    const calculated = PointsCalculator.calculateDetailedPoints(data);
    total = calculated.total;
  }
  const currentLevel = getLevelByPoints(total);
  const nextLevel = getNextLevel(total);
  const progress = getProgressToNextLevel(total);
  const pointsToNext = getPointsToNextLevel(total);

  return (
    <div 
      onClick={() => window.location.href = '/gamification'}
      className="block h-full cursor-pointer"
    >
      <Card 
        className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-purple-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"
      >
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 to-purple-700/30 opacity-100 group-hover:from-yellow-600/30 group-hover:to-purple-700/40 transition-all duration-300 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/30 to-purple-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-sm font-semibold text-white drop-shadow-md">Minha Pontuação</CardTitle>
        <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
          <Trophy className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative flex-1">
        <div className="space-y-3">
          {/* Pontuação Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">Pontos atuais:</span>
            <span className="text-2xl font-bold text-white drop-shadow-lg">
              {total}
            </span>
          </div>
          
          {/* Montanha Atual */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">Montanha atual:</span>
            <div className="flex items-center gap-2">
              <MountIcon iconType={getLevelIcon(total)} className="h-6 w-6 text-white" />
              <span className="text-sm font-semibold text-white drop-shadow-lg">
                {getMountName(total)}
              </span>
            </div>
          </div>
          

          
          {/* Progresso para próxima montanha */}
          {nextLevel && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/70">
                <span>Para {nextLevel.mount}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-center text-xs text-white/70">
                {pointsToNext > 0 
                  ? `${pointsToNext} pts restantes`
                  : 'Monte máximo!'
                }
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <div className="px-6 pb-4 relative">
        <p className="text-xs text-white/70 hover:text-white/90 transition-colors">
          Toque para ver mais
        </p>
      </div>
      </Card>
    </div>
  );
}; 