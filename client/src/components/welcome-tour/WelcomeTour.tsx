/**
 * WelcomeTour - Tutorial interativo de boas-vindas para pastores
 * Destaca áreas importantes do sistema com animações elegantes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutDashboard,
  Users,
  Heart,
  Calendar,
  MessageCircle,
  Trophy,
  BarChart3,
  Settings,
  Church,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import './WelcomeTour.css';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector do elemento a destacar
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
}

interface WelcomeTourProps {
  onComplete: () => void;
  onSkip: () => void;
  userName?: string;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao 7Care! 🎉',
    description:
      'Estamos felizes em tê-lo conosco! Este breve tutorial vai mostrar como o 7Care pode ajudar você a cuidar melhor da sua igreja e dos seus membros.',
    icon: <Sparkles className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Painel Principal',
    description:
      'Aqui você tem uma visão geral de tudo: membros ativos, eventos próximos, pedidos de oração e muito mais. Tudo em um só lugar para facilitar sua gestão.',
    icon: <LayoutDashboard className="w-8 h-8" />,
    target: '[data-tour="dashboard"]',
    position: 'bottom',
  },
  {
    id: 'members',
    title: 'Gestão de Membros',
    description:
      'Cadastre e acompanhe todos os membros da sua igreja. Veja informações de contato, histórico de presença, dízimos e muito mais.',
    icon: <Users className="w-8 h-8" />,
    target: '[data-tour="members"]',
    position: 'right',
  },
  {
    id: 'churches',
    title: 'Suas Igrejas',
    description:
      'Gerencie todas as igrejas do seu distrito. Cada igreja tem suas próprias informações, membros e estatísticas.',
    icon: <Church className="w-8 h-8" />,
    target: '[data-tour="churches"]',
    position: 'right',
  },
  {
    id: 'prayers',
    title: 'Pedidos de Oração',
    description:
      'Receba e acompanhe os pedidos de oração dos membros. Você pode marcar como "orando" e dar feedback quando a oração for respondida.',
    icon: <Heart className="w-8 h-8" />,
    target: '[data-tour="prayers"]',
    position: 'right',
  },
  {
    id: 'calendar',
    title: 'Agenda de Eventos',
    description:
      'Organize cultos, reuniões, visitas pastorais e eventos especiais. Os membros podem ver e confirmar presença pelo app.',
    icon: <Calendar className="w-8 h-8" />,
    target: '[data-tour="calendar"]',
    position: 'right',
  },
  {
    id: 'chat',
    title: 'Comunicação Direta',
    description:
      'Converse diretamente com membros, líderes e outros pastores. Crie grupos para departamentos ou comissões específicas.',
    icon: <MessageCircle className="w-8 h-8" />,
    target: '[data-tour="chat"]',
    position: 'right',
  },
  {
    id: 'gamification',
    title: 'Engajamento & Pontos',
    description:
      'O sistema de gamificação incentiva os membros a participarem mais! Eles ganham pontos por presença, leitura bíblica, evangelismo e mais.',
    icon: <Trophy className="w-8 h-8" />,
    target: '[data-tour="gamification"]',
    position: 'right',
  },
  {
    id: 'reports',
    title: 'Relatórios & Métricas',
    description:
      'Acompanhe o crescimento da igreja com relatórios detalhados: presença, batismos, dízimos, engajamento e tendências.',
    icon: <BarChart3 className="w-8 h-8" />,
    target: '[data-tour="reports"]',
    position: 'right',
  },
  {
    id: 'settings',
    title: 'Configurações',
    description:
      'Personalize o sistema de acordo com as necessidades da sua igreja. Configure notificações, permissões e preferências.',
    icon: <Settings className="w-8 h-8" />,
    target: '[data-tour="settings"]',
    position: 'right',
  },
  {
    id: 'complete',
    title: 'Pronto para Começar! 🚀',
    description:
      'Você está pronto para usar o 7Care! Se precisar de ajuda, acesse as configurações para ver este tutorial novamente ou entre em contato conosco.',
    icon: <CheckCircle className="w-8 h-8" />,
    position: 'center',
  },
];

export function WelcomeTour({ onComplete, onSkip, userName }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  // Encontrar e destacar o elemento alvo
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // Scroll suave até o elemento se necessário
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [step.target, currentStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [isLastStep]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [isFirstStep]);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onSkip();
    }, 300);
  }, [onSkip]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleSkip]);

  if (!isVisible) return null;

  const getTooltipPosition = () => {
    if (!targetRect || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;
    const tooltipWidth = 400;
    const tooltipHeight = 280;

    switch (step.position) {
      case 'top':
        return {
          top: `${targetRect.top - tooltipHeight - padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - tooltipWidth - padding}px`,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: 'translateY(-50%)',
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  return (
    <div className={`welcome-tour-overlay ${isVisible ? 'visible' : 'hidden'}`}>
      {/* Spotlight mask */}
      {targetRect && (
        <div className="welcome-tour-spotlight">
          <svg width="100%" height="100%" className="spotlight-svg">
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#spotlight-mask)"
              className="spotlight-background"
            />
          </svg>

          {/* Pulsing ring around target */}
          <div
            className="spotlight-ring"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        </div>
      )}

      {/* Dark overlay for center modals */}
      {!targetRect && <div className="welcome-tour-backdrop" />}

      {/* Tooltip card */}
      <div
        className={`welcome-tour-tooltip ${isAnimating ? 'animating' : ''} ${step.position === 'center' ? 'centered' : ''}`}
        style={getTooltipPosition()}
      >
        {/* Close button */}
        <button onClick={handleSkip} className="welcome-tour-close" aria-label="Fechar tutorial">
          <X className="w-5 h-5" />
        </button>

        {/* Progress bar */}
        <div className="welcome-tour-progress">
          <div className="welcome-tour-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {/* Icon */}
        <div className="welcome-tour-icon">{step.icon}</div>

        {/* Content */}
        <div className="welcome-tour-content">
          <h3 className="welcome-tour-title">
            {step.id === 'welcome' && userName
              ? `Bem-vindo ao 7Care, ${userName.split(' ')[0]}! 🎉`
              : step.title}
          </h3>
          <p className="welcome-tour-description">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="welcome-tour-nav">
          <div className="welcome-tour-dots">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`welcome-tour-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                aria-label={`Ir para passo ${index + 1}`}
              />
            ))}
          </div>

          <div className="welcome-tour-buttons">
            {!isFirstStep && (
              <Button variant="ghost" onClick={handlePrev} className="welcome-tour-btn-prev">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
            )}

            {isFirstStep && (
              <Button variant="ghost" onClick={handleSkip} className="welcome-tour-btn-skip">
                Pular tutorial
              </Button>
            )}

            <Button onClick={handleNext} className="welcome-tour-btn-next">
              {isLastStep ? (
                <>
                  Começar!
                  <Sparkles className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step counter */}
        <div className="welcome-tour-counter">
          {currentStep + 1} de {tourSteps.length}
        </div>
      </div>
    </div>
  );
}

export default WelcomeTour;
