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
  Church,
} from 'lucide-react';
import { useOnboardingWizard } from '@/hooks/useOnboardingWizard';
import { StepIndicator } from '@/components/pastor-onboarding/StepIndicator';
import { Step1Personal } from '@/components/pastor-onboarding/steps/Step1Personal';
import { Step2District } from '@/components/pastor-onboarding/steps/Step2District';
import { Step3Churches } from '@/components/pastor-onboarding/steps/Step3Churches';
import { Step4ExcelImport } from '@/components/pastor-onboarding/steps/Step4ExcelImport';
import { Step5Validation } from '@/components/pastor-onboarding/steps/Step5Validation';
import { Step6Password } from '@/components/pastor-onboarding/steps/Step6Password';
import {
  PersonalData,
  DistrictData,
  ChurchData,
  ExcelData,
  ChurchValidation,
} from '@/types/pastor-invite';

export default function PastorOnboarding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState<{ email: string; expiresAt: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  const handleFinalSubmit = async (password: string) => {
    const success = await submit(password);
    if (success) {
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
          <h2 className="text-3xl font-bold text-white mb-3">Cadastro Enviado!</h2>
          <p className="text-blue-200 mb-8 text-lg">
            Seu cadastro foi enviado para aprovação. Você receberá um email quando for aprovado pelo
            administrador.
          </p>

          {/* Features mini-cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-white/70 text-xs">Acesso Seguro</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-white/70 text-xs">Gestão de Membros</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <Church className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-white/70 text-xs">Suas Igrejas</p>
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

              {currentStep === 6 && (
                <Step6Password
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
    </div>
  );
}
