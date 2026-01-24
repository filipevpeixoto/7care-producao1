/**
 * Animações e Micro-interações
 * Classes CSS e configurações de animação para o 7care
 */

import { usePrefersReducedMotion } from './accessibility';

/**
 * Variantes de animação para framer-motion style
 */
export const animations = {
  // Fade In/Out
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  
  // Slide Up
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // Slide Down
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // Scale
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 }
  },
  
  // Stagger Children
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  },
  
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  }
};

/**
 * Classes CSS de animação reutilizáveis
 */
export const animationClasses = {
  // Transições base
  transition: 'transition-all duration-200 ease-in-out',
  transitionFast: 'transition-all duration-150 ease-in-out',
  transitionSlow: 'transition-all duration-300 ease-in-out',
  
  // Hover effects
  hoverScale: 'hover:scale-105 active:scale-95 transition-transform duration-200',
  hoverLift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
  hoverGlow: 'hover:shadow-lg hover:shadow-blue-500/20 transition-shadow duration-200',
  
  // Focus effects
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  
  // Card hover
  cardHover: 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out',
  cardActive: 'active:scale-[0.98] transition-transform duration-100',
  
  // Button press
  buttonPress: 'active:scale-95 transition-transform duration-100',
  
  // Loading states
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  
  // Skeleton shimmer
  shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
};

/**
 * Keyframes customizados (adicionar ao tailwind.config.ts)
 */
export const customKeyframes = {
  shimmer: {
    '100%': { transform: 'translateX(100%)' }
  },
  fadeInUp: {
    from: { opacity: '0', transform: 'translateY(10px)' },
    to: { opacity: '1', transform: 'translateY(0)' }
  },
  fadeInDown: {
    from: { opacity: '0', transform: 'translateY(-10px)' },
    to: { opacity: '1', transform: 'translateY(0)' }
  },
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' }
  },
  slideInRight: {
    from: { opacity: '0', transform: 'translateX(20px)' },
    to: { opacity: '1', transform: 'translateX(0)' }
  },
  slideInLeft: {
    from: { opacity: '0', transform: 'translateX(-20px)' },
    to: { opacity: '1', transform: 'translateX(0)' }
  },
  wiggle: {
    '0%, 100%': { transform: 'rotate(-3deg)' },
    '50%': { transform: 'rotate(3deg)' }
  },
  heartbeat: {
    '0%, 100%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' }
  }
};

/**
 * Hook para obter classes de animação respeitando preferências do usuário
 */
export function useAnimationClasses() {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  // Se o usuário prefere movimento reduzido, retornar classes vazias
  if (prefersReducedMotion) {
    return {
      transition: '',
      hoverScale: '',
      hoverLift: '',
      cardHover: '',
      buttonPress: '',
      fadeIn: '',
      slideUp: '',
    };
  }
  
  return animationClasses;
}

/**
 * Componente de wrapper com animação de entrada
 */
export function AnimatedContainer({ 
  children, 
  animation = 'fadeIn',
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scale';
  delay?: number;
  className?: string;
}) {
  const animationMap = {
    fadeIn: 'animate-[fadeInUp_0.3s_ease-out_forwards]',
    slideUp: 'animate-[fadeInUp_0.3s_ease-out_forwards]',
    slideDown: 'animate-[fadeInDown_0.3s_ease-out_forwards]',
    scale: 'animate-[scaleIn_0.2s_ease-out_forwards]',
  };
  
  return (
    <div 
      className={`opacity-0 ${animationMap[animation]} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Componente de lista com animação stagger
 */
export function StaggeredList({
  children,
  className = '',
  staggerDelay = 50
}: {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]"
          style={{ animationDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Micro-interações para feedback visual
 */
export const microInteractions = {
  // Sucesso - pequeno bounce
  success: 'animate-[heartbeat_0.3s_ease-in-out]',
  
  // Erro - shake
  error: 'animate-[wiggle_0.3s_ease-in-out]',
  
  // Carregando - pulse
  loading: 'animate-pulse',
  
  // Notificação - bounce
  notification: 'animate-bounce',
  
  // Hover glow em cards
  cardGlow: 'transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10',
  
  // Badge counter update
  badgeUpdate: 'animate-[scaleIn_0.2s_ease-out]',
};

/**
 * Duração de transições em ms
 */
export const transitionDurations = {
  instant: 0,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
};

/**
 * Easing functions
 */
export const easings = {
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

export default {
  animations,
  animationClasses,
  customKeyframes,
  microInteractions,
  transitionDurations,
  easings,
  useAnimationClasses,
  AnimatedContainer,
  StaggeredList,
};
