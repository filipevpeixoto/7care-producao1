import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { isSuperAdmin, isPastor, hasAdminAccess } from '@/lib/permissions';
import { createLogger } from '@/lib/logger';
import {
  DEFAULT_PAGE_HELP,
  PAGE_HELP_MAP,
  type HelpItem,
  type PageHelpContent,
} from './usePageHelpData';

const logger = createLogger('PageHelp');

export type { HelpActionType, HelpItem, PageHelpContent } from './usePageHelpData';

/**
 * Hook que retorna o conteúdo de ajuda contextual baseado na rota atual e role do usuário
 */
export function usePageHelp() {
  const location = useLocation();
  const { user } = useAuth();

  const pageHelp = useMemo((): PageHelpContent => {
    // Normalizar path removendo trailing slash
    const path = location.pathname.replace(/\/+$/, '') || '/dashboard';

    // Buscar conteúdo exato ou por prefixo
    let content = PAGE_HELP_MAP[path];

    if (!content) {
      // Tentar match por prefixo
      for (const [route, helpContent] of Object.entries(PAGE_HELP_MAP)) {
        if (path.startsWith(route) && route !== '/') {
          content = helpContent;
          break;
        }
      }
    }

    // Se ainda não encontrou, usar default
    if (!content) {
      content = DEFAULT_PAGE_HELP;
    }

    // Filtrar itens baseado no role do usuário
    const userRole = user?.role || 'member';
    const filteredItems = content.items.filter(item => {
      // Se não tem restrição de roles, mostrar para todos
      if (!item.roles) return true;
      // Verificar se o role do usuário está na lista permitida
      return item.roles.includes(userRole);
    });

    return {
      ...content,
      items: filteredItems,
    };
  }, [location.pathname, user?.role]);

  /**
   * Executa a ação de um item do índice
   */
  const executeAction = (item: HelpItem, navigate: (path: string) => void): boolean => {
    switch (item.action) {
      case 'navigate':
        navigate(item.target);
        return true; // Fechar modal

      case 'scroll':
      case 'highlight': {
        // Tentar encontrar o elemento pelo seletor
        let element = document.querySelector(item.target);

        // Se não encontrou, tentar por ID simples
        if (!element && item.target.startsWith('[data-')) {
          // Extrair o valor do data attribute e tentar como ID
          const match = item.target.match(/\[data-\w+="(.+?)"\]/);
          if (match) {
            element = document.getElementById(match[1]);
          }
        }

        // Se ainda não encontrou, tentar buscar pelo texto do título
        if (!element) {
          // Buscar por texto visível na página
          const allElements = document.querySelectorAll('h1, h2, h3, h4, button, [role="button"]');
          for (const el of allElements) {
            if (el.textContent?.toLowerCase().includes(item.title.toLowerCase().split(' ')[0])) {
              element = el;
              break;
            }
          }
        }

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Adicionar destaque temporário
          element.classList.add('help-highlight');
          setTimeout(() => {
            element?.classList.remove('help-highlight');
          }, 3000);
          return true; // Fechar modal
        } else {
          // Elemento não encontrado - mostrar toast informativo
          logger.warn(`[PageHelp] Elemento não encontrado: ${item.target}`);
          // Retornar true mesmo assim para fechar o modal
          // O usuário verá que a funcionalidade existe mas o elemento específico não está visível
          return true;
        }
      }

      case 'info':
        // Apenas informativo, não faz nada
        return false; // Não fechar modal

      default:
        return false;
    }
  };

  return {
    pageHelp,
    executeAction,
    userRole: user?.role,
    isAdmin: hasAdminAccess(user),
    isSuperAdmin: isSuperAdmin(user),
    isPastor: isPastor(user),
  };
}
