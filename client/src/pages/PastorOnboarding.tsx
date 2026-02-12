/**
 * Página de Onboarding de Pastores
 * Wizard de 6 passos para cadastro self-service
 * Design elegante inspirado na landing page
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  Shield,
  Users,
  WifiOff,
  XCircle,
  Building2,
} from 'lucide-react';
import { useOnboardingWizard } from '@/hooks/useOnboardingWizard';
import { StepIndicator } from '@/components/pastor-onboarding/StepIndicator';
import { Step1Personal } from '@/components/pastor-onboarding/steps/Step1Personal';
import { Step2District } from '@/components/pastor-onboarding/steps/Step2District';
import { Step3Churches } from '@/components/pastor-onboarding/steps/Step3Churches';
import { Step4ExcelImport } from '@/components/pastor-onboarding/steps/Step4ExcelImport';
import { Step5Validation } from '@/components/pastor-onboarding/steps/Step5Validation';
// import { Step6DracmaConfig } from '@/components/pastor-onboarding/steps/Step6DracmaConfig'; // Desabilitado temporariamente
import { Step7Password } from '@/components/pastor-onboarding/steps/Step7Password';
import { Step8GamificationConfig } from '@/components/pastor-onboarding/steps/Step8GamificationConfig';
import { StepSituationLevels } from '@/components/pastor-onboarding/steps/StepSituationLevels';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  type PersonalData,
  type DistrictData,
  type ChurchData,
  type ExcelData,
  type ChurchValidation,
  // DracmaConfigData, // Desabilitado temporariamente
  type GamificationConfigData,
  type SituationLevelData,
} from '@/types/pastor-invite';

export default function PastorOnboarding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

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

  // Validar token ao carregar
  useEffect(() => {
    if (!token) {
      setValidationError('Token inválido');
      setValidating(false);
      return;
    }

    fetch(`/api/invites/validate/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setInviteData({ email: data.email, expiresAt: data.expiresAt });
        } else if (data.status === 'submitted') {
          // Cadastro já foi enviado, aguardando aprovação
          setValidationError(
            data.message || 'Seu cadastro foi enviado e está aguardando aprovação do administrador.'
          );
        } else {
          setValidationError(data.error || 'Convite inválido');
        }
        setValidating(false);
      })
      .catch(err => {
        setValidationError('Erro ao validar convite');
        setValidating(false);
      });
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

  // handleStep6Next para Dracma desabilitado temporariamente
  // const handleStep6Next = (dracmaConfig: DracmaConfigData) => {
  //   updateStepData(6, { dracmaConfig });
  //   nextStep();
  // };

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
      step: 'Iniciando processamento...',
      progress: 10,
      details: 'Preparando dados do cadastro...',
      isComplete: false,
      isError: false,
    });

    // Simular progresso visual enquanto aguarda o backend
    setOnboardingProgress(prev => ({
      ...prev,
      step: 'Criando usuário e distrito...',
      progress: 30,
      details: 'Aguarde enquanto configuramos sua conta...',
    }));

    const response = await submit(password);

    if (response.success) {
      // Atualizar progresso com resultado
      setOnboardingProgress(prev => ({
        ...prev,
        step: 'Importando igrejas e membros...',
        progress: 70,
        details: 'Processando dados importados...',
      }));

      // Pequeno delay para mostrar a animação
      setTimeout(() => {
        setOnboardingProgress({
          step: 'Cadastro finalizado!',
          progress: 100,
          details: 'Tudo pronto! Você já pode fazer login.',
          isComplete: true,
          isError: false,
          result: response.result,
        });
      }, 500);
    } else {
      setOnboardingProgress({
        step: 'Erro no processamento',
        progress: 100,
        details: response.error || 'Ocorreu um erro ao processar seu cadastro.',
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
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 max-w-md w-full mx-4 text-center shadow-2xl">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-6 animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-2">Validando Convite</h2>
          <p className="text-blue-200">Aguarde enquanto verificamos seu convite...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (validationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 max-w-md w-full mx-4 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Convite Inválido</h2>
          <p className="text-red-200 mb-8">{validationError}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-3 rounded-full font-semibold hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 max-w-lg w-full mx-4 text-center shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Cadastro Concluído! 🎉</h2>
          <p className="text-blue-200 mb-8 text-base sm:text-lg px-4 sm:px-0">
            Seu cadastro foi concluído com sucesso! Você já pode fazer login e começar a usar o
            sistema imediatamente.
          </p>

          {/* Features mini-cards */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-8 px-4 sm:px-0">
            {/* Destaque: Modo Offline */}
            <div className="col-span-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl p-4 sm:p-5 border border-orange-400/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-bl-lg">
                NOVO!
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-orange-400 to-amber-500 p-3 rounded-xl shadow-lg shadow-orange-500/30">
                  <WifiOff className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-bold text-sm sm:text-base">
                    Modo Offline Completo
                  </h3>
                  <p className="text-orange-200/80 text-[10px] sm:text-xs">
                    Trabalhe sem internet! Orações, reuniões, discipulado e mais
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-white/70 text-[10px] sm:text-xs">Acesso Seguro</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-white/70 text-[10px] sm:text-xs">Gestão de Membros</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
          >
            <Sparkles className="w-5 h-5" />
            Ir para Login
          </button>
        </div>
      </div>
    );
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
                  Cadastro de Pastor
                </h1>
                <p className="text-blue-200/70 text-sm">Complete os passos para criar sua conta</p>
              </div>
            </div>

            {/* Badge */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-white/80 text-sm font-medium">Convite Exclusivo</span>
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
              <span className="text-white font-semibold text-sm">NOVO: Modo Offline Completo!</span>
            </div>
            <span className="text-orange-200/80 text-xs sm:text-sm hidden sm:inline">
              Trabalhe sem internet em visitas pastorais • Orações, reuniões, discipulado e mais •
              Sincroniza automaticamente
            </span>
            <span className="text-orange-200/80 text-xs sm:hidden">Trabalhe sem internet!</span>
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
                    <p className="font-semibold text-red-200">Erro</p>
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

              {/* Step6 Dracma desabilitado temporariamente */}
              {/* {currentStep === 6 && (
                <Step6DracmaConfig
                  data={data.dracmaConfig}
                  onNext={handleStep6Next}
                  onBack={prevStep}
                />
              )} */}

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
        <p className="text-blue-200/50 text-sm">© 2026 7Care. Todos os direitos reservados.</p>
      </footer>

      {/* Progress Dialog */}
      <Dialog
        open={isProgressDialogOpen}
        onOpenChange={open => {
          // Só permite fechar se completou ou deu erro
          if (!open && (onboardingProgress.isComplete || onboardingProgress.isError)) {
            handleCloseProgressDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {onboardingProgress.isComplete ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Cadastro Concluído
                </>
              ) : onboardingProgress.isError ? (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Erro no Cadastro
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  Processando Cadastro
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{onboardingProgress.step}</span>
                <span className="text-muted-foreground">{onboardingProgress.progress}%</span>
              </div>
              <Progress
                value={onboardingProgress.progress}
                className={`h-2 ${
                  onboardingProgress.isError
                    ? '[&>div]:bg-red-500'
                    : onboardingProgress.isComplete
                      ? '[&>div]:bg-green-500'
                      : ''
                }`}
              />
              <p className="text-sm text-muted-foreground">{onboardingProgress.details}</p>
            </div>

            {/* Resultado final */}
            {onboardingProgress.isComplete && onboardingProgress.result && (
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Resumo do Cadastro
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {onboardingProgress.result.districtId && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-green-600" />
                      <span>Distrito criado</span>
                    </div>
                  )}
                  {(onboardingProgress.result.churchesCreated ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-green-600" />
                      <span>{onboardingProgress.result.churchesCreated} igreja(s)</span>
                    </div>
                  )}
                  {(onboardingProgress.result.membersImported ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <span>{onboardingProgress.result.membersImported} membros</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Erro */}
            {onboardingProgress.isError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {onboardingProgress.details}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {(onboardingProgress.isComplete || onboardingProgress.isError) && (
              <Button
                onClick={handleCloseProgressDialog}
                className={onboardingProgress.isComplete ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {onboardingProgress.isComplete ? 'Ir para Login' : 'Fechar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
