/**
 * Hook para gerenciar o estado do wizard de onboarding de pastores
 */

import { useState, useEffect, useCallback } from 'react';
import { OnboardingData } from '@/types/pastor-invite';

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
        console.error('Erro ao carregar rascunho:', error);
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
    (step: number, data: any) => {
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
      const newStep = Math.min(prev.currentStep + 1, 6);

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
      currentStep: Math.max(1, Math.min(step, 6)),
    }));
  }, []);

  // Submeter tudo no final
  const submit = useCallback(
    async (password: string) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Transformar dados do frontend para o formato da API
        const apiPayload = {
          name: state.data.personal?.name || '',
          phone: state.data.personal?.phone || '',
          password,
          churches: state.data.churches || [],
          district: state.data.district,
          excelData: state.data.excelData,
          churchValidation: state.data.churchValidation,
        };

        const response = await fetch(`/api/invites/onboarding/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao enviar cadastro');
        }

        // Limpar rascunho após sucesso
        localStorage.removeItem(`${STORAGE_KEY}_${token}`);

        setState(prev => ({ ...prev, isLoading: false }));
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        return false;
      }
    },
    [token, state.data]
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
