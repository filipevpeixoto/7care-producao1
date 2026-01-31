/**
 * Indicador de progresso do wizard
 * Design elegante com gradientes
 */

import React from 'react';
import { Check, User, Building2, Church, FileSpreadsheet, CheckCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { number: 6, label: 'Senha', icon: Lock },
];

export function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
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
