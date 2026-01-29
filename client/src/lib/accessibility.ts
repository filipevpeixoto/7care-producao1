/**
 * Utilitários de acessibilidade para componentes React
 * Implementa WCAG 2.1 guidelines e melhores práticas
 */

/**
 * Gera um ID único para elementos de formulário
 * @param prefix - Prefixo para o ID
 * @returns ID único gerado
 */
export function generateId(prefix: string = 'field'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Cria atributos ARIA para campos de formulário com validação
 * @param fieldId - ID do campo
 * @param error - Mensagem de erro (se houver)
 * @param description - Descrição do campo
 * @returns Objeto com atributos ARIA
 */
export function getFormFieldAriaAttributes(
  fieldId: string,
  error?: string,
  description?: string
): Record<string, string | boolean | undefined> {
  const errorId = error ? `${fieldId}-error` : undefined;
  const descriptionId = description ? `${fieldId}-description` : undefined;

  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-errormessage': errorId,
  };
}

/**
 * Cria atributos para mensagens de erro acessíveis
 * @param fieldId - ID do campo associado
 * @returns Objeto com atributos para mensagem de erro
 */
export function getErrorMessageAttributes(fieldId: string): Record<string, string> {
  return {
    id: `${fieldId}-error`,
    role: 'alert',
    'aria-live': 'polite',
  };
}

/**
 * Cria atributos para descrições de campo
 * @param fieldId - ID do campo associado
 * @returns Objeto com atributos para descrição
 */
export function getDescriptionAttributes(fieldId: string): Record<string, string> {
  return {
    id: `${fieldId}-description`,
  };
}

/**
 * Verifica se o usuário prefere movimento reduzido
 * @returns true se preferir movimento reduzido
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook React para verificar preferência de movimento reduzido
 * Reage a mudanças em tempo real
 * @returns true se preferir movimento reduzido
 */
export function usePrefersReducedMotion(): boolean {
  // Esta é uma função que pode ser usada em componentes React
  // Para uso reativo com useState/useEffect, use o hook de accessibility.tsx
  return prefersReducedMotion();
}

/**
 * Verifica se o usuário está usando teclado para navegação
 * Detecta navegação por Tab/Shift+Tab
 */
export function setupKeyboardDetection(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      document.body.classList.add('using-keyboard');
    }
  };

  const handleMouseDown = () => {
    document.body.classList.remove('using-keyboard');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown);
  };
}

/**
 * Atributos para elementos que requerem confirmação de ação
 * @param actionDescription - Descrição da ação
 * @returns Objeto com atributos ARIA
 */
export function getConfirmActionAttributes(actionDescription: string): Record<string, string> {
  return {
    'aria-label': actionDescription,
    role: 'button',
  };
}

/**
 * Atributos para botões de toggle
 * @param isPressed - Estado atual do toggle
 * @param label - Label do botão
 * @returns Objeto com atributos ARIA
 */
export function getToggleButtonAttributes(
  isPressed: boolean,
  label: string
): Record<string, string | boolean> {
  return {
    'aria-pressed': isPressed,
    'aria-label': label,
    role: 'switch',
  };
}

/**
 * Atributos para menus dropdown
 * @param isExpanded - Se o menu está aberto
 * @param menuId - ID do menu
 * @returns Objeto com atributos ARIA
 */
export function getDropdownTriggerAttributes(
  isExpanded: boolean,
  menuId: string
): Record<string, string | boolean> {
  return {
    'aria-expanded': isExpanded,
    'aria-haspopup': 'menu',
    'aria-controls': menuId,
  };
}

/**
 * Atributos para painéis de tabs
 * @param tabId - ID da tab
 * @param panelId - ID do painel
 * @param isSelected - Se a tab está selecionada
 * @returns Objetos de atributos para tab e painel
 */
export function getTabAttributes(
  tabId: string,
  panelId: string,
  isSelected: boolean
): { tab: Record<string, string | boolean | number>; panel: Record<string, string | number> } {
  return {
    tab: {
      id: tabId,
      role: 'tab',
      'aria-selected': isSelected,
      'aria-controls': panelId,
      tabIndex: isSelected ? 0 : -1,
    },
    panel: {
      id: panelId,
      role: 'tabpanel',
      'aria-labelledby': tabId,
      tabIndex: 0,
    },
  };
}

/**
 * Atributos para itens de lista
 * @param index - Índice do item
 * @param total - Total de itens
 * @returns Objeto com atributos ARIA
 */
export function getListItemAttributes(
  index: number,
  total: number
): Record<string, string | number> {
  return {
    'aria-posinset': index + 1,
    'aria-setsize': total,
  };
}

/**
 * Atributos para indicadores de carregamento
 * @param label - Descrição do carregamento
 * @returns Objeto com atributos ARIA
 */
export function getLoadingAttributes(label: string = 'Carregando...'): Record<string, string> {
  return {
    role: 'status',
    'aria-live': 'polite',
    'aria-label': label,
    'aria-busy': 'true',
  };
}

/**
 * Atributos para mensagens de status/notificação
 * @param type - Tipo da mensagem (info, success, warning, error)
 * @returns Objeto com atributos ARIA
 */
export function getAlertAttributes(
  type: 'info' | 'success' | 'warning' | 'error'
): Record<string, string> {
  const role = type === 'error' || type === 'warning' ? 'alert' : 'status';
  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  return {
    role,
    'aria-live': ariaLive,
  };
}

/**
 * Focus trap para modais e drawers
 * Mantém o foco dentro de um container
 * @param containerRef - Referência do container
 * @returns Objeto com handlers de teclado
 */
export function createFocusTrap(containerRef: React.RefObject<HTMLElement>): {
  handleKeyDown: (e: React.KeyboardEvent) => void;
} {
  return {
    handleKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    },
  };
}

/**
 * Atributos para barras de progresso
 * @param value - Valor atual
 * @param max - Valor máximo
 * @param label - Descrição do progresso
 * @returns Objeto com atributos ARIA
 */
export function getProgressAttributes(
  value: number,
  max: number,
  label: string
): Record<string, string | number> {
  return {
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label,
    'aria-valuetext': `${Math.round((value / max) * 100)}%`,
  };
}

/**
 * Texto visualmente oculto mas acessível para leitores de tela
 * Use para fornecer contexto adicional
 */
export const visuallyHiddenStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * Skip link attributes para navegação por teclado
 * @param targetId - ID do conteúdo principal
 * @returns Objeto com atributos
 */
export function getSkipLinkAttributes(targetId: string): Record<string, string> {
  return {
    href: `#${targetId}`,
    className:
      'sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4 focus:text-foreground',
  };
}
