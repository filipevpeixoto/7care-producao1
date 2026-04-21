/**
 * Step 8: Configuração de Gamificação
 * Permite ao pastor configurar se deseja usar gamificação e a média de pontos
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  Trophy,
  Mountain,
  Star,
  Users,
  Calculator,
  Info,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { type GamificationConfigData } from '@/types/pastor-invite';

interface Step8GamificationConfigProps {
  data?: GamificationConfigData;
  onNext: (data: GamificationConfigData) => void;
  onBack: () => void;
}

export function Step8GamificationConfig({ data, onNext, onBack }: Step8GamificationConfigProps) {
  const [enableGamification, setEnableGamification] = useState(data?.enableGamification ?? true);
  const [targetAverage, setTargetAverage] = useState(data?.targetAverage?.toString() ?? '595');
  const [calculateOnApproval, setCalculateOnApproval] = useState(data?.calculateOnApproval ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({
      enableGamification,
      targetAverage: parseInt(targetAverage) || 595,
      calculateOnApproval,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-[var(--p7-text)]">
            Gamificação
          </h2>
        </div>
        <p className="text-gray-600 dark:text-[var(--p7-text-2)]">
          Configure o sistema de pontuação para engajar seus membros na jornada espiritual
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-8">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">O que é o sistema de Gamificação?</p>
            <p className="text-amber-700">
              Um sistema de pontos que incentiva a participação ativa dos membros. Eles ganham
              pontos por presença, estudos bíblicos, dízimos, ofertas e muito mais. Os pontos são
              representados como uma jornada nas montanhas, do Vale até o Monte Everest!
            </p>
          </div>
        </div>
      </div>

      {/* Enable Gamification */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[var(--p7-border)] dark:bg-[var(--p7-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <Label
                htmlFor="enable-gamification"
                className="text-lg font-semibold text-gray-800 dark:text-[var(--p7-text)]"
              >
                Ativar Gamificação
              </Label>
              <p className="text-sm text-gray-500 dark:text-[var(--p7-text-2)]">
                Habilita o sistema de pontos e níveis para seus membros
              </p>
            </div>
          </div>
          <Switch
            id="enable-gamification"
            checked={enableGamification}
            onCheckedChange={setEnableGamification}
            className="data-[state=checked]:bg-purple-600"
          />
        </div>
      </div>

      {/* Gamification Options - only show if enabled */}
      {enableGamification && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Mountain Levels Preview */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Mountain className="w-5 h-5 text-blue-400" />
              Níveis da Jornada Espiritual (Montes Bíblicos)
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 mb-4">
              {[
                {
                  name: 'Vale do Jordão',
                  icon: '🌊',
                  points: '0-299',
                  color: 'from-gray-500/20 to-gray-600/20',
                },
                {
                  name: 'Monte Sinai',
                  icon: '📜',
                  points: '300-399',
                  color: 'from-orange-500/20 to-orange-600/20',
                },
                {
                  name: 'Monte Nebo',
                  icon: '👁️',
                  points: '400-499',
                  color: 'from-blue-500/20 to-blue-600/20',
                },
                {
                  name: 'Monte Moriá',
                  icon: '🙏',
                  points: '500-599',
                  color: 'from-purple-500/20 to-purple-600/20',
                },
                {
                  name: 'Monte Carmelo',
                  icon: '🔥',
                  points: '600-699',
                  color: 'from-green-500/20 to-green-600/20',
                },
                {
                  name: 'Monte Hermon',
                  icon: '✨',
                  points: '700-799',
                  color: 'from-indigo-500/20 to-indigo-600/20',
                },
                {
                  name: 'Monte Sião',
                  icon: '👑',
                  points: '800-899',
                  color: 'from-red-500/20 to-red-600/20',
                },
                {
                  name: 'Monte das Oliveiras',
                  icon: '🫒',
                  points: '900-999',
                  color: 'from-yellow-500/20 to-yellow-600/20',
                },
                {
                  name: 'Canaã',
                  icon: '🏆',
                  points: '1000+',
                  color: 'from-amber-400/30 to-yellow-500/30',
                },
              ].map((level) => (
                <div
                  key={level.name}
                  className={`bg-gradient-to-br ${level.color} backdrop-blur rounded-lg p-2 sm:p-3 text-center border border-white/10`}
                >
                  <span className="text-xl sm:text-2xl">{level.icon}</span>
                  <p className="font-medium text-[10px] sm:text-xs mt-1 leading-tight">
                    {level.name}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-white/60">{level.points}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/60 text-center">
              Cada monte bíblico representa um estágio na jornada de fé do membro
            </p>
          </div>

          {/* Target Average */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[var(--p7-border)] dark:bg-[var(--p7-card)]">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                <Calculator className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <Label
                  htmlFor="target-average"
                  className="text-lg font-semibold text-gray-800 dark:text-[var(--p7-text)]"
                >
                  Média de Pontos Desejada
                </Label>
                <p className="mb-4 text-sm text-gray-500 dark:text-[var(--p7-text-2)]">
                  Define o valor base para calibrar a pontuação. Membros ativos terão pontuação
                  próxima a esse valor.
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    id="target-average"
                    type="number"
                    min="100"
                    max="5000"
                    value={targetAverage}
                    onChange={(e) => setTargetAverage(e.target.value)}
                    className="w-32 text-center text-lg font-bold"
                  />
                  <span className="text-gray-500 dark:text-[var(--p7-text-2)]">pontos</span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-sm text-gray-500 dark:text-[var(--p7-text-2)]">Sugestões:</span>
              {[300, 500, 595, 800, 1000].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTargetAverage(value.toString())}
                  aria-label={`Definir média como ${value} pontos`}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    targetAverage === value.toString()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[var(--p7-surface-2)] dark:text-[var(--p7-text-2)] dark:hover:bg-[var(--p7-border)]'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Calculate on Approval */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[var(--p7-border)] dark:bg-[var(--p7-card)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <Label
                    htmlFor="calculate-approval"
                    className="text-lg font-semibold text-gray-800 dark:text-[var(--p7-text)]"
                  >
                    Calcular Pontos na Aprovação
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-[var(--p7-text-2)]">
                    Calcular automaticamente os pontos de todos os membros importados quando seu
                    cadastro for aprovado
                  </p>
                </div>
              </div>
              <Switch
                id="calculate-approval"
                checked={calculateOnApproval}
                onCheckedChange={setCalculateOnApproval}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
            <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Resumo da Configuração
            </h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Sistema de gamificação: <strong>Ativado</strong>
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Média de pontos: <strong>{targetAverage} pontos</strong>
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Cálculo automático: <strong>{calculateOnApproval ? 'Sim' : 'Não'}</strong>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Disabled State Info */}
      {!enableGamification && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-[var(--p7-border)] dark:bg-[var(--p7-surface-2)]">
          <div className="mb-2 text-gray-400 dark:text-[var(--p7-text-3)]">
            <Trophy className="w-12 h-12 mx-auto opacity-50" />
          </div>
          <p className="text-gray-500 dark:text-[var(--p7-text-2)]">
            A gamificação está desativada. Você pode ativar a qualquer momento nas configurações do
            sistema após acessar sua conta.
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between border-t border-gray-100 pt-6 dark:border-[var(--p7-border)]">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button
          type="submit"
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          Próximo
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
