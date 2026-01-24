import { LogOut, Settings as SettingsIcon, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso",
    });
    navigate('/');
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
    console.log('🔍 Toggle clicked! Current state:', isExpanded);
    setIsExpanded(!isExpanded);
    console.log('🔍 New state will be:', !isExpanded);
  };

  console.log('🔍 Header render - isExpanded:', isExpanded, 'user:', user?.name);

  return (
    <header className="border-b bg-background shadow-sm">
      {/* Header Principal */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-foreground hover:bg-muted" />
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
          
          {user && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
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
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Meu Cadastro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>

      {/* Área Expansível - SEMPRE VISÍVEL PARA TESTE */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg p-4 border border-blue-100 shadow-sm">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-800">
              {greeting}, {user?.name}! (Estado: {isExpanded ? 'EXPANDIDO' : 'CONTRAÍDO'})
            </h3>
            <p className="text-gray-600">
              Bem-vindo ao painel de controle
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Sistema online • Dados em tempo real
            </div>
          </div>
        </div>
      </div>

      {/* Botão de Expansão - SEMPRE VISÍVEL */}
      <div className="flex justify-center pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpansion}
          className="h-8 px-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200 border border-gray-200 hover:border-gray-300"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              <span className="text-xs">Ocultar ({isExpanded ? 'true' : 'false'})</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              <span className="text-xs">Ver boas-vindas ({isExpanded ? 'true' : 'false'})</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
};