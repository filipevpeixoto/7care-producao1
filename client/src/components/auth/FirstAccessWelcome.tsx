import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Lock,
  Calendar,
  MessageSquare,
  Video,
  BarChart3,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Star,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  completed: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Completar Perfil',
    description: 'Adicione suas informações pessoais para personalizar sua experiência',
    icon: User,
    color: 'bg-blue-500',
    completed: false,
  },
  {
    id: 2,
    title: 'Alterar Senha',
    description: 'Defina uma senha segura para proteger sua conta',
    icon: Lock,
    color: 'bg-green-500',
    completed: false,
  },
  {
    id: 3,
    title: 'Explorar Agenda',
    description: 'Aprenda a visualizar e gerenciar seus eventos e reuniões',
    icon: Calendar,
    color: 'bg-purple-500',
    completed: false,
  },
  {
    id: 4,
    title: 'Comunicação',
    description: 'Descubra como enviar mensagens e se comunicar com outros membros',
    icon: MessageSquare,
    color: 'bg-orange-500',
    completed: false,
  },
  {
    id: 5,
    title: 'Videochamadas',
    description: 'Aprenda a participar de reuniões virtuais e estudos online',
    icon: Video,
    color: 'bg-red-500',
    completed: false,
  },
  {
    id: 6,
    title: 'Relatórios',
    description: 'Entenda como acompanhar seu progresso e atividades',
    icon: BarChart3,
    color: 'bg-indigo-500',
    completed: false,
  },
];

type WelcomeScreenProps = {
  userName?: string;
  steps: TutorialStep[];
  progressPercentage: number;
  onStart: () => void;
  onSkip: () => void;
};

type StepHeaderProps = {
  currentStep: number;
  stepsCount: number;
};

type PasswordChangeFormProps = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  isChangingPassword: boolean;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onToggleCurrentPassword: () => void;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
  onSubmit: () => void;
};

type StepContentProps = {
  currentStep: number;
  currentStepData: TutorialStep;
  passwordForm: PasswordChangeFormProps;
  onCompleteStep: () => void;
};

type StepNavigationProps = {
  currentStep: number;
  stepsCount: number;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  onGoToStep: (index: number) => void;
};

type StepListProps = {
  steps: TutorialStep[];
  currentStep: number;
  onGoToStep: (index: number) => void;
};

const STEP_DETAILS: Record<
  number,
  { text: string; tipText: string; tipClassName: string; tipTextClassName: string }
> = {
  0: {
    text: 'Complete seu perfil com informações básicas como telefone, endereço e dados pessoais. Isso nos ajuda a personalizar sua experiência.',
    tipText:
      '💡 Dica: Você pode editar essas informações a qualquer momento no menu "Meu Cadastro"',
    tipClassName: 'bg-blue-50',
    tipTextClassName: 'text-blue-800',
  },
  2: {
    text: 'Na agenda você pode visualizar todos os seus eventos, estudos bíblicos, reuniões de oração e atividades da igreja.',
    tipText: '📅 Funcionalidade: Você também pode solicitar reuniões diretamente pela agenda',
    tipClassName: 'bg-purple-50',
    tipTextClassName: 'text-purple-800',
  },
  3: {
    text: 'Use o chat para se comunicar com pastores, missionários e outros membros. Você pode enviar mensagens individuais ou participar de grupos.',
    tipText: '💬 Comunicação: As mensagens são privadas e seguras',
    tipClassName: 'bg-orange-50',
    tipTextClassName: 'text-orange-800',
  },
  4: {
    text: 'Participe de estudos bíblicos, reuniões e aconselhamentos através de videochamadas. É simples e funciona direto no seu navegador.',
    tipText: '🎥 Tecnologia: Não precisa baixar nenhum aplicativo adicional',
    tipClassName: 'bg-red-50',
    tipTextClassName: 'text-red-800',
  },
  5: {
    text: 'Acompanhe seu crescimento espiritual através de relatórios personalizados. Veja sua participação, pontuação e conquistas.',
    tipText: '📊 Gamificação: Ganhe pontos participando de atividades',
    tipClassName: 'bg-indigo-50',
    tipTextClassName: 'text-indigo-800',
  },
};

const StepProgressList = ({ steps }: { steps: TutorialStep[] }) => (
  <div className="grid grid-cols-2 gap-2">
    {steps.map((step) => (
      <div key={step.id} className="flex items-center space-x-2 text-sm">
        {step.completed ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
        )}
        <span className={step.completed ? 'text-green-700' : 'text-muted-foreground'}>
          {step.title}
        </span>
      </div>
    ))}
  </div>
);

const WelcomeScreen = ({
  userName,
  steps,
  progressPercentage,
  onStart,
  onSkip,
}: WelcomeScreenProps) => (
  <MobileLayout>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-divine">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
            <Star className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl text-primary">Bem-vindo!</CardTitle>
          <CardDescription className="text-base">
            Olá <span className="font-semibold text-primary">{userName}</span>! Vamos fazer um tour
            rápido para você conhecer todas as funcionalidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso do Tutorial</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <StepProgressList steps={steps} />

          <div className="space-y-3">
            <Button
              onClick={onStart}
              className="w-full bg-gradient-primary hover:opacity-90"
              data-testid="button-start-tutorial"
            >
              Começar Tutorial
            </Button>
            <Button
              variant="outline"
              onClick={onSkip}
              className="w-full"
              data-testid="button-skip-tutorial"
            >
              Pular Tutorial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </MobileLayout>
);

const StepHeader = ({ currentStep, stepsCount }: StepHeaderProps) => (
  <div className="text-center text-white space-y-2">
    <h1 className="text-2xl font-bold">Tutorial - Etapa {currentStep + 1}</h1>
    <div className="space-y-2">
      <Progress value={((currentStep + 1) / stepsCount) * 100} className="h-2" />
      <p className="text-sm opacity-90">
        {currentStep + 1} de {stepsCount} etapas
      </p>
    </div>
  </div>
);

const PasswordChangeForm = ({
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  isChangingPassword,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onToggleCurrentPassword,
  onToggleNewPassword,
  onToggleConfirmPassword,
  onSubmit,
}: PasswordChangeFormProps) => (
  <div className="space-y-4">
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Por segurança, você deve alterar sua senha padrão. Escolha uma senha forte com pelo menos 8
        caracteres.
      </p>
      <div className="bg-green-50 p-3 rounded-lg">
        <p className="text-sm font-medium text-green-800">
          🔒 Segurança: Use uma combinação de letras, números e símbolos
        </p>
      </div>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Senha Atual</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            placeholder="Digite sua senha atual"
            value={currentPassword}
            onChange={(e) => onChangeCurrentPassword(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={onToggleCurrentPassword}
            aria-label={showCurrentPassword ? 'Ocultar senha atual' : 'Mostrar senha atual'}
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova Senha</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            placeholder="Digite sua nova senha"
            value={newPassword}
            onChange={(e) => onChangeNewPassword(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={onToggleNewPassword}
            aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirme sua nova senha"
            value={confirmPassword}
            onChange={(e) => onChangeConfirmPassword(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={onToggleConfirmPassword}
            aria-label={
              showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <Button
        onClick={onSubmit}
        disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
        className="w-full"
      >
        {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
      </Button>
    </div>
  </div>
);

const StepContent = ({
  currentStep,
  currentStepData,
  passwordForm,
  onCompleteStep,
}: StepContentProps) => {
  if (currentStep === 1) {
    return <PasswordChangeForm {...passwordForm} />;
  }

  const detail = STEP_DETAILS[currentStep];

  return (
    <div className="space-y-4">
      {detail && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{detail.text}</p>
          <div className={`${detail.tipClassName} p-3 rounded-lg`}>
            <p className={`text-sm font-medium ${detail.tipTextClassName}`}>{detail.tipText}</p>
          </div>
        </div>
      )}

      <Button
        onClick={onCompleteStep}
        variant={currentStepData.completed ? 'secondary' : 'default'}
        className="w-full"
        data-testid={`button-complete-step-${currentStep + 1}`}
      >
        {currentStepData.completed ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Etapa Concluída
          </>
        ) : (
          'Marcar como Concluída'
        )}
      </Button>
    </div>
  );
};

const StepNavigation = ({
  currentStep,
  stepsCount,
  onPrev,
  onNext,
  onFinish,
  onGoToStep,
}: StepNavigationProps) => (
  <div className="flex justify-between items-center">
    <Button
      variant="outline"
      onClick={onPrev}
      disabled={currentStep === 0}
      className="bg-white/90"
      data-testid="button-prev-step"
    >
      <ChevronLeft className="w-4 h-4 mr-1" />
      Anterior
    </Button>

    <div className="flex space-x-1">
      {Array.from({ length: stepsCount }).map((_, idx) => (
        <button
          key={idx}
          onClick={() => onGoToStep(idx)}
          className={`w-2 h-2 rounded-full transition-colors ${
            idx === currentStep ? 'bg-white' : idx < currentStep ? 'bg-white/70' : 'bg-white/30'
          }`}
          data-testid={`button-step-${idx + 1}`}
        />
      ))}
    </div>

    {currentStep < stepsCount - 1 ? (
      <Button
        variant="outline"
        onClick={onNext}
        className="bg-white/90"
        data-testid="button-next-step"
      >
        Próxima
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    ) : (
      <Button
        onClick={onFinish}
        className="bg-white text-primary hover:bg-white/90"
        data-testid="button-finish-tutorial"
      >
        Finalizar
      </Button>
    )}
  </div>
);

const StepList = ({ steps, currentStep, onGoToStep }: StepListProps) => (
  <Card className="bg-white/95">
    <CardHeader>
      <CardTitle className="text-lg">Todas as Etapas</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                index === currentStep
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onGoToStep(index)}
            >
              <div
                className={`w-8 h-8 ${step.color} rounded-full flex items-center justify-center flex-shrink-0`}
              >
                <StepIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
              {step.completed && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
              {index === currentStep && (
                <Badge variant="secondary" className="flex-shrink-0">
                  Atual
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </CardContent>
  </Card>
);

export const FirstAccessWelcome = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(TUTORIAL_STEPS);
  const [showWelcome, setShowWelcome] = useState(true);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Verificar se o tutorial já foi pulado ou completado - redirecionar para dashboard
  const tutorialCompleted = user?.id ? localStorage.getItem(`tutorial_completed_${user.id}`) : null;
  const tutorialSkipped = user?.id ? localStorage.getItem(`tutorial_skipped_${user.id}`) : null;

  // Load progress from localStorage - usando chave específica do usuário
  useEffect(() => {
    if (!user?.id) return;
    const savedProgress = localStorage.getItem(`tutorial_progress_${user.id}`);
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setSteps((prevSteps) =>
        prevSteps.map((step) => ({
          ...step,
          completed: progress.includes(step.id),
        }))
      );
      setCurrentStep(progress.length);
    }
  }, [user?.id]);

  if (tutorialCompleted || tutorialSkipped) {
    return <Navigate to="/dashboard" replace />;
  }

  // Save progress to localStorage - usando chave específica do usuário
  const saveProgress = (stepId: number) => {
    if (!user?.id) return;
    const currentProgress = JSON.parse(
      localStorage.getItem(`tutorial_progress_${user.id}`) || '[]'
    );
    if (!currentProgress.includes(stepId)) {
      currentProgress.push(stepId);
      localStorage.setItem(`tutorial_progress_${user.id}`, JSON.stringify(currentProgress));
    }
  };

  const completeStep = (stepId: number) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.id === stepId ? { ...step, completed: true } : step))
    );
    saveProgress(stepId);

    if (currentStep === stepId - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTutorial = () => {
    if (user?.id) {
      localStorage.setItem(`tutorial_completed_${user.id}`, 'true');
    }
    window.location.href = '/dashboard';
  };

  const skipTutorial = () => {
    if (user?.id) {
      localStorage.setItem(`tutorial_skipped_${user.id}`, 'true');
    }
    window.location.href = '/dashboard';
  };

  const handleChangePassword = async () => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não identificado',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 8 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso!',
          description: 'Senha alterada com sucesso',
        });

        // Update local auth state with the updated user data from server
        localStorage.setItem('7care_auth', JSON.stringify(data.user));

        // Mark tutorial as completed and redirect to dashboard - usando chave específica do usuário
        if (user?.id) {
          localStorage.setItem(`tutorial_completed_${user.id}`, 'true');
        }

        // Redirect to dashboard after password change
        window.location.href = '/dashboard';
      } else {
        toast({
          title: 'Erro',
          description: data.message || 'Erro ao alterar senha',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = steps.filter((step) => step.completed).length;
    return (completedSteps / steps.length) * 100;
  };

  const getCurrentStepData = () => steps[currentStep] || steps[0];

  if (showWelcome) {
    return (
      <WelcomeScreen
        userName={user?.name}
        steps={steps}
        progressPercentage={getProgressPercentage()}
        onStart={() => setShowWelcome(false)}
        onSkip={skipTutorial}
      />
    );
  }

  const currentStepData = getCurrentStepData();
  const StepIcon = currentStepData.icon;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          <StepHeader currentStep={currentStep} stepsCount={steps.length} />

          {/* Current Step Card */}
          <Card className="shadow-divine">
            <CardHeader className="text-center space-y-4">
              <div
                className={`w-16 h-16 mx-auto ${currentStepData.color} rounded-full flex items-center justify-center`}
              >
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              <CardDescription className="text-base">{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <StepContent
                currentStep={currentStep}
                currentStepData={currentStepData}
                passwordForm={{
                  currentPassword,
                  newPassword,
                  confirmPassword,
                  showCurrentPassword,
                  showNewPassword,
                  showConfirmPassword,
                  isChangingPassword,
                  onChangeCurrentPassword: setCurrentPassword,
                  onChangeNewPassword: setNewPassword,
                  onChangeConfirmPassword: setConfirmPassword,
                  onToggleCurrentPassword: () => setShowCurrentPassword(!showCurrentPassword),
                  onToggleNewPassword: () => setShowNewPassword(!showNewPassword),
                  onToggleConfirmPassword: () => setShowConfirmPassword(!showConfirmPassword),
                  onSubmit: handleChangePassword,
                }}
                onCompleteStep={() => completeStep(currentStep + 1)}
              />
            </CardContent>
          </Card>

          <StepNavigation
            currentStep={currentStep}
            stepsCount={steps.length}
            onPrev={prevStep}
            onNext={nextStep}
            onFinish={completeTutorial}
            onGoToStep={goToStep}
          />

          <StepList steps={steps} currentStep={currentStep} onGoToStep={goToStep} />

          {/* Skip Tutorial Option */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={skipTutorial}
              className="text-white/80 hover:text-white hover:bg-white/10"
              data-testid="button-skip-tutorial-bottom"
            >
              Pular Tutorial e Ir para o Dashboard
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};
