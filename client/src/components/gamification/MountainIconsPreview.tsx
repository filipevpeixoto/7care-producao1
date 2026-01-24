import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mountain, Star, Crown } from 'lucide-react';
import { GAMIFICATION_LEVELS } from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';

export const MountainIconsPreview = () => {
  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Mountain className="h-6 w-6 text-blue-600" />
          Preview dos Ícones dos Montes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualização de todos os ícones da Jornada Espiritual
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
          {GAMIFICATION_LEVELS.map((level, index) => (
            <div key={level.id} className="relative group">
              <Card className="h-32 md:h-40 transition-all duration-300 border-2 border-gray-200 bg-white hover:shadow-lg hover:scale-105">
                <CardContent className="p-3 h-full flex flex-col items-center justify-center">
                  {/* Ícone do Monte */}
                  <div className="text-2xl md:text-4xl mb-2">
                    <MountIcon 
                      iconType={level.icon} 
                      className="h-8 w-8 md:h-12 md:w-12 text-gray-700"
                    />
                  </div>
                  
                  {/* Nome do Monte */}
                  <div className="text-center font-bold text-xs md:text-sm mb-1 text-gray-700">
                    {level.mount}
                  </div>
                  
                  {/* Pontos */}
                  <div className="text-center text-xs text-muted-foreground">
                    {level.minPoints}+ pts
                  </div>
                  
                  {/* Nível */}
                  <div className="text-center text-xs text-blue-600 font-medium mt-1">
                    {level.name}
                  </div>
                </CardContent>
              </Card>
              
              {/* Número do Nível */}
              <div className="absolute -top-2 -left-2">
                <Badge className="bg-blue-500 text-white text-xs px-2 py-1">
                  {index + 1}
                </Badge>
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30 whitespace-nowrap">
                <div className="font-bold mb-1">{level.name}</div>
                <div className="text-gray-300">
                  {level.minPoints} - {level.maxPoints || '∞'} pontos
                </div>
                <div className="text-orange-300 mt-1">
                  {level.benefits.slice(0, 2).join(', ')}
                </div>
                {/* Seta do tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Legenda */}
        <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-blue-50 rounded-lg border border-orange-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Progressão Visual:</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded" />
                  <span>Vale (início da jornada)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded" />
                  <span>Montes (progressão laranja)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded" />
                  <span>O Topo (conquista máxima)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Características:</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• 9 níveis de progressão</li>
                <li>• Ícones responsivos e elegantes</li>
                <li>• Cores que representam o progresso</li>
                <li>• Design baseado na imagem de referência</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
