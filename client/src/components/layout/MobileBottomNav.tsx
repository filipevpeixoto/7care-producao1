import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Trophy,
  Building2,
  UserCog,
  ChevronUp,
  type LucideIcon,
  Mail,
  Heart,
} from 'lucide-react';
import { uiLogger } from '@/lib/logger';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin, isPastor } from '@/lib/permissions';
import { useState, useRef, useMemo, useCallback, useEffect, memo } from 'react';
import { usePrefetch } from '@/hooks/usePrefetch';

import { useModal } from '@/contexts/ModalContext';

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
  const { user } = useAuth();
  const { isAnyModalOpen } = useModal();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const adminButtonRef = useRef<HTMLButtonElement>(null);
  const { prefetchRoute } = usePrefetch();

  // Fechar menu admin ao clicar fora
  useEffect(() => {
    if (!adminMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(target) &&
        adminButtonRef.current &&
        !adminButtonRef.current.contains(target)
      ) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [adminMenuOpen]);

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
        title: isSuperAdmin(user) ? 'Usuários' : isPastor(user) ? 'Discipulado' : 'Discipulado',
        icon: Users,
        path: isSuperAdmin(user) ? '/users' : '/my-interested',
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
    } else if (isPastor(user)) {
      // Para pastores, botão Distrito com submenu
      baseItems.push({
        title: 'Distrito',
        icon: Building2,
        path: '#',
        roles: ['pastor'],
        submenu: [
          { title: 'Usuários', path: '/users', icon: Users },
          { title: 'Pedidos de Oração', path: '/prayers', icon: Heart },
          { title: 'Pontos', path: '/gamification', icon: Trophy },
        ],
      });
    } else {
      // Para outros usuários, botão de Pontos/Gamificação
      baseItems.push({
        title: 'Pontos',
        icon: Trophy,
        path: '/gamification',
        roles: ['missionary', 'member', 'interested'],
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
  }, [user]);

  // Filtrar itens baseado no role do usuário - memoizado
  const allowedItems = useMemo(() => {
    const userRole = user?.role || '';
    const filtered = menuStructure.filter((item) => {
      // Verificação mais flexível para incluir roles parciais
      const hasAccess =
        user &&
        (item.roles.includes(userRole) ||
          item.roles.some((role) => userRole.includes(role)) ||
          item.roles.some((role) => role.includes(userRole)));
      return hasAccess;
    });

    return filtered;
  }, [menuStructure, user]);

  const activeIndex = useMemo(() => {
    for (let i = 0; i < allowedItems.length; i++) {
      const item = allowedItems[i];

      if (location.pathname === item.path) {
        return i;
      }

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
  }, [allowedItems, location.pathname]);

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
    (path: string) => {
      if (location.pathname === path) {
        return;
      }

      // Usar navegação direta (window.location.href) para máxima confiabilidade
      // React Router v7 navigate() tem bug com lazy routes + startTransition
      // que mantém conteúdo stale (URL muda mas componente não desmonta)
      // Fade-out suave antes de navegar para manter UX agradável
      const wrapper = document.querySelector('.route-transition-wrapper');
      if (wrapper) {
        (wrapper as HTMLElement).style.opacity = '0';
        (wrapper as HTMLElement).style.transition = 'opacity 150ms ease-out';
        setTimeout(() => {
          window.location.href = path;
        }, 150);
      } else {
        window.location.href = path;
      }
    },
    [location.pathname]
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
    uiLogger.warn(
      'MobileBottomNav: Nenhum item permitido para o role:',
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
            const isSubmenuButton = hasSubmenu;

            // Se for botão com submenu (Admin ou Pastoral), renderizar popup customizado
            if (isSubmenuButton) {
              const isSubmenuRoute = item.submenu.some(
                (sub: SubmenuItem) => sub.path === location.pathname
              );
              const isActive = adminMenuOpen || isSubmenuRoute;

              return (
                <div
                  key={index}
                  className="relative flex flex-col items-center justify-center w-full"
                >
                  <button
                    ref={adminButtonRef}
                    id="tour-nav-admin"
                    aria-label="Menu Administração"
                    aria-expanded={adminMenuOpen}
                    aria-haspopup="true"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setAdminMenuOpen((prev) => !prev)}
                    className={`relative flex flex-col items-center justify-center w-full h-12 transition-all duration-300 ease-out ${
                      isActive ? 'scale-110' : 'scale-100'
                    }`}
                    style={{
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    type="button"
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-amber-400/20 rounded-2xl blur-sm" />
                    )}
                    <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
                      <div className="relative">
                        <item.icon
                          className={`w-5 h-5 mb-1 transition-all duration-300 ${iconClasses(isActive)}`}
                        />
                        {isActive && (
                          <ChevronUp className="absolute -top-1 -right-1 w-3 h-3 text-emerald-600 animate-bounce" />
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium transition-all duration-300 ${textClasses(isActive)}`}
                      >
                        {item.title}
                      </span>
                    </div>
                  </button>

                  {/* Popup do submenu */}
                  {adminMenuOpen && (
                    <div
                      ref={adminMenuRef}
                      role="menu"
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 min-w-[160px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl dark:shadow-slate-900/50 p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
                      style={{ zIndex: 1000000 }}
                    >
                      {item.submenu.map((subItem: SubmenuItem, subIndex: number) => {
                        const isSubActive = location.pathname === subItem.path;
                        return (
                          <button
                            key={subIndex}
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdminMenuOpen(false);
                              handleNavigation(subItem.path);
                            }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 w-full text-left ${
                              isSubActive
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-300 focus:bg-gray-100 dark:focus:bg-slate-700/50'
                            }`}
                          >
                            <subItem.icon
                              className={`w-4 h-4 ${isSubActive ? 'text-primary' : 'text-gray-600 dark:text-slate-400'}`}
                            />
                            <span className="text-sm font-medium">{subItem.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.path !== '#') {
                    handleNavigation(item.path);
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
