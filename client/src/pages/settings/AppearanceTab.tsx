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
import { Palette, RefreshCw } from 'lucide-react';
import { MobileHeaderLayoutEditor } from '@/components/settings/MobileHeaderLayoutEditor';
import type { SettingsData, UpdateSetting, AuthUser } from './types';

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
