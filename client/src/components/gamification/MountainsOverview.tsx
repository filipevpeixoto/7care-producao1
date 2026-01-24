import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mountain, Crown, Star } from 'lucide-react';
import { GAMIFICATION_LEVELS } from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';

interface MountainsOverviewProps {
  userPoints?: number;
  showCurrent?: boolean;
}

export const MountainsOverview = ({ userPoints = 0, showCurrent = true }: MountainsOverviewProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mountain className="h-5 w-5 text-primary" />
          Montes da Jornada Espiritual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMIFICATION_LEVELS.map((level) => {
            const isCurrentLevel = userPoints >= level.minPoints && 
              (!level.maxPoints || userPoints <= level.maxPoints);
            const isCompleted = userPoints > (level.maxPoints || level.minPoints);
            
            return (
              <Card 
                key={level.id}
                className={`relative transition-all duration-200 hover:shadow-md ${
                  isCurrentLevel 
                    ? 'ring-2 ring-purple-500 bg-purple-50' 
                    : isCompleted 
                    ? 'bg-green-50' 
                    : 'bg-gray-50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">
                      <MountIcon iconType={level.icon} className="h-12 w-12 mx-auto" />
                    </div>
                    
                    <div className={`font-bold text-lg mb-1 ${level.color}`}>
                      {level.mount}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-3">
                      {level.name}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Pontos necessários:</span>
                        <span className="font-medium">
                          {level.minPoints}+
                        </span>
                      </div>
                      
                      {level.maxPoints && (
                        <div className="flex justify-between text-xs">
                          <span>Até:</span>
                          <span className="font-medium">
                            {level.maxPoints} pts
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status badges */}
                    <div className="mt-3 flex justify-center">
                      {isCurrentLevel && (
                        <Badge variant="default" className="bg-purple-600">
                          <Star className="h-3 w-3 mr-1" />
                          Atual
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="secondary" className="bg-green-600 text-white">
                          <Crown className="h-3 w-3 mr-1" />
                          Conquistado
                        </Badge>
                      )}
                      {!isCurrentLevel && !isCompleted && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Bloqueado
                        </Badge>
                      )}
                    </div>
                    
                    {/* Benefícios */}
                    {showCurrent && isCurrentLevel && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs font-medium mb-2">Seus Benefícios:</div>
                        <div className="space-y-1">
                          {level.benefits.slice(0, 2).map((benefit, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                              <div className="w-1 h-1 bg-green-500 rounded-full" />
                              {benefit}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-purple-700 mb-2">
              🏔️ Sistema de Montes Bíblicos
            </div>
            <p className="text-sm text-muted-foreground">
              Cada monte representa uma etapa na sua jornada espiritual. 
              Conquiste pontos através de participação, frequência e serviço 
              para subir de monte em monte até alcançar "O Topo".
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 