import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mountain, Crown, Star } from 'lucide-react';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GAMIFICATION_LEVELS } from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';

interface MountainJourneyProps {
  userPoints?: number | { actualPoints?: number };
  showCurrent?: boolean;
  className?: string;
}

export const MountainJourney = ({
  userPoints = 0,
  showCurrent: _showCurrent = true,
  className = '',
}: MountainJourneyProps) => {
  // Usar os pontos reais do usuário se disponível
  const actualPoints: number =
    typeof userPoints === 'number' ? userPoints : (userPoints as any)?.actualPoints || 0;

  const [selectedLevel, setSelectedLevel] = useState<(typeof GAMIFICATION_LEVELS)[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getCurrentLevel = () => {
    return GAMIFICATION_LEVELS.find(
      level =>
        actualPoints >= level.minPoints && (!level.maxPoints || actualPoints <= level.maxPoints)
    );
  };

  const currentLevel = getCurrentLevel();

  const handleCardClick = (level: (typeof GAMIFICATION_LEVELS)[0]) => {
    setSelectedLevel(level);
    setIsModalOpen(true);
  };

  const getSpiritualMilestones = (level?: (typeof GAMIFICATION_LEVELS)[0] | null): string[] => {
    if (!level) return [];
    const name = (level.mount || '').toLowerCase();
    // Lista simplificada baseada no monte bíblico (sem infos do sistema)
    if (name.includes('jordão')) {
      return [
        'Compromisso público com Deus renovado',
        'Início de jornada espiritual intencional',
        'Decisão de seguir os passos de Jesus no cotidiano',
      ];
    }
    if (name.includes('sinai')) {
      return [
        'Aliança reafirmada com os princípios divinos',
        'Obediência e reverência aprofundadas',
        'Disciplina espiritual fortalecida',
      ];
    }
    if (name.includes('carmelo')) {
      return [
        'Fé provada e fortalecida diante de desafios',
        'Ousadia em testemunhar',
        'Confiança em milagres e providência de Deus',
      ];
    }
    if (name.includes('oliveiras')) {
      return [
        'Vida de oração constante',
        'Comunhão diária cultivada',
        'Entrega de ansiedades ao Senhor',
      ];
    }
    if (name.includes('morias') || name.includes('moríah') || name.includes('moriá')) {
      return [
        'Confiança plena nos planos de Deus',
        'Entrega de áreas sensíveis do coração',
        'Adoração mesmo em meio a provas',
      ];
    }
    if (name.includes('tabor')) {
      return [
        'Transformação do caráter em Cristo',
        'Sensibilidade à voz do Espírito',
        'Iluminação espiritual para novas etapas',
      ];
    }
    if (name.includes('sião')) {
      return [
        'Pertencimento ao povo de Deus',
        'Alegria no culto e na adoração',
        'Esperança consolidada nas promessas',
      ];
    }
    if (name.includes('nebo')) {
      return [
        'Visão do propósito e do futuro',
        'Resiliência em períodos de espera',
        'Gratidão pelas etapas vencidas',
      ];
    }
    if (name.includes('canaã')) {
      return [
        'Descanso nas promessas cumpridas',
        'Frutificação e serviço abençoador',
        'Novo ciclo de missão com maturidade espiritual',
      ];
    }
    // Padrão
    return [
      'Crescimento na fé e na comunhão',
      'Perseverança em oração e estudo',
      'Testemunho prático no dia a dia',
    ];
  };

  return (
    <Card className={`bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Mountain className="h-6 w-6 text-blue-600" />
          Jornada dos Montes Espirituais
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sua ascensão espiritual através dos montes bíblicos
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2 md:gap-3">
          {GAMIFICATION_LEVELS.map((level, index) => {
            const isCurrentLevel =
              actualPoints >= level.minPoints &&
              (!level.maxPoints || actualPoints <= level.maxPoints);
            const isCompleted = actualPoints > (level.maxPoints || level.minPoints);
            const isNext = index === (currentLevel?.id || 0) + 1;

            return (
              <div
                key={level.id}
                className={`relative group cursor-pointer transition-all duration-300 ${
                  isCurrentLevel ? 'scale-110 z-10' : isCompleted ? 'scale-105' : 'scale-100'
                }`}
                onClick={() => handleCardClick(level)}
              >
                {/* Card do Monte */}
                <Card
                  className={`h-32 md:h-40 transition-all duration-300 border-2 ${
                    isCurrentLevel
                      ? 'ring-4 ring-orange-400 border-orange-300 bg-gradient-to-b from-orange-50 to-orange-100 shadow-lg'
                      : isCompleted
                        ? 'border-green-300 bg-gradient-to-b from-green-50 to-green-100 shadow-md'
                        : isNext
                          ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-blue-100 shadow-sm'
                          : 'border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100'
                  } hover:shadow-lg hover:scale-105`}
                >
                  <CardContent className="p-2 md:p-3 h-full flex flex-col items-center justify-center">
                    {/* Ícone do Monte */}
                    <div
                      className={`text-2xl md:text-4xl mb-2 transition-all duration-300 ${
                        isCurrentLevel ? 'scale-125' : 'scale-100'
                      }`}
                    >
                      <MountIcon
                        iconType={level.icon}
                        className={`h-8 w-8 md:h-12 md:w-12 ${
                          isCurrentLevel
                            ? 'text-orange-600'
                            : isCompleted
                              ? 'text-green-600'
                              : 'text-gray-600'
                        }`}
                      />
                    </div>

                    {/* Nome do Monte */}
                    <div
                      className={`text-center font-bold text-xs md:text-sm mb-1 transition-colors duration-300 ${
                        isCurrentLevel
                          ? 'text-orange-700'
                          : isCompleted
                            ? 'text-green-700'
                            : 'text-gray-600'
                      }`}
                    >
                      {level.mount}
                    </div>

                    {/* Pontos */}
                    <div className="text-center text-xs text-muted-foreground">
                      {level.minPoints}+ pts
                    </div>
                  </CardContent>
                </Card>

                {/* Indicadores de Status */}
                {isCurrentLevel && (
                  <div className="absolute -top-2 -right-2 z-20">
                    <Badge className="bg-orange-500 text-white text-xs px-2 py-1 animate-pulse">
                      <Star className="h-3 w-3 mr-1" />
                      Atual
                    </Badge>
                  </div>
                )}

                {isCompleted && (
                  <div className="absolute -top-2 -right-2 z-20">
                    <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                      <Crown className="h-3 w-3 mr-1" />
                      Concluído
                    </Badge>
                  </div>
                )}

                {/* Tooltip removido: exibir apenas modal ao clique */}
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Modal de detalhes do monte */}
      <DialogWithModalTracking
        modalId="mountain-journey-modal"
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-center text-3xl font-bold text-amber-800">
              {selectedLevel?.mount} - Detalhes da Conquista
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 p-6">
            {/* Ícone */}
            <div className="flex-shrink-0">
              <div className="w-56 h-56 flex items-center justify-center bg-white rounded-2xl shadow-lg p-6">
                <MountIcon iconType={selectedLevel?.icon || ''} className="w-full h-full" />
              </div>
            </div>

            {/* Informações */}
            <div className="w-full text-center space-y-5">
              <div className="space-y-3">
                <div className={`text-3xl font-bold ${selectedLevel?.color || 'text-gray-600'}`}>
                  {selectedLevel?.mount}
                </div>
                <div className="text-xl text-amber-700 font-medium">{selectedLevel?.name}</div>
              </div>

              {/* Descrição bíblica */}
              <div className="bg-white/70 rounded-xl p-5 shadow-md">
                <h3 className="text-xl font-bold text-amber-800 mb-3">Significado Bíblico</h3>
                <p className="text-amber-900 leading-relaxed text-base">
                  {selectedLevel?.description}
                </p>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/70 rounded-lg p-4 shadow-md">
                  <div className="text-sm font-medium text-amber-700 mb-1">Pontos Necessários</div>
                  <div className="text-2xl font-bold text-amber-800">
                    {selectedLevel?.minPoints ?? 0} - {selectedLevel?.maxPoints || '∞'} pts
                  </div>
                </div>

                <div className="bg-white/70 rounded-lg p-4 shadow-md">
                  <div className="text-sm font-medium text-amber-700 mb-1">Status Atual</div>
                  <div className="text-base font-semibold text-amber-800">
                    {actualPoints >= (selectedLevel?.minPoints ?? 0) &&
                    (!selectedLevel?.maxPoints || actualPoints <= selectedLevel.maxPoints)
                      ? 'Conquistado'
                      : actualPoints > (selectedLevel?.maxPoints || selectedLevel?.minPoints || 0)
                        ? 'Superado'
                        : 'Em Progresso'}
                  </div>
                </div>
              </div>

              {/* Situações espirituais alcançadas */}
              <div className="bg-white/70 rounded-xl p-5 shadow-md">
                <h3 className="text-xl font-bold text-amber-800 mb-3">
                  Situações espirituais alcançadas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {getSpiritualMilestones(selectedLevel).map((item, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 mt-2 bg-amber-600 rounded-full flex-shrink-0"></div>
                      <span className="text-amber-900 text-sm leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogWithModalTracking>
    </Card>
  );
};
