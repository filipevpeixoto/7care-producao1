import React, { useEffect } from 'react';
import {
  Users,
  CheckSquare,
  Settings,
  Heart,
  FileText,
  UserPlus,
  Phone,
  LogOut,
  User,
  Bell,
  Vote,
  Eye,
  Building2,
  UserCog,
  BarChart3,
  Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { getRoleDisplayName } from '@/lib/permissions';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Menu = () => {
  const { user, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logout realizado',
      description: 'Você foi desconectado com sucesso',
    });
    navigate('/');
  };

  const menuItems: Record<
    string,
    {
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      path: string;
      color: string;
      description: string;
    }[]
  > = {
    superadmin: [
      {
        title: 'Distritos',
        icon: Building2,
        path: '/districts',
        color: 'bg-emerald-500',
        description: 'Gerenciar distritos',
      },
      {
        title: 'Pastores',
        icon: UserCog,
        path: '/pastors',
        color: 'bg-amber-500',
        description: 'Gerenciar pastores',
      },
      {
        title: 'Convites',
        icon: Mail,
        path: '/pastor-invites',
        color: 'bg-teal-500',
        description: 'Convites de pastores',
      },
      {
        title: 'Usuários',
        icon: Users,
        path: '/users',
        color: 'bg-blue-500',
        description: 'Gerenciar membros',
      },
      {
        title: 'Interessados',
        icon: UserPlus,
        path: '/my-interested',
        color: 'bg-green-500',
        description: 'Novos contatos',
      },
      {
        title: 'Tarefas',
        icon: CheckSquare,
        path: '/tasks',
        color: 'bg-orange-500',
        description: 'Gestão de tarefas',
      },
      {
        title: 'Relatórios',
        icon: BarChart3,
        path: '/reports',
        color: 'bg-pink-500',
        description: 'Relatórios consolidados',
      },
      {
        title: 'Notificações Push',
        icon: Bell,
        path: '/push-notifications',
        color: 'bg-purple-500',
        description: 'Enviar notificações',
      },
      {
        title: 'Configurar Nomeações',
        icon: Vote,
        path: '/election-config',
        color: 'bg-indigo-500',
        description: 'Liderança da igreja',
      },
      {
        title: 'Dashboard Nomeações',
        icon: Eye,
        path: '/election-dashboard',
        color: 'bg-cyan-500',
        description: 'Acompanhar nomeações',
      },
      {
        title: 'Configurações',
        icon: Settings,
        path: '/settings',
        color: 'bg-gray-500',
        description: 'Sistema',
      },
    ],
    pastor: [
      {
        title: 'Usuários',
        icon: Users,
        path: '/users',
        color: 'bg-blue-500',
        description: 'Gerenciar membros',
      },
      {
        title: 'Interessados',
        icon: UserPlus,
        path: '/my-interested',
        color: 'bg-green-500',
        description: 'Novos contatos',
      },
      {
        title: 'Tarefas',
        icon: CheckSquare,
        path: '/tasks',
        color: 'bg-orange-500',
        description: 'Gestão de tarefas',
      },
      {
        title: 'Notificações Push',
        icon: Bell,
        path: '/push-notifications',
        color: 'bg-purple-500',
        description: 'Enviar notificações',
      },
      {
        title: 'Configurar Nomeações',
        icon: Vote,
        path: '/election-config',
        color: 'bg-indigo-500',
        description: 'Liderança da igreja',
      },
      {
        title: 'Dashboard Nomeações',
        icon: Eye,
        path: '/election-dashboard',
        color: 'bg-cyan-500',
        description: 'Acompanhar nomeações',
      },
      {
        title: 'Configurações',
        icon: Settings,
        path: '/settings',
        color: 'bg-gray-500',
        description: 'Sistema',
      },
    ],
    missionary: [
      {
        title: 'Meus Interessados',
        icon: Heart,
        path: '/my-interested',
        color: 'bg-red-500',
        description: 'Acompanhar pessoas',
      },
      {
        title: 'Minhas Tarefas',
        icon: FileText,
        path: '/my-reports',
        color: 'bg-orange-500',
        description: 'Minhas tarefas',
      },
      {
        title: 'Interessados Gerais',
        icon: UserPlus,
        path: '/my-interested',
        color: 'bg-green-500',
        description: 'Todos os contatos',
      },
    ],
    member: [
      {
        title: 'Nomeações',
        icon: Vote,
        path: '/election-voting',
        color: 'bg-indigo-500',
        description: 'Nomeação de liderança',
      },
      {
        title: 'Configurações',
        icon: Settings,
        path: '/settings',
        color: 'bg-gray-500',
        description: 'Notificações',
      },
    ],
    interested: [
      {
        title: 'Contato',
        icon: Phone,
        path: '/contact',
        color: 'bg-green-500',
        description: 'Falar conosco',
      },
    ],
  };

  const profileActions = [
    { title: 'Meu Cadastro', icon: User, path: '/meu-cadastro', color: 'bg-indigo-500' },
    { title: 'Tutorial', icon: FileText, path: '/first-access', color: 'bg-cyan-500' },
  ];

  const currentMenuItems = menuItems[user?.role || 'interested'] || menuItems['interested'];

  // Refresh user data when component mounts to ensure we have the latest church information
  useEffect(() => {
    if (user?.id && !user.church) {
      refreshUserData();
    }
  }, [user?.id, user?.church, refreshUserData]);

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* User Profile Section */}
        <Card className="bg-gradient-to-br from-slate-800 via-blue-800 to-slate-700 text-white shadow-divine">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={
                    user?.profilePhoto
                      ? user.profilePhoto.startsWith('http')
                        ? user.profilePhoto
                        : `/uploads/${user.profilePhoto}`
                      : undefined
                  }
                  className="h-full w-full object-cover"
                />
                <AvatarFallback className="bg-white/20 text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user?.name}</h2>
                <p className="text-white font-medium capitalize">
                  {getRoleDisplayName(user?.role)}
                </p>
                <p className="text-white/90 text-sm">{user?.church || 'Igreja não informada'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Actions */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Perfil</h3>
          <div className="grid grid-cols-2 gap-3">
            {profileActions.map(item => (
              <Card
                key={item.path}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(item.path)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center`}
                    >
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Menu */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Funcionalidades</h3>
          <div className="grid grid-cols-2 gap-3">
            {(currentMenuItems || []).map(item => (
              <Card
                key={item.path}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(item.path)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center`}
                    >
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="pt-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair do aplicativo
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Menu;
