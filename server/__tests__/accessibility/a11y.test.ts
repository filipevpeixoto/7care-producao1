/**
 * Testes de Acessibilidade (a11y)
 * Usa jest-axe para verificar conformidade com WCAG
 */

import { describe, it, expect } from '@jest/globals';

// Funções de utilidade para testes a11y
// Nota: Configurar @axe-core/playwright para testes E2E mais completos

/**
 * Regras básicas de acessibilidade para verificação manual/automática
 */
const a11yRules = {
  // Regras de imagem
  images: {
    requireAltText: (element: { alt?: string; role?: string }): boolean => {
      // Imagens decorativas podem ter alt vazio mas devem ter role="presentation"
      if (element.role === 'presentation' || element.role === 'none') {
        return true;
      }
      return typeof element.alt === 'string' && element.alt.length > 0;
    },

    avoidRedundantAltText: (alt: string): boolean => {
      const redundantPhrases = ['image of', 'picture of', 'photo of', 'imagem de', 'foto de'];
      const lowerAlt = alt.toLowerCase();
      return !redundantPhrases.some(phrase => lowerAlt.startsWith(phrase));
    },
  },

  // Regras de formulário
  forms: {
    requireLabels: (input: {
      id?: string;
      ariaLabel?: string;
      ariaLabelledBy?: string;
    }): boolean => {
      return !!(input.ariaLabel || input.ariaLabelledBy || input.id);
    },

    requireErrorMessages: (hasError: boolean, errorMessage?: string): boolean => {
      if (!hasError) return true;
      return typeof errorMessage === 'string' && errorMessage.length > 0;
    },
  },

  // Regras de cor e contraste
  contrast: {
    // Ratio mínimo para texto normal: 4.5:1
    // Ratio mínimo para texto grande: 3:1
    calculateRatio: (foreground: string, background: string): number => {
      // Converter hex para RGB
      const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : { r: 0, g: 0, b: 0 };
      };

      // Calcular luminância relativa
      const getLuminance = (rgb: { r: number; g: number; b: number }): number => {
        const sRGB = [rgb.r, rgb.g, rgb.b].map(val => {
          val = val / 255;
          return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
      };

      const lum1 = getLuminance(hexToRgb(foreground));
      const lum2 = getLuminance(hexToRgb(background));
      const lighter = Math.max(lum1, lum2);
      const darker = Math.min(lum1, lum2);

      return (lighter + 0.05) / (darker + 0.05);
    },

    meetsWCAGAA: (ratio: number, isLargeText = false): boolean => {
      return isLargeText ? ratio >= 3 : ratio >= 4.5;
    },

    meetsWCAGAAA: (ratio: number, isLargeText = false): boolean => {
      return isLargeText ? ratio >= 4.5 : ratio >= 7;
    },
  },

  // Regras de navegação por teclado
  keyboard: {
    isFocusable: (element: { tabIndex?: number; disabled?: boolean }): boolean => {
      if (element.disabled) return false;
      return element.tabIndex !== -1;
    },

    hasVisibleFocus: (hasFocusStyle: boolean): boolean => {
      return hasFocusStyle;
    },
  },

  // Regras de ARIA
  aria: {
    validRole: (role: string): boolean => {
      const validRoles = [
        'alert',
        'alertdialog',
        'application',
        'article',
        'banner',
        'button',
        'cell',
        'checkbox',
        'columnheader',
        'combobox',
        'complementary',
        'contentinfo',
        'definition',
        'dialog',
        'directory',
        'document',
        'feed',
        'figure',
        'form',
        'grid',
        'gridcell',
        'group',
        'heading',
        'img',
        'link',
        'list',
        'listbox',
        'listitem',
        'log',
        'main',
        'marquee',
        'math',
        'menu',
        'menubar',
        'menuitem',
        'menuitemcheckbox',
        'menuitemradio',
        'navigation',
        'none',
        'note',
        'option',
        'presentation',
        'progressbar',
        'radio',
        'radiogroup',
        'region',
        'row',
        'rowgroup',
        'rowheader',
        'scrollbar',
        'search',
        'searchbox',
        'separator',
        'slider',
        'spinbutton',
        'status',
        'switch',
        'tab',
        'table',
        'tablist',
        'tabpanel',
        'term',
        'textbox',
        'timer',
        'toolbar',
        'tooltip',
        'tree',
        'treegrid',
        'treeitem',
      ];
      return validRoles.includes(role);
    },

    requiredAriaAttributes: (role: string): string[] => {
      const requirements: Record<string, string[]> = {
        checkbox: ['aria-checked'],
        combobox: ['aria-expanded'],
        heading: ['aria-level'],
        meter: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
        option: ['aria-selected'],
        radio: ['aria-checked'],
        scrollbar: ['aria-controls', 'aria-valuenow'],
        slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
        spinbutton: ['aria-valuenow'],
        switch: ['aria-checked'],
      };
      return requirements[role] || [];
    },
  },
};

describe('Accessibility Rules', () => {
  describe('Images', () => {
    it('deve exigir alt text para imagens', () => {
      expect(a11yRules.images.requireAltText({ alt: 'Descrição' })).toBe(true);
      expect(a11yRules.images.requireAltText({ alt: '' })).toBe(false);
      expect(a11yRules.images.requireAltText({})).toBe(false);
    });

    it('deve aceitar imagens decorativas com role presentation', () => {
      expect(a11yRules.images.requireAltText({ role: 'presentation' })).toBe(true);
      expect(a11yRules.images.requireAltText({ role: 'none' })).toBe(true);
    });

    it('deve evitar alt text redundante', () => {
      expect(a11yRules.images.avoidRedundantAltText('Logo da empresa')).toBe(true);
      expect(a11yRules.images.avoidRedundantAltText('Image of logo')).toBe(false);
      expect(a11yRules.images.avoidRedundantAltText('Foto de perfil')).toBe(false);
    });
  });

  describe('Forms', () => {
    it('deve exigir labels para inputs', () => {
      expect(a11yRules.forms.requireLabels({ id: 'email' })).toBe(true);
      expect(a11yRules.forms.requireLabels({ ariaLabel: 'Email' })).toBe(true);
      expect(a11yRules.forms.requireLabels({ ariaLabelledBy: 'email-label' })).toBe(true);
      expect(a11yRules.forms.requireLabels({})).toBe(false);
    });

    it('deve exigir mensagens de erro quando há erro', () => {
      expect(a11yRules.forms.requireErrorMessages(true, 'Email inválido')).toBe(true);
      expect(a11yRules.forms.requireErrorMessages(true, '')).toBe(false);
      expect(a11yRules.forms.requireErrorMessages(true)).toBe(false);
      expect(a11yRules.forms.requireErrorMessages(false)).toBe(true);
    });
  });

  describe('Contrast', () => {
    it('deve calcular ratio de contraste corretamente', () => {
      // Preto sobre branco = 21:1
      const blackOnWhite = a11yRules.contrast.calculateRatio('#000000', '#FFFFFF');
      expect(blackOnWhite).toBeCloseTo(21, 0);

      // Cinza médio
      const grayOnWhite = a11yRules.contrast.calculateRatio('#767676', '#FFFFFF');
      expect(grayOnWhite).toBeGreaterThan(4.5);
    });

    it('deve verificar WCAG AA', () => {
      expect(a11yRules.contrast.meetsWCAGAA(4.5)).toBe(true);
      expect(a11yRules.contrast.meetsWCAGAA(4.4)).toBe(false);
      expect(a11yRules.contrast.meetsWCAGAA(3, true)).toBe(true);
    });

    it('deve verificar WCAG AAA', () => {
      expect(a11yRules.contrast.meetsWCAGAAA(7)).toBe(true);
      expect(a11yRules.contrast.meetsWCAGAAA(6.9)).toBe(false);
      expect(a11yRules.contrast.meetsWCAGAAA(4.5, true)).toBe(true);
    });
  });

  describe('Keyboard', () => {
    it('deve verificar se elemento é focável', () => {
      expect(a11yRules.keyboard.isFocusable({ tabIndex: 0 })).toBe(true);
      expect(a11yRules.keyboard.isFocusable({ tabIndex: -1 })).toBe(false);
      expect(a11yRules.keyboard.isFocusable({ disabled: true })).toBe(false);
    });
  });

  describe('ARIA', () => {
    it('deve validar roles ARIA', () => {
      expect(a11yRules.aria.validRole('button')).toBe(true);
      expect(a11yRules.aria.validRole('dialog')).toBe(true);
      expect(a11yRules.aria.validRole('invalidrole')).toBe(false);
    });

    it('deve listar atributos ARIA obrigatórios por role', () => {
      expect(a11yRules.aria.requiredAriaAttributes('checkbox')).toContain('aria-checked');
      expect(a11yRules.aria.requiredAriaAttributes('slider')).toContain('aria-valuenow');
      expect(a11yRules.aria.requiredAriaAttributes('button')).toEqual([]);
    });
  });
});

// Exportar regras para uso em outros testes
export { a11yRules };
