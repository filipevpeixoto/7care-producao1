/**
 * Hook para gerenciar o estado do wizard de onboarding de pastores
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { type OnboardingData } from '@/types/pastor-invite';
import { createLogger } from '@/lib/logger';

const onboardingLogger = createLogger('Onboarding');

interface WizardState {
  currentStep: number;
  data: Partial<OnboardingData>;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'pastor_onboarding_draft';

export function useOnboardingWizard(token: string) {
  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    data: {
      completedSteps: [],
      lastStepAt: new Date().toISOString(),
    },
    isLoading: false,
    error: null,
  });

  // Recuperar rascunho do localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_${token}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          currentStep: parsed.currentStep || 1,
          data: parsed.data || { completedSteps: [], lastStepAt: new Date().toISOString() },
        }));
      } catch (error) {
        onboardingLogger.error('Erro ao carregar rascunho:', error);
      }
    }
  }, [token]);

  // Salvar rascunho no localStorage
  const saveDraft = useCallback(() => {
    localStorage.setItem(
      `${STORAGE_KEY}_${token}`,
      JSON.stringify({
        currentStep: state.currentStep,
        data: state.data,
        savedAt: new Date().toISOString(),
      })
    );
  }, [token, state.currentStep, state.data]);

  // Atualizar dados de um passo
  const updateStepData = useCallback(
    (step: number, data: Record<string, unknown>) => {
      setState(prev => {
        const completedSteps = prev.data.completedSteps || [];
        const newData = {
          ...prev.data,
          ...data,
          completedSteps: Array.from(new Set([...completedSteps, step])),
          lastStepAt: new Date().toISOString(),
        };

        // Salvar no localStorage após atualizar
        setTimeout(() => {
          localStorage.setItem(
            `${STORAGE_KEY}_${token}`,
            JSON.stringify({
              currentStep: prev.currentStep,
              data: newData,
              savedAt: new Date().toISOString(),
            })
          );
        }, 0);

        return {
          ...prev,
          data: newData,
        };
      });
    },
    [token]
  );

  // Ir para próximo passo
  const nextStep = useCallback(() => {
    setState(prev => {
      const newStep = Math.min(prev.currentStep + 1, 8);

      // Salvar no localStorage
      setTimeout(() => {
        localStorage.setItem(
          `${STORAGE_KEY}_${token}`,
          JSON.stringify({
            currentStep: newStep,
            data: prev.data,
            savedAt: new Date().toISOString(),
          })
        );
      }, 0);

      return {
        ...prev,
        currentStep: newStep,
      };
    });
  }, [token]);

  // Voltar passo
  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  // Ir para um passo específico
  const goToStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(1, Math.min(step, 8)),
    }));
  }, []);

  // Submeter tudo no final via React Query mutation
  const submitMutation = useMutation({
    mutationFn: async (password: string) => {
      const apiPayload = {
        name: state.data.personal?.name || '',
        phone: state.data.personal?.phone || '',
        password,
        churches: state.data.churches || [],
        district: state.data.district,
        excelData: state.data.excelData,
        churchValidation: state.data.churchValidation,
        gamificationConfig: state.data.gamificationConfig,
        situationLevels: state.data.situationLevels,
      };

      const response = await fetch(`/api/invites/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar cadastro');
      }

      return response.json();
    },
    onSuccess: () => {
      localStorage.removeItem(`${STORAGE_KEY}_${token}`);
    },
  });

  const submit = useCallback(
    async (
      password: string
    ): Promise<{
      success: boolean;
      result?: {
        userId?: number;
        districtId?: number;
        churchesCreated?: number;
        membersImported?: number;
      };
      error?: string;
    }> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await submitMutation.mutateAsync(password);

        setState(prev => ({ ...prev, isLoading: false }));
        return {
          success: true,
          result: {
            userId: data.userId,
            districtId: data.districtId,
            churchesCreated: data.churchesCreated,
            membersImported: data.membersImported,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [submitMutation]
  );

  // Limpar erro
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    currentStep: state.currentStep,
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    updateStepData,
    nextStep,
    prevStep,
    goToStep,
    submit,
    saveDraft,
    clearError,
  };
}
