import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mountain, Crown } from 'lucide-react';
import {
  getLevelByPoints,
  getNextLevel,
  getProgressToNextLevel,
  getPointsToNextLevel,
  getMountName,
  getLevelIcon,
} from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';

interface MountainProgressProps {
  userPoints: number;
  showDetails?: boolean;
}

export const MountainProgress = ({ userPoints, showDetails = true }: MountainProgressProps) => {
  const currentLevel = getLevelByPoints(userPoints);
  const nextLevel = getNextLevel(userPoints);
  const progress = getProgressToNextLevel(userPoints);
  const pointsToNext = getPointsToNextLevel(userPoints);

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mountain className="h-5 w-5 text-purple-600" />
          Seu Monte Atual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="flex items-center gap-3">
            <MountIcon iconType={getLevelIcon(userPoints)} className="h-8 w-8" />
            <div className="flex-1">
              <div className="text-sm font-medium">{getMountName(userPoints)}</div>
              <div className="text-xs text-muted-foreground">{currentLevel.name}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{userPoints}</div>
              <div className="text-xs text-muted-foreground">Pontos</div>
            </div>
            {nextLevel && (
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{pointsToNext}</div>
                <div className="text-xs text-muted-foreground">Para próximo</div>
              </div>
            )}
          </div>
        </div>

        {nextLevel && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso para {nextLevel.mount}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-center text-xs text-muted-foreground">
              {pointsToNext > 0
                ? `${pointsToNext} pontos para ${nextLevel.mount}`
                : 'Monte máximo alcançado!'}
            </div>
          </div>
        )}

        {showDetails && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Benefícios Atuais:</div>
            <div className="space-y-1">
              {currentLevel.benefits.slice(0, 2).map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        )}

        {userPoints >= 1000 && (
          <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-yellow-50 rounded-lg">
            <Crown className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700">Status Máximo Alcançado!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
