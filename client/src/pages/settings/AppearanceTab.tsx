import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, RefreshCw, Sparkles, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MobileHeaderLayoutEditor } from '@/components/settings/MobileHeaderLayoutEditor';
import { useTheme } from '@/contexts/ThemeContext';
import type { SettingsData, UpdateSetting, AuthUser } from './types';

const SkinPicker = () => {
  const { skin, setSkin } = useTheme();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Design do app
        </CardTitle>
        <CardDescription>
          Escolha entre o design clássico atual ou o novo layout (beta).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSkin('classic')}
            className={`relative text-left rounded-lg border-2 p-4 transition ${
              skin === 'classic'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            }`}
          >
            {skin === 'classic' && (
              <Check className="absolute top-3 right-3 h-4 w-4 text-primary" />
            )}
            <div className="flex gap-1.5 mb-3">
              <span className="h-6 w-6 rounded-md bg-[hsl(220,70%,25%)]" />
              <span className="h-6 w-6 rounded-md bg-[hsl(45,90%,60%)]" />
              <span className="h-6 w-6 rounded-md bg-[hsl(210,25%,98%)] border" />
            </div>
            <div className="font-semibold">Clássico</div>
            <div className="text-xs text-muted-foreground">Design atual do 7care</div>
          </button>
          <button
            type="button"
            onClick={() => setSkin('v2')}
            className={`relative text-left rounded-lg border-2 p-4 transition ${
              skin === 'v2'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            }`}
          >
            {skin === 'v2' && <Check className="absolute top-3 right-3 h-4 w-4 text-primary" />}
            <div className="flex gap-1.5 mb-3">
              <span className="h-6 w-6 rounded-md bg-[#0D2248]" />
              <span className="h-6 w-6 rounded-md bg-[#1B50D4]" />
              <span className="h-6 w-6 rounded-md bg-[#F0C040]" />
            </div>
            <div className="font-semibold flex items-center gap-2">
              Novo layout{' '}
              <Badge variant="secondary" className="text-[10px]">
                Beta
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Navy + gold, Manrope + Source Sans 3
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export const AppearanceTab = ({
  settings,
  updateSetting,
  user,
  isAdmin,
}: {
  settings: SettingsData;
  updateSetting: UpdateSetting;
  user: AuthUser;
  isAdmin: boolean;
}) => (
  <TabsContent value="appearance" className="space-y-4">
    <SkinPicker />
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Aparência
        </CardTitle>
        <CardDescription>Personalize a interface do aplicativo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="theme">Tema</Label>
          <Select
            aria-label="Selecionar tema"
            value={settings.appearance.theme}
            onValueChange={(value: 'light' | 'dark' | 'system') =>
              updateSetting('appearance', 'theme', value)
            }
          >
            <SelectTrigger data-testid="select-theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Idioma</Label>
          <Select
            aria-label="Selecionar idioma"
            value={settings.appearance.language}
            onValueChange={(value: 'pt' | 'en' | 'es') =>
              updateSetting('appearance', 'language', value)
            }
          >
            <SelectTrigger data-testid="select-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFormat">Formato de data</Label>
          <Select
            aria-label="Selecionar formato de data"
            value={settings.appearance.dateFormat}
            onValueChange={(value: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd') =>
              updateSetting('appearance', 'dateFormat', value)
            }
          >
            <SelectTrigger data-testid="select-date-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd/mm/yyyy">DD/MM/AAAA</SelectItem>
              <SelectItem value="mm/dd/yyyy">MM/DD/AAAA</SelectItem>
              <SelectItem value="yyyy-mm-dd">AAAA-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {user?.role === 'pastor' && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Tutorial de Boas-vindas</div>
                <div className="text-xs text-muted-foreground">
                  Reveja o tutorial que apresenta as funcionalidades do sistema
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem(`7care_welcome_tour_completed_${user.id}`);
                  window.location.reload();
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Rever Tutorial
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    {isAdmin && <MobileHeaderLayoutEditor />}
  </TabsContent>
);
