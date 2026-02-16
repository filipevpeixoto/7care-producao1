import { useCallback, useState } from 'react';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AppTour');

export const useAppTour = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);

  // Steps do header (comuns a todas as páginas)
  const getHeaderSteps = useCallback(
    (): DriveStep[] => [
      {
        element: '#tour-logo',
        popover: {
          title: '🏠 Logo do Sistema',
          description: 'Clique aqui para voltar ao Dashboard (página inicial).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-help-button',
        popover: {
          title: '❓ Botão de Ajuda',
          description:
            'Este botão mostra o tour da página atual. Clique sempre que precisar de ajuda!',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-chat-button',
        popover: {
          title: '💬 Chat',
          description: 'Acesse o chat para conversar com membros da sua igreja.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-notifications-button',
        popover: {
          title: '🔔 Notificações',
          description: 'Veja notificações: novos cadastros, mensagens, eventos e mais.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-theme-button',
        popover: {
          title: '🌙 Tema Claro/Escuro',
          description: 'Alterne entre o tema claro e escuro.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-profile-menu',
        popover: {
          title: '👤 Menu do Perfil',
          description: 'Acesse configurações, edite seu cadastro ou faça logout.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
    []
  );

  // Steps de navegação (comuns a todas as páginas)
  const getNavSteps = useCallback((): DriveStep[] => {
    const steps: DriveStep[] = [
      {
        element: '#tour-nav-dashboard',
        popover: {
          title: '📊 Dashboard',
          description: 'Página inicial com resumo de estatísticas.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-calendar',
        popover: {
          title: '📅 Agenda',
          description: 'Visualize e gerencie todos os eventos da igreja.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-users',
        popover: {
          title: '👥 Usuários',
          description: 'Gerencie todos os membros. Aprove cadastros e edite perfis.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-gamification',
        popover: {
          title: '🏆 7Mount',
          description: 'Sistema de pontos e conquistas para engajamento.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-menu',
        popover: {
          title: '⚙️ Menu',
          description: 'Acesse todas as funcionalidades: Relatórios, Orações, Configurações.',
          side: 'top',
          align: 'center',
        },
      },
    ];

    // Adicionar step de admin para superadmin
    if (isSuperAdmin(user)) {
      steps.splice(4, 0, {
        element: '#tour-nav-admin',
        popover: {
          title: '🏛️ Administração',
          description: 'Gerencie Distritos, Pastores e Convites.',
          side: 'top',
          align: 'center',
        },
      });
    }

    return steps;
  }, [user]);

  // Steps específicos de cada página
  const getPageSpecificSteps = useCallback((): DriveStep[] => {
    const path = location.pathname.replace(/\/+$/, '') || '/dashboard';

    const pageSteps: Record<string, DriveStep[]> = {
      '/dashboard': [
        {
          popover: {
            title: '📊 Dashboard - Visão Geral',
            description:
              'Esta é sua página inicial! Veja um resumo da sua igreja: membros, eventos, estatísticas.',
          },
        },
      ],
      '/users': [
        {
          popover: {
            title: '👥 Página de Usuários',
            description:
              'Gerencie todos os membros da sua igreja. Aprove novos cadastros, edite informações e acompanhe cada pessoa.',
          },
        },
        {
          element: '[data-tour="users-search"]',
          popover: {
            title: '🔍 Buscar Usuários',
            description: 'Use a busca para encontrar membros pelo nome, email ou função.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="users-filters"]',
          popover: {
            title: '🎯 Filtros',
            description: 'Filtre usuários por status ou função.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
      '/calendar': [
        {
          popover: {
            title: '📅 Agenda da Igreja',
            description:
              'Visualize e gerencie todos os eventos: cultos, estudos bíblicos, visitas e reuniões.',
          },
        },
        {
          element: '[data-tour="calendar-add"]',
          popover: {
            title: '➕ Novo Evento',
            description: 'Clique aqui para criar um novo evento.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
      '/gamification': [
        {
          popover: {
            title: '🏆 7Mount - Gamificação',
            description:
              'Sistema de pontos que incentiva a participação. Cada atividade gera pontos e conquistas!',
          },
        },
        {
          element: '[data-tour="gamification-ranking"]',
          popover: {
            title: '🥇 Ranking',
            description: 'Veja os membros mais engajados da igreja.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
      '/chat': [
        {
          popover: {
            title: '💬 Chat',
            description:
              'Converse com membros da sua igreja, tire dúvidas e acompanhe os interessados.',
          },
        },
        {
          element: '[data-tour="chat-contacts"]',
          popover: {
            title: '👥 Contatos',
            description: 'Lista de contatos. Clique em um para abrir o chat.',
            side: 'right',
            align: 'start',
          },
        },
      ],
      '/tasks': [
        {
          popover: {
            title: '✅ Tarefas',
            description: 'Gerencie suas tarefas e atividades pendentes.',
          },
        },
      ],
      '/settings': [
        {
          popover: {
            title: '⚙️ Configurações',
            description: 'Configure o sistema: pontuações, notificações e preferências.',
          },
        },
      ],
      '/reports': [
        {
          popover: {
            title: '📈 Relatórios',
            description: 'Visualize relatórios: frequência, crescimento e engajamento.',
          },
        },
      ],
      '/prayers': [
        {
          popover: {
            title: '🙏 Pedidos de Oração',
            description: 'Veja e gerencie os pedidos de oração da comunidade.',
          },
        },
      ],
      '/discipleship': [
        {
          popover: {
            title: '📖 Discipulado',
            description: 'Gerencie os relacionamentos de discipulado.',
          },
        },
      ],
      '/election': [
        {
          popover: {
            title: '🗳️ Eleições e Nomeações',
            description: 'Configure e gerencie eleições para cargos na igreja.',
          },
        },
      ],
      '/visits': [
        {
          popover: {
            title: '🏠 Visitação',
            description: 'Organize visitas aos membros e interessados.',
          },
        },
      ],
      '/my-interested': [
        {
          popover: {
            title: '👥 Meus Interessados',
            description: 'Veja e gerencie os interessados sob sua responsabilidade.',
          },
        },
      ],
    };

    // Buscar steps da página exata ou por prefixo
    if (pageSteps[path]) {
      return pageSteps[path];
    }

    for (const [route, steps] of Object.entries(pageSteps)) {
      if (path.startsWith(route)) {
        return steps;
      }
    }

    // Tour genérico para páginas sem tour específico
    return [
      {
        popover: {
          title: '📱 Navegando no App',
          description:
            'Use o menu inferior para navegar. Clique no ? para obter ajuda sobre qualquer página.',
        },
      },
    ];
  }, [location.pathname]);

  const startTour = useCallback(() => {
    setIsRunning(true);

    // Montar tour: Header + Página Específica + Navegação
    const headerSteps = getHeaderSteps();
    const pageSteps = getPageSpecificSteps();
    const navSteps = getNavSteps();

    const allSteps = [...headerSteps, ...pageSteps, ...navSteps];

    // Filtrar apenas steps com elementos que existem
    const validSteps = allSteps.filter(step => {
      if (!step.element) return true;
      const el = document.querySelector(step.element as string);
      return el !== null;
    });

    if (validSteps.length === 0) {
      logger.warn('Nenhum elemento do tour encontrado');
      setIsRunning(false);
      return;
    }

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'] as ("next" | "previous" | "close")[],
      steps: validSteps as DriveStep[],
      nextBtnText: 'Próximo →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Finalizar ✓',
      progressText: '{{current}} de {{total}}',
      popoverClass: 'driverjs-theme',
      onDestroyStarted: () => {
        setIsRunning(false);
        driverObj.destroy();
      },
      onDestroyed: () => {
        setIsRunning(false);
      },
    } as Parameters<typeof driver>[0]);

    driverObj.drive();
  }, [getHeaderSteps, getPageSpecificSteps, getNavSteps]);

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
