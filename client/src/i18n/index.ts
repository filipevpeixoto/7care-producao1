import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import esES from './locales/es-ES.json';

const resources = {
  'pt-BR': { translation: ptBR },
  'en-US': { translation: enUS },
  'es-ES': { translation: esES },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en-US', 'es-ES'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: '7care-language',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

/**
 * Hook to change the application language.
 * Provides current language, available languages, and a changeLanguage function.
 */
export function useLanguage() {
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('7care-language', lang);
  };

  const currentLanguage = i18n.language;

  const availableLanguages = [
    { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  ];

  return { changeLanguage, currentLanguage, availableLanguages };
}
