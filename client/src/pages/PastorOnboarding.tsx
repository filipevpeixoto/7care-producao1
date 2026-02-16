/**
 * Página de Onboarding de Pastores
 * Wizard de 6 passos para cadastro self-service
 * Design elegante inspirado na landing page
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Sparkles, WifiOff } from 'lucide-react';
import { useOnboardingWizard } from '@/hooks/useOnboardingWizard';
import { StepIndicator } from '@/components/pastor-onboarding/StepIndicator';
import { Step1Personal } from '@/components/pastor-onboarding/steps/Step1Personal';
import { Step2District } from '@/components/pastor-onboarding/steps/Step2District';
import { Step3Churches } from '@/components/pastor-onboarding/steps/Step3Churches';
import { Step4ExcelImport } from '@/components/pastor-onboarding/steps/Step4ExcelImport';
import { Step5Validation } from '@/components/pastor-onboarding/steps/Step5Validation';
import { Step7Password } from '@/components/pastor-onboarding/steps/Step7Password';
import { Step8GamificationConfig } from '@/components/pastor-onboarding/steps/Step8GamificationConfig';
import { StepSituationLevels } from '@/components/pastor-onboarding/steps/StepSituationLevels';
import {
  type PersonalData,
  type DistrictData,
  type ChurchData,
  type ExcelData,
  type ChurchValidation,
  type GamificationConfigData,
  type SituationLevelData,
} from '@/types/pastor-invite';
import {
  InvalidInviteState,
  SuccessState,
  ProgressDialog,
} from './pastor-onboarding/PastorOnboardingSections';

export default function PastorOnboarding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState<{ email: string; expiresAt: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Progress dialog for onboarding
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState<{
    step: string;
    progress: number;
    details: string;
    isComplete: boolean;
    isError: boolean;
    result?: {
      districtId?: number;
      churchesCreated?: number;
      membersImported?: number;
    };
  }>({
    step: '',
    progress: 0,
    details: '',
    isComplete: false,
    isError: false,
  });

  const {
    currentStep,
    data,
    isLoading,
    error,
    updateStepData,
    nextStep,
    prevStep,
    goToStep,
    submit,
    clearError,
  } = useOnboardingWizard(token || '');

  const hasToken = Boolean(token);
  const effectiveValidating = hasToken ? validating : false;
  const effectiveValidationError = hasToken ? validationError : t('pastorOnboarding.invalidToken');

  // Validar token ao carregar
  useEffect(() => {
    if (!token) return;

    let isActive = true;

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/invites/validate/${token}`);
        const data = await res.json();
        if (!isActive) return;

        if (data.valid) {
          setInviteData({ email: data.email, expiresAt: data.expiresAt });
        } else if (data.status === 'submitted') {
          setValidationError(
            data.message || t('pastorOnboarding.submittedWaiting')
          );
        } else {
          setValidationError(data.error || t('pastorOnboarding.invalidInvite'));
        }
        setValidating(false);
      } catch {
        if (!isActive) return;
        setValidationError(t('pastorOnboarding.validationError'));
        setValidating(false);
      }
    };

    validateToken();

    return () => {
      isActive = false;
    };
  }, [token]);

  // Handlers
  const handleStep1Next = (personalData: PersonalData) => {
    updateStepData(1, { personal: personalData });
    nextStep();
  };

  const handleStep2Next = (districtData: DistrictData) => {
    updateStepData(2, { district: districtData });
    nextStep();
  };

  const handleStep3Next = (churches: ChurchData[]) => {
    updateStepData(3, { churches });
    nextStep();
  };

  const handleStep4Update = (excelData: ExcelData | undefined) => {
    updateStepData(4, { excelData });
  };

  const handleStep4Next = () => {
    nextStep();
  };

  const handleStep5Update = (churchValidation: ChurchValidation[]) => {
    updateStepData(5, { churchValidation });
  };

  const handleStep5Next = () => {
    nextStep();
  };

  const handleStep6Next = (gamificationConfig: GamificationConfigData) => {
    updateStepData(6, { gamificationConfig });
    nextStep();
  };

  const handleStep7Next = (situationLevels: SituationLevelData[]) => {
    updateStepData(7, { situationLevels });
    nextStep();
  };

  const handleFinalSubmit = async (password: string) => {
    // Abrir modal de progresso
    setIsProgressDialogOpen(true);
    setOnboardingProgress({
      step: t('pastorOnboarding.startingProcessing'),
      progress: 10,
      details: t('pastorOnboarding.preparingData'),
      isComplete: false,
      isError: false,
    });

    // Simular progresso visual enquanto aguarda o backend
    setOnboardingProgress(prev => ({
      ...prev,
      step: t('pastorOnboarding.creatingUserDistrict'),
      progress: 30,
      details: t('pastorOnboarding.configuringAccount'),
    }));

    const response = await submit(password);

    if (response.success) {
      // Atualizar progresso com resultado
      setOnboardingProgress(prev => ({
        ...prev,
        step: t('pastorOnboarding.importingChurchesMembers'),
        progress: 70,
        details: t('pastorOnboarding.processingImportedData'),
      }));

      // Pequeno delay para mostrar a animação
      setTimeout(() => {
        setOnboardingProgress({
          step: t('pastorOnboarding.registrationComplete'),
          progress: 100,
          details: t('pastorOnboarding.readyToLogin'),
          isComplete: true,
          isError: false,
          result: response.result,
        });
      }, 500);
    } else {
      setOnboardingProgress({
        step: t('pastorOnboarding.processingError'),
        progress: 100,
        details: response.error || t('pastorOnboarding.processingErrorDesc'),
        isComplete: false,
        isError: true,
      });
    }
  };

  const handleCloseProgressDialog = () => {
    setIsProgressDialogOpen(false);
    if (onboardingProgress.isComplete) {
      setSubmitted(true);
    }
  };

  // Loading state
  if (effectiveValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 max-w-md w-full mx-4 text-center shadow-2xl">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-6 animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('pastorOnboarding.validatingInvite')}</h2>
          <p className="text-blue-200">{t('pastorOnboarding.validatingDesc')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (effectiveValidationError) {
    return (
      <InvalidInviteState
        effectiveValidationError={effectiveValidationError}
        onBackHome={() => navigate('/')}
      />
    );
  }

  // Success state
  if (submitted) {
    return <SuccessState onGoToLogin={() => navigate('/login')} />;
  }

  // Main wizard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/7carelogonew.png" alt="7Care" className="h-10 w-auto" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {t('pastorOnboarding.title')}
                </h1>
                <p className="text-blue-200/70 text-sm">{t('pastorOnboarding.subtitle')}</p>
              </div>
            </div>

            {/* Badge */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-white/80 text-sm font-medium">{t('pastorOnboarding.exclusiveInvite')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Modo Offline - Destaque */}
      <div className="relative z-10 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 border-b border-orange-400/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-orange-400 to-amber-500 p-1.5 rounded-lg shadow-lg shadow-orange-500/30">
                <WifiOff className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">{t('pastorOnboarding.offlineModeBadge')}</span>
            </div>
            <span className="text-orange-200/80 text-xs sm:text-sm hidden sm:inline">
              {t('pastorOnboarding.offlineModeDescDesktop')}
            </span>
            <span className="text-orange-200/80 text-xs sm:hidden">{t('pastorOnboarding.offlineModeDescMobile')}</span>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="relative z-10 bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto">
          <StepIndicator
            currentStep={currentStep}
            completedSteps={data.completedSteps || []}
            onStepClick={goToStep}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Glass Card Container */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-500/20 border-b border-red-500/30 px-6 py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-200">{t('pastorOnboarding.error')}</p>
                    <p className="text-sm text-red-300/80">{error}</p>
                  </div>
                  <button
                    onClick={clearError}
                    className="text-red-400 hover:text-red-300 transition-colors p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Step Content - with white background for forms */}
            <div className="bg-white rounded-b-3xl">
              {currentStep === 1 && inviteData && (
                <Step1Personal
                  data={data.personal || { name: '', email: inviteData.email, phone: '' }}
                  email={inviteData.email}
                  onNext={handleStep1Next}
                />
              )}

              {currentStep === 2 && (
                <Step2District
                  data={data.district || { name: '' }}
                  onNext={handleStep2Next}
                  onBack={prevStep}
                />
              )}

              {currentStep === 3 && (
                <Step3Churches
                  data={data.churches || []}
                  onNext={handleStep3Next}
                  onBack={prevStep}
                />
              )}

              {currentStep === 4 && token && (
                <Step4ExcelImport
                  data={data.excelData}
                  onUpdate={handleStep4Update}
                  onNext={handleStep4Next}
                  onBack={prevStep}
                  token={token}
                />
              )}

              {currentStep === 5 && token && (
                <Step5Validation
                  excelData={data.excelData}
                  validations={data.churchValidation}
                  onUpdate={handleStep5Update}
                  onNext={handleStep5Next}
                  onBack={prevStep}
                  token={token}
                />
              )}

              {currentStep === 6 && (
                <Step8GamificationConfig
                  data={data.gamificationConfig}
                  onNext={handleStep6Next}
                  onBack={prevStep}
                />
              )}

              {currentStep === 7 && (
                <StepSituationLevels
                  data={data.situationLevels}
                  onNext={handleStep7Next}
                  onBack={prevStep}
                />
              )}

              {currentStep === 8 && (
                <Step7Password
                  onSubmit={handleFinalSubmit}
                  onBack={prevStep}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8">
        <p className="text-blue-200/50 text-sm">{t('pastorOnboarding.copyright')}</p>
      </footer>

      <ProgressDialog
        isOpen={isProgressDialogOpen}
        onRequestClose={open => {
          if (!open && (onboardingProgress.isComplete || onboardingProgress.isError)) {
            handleCloseProgressDialog();
          }
        }}
        progress={onboardingProgress}
        onClose={handleCloseProgressDialog}
      />
    </div>
  );
}
