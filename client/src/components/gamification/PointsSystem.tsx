import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Star, Trophy, Target, Gift, Calendar, Users, Book, Heart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getLevelByPoints,
  getNextLevel,
  getProgressToNextLevel,
  getPointsToNextLevel,
  getMountName,
  getLevelColor,
  getLevelIcon,
} from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: any;
  points: number;
  category: 'attendance' | 'participation' | 'service' | 'growth' | 'special';
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

// Usar o sistema de gamificação baseado nos montes bíblicos
const getCurrentLevel = (points: number) => getLevelByPoints(points);
const getNextLevelInfo = (points: number) => getNextLevel(points);

const mockAchievements: Achievement[] = [
  {
    id: 1,
    title: 'Primeiro Passo',
    description: 'Complete seu primeiro acesso',
    icon: Star,
    points: 10,
    category: 'growth',
    isUnlocked: true,
    unlockedAt: '2025-01-26T09:00:00',
  },
  {
    id: 2,
    title: 'Presença Constante',
    description: 'Participe de 5 cultos consecutivos',
    icon: Calendar,
    points: 50,
    category: 'attendance',
    isUnlocked: true,
    unlockedAt: '2025-01-20T10:00:00',
    progress: 5,
    target: 5,
  },
  {
    id: 3,
    title: 'Estudante Dedicado',
    description: 'Complete 10 estudos bíblicos',
    icon: Book,
    points: 100,
    category: 'growth',
    isUnlocked: false,
    progress: 6,
    target: 10,
  },
  {
    id: 4,
    title: 'Coração Generoso',
    description: 'Faça sua primeira oferta',
    icon: Heart,
    points: 25,
    category: 'service',
    isUnlocked: true,
    unlockedAt: '2025-01-15T11:00:00',
  },
  {
    id: 5,
    title: 'Construtor de Comunidade',
    description: 'Traga 3 pessoas para a igreja',
    icon: Users,
    points: 150,
    category: 'service',
    isUnlocked: false,
    progress: 1,
    target: 3,
  },
  {
    id: 6,
    title: 'Mestre da Evangelização',
    description: 'Ajude 5 pessoas a se batizarem',
    icon: Trophy,
    points: 500,
    category: 'special',
    isUnlocked: false,
    progress: 0,
    target: 5,
  },
];

interface PointsSystemProps {
  userPoints?: number;
  userLevel?: number;
  showActions?: boolean;
}

export const PointsSystem = ({
  userPoints = 1200,
  userLevel: _userLevel = 3,
  showActions = true,
}: PointsSystemProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const currentLevel = getCurrentLevel(userPoints);
  const nextLevel = getNextLevelInfo(userPoints);

  const progressToNextLevel = getProgressToNextLevel(userPoints);
  const pointsToNextLevel = getPointsToNextLevel(userPoints);

  const categoryColors = {
    attendance: 'bg-blue-100 text-blue-800',
    participation: 'bg-green-100 text-green-800',
    service: 'bg-purple-100 text-purple-800',
    growth: 'bg-orange-100 text-orange-800',
    special: 'bg-red-100 text-red-800',
  };

  const categoryLabels = {
    attendance: 'Presença',
    participation: 'Participação',
    service: 'Serviço',
    growth: 'Crescimento',
    special: 'Especial',
  };

  const filteredAchievements =
    selectedCategory === 'all'
      ? mockAchievements
      : mockAchievements.filter(a => a.category === selectedCategory);

  const unlockedAchievements = mockAchievements.filter(a => a.isUnlocked);
  const totalPossiblePoints = mockAchievements.reduce((sum, a) => sum + a.points, 0);

  return (
    <div className="space-y-6">
      {/* Level Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Seu Progresso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">
              <MountIcon iconType={getLevelIcon(userPoints)} className="h-16 w-16 mx-auto" />
            </div>
            <div className={`${getLevelColor(userPoints)} text-xl font-bold mb-1`}>
              {getMountName(userPoints)}
            </div>
            <div className="text-sm text-muted-foreground mb-3">{currentLevel.name}</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary" data-testid="user-points">
                {userPoints.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Pontos Totais</div>
            </div>
            <div className="text-center">
              <div
                className="text-2xl font-bold text-green-600"
                data-testid="unlocked-achievements"
              >
                {unlockedAchievements.length}
              </div>
              <div className="text-sm text-muted-foreground">Conquistas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600" data-testid="completion-percentage">
                {Math.round((userPoints / totalPossiblePoints) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Completude</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600" data-testid="points-to-next">
                {pointsToNextLevel > 0 ? pointsToNextLevel : '✓'}
              </div>
              <div className="text-sm text-muted-foreground">
                {pointsToNextLevel > 0 ? 'Para Próximo' : 'Máximo'}
              </div>
            </div>
          </div>

          {nextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso para {nextLevel.mount}</span>
                <span>{Math.round(progressToNextLevel)}%</span>
              </div>
              <Progress value={progressToNextLevel} className="h-3" />
              <p className="text-xs text-muted-foreground">
                Faltam {pointsToNextLevel} pontos para o próximo monte
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Benefícios do Seu Monte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Benefícios Atuais</h4>
              <ul className="space-y-1">
                {currentLevel.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {nextLevel && (
              <div>
                <h4 className="font-medium mb-2">Próximos Benefícios</h4>
                <ul className="space-y-1">
                  {nextLevel.benefits.slice(currentLevel.benefits.length).map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              data-testid="filter-all-achievements"
            >
              Todas ({mockAchievements.length})
            </Button>
            {Object.entries(categoryLabels).map(([category, label]) => {
              const count = mockAchievements.filter(a => a.category === category).length;
              if (count === 0) return null;

              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`filter-${category}`}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </div>

          {/* Achievement List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAchievements.map(achievement => {
              const IconComponent = achievement.icon;
              const isInProgress = !achievement.isUnlocked && achievement.progress !== undefined;

              return (
                <div
                  key={achievement.id}
                  className={cn(
                    'p-4 border rounded-lg transition-colors',
                    achievement.isUnlocked
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/30 border-muted'
                  )}
                  data-testid={`achievement-${achievement.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        achievement.isUnlocked
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4
                          className={cn(
                            'font-medium',
                            achievement.isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {achievement.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge className={categoryColors[achievement.category]}>
                            {categoryLabels[achievement.category]}
                          </Badge>
                          <Badge variant="outline">+{achievement.points}</Badge>
                        </div>
                      </div>

                      <p
                        className={cn(
                          'text-sm mb-2',
                          achievement.isUnlocked
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/70'
                        )}
                      >
                        {achievement.description}
                      </p>

                      {isInProgress && achievement.progress !== undefined && achievement.target && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progresso</span>
                            <span>
                              {achievement.progress}/{achievement.target}
                            </span>
                          </div>
                          <Progress
                            value={(achievement.progress / achievement.target) * 100}
                            className="h-2"
                          />
                        </div>
                      )}

                      {achievement.isUnlocked && achievement.unlockedAt && (
                        <p className="text-xs text-primary mt-2">
                          ✓ Desbloqueado em{' '}
                          {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {showActions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Ganhe Mais Pontos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start h-auto p-3">
                <div className="text-left">
                  <div className="font-medium">Participe de um Culto</div>
                  <div className="text-sm text-muted-foreground">+20 pontos</div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-3">
                <div className="text-left">
                  <div className="font-medium">Complete um Estudo</div>
                  <div className="text-sm text-muted-foreground">+30 pontos</div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-3">
                <div className="text-left">
                  <div className="font-medium">Convide um Amigo</div>
                  <div className="text-sm text-muted-foreground">+50 pontos</div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-3">
                <div className="text-left">
                  <div className="font-medium">Contribua com Ofertas</div>
                  <div className="text-sm text-muted-foreground">+25 pontos</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
