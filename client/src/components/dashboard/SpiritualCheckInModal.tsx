import React, { useState, useEffect } from 'react';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Heart, MessageCircle, Lock, Users, HelpCircle, Star, Sparkles, X } from 'lucide-react';

interface SpiritualCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpiritualState {
  score: number;
  prayerRequest?: string;
  isPrivate: boolean;
  allowChurchMembers: boolean;
}

interface SpiritualLevel {
  score: number;
  emoji: string;
  label: string;
  verse: string;
  reference: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const spiritualLevels: SpiritualLevel[] = [
  {
    score: 1,
    emoji: '🍃',
    label: 'Distante',
    verse: 'Tenho, porém, contra ti que deixaste o teu primeiro amor.',
    reference: 'Apocalipse 2:4',
    description:
      'Quase não oro, minha Bíblia está fechada, e percebo que outras coisas têm ocupado o lugar de Deus na minha vida.',
    color: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-700',
  },
  {
    score: 2,
    emoji: '🔍',
    label: 'Buscando',
    verse: 'Buscai ao Senhor enquanto se pode achar, invocai-o enquanto está perto.',
    reference: 'Isaías 55:6',
    description:
      'Sinto falta de Deus, faço algumas orações rápidas, ouço mensagens e até abro a Bíblia, mas ainda sem constância.',
    color: 'from-orange-400 to-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
  },
  {
    score: 3,
    emoji: '🌱',
    label: 'Enraizando',
    verse: 'Antes, tem o seu prazer na lei do Senhor, e na sua lei medita de dia e de noite.',
    reference: 'Salmo 1:2',
    description:
      'Já leio a Bíblia com mais frequência, encontro respostas, começo a praticar e percebo mudanças no meu coração.',
    color: 'from-green-400 to-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700',
  },
  {
    score: 4,
    emoji: '🌳',
    label: 'Frutificando',
    verse: 'Eu sou a videira, vós as varas; quem permanece em mim, e eu nele, esse dá muito fruto.',
    reference: 'João 15:5',
    description:
      'Minha fé começa a transbordar em atitudes, ajudo pessoas, testemunho de Cristo e inspiro outros a segui-lo.',
    color: 'from-blue-400 to-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
  },
  {
    score: 5,
    emoji: '✨',
    label: 'Intimidade',
    verse: 'E andou Enoque com Deus; e já não apareceu, porquanto Deus para si o tomou.',
    reference: 'Gênesis 5:24',
    description:
      'Vivo em comunhão diária com Deus, oro constantemente, ouço Sua voz e procuro andar em plena sintonia com Ele.',
    color: 'from-purple-400 to-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
  },
];

export const SpiritualCheckInModal = ({ isOpen, onClose }: SpiritualCheckInModalProps) => {
  const { user } = useAuth();
  const [spiritualState, setSpiritualState] = useState<SpiritualState>({
    score: 0,
    prayerRequest: '',
    isPrivate: false,
    allowChurchMembers: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const { toast } = useToast();

  const handleScoreSelect = (score: number) => {
    setSpiritualState(prev => ({ ...prev, score }));
  };

  // Toggle explanation panel
  const toggleLevelExplanation = (score: number) => {
    setExpandedLevel(expandedLevel === score ? null : score);
  };

  // Auto-close explanation panel after 5 seconds
  useEffect(() => {
    if (expandedLevel !== null) {
      const timer = setTimeout(() => {
        setExpandedLevel(null);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [expandedLevel]);

  const handleSubmit = async () => {
    if (spiritualState.score === 0) {
      toast({
        title: 'Selecione como está espiritualmente',
        description: 'Por favor, escolha uma situação espiritual de 1 a 5 para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/emotional-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          score: spiritualState.score,
          prayerRequest: spiritualState.prayerRequest,
          isPrivate: spiritualState.isPrivate,
          allowChurchMembers: spiritualState.allowChurchMembers,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Check-in espiritual enviado!',
          description: 'Obrigado por compartilhar sua situação espiritual conosco.',
        });
        onClose();
        setSpiritualState({
          score: 0,
          prayerRequest: '',
          isPrivate: false,
          allowChurchMembers: false,
        });
        setExpandedLevel(null);
      } else {
        throw new Error('Erro ao enviar check-in');
      }
    } catch (error) {
      console.error('Erro ao enviar check-in espiritual:', error);
      toast({
        title: 'Erro ao enviar check-in',
        description: 'Não foi possível enviar seu check-in espiritual. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogWithModalTracking modalId="spiritual-checkin-modal" open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl mx-auto w-[90vw]"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <DialogHeader className="text-center pb-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Como está sua vida espiritual hoje?
            </DialogTitle>
            <p className="text-gray-600 mt-3">
              Compartilhe sua situação espiritual e, se desejar, um pedido de oração
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Spiritual Score Selection */}
          <div className="space-y-4">
            <div className="text-center">
              <Label className="text-lg font-semibold text-gray-800 flex items-center justify-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Selecione sua situação espiritual
              </Label>
              <p className="text-sm text-gray-500 mt-1">Escolha de 1 a 5 estrelas</p>
            </div>

            {/* Desktop Layout - Horizontal Cards */}
            <div className="hidden lg:grid lg:grid-cols-5 gap-4">
              {spiritualLevels.map(level => (
                <div key={level.score} className="relative">
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                      spiritualState.score === level.score
                        ? `ring-2 ring-blue-500 shadow-lg ${level.bgColor} border-blue-300`
                        : 'hover:shadow-md border-gray-200'
                    }`}
                  >
                    <CardContent className="p-4 text-center">
                      <button
                        onClick={() => handleScoreSelect(level.score)}
                        className="w-full space-y-3"
                      >
                        <div className="text-3xl">{level.emoji}</div>
                        <div className="flex justify-center space-x-1">
                          {[...Array(level.score)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <div>
                          <div className={`font-semibold text-sm ${level.textColor}`}>
                            {level.label}
                          </div>
                          <div className="text-xs text-gray-500">Nível {level.score}</div>
                        </div>
                      </button>

                      <button
                        onClick={() => toggleLevelExplanation(level.score)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs hover:scale-110 transition-all duration-200 shadow-lg"
                        title="Ver explicação"
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet Layout - Vertical Cards */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
              {spiritualLevels.map(level => (
                <div key={level.score} className="relative">
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                      spiritualState.score === level.score
                        ? `ring-2 ring-blue-500 shadow-lg ${level.bgColor} border-blue-300`
                        : 'hover:shadow-md border-gray-200'
                    }`}
                  >
                    <CardContent className="p-4">
                      <button
                        onClick={() => handleScoreSelect(level.score)}
                        className="w-full flex items-center space-x-4"
                      >
                        <div className="text-3xl">{level.emoji}</div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center space-x-2 mb-2">
                            {[...Array(level.score)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <div className={`font-semibold text-base ${level.textColor}`}>
                            {level.label}
                          </div>
                          <div className="text-sm text-gray-500">Nível {level.score}</div>
                        </div>
                      </button>

                      <button
                        onClick={() => toggleLevelExplanation(level.score)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs hover:scale-110 transition-all duration-200 shadow-lg"
                        title="Ver explicação"
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Explanation Panel */}
            {expandedLevel && (
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{spiritualLevels[expandedLevel - 1].emoji}</div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">
                        Nível {expandedLevel} – {spiritualLevels[expandedLevel - 1].label}
                      </h4>
                      <div className="flex space-x-1">
                        {[...Array(expandedLevel)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedLevel(null)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div
                  className={`${spiritualLevels[expandedLevel - 1].bgColor} rounded-lg p-4 border ${spiritualLevels[expandedLevel - 1].borderColor}`}
                >
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    {spiritualLevels[expandedLevel - 1].description}
                  </p>
                  <div className="bg-white rounded-md p-3 border-l-4 border-blue-400">
                    <p className="text-sm text-gray-600 italic mb-1">
                      "{spiritualLevels[expandedLevel - 1].verse}"
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      {spiritualLevels[expandedLevel - 1].reference}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Prayer Request */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-4">
              <div className="space-y-3">
                <Label
                  htmlFor="prayerRequest"
                  className="flex items-center gap-2 text-base font-semibold text-gray-800"
                >
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  Pedido de Oração
                  <Badge variant="secondary" className="text-xs">
                    Opcional
                  </Badge>
                </Label>
                <Textarea
                  id="prayerRequest"
                  placeholder="Compartilhe seu pedido de oração, agradecimento ou testemunho..."
                  value={spiritualState.prayerRequest}
                  onChange={e =>
                    setSpiritualState(prev => ({
                      ...prev,
                      prayerRequest: e.target.value,
                    }))
                  }
                  rows={4}
                  className="resize-none border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                />
                <div className="text-xs text-gray-500 text-right">
                  {(spiritualState.prayerRequest || '').length}/500 caracteres
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-gray-600" />
                  Configurações de Privacidade
                </Label>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Checkbox
                      id="isPrivate"
                      checked={spiritualState.isPrivate}
                      onCheckedChange={checked =>
                        setSpiritualState(prev => ({
                          ...prev,
                          isPrivate: checked as boolean,
                        }))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="isPrivate"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        <Lock className="h-4 w-4 text-red-500" />
                        Apenas o pastor verá meus motivos de oração
                      </Label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Seu pedido será mantido em total confidencialidade
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                      spiritualState.isPrivate
                        ? 'bg-gray-100 opacity-50'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <Checkbox
                      id="allowChurchMembers"
                      checked={spiritualState.allowChurchMembers}
                      onCheckedChange={checked =>
                        setSpiritualState(prev => ({
                          ...prev,
                          allowChurchMembers: checked as boolean,
                        }))
                      }
                      disabled={spiritualState.isPrivate}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="allowChurchMembers"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        <Users className="h-4 w-4 text-green-500" />
                        Permitir que membros da igreja vejam meu pedido
                      </Label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Outros membros poderão orar por você
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || spiritualState.score === 0}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enviando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Enviar Check-in Espiritual
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
};
