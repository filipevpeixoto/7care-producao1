import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
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
  MessageCircle,
  Trophy,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { getRoleDisplayName, getUserRole, type AppRole } from '@/lib/permissions';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MenuV2 } from './v2/MenuV2';

type MenuItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  description?: string;
};

type MenuSectionProps = {
  title: string;
  description?: string;
  items: MenuItem[];
  showDescription?: boolean;
  onNavigate: (path: string) => void;
};

type IntentSection = {
  title: string;
  description: string;
  items: MenuItem[];
};

type UserSummary = {
  name?: string;
  role?: string;
  church?: string | null;
  profilePhoto?: string | null;
};

const UserProfileCard = ({ user }: { user?: UserSummary | null }) => {
  const { t } = useTranslation();
  return (
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
            <p className="text-white font-medium capitalize">{getRoleDisplayName(user?.role)}</p>
            <p className="text-white/90 text-sm">{user?.church || t('menu.churchNotInformed')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MenuItemCard = ({
  item,
  onNavigate,
  showDescription,
}: {
  item: MenuItem;
  onNavigate: (path: string) => void;
  showDescription?: boolean;
}) => (
  <Card
    className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    onClick={() => onNavigate(item.path)}
  >
    <CardContent className="p-4">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center`}>
          <item.icon className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.title}</span>
        {showDescription && item.description ? (
          <span className="text-xs text-gray-500 dark:text-gray-300">{item.description}</span>
        ) : null}
      </div>
    </CardContent>
  </Card>
);

const MenuSection = ({
  title,
  description,
  items,
  showDescription,
  onNavigate,
}: MenuSectionProps) => (
  <div>
    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{title}</h3>
    {description ? (
      <p className="mb-3 text-sm leading-[1.5] text-gray-500 dark:text-gray-300">{description}</p>
    ) : null}
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <MenuItemCard
          key={item.path}
          item={item}
          onNavigate={onNavigate}
          showDescription={showDescription}
        />
      ))}
    </div>
  </div>
);

const Menu = () => {
  const { t } = useTranslation();
  const { user, logout, refreshUserData } = useAuth();
  const { skin } = useTheme();
  const navigate = useTransitionNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    // Fazer logout primeiro para limpar estado de autenticação
    await logout();
    toast({
      title: t('menu.logoutSuccess'),
      description: t('menu.logoutDescription'),
    });
    // Navegar para login depois do logout completo
    navigate('/login');
  };

  const role = getUserRole(user) || 'interested';

  const menuSectionsByRole: Record<AppRole, IntentSection[]> = {
    superadmin: [
      {
        title: 'Cuidar pessoas',
        description: 'Acompanhe base, novos contatos e liderança ativa sem caçar telas.',
        items: [
          {
            title: 'Usuários',
            icon: Users,
            path: '/users',
            color: 'bg-blue-500',
            description: 'Membros, líderes e base geral',
          },
          {
            title: 'Meus interessados',
            icon: UserPlus,
            path: '/my-interested',
            color: 'bg-green-500',
            description: 'Visitantes e novos relacionamentos',
          },
          {
            title: 'Pastores',
            icon: UserCog,
            path: '/pastors',
            color: 'bg-amber-500',
            description: 'Cobertura e atividade ministerial',
          },
        ],
      },
      {
        title: 'Operação e estrutura',
        description: 'Os fluxos administrativos mais sensíveis da semana.',
        items: [
          {
            title: 'Distritos',
            icon: Building2,
            path: '/districts',
            color: 'bg-emerald-500',
            description: 'Estrutura territorial e cobertura',
          },
          {
            title: 'Convites pastorais',
            icon: Mail,
            path: '/pastor-invites',
            color: 'bg-teal-500',
            description: 'Aprovação e acompanhamento',
          },
          {
            title: 'Relatórios',
            icon: BarChart3,
            path: '/reports',
            color: 'bg-pink-500',
            description: 'Leitura executiva da operação',
          },
        ],
      },
      {
        title: 'Comunicar e governar',
        description: 'Campanhas, eleição e visão institucional em um mesmo bloco.',
        items: [
          {
            title: 'Notificações push',
            icon: Bell,
            path: '/push-notifications',
            color: 'bg-purple-500',
            description: 'Campanhas e comunicados',
          },
          {
            title: 'Configurar eleição',
            icon: Vote,
            path: '/election-config',
            color: 'bg-indigo-500',
            description: 'Regras e critérios',
          },
          {
            title: 'Painel eleitoral',
            icon: Eye,
            path: '/election-dashboard',
            color: 'bg-cyan-500',
            description: 'Participação e andamento',
          },
        ],
      },
    ],
    pastor: [
      {
        title: 'Cuidar pessoas',
        description: 'Tudo o que você precisa para acompanhar membros e interessados.',
        items: [
          {
            title: 'Usuários',
            icon: Users,
            path: '/users',
            color: 'bg-blue-500',
            description: 'Membros, perfis e acompanhamento',
          },
          {
            title: 'Meus interessados',
            icon: UserPlus,
            path: '/my-interested',
            color: 'bg-green-500',
            description: 'Próximos passos de discipulado',
          },
          {
            title: 'Orações',
            icon: Heart,
            path: '/prayers',
            color: 'bg-red-500',
            description: 'Pedidos e intercessões da igreja',
          },
        ],
      },
      {
        title: 'Organizar a semana',
        description: 'Pendências, agenda e visão da sua atuação pastoral.',
        items: [
          {
            title: 'Tarefas',
            icon: CheckSquare,
            path: '/tasks',
            color: 'bg-orange-500',
            description: 'Prioridades e acompanhamentos',
          },
          {
            title: 'Agenda',
            icon: CalendarDays,
            path: '/calendar',
            color: 'bg-amber-500',
            description: 'Eventos, visitas e encontros',
          },
          {
            title: 'Meus relatórios',
            icon: BarChart3,
            path: '/my-reports',
            color: 'bg-cyan-500',
            description: 'Leitura rápida da sua frente',
          },
        ],
      },
      {
        title: 'Comunicar e liderar',
        description: 'Campanhas e governança quando a rotina exigir.',
        items: [
          {
            title: 'Notificações push',
            icon: Bell,
            path: '/push-notifications',
            color: 'bg-purple-500',
            description: 'Alertas e campanhas da igreja',
          },
          {
            title: 'Configurar eleição',
            icon: Vote,
            path: '/election-config',
            color: 'bg-indigo-500',
            description: 'Definição do processo eleitoral',
          },
          {
            title: 'Painel eleitoral',
            icon: Eye,
            path: '/election-dashboard',
            color: 'bg-sky-500',
            description: 'Resultados e status',
          },
        ],
      },
    ],
    missionary: [
      {
        title: 'Minha missão',
        description: 'Acompanhamentos, agenda e visão do que precisa andar.',
        items: [
          {
            title: 'Meus interessados',
            icon: Heart,
            path: '/my-interested',
            color: 'bg-red-500',
            description: 'Pessoas sob seu cuidado',
          },
          {
            title: 'Meus relatórios',
            icon: BarChart3,
            path: '/my-reports',
            color: 'bg-cyan-500',
            description: 'Resumo da sua atuação',
          },
          {
            title: 'Agenda',
            icon: CalendarDays,
            path: '/calendar',
            color: 'bg-amber-500',
            description: 'Eventos e próximos encontros',
          },
        ],
      },
      {
        title: 'Vida espiritual',
        description: 'Fluxos simples para continuar presente e engajado.',
        items: [
          {
            title: 'Orações',
            icon: Heart,
            path: '/prayers',
            color: 'bg-pink-500',
            description: 'Pedidos para acompanhar e interceder',
          },
          {
            title: 'Pontuação',
            icon: Trophy,
            path: '/gamification',
            color: 'bg-emerald-500',
            description: 'Evolução e progresso',
          },
          {
            title: 'Contato',
            icon: Phone,
            path: '/contact',
            color: 'bg-green-500',
            description: 'Falar com a liderança quando precisar',
          },
        ],
      },
    ],
    member: [
      {
        title: 'Minha caminhada',
        description: 'A versão mais leve do app para viver a semana sem ruído.',
        items: [
          {
            title: 'Agenda',
            icon: CalendarDays,
            path: '/calendar',
            color: 'bg-amber-500',
            description: 'Próximos encontros e eventos',
          },
          {
            title: 'Orações',
            icon: Heart,
            path: '/prayers',
            color: 'bg-red-500',
            description: 'Pedidos, resposta e cuidado',
          },
          {
            title: 'Pontuação',
            icon: Trophy,
            path: '/gamification',
            color: 'bg-emerald-500',
            description: 'Progresso e marcos da jornada',
          },
        ],
      },
      {
        title: 'Comunidade',
        description: 'Conexão prática com a igreja e processos que fazem sentido para você.',
        items: [
          {
            title: 'Votação',
            icon: Vote,
            path: '/election-voting',
            color: 'bg-indigo-500',
            description: 'Participar quando houver processo aberto',
          },
          {
            title: 'Contato',
            icon: Phone,
            path: '/contact',
            color: 'bg-green-500',
            description: 'Fale com a igreja',
          },
          {
            title: 'Chat',
            icon: MessageCircle,
            path: '/chat',
            color: 'bg-blue-500',
            description: 'Conversas e orientações',
          },
        ],
      },
    ],
    interested: [
      {
        title: 'Próximos passos',
        description: 'Poucas opções, bem claras, para continuar sua jornada com segurança.',
        items: [
          {
            title: 'Agenda',
            icon: CalendarDays,
            path: '/calendar',
            color: 'bg-amber-500',
            description: 'Eventos e encontros para participar',
          },
          {
            title: 'Contato',
            icon: Phone,
            path: '/contact',
            color: 'bg-green-500',
            description: 'Falar com a equipe da igreja',
          },
          {
            title: 'Chat',
            icon: MessageCircle,
            path: '/chat',
            color: 'bg-blue-500',
            description: 'Tirar dúvidas e pedir orientação',
          },
        ],
      },
    ],
  };

  const profileActions: MenuItem[] = [
    { title: t('menu.myRegistration'), icon: User, path: '/meu-cadastro', color: 'bg-indigo-500' },
    { title: t('menu.tutorial'), icon: FileText, path: '/first-access', color: 'bg-cyan-500' },
  ];
  const settingsAction: MenuItem = {
    title: t('menu.settings'),
    icon: Settings,
    path: '/settings',
    color: 'bg-gray-500',
    description: t('menu.system'),
  };

  const currentSections = menuSectionsByRole[role];
  const accountItems = [...profileActions, settingsAction];
  const v2SubtitleByRole: Record<AppRole, string> = {
    superadmin: 'Priorize estrutura, pessoas e governança com menos ruído visual.',
    pastor: 'Cuidado, agenda e comunicação organizados pela intenção da tarefa.',
    missionary: 'Uma central enxuta para acompanhar pessoas e manter constância.',
    member: 'Os caminhos mais úteis da semana, sem telas administrativas.',
    interested: 'Acesso simples para falar com a igreja e encontrar o próximo passo.',
  };

  // Refresh user data when component mounts to ensure we have the latest church information
  useEffect(() => {
    if (user?.id && !user.church) {
      refreshUserData();
    }
  }, [user?.id, user?.church, refreshUserData]);

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <MenuV2
          user={user}
          eyebrow={getRoleDisplayName(user?.role)}
          title="Central de ações"
          subtitle={v2SubtitleByRole[role]}
          sections={currentSections}
          accountItems={accountItems}
          onNavigate={navigate}
          onLogout={handleLogout}
        />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* User Profile Section */}
        <UserProfileCard user={user} />

        {/* Profile Actions */}
        <MenuSection title={t('menu.profile')} items={accountItems} onNavigate={navigate} />

        {currentSections.map((section) => (
          <MenuSection
            key={section.title}
            title={section.title}
            description={section.description}
            items={section.items}
            showDescription
            onNavigate={navigate}
          />
        ))}

        {/* Logout */}
        <div className="pt-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('menu.logoutApp')}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Menu;
