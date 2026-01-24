/**
 * Appearance Settings Component
 * Configurações de aparência e tema
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Globe, Calendar } from 'lucide-react';

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'pt' | 'en' | 'es';
  dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
}

interface AppearanceSettingsProps {
  settings: AppearanceSettings;
  onChange: (settings: AppearanceSettings) => void;
}

export function AppearanceSettingsCard({ settings, onChange }: AppearanceSettingsProps) {
  const handleChange = (key: keyof AppearanceSettings, value: string) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Aparência
        </CardTitle>
        <CardDescription>
          Personalize a aparência do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tema */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Tema
          </Label>
          <Select 
            value={settings.theme} 
            onValueChange={(value) => handleChange('theme', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Escolha o tema visual do aplicativo
          </p>
        </div>

        {/* Idioma */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Idioma
          </Label>
          <Select 
            value={settings.language} 
            onValueChange={(value) => handleChange('language', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">Português (Brasil)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Idioma da interface do sistema
          </p>
        </div>

        {/* Formato de data */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Formato de Data
          </Label>
          <Select 
            value={settings.dateFormat} 
            onValueChange={(value) => handleChange('dateFormat', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd/mm/yyyy">DD/MM/AAAA (Brasil)</SelectItem>
              <SelectItem value="mm/dd/yyyy">MM/DD/AAAA (EUA)</SelectItem>
              <SelectItem value="yyyy-mm-dd">AAAA-MM-DD (ISO)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Como as datas serão exibidas no sistema
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AppearanceSettingsCard;
