import React, { useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Heart, MessageCircle, Lock, Users, BookOpen, Search } from 'lucide-react';

interface EmotionalCheckInModalProps {
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
  },
  {
    score: 2,
    emoji: '🔍',
    label: 'Buscando',
    verse: 'Buscai ao Senhor enquanto se pode achar, invocai-o enquanto está perto.',
    reference: 'Isaías 55:6',
    description:
      'Sinto falta de Deus, faço algumas orações rápidas, ouço mensagens e até abro a Bíblia, mas ainda sem constância.',
  },
  {
    score: 3,
    emoji: '🌱',
    label: 'Enraizando',
    verse: 'Antes, tem o seu prazer na lei do Senhor, e na sua lei medita de dia e de noite.',
    reference: 'Salmo 1:2',
    description:
      'Já leio a Bíblia com mais frequência, encontro respostas, começo a praticar e percebo mudanças no meu coração.',
  },
  {
    score: 4,
    emoji: '🍃',
    label: 'Frutificando',
    verse: 'Eu sou a videira, vós as varas; quem permanece em mim, e eu nele, esse dá muito fruto.',
    reference: 'João 15:5',
    description:
      'Minha fé começa a transbordar em atitudes, ajudo pessoas, testemunho de Cristo e inspiro outros a segui-lo.',
  },
  {
    score: 5,
    emoji: '✨',
    label: 'Intimidade',
    verse: 'E andou Enoque com Deus; e já não apareceu, porquanto Deus para si o tomou.',
    reference: 'Gênesis 5:24',
    description:
      'Vivo em comunhão diária com Deus, oro constantemente, ouço Sua voz e procuro andar em plena sintonia com Ele.',
  },
];

export const EmotionalCheckInModal = ({ isOpen, onClose }: EmotionalCheckInModalProps) => {
  const { user } = useAuth();
  const [spiritualState, setSpiritualState] = useState<SpiritualState>({
    score: 0,
    prayerRequest: '',
    isPrivate: false,
    allowChurchMembers: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleScoreSelect = (score: number) => {
    setSpiritualState(prev => ({ ...prev, score }));
  };

  const handleSubmit = async () => {
    if (spiritualState.score === 0) {
      toast({
        title: 'Selecione como está espiritualmente',
        description: 'Por favor, escolha uma nota de 1 a 5 para continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Usuário não identificado',
        description: 'Por favor, faça login novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/emotional-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(user.id),
          emotionalScore: spiritualState.score,
          prayerRequest: spiritualState.prayerRequest,
          isPrivate: spiritualState.isPrivate,
          allowChurchMembers: spiritualState.allowChurchMembers,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Check-in espiritual enviado!',
          description:
            'Obrigado por compartilhar seu estado espiritual. Suas orações serão levadas ao Senhor.',
        });
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar check-in');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar seu check-in. Tente novamente.';
      toast({
        title: 'Erro ao enviar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogWithModalTracking
      modalId="emotional-checkin-modal"
      open={isOpen}
      onOpenChange={open => !open && onClose()}
    >
      <DialogContent
        className="sm:max-w-md w-[90vw]"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        aria-describedby="emotional-checkin-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <Heart className="h-5 w-5 text-red-500" />
            Como está sua vida espiritual hoje?
          </DialogTitle>
          <p
            id="emotional-checkin-description"
            className="text-sm text-muted-foreground text-center"
          >
            Compartilhe seu estado espiritual e, se desejar, um pedido de oração
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Spiritual Score Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Selecione sua nota espiritual:</Label>
            <div className="grid grid-cols-5 gap-2">
              {spiritualLevels.map(level => (
                <Popover key={level.score}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => handleScoreSelect(level.score)}
                      className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                        spiritualState.score === level.score
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">{level.emoji}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{level.label}</div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="center">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-3xl">{level.emoji}</div>
                        <div>
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                            Nível {level.score} – {level.label}
                          </h4>
                        </div>
                      </div>

                      {/* Bible Verse */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-3 rounded-lg border-l-4 border-blue-400">
                        <div className="flex items-start gap-2">
                          <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-800 dark:text-gray-200 italic">
                              "{level.verse}"
                            </p>
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              {level.reference}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-3 rounded-lg border-l-4 border-green-400">
                        <div className="flex items-start gap-2">
                          <Search className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">
                              Marca:
                            </p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              {level.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          </div>

          {/* Prayer Request */}
          <div className="space-y-3">
            <Label htmlFor="prayerRequest" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Pedido de Oração (opcional)
            </Label>
            <Textarea
              id="prayerRequest"
              placeholder="Compartilhe seu pedido de oração ou agradecimento..."
              value={spiritualState.prayerRequest}
              onChange={e =>
                setSpiritualState(prev => ({
                  ...prev,
                  prayerRequest: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Configurações de privacidade:</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrivate"
                checked={spiritualState.isPrivate}
                onCheckedChange={checked =>
                  setSpiritualState(prev => ({
                    ...prev,
                    isPrivate: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="isPrivate" className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4" />
                Apenas o pastor verá meus motivos de oração
              </Label>
            </div>

            <div className="flex items-center space-x-2">
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
              />
              <Label htmlFor="allowChurchMembers" className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Permitir que membros da igreja vejam meu pedido
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || spiritualState.score === 0}
            className="w-full"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Check-in Espiritual'}
          </Button>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
};
