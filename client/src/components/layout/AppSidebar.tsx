import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  Settings,
  UserPlus,
  MessageCircle,
  FileText,
  Heart,
  Bell,
  Building2,
  UserCog,
  Mail,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth';

import { useSystemLogo } from '@/hooks/useSystemLogo';

// Navigation items with permissions
const navigationItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'] as UserRole[],
    tourId: 'dashboard',
  },
  {
    title: 'Agenda',
    url: '/calendar',
    icon: Calendar,
    roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'] as UserRole[],
    tourId: 'calendar',
  },
  {
    title: 'Usuários',
    url: '/users',
    icon: Users,
    roles: ['superadmin', 'pastor'] as UserRole[],
    tourId: 'members',
  },
  {
    title: 'Distritos',
    url: '/districts',
    icon: Building2,
    roles: ['superadmin'] as UserRole[],
    tourId: 'districts',
  },
  {
    title: 'Pastores',
    url: '/pastors',
    icon: UserCog,
    roles: ['superadmin'] as UserRole[],
    tourId: 'pastors',
  },
  {
    title: 'Convites',
    url: '/pastor-invites',
    icon: Mail,
    roles: ['superadmin'] as UserRole[],
    tourId: 'invites',
  },
  {
    title: 'Amigos',
    url: '/interested',
    icon: UserPlus,
    roles: ['superadmin', 'pastor', 'missionary'] as UserRole[],
    tourId: 'prayers',
  },
  {
    title: 'Meus Amigos',
    url: '/my-interested',
    icon: Heart,
    roles: ['missionary', 'member'] as UserRole[],
    tourId: 'my-friends',
  },
  {
    title: 'Chat',
    url: '/chat',
    icon: MessageCircle,
    roles: ['superadmin', 'pastor', 'missionary', 'member'] as UserRole[],
    tourId: 'chat',
  },
  {
    title: 'Relatórios',
    url: '/reports',
    icon: BarChart3,
    roles: ['superadmin', 'pastor', 'missionary'] as UserRole[],
    tourId: 'reports',
  },
  {
    title: 'Meus Relatórios',
    url: '/my-reports',
    icon: FileText,
    roles: ['missionary'] as UserRole[],
    tourId: 'my-reports',
  },
  {
    title: 'Configurações',
    url: '/settings',
    icon: Settings,
    roles: ['superadmin', 'pastor'] as UserRole[],
    tourId: 'settings',
  },
  {
    title: 'Aparência',
    url: '/appearance',
    icon: Settings,
    roles: ['superadmin', 'pastor'] as UserRole[],
    tourId: 'appearance',
  },
  {
    title: 'Notificações Push',
    url: '/push',
    icon: Bell,
    roles: ['superadmin', 'pastor'] as UserRole[],
    tourId: 'push',
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;
  const { systemLogo } = useSystemLogo();

  const isCollapsed = state === 'collapsed';

  // Filter items based on user role
  const allowedItems = navigationItems.filter(item => user && item.roles.includes(user.role));

  const getNavClasses = (url: string) => {
    const isActive = currentPath === url;
    return isActive
      ? 'bg-gradient-primary text-primary-foreground font-medium shadow-divine'
      : 'hover:bg-muted/50 text-foreground';
  };

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-64'} collapsible="icon">
      <SidebarContent>
        {/* Logo Section */}
        <div
          className={`flex items-center gap-3 p-4 border-b ${isCollapsed ? 'justify-center' : ''}`}
        >
          {systemLogo && <img src={systemLogo} alt="7care" className="w-10 h-10 object-contain" />}
        </div>

        {/* User Info */}
        {!isCollapsed && user && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role === 'superadmin'
                    ? 'Superadmin'
                    : user.role === 'pastor'
                      ? 'Pastor'
                      : user.role === 'missionary'
                        ? 'Missionário'
                        : user.role === 'member'
                          ? 'Membro'
                          : 'Amigo'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allowedItems.map(item => (
                <SidebarMenuItem key={item.title} data-tour={item.tourId}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClasses(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
