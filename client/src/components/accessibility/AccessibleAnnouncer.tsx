/**
 * Accessible Announcer Component
 * Anuncia mudanças de conteúdo para leitores de tela
 * @module components/accessibility/AccessibleAnnouncer
 */

import { useEffect, useRef } from 'react';

interface AccessibleAnnouncerProps {
  /** Mensagem a ser anunciada */
  message: string;
  /** Tipo de anúncio - polite espera, assertive interrompe */
  politeness?: 'polite' | 'assertive';
  /** Se true, anuncia mesmo se a mensagem for a mesma */
  forceAnnounce?: boolean;
}

/**
 * AccessibleAnnouncer - Anuncia mudanças para tecnologias assistivas
 *
 * Usa aria-live regions para anunciar mudanças de conteúdo
 * para usuários de leitores de tela.
 *
 * @example
 * ```tsx
 * const [status, setStatus] = useState('');
 *
 * const handleSave = async () => {
 *   await saveData();
 *   setStatus('Dados salvos com sucesso!');
 * };
 *
 * <AccessibleAnnouncer message={status} />
 * ```
 */
export function AccessibleAnnouncer({
  message,
  politeness = 'polite',
  forceAnnounce = false,
}: AccessibleAnnouncerProps) {
  const previousMessage = useRef(message);
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Só anuncia se a mensagem mudou ou forceAnnounce é true
    if (message && (message !== previousMessage.current || forceAnnounce)) {
      if (announcerRef.current) {
        // Limpa e re-adiciona para forçar anúncio
        announcerRef.current.textContent = '';
        // Pequeno delay para garantir que o leitor de tela detecte a mudança
        setTimeout(() => {
          if (announcerRef.current) {
            announcerRef.current.textContent = message;
          }
        }, 100);
      }
      previousMessage.current = message;
    }
  }, [message, forceAnnounce]);

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

export default AccessibleAnnouncer;
