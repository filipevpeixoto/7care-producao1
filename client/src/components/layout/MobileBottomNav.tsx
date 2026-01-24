import { LayoutDashboard, Calendar, Users, Settings, Trophy, Building2, UserCog, ChevronUp, LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAnyModalOpen } = useModal();
  const [activeIndex, setActiveIndex] = useState(0);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  
  // Estrutura simplificada do menu - memoizada para evitar recriações
  const menuStructure = useMemo(() => {
    const baseItems: MenuItem[] = [
      {
        title: 'Início',
        icon: LayoutDashboard,
        path: '/dashboard',
        roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
        submenu: []
      },
      {
        title: 'Agenda',
        icon: Calendar,
        path: '/calendar',
        roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
        submenu: []
      },
      {
        title: hasAdminAccess(user) ? 'Usuários' : 'Discipulado',
        icon: Users,
        path: hasAdminAccess(user) ? '/users' : '/my-interested',
        roles: ['superadmin', 'pastor', 'missionary', 'member'],
        submenu: []
      }
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
          { title: 'Pastores', path: '/pastors', icon: UserCog }
        ]
      });
    } else {
      // Para outros usuários, manter o 7Mount
      baseItems.push({
        title: '7Mount',
        icon: Trophy,
        path: '/gamification',
        roles: ['pastor', 'missionary', 'member', 'interested'],
        submenu: []
      });
    }

    // Sempre adicionar Menu no final
    baseItems.push({
      title: 'Menu',
      icon: Settings,
      path: '/menu',
      roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
      submenu: []
    });

    return baseItems;
  }, [user?.role]);

  // Filtrar itens baseado no role do usuário - memoizado
  const allowedItems = useMemo(() => {
    const userRole = user?.role || '';
    const filtered = menuStructure.filter(item => {
      // Verificação mais flexível para incluir roles parciais
      const hasAccess = user && (
        item.roles.includes(userRole) ||
        item.roles.some(role => userRole.includes(role)) ||
        item.roles.some(role => role.includes(userRole))
      );
      return hasAccess;
    });
    
    console.log('🔍 MobileBottomNav - Debug:', {
      userRole: userRole,
      userRoleType: typeof userRole,
      menuStructure: menuStructure.map(item => ({ title: item.title, roles: item.roles })),
      filteredItems: filtered.map(item => ({ title: item.title, roles: item.roles })),
      allRoles: ['superadmin', 'pastor', 'missionary', 'member', 'interested']
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
          const submenuMatch = item.submenu.some((sub: any) => sub.path === location.pathname);
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
    if (location.pathname === '/districts' || location.pathname === '/pastors') {
      setAdminMenuOpen(true);
    } else {
      setAdminMenuOpen(false);
    }
  }, [location.pathname, allowedItems]);

  // Classes fixas para sempre usar o estilo claro (que funciona bem em qualquer fundo)
  const navClasses = "bg-white/30 backdrop-blur-md border border-white/40 rounded-3xl shadow-2xl pointer-events-auto";
  const slidingBgClasses = "bg-white/50 backdrop-blur-sm rounded-2xl transition-all duration-300 ease-out shadow-lg";
  
  const iconClasses = (isActive: boolean) => {
    return isActive ? 'scale-110 text-gray-800' : 'scale-100 text-gray-600';
  };

  const textClasses = (isActive: boolean) => {
    return isActive ? 'opacity-100 font-semibold text-gray-800' : 'opacity-80 text-gray-600';
  };

  const handleNavigation = useCallback((path: string, index: number) => {
    if (location.pathname === path) {
      console.log('🔄 Já está na página:', path);
      return;
    }
    
    console.log('🔄 FORÇANDO navegação de', location.pathname, '→', path);
    
    setActiveIndex(index);
    window.location.href = path;
  }, [location.pathname]);

  // Log para debug
  console.log('🔍 MobileBottomNav - Render:', {
    userRole: user?.role,
    allowedItemsCount: allowedItems.length,
    activeIndex,
    location: location.pathname
  });

  // Se não há itens permitidos, usar itens básicos como fallback
  const fallbackItems: MenuItem[] = [
    {
      title: 'Início',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
      submenu: []
    },
    {
      title: 'Agenda',
      icon: Calendar,
      path: '/calendar',
      roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
      submenu: []
    },
    {
      title: 'Menu',
      icon: Settings,
      path: '/menu',
      roles: ['superadmin', 'pastor', 'missionary', 'member', 'interested'],
      submenu: []
    }
  ];
  const finalItems: MenuItem[] = allowedItems.length > 0 ? allowedItems : fallbackItems;

  if (allowedItems.length === 0) {
    console.warn('⚠️ MobileBottomNav: Nenhum item permitido para o role:', user?.role, '- usando fallback');
  }

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 p-4 pointer-events-none transition-transform duration-300 ease-in-out`}
      style={{ 
        zIndex: 999999,
        transform: isAnyModalOpen ? 'translateY(100%)' : 'translateY(0)'
      }}
    >
      {/* Menu principal suspenso */}
      <nav 
        ref={navRef}
        className={navClasses}
      >
        <div className="relative flex justify-around items-center py-2 px-3">
          {/* Fundo deslizante centralizado - não aparece quando menu admin está aberto */}
          {!adminMenuOpen && (
            <div 
              className={`absolute top-1.5 bottom-1.5 ${slidingBgClasses}`}
              style={{
                width: `calc(${100 / finalItems.length}% - 10px)`,
                left: `calc(${(100 / finalItems.length) * activeIndex}% + 5px)`,
                height: 'calc(100% - 12px)'
              }}
            />
          )}
          
          {finalItems.map((item, index) => {
            const isActive = index === activeIndex;
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isAdminButton = isSuperAdmin(user) && item.title === 'Admin';

            // Se for o botão de Admin com submenu, renderizar dropdown
            if (isAdminButton && hasSubmenu) {
              const isAdminRoute = location.pathname === '/districts' || location.pathname === '/pastors';
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
                      className={`relative flex flex-col items-center justify-center w-full h-12 transition-all duration-300 ease-out ${
                        isActive ? 'scale-110' : 'scale-100'
                      }`}
                      style={{ 
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      type="button"
                    >
                      {/* Indicador visual quando ativo */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-amber-400/20 rounded-2xl blur-sm" />
                      )}
                      <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
                        <div className="relative">
                          <Building2 className={`w-5 h-5 mb-1 transition-all duration-300 ${iconClasses(isActive)}`} />
                          {isActive && (
                            <ChevronUp className="absolute -top-1 -right-1 w-3 h-3 text-emerald-600 animate-bounce" />
                          )}
                        </div>
                        <span className={`text-xs font-medium transition-all duration-300 ${textClasses(isActive)}`}>
                          Admin
                        </span>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    side="top" 
                    align="center"
                    className="mb-2 min-w-[160px] bg-white/95 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
                    style={{ zIndex: 1000000 }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.submenu.map((subItem: any, subIndex: number) => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <DropdownMenuItem
                          key={subIndex}
                          onSelect={(e) => {
                            e.preventDefault();
                            setAdminMenuOpen(false);
                            // Usar requestAnimationFrame para garantir que o estado seja atualizado antes da navegação
                            requestAnimationFrame(() => {
                              navigate(subItem.path);
                            });
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAdminMenuOpen(false);
                            // Usar requestAnimationFrame para garantir que o estado seja atualizado antes da navegação
                            requestAnimationFrame(() => {
                              navigate(subItem.path);
                            });
                          }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                            isSubActive 
                              ? 'bg-gradient-to-r from-emerald-100 to-amber-100 text-emerald-700 font-semibold' 
                              : 'hover:bg-gradient-to-r hover:from-emerald-50 hover:to-amber-50 text-gray-700 focus:bg-gradient-to-r focus:from-emerald-50 focus:to-amber-50'
                          }`}
                        >
                          <subItem.icon className={`w-4 h-4 ${isSubActive ? 'text-emerald-600' : 'text-gray-600'}`} />
                          <span className="text-sm font-medium">{subItem.title}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // Botões normais sem submenu
            return (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.path !== '#') {
                    handleNavigation(item.path, index);
                  }
                }}
                className="relative flex flex-col items-center justify-center w-full h-12 transition-all duration-300 ease-out"
                style={{ 
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
                type="button"
              >
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <item.icon className={`w-5 h-5 mb-1 transition-all duration-300 ${iconClasses(isActive)}`} />
                  <span className={`text-xs font-medium transition-all duration-300 ${textClasses(isActive)}`}>
                    {item.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
});