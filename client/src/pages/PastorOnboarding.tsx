/**
 * Página de Onboarding de Pastores
 * Wizard de 6 passos para cadastro self-service
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-lg text-gray-600">Validando convite...</p>
        </Card>
      </div>
    );
  }

  // Error state
  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h2>
            <p className="text-gray-600 mb-6">{validationError}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Voltar para Home
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro Enviado!</h2>
            <p className="text-gray-600 mb-6">
              Seu cadastro foi enviado para aprovação. Você receberá um email quando for aprovado
              pelo administrador.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Ir para Login
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Main wizard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-900">7Care - Cadastro de Pastor</h1>
          <p className="text-gray-600 mt-1">
            Bem-vindo! Complete os passos abaixo para criar sua conta.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white border-b">
        <StepIndicator
          currentStep={currentStep}
          completedSteps={data.completedSteps || []}
          onStepClick={goToStep}
        />
      </div>

      {/* Content */}
      <div className="py-8">
        <Card className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Erro</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button onClick={clearError} className="ml-auto text-red-500 hover:text-red-700">
                  ✕
                </button>
              </div>
            </div>
          )}

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
            <Step3Churches data={data.churches || []} onNext={handleStep3Next} onBack={prevStep} />
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
            <Step6Password onSubmit={handleFinalSubmit} onBack={prevStep} isLoading={isLoading} />
          )}
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-gray-500 text-sm">
        <p>© 2026 7Care. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
