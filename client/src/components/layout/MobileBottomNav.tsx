import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Trophy,
  Building2,
  UserCog,
  ChevronUp,
  LucideIcon,
  Mail,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { useModal } from '@/contexts/ModalContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SubmenuItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  path: string;
  roles: string[];
  submenu: SubmenuItem[];
}

export const MobileBottomNav = memo(() => {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { user } = useAuth();
  const { isAnyModalOpen } = useModal();
  const [activeIndex, setActiveIndex] = useState(0);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const { prefetchRoute } = usePrefetch();

  // Estrutura simplificada do menu - memoizada para evitar recriações
  const menuStructure = useMemo(() => {
    const baseItems: MenuItem[] = [
      {
        title: 'Início',
        icon: LayoutDashboard,
        path: '/dashboard',
        roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
        submenu: [],
      },
      {
        title: 'Agenda',
        icon: Calendar,
        path: '/calendar',
        roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
        submenu: [],
      },
      {
        title: hasAdminAccess(user) ? 'Usuários' : 'Discipulado',
        icon: Users,
        path: hasAdminAccess(user) ? '/users' : '/my-interested',
        roles: ['superadmin', 'pastor', 'missionary', 'member'],
        submenu: [],
      },
    ];

    // Para superadmin, adicionar botão de administração em vez de 7Mount
    if (isSuperAdmin(user)) {
      baseItems.push({
        title: 'Admin',
        icon: Building2,
        path: '#',
        roles: ['superadmin'],
        submenu: [
          { title: 'Distritos', path: '/districts', icon: Building2 },
          { title: 'Pastores', path: '/pastors', icon: UserCog },
          { title: 'Convites', path: '/pastor-invites', icon: Mail },
        ],
      });
    } else {
      // Para outros usuários, manter o 7Mount
      baseItems.push({
        title: '7Mount',
        icon: Trophy,
        path: '/gamification',
        roles: ['pastor', 'missionary', 'member', 'interested'],
        submenu: [],
      });
    }

    // Sempre adicionar Menu no final
    baseItems.push({
      title: 'Menu',
      icon: Settings,
      path: '/menu',
      roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
      submenu: [],
    });

    return baseItems;
  }, [user?.role]);

  // Filtrar itens baseado no role do usuário - memoizado
  const allowedItems = useMemo(() => {
    const userRole = user?.role || '';
    const filtered = menuStructure.filter(item => {
      // Verificação mais flexível para incluir roles parciais
      const hasAccess =
        user &&
        (item.roles.includes(userRole) ||
          item.roles.some(role => userRole.includes(role)) ||
          item.roles.some(role => role.includes(userRole)));
      return hasAccess;
    });

    console.log('🔍 MobileBottomNav - Debug:', {
      userRole: userRole,
      userRoleType: typeof userRole,
      menuStructure: menuStructure.map(item => ({ title: item.title, roles: item.roles })),
      filteredItems: filtered.map(item => ({ title: item.title, roles: item.roles })),
      allRoles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
    });
    return filtered;
  }, [menuStructure, user]);

  // Atualizar índice ativo baseado na rota atual
  useEffect(() => {
    const findActiveIndex = () => {
      for (let i = 0; i < allowedItems.length; i++) {
        const item = allowedItems[i];

        // Verificar se a rota atual é o item principal
        if (location.pathname === item.path) {
          return i;
        }

        // Verificar se a rota atual corresponde a algum submenu (para Admin)
        if (item.submenu && item.submenu.length > 0) {
          const submenuMatch = item.submenu.some(
            (sub: SubmenuItem) => sub.path === location.pathname
          );
          if (submenuMatch) {
            return i;
          }
        }
      }
      return 0;
    };

    const newActiveIndex = findActiveIndex();
    setActiveIndex(newActiveIndex);

    // Se estiver em uma rota de admin, abrir o menu
    if (
      location.pathname === '/districts' ||
      location.pathname === '/pastors' ||
      location.pathname === '/pastor-invites'
    ) {
      setAdminMenuOpen(true);
    } else {
      setAdminMenuOpen(false);
    }
  }, [location.pathname, allowedItems]);

  // Classes adaptativas para light e dark mode
  const navClasses =
    'bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-3xl shadow-2xl dark:shadow-slate-900/50 pointer-events-auto';
  const slidingBgClasses =
    'bg-primary/10 dark:bg-primary/20 backdrop-blur-sm rounded-2xl transition-all duration-300 ease-out shadow-lg dark:shadow-primary/10';

  const iconClasses = (isActive: boolean) => {
    return isActive
      ? 'scale-110 text-primary dark:text-primary'
      : 'scale-100 text-gray-600 dark:text-slate-400';
  };

  const textClasses = (isActive: boolean) => {
    return isActive
      ? 'opacity-100 font-semibold text-primary dark:text-primary'
      : 'opacity-80 text-gray-600 dark:text-slate-400';
  };

  const handleNavigation = useCallback(
    (path: string, index: number) => {
      if (location.pathname === path) {
        return;
      }

      setActiveIndex(index);

      // Tentar navegação SPA primeiro
      try {
        navigate(path);
      } catch {
        // Se falhar, fallback direto
        window.location.href = path;
        return;
      }

      // Safety net: se após 300ms a rota não mudou, forçar navegação
      // Isso resolve o problema do React Router v7 com startTransition
      // mantendo conteúdo stale em rotas lazy-loaded (ex: Calendar)
      const checkTimeout = setTimeout(() => {
        if (window.location.pathname === location.pathname) {
          window.location.href = path;
        }
      }, 300);

      // Limpar timeout se o componente desmontar (navegação funcionou)
      return () => clearTimeout(checkTimeout);
    },
    [location.pathname, navigate]
  );

  // Se não há itens permitidos, usar itens básicos como fallback
  const fallbackItems: MenuItem[] = [
    {
      title: 'Início',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
      submenu: [],
    },
    {
      title: 'Agenda',
      icon: Calendar,
      path: '/calendar',
      roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
      submenu: [],
    },
    {
      title: 'Menu',
      icon: Settings,
      path: '/menu',
      roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
      submenu: [],
    },
  ];
  const finalItems: MenuItem[] = allowedItems.length > 0 ? allowedItems : fallbackItems;

  if (allowedItems.length === 0) {
    console.warn(
      '⚠️ MobileBottomNav: Nenhum item permitido para o role:',
      user?.role,
      '- usando fallback'
    );
  }

  // Usar portal para renderizar fora do fluxo do documento
  // Isso garante que o menu fique realmente fixo na viewport
  return createPortal(
    <div
      className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none transition-transform duration-300 ease-in-out"
      style={{
        zIndex: 999999,
        transform: isAnyModalOpen ? 'translateY(100%)' : 'translateY(0)',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
      }}
    >
      {/* Menu principal suspenso/flutuante */}
      <nav ref={navRef} className={navClasses} aria-label="Navegação principal">
        <div className="relative flex justify-around items-center py-2 px-3">
          {/* Fundo deslizante centralizado - não aparece quando menu admin está aberto */}
          {!adminMenuOpen && (
            <div
              className={`absolute top-1.5 bottom-1.5 ${slidingBgClasses}`}
              style={{
                width: `calc(${100 / finalItems.length}% - 10px)`,
                left: `calc(${(100 / finalItems.length) * activeIndex}% + 5px)`,
                height: 'calc(100% - 12px)',
              }}
            />
          )}

          {finalItems.map((item, index) => {
            const isActive = index === activeIndex;
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isAdminButton = isSuperAdmin(user) && item.title === 'Admin';

            // Se for o botão de Admin com submenu, renderizar dropdown
            if (isAdminButton && hasSubmenu) {
              const isAdminRoute =
                location.pathname === '/districts' || location.pathname === '/pastors';
              const isActive = adminMenuOpen || isAdminRoute;

              return (
                <DropdownMenu
                  key={index}
                  open={adminMenuOpen}
                  onOpenChange={setAdminMenuOpen}
                  modal={false}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      id="tour-nav-admin"
                      aria-label="Menu Administração"
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative flex flex-col items-center justify-center w-full h-12 transition-all duration-300 ease-out ${
                        isActive ? 'scale-110' : 'scale-100'
                      }`}
                      style={{
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      type="button"
                    >
                      {/* Indicador visual quando ativo */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-amber-400/20 rounded-2xl blur-sm" />
                      )}
                      <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
                        <div className="relative">
                          <Building2
                            className={`w-5 h-5 mb-1 transition-all duration-300 ${iconClasses(isActive)}`}
                          />
                          {isActive && (
                            <ChevronUp className="absolute -top-1 -right-1 w-3 h-3 text-emerald-600 animate-bounce" />
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium transition-all duration-300 ${textClasses(isActive)}`}
                        >
                          Admin
                        </span>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="mb-2 min-w-[160px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl dark:shadow-slate-900/50 p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
                    style={{ zIndex: 1000000 }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                  >
                    {item.submenu.map((subItem: SubmenuItem, subIndex: number) => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <DropdownMenuItem
                          key={subIndex}
                          onSelect={() => {
                            setAdminMenuOpen(false);
                            navigate(subItem.path);
                          }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                            isSubActive
                              ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
                              : 'hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-300 focus:bg-gray-100 dark:focus:bg-slate-700/50'
                          }`}
                        >
                          <subItem.icon
                            className={`w-4 h-4 ${isSubActive ? 'text-primary' : 'text-gray-600 dark:text-slate-400'}`}
                          />
                          <span className="text-sm font-medium">{subItem.title}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // Botões normais sem submenu
            // Gerar ID para o tour baseado no título
            const tourId = `tour-nav-${item.title.toLowerCase().replace(/\s+/g, '-').replace('7mount', 'gamification').replace('início', 'dashboard').replace('usuários', 'users')}`;

            return (
              <button
                key={index}
                id={tourId}
                aria-label={item.title}
                aria-current={isActive ? 'page' : undefined}
                onClick={e => {
                  e.stopPropagation();
                  if (item.path !== '#') {
                    handleNavigation(item.path, index);
                  }
                }}
                onTouchStart={() => item.path !== '#' && prefetchRoute(item.path)}
                onMouseEnter={() => item.path !== '#' && prefetchRoute(item.path)}
                className="relative flex flex-col items-center justify-center w-full h-12 transition-all duration-300 ease-out"
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
                type="button"
              >
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <item.icon
                    className={`w-5 h-5 mb-1 transition-all duration-300 ${iconClasses(isActive)}`}
                  />
                  <span
                    className={`text-xs font-medium transition-all duration-300 ${textClasses(isActive)}`}
                  >
                    {item.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>,
    document.body
  );
});
