/**
 * @fileoverview Módulo de sanitização de conteúdo para prevenção de XSS
 * @module lib/sanitize
 *
 * Usa DOMPurify para sanitizar conteúdo HTML antes de renderizar.
 * Deve ser usado em qualquer lugar que renderize conteúdo gerado por usuários.
 */

import DOMPurify from 'dompurify';

/**
 * Remove TODAS as tags HTML, retornando apenas texto puro.
 * Use para campos onde HTML nunca é esperado (nomes, títulos, etc.)
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Permite tags de formatação básica (negrito, itálico, links, parágrafos).
 * Use para campos de texto rico como mensagens de chat ou descrições.
 */
export function sanitizeRichHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/**
 * Sanitiza HTML completo, removendo scripts e event handlers perigosos
 * mas mantendo a maioria das tags de formatação.
 * Use apenas quando HTML completo é necessário (ex: conteúdo de editor rich text).
 */
export function sanitizeFullHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}
