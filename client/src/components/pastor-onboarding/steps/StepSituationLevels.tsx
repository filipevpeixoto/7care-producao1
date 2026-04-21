/**
 * Step 7: Configuração de Níveis de Situação
 * Permite ao pastor personalizar os níveis de situação do discipulado
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Layers, Info } from 'lucide-react';
import { SituationLevelsConfig } from '@/components/settings/SituationLevelsConfig';
import type { SituationLevelData } from '@/types/pastor-invite';

const DEFAULT_LEVELS: SituationLevelData[] = [
  { value: 'A', label: 'Pronto para Batismo', color: '#10b981' },
  { value: 'B', label: 'Detalhes Pessoais', color: '#3b82f6' },
  { value: 'C', label: 'Estudando Bíblia', color: '#8b5cf6' },
  { value: 'D', label: 'Quer Estudar', color: '#f97316' },
  { value: 'E', label: 'Contato Inicial', color: '#6b7280' },
];

interface StepSituationLevelsProps {
  data?: SituationLevelData[];
  onNext: (data: SituationLevelData[]) => void;
  onBack: () => void;
}

export function StepSituationLevels({ data, onNext, onBack }: StepSituationLevelsProps) {
  const [levels, setLevels] = useState<SituationLevelData[]>(data || DEFAULT_LEVELS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(levels);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-[var(--p7-text)]">
            Níveis de Situação
          </h2>
        </div>
        <p className="text-gray-600 dark:text-[var(--p7-text-2)]">
          Configure os níveis de situação para classificar seus interessados no discipulado
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 mb-8">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-violet-800">
            <p className="font-medium mb-1">Como funcionam os níveis?</p>
            <p className="text-violet-700">
              Cada interessado pode ser classificado com um nível de situação que indica seu
              progresso no discipulado. Você pode personalizar os códigos (letras), descrições e
              cores de cada nível. Esses níveis aparecerão como badges coloridos nos cards dos
              interessados.
            </p>
          </div>
        </div>
      </div>

      {/* Situation Levels Config */}
      <SituationLevelsConfig
        levels={levels}
        onChange={setLevels}
        showSaveButton={false}
        compact={true}
      />

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between border-t border-gray-100 pt-6 dark:border-[var(--p7-border)]">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button
          type="submit"
          className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
        >
          Próximo
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
