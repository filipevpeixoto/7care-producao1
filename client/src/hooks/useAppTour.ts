import { useCallback, useState } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { hasAdminAccess, isSuperAdmin, isPastor } from '@/lib/permissions';

// Passos do tour para pastores
const getPastorTourSteps = (): DriveStep[] => [
  {
    element: '#tour-logo',
    popover: {
      title: '🏠 Logo do Sistema',
      description: 'Clique aqui a qualquer momento para voltar ao Dashboard (página inicial).',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-welcome',
    popover: {
      title: '👋 Boas-vindas',
      description: 'Aqui você vê a saudação personalizada e o nome de quem está logado.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-chat-button',
    popover: {
      title: '💬 Chat',
      description:
        'Acesse o chat para conversar com membros da sua igreja. Você pode enviar mensagens, tirar dúvidas e acompanhar os interessados.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-notifications-button',
    popover: {
      title: '🔔 Notificações',
      description:
        'Veja todas as notificações do sistema: novos cadastros pendentes, mensagens, eventos e mais.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-theme-button',
    popover: {
      title: '🌙 Tema Claro/Escuro',
      description: 'Alterne entre o tema claro e escuro conforme sua preferência.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-profile-menu',
    popover: {
      title: '👤 Menu do Perfil',
      description:
        'Acesse configurações, edite seu cadastro ou faça logout do sistema clicando aqui.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '#tour-nav-dashboard',
    popover: {
      title: '📊 Dashboard',
      description:
        'Página inicial com resumo de estatísticas: membros ativos, interessados, eventos próximos e muito mais.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-calendar',
    popover: {
      title: '📅 Agenda',
      description:
        'Visualize e gerencie todos os eventos da igreja: cultos, estudos bíblicos, reuniões e visitas.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-users',
    popover: {
      title: '👥 Usuários',
      description:
        'Gerencie todos os membros da sua igreja. Aprove novos cadastros, edite perfis e acompanhe a situação de cada membro.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-gamification',
    popover: {
      title: '🏆 7Mount - Gamificação',
      description:
        'Sistema de pontos e conquistas para motivar o engajamento dos membros. Veja rankings e recompensas.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-menu',
    popover: {
      title: '⚙️ Menu',
      description:
        'Acesse todas as funcionalidades: Relatórios, Orações, Nomeações/Eleições, Configurações e muito mais.',
      side: 'top',
      align: 'center',
    },
  },
];

// Passos do tour para superadmin
const getSuperAdminTourSteps = (): DriveStep[] => [
  {
    element: '#tour-logo',
    popover: {
      title: '🏠 Logo do Sistema',
      description: 'Clique aqui a qualquer momento para voltar ao Dashboard (página inicial).',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-welcome',
    popover: {
      title: '👋 Boas-vindas',
      description: 'Aqui você vê a saudação personalizada e o nome de quem está logado.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-chat-button',
    popover: {
      title: '💬 Chat',
      description: 'Acesse o chat para conversar com pastores e administradores do sistema.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-notifications-button',
    popover: {
      title: '🔔 Notificações',
      description: 'Veja todas as notificações: novos distritos, pastores pendentes e alertas.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-profile-menu',
    popover: {
      title: '👤 Menu do Perfil',
      description: 'Acesse configurações ou faça logout.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '#tour-nav-dashboard',
    popover: {
      title: '📊 Dashboard',
      description:
        'Visão geral do sistema: total de distritos, igrejas, membros e estatísticas gerais.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-calendar',
    popover: {
      title: '📅 Agenda',
      description: 'Visualize eventos de todos os distritos e igrejas.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-users',
    popover: {
      title: '👥 Usuários',
      description: 'Gerencie todos os usuários do sistema, incluindo pastores e administradores.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-admin',
    popover: {
      title: '🏛️ Administração',
      description:
        'Gerencie Distritos, Pastores e Convites. Aqui você configura toda a estrutura organizacional.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-menu',
    popover: {
      title: '⚙️ Menu',
      description: 'Acesse configurações avançadas, relatórios globais e mais funcionalidades.',
      side: 'top',
      align: 'center',
    },
  },
];

// Passos do tour para membros/missionários
const getMemberTourSteps = (): DriveStep[] => [
  {
    element: '#tour-logo',
    popover: {
      title: '🏠 Logo do Sistema',
      description: 'Clique aqui para voltar ao Dashboard.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-chat-button',
    popover: {
      title: '💬 Chat',
      description: 'Converse com outros membros e líderes da igreja.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-notifications-button',
    popover: {
      title: '🔔 Notificações',
      description: 'Veja avisos de eventos, mensagens e lembretes.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-dashboard',
    popover: {
      title: '📊 Início',
      description: 'Veja seu progresso, pontos conquistados e próximos eventos.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-calendar',
    popover: {
      title: '📅 Agenda',
      description: 'Veja todos os eventos da igreja e confirme sua presença.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-gamification',
    popover: {
      title: '🏆 7Mount',
      description: 'Acompanhe seus pontos, conquistas e veja o ranking dos membros.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-nav-menu',
    popover: {
      title: '⚙️ Menu',
      description: 'Acesse orações, seu perfil e outras funcionalidades.',
      side: 'top',
      align: 'center',
    },
  },
];

export const useAppTour = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);

  const getTourSteps = useCallback(() => {
    if (isSuperAdmin(user)) {
      return getSuperAdminTourSteps();
    }
    if (isPastor(user) || hasAdminAccess(user)) {
      return getPastorTourSteps();
    }
    return getMemberTourSteps();
  }, [user]);

  const startTour = useCallback(() => {
    // Garantir que estamos no dashboard antes de iniciar
    if (window.location.pathname !== '/dashboard') {
      navigate('/dashboard');
      // Aguardar navegação
      setTimeout(() => {
        initTour();
      }, 500);
    } else {
      initTour();
    }
  }, [navigate]);

  const initTour = useCallback(() => {
    setIsRunning(true);

    const steps = getTourSteps();

    // Filtrar apenas steps com elementos que existem
    const validSteps = steps.filter(step => {
      if (!step.element) return true;
      const el = document.querySelector(step.element);
      return el !== null;
    });

    if (validSteps.length === 0) {
      console.warn('Nenhum elemento do tour encontrado');
      setIsRunning(false);
      return;
    }

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: validSteps,
      nextBtnText: 'Próximo →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Finalizar ✓',
      progressText: '{{current}} de {{total}}',
      popoverClass: 'driverjs-theme',
      onDestroyStarted: () => {
        setIsRunning(false);
        // Marcar tour como completado
        localStorage.setItem('tutorial_completed', 'true');
        driverObj.destroy();
      },
      onDestroyed: () => {
        setIsRunning(false);
      },
    });

    driverObj.drive();
  }, [getTourSteps]);

  const skipTour = useCallback(() => {
    localStorage.setItem('tutorial_skipped', 'true');
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem('tutorial_completed');
    localStorage.removeItem('tutorial_skipped');
  }, []);

  const isTourCompleted = useCallback(() => {
    return (
      localStorage.getItem('tutorial_completed') === 'true' ||
      localStorage.getItem('tutorial_skipped') === 'true'
    );
  }, []);

  return {
    startTour,
    skipTour,
    resetTour,
    isRunning,
    isTourCompleted,
  };
};
