/**
 * Language Switcher Component
 * Allows users to change the application language.
 * Uses the useLanguage hook from i18n configuration.
 */
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { changeLanguage, currentLanguage, availableLanguages } = useLanguage();

  const current = availableLanguages.find(l => l.code === currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Trocar idioma">
          <Globe className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline text-xs">{current?.flag ?? '🌐'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={currentLanguage === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
