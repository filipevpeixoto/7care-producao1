/**
 * Indicador de progresso do wizard
 * Design elegante com gradientes
 */

import React from 'react';
import {
  Check,
  User,
  Building2,
  Church,
  FileSpreadsheet,
  CheckCircle,
  Lock,
  Trophy,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

const steps = [
  { number: 1, label: 'Dados Pessoais', icon: User },
  { number: 2, label: 'Distrito', icon: Building2 },
  { number: 3, label: 'Igrejas', icon: Church },
  { number: 4, label: 'Membros', icon: FileSpreadsheet },
  { number: 5, label: 'Validação', icon: CheckCircle },
  // { number: 6, label: 'Dracma', icon: Receipt }, // Desabilitado temporariamente
  { number: 6, label: 'Gamificação', icon: Trophy },
  { number: 7, label: 'Situações', icon: Layers },
  { number: 8, label: 'Senha', icon: Lock },
];

export function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  const { skin } = useTheme();

  if (skin === 'v2') {
    const currentIndex = Math.max(
      0,
      steps.findIndex((step) => step.number === currentStep)
    );

    return (
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
              Fluxo guiado
            </div>
            <div className="mt-1 text-sm text-[var(--p7-text-2)]">
              Etapa {currentStep} de {steps.length}
            </div>
          </div>
          <span className="rounded-full border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--p7-text)]">
            {completedSteps.length}/{steps.length} concluídas
          </span>
        </div>

        <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isReached = index <= currentIndex;

            return (
              <React.Fragment key={`pip-${step.number}`}>
                <button
                  type="button"
                  onClick={() =>
                    (step.number <= currentStep || isCompleted) && onStepClick?.(step.number)
                  }
                  disabled={!(step.number <= currentStep || isCompleted)}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.72rem] font-bold transition',
                    isCompleted &&
                      'border-transparent bg-[var(--grad-gold)] text-[var(--v2-navy-strong)] shadow-[var(--shadow-card)]',
                    isCurrent &&
                      !isCompleted &&
                      'border-[color-mix(in_oklab,var(--v2-blue)_28%,transparent)] bg-[color-mix(in_oklab,var(--v2-blue)_10%,white)] text-[var(--v2-blue)]',
                    !isCurrent &&
                      !isCompleted &&
                      isReached &&
                      'border-[var(--p7-border)] bg-[var(--p7-card)] text-[var(--p7-text)]',
                    !isReached &&
                      'border-[var(--p7-border)] bg-[var(--p7-surface-2)] text-[var(--p7-text-3)]'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : step.number}
                </button>
                {index < steps.length - 1 ? (
                  <div className="h-[2px] min-w-[22px] flex-1 rounded-full bg-[color-mix(in_oklab,var(--v2-blue)_10%,transparent)]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        isReached ? 'bg-[var(--grad-gold)]' : 'bg-transparent'
                      )}
                    />
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isAccessible = step.number <= currentStep || isCompleted;
            const Icon = step.icon;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => isAccessible && onStepClick?.(step.number)}
                disabled={!isAccessible}
                className={cn(
                  'flex items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition',
                  isCompleted &&
                    'border-transparent bg-[var(--grad-gold)] text-[var(--v2-navy-strong)] shadow-[var(--shadow-card)]',
                  isCurrent &&
                    !isCompleted &&
                    'border-[color-mix(in_oklab,var(--v2-blue)_28%,transparent)] bg-[color-mix(in_oklab,var(--v2-blue)_9%,white)] text-[var(--v2-blue)]',
                  !isCurrent &&
                    !isCompleted &&
                    isAccessible &&
                    'border-[var(--p7-border)] bg-[var(--p7-card)] text-[var(--p7-text)]',
                  !isAccessible &&
                    'border-[var(--p7-border)] bg-[var(--p7-surface-2)] text-[var(--p7-text-3)]'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]',
                    isCompleted && 'bg-white/72 text-[var(--v2-navy-strong)]',
                    isCurrent && !isCompleted && 'bg-white text-[var(--v2-blue)]',
                    !isCurrent && !isCompleted && 'bg-[var(--p7-surface-2)]'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] opacity-75">
                    Etapa {step.number}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold">{step.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const isAccessible = step.number <= currentStep || isCompleted;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.number}>
              {/* Step circle */}
              <div className="flex flex-col items-center relative">
                <button
                  onClick={() => isAccessible && onStepClick?.(step.number)}
                  disabled={!isAccessible}
                  className={cn(
                    'relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full transition-all duration-300',
                    'font-semibold text-sm md:text-base',
                    // Completed state
                    isCompleted &&
                      'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-green-500/30',
                    // Current state
                    isCurrent &&
                      !isCompleted &&
                      'bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-400/30',
                    // Accessible but not current/completed
                    !isCurrent &&
                      !isCompleted &&
                      isAccessible &&
                      'bg-white/20 border-2 border-white/30 text-white hover:bg-white/30 hover:border-white/50',
                    // Not accessible
                    !isAccessible &&
                      'bg-white/5 border-2 border-white/10 text-white/30 cursor-not-allowed'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 md:w-7 md:h-7" strokeWidth={3} />
                  ) : (
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  )}

                  {/* Pulse animation for current step */}
                  {isCurrent && !isCompleted && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-30" />
                  )}
                </button>

                {/* Label */}
                <span
                  className={cn(
                    'mt-3 text-xs md:text-sm font-medium text-center whitespace-nowrap transition-colors',
                    isCurrent && 'text-white',
                    isCompleted && 'text-emerald-300',
                    !isCurrent && !isCompleted && isAccessible && 'text-blue-200',
                    !isAccessible && 'text-white/30'
                  )}
                >
                  {step.label}
                </span>

                {/* Step number badge */}
                <span
                  className={cn(
                    'absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                    isCompleted && 'bg-white text-green-600',
                    isCurrent && !isCompleted && 'bg-white text-blue-600',
                    !isCurrent && !isCompleted && 'bg-white/20 text-white/70'
                  )}
                >
                  {step.number}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-1 md:mx-2 rounded-full overflow-hidden bg-white/10">
                  <div
                    className={cn(
                      'h-full transition-all duration-500 ease-out rounded-full',
                      isCompleted
                        ? 'w-full bg-gradient-to-r from-emerald-400 to-green-500'
                        : 'w-0 bg-gradient-to-r from-blue-400 to-purple-500'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
