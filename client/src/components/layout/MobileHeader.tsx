import { Bell, MessageCircle, Settings as SettingsIcon, User, LogOut, Sparkles, X, Eye, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';

import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { useSystemLogo } from '@/hooks/useSystemLogo';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const MobileHeader = () => {
  const { user, logout, stopImpersonating } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { systemLogo } = useSystemLogo();
  const [mobileHeaderLayout, setMobileHeaderLayout] = useState({
    logo: { offsetX: 0, offsetY: 0 },
    welcome: { offsetX: 0, offsetY: 0 },
    actions: { offsetX: 0, offsetY: 0 }
  });
  
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationContext, setImpersonationContext] = useState<any>(null);

  // Verificar se está impersonando
  useEffect(() => {
    const checkImpersonation = () => {
      const context = localStorage.getItem('7care_impersonation');
      if (context) {
        try {
          const parsed = JSON.parse(context);
          const maxAge = 24 * 60 * 60 * 1000; // 24 horas
          if (Date.now() - parsed.timestamp < maxAge && parsed.isImpersonating) {
            setIsImpersonating(true);
            setImpersonationContext(parsed);
          } else {
            localStorage.removeItem('7care_impersonation');
            setIsImpersonating(false);
            setImpersonationContext(null);
          }
        } catch (error) {
          setIsImpersonating(false);
          setImpersonationContext(null);
        }
      } else {
        setIsImpersonating(false);
        setImpersonationContext(null);
      }
    };

    checkImpersonation();
    // Verificar periodicamente
    const interval = setInterval(checkImpersonation, 1000);
    return () => clearInterval(interval);
  }, []);







  // Listen for layout updates from settings
  useEffect(() => {
    const handleLayoutUpdate = (event: CustomEvent) => {
      setMobileHeaderLayout(event.detail.layout);
    };

    window.addEventListener('mobileHeaderLayoutUpdated', handleLayoutUpdate as EventListener);
    return () => {
      window.removeEventListener('mobileHeaderLayoutUpdated', handleLayoutUpdate as EventListener);
    };
  }, []);

  // Load mobile header layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('mobileHeaderLayout');
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        setMobileHeaderLayout(parsedLayout);
      } catch (error) {
        console.error('❌ MobileHeader - Erro ao carregar layout:', error);
      }
    }
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);



  // Lógica de auto-hide baseada no scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Mostrar quando estiver no topo
      if (currentScrollY <= 50) {
        setIsVisible(true);
      }
      // Auto-hide quando rolar para baixo
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      // Mostrar quando rolar para cima
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const getPhotoUrl = () => {
    if (!user?.profilePhoto) return null;
    return user.profilePhoto.startsWith('http')
      ? user.profilePhoto
      : `/uploads/${user.profilePhoto}`;
  };

  const handleProfile = () => navigate('/meu-cadastro');
  const handleLogout = () => {
    logout();
    toast({ title: 'Logout realizado', description: 'Você foi desconectado com sucesso' });
    navigate('/');
  };

  const handleStopImpersonating = () => {
    stopImpersonating();
    setIsImpersonating(false);
    setImpersonationContext(null);
    toast({ 
      title: 'Voltou ao Superadmin', 
      description: 'Você está visualizando como superadmin novamente.' 
    });
    navigate('/districts');
  };

  return (
    <>
      {/* Banner de Impersonação */}
      {isImpersonating && impersonationContext && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 flex-1">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">
              Visualizando como: <strong>{impersonationContext.impersonatingAs.name}</strong>
              {impersonationContext.impersonatingAs.districtName && (
                <span className="ml-1 opacity-90">({impersonationContext.impersonatingAs.districtName})</span>
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopImpersonating}
            className="text-white hover:bg-blue-800 h-7 px-2"
            title="Voltar ao Superadmin"
          >
            <X className="w-4 h-4 mr-1" />
            <span className="text-xs">Voltar</span>
          </Button>
        </div>
      )}
      
      <header className={`sticky ${isImpersonating ? 'top-[42px]' : 'top-0'} z-40 transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 backdrop-blur-md border-b border-blue-100/50 dark:border-gray-700/50 shadow-lg`}>
        <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="relative cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200" 
            style={{ 
              transform: `translateX(-1%) translateX(${mobileHeaderLayout.logo.offsetX}px) translateY(${mobileHeaderLayout.logo.offsetY}px)` 
            }}
            title="Voltar ao início"
          >
            {systemLogo && (
              <img 
                src={systemLogo} 
                alt="7care" 
                className="w-16 h-16 drop-shadow-sm object-contain pointer-events-none"
                onError={(e) => {
                  // Remove a logo em caso de erro
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}

          </button>

          
          {/* Informações de Boas-vindas em linha com a logo */}
          {user && (
            <div 
              className="flex items-center gap-2 pl-3 border-l border-gray-200/50 dark:border-gray-600/50"
              style={{
                transform: `translateX(${mobileHeaderLayout.welcome.offsetX}px) translateY(${mobileHeaderLayout.welcome.offsetY}px)`
              }}
            >
              <div className="flex items-center gap-1">
                <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-pulse" />
                <span className="text-base font-medium text-gray-700 dark:text-gray-200">
                  {greeting}, {(user.name || 'Usuário').split(' ')[0]}!
                </span>
              </div>

            </div>
          )}
        </div>
        
        <div 
          className="flex items-center gap-2"
          style={{
            transform: `translateX(${mobileHeaderLayout.actions.offsetX}px) translateY(${mobileHeaderLayout.actions.offsetY}px)`
          }}
        >
          {/* Offline Indicator */}
          <OfflineIndicator userRole={user?.role} compact />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/chat')} 
            title="Chat"
            className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200/50 hover:border-green-300/50 transition-all duration-200 dark:from-green-900/30 dark:to-emerald-900/30 dark:hover:from-green-800/40 dark:hover:to-emerald-800/40 dark:border-green-700/50"
          >
            <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/notifications')}
            title="Notificações"
            className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200/50 hover:border-amber-300/50 transition-all duration-200 dark:from-amber-900/30 dark:to-orange-900/30 dark:hover:from-amber-800/40 dark:hover:to-orange-800/40 dark:border-amber-700/50"
          >
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleTheme}
            title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className="bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200/50 hover:border-purple-300/50 transition-all duration-200 dark:from-purple-900/30 dark:to-indigo-900/30 dark:hover:from-purple-800/40 dark:hover:to-indigo-800/40 dark:border-purple-700/50"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-purple-600" />
            )}
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0">
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
    </header>
    </>
  );
};