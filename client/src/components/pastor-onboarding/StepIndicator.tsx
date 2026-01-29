/**
 * Indicador de progresso do wizard
 */

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

const steps = [
  { number: 1, label: 'Dados Pessoais' },
  { number: 2, label: 'Distrito' },
  { number: 3, label: 'Igrejas' },
  { number: 4, label: 'Membros' },
  { number: 5, label: 'Validação' },
  { number: 6, label: 'Senha' },
];

export function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto px-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const isAccessible = step.number <= currentStep || isCompleted;

          return (
            <React.Fragment key={step.number}>
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isAccessible && onStepClick?.(step.number)}
                  disabled={!isAccessible}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all',
                    'font-semibold text-sm md:text-base',
                    isCompleted && 'bg-green-500 border-green-500 text-white',
                    isCurrent && !isCompleted && 'bg-blue-500 border-blue-500 text-white',
                    !isCurrent &&
                      !isCompleted &&
                      isAccessible &&
                      'border-gray-300 text-gray-600 hover:border-blue-400',
                    !isAccessible && 'border-gray-200 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : step.number}
                </button>
                <span
                  className={cn(
                    'mt-2 text-xs md:text-sm font-medium text-center',
                    isCurrent && 'text-blue-600',
                    isCompleted && 'text-green-600',
                    !isCurrent && !isCompleted && 'text-gray-500'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
