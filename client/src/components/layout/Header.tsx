import { LogOut, Settings as SettingsIcon, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { useTranslation } from 'react-i18next';

export const Header = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = async () => {
    // Fazer logout primeiro para limpar estado de autenticação
    await logout();
    toast({
      title: 'Logout realizado',
      description: 'Você foi desconectado com sucesso',
    });
    // Navegar para login depois do logout completo
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/meu-cadastro');
  };

  const getPhotoUrl = () => {
    if (!user?.profilePhoto) return null;
    return user.profilePhoto.startsWith('http')
      ? user.profilePhoto
      : `/uploads/${user.profilePhoto}`;
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <header className="border-b bg-background shadow-sm">
      {/* Header Principal */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger
            className="text-foreground hover:bg-muted"
            aria-label="Alternar barra lateral"
          />
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-foreground">
              Sistema de Gestão Eclesiástica
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Offline Indicator - Visível em todas as telas */}
          <OfflineIndicator userRole={user?.role} compact />

          <ThemeToggle variant="icon" />
          <LanguageSwitcher />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  aria-label="Menu do usuário"
                >
                  <div className="relative w-8 h-8">
                    {getPhotoUrl() ? (
                      <>
                        <img
                          src={getPhotoUrl() || ''}
                          alt={`Foto de ${user.name}`}
                          className="w-8 h-8 rounded-full object-cover border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div
                          className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm"
                          style={{ display: 'none' }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      </>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="hidden md:inline-block">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-popover">
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  {t('nav.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Área Expansível - saudação */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-r from-blue-50 to-amber-50 dark:from-blue-900/30 dark:to-amber-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {greeting}, {user?.name?.split(' ')[0]}!
            </h3>
          </div>
        </div>
      )}

      {/* Botão de Expansão */}
      <div className="flex justify-center pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpansion}
          aria-label={
            isExpanded
              ? t('header.hideGreeting', 'Ocultar saudação')
              : t('header.showGreeting', 'Mostrar saudação')
          }
          className="h-8 px-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
};
