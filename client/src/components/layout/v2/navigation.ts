import {
  BarChart3,
  Building2,
  CalendarDays,
  Heart,
  LayoutDashboard,
  Menu,
  MessageSquareHeart,
  NotebookTabs,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { getUserRole, type UserLike } from '@/lib/permissions';

export interface V2NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const getV2NavigationItems = (user: UserLike): V2NavItem[] => {
  const role = getUserRole(user);

  if (role === 'superadmin') {
    return [
      { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Agenda', path: '/calendar', icon: CalendarDays },
      { label: 'Pessoas', path: '/users', icon: Users },
      { label: 'Estrutura', path: '/districts', icon: Building2 },
      { label: 'Menu', path: '/menu', icon: Menu },
    ];
  }

  if (role === 'pastor') {
    return [
      { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Agenda', path: '/calendar', icon: CalendarDays },
      { label: 'Pessoas', path: '/users', icon: Users },
      { label: 'Cuidado', path: '/my-interested', icon: MessageSquareHeart },
      { label: 'Menu', path: '/menu', icon: Menu },
    ];
  }

  if (role === 'missionary') {
    return [
      { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Agenda', path: '/calendar', icon: CalendarDays },
      { label: 'Cuidado', path: '/my-interested', icon: MessageSquareHeart },
      { label: 'Análises', path: '/my-reports', icon: NotebookTabs },
      { label: 'Menu', path: '/menu', icon: Menu },
    ];
  }

  if (role === 'member') {
    return [
      { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Agenda', path: '/calendar', icon: CalendarDays },
      { label: 'Orações', path: '/prayers', icon: Heart },
      { label: 'Jornada', path: '/gamification', icon: Trophy },
      { label: 'Menu', path: '/menu', icon: BarChart3 },
    ];
  }

  return [
    { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Agenda', path: '/calendar', icon: CalendarDays },
    { label: 'Contato', path: '/contact', icon: Heart },
    { label: 'Perfil', path: '/meu-cadastro', icon: Users },
    { label: 'Menu', path: '/menu', icon: BarChart3 },
  ];
};
