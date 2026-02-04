import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { isSuperAdmin, isPastor, hasAdminAccess } from '@/lib/permissions';
import {
  LucideIcon,
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  MessageCircle,
  Settings,
  Heart,
  Search,
  Filter,
  UserPlus,
  CalendarPlus,
  Award,
  Bell,
  Building2,
  Mail,
  Vote,
  BarChart3,
  CheckCircle,
  PlusCircle,
  CircleUser,
  Crown,
} from 'lucide-react';

/**
 * Tipo de ação que o item do índice pode executar
 */
export type HelpActionType = 'scroll' | 'navigate' | 'highlight' | 'info';

/**
 * Item de funcionalidade do índice de ajuda
 */
export interface HelpItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action: HelpActionType;
  target: string; // elementId para scroll/highlight ou rota para navigate
  roles?: string[]; // Roles que podem ver este item (undefined = todos)
  badge?: string; // Badge opcional (ex: "Novo", "Admin")
}

/**
 * Conteúdo de ajuda de uma página
 */
export interface PageHelpContent {
  pageTitle: string;
  pageDescription: string;
  pageIcon: LucideIcon;
  items: HelpItem[];
}

/**
 * Definição de todas as páginas e suas funcionalidades
 */
const PAGE_HELP_MAP: Record<string, PageHelpContent> = {
  '/dashboard': {
    pageTitle: 'Dashboard',
    pageDescription: 'Visão geral da sua igreja com estatísticas e atalhos rápidos.',
    pageIcon: LayoutDashboard,
    items: [
      {
        id: 'nav-users',
        icon: Users,
        title: 'Ver Membros',
        description: 'Gerencie todos os membros da igreja',
        action: 'navigate',
        target: '/users',
      },
      {
        id: 'nav-calendar',
        icon: Calendar,
        title: 'Ver Agenda',
        description: 'Confira e crie eventos',
        action: 'navigate',
        target: '/calendar',
      },
      {
        id: 'nav-gamification',
        icon: Trophy,
        title: 'Meu Progresso 7Mount',
        description: 'Acompanhe seus pontos e conquistas',
        action: 'navigate',
        target: '/gamification',
      },
      {
        id: 'nav-chat',
        icon: MessageCircle,
        title: 'Abrir Chat',
        description: 'Converse com os membros',
        action: 'navigate',
        target: '/chat',
      },
      {
        id: 'nav-prayers',
        icon: Heart,
        title: 'Pedidos de Oração',
        description: 'Veja e faça pedidos de oração',
        action: 'navigate',
        target: '/prayers',
      },
      {
        id: 'nav-reports',
        icon: BarChart3,
        title: 'Ver Relatórios',
        description: 'Métricas e estatísticas da igreja',
        action: 'navigate',
        target: '/reports',
        roles: ['superadmin', 'pastor'],
        badge: 'Admin',
      },
    ],
  },

  '/users': {
    pageTitle: 'Gestão de Usuários',
    pageDescription: 'Gerencie todos os membros, aprove cadastros e edite informações.',
    pageIcon: Users,
    items: [
      {
        id: 'search',
        icon: Search,
        title: 'Buscar Usuário',
        description: 'Encontre membros pelo nome ou email',
        action: 'scroll',
        target: 'input[placeholder*="Buscar"], input[type="search"], [data-tour="users-search"]',
      },
      {
        id: 'filters',
        icon: Filter,
        title: 'Filtrar por Status/Função',
        description: 'Filtre por ativos, pendentes ou função',
        action: 'scroll',
        target: '[role="combobox"], select, [data-tour="users-filters"]',
      },
      {
        id: 'add-user',
        icon: UserPlus,
        title: 'Adicionar Novo Usuário',
        description: 'Cadastre um membro manualmente',
        action: 'scroll',
        target: 'button:has-text("Novo"), button:has-text("Adicionar"), [data-help="add-user"]',
        roles: ['superadmin', 'pastor'],
      },
      {
        id: 'nav-interested',
        icon: Heart,
        title: 'Ver Interessados',
        description: 'Gerencie os interessados da igreja',
        action: 'navigate',
        target: '/interested',
      },
      {
        id: 'nav-my-interested',
        icon: Users,
        title: 'Meus Interessados',
        description: 'Veja os interessados que você acompanha',
        action: 'navigate',
        target: '/my-interested',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/calendar': {
    pageTitle: 'Agenda de Eventos',
    pageDescription: 'Visualize e gerencie todos os eventos da igreja.',
    pageIcon: Calendar,
    items: [
      {
        id: 'create-event',
        icon: CalendarPlus,
        title: 'Criar Novo Evento',
        description: 'Adicione culto, estudo ou reunião',
        action: 'scroll',
        target: 'button:has-text("Novo"), button:has-text("Criar"), [data-tour="calendar-add"]',
        roles: ['superadmin', 'pastor', 'missionary'],
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Ver estatísticas e resumo',
        action: 'navigate',
        target: '/dashboard',
      },
      {
        id: 'nav-tasks',
        icon: CheckCircle,
        title: 'Ver Tarefas',
        description: 'Gerenciar minhas tarefas',
        action: 'navigate',
        target: '/tasks',
      },
      {
        id: 'nav-prayers',
        icon: Heart,
        title: 'Pedidos de Oração',
        description: 'Ver pedidos da comunidade',
        action: 'navigate',
        target: '/prayers',
      },
    ],
  },

  '/gamification': {
    pageTitle: '7Mount - Gamificação',
    pageDescription: 'Sistema de pontos e conquistas que incentiva a participação.',
    pageIcon: Trophy,
    items: [
      {
        id: 'ranking',
        icon: Award,
        title: 'Ver Ranking',
        description: 'Veja os membros mais engajados',
        action: 'scroll',
        target: '[data-tour="gamification-ranking"], .ranking, table',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Ver seu progresso no dashboard',
        action: 'navigate',
        target: '/dashboard',
      },
      {
        id: 'nav-tasks',
        icon: CheckCircle,
        title: 'Completar Tarefas',
        description: 'Ganhe pontos completando tarefas',
        action: 'navigate',
        target: '/tasks',
      },
      {
        id: 'config-points',
        icon: Settings,
        title: 'Configurar Pontuações',
        description: 'Ajuste valores dos pontos',
        action: 'navigate',
        target: '/settings',
        roles: ['superadmin', 'pastor'],
        badge: 'Admin',
      },
    ],
  },

  '/chat': {
    pageTitle: 'Chat',
    pageDescription: 'Converse com membros da sua igreja em tempo real.',
    pageIcon: MessageCircle,
    items: [
      {
        id: 'contacts',
        icon: Users,
        title: 'Lista de Contatos',
        description: 'Veja todos os membros para conversar',
        action: 'scroll',
        target: '[data-tour="chat-contacts"], .contacts-list, aside',
      },
      {
        id: 'search-chat',
        icon: Search,
        title: 'Buscar Conversa',
        description: 'Encontre um contato específico',
        action: 'scroll',
        target: 'input[placeholder*="Buscar"], input[type="search"]',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/prayers': {
    pageTitle: 'Pedidos de Oração',
    pageDescription: 'Veja e gerencie os pedidos de oração da comunidade.',
    pageIcon: Heart,
    items: [
      {
        id: 'new-prayer',
        icon: PlusCircle,
        title: 'Novo Pedido de Oração',
        description: 'Faça um pedido para a comunidade',
        action: 'scroll',
        target: 'button:has-text("Novo"), button:has-text("Adicionar"), textarea',
      },
      {
        id: 'nav-chat',
        icon: MessageCircle,
        title: 'Ir para Chat',
        description: 'Converse com os membros',
        action: 'navigate',
        target: '/chat',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/tasks': {
    pageTitle: 'Tarefas',
    pageDescription: 'Gerencie suas tarefas e atividades pendentes.',
    pageIcon: CheckCircle,
    items: [
      {
        id: 'new-task',
        icon: PlusCircle,
        title: 'Nova Tarefa',
        description: 'Adicione uma nova tarefa',
        action: 'scroll',
        target: 'button:has-text("Nova"), button:has-text("Adicionar")',
      },
      {
        id: 'nav-calendar',
        icon: Calendar,
        title: 'Ver Agenda',
        description: 'Confira os eventos',
        action: 'navigate',
        target: '/calendar',
      },
      {
        id: 'nav-gamification',
        icon: Trophy,
        title: 'Ver Pontuação',
        description: 'Ganhe pontos completando tarefas',
        action: 'navigate',
        target: '/gamification',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/settings': {
    pageTitle: 'Configurações',
    pageDescription: 'Configure preferências do sistema e sua conta.',
    pageIcon: Settings,
    items: [
      {
        id: 'profile',
        icon: CircleUser,
        title: 'Meu Perfil',
        description: 'Edite suas informações pessoais',
        action: 'navigate',
        target: '/meu-cadastro',
      },
      {
        id: 'nav-notifications',
        icon: Bell,
        title: 'Ver Notificações',
        description: 'Histórico de notificações',
        action: 'navigate',
        target: '/notifications',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/reports': {
    pageTitle: 'Relatórios',
    pageDescription: 'Visualize métricas e estatísticas da igreja.',
    pageIcon: BarChart3,
    items: [
      {
        id: 'nav-users',
        icon: Users,
        title: 'Ver Usuários',
        description: 'Gerencie os membros',
        action: 'navigate',
        target: '/users',
      },
      {
        id: 'nav-gamification',
        icon: Trophy,
        title: 'Ver Gamificação',
        description: 'Ranking e pontuações',
        action: 'navigate',
        target: '/gamification',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/my-interested': {
    pageTitle: 'Meus Interessados',
    pageDescription: 'Gerencie os interessados sob sua responsabilidade.',
    pageIcon: Heart,
    items: [
      {
        id: 'add-interested',
        icon: UserPlus,
        title: 'Adicionar Interessado',
        description: 'Cadastre um novo interessado',
        action: 'scroll',
        target: 'button:has-text("Novo"), button:has-text("Adicionar")',
      },
      {
        id: 'nav-interested',
        icon: Users,
        title: 'Todos os Interessados',
        description: 'Ver lista completa',
        action: 'navigate',
        target: '/interested',
      },
      {
        id: 'nav-chat',
        icon: MessageCircle,
        title: 'Ir para Chat',
        description: 'Converse com os interessados',
        action: 'navigate',
        target: '/chat',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/interested': {
    pageTitle: 'Interessados',
    pageDescription: 'Veja todos os interessados da igreja.',
    pageIcon: Heart,
    items: [
      {
        id: 'search-interested',
        icon: Search,
        title: 'Buscar Interessado',
        description: 'Encontre por nome ou contato',
        action: 'scroll',
        target: 'input[placeholder*="Buscar"], input[type="search"]',
      },
      {
        id: 'nav-my-interested',
        icon: Users,
        title: 'Meus Interessados',
        description: 'Ver apenas os meus',
        action: 'navigate',
        target: '/my-interested',
      },
      {
        id: 'nav-users',
        icon: Users,
        title: 'Ver Membros',
        description: 'Gerencie os membros',
        action: 'navigate',
        target: '/users',
        roles: ['superadmin', 'pastor'],
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/elections': {
    pageTitle: 'Eleições e Nomeações',
    pageDescription: 'Configure e gerencie eleições para cargos na igreja.',
    pageIcon: Vote,
    items: [
      {
        id: 'create-election',
        icon: PlusCircle,
        title: 'Criar Eleição',
        description: 'Configure uma nova eleição',
        action: 'navigate',
        target: '/election-config',
        roles: ['superadmin', 'pastor'],
        badge: 'Admin',
      },
      {
        id: 'results',
        icon: BarChart3,
        title: 'Ver Resultados',
        description: 'Resultados das eleições',
        action: 'navigate',
        target: '/election-results',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/districts': {
    pageTitle: 'Gestão de Distritos',
    pageDescription: 'Gerencie distritos e suas configurações.',
    pageIcon: Building2,
    items: [
      {
        id: 'nav-pastors',
        icon: Crown,
        title: 'Ver Pastores',
        description: 'Gestão de pastores',
        action: 'navigate',
        target: '/pastors',
      },
      {
        id: 'nav-users',
        icon: Users,
        title: 'Ver Membros',
        description: 'Gestão de usuários',
        action: 'navigate',
        target: '/users',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/pastors': {
    pageTitle: 'Gestão de Pastores',
    pageDescription: 'Gerencie pastores e seus acessos.',
    pageIcon: Crown,
    items: [
      {
        id: 'invite-pastor',
        icon: Mail,
        title: 'Convidar Pastor',
        description: 'Envie convite para novo pastor',
        action: 'navigate',
        target: '/pastor-invites',
      },
      {
        id: 'nav-districts',
        icon: Building2,
        title: 'Ver Distritos',
        description: 'Gestão de distritos',
        action: 'navigate',
        target: '/districts',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/pastor-invites': {
    pageTitle: 'Convites para Pastores',
    pageDescription: 'Gerencie convites enviados para novos pastores.',
    pageIcon: Mail,
    items: [
      {
        id: 'nav-pastors',
        icon: Crown,
        title: 'Ver Pastores',
        description: 'Lista de pastores',
        action: 'navigate',
        target: '/pastors',
      },
      {
        id: 'nav-districts',
        icon: Building2,
        title: 'Ver Distritos',
        description: 'Gestão de distritos',
        action: 'navigate',
        target: '/districts',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/meu-cadastro': {
    pageTitle: 'Meu Cadastro',
    pageDescription: 'Edite suas informações pessoais e foto de perfil.',
    pageIcon: CircleUser,
    items: [
      {
        id: 'nav-settings',
        icon: Settings,
        title: 'Configurações',
        description: 'Preferências do sistema',
        action: 'navigate',
        target: '/settings',
      },
      {
        id: 'nav-notifications',
        icon: Bell,
        title: 'Notificações',
        description: 'Ver notificações',
        action: 'navigate',
        target: '/notifications',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/notifications': {
    pageTitle: 'Histórico de Notificações',
    pageDescription: 'Veja todas as notificações recebidas.',
    pageIcon: Bell,
    items: [
      {
        id: 'config-notifications',
        icon: Settings,
        title: 'Configurar Notificações',
        description: 'Escolha o que receber',
        action: 'navigate',
        target: '/settings',
      },
      {
        id: 'nav-meu-cadastro',
        icon: CircleUser,
        title: 'Meu Cadastro',
        description: 'Editar perfil',
        action: 'navigate',
        target: '/meu-cadastro',
      },
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Voltar ao Dashboard',
        description: 'Retornar à página inicial',
        action: 'navigate',
        target: '/dashboard',
      },
    ],
  },

  '/menu': {
    pageTitle: 'Menu Principal',
    pageDescription: 'Acesse todas as funcionalidades do aplicativo.',
    pageIcon: Settings,
    items: [
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        title: 'Dashboard',
        description: 'Página inicial com resumo',
        action: 'navigate',
        target: '/dashboard',
      },
      {
        id: 'nav-users',
        icon: Users,
        title: 'Usuários',
        description: 'Gerenciar membros',
        action: 'navigate',
        target: '/users',
        roles: ['superadmin', 'pastor'],
      },
      {
        id: 'nav-calendar',
        icon: Calendar,
        title: 'Agenda',
        description: 'Eventos da igreja',
        action: 'navigate',
        target: '/calendar',
      },
      {
        id: 'nav-gamification',
        icon: Trophy,
        title: '7Mount',
        description: 'Pontos e conquistas',
        action: 'navigate',
        target: '/gamification',
      },
      {
        id: 'nav-prayers',
        icon: Heart,
        title: 'Pedidos de Oração',
        description: 'Orar pela comunidade',
        action: 'navigate',
        target: '/prayers',
      },
      {
        id: 'nav-chat',
        icon: MessageCircle,
        title: 'Chat',
        description: 'Conversar com membros',
        action: 'navigate',
        target: '/chat',
      },
      {
        id: 'nav-reports',
        icon: BarChart3,
        title: 'Relatórios',
        description: 'Métricas e estatísticas',
        action: 'navigate',
        target: '/reports',
        roles: ['superadmin', 'pastor'],
      },
      {
        id: 'nav-settings',
        icon: Settings,
        title: 'Configurações',
        description: 'Preferências do sistema',
        action: 'navigate',
        target: '/settings',
      },
    ],
  },
};

/**
 * Conteúdo padrão para páginas não mapeadas
 */
const DEFAULT_PAGE_HELP: PageHelpContent = {
  pageTitle: 'Página',
  pageDescription: 'Explore as funcionalidades disponíveis.',
  pageIcon: LayoutDashboard,
  items: [
    {
      id: 'nav-dashboard',
      icon: LayoutDashboard,
      title: 'Voltar ao Dashboard',
      description: 'Ir para a página inicial',
      action: 'navigate',
      target: '/dashboard',
    },
    {
      id: 'nav-menu',
      icon: Settings,
      title: 'Abrir Menu',
      description: 'Ver todas as opções',
      action: 'navigate',
      target: '/menu',
    },
  ],
};

/**
 * Hook que retorna o conteúdo de ajuda contextual baseado na rota atual e role do usuário
 */
export function usePageHelp() {
  const location = useLocation();
  const { user } = useAuth();

  const pageHelp = useMemo((): PageHelpContent => {
    // Normalizar path removendo trailing slash
    const path = location.pathname.replace(/\/+$/, '') || '/dashboard';

    // Buscar conteúdo exato ou por prefixo
    let content = PAGE_HELP_MAP[path];

    if (!content) {
      // Tentar match por prefixo
      for (const [route, helpContent] of Object.entries(PAGE_HELP_MAP)) {
        if (path.startsWith(route) && route !== '/') {
          content = helpContent;
          break;
        }
      }
    }

    // Se ainda não encontrou, usar default
    if (!content) {
      content = DEFAULT_PAGE_HELP;
    }

    // Filtrar itens baseado no role do usuário
    const userRole = user?.role || 'member';
    const filteredItems = content.items.filter(item => {
      // Se não tem restrição de roles, mostrar para todos
      if (!item.roles) return true;
      // Verificar se o role do usuário está na lista permitida
      return item.roles.includes(userRole);
    });

    return {
      ...content,
      items: filteredItems,
    };
  }, [location.pathname, user?.role]);

  /**
   * Executa a ação de um item do índice
   */
  const executeAction = (item: HelpItem, navigate: (path: string) => void): boolean => {
    switch (item.action) {
      case 'navigate':
        navigate(item.target);
        return true; // Fechar modal

      case 'scroll':
      case 'highlight':
        // Tentar encontrar o elemento pelo seletor
        let element = document.querySelector(item.target);

        // Se não encontrou, tentar por ID simples
        if (!element && item.target.startsWith('[data-')) {
          // Extrair o valor do data attribute e tentar como ID
          const match = item.target.match(/\[data-\w+="(.+?)"\]/);
          if (match) {
            element = document.getElementById(match[1]);
          }
        }

        // Se ainda não encontrou, tentar buscar pelo texto do título
        if (!element) {
          // Buscar por texto visível na página
          const allElements = document.querySelectorAll('h1, h2, h3, h4, button, [role="button"]');
          for (const el of allElements) {
            if (el.textContent?.toLowerCase().includes(item.title.toLowerCase().split(' ')[0])) {
              element = el;
              break;
            }
          }
        }

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Adicionar destaque temporário
          element.classList.add('help-highlight');
          setTimeout(() => {
            element?.classList.remove('help-highlight');
          }, 3000);
          return true; // Fechar modal
        } else {
          // Elemento não encontrado - mostrar toast informativo
          console.log(`[PageHelp] Elemento não encontrado: ${item.target}`);
          // Retornar true mesmo assim para fechar o modal
          // O usuário verá que a funcionalidade existe mas o elemento específico não está visível
          return true;
        }

      case 'info':
        // Apenas informativo, não faz nada
        return false; // Não fechar modal

      default:
        return false;
    }
  };

  return {
    pageHelp,
    executeAction,
    userRole: user?.role,
    isAdmin: hasAdminAccess(user),
    isSuperAdmin: isSuperAdmin(user),
    isPastor: isPastor(user),
  };
}
