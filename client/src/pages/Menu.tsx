import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type MenuItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  description?: string;
};

type MenuSectionProps = {
  title: string;
  items: MenuItem[];
  showDescription?: boolean;
  onNavigate: (path: string) => void;
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

const MenuSection = ({ title, items, showDescription, onNavigate }: MenuSectionProps) => (
  <div>
    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{title}</h3>
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

  const menuItems: Record<string, MenuItem[]> = {
    superadmin: [
      {
        title: t('menu.districts'),
        icon: Building2,
        path: '/districts',
        color: 'bg-emerald-500',
        description: t('menu.manageDistricts'),
      },
      {
        title: t('menu.pastors'),
        icon: UserCog,
        path: '/pastors',
        color: 'bg-amber-500',
        description: t('menu.managePastors'),
      },
      {
        title: t('menu.invitations'),
        icon: Mail,
        path: '/pastor-invites',
        color: 'bg-teal-500',
        description: t('menu.pastorInvitations'),
      },
      {
        title: t('menu.users'),
        icon: Users,
        path: '/users',
        color: 'bg-blue-500',
        description: t('menu.manageMembers'),
      },
      {
        title: t('menu.interested'),
        icon: UserPlus,
        path: '/my-interested',
        color: 'bg-green-500',
        description: t('menu.newContacts'),
      },
      {
        title: t('menu.reports'),
        icon: BarChart3,
        path: '/reports',
        color: 'bg-pink-500',
        description: t('menu.consolidatedReports'),
      },
      {
        title: t('menu.pushNotifications'),
        icon: Bell,
        path: '/push-notifications',
        color: 'bg-purple-500',
        description: t('menu.sendNotifications'),
      },
      {
        title: t('menu.configureNominations'),
        icon: Vote,
        path: '/election-config',
        color: 'bg-indigo-500',
        description: t('menu.churchLeadership'),
      },
      {
        title: t('menu.nominationsDashboard'),
        icon: Eye,
        path: '/election-dashboard',
        color: 'bg-cyan-500',
        description: t('menu.trackNominations'),
      },
      {
        title: t('menu.settings'),
        icon: Settings,
        path: '/settings',
        color: 'bg-gray-500',
        description: t('menu.system'),
      },
    ],
    pastor: [
      {
        title: t('menu.users'),
        icon: Users,
        path: '/users',
        color: 'bg-blue-500',
        description: t('menu.manageMembers'),
      },
      {
        title: t('menu.interested'),
        icon: UserPlus,
        path: '/my-interested',
        color: 'bg-green-500',
        description: t('menu.newContacts'),
      },
      {
        title: t('menu.tasks'),
        icon: CheckSquare,
        path: '/tasks',
        color: 'bg-orange-500',
        description: t('menu.taskManagement'),
      },
      {
        title: t('menu.pushNotifications'),
        icon: Bell,
        path: '/push-notifications',
        color: 'bg-purple-500',
        description: t('menu.sendNotifications'),
      },
      {
        title: t('menu.configureNominations'),
        icon: Vote,
        path: '/election-config',
        color: 'bg-indigo-500',
        description: t('menu.churchLeadership'),
      },
      {
        title: t('menu.nominationsDashboard'),
        icon: Eye,
        path: '/election-dashboard',
        color: 'bg-cyan-500',
        description: t('menu.trackNominations'),
      },
      {
        title: t('menu.settings'),
        icon: Settings,
        path: '/settings',
        color: 'bg-gray-500',
        description: t('menu.system'),
      },
    ],
    missionary: [
      {
        title: t('menu.myInterested'),
        icon: Heart,
        path: '/my-interested',
        color: 'bg-red-500',
        description: t('menu.followPeople'),
      },
    ],
    member: [
      {
        title: t('menu.nominations'),
        icon: Vote,
        path: '/election-voting',
        color: 'bg-indigo-500',
        description: t('menu.leadershipNomination'),
      },
      {
        title: t('menu.settings'),
        icon: Settings,
        path: '/settings',
        color: 'bg-gray-500',
        description: t('menu.notificationsDesc'),
      },
    ],
    interested: [
      {
        title: t('menu.contact'),
        icon: Phone,
        path: '/contact',
        color: 'bg-green-500',
        description: t('menu.talkToUs'),
      },
    ],
  };

  const profileActions: MenuItem[] = [
    { title: t('menu.myRegistration'), icon: User, path: '/meu-cadastro', color: 'bg-indigo-500' },
    { title: t('menu.tutorial'), icon: FileText, path: '/first-access', color: 'bg-cyan-500' },
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
        <UserProfileCard user={user} />

        {/* Profile Actions */}
        <MenuSection title={t('menu.profile')} items={profileActions} onNavigate={navigate} />

        {/* Main Menu */}
        <MenuSection
          title={t('menu.features')}
          items={currentMenuItems || []}
          showDescription
          onNavigate={navigate}
        />

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
