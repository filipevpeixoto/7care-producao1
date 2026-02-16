/**
 * Configuração de internacionalização (i18n)
 * 
 * @deprecated Use '@/i18n' directly. This file re-exports for backward compatibility.
 * The consolidated i18n setup lives in client/src/i18n/index.ts with JSON locale files.
 */

import i18n, { useLanguage } from '@/i18n';

export { useLanguage };
export default i18n;
